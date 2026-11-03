import './dashboard-sidebar.css';
import { auth } from '../../firebase-config';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useRef } from 'react';
import Modal from '../../components/Modal/Modal';
import fiStudyLogo from '../../assets/fi-study-logo.png';

export default function DashboardSideBar({ userData }) {
  const logoutModalRef = useRef(null);
  const navigate = useNavigate();

  const firstName = userData?.firstName || 'Student';
  const lastName = userData?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase() || 'FS';

  function logout() {
    logoutModalRef.current.closeModal();
    signOut(auth)
      .then(() => {
        localStorage.clear();
      })
      .catch((error) => console.error(error));
  }

  return (
    <>
      <aside id="dashboard-sidebar">
        <div id="dashboard-sidebar-logo-container" onClick={() => navigate('/main/dashboard')}>
          <img src={fiStudyLogo} alt="Fi-Study Logo" className="sidebar-logo-img" />
          <span className="sidebar-brand-title">Fi-Study</span>
        </div>

        <nav id="dashboard-sidebar-links-container" aria-label="Main Navigation">
          <NavLink to="/main/dashboard" className="dashboard-sidebar-link">
            <span className="material-symbols-outlined">grid_view</span>
            <span className="nav-text">Dashboard</span>
          </NavLink>

          <NavLink to="/main/course" className="dashboard-sidebar-link">
            <span className="material-symbols-outlined">menu_book</span>
            <span className="nav-text">My Courses</span>
          </NavLink>

          <NavLink to="/main/profile" className="dashboard-sidebar-link">
            <span className="material-symbols-outlined">trending_up</span>
            <span className="nav-text">Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom-zone">
          <div className="sidebar-utility-links">
            <button
              type="button"
              className="sidebar-utility-btn is-logout"
              onClick={() => logoutModalRef.current.openModal()}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Sign out</span>
            </button>
          </div>

          <div
            className="sidebar-user-row"
            onClick={() => navigate('/main/profile')}
            role="button"
            tabIndex={0}
          >
            <div className="sidebar-user-avatar">
              { initials }
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{fullName}</span>
              <span className="sidebar-user-sub">{userData?.email || 'WORKSPACE'}</span>
            </div>
          </div>
        </div>
      </aside>

      <Modal
        ref={logoutModalRef}
        title="Sign Out"
        onClose={() => logoutModalRef.current.closeModal()}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Are you sure you want to end your current session and sign out?
        </p>
        <button
          className="site-button danger"
          style={{ width: '100%' }}
          onClick={logout}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sign Out</span>
        </button>
      </Modal>
    </>
  );
}
