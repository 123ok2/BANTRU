import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnb9zDOgguEDoqAeSZWolQ92R1Ck3j-jY",
  authDomain: "hopemap-d4288.firebaseapp.com",
  projectId: "hopemap-d4288",
  storageBucket: "hopemap-d4288.firebasestorage.app",
  messagingSenderId: "807197911890",
  appId: "1:807197911890:web:00fdc4c05dd2be1179e88b",
  measurementId: "G-BNSX5TZ0X5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
