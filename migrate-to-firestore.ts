import { firestore, isFirebaseConnected } from './services/firebase.service';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('Starting data migration from database.json to Firebase Firestore...');

  if (!isFirebaseConnected() || !firestore) {
    console.error('❌ Error: Firebase Admin SDK is not connected or initialized!');
    console.error('Please configure your firebase-applet-config.json or the required environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL).');
    process.exit(1);
  }

  const DB_FILE = path.join(process.cwd(), 'database.json');
  if (!fs.existsSync(DB_FILE)) {
    console.error(`❌ Error: database.json file not found at: ${DB_FILE}`);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const collections = Object.keys(data);
    
    console.log(`Found ${collections.length} potential collections in database.json.`);

    for (const colName of collections) {
      const records = data[colName];
      if (!Array.isArray(records)) {
        console.log(`⚠️ Skipping key "${colName}" because it is not an array.`);
        continue;
      }

      console.log(`➡️ Migrating collection "${colName}" (${records.length} records)...`);
      const collectionRef = firestore.collection(colName);

      // Perform migration in batches of 100 for efficiency
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batchRecords = records.slice(i, i + batchSize);
        const batch = firestore.batch();

        for (const record of batchRecords) {
          if (!record || typeof record !== 'object') continue;

          // Preserve existing string ID or generate one if missing
          const docId = record.id ? String(record.id) : null;
          const cleanData = { ...record };
          
          if (docId) {
            delete cleanData.id;
            const docRef = collectionRef.doc(docId);
            batch.set(docRef, cleanData, { merge: true });
          } else {
            const docRef = collectionRef.doc();
            batch.set(docRef, cleanData);
          }
        }

        await batch.commit();
        console.log(`   Migrated records ${i + 1} to ${Math.min(i + batchSize, records.length)} for collection "${colName}"`);
      }

      console.log(`✅ Successfully completed migration for collection "${colName}"`);
    }

    console.log('🎉 All data from database.json has been successfully migrated to Firebase Firestore!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database migration failed with error:', error);
    process.exit(1);
  }
}

runMigration();
