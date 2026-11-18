import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App (Auth only; data persistence uses Cloud SQL PostgreSQL)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function signInWithGooglePopup(): Promise<{
  user: FirebaseUser;
  idToken: string;
}> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export async function getMemoryIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(forceRefresh);
}
