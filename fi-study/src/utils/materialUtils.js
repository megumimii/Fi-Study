import mammoth from 'mammoth';
import { Document, Paragraph, TextRun, AlignmentType, Packer, HeadingLevel, Table, TableRow, TableCell, WidthType, UnderlineType } from 'docx';

export function extractTextFromHtml(htmlContent) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  return tempDiv.innerText;
}

export async function fetchAndConvertDocxToHtml(fileURL) {
  const cacheBuster = `?t=${Date.now()}`;
  const response = await fetch(fileURL + cacheBuster);
  if (!response.ok) throw new Error('Failed to fetch DOCX file');
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

export async function convertDocxToHtml(docxFile) {
  const arrayBuffer = await docxFile.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

export async function fetchAndExtractDocxText(fileURL) {
  const cacheBuster = `?t=${Date.now()}`;
  const response = await fetch(fileURL + cacheBuster);
  if (!response.ok) throw new Error('Failed to fetch DOCX file');
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function extractMaterialText(material) {
  if (!material) return '';

  if (material.htmlContent) {
    return extractTextFromHtml(material.htmlContent);
  }

  if (material.fileURL) {
    try {
      return await fetchAndExtractDocxText(material.fileURL);
    } catch (err) {
      console.error('Failed to extract text from material file:', err);
      return material.description || '';
    }
  }

  return material.description || '';
}

export function constructMaterialStoragePath(userUID, courseUID, lessonUID, material) {
  let filename = material.fileName || material.title.split(' ')[0].toLowerCase() + '.docx';
  return `materials/${userUID}/${courseUID}/${lessonUID}/${material.uid}-${filename}`;
}

export function constructMaterialDbPath(userUID, courseUID, lessonUID, materialUID) {
  return `courses/${userUID}/${courseUID}/Lessons/${lessonUID}/Materials/${materialUID}`;
}

export async function convertHtmlToDocx(htmlContent) {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const children = [];

    // Parse HTML elements and convert to docx elements
    const parseNode = (node) => {
      const nodeName = node.nodeName.toLowerCase();

      // Handle headings
      if (nodeName.match(/^h[1-6]$/)) {
        const level = parseInt(nodeName.charAt(1));
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs,
          heading: level === 1 ? HeadingLevel.HEADING_1 :
            level === 2 ? HeadingLevel.HEADING_2 :
              level === 3 ? HeadingLevel.HEADING_3 :
                level === 4 ? HeadingLevel.HEADING_4 :
                  level === 5 ? HeadingLevel.HEADING_5 :
                    HeadingLevel.HEADING_6,
        });
      }

      // Handle paragraphs
      if (nodeName === 'p') {
        const runs = parseTextContent(node);
        const alignment = getAlignment(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          alignment: alignment,
        });
      }

      // Handle lists
      if (nodeName === 'li') {
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          bullet: { level: 0 },
        });
      }

      // Handle blockquotes
      if (nodeName === 'blockquote') {
        const runs = parseTextContent(node);
        return new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun('')],
          italics: true,
          indent: { left: 720 }, // 0.5 inch
        });
      }

      // Handle tables
      if (nodeName === 'table') {
        return parseTable(node);
      }

      return null;
    };

    // Parse text content with formatting
    const parseTextContent = (element) => {
      const runs = [];

      const traverse = (node, inherited = {}) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (text.trim()) {
            runs.push(new TextRun({
              text: text,
              bold: inherited.bold || false,
              italics: inherited.italics || false,
              underline: inherited.underline ? { type: UnderlineType.SINGLE } : undefined,
            }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const nodeName = node.nodeName.toLowerCase();
          const newInherited = { ...inherited };

          if (nodeName === 'strong' || nodeName === 'b') newInherited.bold = true;
          if (nodeName === 'em' || nodeName === 'i') newInherited.italics = true;
          if (nodeName === 'u') newInherited.underline = true;

          Array.from(node.childNodes).forEach(child => traverse(child, newInherited));
        }
      };

      traverse(element);
      return runs;
    };

    // Get alignment from style
    const getAlignment = (element) => {
      const align = element.style.textAlign ||
        element.getAttribute('align') ||
        window.getComputedStyle(element).textAlign;

      if (align === 'center') return AlignmentType.CENTER;
      if (align === 'right') return AlignmentType.RIGHT;
      if (align === 'justify') return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    };

    // Parse table
    const parseTable = (tableElement) => {
      const rows = [];
      const tableRows = tableElement.querySelectorAll('tr');

      tableRows.forEach(tr => {
        const cells = [];
        const tableCells = tr.querySelectorAll('td, th');

        tableCells.forEach(cell => {
          const runs = parseTextContent(cell);
          cells.push(new TableCell({
            children: [new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun('')],
            })],
            width: { size: 100 / tableCells.length, type: WidthType.PERCENTAGE },
          }));
        });

        rows.push(new TableRow({ children: cells }));
      });

      return new Table({
        rows: rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
    };

    // Process all child nodes
    const processChildren = (parent) => {
      Array.from(parent.children).forEach(child => {
        if (child.nodeName.toLowerCase() === 'ul' || child.nodeName.toLowerCase() === 'ol') {
          // Process list items
          Array.from(child.children).forEach(li => {
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

    // If no content was parsed, add a blank paragraph
    if (children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun('')] }));
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: children,
      }],
    });

    // Convert to blob
    const blob = await Packer.toBlob(doc);
    return blob;

  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    throw new Error('Failed to convert content to DOCX format');
  }
}