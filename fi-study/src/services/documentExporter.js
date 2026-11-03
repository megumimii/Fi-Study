import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  UnderlineType
} from 'docx';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';
import { getFileExtension } from './fileValidator';

/**
 * Converts HTML string into a canonical .DOCX Blob for Firebase Storage persistence
 * or direct .DOCX download.
 * @param {string} htmlContent
 * @returns {Promise<Blob>}
 */
export async function convertHtmlToDocxBlob(htmlContent = '<p></p>') {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const children = [];

    const parseTextContent = (element) => {
      const runs = [];

      const traverse = (node, inherited = {}) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text) {
            runs.push(
              new TextRun({
                text,
                bold: inherited.bold || false,
                italics: inherited.italics || false,
                underline: inherited.underline ? { type: UnderlineType.SINGLE } : undefined
              })
            );
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const nodeName = node.nodeName.toLowerCase();
          if (nodeName === 'br') {
            runs.push(new TextRun({ text: '', break: 1 }));
            return;
          }
          const newInherited = { ...inherited };
          if (nodeName === 'strong' || nodeName === 'b') newInherited.bold = true;
          if (nodeName === 'em' || nodeName === 'i') newInherited.italics = true;
          if (nodeName === 'u') newInherited.underline = true;

          Array.from(node.childNodes).forEach((child) => traverse(child, newInherited));
        }
      };

      traverse(element);
      return runs;
    };

    const getAlignment = (element) => {
      const align =
        element.style?.textAlign ||
        element.getAttribute?.('align') ||
        'left';

      if (align === 'center') return AlignmentType.CENTER;
      if (align === 'right') return AlignmentType.RIGHT;
      if (align === 'justify') return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    };

    const parseTable = (tableElement) => {
      const rows = [];
      const tableRows = tableElement.querySelectorAll('tr');

      tableRows.forEach((tr) => {
        const cells = [];
        const tableCells = tr.querySelectorAll('td, th');

        tableCells.forEach((cell) => {
          const runs = parseTextContent(cell);
          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: runs.length > 0 ? runs : [new TextRun('')]
                })
              ],
              width: {
                size: tableCells.length ? 100 / tableCells.length : 100,
                type: WidthType.PERCENTAGE
              }
            })
          );
        });

        if (cells.length > 0) {
          rows.push(new TableRow({ children: cells }));
        }
      });

      return rows.length > 0
        ? new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          })
        : null;
    };

    const parseNode = (node) => {
      const nodeName = node.nodeName.toLowerCase();

      if (/^h[1-6]$/.test(nodeName)) {
        const level = parseInt(nodeName.charAt(1), 10);
        const runs = parseTextContent(node);
        const headingMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
          6: HeadingLevel.HEADING_6
        };
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          heading: headingMap[level] || HeadingLevel.HEADING_2
        });
      }

      if (nodeName === 'p' || nodeName === 'pre') {
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          alignment: getAlignment(node)
        });
      }

      if (nodeName === 'li') {
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          bullet: { level: 0 }
        });
      }

      if (nodeName === 'blockquote') {
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          indent: { left: 720 }
        });
      }

      if (nodeName === 'table') {
        return parseTable(node);
      }

      return null;
    };

    const processChildren = (parent) => {
      Array.from(parent.children).forEach((child) => {
        const tag = child.nodeName.toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          Array.from(child.children).forEach((li) => {
            const element = parseNode(li);
            if (element) children.push(element);
          });
        } else {
          const element = parseNode(child);
          if (element) {
            children.push(element);
          } else if (child.children.length > 0) {
            processChildren(child);
          }
        }
      });
    };

    processChildren(tempDiv);

    if (children.length === 0) {
      const fallbackText = (tempDiv.innerText || tempDiv.textContent || '').trim();
      children.push(new Paragraph({ children: [new TextRun(fallbackText)] }));
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children
        }
      ]
    });

    return await Packer.toBlob(doc);
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    throw new Error('Failed to convert content to canonical DOCX format.');
  }
}

/**
 * Converts HTML back into structured Markdown (.md).
 */
export function convertHtmlToMarkdown(htmlContent = '') {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const serializeInline = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.nodeName.toLowerCase();
    const inner = Array.from(node.childNodes).map(serializeInline).join('');

    if (tag === 'strong' || tag === 'b') return `**${inner.trim()}**`;
    if (tag === 'em' || tag === 'i') return `*${inner.trim()}*`;
    if (tag === 'code') return `\`${inner}\``;
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      return href ? `[${inner}](${href})` : inner;
    }
    if (tag === 'br') return '\n';
    return inner;
  };

  const blocks = [];

  const processBlock = (el) => {
    const tag = el.nodeName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag.charAt(1), 10);
      const hashes = '#'.repeat(level);
      blocks.push(`${hashes} ${serializeInline(el).trim()}`);
      return;
    }

    if (tag === 'p') {
      const text = serializeInline(el).trim();
      if (text) blocks.push(text);
      return;
    }

    if (tag === 'ul') {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map((li) => `- ${serializeInline(li).trim()}`)
        .join('\n');
      if (items) blocks.push(items);
      return;
    }

    if (tag === 'ol') {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map((li, idx) => `${idx + 1}. ${serializeInline(li).trim()}`)
        .join('\n');
      if (items) blocks.push(items);
      return;
    }

    if (tag === 'blockquote') {
      const lines = serializeInline(el)
        .trim()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
      if (lines) blocks.push(lines);
      return;
    }

    if (tag === 'pre') {
      const codeText = el.textContent || '';
      blocks.push(`\`\`\`\n${codeText.trim()}\n\`\`\``);
      return;
    }

    if (tag === 'hr') {
      blocks.push('---');
      return;
    }

    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      const mdRows = rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((c) =>
          serializeInline(c).replace(/\n/g, ' ').trim()
        );
        return `| ${cells.join(' | ')} |`;
      });
      if (mdRows.length > 0) {
        const colCount = el.querySelector('tr')?.querySelectorAll('th, td').length || 1;
        const divider = `| ${Array(colCount).fill('---').join(' | ')} |`;
        mdRows.splice(1, 0, divider);
        blocks.push(mdRows.join('\n'));
      }
      return;
    }

    if (el.children.length > 0) {
      Array.from(el.children).forEach(processBlock);
    } else {
      const txt = serializeInline(el).trim();
      if (txt) blocks.push(txt);
    }
  };

  Array.from(tempDiv.children).forEach(processBlock);

  if (blocks.length === 0) {
    return (tempDiv.innerText || tempDiv.textContent || '').trim();
  }

  return blocks.join('\n\n') + '\n';
}

/**
 * Converts HTML back into structured Plain Text (.txt) without images.
 */
export function convertHtmlToPlainText(htmlContent = '') {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  // Remove any image elements for .txt output
  tempDiv.querySelectorAll('img').forEach((img) => img.remove());

  const blocks = [];

  const processNode = (el) => {
    const tag = el.nodeName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const text = (el.textContent || '').trim();
      if (text) blocks.push(text.toUpperCase());
      return;
    }

    if (tag === 'ul') {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map((li) => `• ${(li.textContent || '').trim()}`)
        .join('\n');
      if (items) blocks.push(items);
      return;
    }

    if (tag === 'ol') {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map((li, idx) => `${idx + 1}. ${(li.textContent || '').trim()}`)
        .join('\n');
      if (items) blocks.push(items);
      return;
    }

    if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
      const text = (el.innerText || el.textContent || '').trim();
      if (text) blocks.push(text);
      return;
    }

    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th, td'))
          .map((c) => (c.textContent || '').trim())
          .join('\t')
      );
      if (rows.length) blocks.push(rows.join('\n'));
      return;
    }

    if (el.children.length > 0) {
      Array.from(el.children).forEach(processNode);
    }
  };

  Array.from(tempDiv.children).forEach(processNode);

  if (blocks.length === 0) {
    return (tempDiv.innerText || tempDiv.textContent || '').trim();
  }

  return blocks.join('\n\n') + '\n';
}

/**
 * Converts HTML into a multi-page PDF Blob using jsPDF.
 */
export function convertHtmlToPdfBlob(htmlContent = '', title = 'Study Material') {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const ensureSpace = (neededHeight) => {
    if (cursorY + neededHeight > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }
  };

  const writeWrappedText = (text, fontSize = 11, fontStyle = 'normal', indent = 0, spacingAfter = 10) => {
    const cleanText = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    pdf.setFont('helvetica', fontStyle);
    pdf.setFontSize(fontSize);

    const lines = pdf.splitTextToSize(cleanText, maxLineWidth - indent);
    const lineHeight = fontSize * 1.42;

    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin + indent, cursorY);
      cursorY += lineHeight;
    }
    cursorY += spacingAfter;
  };

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const walkElements = (parent) => {
    Array.from(parent.children).forEach((el) => {
      const tag = el.nodeName.toLowerCase();

      if (tag === 'h1') {
        cursorY += 4;
        writeWrappedText(el.textContent, 18, 'bold', 0, 12);
      } else if (tag === 'h2') {
        cursorY += 4;
        writeWrappedText(el.textContent, 15, 'bold', 0, 10);
      } else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
        writeWrappedText(el.textContent, 13, 'bold', 0, 8);
      } else if (tag === 'p') {
        writeWrappedText(el.textContent, 11, 'normal', 0, 10);
      } else if (tag === 'blockquote') {
        writeWrappedText(el.textContent, 11, 'italic', 18, 10);
      } else if (tag === 'ul') {
        Array.from(el.querySelectorAll(':scope > li')).forEach((li) => {
          writeWrappedText(`• ${li.textContent || ''}`, 11, 'normal', 14, 6);
        });
        cursorY += 4;
      } else if (tag === 'ol') {
        Array.from(el.querySelectorAll(':scope > li')).forEach((li, idx) => {
          writeWrappedText(`${idx + 1}. ${li.textContent || ''}`, 11, 'normal', 14, 6);
        });
        cursorY += 4;
      } else if (tag === 'table') {
        Array.from(el.querySelectorAll('tr')).forEach((tr) => {
          const rowText = Array.from(tr.querySelectorAll('th, td'))
            .map((cell) => (cell.textContent || '').trim())
            .join('  |  ');
          writeWrappedText(rowText, 10, 'normal', 6, 6);
        });
        cursorY += 6;
      } else if (el.children.length > 0) {
        walkElements(el);
      } else if (el.textContent?.trim()) {
        writeWrappedText(el.textContent, 11, 'normal', 0, 10);
      }
    });
  };

  if (tempDiv.children.length > 0) {
    walkElements(tempDiv);
  } else {
    writeWrappedText(tempDiv.textContent || title, 11, 'normal', 0, 10);
  }

  return pdf.output('blob');
}

/**
 * Triggers a browser file download for a Blob.
 */
export function triggerBlobDownload(blob, downloadFileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Fetches canonical DOCX from Firebase Storage URL and converts it back to HTML,
 * or falls back to cached htmlContent.
 */
export async function resolveMaterialHtml(material) {
  if (material?.htmlContent && material.htmlContent.trim()) {
    return material.htmlContent;
  }

  if (material?.fileURL) {
    const separator = material.fileURL.includes('?') ? '&' : '?';
    const response = await fetch(`${material.fileURL}${separator}t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch canonical DOCX file from storage.');
    }
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value || '<p></p>';
  }

  return material?.description ? `<p>${material.description}</p>` : '<p></p>';
}

/**
 * Converts HTML/canonical DOCX content into the requested target extension (.docx, .pdf, .md, .txt)
 * and downloads it to the user's device.
 */
export async function exportAndDownloadMaterial(material, overrideHtml = null, targetExtension = null) {
  const htmlContent = overrideHtml || (await resolveMaterialHtml(material));
  const origExt = (
    targetExtension ||
    material?.originalExtension ||
    getFileExtension(material?.fileName) ||
    'docx'
  ).toLowerCase();

  // Compute clean base filename without extension
  const rawName = material?.fileName || material?.title || 'study-material';
  const baseName = rawName.replace(/\.(docx|pdf|txt|md)$/i, '').trim() || 'study-material';
  const finalFileName = `${baseName}.${origExt}`;

  if (origExt === 'docx') {
    const docxBlob = await convertHtmlToDocxBlob(htmlContent);
    triggerBlobDownload(docxBlob, finalFileName);
    return;
  }

  if (origExt === 'pdf') {
    const pdfBlob = convertHtmlToPdfBlob(htmlContent, material?.title || baseName);
    triggerBlobDownload(pdfBlob, finalFileName);
    return;
  }

  if (origExt === 'md') {
    const mdString = convertHtmlToMarkdown(htmlContent);
    const mdBlob = new Blob([mdString], { type: 'text/markdown;charset=utf-8' });
    triggerBlobDownload(mdBlob, finalFileName);
    return;
  }

  if (origExt === 'txt') {
    const txtString = convertHtmlToPlainText(htmlContent);
    const txtBlob = new Blob([txtString], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(txtBlob, finalFileName);
    return;
  }

  // Default fallback to DOCX
  const fallbackBlob = await convertHtmlToDocxBlob(htmlContent);
  triggerBlobDownload(fallbackBlob, `${baseName}.docx`);
}

