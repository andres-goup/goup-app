
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDBiInvXywL0IrCgQsiEiYxXTfBMliUoFo",
    authDomain: "goupevents-infra-non-prod-s23.firebaseapp.com",
    projectId: "goupevents-infra-non-prod-s23",
    storageBucket: "goupevents-infra-non-prod-s23.firebasestorage.app",
    messagingSenderId: "931565577824",
    appId: "1:931565577824:web:e602132b96358460538505",
    measurementId: "G-7YTJNEZ0KW"
};

const app = initializeApp(firebaseConfig);

// Analytics (solo en cliente)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch {
    // ignorar si no está disponible
  }
}

// Auth
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

/**
 * Suscribe un callback a los cambios de usuario.
 * Devuelve la función de unsubscribe.
 */
export function onUserChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Iniciar sesión con email/password */
export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Registrar un usuario con email/password */
export function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Cerrar sesión */
export function signOut() {
  return firebaseSignOut(auth);
}

// Firestore
export const db = getFirestore(app);