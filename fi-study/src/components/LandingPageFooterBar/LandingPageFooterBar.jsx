import './landing-page-footer-bar.css';
import { NavLink } from 'react-router-dom';
import fiStudyLogo from '../../assets/fi-study-logo.png';

export default function LandingPageFooterBar() {
  return (
    <footer id="landing-page-footer-bar">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <img src={fiStudyLogo} alt="Fi-Study Logo" className="lp-footer-logo-img" />
          <div>
            <strong>Fi-Study</strong>
            <p>&copy; {new Date().getFullYear()} Fi-Study. All rights reserved.</p>
          </div>
        </div>

        <div className="lp-footer-meta">
          <span className="section-kicker">.DOCX · .PDF · .MD · .TXT</span>
          <div className="lp-footer-links">
            <NavLink to="/login">Log In</NavLink>
            <NavLink to="/signup">Create Account</NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
