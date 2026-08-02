import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import {
  getVaults,
  createVault,
  updateVault,
  toggleVaultStatus,
  deleteVault,
  getVouchers,
  createReceiptVoucher,
  createPaymentVoucher,
  getTransfers,
  requestTransfer,
  acceptTransfer,
  rejectTransfer,
  bankDeposit,
  bankWithdrawal,
  getTreasuryStats,
  closeVault,
  getVaultClosures,
  treasuryAuth,
  TreasuryController
} from '../controllers/treasury.controller';

const router = Router();

// All treasury endpoints are protected by authentication
router.use(authenticate);

// 1. Vaults
router.get('/vaults', requirePermission('treasury', 'view'), getVaults);
router.post('/vaults', requirePermission('treasury', 'edit'), createVault);
router.put('/vaults/:id', requirePermission('treasury', 'edit'), updateVault);
router.put('/vaults/:id/toggle-status', requirePermission('treasury', 'edit'), toggleVaultStatus);
router.delete('/vaults/:id', requirePermission('treasury', 'delete'), deleteVault);

// 2. Vouchers (Receipt & Payment & Contract Security)
router.get('/vouchers', requirePermission('treasury', 'view'), getVouchers);
router.post('/vouchers/receipt', requirePermission('treasury', 'edit'), createReceiptVoucher);
router.post('/vouchers/payment', requirePermission('treasury', 'edit'), createPaymentVoucher);
router.post('/security-vouchers', treasuryAuth('create_security'), requirePermission('treasury', 'edit'), TreasuryController.createContractSecurityVoucher);

// 3. Inter-Vault Transfers
router.get('/transfers', requirePermission('treasury', 'view'), getTransfers);
router.post('/transfers/request', requirePermission('treasury', 'edit'), requestTransfer);
router.post('/transfers/:id/accept', requirePermission('treasury', 'edit'), acceptTransfer);
router.post('/transfers/:id/reject', requirePermission('treasury', 'edit'), rejectTransfer);

// 4. Bank operations
router.post('/bank/deposit', requirePermission('treasury', 'edit'), bankDeposit);
router.post('/bank/withdrawal', requirePermission('treasury', 'edit'), bankWithdrawal);

// 5. Treasury Stats
router.get('/stats', requirePermission('treasury', 'view'), getTreasuryStats);

// 6. Closure and Reconciliation
router.post('/vaults/:id/close', requirePermission('treasury', 'edit'), closeVault);
router.get('/closures', requirePermission('treasury', 'view'), getVaultClosures);

export default router;
