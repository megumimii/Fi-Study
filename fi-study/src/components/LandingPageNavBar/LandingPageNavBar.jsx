import './landing-page-navbar.css';
import { NavLink } from 'react-router-dom';
import fiStudyLogo from '../../assets/fi-study-logo.png';

export default function LandingPageNavBar() {
  return (
    <header id="landing-page-navbar">
      <div className="lp-nav-inner">
        <a href="#hero-section" id="logo-section">
          <img src={fiStudyLogo} alt="Fi-Study Logo" className="lp-logo-img" />
          <span className="lp-brand-title">Fi-Study</span>
        </a>

        <nav className="lp-Anchor-links" aria-label="Landing page sections">
          <a href="#hero-section">Overview</a>
          <a href="#features-section">AI Engine</a>
          <a href="#features-second-section">Workspace</a>
          <a href="#about-us-section">About</a>
        </nav>

        <div id="links-section">
          <NavLink to="/login" className="site-button secondary">
            <span>Log In</span>
          </NavLink>
          <NavLink to="/signup" className="site-button">
            <span>Get Started</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
