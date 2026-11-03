import './materials.css';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { ref as dbRef, get, onValue, off } from 'firebase/database';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

import Header from '../../components/Header/Header';
import DPLayout from '../../components/DPLayout/DPLayout';
import FormModal from '../../components/Modal/FormModal/FormModal';
import MaterialCard from '../../components/MaterialCard/MaterialCard';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import FilterChips from '../../components/ui/FilterChips/FilterChips';
import FileDropzone from '../../components/ui/FileDropzone/FileDropzone';
import LoaderSpinner from '../../components/LoaderSpinner/LoaderSpinner';

import { UIDGenerator } from '../../utils/UIDGenerator';
import { sanitizeInput, verifyInput } from '../../utils/InputSanitize';
import { uploadAndGetDownloadURLFromFirebase } from '../../utils/FirebaseHelper';
import { materialApi } from '../../services/api';
import { parseUploadedStudyFile } from '../../services/documentParser';
import { convertHtmlToDocxBlob } from '../../services/documentExporter';
import { getMaterialOriginalExtension } from '../../utils/materialUtils';

function countWords(html, fallback = '') {
  const text = html ? html.replace(/<[^>]+>/g, ' ') : fallback || '';
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function Materials({ userData }) {
  const { courseUID, lessonUID } = useParams();
  const navigate = useNavigate();

  const [lessonData, setLessonData] = useState({});
  const [materials, setMaterials] = useState({});
  const [materialInputData, setMaterialInputData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const addModalRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  function computeFilePath(materialUID, filename) {
    const cleanBase = (filename || 'material').replace(/\.(docx|pdf|txt|md)$/i, '');
    return `materials/${userData.uid}/${courseUID}/${lessonUID}/${materialUID}-${cleanBase}.docx`;
  }

  useEffect(() => {
    setLoading(true);

    const lessonRef = dbRef(db, `courses/${userData.uid}/${courseUID}/Lessons/${lessonUID}`);
    get(lessonRef)
      .then((snap) => {
        if (snap.exists()) setLessonData(snap.val());
        else navigate('/main/dashboard');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch lesson metadata:', err);
        setLoading(false);
      });

    const materialsRef = dbRef(
      db,
      `courses/${userData.uid}/${courseUID}/Lessons/${lessonUID}/Materials`
    );

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
  }, [userData.uid, courseUID, lessonUID, navigate]);

  const materialList = useMemo(() => {
    return materials ? Object.values(materials) : [];
  }, [materials]);

  const totalWordsCount = useMemo(() => {
    return materialList.reduce(
      (sum, m) => sum + countWords(m.htmlContent, m.description),
      0
    );
  }, [materialList]);

  const filteredMaterials = useMemo(() => {
    return materialList.filter((mat) => {
      const matchesQuery =
        (mat.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mat.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mat.fileName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesQuery) return false;

      if (activeFilter === 'passed') return Boolean(mat.passed);
      if (activeFilter === 'pending') return !mat.passed;
      if (['docx', 'pdf', 'md', 'txt'].includes(activeFilter)) {
        return getMaterialOriginalExtension(mat) === activeFilter;
      }
      return true;
    });
  }, [materialList, searchTerm, activeFilter]);

  const filterOptions = useMemo(() => {
    const passedCount = materialList.filter((m) => m.passed).length;
    const docxCount = materialList.filter((m) => getMaterialOriginalExtension(m) === 'docx').length;
    const pdfCount = materialList.filter((m) => getMaterialOriginalExtension(m) === 'pdf').length;
    const mdCount = materialList.filter((m) => getMaterialOriginalExtension(m) === 'md').length;
    const txtCount = materialList.filter((m) => getMaterialOriginalExtension(m) === 'txt').length;

    return [
      { id: 'all', label: 'All' },
      { id: 'passed', label: 'Passed', count: passedCount, color: '#10b981' },
      { id: 'pending', label: 'Pending', count: materialList.length - passedCount, color: '#f59e0b' },
      { id: 'docx', label: 'DOCX', count: docxCount, color: '#3b82f6' },
      { id: 'pdf', label: 'PDF', count: pdfCount, color: '#ec4899' },
      { id: 'md', label: 'MD', count: mdCount, color: '#a855f7' },
      { id: 'txt', label: 'TXT', count: txtCount, color: '#64748b' }
    ];
  }, [materialList]);

  const handleSearch = useCallback((debouncedQuery) => {
    setSearchTerm(debouncedQuery || '');
  }, []);

  async function addMaterial(data) {
    if (!data.title || !data.description || fileError) return;

    if (buttonRef.current) buttonRef.current.disabled = true;
    setUploading(true);

    const uid = UIDGenerator();

    try {
      let downloadURL = null;
      let fileName = null;
      let originalExtension = 'docx';
      let htmlContent = `<h1>${data.title}</h1><p>${data.description}</p>`;

      if (selectedFile) {
        setUploadStage('Extracting document...');
        const parsed = await parseUploadedStudyFile(selectedFile);
        htmlContent = parsed.htmlContent;
        originalExtension = parsed.originalExtension;
        fileName = parsed.fileName;

        setUploadStage('Processing document...');
        const canonicalDocxBlob = await convertHtmlToDocxBlob(htmlContent);

        setUploadStage('Uploading document...');
        const storagePath = computeFilePath(uid, selectedFile.name);
        const res = await uploadAndGetDownloadURLFromFirebase(canonicalDocxBlob, storagePath);
        if (res && res.URL) {
          downloadURL = res.URL;
        } else {
          throw new Error('File upload failed: did not receive a valid download URL.');
        }
      }

      setUploadStage('Saving note...');
      const materialData = {
        ...data,
        uid,
        createdAt: new Date().toISOString(),
        fileURL: downloadURL,
        fileName,
        originalExtension,
        htmlContent,
        passed: false
      };

      await materialApi.create(courseUID, lessonUID, materialData);

      addModalRef.current.closeModal();
      setMaterialInputData({});
      setSelectedFile(null);
      setFileError(null);
    } catch (err) {
      console.error('Add material error:', err);
      setFileError(err.message || 'Failed to add material');
    } finally {
      if (buttonRef.current) buttonRef.current.disabled = false;
      setUploading(false);
      setUploadStage('');
    }
  }

  function openAddModal() {
    setMaterialInputData({});
    setSelectedFile(null);
    setFileError(null);
    addModalRef.current.openModal();
  }

  return (
    <>
      <Header
        userData={userData}
        title={lessonData?.title || 'My Notes'}
        icon="description"
      />

      <DPLayout>
        <div className="materials-page-wrapper">
          <span className="back-button" onClick={() => navigate(`/main/course/${courseUID}`)}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Lessons
          </span>

          {/* Row 1: Search + New Note Button */}
          <div className="telemetry-toolbar-row">
            <SearchBar
              placeholder="Search notes, tags, content..."
              onSearch={handleSearch}
            />
            <button type="button" className="site-button" onClick={openAddModal}>
              <span className="material-symbols-outlined">add</span>
              New Note
            </button>
          </div>

          {/* Row 2: Monospace Summary + Filter Chips */}
          <div className="telemetry-meta-filter-bar">
            <div className="telemetry-meta-counts">
              <span>{materialList.length} notes</span>
              <span className="telemetry-meta-divider">|</span>
              <span>{totalWordsCount.toLocaleString()}w total</span>
            </div>

            <FilterChips
              options={filterOptions}
              activeId={activeFilter}
              onChange={setActiveFilter}
            />
          </div>

          {/* Row 3: Column Headers */}
          <div className="telemetry-list-columns-header is-materials-grid">
            <span>TITLE / TAGS</span>
            <span style={{ textAlign: 'right' }}>WORDS</span>
            <span style={{ textAlign: 'right' }}>UPDATED</span>
            <span style={{ textAlign: 'right' }}>ACTIONS</span>
          </div>

          {/* Row 4: Connected Horizontal Rows */}
          {loading ? (
            <LoaderSpinner />
          ) : materialList.length > 0 ? (
            filteredMaterials.length > 0 ? (
              <section className="telemetry-list-container">
                {filteredMaterials.map((mat) => (
                  <MaterialCard
                    key={mat.uid}
                    material={mat}
                    userData={userData}
                    courseUID={courseUID}
                    lessonUID={lessonUID}
                    computeFilePath={computeFilePath}
                    setMaterials={setMaterials}
                  />
                ))}
              </section>
            ) : (
              <div className="empty-container">
                <h3>No matching notes</h3>
                <p>Try clearing your search query or changing the active filter.</p>
              </div>
            )
          ) : (
            <div className="empty-container">
              <span className="material-symbols-outlined">description</span>
              <h3>No study notes yet</h3>
              <p>Upload a DOCX, PDF, Markdown, or TXT file—or create a blank note to start studying.</p>
              <button type="button" className="site-button" onClick={openAddModal}>
                <span className="material-symbols-outlined">add</span>
                New Note
              </button>
            </div>
          )}
        </div>
      </DPLayout>

      <FormModal
        ref={addModalRef}
        header="New Note"
        title="Add Study Note"
        icon="upload_file"
        subtitle="Upload a study document (.docx, .pdf, .md, .txt) or leave blank to write notes from scratch."
        buttonName={uploading ? uploadStage || 'Processing...' : 'Create Note'}
        buttonCallback={() =>
          addMaterial({
            ...materialInputData,
            title: sanitizeInput(materialInputData.title),
            description: sanitizeInput(materialInputData.description)
          })
        }
        disabled={
          !materialInputData.title ||
          !materialInputData.description ||
          materialInputData.title.length > 50 ||
          materialInputData.description.length > 150 ||
          uploading ||
          Boolean(fileError)
        }
        closeDisabled={uploading}
        onClose={() => {
          setSelectedFile(null);
          setFileError(null);
          addModalRef.current.closeModal();
        }}
        buttonRef={buttonRef}
      >
        <label>Title:</label>
        <input
          type="text"
          placeholder="e.g., Vector Fields & Curl Theorem"
          onInput={(e) => {
            verifyInput(e.target.value, titleRef, 50);
            setMaterialInputData({ ...materialInputData, title: sanitizeInput(e.target.value) });
          }}
        />
        <span className="error-message" ref={titleRef}></span>

        <label>Tags / Summary:</label>
        <textarea
          placeholder="e.g., #calculus #vectors #final-prep"
          onInput={(e) => {
            verifyInput(e.target.value, descriptionRef, 150);
            setMaterialInputData({
              ...materialInputData,
              description: sanitizeInput(e.target.value)
            });
          }}
        ></textarea>
        <span className="error-message" ref={descriptionRef}></span>

        <FileDropzone
          label="Upload Document (.DOCX, .PDF, .MD, .TXT — Optional):"
          selectedFile={selectedFile}
          error={fileError}
          disabled={uploading}
          onFileSelect={(file, err) => {
            setSelectedFile(file);
            setFileError(err);
          }}
        />
      </FormModal>
    </>
  );
}
