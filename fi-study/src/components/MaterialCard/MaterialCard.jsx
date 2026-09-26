import './material-card.css';
import { useRef, useState } from 'react';
import FormModal from '../Modal/FormModal/FormModal';
import Modal from '../Modal/Modal';
import { uploadAndGetDownloadURLFromFirebase } from '../../utils/FirebaseHelper';
import { materialApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { verifyInput, sanitizeInput, safeText } from '../../utils/InputSanitize';
import { convertDocxToHtml } from '../../utils/materialUtils';

export default function MaterialCard({ material, userData, courseUID, lessonUID, computeFilePath }) {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [materialInputData, setMaterialInputData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const navigate = useNavigate();

  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const retakeModalRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const fileRef = useRef(null);
  const fileErrorRef = useRef(null);

  // Destructure material, also, to have easier access for fields
  const { title, description, fileName, fileURL, passed, uid, htmlContent } = material;

  // OPEN EDIT
  function openEditModal() {
    setEditTarget(material);
    setMaterialInputData({ title, description });
    editModalRef.current.openModal();
  }

  // UPDATE MATERIAL
  async function updateMaterial() {
    if (!editTarget) return;
    buttonRef.current.disabled = true;
    setUploading(true);

    const file = fileRef.current.files[0];

    //Initialize variables
    let newDownloadURL = ``;
    let newFileName = ``;
    let newHtmlContent = '';

    try {
      if (file) {
        // check file type, if not docx, throw error
        if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          throw new Error('Only .docx files are allowed.');
        }
        
        // Convert DOCX to HTML first using mammoth
        console.log('Converting uploaded DOCX to HTML...');
        newHtmlContent = await convertDocxToHtml(file);
        console.log('DOCX converted to HTML successfully');
        
        // Then upload the file to Firebase Storage
        console.log('Uploading DOCX to Firebase Storage...');
        const result = await uploadAndGetDownloadURLFromFirebase(file, computeFilePath(uid, file.name));
        if (result && result.URL) {
          newDownloadURL = result.URL;
          newFileName = file.name;
        } else {
          throw new Error("File upload failed: did not receive a valid download URL.");
        }
        console.log('DOCX uploaded successfully');
      }

      //update the material metadata
      const updatedMaterial = {
        ...material,
        title: sanitizeInput(materialInputData.title) || title, //if no title, keep the existing title
        description: sanitizeInput(materialInputData.description) || description, //if no description, keep the existing description
        ...(file ? { 
          fileURL: newDownloadURL, 
          fileName: newFileName,
          htmlContent: newHtmlContent // Store the converted HTML content
        } : {}),
        updatedAt: new Date().toISOString(),
        passed: file ? false : material.passed, // Reset passed status if new file uploaded
      };

      console.log('Updating material via Fi-API...');
      await materialApi.update(courseUID, lessonUID, uid, updatedMaterial);

      editModalRef.current.closeModal();

    } catch (err) {
      console.error('Update material error:', err);
      alert(err.message || 'Failed to update material');
    } finally {
      buttonRef.current.disabled = false;
      setUploading(false);
    }
  }

  // DELETE MATERIAL
  async function deleteMaterial() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      // delete material via Fi-API (backend cleans up storage file & DB record)
      await materialApi.delete(courseUID, lessonUID, uid);
      // close modal safely
      deleteModalRef.current?.closeModal();
      setDeleteTarget(null);
      setDeleting(false);
    } catch (err) {
      setDeleting(false);
      console.error('Delete material error:', err);
      alert(err.message || 'Failed to delete material');
    }
  }

  // RETAKE
  function openRetakeModal() {
    retakeModalRef.current.openModal();
  }

  // OPEN DELETE
  function openDeleteModal() {
    setDeleteTarget(material);
    deleteModalRef.current.openModal();
  }

  // NAVIGATE TO QUIZ
  function goToQuiz() {
    navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials/${uid}/quiz`);
  }

  return (
    <>
      <div className="material-post-card">
        <div className="post-header">
          <div className="post-info">
            <h3 dangerouslySetInnerHTML={{__html: safeText(title)}}></h3>
            <p className="subtitle" dangerouslySetInnerHTML={{__html: safeText(description)}}></p>
          </div>
          {passed ? <span className="status passed">Passed</span> : <span className="status not-passed">Not Passed</span>}
        </div>

        {fileName && (
          <div className="material-header">
            <div className="post-file">
              <span className="material-symbols-outlined">description</span>
              <a href={fileURL} target="_blank" rel="noopener noreferrer" dangerouslySetInnerHTML={{__html: safeText(fileName)}}></a>
            </div>
          </div>
        )}

        <div className="post-actions">
          <button onClick={() => navigate(`/main/course/${courseUID}/lesson/${lessonUID}/materials/${uid}`)}>
            <span className="material-symbols-outlined">visibility</span> View
          </button>

          {passed ? (
            <button onClick={openRetakeModal}>
              <span className="material-symbols-outlined">quiz</span> Retake Quiz
            </button>
          ) : (
            <button onClick={goToQuiz}>
              <span className="material-symbols-outlined">quiz</span> Take Quiz
            </button>
          )}

          <button onClick={openEditModal}>
            <span className="material-symbols-outlined">edit</span> Edit
          </button>
          <button onClick={openDeleteModal} className="delete">
            <span className="material-symbols-outlined">delete</span> Delete
          </button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <FormModal
        ref={editModalRef}
        header="Edit Material"
        title="Edit Material"
        icon="edit"
        onClose={() => { setEditTarget(null); setMaterialInputData({}); editModalRef.current.closeModal(); }}
        subtitle={`Editing "${editTarget?.title || ''}"`}
        closeDisabled={uploading}
        buttonName={uploading ? 'Saving...' : 'Save Changes'}
        buttonCallback={() => {
          updateMaterial();
        }}
        buttonRef={buttonRef}
        disabled={uploading || !materialInputData.title || !materialInputData.description || !materialInputData.title.trim() || !materialInputData.description.trim() || materialInputData.title.length > 50 || materialInputData.description.length > 150 || disabled}
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

        <label>Description:</label>
        <textarea
          defaultValue={editTarget?.description}
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setMaterialInputData({ ...materialInputData, description: e.target.value });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>

        <label id='docx-label-update'>Replace DOCX File (optional):</label>
        <input type="file" accept=".docx" ref={fileRef} id='docx-update'
          onChange={(e) => {
            const file = e.target.files[0];
            if(!file || file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
              fileErrorRef.current.innerHTML = 'Only .docx files are allowed.'
              fileRef.current.value = '';
              setDisabled(true);
            } else {
              fileErrorRef.current.innerHTML = '';
              setDisabled(false);
            }
          }} />
          <span className="error-message" ref={fileErrorRef}></span>
      </FormModal>

      {/* DELETE MODAL */}
      <FormModal
        ref={deleteModalRef}
        header="Confirm Delete"
        title="Delete Material"
        buttonRef={buttonRef}
        icon="delete"
        closeDisabled={deleting}
        onClose={() => { setDeleteTarget(null); deleteModalRef.current.closeModal(); }}
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
        onClose={() => {retakeModalRef.current.closeModal();}}
      >
        <p>Even if you fail, this is still marked as passed.</p>
        <button className="site-button" onClick={goToQuiz} style={{ marginTop: '10px' }}>
          Retake Quiz
        </button>
      </Modal>
    </>
  );
}