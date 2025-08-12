import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBiInvXywL0IrCgQsiEiYxXTfBMliUoFo",
  authDomain: "goupevents-infra-non-prod-s23.firebaseapp.com",
  projectId: "goupevents-infra-non-prod-s23",
  storageBucket: "goupevents-infra-non-prod-s23.firebasestorage.app",
  messagingSenderId: "931565577824",
  appId: "1:931565577824:web:e602132b96358460538505",
  measurementId: "G-7YTJNEZ0KW"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth (app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export {auth, provider, db};