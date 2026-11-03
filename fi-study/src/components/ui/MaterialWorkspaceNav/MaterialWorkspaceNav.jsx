import { useNavigate } from 'react-router-dom';
import './material-workspace-nav.css';

export default function MaterialWorkspaceNav({
  courseUID,
  lessonUID,
  materialUID,
  activeTab = 'editor'
}) {
  const navigate = useNavigate();
  const basePath = `/main/course/${courseUID}/lesson/${lessonUID}/materials/${materialUID}`;

  const tabs = [
    {
      id: 'editor',
      label: 'Note Editor',
      icon: 'edit_document',
      path: basePath
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: 'style',
      path: `${basePath}/flashcards`
    },
    {
      id: 'quiz',
      label: 'Quiz Generator',
      icon: 'quiz',
      path: `${basePath}/quiz`
    }
  ];

  return (
    <div className="material-workspace-nav" role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`workspace-tab ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="material-symbols-outlined tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
