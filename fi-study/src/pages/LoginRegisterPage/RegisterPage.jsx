import "./login-page.css";
import "../../components/Modal/modal.css";
import fiStudyLogo from "../../assets/fi-study-logo.png"
import { NavLink, useNavigate } from "react-router-dom";
import {useState, useRef, useEffect} from "react";
import { auth, db } from "../../firebase-config";
import {createUserWithEmailAndPassword} from "firebase/auth";
import Modal from "../../components/Modal/Modal";
import { userApi } from "../../services/api";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase-config";

export default function RegisterPage(){

    const firstNameRef = useRef(null);
    const lastNameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmPasswordRef = useRef(null);
    const registerButtonRef = useRef(null);
    const profilePictureRef = useRef(null);
    const profilePictureInputRef = useRef(null);
    const uploadMessageRef = useRef(null);

    const modalRef = useRef(null);
    const modalTitleRef = useRef(null);
    const modalStatusRef = useRef(null);
    const modalLoaderRef = useRef(null);
    const modalStatusIconRef = useRef(null);
    const modalErrorRef = useRef(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confError, setConfError] = useState(true);
    const [isError, setIsError] = useState(true);
    const [profilePicture, setProfilePicture] = useState(null);

    const navigate = useNavigate();

    const verifyFirstName = (firstName) => {

        const nameRegex = /^[\p{L}][\p{L}'’\- ]*$/u
        let name = firstName.trim();

        if (name.length > 50) {
            firstNameRef.current.innerHTML = "Error: First name cannot exceed 50 characters";
            setFirstName("");
        } else if (name.length === 0) {
            firstNameRef.current.innerHTML = "Error: First name cannot be empty";
            setFirstName("");
        } else if (!nameRegex.test(name)) {
            firstNameRef.current.innerHTML = "Error: First name contains invalid characters";
            setFirstName("");
        } else {
            firstNameRef.current.innerHTML = "";
            setFirstName(name);
        }
    };

    const verifyLastName = (lastName) => {

        const nameRegex = /^[\p{L}][\p{L}'’\- ]*$/u;
        let name = lastName.trim();

        if (name.length > 50) {
            lastNameRef.current.innerHTML = "Error: Last name cannot exceed 50 characters";
            setLastName("");
        } else if (name.length === 0) {
            lastNameRef.current.innerHTML = "Error: Last name cannot be empty";
            setLastName("");
        } else if (!nameRegex.test(name)) {
            lastNameRef.current.innerHTML = "Error: Last name contains invalid characters";
            setLastName("");
        } else {
            lastNameRef.current.innerHTML = "";
            setLastName(name);
        }
    };


    const verifyEmail = (email) => {
    
        let mail = email.trim();
        
        // Enforce maximum length according to RFC 5321/5322
        if (mail.length > 254) {
            emailRef.current.innerHTML = "Error: Email too long (max 254 characters)";
            setEmail("");
            return;
        }

        const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}(\.[0-9]{1,3}){3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (regex.test(mail)) {
            emailRef.current.innerHTML = "";
            setEmail(mail);
        } else {
            emailRef.current.innerHTML = "Error: Invalid email";
            setEmail("");
        }
    }

    const verifyPassword = (password) => {
        let pass = password.trim();
        let errors = [];

        // Length check
        if (pass.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (pass.length > 50) {
            errors.push("Password must not exceed 50 characters");
        }

        // Must contain letter
        if (!/[A-Za-z]/.test(pass)) {
            errors.push("Password must contain at least one letter");
        }

        // Must contain digit
        if (!/\d/.test(pass)) {
            errors.push("Password must contain at least one number");
        }

        if (errors.length === 0) {
            passwordRef.current.innerHTML = "";
            setPassword(pass);
        } else {
            passwordRef.current.innerHTML = "Error: " + errors.join(", ");
            setPassword("");
        }

        verifyConfirmPassword(pass, false);

    }

    const verifyConfirmPassword = (confirm, fromConfirm = true) => {
        let pass = confirm.trim();
        //If from confirm password Field
        if(pass === password && fromConfirm){
            confirmPasswordRef.current.innerHTML = "";
            setConfError(false);
            setConfirmPassword(pass);
        } else if (pass === confirmPassword && !fromConfirm) {//If from password field
            confirmPasswordRef.current.innerHTML = "";
            setConfError(false);
            setConfirmPassword(pass);
        } else {
            confirmPasswordRef.current.innerHTML = "Error: Passwords do not match";
            setConfError(true);
        }
    }

    const verifyProfilePicture = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/") || (file.type !== "image/jpeg" && file.type !== "image/png")) {
            uploadMessageRef.current.textContent = "Error: Only JPEG and PNG files are allowed. Default profile picture will be used.";
            profilePictureRef.current.textContent = "Error: Only JPEG and PNG files are allowed. Upload Again or Default profile picture will be used.";
            profilePictureRef.current.style.color = "orange";
            console.log("Error: Only JPEG and PNG files are allowed. Default profile picture will be used."); //Debug
            setProfilePicture(null);
            return;
        }

        const reader = new FileReader();

        //Async so we can wait for Reader to load
        reader.onload = async (readerEvent) => {
            try {
                const result = readerEvent.target.result;

                // Wait for image to load fully
                const image = await new Promise((resolve, reject) => {
                    //Make a new image object
                    const img = new Image();
                    //If Success
                    img.onload = () => resolve(img);
                    //If Error
                    img.onerror = reject;
                    //Final, store the image src at the img object e.g (img{src: result})
                    img.src = result;
                });

                // Create a canvas for resizing / cropping
                const canvas = document.createElement("canvas");
                canvas.width = 512;
                canvas.height = 512;

                const ctx = canvas.getContext("2d");

                // Draw the image scaled to 512x512
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                // Convert to JPEG data URL
                const croppedImage = canvas.toDataURL("image/jpeg", 0.9);

                // Update React state and UI references
                setProfilePicture(croppedImage);

                uploadMessageRef.current.textContent = `Uploaded: ${file.name}`;
                profilePictureRef.current.textContent = "";

            } catch (err) {
                console.error("Error processing image:", err);
                setProfilePicture(null);
                if (uploadMessageRef.current)
                    uploadMessageRef.current.textContent = "Error processing image.";
            }
        };

        reader.onerror = () => {
            setProfilePicture(null);
            if (uploadMessageRef.current)
                uploadMessageRef.current.textContent = "Error reading file.";
        };

        reader.readAsDataURL(file);
    };


    useEffect(() =>{

        if(firstName.length > 0 && lastName.length > 0 && email.length > 0 && password.length > 0 && !confError){
            setIsError(false);
        } else {
            setIsError(true);
        }

    }, [firstName, lastName, email, password, confError, profilePicture]);

    function handleRegister(){

        if(!isError){
            
            modalRef.current.openModal();
            
            createUserWithEmailAndPassword(auth, email, password)
                .then( async (userCredential) => {

                    const user = userCredential.user;
                    
                    let urlPFP;
                    if (profilePicture) {
                        const blob = await dataURLtoBlob(profilePicture);
                        const sRef = storageRef(storage, `profile-pictures/${user.uid}.jpg`);
                        await uploadBytes(sRef, blob);
                        urlPFP = await getDownloadURL(sRef);
                    } else {
                        urlPFP = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName.trim())}+${encodeURIComponent(lastName.trim())}&background=0D8ABC&color=fff&size=512`;
                    }

                    // Save user profile via Fi-API
                    await userApi.updateProfile({
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: email.trim(),
                        profilePicture: urlPFP
                    });

                    displayModal(
                        "Success",
                        "check_circle",
                        "#4CAF50",
                        2,
                        "/main/dashboard"
                    );
                })
                .catch((error) => {
                    console.error("Registration error:", error);
                    displayModal(
                        "Error",
                        "error",
                        "red",
                        3,
                        "/signup",
                        error.message
                    );
                });
        }

        // Helper function to convert data URL to Blob
        async function dataURLtoBlob(dataURL) {
            return fetch(dataURL).then(res => res.blob());
        }

        function displayModal(title, icon, iconColor, timer, path, error=null){
            modalLoaderRef.current.style.display = "none";
            modalTitleRef.current.innerHTML = title;
            modalStatusIconRef.current.style.color = iconColor;
            modalStatusIconRef.current.innerHTML = icon;
            modalStatusRef.current.innerHTML = `Redirecting to ${path.split("/")[1]} page in ${timer} seconds...`;

            if(error){
                modalErrorRef.current.innerHTML = error;
            }

            const interval = setInterval(() => {
                timer--;
                if(timer <= 0){
                    clearInterval(interval);
                    modalRef.current.closeModal();
                    navigate(path);
                } else {
                    modalStatusRef.current.innerHTML = `Redirecting to ${path.split("/")[1]} page in ${timer} seconds...`;
                }
            }, 1000);
        }
    }


    return (

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

                    <h1>Sign Up</h1>
                    <div className="firstname-lastname-container">
                        <span>
                            <label htmlFor="first-name">First Name:</label>
                            <input type="text" id="first-name" name="first-name" placeholder="First Name" required onInput={(e) => verifyFirstName(e.target.value)}/>
                            <span className="error-message" ref={firstNameRef}></span>
                        </span>
                        <span>
                            <label htmlFor="last-name">Last Name:</label>
                            <input type="text" id="last-name" name="last-name" placeholder="Last Name" required onInput={(e) => verifyLastName(e.target.value)}/>
                            <span className="error-message" ref={lastNameRef}></span>
                        </span>
                    </div>

                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email" required onInput={(e) => verifyEmail(e.target.value)}/>
                    <span className="error-message" ref={emailRef}></span>
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" required onInput={(e) => verifyPassword(e.target.value)} />
                    <span className="error-message" ref={passwordRef}></span>
                    <label htmlFor="confirm-password">Confirm Password:</label>
                    <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm your password" required onInput={(e) => verifyConfirmPassword(e.target.value)}/>
                    <span className="error-message" ref={confirmPasswordRef}></span>
                    {/*Hidden File Input for Profile Picture*/}
                    <input type="file" id="profile-picture" name="profile-picture" accept="image/*" onChange={(e) => verifyProfilePicture(e)} ref={profilePictureInputRef}/>

                    {/* Placeholder / Drop Area for Profile Picture */}
                    <div
                        className="profile-picture-container"
                        onClick={() => profilePictureInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()} // Allow drop
                        onDrop={(e) => {
                            e.preventDefault();
                            // Extract the first file from the drop event
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                            // Create a mock event object so verifyProfilePicture can reuse its logic
                            const fakeEvent = { target: { files: [file] } };
                            verifyProfilePicture(fakeEvent);
                            }
                        }}
                        >
                        <span className="material-symbols-outlined icon">image</span>
                        <span ref={uploadMessageRef}>Upload Profile Picture</span>
                    </div>

                    <span className="error-message" style={{color: "lightgray"}}ref={profilePictureRef}>*Optional</span>

                    <button className="site-button" ref={registerButtonRef} disabled={isError} onClick={()=>{handleRegister()}}>Sign Up</button>
                    <p>Already have an account? <NavLink to="/login">Log In</NavLink></p>
                    
                </div>

            </section>

            <Modal title="Registration" ref={modalRef} onClose={()=>{}} withTitle={false} withCloseButton={false}>

                <div className="modal-register">
                    <h1 ref={modalTitleRef}>Registering...</h1>
                    <div ref={modalLoaderRef} className="loader"></div>
                    <span ref={modalStatusIconRef} className="material-symbols-outlined icon"></span>
                    <div ref={modalStatusRef}></div>
                    <p ref={modalErrorRef}></p>
                </div>

            </Modal>

        </main>
    )

}