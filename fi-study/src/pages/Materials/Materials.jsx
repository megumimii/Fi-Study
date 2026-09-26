import './materials.css';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase-config';
import { ref as dbRef, get, onValue, off, update } from 'firebase/database';
import { useEffect, useState, useRef } from 'react';

// Components
import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import FormModal from '../../components/Modal/FormModal/FormModal';
import MaterialCard from '../../components/MaterialCard/MaterialCard';

// Utils
import { UIDGenerator } from '../../utils/UIDGenerator';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import { uploadAndGetDownloadURLFromFirebase } from '../../utils/FirebaseHelper';
import { materialApi } from '../../services/api';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

// MATERIALS PAGE
export default function Materials({ userData }) {
  const { courseUID, lessonUID } = useParams();
  const navigate = useNavigate();

  const [lessonData, setLessonData] = useState({});
  const [materials, setMaterials] = useState([]);
  const [materialInputData, setMaterialInputData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [filterCount, setFilterCount] = useState(0);
  const [disabled, setDisabled] = useState(false);

  // Refs for modals and form fields
  const addModalRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const fileRef = useRef(null);
  const fileErrorRef = useRef(null);

  // Compute Firebase Storage path for each file
  function computeFilePath(materialUID, filename) {
    return `materials/${userData.uid}/${courseUID}/${lessonUID}/${materialUID}-${filename}`;
  }

  // FETCH
  useEffect(() => {

    setLoading(true);

    //Safeguard
    const lessonRef = dbRef(db, `courses/${userData.uid}/${courseUID}/Lessons/${lessonUID}`);
    get(lessonRef)
    .then((snap) => {
      if (snap.exists()) setLessonData(snap.val());
      else navigate(`/main/dashboard`);
      setLoading(false);
    })
    .catch((err) => console.error('Failed to fetch lesson metadata:', err) && setLoading(false));

    const materialsRef = dbRef(db, `courses/${userData.uid}/${courseUID}/Lessons/${lessonUID}/Materials`);

    // Watch for changes in materials
    onValue(
      materialsRef,
      (snapshot) => {
        setMaterials(snapshot.exists() ? snapshot.val() : {});
        setLoading(false);
      },
      (err) => {
        console.warn('Materials listener notice:', err.message);
        setLoading(false);
      }
    );

    return () => off(materialsRef);
  }, []);

  // Filter materials based on searchTerm
  useEffect(() => {
    if (materials && Object.keys(materials).length > 0) {
      const filtered = Object.values(materials).filter((mat) =>
        mat.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMaterials(filtered);
      setFilterCount(filtered.length);
    } else {
      setFilteredMaterials([]);
      setFilterCount(0);
    }
  }, [searchTerm, materials]);

  // ADD MATERIAL
  function addMaterial(data) {
    if (!data.title || !data.description) return;

    buttonRef.current.disabled = true;
    setUploading(true);

    const uid = UIDGenerator();
    const file = fileRef.current.files[0];
    let downloadURL = null;
    let fileName = null;

    //If there is a file, upload it and get the download URL
    const maybeUpload = file
      ? uploadAndGetDownloadURLFromFirebase(file, computeFilePath(uid, file.name))
          .then(res => {
            if (res && res.URL) {
              downloadURL = res.URL;
              fileName = file.name;
            } else {
              throw new Error("File upload failed: did not receive a valid download URL.");
            }
          })
      : Promise.resolve(); //If none, just resolve a promise

    maybeUpload
      .then(() => {
        const materialData = {
          ...data,
          uid,
          createdAt: new Date().toISOString(),
          fileURL: downloadURL || null,
          fileName: fileName || null,
          passed: false,
        };
        return materialApi.create(courseUID, lessonUID, materialData);
      })
      .then(() => {
        addModalRef.current.closeModal();
        setMaterialInputData({});
        if (fileRef.current) fileRef.current.value = '';
      })
      .catch((err) => {
        console.error('Add material error:', err);
        alert(err.message || 'Failed to add material');
      })
      .finally(() => {
        buttonRef.current.disabled = false;
        setUploading(false);
      });
  }

  function openAddModal() {
    addModalRef.current.openModal();
    setMaterialInputData({});
  }

  return (
    <>
      <Header
        userData={userData}
        title={lessonData?.title || 'Lesson'}
        subtitle="View and manage your lesson materials"
        icon="menu_book"
      />

      <DPLayout>
        <span className="back-button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>Back
        </span>

        <section id="materials-container">
          <div className="materials-add-container">
            <span className="title-subtitle-container">
              <h2 className="h1-icon">
                <span className="material-symbols-outlined">inventory_2</span>
                Materials
              </h2>
              <p>Manage all your lesson materials here</p>
            </span>
            <button className="site-button" onClick={openAddModal}>
              <span className="material-symbols-outlined">add</span>Add Material
            </button>
          </div>

          <input
            type="search"
            placeholder="Search materials..."
            className='search-bar'
            style={{marginBottom: `10px`}}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className={loading || filterCount === 0 ? 'loading-container-all' : "materials-cards-container"}>
            {loading ? (
              <LoaderSpinner />
            ) : (
              <>
                {materials && Object.keys(materials).length > 0 ? (
                  filterCount > 0 ? (
                    filteredMaterials.map((mat, i) => (
                      <MaterialCard
                        key={i}
                        material={mat}
                        userData={userData}
                        courseUID={courseUID}
                        lessonUID={lessonUID}
                        computeFilePath={computeFilePath}
                        setMaterials={setMaterials}
                      />
                    ))
                  ) : (
                      <div className='empty-container'>
                        <div className="title-subtitle-container" style={{alignItems: 'center'}}>
                          <h2>Err... There's nothing.</h2>
                          <p>No Materials Found</p>
                        </div>
                      </div>
                  )
                ) : (
                  <div className="empty-container">
                    <span className="material-symbols-outlined">inventory_2</span>
                    <h2>No Materials Found</h2>
                    <p>Click below to add a new material</p>
                    <button className="site-button" onClick={openAddModal}>
                      <span className="material-symbols-outlined">add</span>Add Material
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </DPLayout>

      {/* ADD MODAL */}
      <FormModal
        ref={addModalRef}
        header="Add Material"
        title="Add New Material"
        icon="add"
        subtitle="Upload a new lesson material (.docx only)"
        buttonName={uploading ? 'Uploading...' : 'Add Material'}
        buttonCallback={() => addMaterial({
          ...materialInputData,
          title: sanitizeInput(materialInputData.title),
          description: sanitizeInput(materialInputData.description)
        })}
        disabled={!materialInputData.title || !materialInputData.description || materialInputData.title.length > 50 || materialInputData.description.length > 150 || uploading || disabled }
        onClose={() => addModalRef.current.closeModal()}
        buttonRef={buttonRef}
      >
        <label>Title:</label>
        <input
          type="text"
          placeholder="Material title"
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setMaterialInputData({ ...materialInputData, title: sanitizeInput(e.target.value) });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Description:</label>
        <textarea
          placeholder="Material description"
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setMaterialInputData({ ...materialInputData, description: sanitizeInput(e.target.value) });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>

        <label id="docx-label">Upload DOCX File: (Optional) </label>
        <input type="file" accept=".docx" ref={fileRef} id='docx' onChange={(e) => {
          const file = e.target.files[0]; //Check if file is .docx
          if (!file || file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            fileErrorRef.current.textContent = 'Only .docx files are allowed.';
            fileRef.current.value = '';
            setDisabled(true);
          } else {
            fileErrorRef.current.textContent = '';  
            setDisabled(false);   
          }
        }} />
        <span className="error-message" ref={fileErrorRef}></span>
      </FormModal>
    </>
  );
}
