import './material-editor.css';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase-config';
import { get, ref as dbRef } from 'firebase/database';
import { materialApi } from '../../services/api';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import Header from '../../components/Header/Header';
import Modal from '../../components/Modal/Modal';

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import DOMPurify from 'dompurify';

import { 
  fetchAndConvertDocxToHtml, 
  constructMaterialStoragePath,
  constructMaterialDbPath,
  convertHtmlToDocx 
} from '../../utils/materialUtils';
import DPLayout from '../../components/DPLayout/DPLayout';

//Utilities
async function uploadBlobToStorage(storage, path, blob, fileName) {
  const sRef = storageRef(storage, path);
  const snapshot = await uploadBytes(sRef, blob);
  const downloadURL = await getDownloadURL(sRef);
  return { snapshot, downloadURL };
}

//Configure DOMPurify
const purifyConfig = {
  ALLOWED_TAGS: [
    'b', 'i', 'strong', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 
    'a', 'span', 'h1','h2','h3','h4','h5','h6','table','thead','tbody','tr','th','td','blockquote',
    'img'
  ],
  ALLOWED_ATTR: ['href', 'target', 'style', 'colspan', 'rowspan', 'align', 'src', 'alt', 'title', 'width', 'height'],
  ALLOWED_CSS_PROPERTIES: [
    'color', 'background-color', 'text-align', 'font-weight', 
    'font-style', 'text-decoration', 'border', 'border-collapse', 
    'width', 'height', 'padding', 'margin'
  ],
  FORBID_TAGS: ['iframe', 'script', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onmouseout'],
};

export default function MaterialEditor({ userData }) {
  const { courseUID, lessonUID, materialUID } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [editorData, setEditorData] = useState('<p>Loading...</p>');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const editorRef = useRef(null);
  const successModalRef = useRef(null);

  //Load material metadata
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

  //Load file from storage & convert to HTML
  const loadDocumentContent = async (materialData) => {
    console.log('Loading document content...');
    setLoading(true);
    try {
      let htmlContent = '';
      
      // Always prioritize cached HTML content
      if (materialData.htmlContent) {
        htmlContent = materialData.htmlContent;
        console.log('Using cached HTML content');
        setIsFirstLoad(false);
      } else if (materialData.fileURL) {
        htmlContent = await fetchAndConvertDocxToHtml(materialData.fileURL) || '<p></p>';
        console.log('Fetched and converted DOCX to HTML');
        setIsFirstLoad(true);
      } else {
        console.log('No HTML content found, using description');
        htmlContent = materialData.description || '<p></p>';
      }

      // Sanitize HTML using DOMPurify
      const sanitized = DOMPurify.sanitize(htmlContent, purifyConfig);
      setEditorData(sanitized);
    } catch (err) {
      console.error('Error loading document:', err);
      const sanitized = DOMPurify.sanitize(materialData.description || '<p></p>', purifyConfig);
      setEditorData(sanitized);
    } finally {
      setLoading(false);
    }
  };

  // Load content when material changes
  useEffect(() => {
    if (material) {
      loadDocumentContent(material);
    }
  }, [material]);

  //Save material
  async function handleSave() {
    if (!material) return;
    setSaving(true);

    try {
      const html = editorRef.current ? editorRef.current.getData() : editorData;

      if (!html || html === '<p></p>') {
        throw new Error('Editor content is empty. Please add some content before saving.');
      }

      // Sanitize before converting and saving
      const sanitizedHtml = DOMPurify.sanitize(html, purifyConfig);
      console.log('Sanitizing...');

      console.log('Converting HTML to DOCX using docx library...');
      const docxBlob = await convertHtmlToDocx(sanitizedHtml);
      console.log('DOCX blob created successfully');

      const fileName = material.fileName || material.title.split(' ')[0].toLowerCase() + '.docx';
      const path = constructMaterialStoragePath(userData.uid, courseUID, lessonUID, material);
      if (!path) throw new Error('Cannot determine storage path for material.');

      console.log('Uploading to storage path:', path);
      const { downloadURL } = await uploadBlobToStorage(storage, path, docxBlob, fileName);

      console.log('File uploaded, updating database...');
      const matPath = constructMaterialDbPath(userData.uid, courseUID, lessonUID, material.uid);
      const materialDbRef = dbRef(db, matPath);

      const updatedMaterial = {
        ...material,
        fileURL: downloadURL,
        htmlContent: sanitizedHtml,
        updatedAt: new Date().toISOString(),
        fileName: material.fileName || fileName
      };

      console.log('Material updated:', updatedMaterial);

      await materialApi.update(courseUID, lessonUID, material.uid, updatedMaterial);

      setMaterial(updatedMaterial);
      setEditorData(sanitizedHtml);

      successModalRef.current.openModal();
      
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving material: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleSuccessModalClose = () => {
    successModalRef.current.closeModal();
  };

  useEffect(() => {
    if (editorRef.current && editorData) {
      const currentContent = editorRef.current.getData();
      if (currentContent !== editorData) {
        editorRef.current.setData(editorData);
      }
    }
  }, [editorData]);

  return (
    <>
      <Header
        userData={userData}
        title="Materials Editor"
        subtitle="Viewing material for Lesson"
        icon="description"
      />

      <DPLayout>
        <span className="back-button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span> Back
        </span>

        <div className="material-editor-page">
          <div className="editor-header">
            <div className="editor-title">
              <h2>{material?.title || 'Material Editor'}</h2>
              <p className="muted">Editing material for lesson — {material?.title}</p>
            </div>
            <div className="editor-actions">
              <button className="site-button" onClick={handleSave} disabled={saving || loading}>
                <span className="material-symbols-outlined">save</span>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="editor-container" style={{ width: '100%' }}>
            {loading ? (
              <div className="loading">{isFirstLoad ? 'Loading DOCX...' : 'Converting DOCX to HTML...'}</div>
            ) : (
              <div className="ck-editor-dark">
                <CKEditor
                  editor={ClassicEditor}
                  data={editorData}
                  onReady={(editor) => {
                    editorRef.current = editor;
                    console.log('Editor ready with data!');
                  }}
                  onChange={(event, editor) => {
                    const newData = editor.getData();
                    setEditorData(newData);
                  }}
                  config={{
                    toolbar: [
                      'heading', '|', 'bold', 'italic', 'link',
                      'bulletedList', 'numberedList', '|',
                      'insertTable', 'blockQuote', 'undo', 'redo'
                    ],
                    table: {
                      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </DPLayout>

      {/* Save Success Modal */}
      <Modal
        ref={successModalRef}
        title="Save Successful"
        onClose={handleSuccessModalClose}
        withTitle={true}
        withCloseButton={true}
      >
        <div className="save-success-modal">
          <div className="success-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="success-message">
            <h3>Material Saved Successfully!</h3>
            <p>Your changes have been saved and the DOCX file has been updated in Firebase Storage.</p>
          </div>
          <div className="success-actions">
            <button 
              className="site-button" 
              onClick={handleSuccessModalClose}
              style={{width: '100%'}}
            >
              Continue Editing
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}