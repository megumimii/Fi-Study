import './landing-page.css'
import LandingPageNavBar from '../../components/LandingPageNavBar/LandingPageNavBar'
import FeatureCard from '../../components/FeatureCard/FeatureCard'
import LandingPageFooterBar from '../../components/LandingPageFooterBar/LandingPageFooterBar'
import htmlLogo from '../../assets/frameworks-logos/HTML-LOGO.png'
import cssLogo from '../../assets/frameworks-logos/CSS-LOGO.png'
import jsLogo from '../../assets/frameworks-logos/JS-LOGO.png'
import reactLogo from '../../assets/frameworks-logos/REACT-LOGO.png'
import firebaseLogo from '../../assets/frameworks-logos/FIREBASE-LOGO.png'
import { useNavigate } from 'react-router-dom'
import { NavLink } from 'react-router-dom'

export default function LandingPage(){


    return(
        
        <>

            <LandingPageNavBar/>

            <main id="landing-page-main">

                <section id="hero-section">

                    <div className="hero-content">
                        
                            <h1 id="hero-title">Revolutionize Your</h1>
                            <h1 className='text-gradient'>Study Experience</h1>
                            <p>Fi-Study is your AI-powered companion that transforms how you learn. Organize materials, generate study guides, take AI-powered quizzes, and track your progress—all in one place.</p>
                            <div id="btn-container">
                                <NavLink to="/signup" className="site-button"><span className="material-symbols-outlined">person_add</span>Sign Up</NavLink>
                                <NavLink to="/login" className="site-button"><span className="material-symbols-outlined">login</span>Log In</NavLink>
                            </div>

                    </div>

                    {/* Just some fancy CSS for the background */}
                    <div className="hero-pattern">
                        {[...Array(50)].map((_, i) => (
                            <div key={i} className="hero-column"></div>
                        ))}
                    </div>

                </section>

                <section id="features-section">
                    
                    <span id="features-header"><span className="material-symbols-outlined">star_shine</span>Powered By Artificial Intelligence</span>

                    <p>Make Your Learning Experience</p>
                    <h1 className='text-gradient'>More Effective and Efficient</h1>

                    <p className="description">
                        Fi-Study is an AI-powered learning platform that helps students learn more effectively and efficiently. It provides a range of tools and resources to support students in their learning journey, including a study guide generator, AI-powered quizzes, and progress tracking.
                    </p>

                    <div id="feature-button-container">
                        <NavLink to="/about" className="site-button"><span className="material-symbols-outlined">info</span>About Us</NavLink>
                        <NavLink to="/signup" className="site-button"> <span className="material-symbols-outlined">arrow_forward</span>Start Learning</NavLink>
                    </div>

                    <div id="features-cards-container">
                        <FeatureCard icon="book" title="Study Guide Generator" description="Generate a customized study guide for any subject or topic."/>
                        <FeatureCard icon="quiz" title="AI-Powered Quizzes" description="Take AI-powered quizzes to test your knowledge and gain insights."/>
                        <FeatureCard icon="dashboard" title="Progress Tracking" description="Track your progress and monitor your learning performance."/>
                    </div>

                </section>

                <section id="features-second-section">

                    <h1>Everything You Need To</h1>
                    <h1 className='text-gradient main-title'>Revolutionize Your Study</h1>

                    <p>Built to help students in the Philippines and beyond study smarter and achieve more.</p>

                    <div id="features-cards-container">

                            <FeatureCard
                            icon="auto_awesome"
                            title="AI-Assisted Learning"
                            description="Get AI-generated study materials, comprehensive guides, and mock exams tailored to your content."
                            />

                            <FeatureCard
                            icon="book_2"
                            title="Material Management"
                            description="Organize your lessons, resources, and notes in a structured and intuitive workspace."
                            />

                            <FeatureCard
                            icon="trending_up"
                            title="Performance Tracking"
                            description="Visualize your progress through analytics and stay motivated with real-time insights."
                            />
                            
                    </div>
                    
                </section>

                <section id="about-us-section">

                    <h1 className='text-gradient'><span className="material-symbols-outlined">info</span>About This Site</h1>
                    <p className="description">This Web App was made by a group of 3rd Year Students from Bulacan State University from the College of the Information and Communications Technology who are committed to revolutionizing the learning experience for students through the use of Artificial Intelligence.</p>

                    <div id="frameworks-card">

                        <h1><span className="material-symbols-outlined">code</span>Technologies Used</h1>
                        <p>We used the following technologies to make this Web App:</p>

                        <div id="frameworks-container">
                            <div id="frameworks-track">
                                <img src={htmlLogo} alt="html-logo" />
                                <img src={cssLogo} alt="css-logo" />
                                <img src={reactLogo} alt="react-logo" />
                                <img src={jsLogo} alt="js-logo" />
                                <img src={firebaseLogo} alt="firebase-logo" />
                                <img src={htmlLogo} alt="html-logo" />
                                <img src={cssLogo} alt="css-logo" />
                                <img src={reactLogo} alt="react-logo" />
                                <img src={jsLogo} alt="js-logo" />
                                <img src={firebaseLogo} alt="firebase-logo" />
                            </div>
                        </div>
                    </div>

                </section>

            </main>

            <LandingPageFooterBar/>

        </>

    )


}
