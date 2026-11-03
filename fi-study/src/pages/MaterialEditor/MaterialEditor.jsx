import './material-editor.css';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase-config';
import { get, ref as dbRef } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { materialApi } from '../../services/api';

import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import Modal from '../../components/Modal/Modal';
import MaterialWorkspaceNav from '../../components/ui/MaterialWorkspaceNav/MaterialWorkspaceNav';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import RichTextEditor from '../../components/Editor/RichTextEditor';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

import {
  constructMaterialStoragePath,
  constructMaterialDbPath,
  getMaterialOriginalExtension,
  resolveMaterialHtml,
  exportAndDownloadMaterial
} from '../../utils/materialUtils';
import { sanitizeMaterialHtml } from '../../services/documentParser';
import { convertHtmlToDocxBlob } from '../../services/documentExporter';

async function uploadBlobToStorage(storageInstance, path, blob) {
  const sRef = storageRef(storageInstance, path);
  const snapshot = await uploadBytes(sRef, blob);
  const downloadURL = await getDownloadURL(sRef);
  return { snapshot, downloadURL };
}

export default function MaterialEditor({ userData }) {
  const { courseUID, lessonUID, materialUID } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [editorData, setEditorData] = useState('<p></p>');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const successModalRef = useRef(null);

  const origExt = getMaterialOriginalExtension(material);

  // Load material metadata
  useEffect(() => {
    if (!userData?.uid) return;

    const matPath = constructMaterialDbPath(userData.uid, courseUID, lessonUID, materialUID);
    const mRef = dbRef(db, matPath);

    get(mRef)
      .then((snap) => {
        if (!snap.exists()) {
          navigate(-1);
          return;
        }
        setMaterial(snap.val());
      })
      .catch((err) => {
        console.error(err);
        navigate(-1);
      });
  }, [userData, courseUID, lessonUID, materialUID, navigate]);

  // Load document content (from cached htmlContent, canonical .docx in Storage, or description)
  useEffect(() => {
    if (!material) return;
    let isMounted = true;

    async function loadContent() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const resolvedHtml = await resolveMaterialHtml(material);
        const sanitized = sanitizeMaterialHtml(resolvedHtml, getMaterialOriginalExtension(material));
        if (isMounted) {
          setEditorData(sanitized);
          setIsDirty(false);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Could not load document from storage; loaded fallback notes.');
          const fallback = sanitizeMaterialHtml(
            material.description ? `<p>${material.description}</p>` : '<p></p>',
            getMaterialOriginalExtension(material)
          );
          setEditorData(fallback);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContent();
    return () => {
      isMounted = false;
    };
  }, [material]);

  async function handleSave() {
    if (!material) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const sanitizedHtml = sanitizeMaterialHtml(editorData, origExt);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedHtml;
      const textOnly = (tempDiv.innerText || tempDiv.textContent || '').trim();

      if (!textOnly) {
        throw new Error('Editor content cannot be empty. Please write some study notes before saving.');
      }

      // Always store canonical .docx in Firebase Storage while preserving originalExtension & fileName
      const docxBlob = await convertHtmlToDocxBlob(sanitizedHtml);
      const preservedFileName =
        material.fileName ||
        `${(material.title || 'notes').split(' ')[0].toLowerCase()}.${origExt}`;

      const path = constructMaterialStoragePath(userData.uid, courseUID, lessonUID, {
        ...material,
        fileName: preservedFileName
      });

      const { downloadURL } = await uploadBlobToStorage(storage, path, docxBlob);

      const updatedMaterial = {
        ...material,
        fileURL: downloadURL,
        htmlContent: sanitizedHtml,
        fileName: preservedFileName,
        originalExtension: origExt,
        updatedAt: new Date().toISOString()
      };

      await materialApi.update(courseUID, lessonUID, material.uid, updatedMaterial);

      setMaterial(updatedMaterial);
      setEditorData(sanitizedHtml);
      setIsDirty(false);
      successModalRef.current?.openModal();
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg(err.message || 'Failed to save material.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadOriginalFormat() {
    if (!material || downloading) return;
    setDownloading(true);
    try {
      await exportAndDownloadMaterial(material, editorData, origExt);
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Failed to export document.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Header
        userData={userData}
        title={material?.title || 'Material Editor'}
        icon="edit_document"
      />

      <DPLayout>
        <div className="workspace-top-bar">
          <span
            className="back-button"
            onClick={() =>
              navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials`)
            }
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Materials
          </span>

          <MaterialWorkspaceNav
            courseUID={courseUID}
            lessonUID={lessonUID}
            materialUID={materialUID}
            activeTab="editor"
          />
        </div>

        <div className="material-editor-page">
          <div className="editor-header">
            <div className="editor-title">
              <div className="editor-title-row">
                <h2>{material?.title || 'Material Editor'}</h2>
              </div>
              <p className="muted">{material?.description}</p>
            </div>

            <div className="editor-actions">
              <button
                type="button"
                className="site-button secondary"
                onClick={handleDownloadOriginalFormat}
                disabled={loading || downloading}
                title={`Download as .${origExt.toUpperCase()}`}
              >
                <span className="material-symbols-outlined">download</span>
                <span>{downloading ? 'Downloading...' : `Download .${origExt.toUpperCase()}`}</span>
              </button>

              <button
                type="button"
                className="site-button"
                onClick={handleSave}
                disabled={saving || loading}
              >
                <span className="material-symbols-outlined">save</span>
                <span>{saving ? 'Saving...' : 'Save Material'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="editor-alert-banner">
              <span className="material-symbols-outlined">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="editor-container">
            {loading ? (
              <div className="loading">
                <LoaderSpinner />
              </div>
            ) : (
              <RichTextEditor
                content={editorData}
                originalExtension={origExt}
                isDirty={isDirty}
                saving={saving}
                onChange={(newHtml) => {
                  setEditorData(newHtml);
                  setIsDirty(true);
                }}
              />
            )}
          </div>
        </div>
      </DPLayout>

      {/* Save Success Modal */}
      <Modal
        ref={successModalRef}
        title="Material Saved"
        onClose={() => successModalRef.current?.closeModal()}
        withTitle={true}
        withCloseButton={true}
      >
        <div className="save-success-modal">
          <div className="success-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="success-message">
            <h3>Material Saved Successfully</h3>
            <p>Your study notes have been saved.</p>
          </div>
          <div className="success-actions">
            <button
              className="site-button"
              onClick={() => successModalRef.current?.closeModal()}
              style={{ width: '100%' }}
            >
              Continue Editing
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
