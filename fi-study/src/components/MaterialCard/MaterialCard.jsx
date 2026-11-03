import './material-card.css';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormModal from '../Modal/FormModal/FormModal';
import Modal from '../Modal/Modal';
import FileDropzone from '../ui/FileDropzone/FileDropzone';
import { uploadAndGetDownloadURLFromFirebase } from '../../utils/FirebaseHelper';
import { materialApi } from '../../services/api';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';
import { parseUploadedStudyFile } from '../../services/documentParser';
import {
  convertHtmlToDocxBlob,
  exportAndDownloadMaterial
} from '../../services/documentExporter';
import { getMaterialOriginalExtension } from '../../utils/materialUtils';

const EXT_COLORS = {
  docx: '#3b82f6',
  pdf: '#ec4899',
  md: '#a855f7',
  txt: '#10b981'
};

function countWords(html, fallback = '') {
  const text = html ? html.replace(/<[^>]+>/g, ' ') : fallback || '';
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MaterialCard({ material, courseUID, lessonUID, computeFilePath }) {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [materialInputData, setMaterialInputData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const navigate = useNavigate();

  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const retakeModalRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  const { title, description, passed, uid, flashcards, htmlContent, updatedAt, createdAt } = material;
  const origExt = getMaterialOriginalExtension(material);
  const accentColor = EXT_COLORS[origExt] || '#3b82f6';
  const wordCount = countWords(htmlContent, description);
  const dateLabel = formatShortDate(updatedAt || createdAt);
  const flashcardCount = Array.isArray(flashcards) ? flashcards.length : 0;

  function openEditModal(e) {
    e.stopPropagation();
    setEditTarget(material);
    setMaterialInputData({ title, description });
    setSelectedFile(null);
    setFileError(null);
    editModalRef.current.openModal();
  }

  async function updateMaterial() {
    if (!editTarget || fileError) return;
    if (buttonRef.current) buttonRef.current.disabled = true;
    setUploading(true);

    let newDownloadURL = '';
    let newFileName = '';
    let newHtmlContent = '';
    let newOriginalExtension = '';

    try {
      if (selectedFile) {
        const parsed = await parseUploadedStudyFile(selectedFile);
        newHtmlContent = parsed.htmlContent;
        newFileName = parsed.fileName;
        newOriginalExtension = parsed.originalExtension;

        const canonicalDocxBlob = await convertHtmlToDocxBlob(newHtmlContent);
        const result = await uploadAndGetDownloadURLFromFirebase(
          canonicalDocxBlob,
          computeFilePath(uid, selectedFile.name)
        );
        if (result && result.URL) {
          newDownloadURL = result.URL;
        } else {
          throw new Error('File upload failed: did not receive a valid download URL.');
        }
      }

      const updatedMaterial = {
        ...material,
        title: sanitizeInput(materialInputData.title) || title,
        description: sanitizeInput(materialInputData.description) || description,
        ...(selectedFile
          ? {
              fileURL: newDownloadURL,
              fileName: newFileName,
              originalExtension: newOriginalExtension,
              htmlContent: newHtmlContent
            }
          : {}),
        updatedAt: new Date().toISOString(),
        passed: selectedFile ? false : material.passed
      };

      await materialApi.update(courseUID, lessonUID, uid, updatedMaterial);
      editModalRef.current.closeModal();
    } catch (err) {
      console.error('Update material error:', err);
      setFileError(err.message || 'Failed to update material');
    } finally {
      if (buttonRef.current) buttonRef.current.disabled = false;
      setUploading(false);
    }
  }

  async function deleteMaterial() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await materialApi.delete(courseUID, lessonUID, uid);
      deleteModalRef.current?.closeModal();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete material error:', err);
      alert(err.message || 'Failed to delete material');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownloadOriginal(e) {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await exportAndDownloadMaterial(material);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download document.');
    } finally {
      setDownloading(false);
    }
  }

  function openRetakeModal(e) {
    e.stopPropagation();
    retakeModalRef.current.openModal();
  }

  function openDeleteModal(e) {
    e.stopPropagation();
    setDeleteTarget(material);
    deleteModalRef.current.openModal();
  }

  function goToQuiz(e) {
    if (e) e.stopPropagation();
    navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials/${uid}/quiz`);
  }

  function goToFlashcards(e) {
    e.stopPropagation();
    navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials/${uid}/flashcards`);
  }

  return (
    <>
      <article
        className="material-row-item"
        onClick={() => navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials/${uid}`)}
      >
        <div className="material-row-left">
          <span
            className="material-row-accent-bar"
            style={{ backgroundColor: accentColor }}
          />
          <div className="material-row-text">
            <div className="material-row-title-line">
              <h3
                className="material-row-title"
                dangerouslySetInnerHTML={{ __html: safeText(title) }}
              />
              <span
                className="material-row-pill"
                style={{
                  color: accentColor,
                  backgroundColor: `${accentColor}1f`,
                  borderColor: `${accentColor}44`
                }}
              >
                {origExt.toUpperCase()}
              </span>
              {flashcardCount > 0 && (
                <span className="material-row-pill is-neutral">
                  {flashcardCount} CARDS
                </span>
              )}
              {passed && (
                <span className="material-row-star" title="Material Passed">
                  ★
                </span>
              )}
            </div>
            <p
              className="material-row-desc"
              dangerouslySetInnerHTML={{ __html: safeText(description) }}
            />
          </div>
        </div>

        <div className="material-row-words">{wordCount}w</div>

        <div className="material-row-date">{dateLabel}</div>

        <div className="material-row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="material-action-chip"
            onClick={goToFlashcards}
            title="Study with AI Flashcards"
          >
            <span className="material-symbols-outlined">style</span>
            <span>Cards</span>
          </button>

          <button
            type="button"
            className="material-action-chip"
            onClick={passed ? openRetakeModal : goToQuiz}
            title={passed ? 'Retake AI Quiz' : 'Take AI Quiz'}
          >
            <span className="material-symbols-outlined">quiz</span>
            <span>Quiz</span>
          </button>

          <button
            type="button"
            className="row-icon-btn"
            onClick={handleDownloadOriginal}
            disabled={downloading}
            title={`Download as .${origExt.toUpperCase()}`}
          >
            <span className="material-symbols-outlined">download</span>
          </button>

          <button
            type="button"
            className="row-icon-btn"
            onClick={openEditModal}
            title="Edit metadata or replace file"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>

          <button
            type="button"
            className="row-icon-btn is-danger"
            onClick={openDeleteModal}
            title="Delete note"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </article>

      {/* EDIT MODAL */}
      <FormModal
        ref={editModalRef}
        header="Edit Note"
        title="Edit Study Note"
        icon="edit"
        onClose={() => {
          setEditTarget(null);
          setMaterialInputData({});
          setSelectedFile(null);
          setFileError(null);
          editModalRef.current.closeModal();
        }}
        subtitle={`Editing "${editTarget?.title || ''}"`}
        closeDisabled={uploading}
        buttonName={uploading ? 'Saving...' : 'Save Changes'}
        buttonCallback={updateMaterial}
        buttonRef={buttonRef}
        disabled={
          uploading ||
          !materialInputData.title ||
          !materialInputData.description ||
          !materialInputData.title.trim() ||
          !materialInputData.description.trim() ||
          materialInputData.title.length > 50 ||
          materialInputData.description.length > 150 ||
          Boolean(fileError)
        }
      >
        <label>Title:</label>
        <input
          type="text"
          defaultValue={editTarget?.title}
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setMaterialInputData({ ...materialInputData, title: e.target.value });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Tags / Summary:</label>
        <textarea
          defaultValue={editTarget?.description}
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setMaterialInputData({ ...materialInputData, description: e.target.value });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>

        <FileDropzone
          label="Replace Study Document (.DOCX, .PDF, .MD, .TXT — Optional):"
          selectedFile={selectedFile}
          error={fileError}
          disabled={uploading}
          onFileSelect={(file, err) => {
            setSelectedFile(file);
            setFileError(err);
          }}
        />
      </FormModal>

      {/* DELETE MODAL */}
      <FormModal
        ref={deleteModalRef}
        header="Confirm Delete"
        title="Delete Note"
        buttonRef={buttonRef}
        icon="delete"
        closeDisabled={deleting}
        onClose={() => {
          setDeleteTarget(null);
          deleteModalRef.current.closeModal();
        }}
        subtitle={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        buttonName={deleting ? 'Deleting...' : 'Delete'}
        buttonCallback={deleteMaterial}
        buttonGradient="var(--delete-gradient)"
        disabled={deleting}
      />

      {/* RETAKE QUIZ MODAL */}
      <Modal
        ref={retakeModalRef}
        title="Retake Quiz?"
        onClose={() => {
          retakeModalRef.current.closeModal();
        }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          Even if you score lower on a retake, your note will remain marked as passed.
        </p>
        <button className="site-button" onClick={() => goToQuiz()} style={{ marginTop: '10px' }}>
          <span className="material-symbols-outlined">quiz</span>
          <span>Proceed to Quiz</span>
        </button>
      </Modal>
    </>
  );
}
