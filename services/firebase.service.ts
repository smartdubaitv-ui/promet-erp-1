import { initializeApp, cert, getApps, getApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Global variable controlling Firebase enablement
export const FIREBASE_ENABLED = 
  process.env.FIREBASE_ENABLED === 'true' || 
  (process.env.FIREBASE_ENABLED !== 'false' && Boolean(process.env.FIREBASE_PRIVATE_KEY));

let fbDb: Firestore | null = null;

if (FIREBASE_ENABLED) {
  try {
    const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
    let configProjectId = process.env.FIREBASE_PROJECT_ID;
    let firestoreDatabaseId: string | undefined = undefined;

    if (fs.existsSync(firebaseConfigPath)) {
      try {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
        if (firebaseConfig.projectId) {
          configProjectId = firebaseConfig.projectId;
        }
        if (firebaseConfig.firestoreDatabaseId) {
          firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;
        }
      } catch (e) {
        console.error("Failed to parse firebase-applet-config.json:", e);
      }
    }

    const projectId = configProjectId || "gen-lang-client-0494646055";

    let appInstance;
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      let credential;
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        credential = cert({
          projectId: projectId,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        });
        console.log("Firebase Service: Initialized with service account cert from environment variables.");
      } else {
        credential = applicationDefault();
        console.log("Firebase Service: Initialized with applicationDefault credential.");
      }

      appInstance = initializeApp({
        credential,
        projectId
      });
    }

    if (firestoreDatabaseId) {
      fbDb = getFirestore(appInstance, firestoreDatabaseId);
    } else {
      fbDb = getFirestore(appInstance);
    }
    console.log("Firebase Service: successfully initialized Firestore with DB ID:", firestoreDatabaseId || "default");
  } catch (e) {
    console.error("Error on initializing Firestore in firebase.service.ts:", e);
  }
}

let isVerified = false;

export const firestore = fbDb;

export async function verifyFirebaseConnection(): Promise<boolean> {
  if (!FIREBASE_ENABLED || !fbDb) {
    console.log('⚠️ Firebase disabled or not initialized, safely using local JSON database');
    isVerified = false;
    return false;
  }
  try {
    const testDoc = fbDb.collection("_connection_test_").doc("write_test");
    await testDoc.set({ timestamp: new Date().toISOString() });
    await testDoc.delete();
    isVerified = true;
    console.log("Firebase Service: Verification passed successfully. Cloud database is active.");
    return true;
  } catch (err: any) {
    console.warn('⚠️ Firebase connection test failed, safely falling back to local JSON database.');
    console.warn("Firebase Service Details:", err?.message || err);
    isVerified = false;
    return false;
  }
}

export function isFirebaseConnected() {
  return FIREBASE_ENABLED && fbDb !== null && isVerified;
}

export function getTenantCollection(collectionName: string, tenantId: string) {
  if (!fbDb) return null;
  return fbDb.collection(collectionName).where('tenantId', '==', tenantId);
}
