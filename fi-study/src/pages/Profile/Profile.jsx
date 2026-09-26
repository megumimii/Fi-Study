import './profile.css';
import Header from '../../components/Header/Header';
import React, { useState, useRef } from 'react';

import FormModal from '../../components/Modal/FormModal/FormModal';
import { uploadAndSetDownloadURL, uploadAndUpdateDownloadURL } from '../../utils/FirebaseHelper';
import { userApi } from '../../services/api';
import { resizeImage } from '../../utils/imageResizer';
import { sanitizeInput } from '../../utils/InputSanitize';

export default function Profile({ userData }) {

    // Modal ref (same logic as your Home page)
    const editProfileModalRef = useRef(null);
    const firstNameErrorRef = useRef(null);
    const lastNameErrorRef = useRef(null);
    const profilePicErrorRef = useRef(null);
    const coverPicErrorRef = useRef(null);

    // Input refs
    const firstNameRef = useRef(null);
    const lastNameRef = useRef(null);
    const profilePicRef = useRef(null);
    const coverPicRef = useRef(null);
    const buttonRef = useRef(null);

    const [isUpdating, setIsUpdating] = useState(false);

    // Modal input state
    const [inputData, setInputData] = useState({
        firstName: userData.firstName,
        lastName: userData.lastName,
        profilePic: null,
        coverPic: null
    });

    async function saveProfile() {

        setIsUpdating(true);

        const updates = {};

        //PROFILE PICTURE
        if (inputData.profilePic) {
            const resized = await resizeImage(inputData.profilePic, 512, 512);
            //Simultaneously upload and get metadata to the respective user
            uploadAndUpdateDownloadURL(resized, `/profile-pictures/${userData.uid}.jpg`, `/users/${userData.uid}/`, 'profilePicture');
        }

        //COVER PICTURE
        if (inputData.coverPic) {
            const resized = await resizeImage(inputData.coverPic, 1600, 400);
            //Simultaneously upload and get metadata to the respective user
            uploadAndUpdateDownloadURL(resized, `/cover-pictures/${userData.uid}.jpg`, `/users/${userData.uid}/`, 'coverPicture');
        }

        //TEXT FIELDS
        updates.firstName = sanitizeInput(inputData.firstName);
        updates.lastName = sanitizeInput(inputData.lastName);

        updates.firstName = updates.firstName || userData.firstName;
        updates.lastName = updates.lastName || userData.lastName;

        await userApi.updateProfile(updates);

        editProfileModalRef.current.closeModal();

        //Reset input data
        setInputData({
            firstName: updates.firstName,
            lastName: updates.lastName,
            profilePic: null,
            coverPic: null
        });

        setIsUpdating(false);

    }

    return (
        <>
            <Header
                userData={userData}
                title="Profile"
                subtitle={`Welcome ${userData.firstName.split(' ')[0]} to your profile!`}
                icon={'person'}
            />

            <section id="custom-profile-page-container">
                <div className='profile-cover-container'>
                    <img
                        className='profile-cover'
                        src={userData.coverPicture ||
                            "https://img.freepik.com/premium-photo/dark-mild-blue-rough-abstract-background-design_851755-178255.jpg"}
                        alt="cover-picture"
                    />

                    <div className='pfp-name-container'>
                        <div className='pfp-name'>
                            <div className='profile-picture-wrapper'>
                                <img
                                    className='profile-picture'
                                    src={userData.profilePicture ||
                                        "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                                    alt="profile-picture"
                                />
                            </div>

                            <span className='title-subtitle-container'>
                                <h1 className='h1-icon'>{userData.firstName} {userData.lastName}</h1>
                                <p>{userData.email}</p>
                            </span>
                        </div>

                        <button
                            className='site-button'
                            onClick={() => editProfileModalRef.current.openModal()}
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            </section>

            {/* ------------------ EDIT PROFILE MODAL ------------------ */}
            <FormModal
                ref={editProfileModalRef}
                header="Edit Profile"
                title="Edit Profile"
                icon="edit"
                closeDisabled={isUpdating}
                subtitle="Update your profile information."
                buttonName="Save Changes"
                buttonCallback={() => saveProfile()}
                buttonRef={buttonRef}
                disabled={!inputData.firstName || !inputData.lastName || isUpdating}
                onClose={() => {editProfileModalRef.current.closeModal(); setInputData({...inputData, firstName: userData.firstName, lastName: userData.lastName, profilePic: null, coverPic: null})}}
            >
                {/* FIRST NAME */}
                <label>First Name:</label>
                <input
                    ref={firstNameRef}
                    type="text"
                    defaultValue={inputData.firstName}
                    onInput={(e) => {
                        const nameRegex = /^[\p{L}'’\- ]+$/u;
                        const value = e.target.value.trim();
                        if (value === '' || value.length > 50) {
                            setInputData({ ...inputData, firstName: null });
                            firstNameErrorRef.current.innerHTML =
                                'Error: First name cannot ' +
                                (value === '' ? 'be empty' : 'exceed 50 characters');
                        } else if (!nameRegex.test(value)) {
                            setInputData({ ...inputData, firstName: null });
                            firstNameErrorRef.current.innerHTML =
                                'Error: First name contains invalid characters';
                        } else {
                            setInputData({ ...inputData, firstName: value });
                            firstNameErrorRef.current.innerHTML = '';
                        }
                    }}
                />
                <span className="error-message" ref={firstNameErrorRef}></span>

                {/* LAST NAME */}
                <label>Last Name:</label>
                <input
                    ref={lastNameRef}
                    type="text"
                    defaultValue={inputData.lastName}
                    onInput={(e) => {
                        const nameRegex = /^[\p{L}'’\- ]+$/u;
                        const value = e.target.value.trim();
                        if (value === '' || value.length > 50) {
                            setInputData({ ...inputData, lastName: null });
                            lastNameErrorRef.current.innerHTML =
                                'Error: Last name cannot ' +
                                (value === '' ? 'be empty' : 'exceed 50 characters');
                        } else if (!nameRegex.test(value)) {
                            setInputData({ ...inputData, lastName: null });
                            lastNameErrorRef.current.innerHTML =
                                'Error: Last name contains invalid characters';
                        } else {
                            setInputData({ ...inputData, lastName: value });
                            lastNameErrorRef.current.innerHTML = '';
                        }
                    }}
                />
                <span className="error-message" ref={lastNameErrorRef}></span>

                {/* PROFILE PIC */}
                <label>Profile Picture:</label>
                <input
                    ref={profilePicRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                            const value = e.target?.files[0];
                            if(!value || (!value.type.startsWith("image/") || (value.type !== "image/jpeg" && value.type !== "image/png"))) {
                                profilePicErrorRef.current.innerHTML = 'Error: Only JPEG and PNG files are allowed. Profile Picture won\'t be updated.';
                                setInputData({...inputData, profilePic: null});
                            } else {
                                setInputData({...inputData, profilePic: value});
                                profilePicErrorRef.current.innerHTML = '';
                            }
                        }
                    }
                />
                <span className="error-message" ref={profilePicErrorRef}></span>

                {/* COVER PIC */}
                <label>Cover Photo:</label>
                <input
                    ref={coverPicRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                        {
                            const value = e.target.files[0];
                            if(!value || (!value.type.startsWith("image/") || (value.type !== "image/jpeg" && value.type !== "image/png"))) {
                                coverPicErrorRef.current.innerHTML = 'Error: Only JPEG and PNG files are allowed. Cover Picture won\'t be updated.';
                                setInputData({...inputData, coverPic: null});
                            } else {
                                setInputData({...inputData, coverPic: value});
                                coverPicErrorRef.current.innerHTML = '';
                            }
                        }
                    }
                />
                <span className="error-message" ref={coverPicErrorRef}></span>

            </FormModal>
        </>
    );
}
