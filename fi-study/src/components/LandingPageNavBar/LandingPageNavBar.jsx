import './landing-page-navbar.css';
import fiStudyLogo from '../../assets/fi-study-logo.png';
import { NavLink } from 'react-router-dom';

export default function LandingPageNavBar() {
    return (
        <header id="landing-page-navbar">

            <div id="logo-section">

                <img src={fiStudyLogo} alt="fi-study-logo" />
                <h1>Fi-Study</h1>

            </div>

            <nav id="links-section">

                <NavLink to="/signup"><span className="material-symbols-outlined">person_add</span>Sign Up</NavLink>
                <NavLink to="/login" className="site-button"><span className="material-symbols-outlined">login</span>Log In</NavLink>

            </nav>

        </header>
    );
}