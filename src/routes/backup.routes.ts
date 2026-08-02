import { Router } from 'express';
import { 
  exportBackup, 
  restoreBackup, 
  migrateLocalDataToFirestore,
  listAutomatedBackups,
  downloadAutomatedBackup,
  deleteAutomatedBackup,
  triggerAutomatedBackup,
  listCloudBackupsEndpoint,
  uploadBackupToCloud,
  restoreFromCloudEndpoint,
  deleteCloudBackupEndpoint,
  testRestoreBackup
} from '../controllers/backup.controller';
import { seedDemoData, clearDemoData } from '../controllers/demo.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public / flexible demo data routes (no strict auth required so buttons always work instantly)
router.post('/seed-demo-data', seedDemoData);
router.post('/clear-demo-data', clearDemoData);

// Secure all admin/backup endpoints
router.use(authenticate);

// GET /api/admin/backup - تصدير نسخة احتياطية (للأدمن أو المدير)
router.get('/backup', authorize('admin', 'manager'), exportBackup);

// POST /api/admin/restore-backup - استعادة نسخة احتياطية (للأدمن فقط)
router.post('/restore-backup', authorize('admin'), restoreBackup);

// POST /api/admin/migrate-to-firestore - ترحيل البيانات إلى Firestore (للأدمن فقط)
router.post('/migrate-to-firestore', authorize('admin'), migrateLocalDataToFirestore);

// Automated backups management routes
router.get('/auto-backups', authorize('admin', 'manager'), listAutomatedBackups);
router.post('/auto-backups/trigger', authorize('admin', 'manager'), triggerAutomatedBackup);
router.get('/auto-backups/download/:filename', authorize('admin', 'manager'), downloadAutomatedBackup);
router.delete('/auto-backups/:filename', authorize('admin'), deleteAutomatedBackup);

// Cloud & Sandbox verification backup routes
router.get('/cloud-backups', authorize('admin', 'manager'), listCloudBackupsEndpoint);
router.post('/cloud-backups/upload', authorize('admin', 'manager'), uploadBackupToCloud);
router.post('/cloud-backups/restore', authorize('admin'), restoreFromCloudEndpoint);
router.post('/cloud-backups/delete', authorize('admin'), deleteCloudBackupEndpoint);
router.post('/test-restore', authorize('admin', 'manager'), testRestoreBackup);

export default router;
