import mammoth from 'mammoth';
import {
  convertHtmlToDocxBlob,
  resolveMaterialHtml,
  exportAndDownloadMaterial
} from '../services/documentExporter';
import { parseUploadedStudyFile } from '../services/documentParser';
import { getFileExtension } from '../services/fileValidator';

export function extractTextFromHtml(htmlContent = '') {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  return (tempDiv.innerText || tempDiv.textContent || '').trim();
}

export async function fetchAndConvertDocxToHtml(fileURL) {
  const separator = fileURL.includes('?') ? '&' : '?';
  const response = await fetch(`${fileURL}${separator}t=${Date.now()}`);
  if (!response.ok) throw new Error('Failed to fetch DOCX file from storage');
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

export async function convertDocxToHtml(file) {
  const parsed = await parseUploadedStudyFile(file);
  return parsed.htmlContent;
}

export async function fetchAndExtractDocxText(fileURL) {
  const separator = fileURL.includes('?') ? '&' : '?';
  const response = await fetch(`${fileURL}${separator}t=${Date.now()}`);
  if (!response.ok) throw new Error('Failed to fetch DOCX file from storage');
  const arrayBuffer = await response.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function extractMaterialText(material) {
  if (!material) return '';

  if (material.htmlContent && material.htmlContent.trim()) {
    const extracted = extractTextFromHtml(material.htmlContent);
    if (extracted) return extracted;
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

/**
 * Storage path always stores the canonical .docx representation in Firebase Storage,
 * while material.fileName and material.originalExtension retain the user's original extension.
 */
export function constructMaterialStoragePath(userUID, courseUID, lessonUID, material) {
  const rawName = material?.fileName || (material?.title || 'material').split(' ')[0].toLowerCase();
  const baseName = rawName.replace(/\.(docx|pdf|txt|md)$/i, '');
  return `materials/${userUID}/${courseUID}/${lessonUID}/${material.uid}-${baseName}.docx`;
}

export function constructMaterialDbPath(userUID, courseUID, lessonUID, materialUID) {
  return `courses/${userUID}/${courseUID}/Lessons/${lessonUID}/Materials/${materialUID}`;
}

export function getMaterialOriginalExtension(material) {
  if (material?.originalExtension) return material.originalExtension.toLowerCase();
  const extFromName = getFileExtension(material?.fileName || '');
  return extFromName || 'docx';
}

export async function convertHtmlToDocx(htmlContent) {
  return convertHtmlToDocxBlob(htmlContent);
}

export { resolveMaterialHtml, exportAndDownloadMaterial };
