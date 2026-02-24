// Firebase configuration — reads from Vite environment variables.
// Each environment (dev/QA/prod) has its own Firebase project credentials.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let appCheckInitialised = false;

/** Returns true if Firebase config is available in env vars. */
export function hasFirebaseConfig(): boolean {
  return !!import.meta.env.VITE_FIREBASE_PROJECT_ID;
}

/** Activate App Check if a reCAPTCHA site key is provided via env var. */
function initAppCheck(firebaseApp: FirebaseApp) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey || appCheckInitialised) return;
  appCheckInitialised = true;
  import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  });
}

/** Initialise Firebase lazily — only when config is present. */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
    initAppCheck(app);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    // Enable offline persistence (IndexedDB) — graceful fallback if unavailable
    enableIndexedDbPersistence(db).catch((e) => {
      if (e.code === 'failed-precondition') {
        console.warn('Firestore persistence unavailable (multiple tabs open).');
      } else if (e.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser.');
      }
    });
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}
