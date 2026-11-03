import mammoth from 'mammoth';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as pdfjsLib from 'pdfjs-dist';
import { getFileExtension, validateStudyFile } from './fileValidator';

// Configure PDF.js worker for Vite bundler
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback CDN worker if bundler URL resolution fails in non-standard environments
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export const EDITOR_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'strong', 'em', 'u', 's', 'p', 'br', 'ul', 'ol', 'li',
    'a', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code', 'hr', 'img'
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'style', 'colspan', 'rowspan',
    'align', 'src', 'alt', 'title', 'width', 'height'
  ],
  FORBID_TAGS: ['iframe', 'script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onmouseout']
};

/**
 * Sanitizes HTML content for the Rich Text Editor.
 * If extension === 'txt', strips <img> tags as plain text files do not allow images.
 */
export function sanitizeMaterialHtml(rawHtml = '', extension = 'docx') {
  const config =
    extension === 'txt'
      ? {
          ...EDITOR_PURIFY_CONFIG,
          ALLOWED_TAGS: EDITOR_PURIFY_CONFIG.ALLOWED_TAGS.filter((t) => t !== 'img')
        }
      : EDITOR_PURIFY_CONFIG;

  return DOMPurify.sanitize(rawHtml || '<p></p>', config);
}

/**
 * Escapes raw HTML entities in plain text strings.
 */
function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts Plain Text (.txt) string into structured HTML paragraphs and lists.
 */
export function convertTxtToHtml(rawText = '') {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    throw new Error('The uploaded .TXT file contains no readable text.');
  }

  const blocks = normalized.split(/\n{2,}/);
  const htmlParts = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Detect if block is a bullet list
    const isBulletList = lines.every((l) => /^[-*•]\s+/.test(l));
    if (isBulletList) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^[-*•]\s+/, ''))}</li>`)
        .join('');
      htmlParts.push(`<ul>${items}</ul>`);
      continue;
    }

    // Detect if block is a numbered list
    const isNumberedList = lines.every((l) => /^\d+[.)]\s+/.test(l));
    if (isNumberedList) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^\d+[.)]\s+/, ''))}</li>`)
        .join('');
      htmlParts.push(`<ol>${items}</ol>`);
      continue;
    }

    // Standard paragraph (preserve single line breaks with <br>)
    const paragraphInner = lines.map((l) => escapeHtml(l)).join('<br />');
    htmlParts.push(`<p>${paragraphInner}</p>`);
  }

  return sanitizeMaterialHtml(htmlParts.join('\n'), 'txt');
}

/**
 * Converts Markdown (.md) string into sanitized semantic HTML.
 */
export function convertMarkdownToHtml(rawMarkdown = '') {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    throw new Error('The uploaded .MD file contains no readable content.');
  }

  marked.setOptions({
    gfm: true,
    breaks: true
  });

  const rendered = marked.parse(normalized);
  return sanitizeMaterialHtml(rendered, 'md');
}

/**
 * Extracts structured HTML (headings, lists, paragraphs) from a PDF ArrayBuffer using PDF.js.
 */
export async function convertPdfArrayBufferToHtml(arrayBuffer) {
  let pdfDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    console.error('PDF load error:', err);
    throw new Error('Could not read the PDF file. It may be corrupted or password-protected.');
  }

  if (!pdfDoc || pdfDoc.numPages === 0) {
    throw new Error('The uploaded PDF file has no pages.');
  }

  const allPagesHtml = [];
  let totalExtractedChars = 0;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    if (!items.length) continue;

    // Group text items into visual lines by Y-coordinate proximity
    const lines = [];
    let currentLine = null;

    for (const item of items) {
      const str = item.str || '';
      if (!str.trim() && !currentLine) continue;

      const tx = item.transform || [12, 0, 0, 12, 0, 0];
      const fontHeight = Math.round(Math.hypot(tx[0], tx[1]) || Math.abs(tx[3]) || 12);
      const y = Math.round(tx[5] || 0);

      if (!currentLine || Math.abs(currentLine.y - y) > Math.max(4, fontHeight * 0.45)) {
        if (currentLine && currentLine.text.trim()) {
          lines.push(currentLine);
        }
        currentLine = {
          y,
          fontHeight,
          text: str
        };
      } else {
        const needsSpace =
          currentLine.text.length > 0 &&
          !currentLine.text.endsWith(' ') &&
          !str.startsWith(' ');
        currentLine.text += (needsSpace ? ' ' : '') + str;
        currentLine.fontHeight = Math.max(currentLine.fontHeight, fontHeight);
      }
    }

    if (currentLine && currentLine.text.trim()) {
      lines.push(currentLine);
    }

    if (!lines.length) continue;

    // Determine median font height on this page to infer headings
    const heights = lines.map((l) => l.fontHeight).sort((a, b) => a - b);
    const bodyFontHeight = heights[Math.floor(heights.length / 2)] || 12;

    const pageHtml = [];
    let paragraphBuffer = [];
    let listBuffer = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        pageHtml.push(`<p>${escapeHtml(paragraphBuffer.join(' '))}</p>`);
        paragraphBuffer = [];
      }
    };

    const flushList = () => {
      if (listBuffer.length > 0) {
        const itemsHtml = listBuffer.map((li) => `<li>${escapeHtml(li)}</li>`).join('');
        pageHtml.push(`<ul>${itemsHtml}</ul>`);
        listBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.text.trim();
      if (!trimmed) continue;

      totalExtractedChars += trimmed.length;

      const isBullet = /^[•\-*▪▸]\s+/.test(trimmed);
      const isHeading1 = line.fontHeight >= bodyFontHeight * 1.45 && trimmed.length < 140;
      const isHeading2 =
        !isHeading1 && line.fontHeight >= bodyFontHeight * 1.2 && trimmed.length < 160;

      if (isHeading1 || isHeading2) {
        flushParagraph();
        flushList();
        const tag = isHeading1 ? 'h2' : 'h3';
        pageHtml.push(`<${tag}>${escapeHtml(trimmed)}</${tag}>`);
      } else if (isBullet) {
        flushParagraph();
        listBuffer.push(trimmed.replace(/^[•\-*▪▸]\s+/, ''));
      } else {
        flushList();
        paragraphBuffer.push(trimmed);

        // Flush paragraph if vertical gap to next line is large or line ends with terminal punctuation
        const nextLine = lines[i + 1];
        const verticalGap = nextLine ? Math.abs(line.y - nextLine.y) : 999;
        if (verticalGap > line.fontHeight * 1.85 || /[.!?:]$/.test(trimmed)) {
          flushParagraph();
        }
      }
    }

    flushParagraph();
    flushList();

    if (pageHtml.length > 0) {
      allPagesHtml.push(pageHtml.join('\n'));
    }
  }

  if (totalExtractedChars === 0 || allPagesHtml.length === 0) {
    throw new Error(
      'No selectable text could be extracted from this PDF. Scanned/image-only PDFs are not supported without text layers.'
    );
  }

  return sanitizeMaterialHtml(allPagesHtml.join('\n'), 'pdf');
}

/**
 * Extracts structured HTML from any supported File object (.docx, .pdf, .txt, .md).
 * @param {File} file
 * @returns {Promise<{ htmlContent: string, plainText: string, originalExtension: string, fileName: string }>}
 */
export async function parseUploadedStudyFile(file) {
  const validation = validateStudyFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = validation.extension;
  let htmlContent = '';

  try {
    if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      htmlContent = sanitizeMaterialHtml(result.value || '<p></p>', 'docx');
    } else if (ext === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      htmlContent = await convertPdfArrayBufferToHtml(arrayBuffer);
    } else if (ext === 'md') {
      const text = await file.text();
      htmlContent = convertMarkdownToHtml(text);
    } else if (ext === 'txt') {
      const text = await file.text();
      htmlContent = convertTxtToHtml(text);
    } else {
      throw new Error(`Unsupported file extension: .${ext}`);
    }
  } catch (err) {
    throw new Error(err.message || `Failed to extract content from "${file.name}".`);
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const plainText = (tempDiv.innerText || tempDiv.textContent || '').trim();

  if (!plainText) {
    throw new Error(`The uploaded file "${file.name}" contains no extractable text content.`);
  }

  return {
    htmlContent,
    plainText,
    originalExtension: ext,
    fileName: file.name
  };
}

