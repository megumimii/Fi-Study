import './landing-page-footer-bar.css';
import fiStudyLogo from '../../assets/fi-study-logo.png';

export default function LandingPageFooterBar() {
    return (
        <footer id="landing-page-footer-bar">
            <img src={fiStudyLogo} alt="fi-study-logo" />
            <p>&copy; 2023 Fi-Study. All rights reserved.</p>
        </footer>
    );
}