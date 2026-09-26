import './dashboard-sidebar.css'
import fiStudyLogo from '../../assets/fi-study-logo.png'
import { auth } from '../../firebase-config'
import { NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useRef } from 'react'
import Modal from '../../components/Modal/Modal'  // import your modal

export default function DashboardSideBar() {

    const logoutModalRef = useRef(null);

    function logout() {
        // log out using firebase's signOut function
        logoutModalRef.current.closeModal();
        signOut(auth)
            .then(() => {
                // remove all data from local storage
                localStorage.clear();
            })
            .catch(error => console.log(error));
        console.log("logged out");
    }

    return(
        <>
            <aside id="dashboard-sidebar">
                <div id="dashboard-sidebar-logo-container">
                    <img src={fiStudyLogo} alt="fi-study-logo" />
                    <h1>Fi-Study</h1>
                </div>

                <div id="dashboard-sidebar-links-container">
                    <NavLink to="/main/dashboard" className="dashboard-sidebar-link">
                        <span className="material-symbols-outlined">dashboard</span>Dashboard
                    </NavLink>
                    <NavLink to="/main/course" className="dashboard-sidebar-link">
                        <span className="material-symbols-outlined">library_books</span>Courses
                    </NavLink>
                    <NavLink to="/main/profile" className="dashboard-sidebar-link">
                        <span className="material-symbols-outlined">person</span>Profile
                    </NavLink>
                </div>

                <button 
                    id="dashboard-sidebar-logout-button" 
                    onClick={()=>logoutModalRef.current.openModal()}
                >
                    <span className="material-symbols-outlined">logout</span>Logout
                </button>
            </aside>

            {/* Logout Confirmation Modal */}
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
        </>
    )
}
