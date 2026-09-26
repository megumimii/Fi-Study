import "./login-page.css";
import fiStudyLogo from "../../assets/fi-study-logo.png"
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { auth } from "../../firebase-config";
import { set } from "firebase/database";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import Modal from "../../components/Modal/Modal";

export default function LoginPage() {

    const navigate = useNavigate();

    const emailRef = useRef(null);
    const passwordRef = useRef(null);

    const modalRef = useRef(null);
    const modalTitleRef = useRef(null);
    const modalStatusRef = useRef(null);
    const modalLoaderRef = useRef(null);
    const modalStatusIconRef = useRef(null);
    const modalErrorRef = useRef(null);

    const [isError, setIsError] = useState(true);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const verifyEmail = (email) => {
        let mail = email.trim();
        // Enforce maximum length according to RFC 5321/5322
        if (mail.length > 254) {
            emailRef.current.innerHTML = "* Error: Email too long (max 254 characters)";
            setEmail("");
            return;
        }

        const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}(\.[0-9]{1,3}){3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        if (regex.test(mail)) {
            emailRef.current.innerHTML = "";
            setEmail(mail);
        } else {
            emailRef.current.innerHTML = "* Error: Invalid email";
            setEmail("");
        }
    }

    const verifyPassword = (password) => {
        let pass = password.trim();
        if(pass.length > 50){
            passwordRef.current.innerHTML = "* Error: Password cannot exceed 50 characters";
            setPassword("");
        } else if (pass.length === 0){
            passwordRef.current.innerHTML = "* Required";
            setPassword("");
        } else {
            passwordRef.current.innerHTML = "";
            setPassword(pass);
        }
    }

    useEffect(() => {
        if(email.length > 0 && password.length > 0){
            setIsError(false);
        } else {
            setIsError(true);
        }
    }, [email, password]);

    const handleLogin = () => {

        if(!isError){
            modalRef.current.openModal();
            signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
                modalRef.current.closeModal();
            }).then(() => {
                setTimeout(() => navigate("main/dashboard"), 0);
            })
            .catch((error) => {
                displayModal("Error", "error", "red", 2, "/login", error.message);
            });
        }

        function displayModal(title, icon, iconColor, timer, path, error=false){
            modalLoaderRef.current.style.display = "none";
            modalTitleRef.current.textContent = title;
            modalStatusIconRef.current.style.color = iconColor;
            modalStatusIconRef.current.textContent = icon;
            modalStatusRef.current.textContent = `Redirecting to ${path.split("/")[1]} page in ${timer} seconds...`;

            if(error){
                modalErrorRef.current.innerHTML = error;
            }

            const interval = setInterval(() => {
                console.log(timer);
                timer--;
                if(timer <= 0){
                    clearInterval(interval);
                    modalRef.current.closeModal();
                    navigate(path);
                } else {
                    modalStatusRef.current.textContent = `Redirecting to ${path.split("/")[1]} page in ${timer} seconds...`;
                }
            }, 1000);
        }

    }

    return (
        <>
            <main className="login-register-layout">

                <NavLink to="/" className="back-button"><span className="material-symbols-outlined">arrow_back</span>Back to Home</NavLink>

                <section className="logo-login-register-container">

                    <div className="logo-section-card">
                        <img src={fiStudyLogo} alt="fi-study-logo" />
                        <div className="logo-section-card-content">
                            <h1>Fi-Study</h1>
                            <p>Your AI-powered companion that transforms how you learn.</p>
                        </div>
                    </div>

                    <div className="login-register-card">
                        <h1>Welcome Back!</h1>
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" name="email" placeholder="Enter your email" required onInput={(e)=>verifyEmail(e.target.value)}/>
                        <span ref={emailRef} className="error-message"></span>
                        <label htmlFor="password">Password:</label>
                        <input type="password" id="password" name="password" placeholder="Enter your password" required onInput={(e)=>verifyPassword(e.target.value)} />
                        <span ref={passwordRef} className="error-message"></span>
                        <button className="site-button" disabled={isError} onClick={()=>handleLogin()}>Log In</button>
                        <p>Don't have an account? <NavLink to="/signup">Sign Up</NavLink></p>
                    </div>

                </section>

                <Modal title="Login" ref={modalRef} onClose={()=>{}} withTitle={false} withCloseButton={false}>
                
                    <div className="modal-register">
                        <h1 ref={modalTitleRef}>Logging In...</h1>
                        <div ref={modalLoaderRef} className="loader"></div>
                        <span ref={modalStatusIconRef} className="material-symbols-outlined icon"></span>
                        <div ref={modalStatusRef}></div>
                        <p ref={modalErrorRef}></p>
                    </div>
    
                </Modal>

            </main>
        </>
    );
}