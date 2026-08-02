import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  onSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  QueryConstraint
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Global variable controlling Firebase enablement
export const FIREBASE_ENABLED = process.env.FIREBASE_ENABLED !== 'false';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore Database with explicitly specified DB ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firestore = db;

export function isFirebaseConnected(): boolean {
  return FIREBASE_ENABLED;
}

// Initialize and export Auth
export const auth = getAuth();

// --- Connection Validation ---
async function testConnection() {
  if (!FIREBASE_ENABLED) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}
testConnection();

// --- Robust Error Handling Definitions ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Custom Firestore Error Handler required by AI Studio guidelines.
 * Catches permissions or database failures and throws a structured JSON-stringified error info object.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Operation Failed:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// --- Safe Wrapper Helpers for Secure Database Operations ---

/**
 * Fetch a single document from Firestore with robust error handling.
 */
export async function getDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  try {
    const docSnap = await getDoc(docRef);
    return docSnap;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${docId}`);
  }
}

/**
 * Fetch list of documents from a collection or custom query with robust error handling.
 */
export async function getDocuments(collectionName: string, ...queryConstraints: QueryConstraint[]) {
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...queryConstraints);
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

/**
 * Set (create or replace) a document in Firestore with robust error handling.
 */
export async function setDocument(collectionName: string, docId: string, data: any) {
  if (!FIREBASE_ENABLED) {
    console.log('⚠️ Firebase disabled, skipping write operation');
    return null;
  }
  const docRef = doc(db, collectionName, docId);
  try {
    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Create/Add a document in Firestore with an auto-generated ID.
 */
export async function addDocument(collectionName: string, data: any) {
  if (!FIREBASE_ENABLED) {
    console.log('⚠️ Firebase disabled, skipping write operation');
    return null;
  }
  const colRef = collection(db, collectionName);
  try {
    const docRef = await addDoc(colRef, data);
    return docRef;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
}

/**
 * Update parts of a document in Firestore with robust error handling.
 */
export async function updateDocument(collectionName: string, docId: string, data: any) {
  if (!FIREBASE_ENABLED) {
    console.log('⚠️ Firebase disabled, skipping write operation');
    return null;
  }
  const docRef = doc(db, collectionName, docId);
  try {
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${docId}`);
  }
}

/**
 * Delete a document from Firestore with robust error handling.
 */
export async function deleteDocument(collectionName: string, docId: string) {
  if (!FIREBASE_ENABLED) {
    console.log('⚠️ Firebase disabled, skipping write operation');
    return null;
  }
  const docRef = doc(db, collectionName, docId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

/**
 * Subscribe to real-time snapshot updates with mandatory error callback.
 */
export function subscribeToCollection(
  collectionName: string, 
  onUpdate: (snapshot: any) => void,
  ...queryConstraints: QueryConstraint[]
) {
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...queryConstraints);
  
  return onSnapshot(
    q, 
    (snapshot) => {
      onUpdate(snapshot);
    }, 
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}
