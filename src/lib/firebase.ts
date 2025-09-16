// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";


// Your web app's Firebase configuration.
// It's crucial that these environment variables are set correctly in your `.env` file
// and prefixed with NEXT_PUBLIC_ to be used on the client side.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check for missing configuration keys. If they are missing, the app should not proceed.
// This provides a clear error message instead of a generic Firebase error.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase configuration is missing or incomplete. Please check your environment variables (e.g., .env file) and ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set."
  );
}

// Initialize Firebase App (Singleton Pattern)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize App Check
if (typeof window !== 'undefined') {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  if (!recaptchaKey) {
    console.warn("Firebase App Check reCAPTCHA site key is missing. App Check will not be initialized. Please add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to your .env file.");
  } else {
    try {
      // Check if App Check is already initialized
      const existingAppCheck = (globalThis as any).__FIREBASE_APPCHECK_INITIALIZED__;
      
      if (!existingAppCheck) {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaKey),
          isTokenAutoRefreshEnabled: true,
        });
        
        // Mark as initialized to prevent duplicate initialization
        (globalThis as any).__FIREBASE_APPCHECK_INITIALIZED__ = true;
        console.log("Firebase App Check initialized successfully.");
      }
    } catch(e: any) {
      // Suppress ReCAPTCHA errors in development or provide better error handling
      if (e?.code === 'appCheck/recaptcha-error') {
        console.warn("ReCAPTCHA initialization failed. This might be due to development environment or network issues. App Check will retry automatically.");
      } else {
        console.error("Error initializing Firebase App Check:", e);
      }
    }
  }
}


const auth: Auth = getAuth(app);

// Firestore has been removed from the project.
// const db: Firestore;
// ...

export { app, auth };
