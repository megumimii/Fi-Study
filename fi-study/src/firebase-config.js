// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMfIdmWw8wz__TFbeFYjI-rI6IbB6mEFs",
  authDomain: "fi-study-4e3ea.firebaseapp.com",
  projectId: "fi-study-4e3ea",
  storageBucket: "fi-study-4e3ea.firebasestorage.app",
  messagingSenderId: "441652811370",
  appId: "1:441652811370:web:a062917f8488cae4f1dc13",
  databaseURL: "https://fi-study-4e3ea-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);