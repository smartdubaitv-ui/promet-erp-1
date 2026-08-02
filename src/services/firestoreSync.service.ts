import { logger } from '../config/logger';
import { loadDatabase, saveDatabase, DatabaseSchema, jsonDB } from '../data/jsonDatabase';
import { firestore } from '../../services/firebase.service';

// ============================================================
// 1. أنواع البيانات
// ============================================================

export interface FirestoreConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface SyncOptions {
  collection?: string;
  batchSize?: number;
  force?: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedCollections: string[];
  failedCollections: string[];
  errors: string[];
  duration: number;
}

// ============================================================
// 2. تهيئة Firestore (إذا كان متاحاً)
// ============================================================

export const getFirestore = () => {
  if (!firestore) {
    logger.warn('⚠️ Firebase/Firestore is not available or not initialized');
    return null;
  }
  return firestore;
};

// ============================================================
// 3. مزامنة البيانات إلى Firestore
// ============================================================

export const syncCollectionToFirestore = async (
  collectionName: string,
  data: any[],
  options?: SyncOptions
): Promise<{ success: boolean; count: number; error?: string }> => {
  const db = getFirestore();
  
  if (!db) {
    return {
      success: false,
      count: 0,
      error: 'Firestore not initialized',
    };
  }
  
  const batchSize = options?.batchSize || 100;
  const collectionRef = db.collection(collectionName);
  
  try {
    let successCount = 0;
    
    // تقسيم البيانات إلى دفعات
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = db.batch();
      const chunk = data.slice(i, i + batchSize);
      
      for (const item of chunk) {
        const docRef = collectionRef.doc(item.id || `${collectionName}_${i}`);
        batch.set(docRef, item, { merge: true });
      }
      
      await batch.commit();
      successCount += chunk.length;
    }
    
    logger.info(`✅ Synced ${successCount} documents to Firestore collection: ${collectionName}`);
    
    return {
      success: true,
      count: successCount,
    };
  } catch (error: any) {
    logger.error(`❌ Failed to sync collection ${collectionName}:`, error);
    return {
      success: false,
      count: 0,
      error: error.message || 'Unknown error',
    };
  }
};

// ============================================================
// 4. مزامنة جميع المجموعات
// ============================================================

export const syncAllToFirestore = async (
  options?: SyncOptions
): Promise<SyncResult> => {
  const startTime = Date.now();
  const db = loadDatabase();
  
  // قائمة المجموعات التي سيتم مزامنتها
  const collections = [
    'users',
    'employees',
    'products',
    'invoices',
    'payroll',
    'scrap',
    'shipping',
    'backups',
    'notifications',
    'tenants',
    'contacts',
    'purchases',
  ];
  
  const syncedCollections: string[] = [];
  const failedCollections: string[] = [];
  const errors: string[] = [];
  
  // إذا تم تحديد مجموعة محددة
  if (options?.collection) {
    const data = db[options.collection] || [];
    const result = await syncCollectionToFirestore(options.collection, data, options);
    if (result.success) {
      syncedCollections.push(options.collection);
    } else {
      failedCollections.push(options.collection);
      if (result.error) errors.push(result.error);
    }
  } else {
    // مزامنة جميع المجموعات
    for (const collection of collections) {
      const data = db[collection] || [];
      
      if (data.length === 0) {
        logger.debug(`⏭️ Skipping empty collection: ${collection}`);
        continue;
      }
      
      const result = await syncCollectionToFirestore(collection, data, options);
      
      if (result.success) {
        syncedCollections.push(collection);
      } else {
        failedCollections.push(collection);
        if (result.error) errors.push(`[${collection}] ${result.error}`);
      }
    }
  }
  
  const duration = Date.now() - startTime;
  
  logger.info(`✅ Firestore sync completed in ${duration}ms: ${syncedCollections.length} collections synced`);
  
  return {
    success: failedCollections.length === 0,
    syncedCollections,
    failedCollections,
    errors,
    duration,
  };
};

// ============================================================
// 5. استيراد البيانات من Firestore
// ============================================================

export const importFromFirestore = async (
  collectionName: string,
  tenantId?: string
): Promise<any[]> => {
  const db = getFirestore();
  
  if (!db) {
    logger.warn('⚠️ Firestore not available for import');
    return [];
  }
  
  try {
    const collectionRef = db.collection(collectionName);
    let query = collectionRef;
    
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId) as any;
    }
    
    const snapshot = await query.get();
    const data: any[] = [];
    
    snapshot.forEach((doc: any) => {
      const item = { ...doc.data(), id: doc.id };
      data.push(item);
    });
    
    logger.info(`📥 Imported ${data.length} documents from Firestore collection: ${collectionName}`);
    return data;
  } catch (error: any) {
    logger.error(`❌ Failed to import from Firestore: ${error.message}`);
    return [];
  }
};

// ============================================================
// 6. تهيئة قاعدة البيانات من Firestore
// ============================================================

export const initializeDatabaseWithFirestore = async (): Promise<{
  success: boolean;
  collectionsImported: string[];
  errors: string[];
}> => {
  const db = getFirestore();
  
  if (!db) {
    return {
      success: false,
      collectionsImported: [],
      errors: ['Firestore not available'],
    };
  }
  
  const collections = [
    'users',
    'employees',
    'products',
    'invoices',
    'payroll',
    'scrap',
    'shipping',
    'backups',
    'notifications',
    'tenants',
    'contacts',
    'purchases',
  ];
  
  const importedData: Partial<DatabaseSchema> = {};
  const collectionsImported: string[] = [];
  const errors: string[] = [];
  
  for (const collection of collections) {
    try {
      const data = await importFromFirestore(collection);
      if (data.length > 0) {
        importedData[collection] = data;
        collectionsImported.push(collection);
      }
    } catch (error: any) {
      errors.push(`[${collection}] ${error.message}`);
    }
  }
  
  // دمج البيانات المستوردة مع البيانات المحلية
  if (collectionsImported.length > 0) {
    const currentData = loadDatabase();
    const updatedData = { ...currentData, ...importedData };
    saveDatabase(updatedData);
    
    logger.info(`✅ Firestore initialization completed: ${collectionsImported.length} collections imported`);
  }
  
  return {
    success: collectionsImported.length > 0,
    collectionsImported,
    errors,
  };
};

// ============================================================
// 7. تصدير الوحدة
// ============================================================

export default {
  getFirestore,
  syncCollectionToFirestore,
  syncAllToFirestore,
  importFromFirestore,
  initializeDatabaseWithFirestore,
};
