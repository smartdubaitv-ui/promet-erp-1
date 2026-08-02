import { firestore, isFirebaseConnected } from '../services/firebase.service';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');

async function runMigration() {
  console.log("🚀 Starting data migration from database.json to Firestore...");

  if (!isFirebaseConnected() || !firestore) {
    console.error("❌ Firebase is not connected! Make sure your Firebase configuration is loaded correctly.");
    process.exit(1);
  }

  if (!fs.existsSync(DB_FILE)) {
    console.error("❌ database.json file not found.");
    process.exit(1);
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const collectionsToMigrate = Object.keys(db);
    let totalMigrated = 0;

    for (const colName of collectionsToMigrate) {
      const items = db[colName];
      if (Array.isArray(items) && items.length > 0) {
        console.log(`📦 Migrating collection: "${colName}" (${items.length} items)...`);
        let count = 0;
        let batch = firestore.batch();

        for (const item of items) {
          const dataToSave = { 
            ...item, 
            tenantId: item.tenantId || item.tenant_id || "tenant-promet-sa" 
          };
          
          if (!dataToSave.id) {
            dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          }

          const docId = String(dataToSave.id).trim();
          const docRef = firestore.collection(colName).doc(docId);
          batch.set(docRef, dataToSave, { merge: true });
          
          count++;
          totalMigrated++;

          if (count >= 400) {
            await batch.commit();
            batch = firestore.batch();
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
        }
        console.log(`✅ Collection "${colName}" migrated successfully.`);
      }
    }

    console.log(`\n🎉 SUCCESS: All data migrated. Total records migrated: ${totalMigrated}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exit(1);
  }
}

runMigration();
