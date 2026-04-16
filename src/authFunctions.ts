import { 
  createUserWithEmailAndPassword as firebaseCreateUser,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

/**
 * Creates a new user with email and password.
 */
export const createUser = async (email: string, password: string, name?: string) => {
  try {
    const userCredential = await firebaseCreateUser(auth, email, password);
    if (name) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    await sendEmailVerification(userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

/**
 * Signs in an existing user with email and password.
 */
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await firebaseSignIn(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

/**
 * Signs in with Google popup.
 */
export const signInWithGoogle = async () => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

/**
 * DELETES all user documents from the 'users' collection in Firestore.
 * Use this for resetting your database during development.
 * WARNING: This is irreversible!
 */
export const deleteAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const batch = writeBatch(db);
    
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, 'users', document.id));
    });
    
    await batch.commit();
    console.log('Successfully deleted all user documents.');
    return true;
  } catch (error: any) {
    console.error('Error deleting users:', error);
    throw new Error(error.message);
  }
};

/**
 * Clears local storage and signs out the current user.
 */
export const clearUserData = async () => {
  try {
    await auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    console.log('User signed out and local data cleared.');
  } catch (error: any) {
    throw new Error(error.message);
  }
};
