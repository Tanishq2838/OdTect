import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    authDomain: "o-dtect.firebaseapp.com",
    projectId: "o-dtect",
    storageBucket: "o-dtect.firebasestorage.app",
    messagingSenderId: "1013266651974",
    appId: "1:1013266651974:web:16e3add2c0bdab9c5ae347",
    measurementId: "G-E2Q194VY3K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
