import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

//  https://firebase.google.com/docs/web/setup#available-libraries

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYNctAtaSTJd4LxDkKiAob177502LtdRE",
  authDomain: "noted-6942e.firebaseapp.com",
  projectId: "noted-6942e",
  storageBucket: "noted-6942e.firebasestorage.app",
  messagingSenderId: "819721579810",
  appId: "1:819721579810:web:5fcafe89730c785c90c97b",
  measurementId: "G-QRZJDD9M5D"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
