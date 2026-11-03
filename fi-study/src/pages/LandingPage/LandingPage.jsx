import './landing-page.css';
import { motion, useReducedMotion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import LandingPageNavBar from '../../components/LandingPageNavBar/LandingPageNavBar';
import FeatureCard from '../../components/FeatureCard/FeatureCard';
import LandingPageFooterBar from '../../components/LandingPageFooterBar/LandingPageFooterBar';
import HeroAbstractArt from '../../components/LandingPage/HeroAbstractArt';
import htmlLogo from '../../assets/frameworks-logos/HTML-LOGO.png';
import cssLogo from '../../assets/frameworks-logos/CSS-LOGO.png';
import jsLogo from '../../assets/frameworks-logos/JS-LOGO.png';
import reactLogo from '../../assets/frameworks-logos/REACT-LOGO.png';
import nodeLogo from '../../assets/frameworks-logos/NODE-LOGO.png';
import expressLogo from '../../assets/frameworks-logos/EXPRESS-LOGO.png';
import firebaseLogo from '../../assets/frameworks-logos/FIREBASE-LOGO.png';

const TECH_LOGOS = [
  { name: 'HTML5', src: htmlLogo },
  { name: 'CSS3', src: cssLogo },
  { name: 'JavaScript', src: jsLogo },
  { name: 'React', src: reactLogo },
  { name: 'Node.js', src: nodeLogo },
  { name: 'Express.js', src: expressLogo },
  { name: 'Firebase', src: firebaseLogo }
];

const MARQUEE_ITEMS = [...TECH_LOGOS, ...TECH_LOGOS, ...TECH_LOGOS];

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
        delayChildren: prefersReducedMotion ? 0 : 0.04
      }
    }
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <>
      <LandingPageNavBar />

      <main id="landing-page-main">
        {/* SECTION 01: HERO WITH ABSTRACT HARMONIC FIELD */}
        <section id="hero-section">
          <div className="lp-hero-container">
            <motion.div
              className="hero-content"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.h1 variants={fadeUpItem} id="hero-title">
                The intelligent study workspace for{' '}
                <span className="hero-highlight">serious mastery</span>
              </motion.h1>

              <motion.p variants={fadeUpItem} className="hero-lead">
                Fi-Study transforms raw documents into structured knowledge. Ingest multi-format study notes, synthesize interactive flashcards, evaluate comprehension with adaptive quizzes, and track deep work with persistent telemetry.
              </motion.p>

              <motion.div variants={fadeUpItem} className="hero-checklist">
                <div className="hero-check-item">
                  <span className="material-symbols-outlined check-icon">check</span>
                  <span>Multi-format ingestion across DOCX, PDF, Markdown &amp; TXT</span>
                </div>
                <div className="hero-check-item">
                  <span className="material-symbols-outlined check-icon">check</span>
                  <span>Active recall with AI flashcards &amp; adaptive comprehension quizzes</span>
                </div>
                <div className="hero-check-item">
                  <span className="material-symbols-outlined check-icon">check</span>
                  <span>Persistent focus telemetry with Pomodoro &amp; real-time analytics</span>
                </div>
              </motion.div>

              <motion.div variants={fadeUpItem} id="btn-container">
                <NavLink to="/signup" className="site-button hero-primary-cta">
                  <span>Start Studying</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </NavLink>
                <NavLink to="/login" className="site-button secondary hero-secondary-cta">
                  <span>Log In</span>
                </NavLink>
              </motion.div>
            </motion.div>

            {/* Right Abstract Art Component */}
            <motion.div
              className="hero-abstract-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <HeroAbstractArt />
            </motion.div>
          </div>
        </section>

        {/* SECTION 02: AI ENGINE */}
        <motion.section
          id="features-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <div className="lp-section-container">
            <motion.div variants={fadeUpItem} className="lp-section-header">
              <div className="lp-heading-split">
                <div>
                  <h1>Make Your Learning Experience More Effective</h1>
                </div>
                <p className="description">
                  Fi-Study is an AI-powered learning platform that helps students learn more effectively and efficiently with a rich study guide editor, AI-powered flashcards, AI quizzes, and live progress tracking.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeUpItem} id="features-cards-container">
              <FeatureCard
                index="01"
                icon="edit_document"
                title="Study Guide & Note Editor"
                description="Upload DOCX, PDF, Markdown, or TXT files and edit your structured study guides directly inside our rich editor workspace."
              />
              <FeatureCard
                index="02"
                icon="quiz"
                title="AI-Powered Quizzes"
                description="Take AI-powered quizzes generated directly from your uploaded materials to test your comprehension and gain instant feedback."
              />
              <FeatureCard
                index="03"
                icon="style"
                title="AI Flashcard Generator"
                description="Synthesize interactive front-and-back flashcards from your notes, shuffle decks, edit cards, and track your retention."
              />
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 03: WORKSPACE CAPABILITIES */}
        <motion.section
          id="features-second-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <div className="lp-section-container">
            <motion.div variants={fadeUpItem} className="lp-section-header">
              <h1>Everything You Need To Study Smarter</h1>
              <p className="lp-subcopy">
                Built to help students in the Philippines and beyond organize subjects, track focus hours, and master coursework.
              </p>
            </motion.div>

            <motion.div variants={fadeUpItem} id="features-cards-container">
              <FeatureCard
                index="04"
                icon="auto_awesome"
                title="AI-Assisted Learning"
                description="Get AI-generated study materials, comprehensive flashcard decks, and mock exams tailored to your uploaded content."
              />
              <FeatureCard
                index="05"
                icon="book_2"
                title="Material Management"
                description="Organize your courses, lessons, and multi-format documents in a distraction-free workspace with instant format conversion."
              />
              <FeatureCard
                index="06"
                icon="trending_up"
                title="Pomodoro & Progress Tracking"
                description="Log focus sessions with the built-in Pomodoro timer and visualize weekly study hours and quiz accuracy in real time."
              />
            </motion.div>
          </div>
        </motion.section>

        {/* SECTION 04: ABOUT THIS SITE & TECH STACK */}
        <motion.section
          id="about-us-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer}
        >
          <div className="lp-section-container">
            {/* ROW 1: ABOUT THIS SITE — EDITORIAL STATEMENT (NO BOX) */}
            <motion.div variants={fadeUpItem} className="about-editorial">
              <h2 className="about-heading">About This Site</h2>
              <p className="about-description">
                This Web App was made by a group of 3rd Year Students from Bulacan State University from the College of the Information and Communications Technology who are committed to revolutionizing the learning experience for students through the use of Artificial Intelligence.
              </p>
            </motion.div>

            {/* ROW 2: TECHNOLOGIES USED — DEDICATED CONTAINER WITH MARQUEE */}
            <motion.div variants={fadeUpItem} id="frameworks-card">
              <div className="frameworks-card-header">
                <h2>Technologies Used</h2>
                <p>We used the following technologies to build this platform:</p>
              </div>

              <div id="frameworks-container">
                <div id="frameworks-track">
                  <div className="frameworks-group">
                    {MARQUEE_ITEMS.map((t, idx) => (
                      <img key={`t1-${idx}`} src={t.src} alt={t.name} loading="lazy" />
                    ))}
                  </div>
                  <div className="frameworks-group" aria-hidden="true">
                    {MARQUEE_ITEMS.map((t, idx) => (
                      <img key={`t2-${idx}`} src={t.src} alt={t.name} loading="lazy" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <LandingPageFooterBar />
    </>
  );
}
