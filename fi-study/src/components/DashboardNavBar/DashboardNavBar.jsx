import './dashboard-navbar.css'
import fiStudyLogo from '../../assets/fi-study-logo.png'
import { auth } from '../../firebase-config'
import { NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useState, useRef } from 'react'
import Modal from '../Modal/Modal'

export default function DashboardNavbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const logoutModalRef = useRef(null);

    function logout() {
        logoutModalRef.current.closeModal();
        signOut(auth)
            .then(() => {
                // remove all data from local storage
                localStorage.clear();
            })
            .catch(error => console.log(error));
        console.log("logged out");
    }

    return (
        <nav id="dashboard-navbar">
            <div className="navbar-left">
                <img src={fiStudyLogo} alt="Fi-Study Logo" className="navbar-logo" />
                <h1>Fi-Study</h1>
            </div>

            <button 
                className="navbar-toggle"  
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <span className="material-symbols-outlined">menu</span>
            </button>

            {menuOpen && (
                <div className="navbar-links"> 
                    <NavLink to="/main/dashboard" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined">dashboard</span>Dashboard
                    </NavLink>
                    <NavLink to="/main/course" onClick={() => setMenuOpen(false)}>
                        <span className="material-symbols-outlined">library_books</span>Courses
                    </NavLink>
                    <NavLink to="/main/profile" className="dashboard-sidebar-link">
                        <span className="material-symbols-outlined">person</span>Profile
                    </NavLink>
                    <button className="logout-btn" onClick={() => logoutModalRef.current.openModal()}>
                        <span className="material-symbols-outlined">logout</span>Logout
                    </button>
                </div>
            )}
            <Modal 
                ref={logoutModalRef} 
                title="Confirm Logout"
                onClose={() => logoutModalRef.current.closeModal()}
            >
                <p>Are you sure you want to log out?</p>
                <button 
                    className="site-button" 
                    style={{backgroundImage: 'var(--delete-gradient)', width: '100%'}}
                    onClick={()=>{logout();}}
                >
                    Logout
                </button>
            </Modal>
        </nav>
    );
}
