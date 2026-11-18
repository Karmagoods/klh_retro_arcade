/**
 * Firebase Client Configuration for KLH Retro Arcade.
 *
 * For GitHub Pages: The __FIREBASE_API_KEY__ placeholder is automatically replaced
 * at deployment time via GitHub Actions using the FIREBASE_API_KEY secret.
 *
 * For local development: Set window.__FIREBASE_API_KEY__ in the console or HTML,
 * or temporarily replace the placeholder without committing it.
 */

export const firebaseConfig = {
    projectId: "klhinnovation-6eac7",
    appId: "1:287335912967:web:07b093612918d516023ca2",
    storageBucket: "klhinnovation-6eac7.firebasestorage.app",
    apiKey: (typeof window !== "undefined" && window.__FIREBASE_API_KEY__) || "__FIREBASE_API_KEY__",
    authDomain: "klhinnovation-6eac7.firebaseapp.com",
    messagingSenderId: "287335912967",
    measurementId: "G-49TQG0YC60"
};
