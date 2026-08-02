import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getDailyReport,
  getDriverReport,
  getVehicleReport,
  getShippingStats
} from '../controllers/shipping.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Protect all shipping routes
router.use(authenticate);

// 📦 Manage scrap shipping transactions
router.post('/transactions', authorize('admin', 'warehouse'), createTransaction);
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);
router.put('/transactions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), updateTransaction);
router.delete('/transactions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), deleteTransaction);

// 📊 Shipping reports
router.get('/reports/daily', authorize('admin', 'manager'), getDailyReport);
router.get('/reports/driver/:driverName', authorize('admin', 'manager'), getDriverReport);
router.get('/reports/vehicle/:vehicleNumber', authorize('admin', 'manager'), getVehicleReport);

// 📈 Statistics
router.get('/stats', authorize('admin', 'manager'), getShippingStats);

export default router;
