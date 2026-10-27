// Firebase dipakai hanya untuk Authentication. Data tetap lewat backend; nilai di bawah dari Project settings
// > Web app di Firebase console (bukan rahasia, tapi tetap dibaca dari .env)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
