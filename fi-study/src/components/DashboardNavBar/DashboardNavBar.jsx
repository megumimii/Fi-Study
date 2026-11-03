import './dashboard-navbar.css';
import { auth } from '../../firebase-config';
import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useState, useRef } from 'react';
import Modal from '../Modal/Modal';
import fiStudyLogo from '../../assets/fi-study-logo.png';

export default function DashboardNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const logoutModalRef = useRef(null);

  function logout() {
    logoutModalRef.current.closeModal();
    signOut(auth)
      .then(() => {
        localStorage.clear();
      })
      .catch((error) => console.error(error));
  }

  return (
    <nav id="dashboard-navbar">
      <div className="navbar-left">
        <img src={fiStudyLogo} alt="Fi-Study Logo" className="navbar-logo-img" />
        <h1>Fi-Study</h1>
      </div>

      <button
        type="button"
        className="navbar-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation menu"
      >
        <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
      </button>

      {menuOpen && (
        <div className="navbar-links">
          <NavLink to="/main/dashboard" onClick={() => setMenuOpen(false)}>
            <span className="material-symbols-outlined">grid_view</span>
            Dashboard
          </NavLink>
          <NavLink to="/main/course" onClick={() => setMenuOpen(false)}>
            <span className="material-symbols-outlined">menu_book</span>
            My Courses
          </NavLink>
          <NavLink to="/main/profile" onClick={() => setMenuOpen(false)}>
            <span className="material-symbols-outlined">person</span>
            Profile
          </NavLink>
          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              setMenuOpen(false);
              logoutModalRef.current.openModal();
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            Sign out
          </button>
        </div>
      )}

      <Modal
        ref={logoutModalRef}
        title="Sign Out"
        onClose={() => logoutModalRef.current.closeModal()}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Are you sure you want to sign out?
        </p>
        <button
          className="site-button danger"
          style={{ width: '100%' }}
          onClick={logout}
        >
          Sign Out
        </button>
      </Modal>
    </nav>
  );
}
