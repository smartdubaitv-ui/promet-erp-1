import { Request, Response } from 'express';
import { jsonDB } from '../data/jsonDatabase';
import { isFirebaseConnected, firestore } from '../../services/firebase.service';
import { AuditService } from '../services/audit.service';
import { logger } from '../config/logger';
import { TreasuryService } from '../services/treasury.service';

function getLocalDatabase() {
  return jsonDB.load();
}

function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

const DEFAULT_VAULTS = [
  {
    id: 'vault-1',
    name: 'الخزينة الرئيسية',
    type: 'main',
    custodian_id: 'u-1',
    custodian_name: 'مدير النظام (الإدارة العامة)',
    custodian_email: 'admin@promet.sa',
    opening_balance: 100000,
    current_balance: 100000,
    max_limit: 500000,
    is_active: true
  },
  {
    id: 'vault-2',
    name: 'خزينة شراء الخردة',
    type: 'scrap_purchase',
    custodian_id: 'u-2',
    custodian_name: 'أحمد علي (أمين صندوق شراء الخردة)',
    custodian_email: 'ahmed.ali@promet.sa',
    opening_balance: 50000,
    current_balance: 50000,
    max_limit: 150000,
    is_active: true
  },
  {
    id: 'vault-3',
    name: 'خزينة النثريات والمصروفات',
    type: 'petty_cash',
    custodian_id: 'u-3',
    custodian_name: 'محمود حسن (المحاسب المسؤول)',
    custodian_email: 'mahmoud.h@promet.sa',
    opening_balance: 15000,
    current_balance: 15000,
    max_limit: 30000,
    is_active: true
  },
  {
    id: 'vault-4',
    name: 'خزينة موقع المصنع',
    type: 'site_factory',
    custodian_id: 'u-4',
    custodian_name: 'مصطفى إبراهيم (مدير الموقع)',
    custodian_email: 'mostafa.i@promet.sa',
    opening_balance: 30000,
    current_balance: 30000,
    max_limit: 100000,
    is_active: true
  }
];

// Helper to check user permission: Admin or Custodian of the vault
function canAccessVault(user: any, vault: any): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'superadmin') return true;
  
  const userId = String(user.id || user.userId || '');
  const userEmail = String(user.email || '').toLowerCase();
  
  const custodianId = String(vault.custodian_id || '');
  const custodianEmail = String(vault.custodian_email || '').toLowerCase();
  
  return Boolean((userId && userId === custodianId) || (userEmail && userEmail === custodianEmail));
}

// Treasury auth permission helper middleware
export const treasuryAuth = (permission?: string) => {
  return async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'غير مصرح - يرجى تسجيل الدخول' });
    }

    const role = String(user.role || '').toLowerCase();
    if (role === 'admin' || role === 'superadmin') {
      return next();
    }

    // Check if a vault ID is provided in req
    const vaultId = req.body?.vault_id || req.body?.vaultId || req.query?.vault_id || req.query?.vaultId || req.params?.vaultId || req.params?.id;

    if (vaultId) {
      const tenantId = (req as any).tenantId || 'tenant-promet-sa';
      let vault: any = null;

      if (isFirebaseConnected() && firestore) {
        const doc = await firestore.collection('vaults').doc(String(vaultId)).get();
        if (doc.exists && doc.data()?.tenantId === tenantId) {
          vault = { id: doc.id, ...doc.data() };
        }
      } else {
        const db = getLocalDatabase();
        vault = (db.vaults || []).find((v: any) => v.id === String(vaultId) && (v.tenantId === tenantId || !v.tenantId));
      }

      if (vault) {
        if (!canAccessVault(user, vault)) {
          return res.status(403).json({ success: false, error: 'عذراً، لا تملك صلاحية الوصول لهذه الخزينة' });
        }
        return next();
      }
    }

    // Standard treasury roles allowed for general endpoints
    if (role === 'treasurer' || role === 'accountant' || role === 'custodian' || role === 'manager') {
      return next();
    }

    return res.status(403).json({ success: false, error: 'غير مصرح - صلاحيات الخزينة مطلوبة' });
  };
};

// -------------------------------------------------------------
// 1. إدارة الخزائن (Vaults CRUD)
// -------------------------------------------------------------

export const getVaults = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  try {
    let vaults: any[] = [];
    if (isFirebaseConnected() && firestore) {
      const snap = await firestore.collection('vaults').where('tenantId', '==', tenantId).get();
      if (snap.empty) {
        // Seed default vaults
        const batch = firestore.batch();
        for (const def of DEFAULT_VAULTS) {
          const docRef = firestore.collection('vaults').doc(def.id);
          const vData = {
            ...def,
            tenantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          batch.set(docRef, vData);
          vaults.push(vData);
        }
        await batch.commit();
      } else {
        vaults = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } else {
      const db = getLocalDatabase();
      if (!db.vaults || !Array.isArray(db.vaults) || db.vaults.length === 0) {
        db.vaults = DEFAULT_VAULTS.map(def => ({
          ...def,
          tenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        saveLocalDatabase(db);
      }
      vaults = db.vaults.filter((v: any) => v.tenantId === tenantId);
    }

    // Attach warning flag for exceeding max limit
    const enrichedVaults = vaults.map(v => {
      const current = Number(v.current_balance || 0);
      const maxLimit = Number(v.max_limit || 0);
      const isExceeding = maxLimit > 0 && current > maxLimit;
      return {
        ...v,
        exceeds_limit: isExceeding,
        exceed_warning_message: isExceeding 
          ? `⚠️ رصيد الخزينة (${current.toLocaleString()} ج.م) تجاوز الحد الأقصى المسموح (${maxLimit.toLocaleString()} ج.م). يوصى بتغذية البنك أو تحويل الفائض للخزينة الرئيسية.`
          : null
      };
    });

    return res.json({ success: true, data: enrichedVaults });
  } catch (error: any) {
    logger.error('Error fetching vaults:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب قائمة الخزائن' });
  }
};

export const createVault = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { name, type, custodian_id, custodian_name, custodian_email, opening_balance, max_limit } = req.body;

  if (!name || !type) {
    return res.status(400).json({ success: false, error: 'اسم الخزينة ونوعها مطلوبان' });
  }

  const newVault = {
    id: `vault-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    name,
    type: type || 'main',
    custodian_id: custodian_id || user?.id || 'u-1',
    custodian_name: custodian_name || user?.name || 'أمين خزينة',
    custodian_email: custodian_email || user?.email || '',
    opening_balance: Number(opening_balance || 0),
    current_balance: Number(opening_balance || 0),
    max_limit: Number(max_limit || 100000),
    is_active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(newVault.id).set(newVault);
    } else {
      const db = getLocalDatabase();
      if (!db.vaults) db.vaults = [];
      db.vaults.push(newVault);
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'CREATE_VAULT',
      resource: 'Vaults',
      resourceId: newVault.id,
      changes: { name, type, opening_balance, max_limit }
    });

    return res.status(201).json({ success: true, data: newVault, message: 'تم إنشاء الخزينة بنجاح' });
  } catch (error: any) {
    logger.error('Error creating vault:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء الخزينة' });
  }
};

export const updateVault = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { id } = req.params;
  const { name, type, custodian_id, custodian_name, custodian_email, max_limit, is_active } = req.body;

  try {
    let existingVault: any = null;
    if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('vaults').doc(id).get();
      if (doc.exists && doc.data()?.tenantId === tenantId) {
        existingVault = { id: doc.id, ...doc.data() };
      }
    } else {
      const db = getLocalDatabase();
      existingVault = (db.vaults || []).find((v: any) => v.id === id && v.tenantId === tenantId);
    }

    if (!existingVault) {
      return res.status(404).json({ success: false, error: 'الخزينة غير موجودة' });
    }

    const updatedData = {
      ...existingVault,
      name: name !== undefined ? name : existingVault.name,
      type: type !== undefined ? type : existingVault.type,
      custodian_id: custodian_id !== undefined ? custodian_id : existingVault.custodian_id,
      custodian_name: custodian_name !== undefined ? custodian_name : existingVault.custodian_name,
      custodian_email: custodian_email !== undefined ? custodian_email : existingVault.custodian_email,
      max_limit: max_limit !== undefined ? Number(max_limit) : existingVault.max_limit,
      is_active: is_active !== undefined ? Boolean(is_active) : existingVault.is_active,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(id).update(updatedData);
    } else {
      const db = getLocalDatabase();
      const idx = (db.vaults || []).findIndex((v: any) => v.id === id && v.tenantId === tenantId);
      if (idx !== -1) {
        db.vaults[idx] = updatedData;
        saveLocalDatabase(db);
      }
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'UPDATE_VAULT',
      resource: 'Vaults',
      resourceId: id,
      changes: { name, type, max_limit, is_active }
    });

    return res.json({ success: true, data: updatedData, message: 'تم تحديث بيانات الخزينة بنجاح' });
  } catch (error: any) {
    logger.error('Error updating vault:', error);
    return res.status(500).json({ success: false, error: 'فشل في تحديث الخزينة' });
  }
};

export const toggleVaultStatus = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { id } = req.params;

  try {
    let existingVault: any = null;
    if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('vaults').doc(id).get();
      if (doc.exists && doc.data()?.tenantId === tenantId) {
        existingVault = { id: doc.id, ...doc.data() };
      }
    } else {
      const db = getLocalDatabase();
      existingVault = (db.vaults || []).find((v: any) => v.id === id && v.tenantId === tenantId);
    }

    if (!existingVault) {
      return res.status(404).json({ success: false, error: 'الخزينة غير موجودة' });
    }

    const newStatus = !existingVault.is_active;

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(id).update({
        is_active: newStatus,
        updatedAt: new Date().toISOString()
      });
    } else {
      const db = getLocalDatabase();
      const idx = (db.vaults || []).findIndex((v: any) => v.id === id && v.tenantId === tenantId);
      if (idx !== -1) {
        db.vaults[idx].is_active = newStatus;
        db.vaults[idx].updatedAt = new Date().toISOString();
        saveLocalDatabase(db);
      }
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: newStatus ? 'ACTIVATE_VAULT' : 'DEACTIVATE_VAULT',
      resource: 'Vaults',
      resourceId: id,
      changes: { is_active: newStatus }
    });

    return res.json({ 
      success: true, 
      is_active: newStatus, 
      message: newStatus ? 'تم تفعيل الخزينة' : 'تم تعطيل الخزينة بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error toggling vault status:', error);
    return res.status(500).json({ success: false, error: 'فشل في تغيير حالة الخزينة' });
  }
};

export const deleteVault = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { id } = req.params;

  try {
    // Check if vault has recorded vouchers or transfers
    let voucherCount = 0;
    let transferCount = 0;

    if (isFirebaseConnected() && firestore) {
      const vSnap = await firestore.collection('vault_vouchers')
        .where('tenantId', '==', tenantId)
        .where('vault_id', '==', id)
        .get();
      voucherCount = vSnap.size;

      const tSnap1 = await firestore.collection('vault_transfers')
        .where('tenantId', '==', tenantId)
        .where('from_vault_id', '==', id)
        .get();
      const tSnap2 = await firestore.collection('vault_transfers')
        .where('tenantId', '==', tenantId)
        .where('to_vault_id', '==', id)
        .get();
      transferCount = tSnap1.size + tSnap2.size;
    } else {
      const db = getLocalDatabase();
      voucherCount = (db.vault_vouchers || []).filter((v: any) => v.tenantId === tenantId && v.vault_id === id).length;
      transferCount = (db.vault_transfers || []).filter((t: any) => 
        t.tenantId === tenantId && (t.from_vault_id === id || t.to_vault_id === id)
      ).length;
    }

    if (voucherCount > 0 || transferCount > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'لا يمكن حذف الخزينة نهائيًا لوجود حركات وسندات مسجلة بها. يمكنك تعطيل الخزينة بدلاً من ذلك.' 
      });
    }

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(id).delete();
    } else {
      const db = getLocalDatabase();
      db.vaults = (db.vaults || []).filter((v: any) => !(v.id === id && v.tenantId === tenantId));
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'DELETE_VAULT',
      resource: 'Vaults',
      resourceId: id
    });

    return res.json({ success: true, message: 'تم حذف الخزينة الخالية من الحركات بنجاح' });
  } catch (error: any) {
    logger.error('Error deleting vault:', error);
    return res.status(500).json({ success: false, error: 'فشل في حذف الخزينة' });
  }
};

// -------------------------------------------------------------
// 2. سندات القبض والصرف (Vouchers - Receipt & Payment)
// -------------------------------------------------------------

export const getVouchers = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const { vault_id } = req.query;

  try {
    let vouchers: any[] = [];
    if (isFirebaseConnected() && firestore) {
      let q = firestore.collection('vault_vouchers').where('tenantId', '==', tenantId);
      if (vault_id) {
        q = q.where('vault_id', '==', String(vault_id));
      }
      const snap = await q.get();
      vouchers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      vouchers = (db.vault_vouchers || []).filter((v: any) => {
        if (v.tenantId !== tenantId) return false;
        if (vault_id && v.vault_id !== String(vault_id)) return false;
        return true;
      });
    }

    // Sort descending by date/createdAt
    vouchers.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    return res.json({ success: true, data: vouchers });
  } catch (error: any) {
    logger.error('Error fetching vouchers:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب سندات الخزينة' });
  }
};

export const createReceiptVoucher = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { vault_id, amount, date, type, notes, contact_id, contact_name } = req.body;

  if (!vault_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الخزينة ومبلغ إيداع صحيح أكبر من صفر' });
  }

  try {
    let vault: any = null;
    if (isFirebaseConnected() && firestore) {
      const vDoc = await firestore.collection('vaults').doc(vault_id).get();
      if (vDoc.exists && vDoc.data()?.tenantId === tenantId) {
        vault = { id: vDoc.id, ...vDoc.data() };
      }
    } else {
      const db = getLocalDatabase();
      vault = (db.vaults || []).find((v: any) => v.id === vault_id && v.tenantId === tenantId);
    }

    if (!vault) {
      return res.status(404).json({ success: false, error: 'الخزينة المحددة غير موجودة' });
    }

    if (!vault.is_active) {
      return res.status(400).json({ success: false, error: 'الخزينة المحددة معطلة حالياً ولا يمكن الإيداع فيها' });
    }

    // Permission check: Admin or Custodian
    if (!canAccessVault(user, vault)) {
      return res.status(403).json({ success: false, error: 'عذراً، صلاحيتك تقتصر على الخزينة المسندة إليك فقط أو صلاحيات الأدمن' });
    }

    const depositAmount = Number(amount);
    const newBalance = Number(vault.current_balance || 0) + depositAmount;

    const voucherNumber = `RV-${Date.now().toString().slice(-6)}`;
    const voucher = {
      id: `vchr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voucher_number: voucherNumber,
      tenantId,
      vault_id,
      vault_name: vault.name,
      voucher_type: 'receipt', // سند قبض
      category_type: type || 'customer_collection', // تحصيل من عميل / تحصيل بيع خردة / إلخ
      amount: depositAmount,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || 'سند قبض - إيداع خزينة',
      contact_id: contact_id || null,
      contact_name: contact_name || null,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'مدير النظام',
      created_by_email: user?.email || 'admin@promet.sa',
      createdAt: new Date().toISOString()
    };

    // Update vault balance
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(vault_id).update({
        current_balance: newBalance,
        updatedAt: new Date().toISOString()
      });
      await firestore.collection('vault_vouchers').doc(voucher.id).set(voucher);
    } else {
      const db = getLocalDatabase();
      const vIdx = (db.vaults || []).findIndex((v: any) => v.id === vault_id && v.tenantId === tenantId);
      if (vIdx !== -1) {
        db.vaults[vIdx].current_balance = newBalance;
        db.vaults[vIdx].updatedAt = new Date().toISOString();
      }
      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(voucher);
      saveLocalDatabase(db);
    }

    // Exceeding limit notification check
    let warningMsg = null;
    if (vault.max_limit && newBalance > Number(vault.max_limit)) {
      warningMsg = `⚠️ رصيد الخزينة (${newBalance.toLocaleString()} ج.م) تجاوز الحد الأقصى المسموح (${Number(vault.max_limit).toLocaleString()} ج.م). يُوصى بتغذية البنك أو تحويل الفائض.`;
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'CREATE_RECEIPT_VOUCHER',
      resource: 'VaultVouchers',
      resourceId: voucher.id,
      changes: { vault_id, amount: depositAmount, newBalance, voucherNumber }
    });

    return res.status(201).json({ 
      success: true, 
      data: voucher, 
      new_balance: newBalance,
      warning: warningMsg,
      message: 'تم تسجيل سند القبض وإضافة المبلغ لرصيد الخزينة بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error creating receipt voucher:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء سند القبض' });
  }
};

export const createPaymentVoucher = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { vault_id, amount, date, type, notes, contact_id, contact_name } = req.body;

  if (!vault_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الخزينة ومبلغ صرف صحيح أكبر من صفر' });
  }

  try {
    let vault: any = null;
    if (isFirebaseConnected() && firestore) {
      const vDoc = await firestore.collection('vaults').doc(vault_id).get();
      if (vDoc.exists && vDoc.data()?.tenantId === tenantId) {
        vault = { id: vDoc.id, ...vDoc.data() };
      }
    } else {
      const db = getLocalDatabase();
      vault = (db.vaults || []).find((v: any) => v.id === vault_id && v.tenantId === tenantId);
    }

    if (!vault) {
      return res.status(404).json({ success: false, error: 'الخزينة المحددة غير موجودة' });
    }

    if (!vault.is_active) {
      return res.status(400).json({ success: false, error: 'الخزينة المحددة معطلة حالياً ولا يمكن الصرف منها' });
    }

    // Permission check: Admin or Custodian
    if (!canAccessVault(user, vault)) {
      return res.status(403).json({ success: false, error: 'عذراً، صلاحيتك تقتصر على الخزينة المسندة إليك فقط أو صلاحيات الأدمن' });
    }

    const paymentAmount = Number(amount);
    const currentBal = Number(vault.current_balance || 0);

    // CRITICAL REQUIREMENT: Reject voucher if amount > current balance
    if (paymentAmount > currentBal) {
      return res.status(400).json({ 
        success: false, 
        error: `رصيد الخزينة الحالي (${currentBal.toLocaleString()} ج.م) لا يكفي لتغطية مبلغ الصرف المطلوب (${paymentAmount.toLocaleString()} ج.م). يرجى طلب تغذية الخزينة أولاً.` 
      });
    }

    const newBalance = currentBal - paymentAmount;
    const voucherNumber = `PV-${Date.now().toString().slice(-6)}`;
    const voucher = {
      id: `vchr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voucher_number: voucherNumber,
      tenantId,
      vault_id,
      vault_name: vault.name,
      voucher_type: 'payment', // سند صرف
      category_type: type || 'operational_expense', // توريد مستحقات / مصروف / راتب / إلخ
      amount: paymentAmount,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || 'سند صرف - الخزينة',
      contact_id: contact_id || null,
      contact_name: contact_name || null,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'مدير النظام',
      created_by_email: user?.email || 'admin@promet.sa',
      createdAt: new Date().toISOString()
    };

    // Update vault balance
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(vault_id).update({
        current_balance: newBalance,
        updatedAt: new Date().toISOString()
      });
      await firestore.collection('vault_vouchers').doc(voucher.id).set(voucher);
    } else {
      const db = getLocalDatabase();
      const vIdx = (db.vaults || []).findIndex((v: any) => v.id === vault_id && v.tenantId === tenantId);
      if (vIdx !== -1) {
        db.vaults[vIdx].current_balance = newBalance;
        db.vaults[vIdx].updatedAt = new Date().toISOString();
      }
      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(voucher);
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'CREATE_PAYMENT_VOUCHER',
      resource: 'VaultVouchers',
      resourceId: voucher.id,
      changes: { vault_id, amount: paymentAmount, newBalance, voucherNumber }
    });

    return res.status(201).json({ 
      success: true, 
      data: voucher, 
      new_balance: newBalance,
      message: 'تم تسجيل سند الصرف وخصم المبلغ من رصيد الخزينة بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error creating payment voucher:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء سند الصرف' });
  }
};

// -------------------------------------------------------------
// 3. التحويل بين الخزائن (Inter-Vault Transfers - 2-step)
// -------------------------------------------------------------

export const getTransfers = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const { status } = req.query;

  try {
    let transfers: any[] = [];
    if (isFirebaseConnected() && firestore) {
      let q = firestore.collection('vault_transfers').where('tenantId', '==', tenantId);
      if (status) {
        q = q.where('status', '==', String(status));
      }
      const snap = await q.get();
      transfers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      transfers = (db.vault_transfers || []).filter((t: any) => {
        if (t.tenantId !== tenantId) return false;
        if (status && t.status !== String(status)) return false;
        return true;
      });
    }

    transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: transfers });
  } catch (error: any) {
    logger.error('Error fetching transfers:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب طلبات التحويل' });
  }
};

export const requestTransfer = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { from_vault_id, to_vault_id, amount, reason } = req.body;

  if (!from_vault_id || !to_vault_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الخزينة المصدر والخزينة الهدف ومبلغ تحويل صحيح' });
  }

  if (from_vault_id === to_vault_id) {
    return res.status(400).json({ success: false, error: 'لا يمكن التحويل من وإلى نفس الخزينة' });
  }

  try {
    let fromVault: any = null;
    let toVault: any = null;

    if (isFirebaseConnected() && firestore) {
      const fDoc = await firestore.collection('vaults').doc(from_vault_id).get();
      const tDoc = await firestore.collection('vaults').doc(to_vault_id).get();
      if (fDoc.exists && fDoc.data()?.tenantId === tenantId) fromVault = { id: fDoc.id, ...fDoc.data() };
      if (tDoc.exists && tDoc.data()?.tenantId === tenantId) toVault = { id: tDoc.id, ...tDoc.data() };
    } else {
      const db = getLocalDatabase();
      fromVault = (db.vaults || []).find((v: any) => v.id === from_vault_id && v.tenantId === tenantId);
      toVault = (db.vaults || []).find((v: any) => v.id === to_vault_id && v.tenantId === tenantId);
    }

    if (!fromVault || !toVault) {
      return res.status(404).json({ success: false, error: 'إحدى الخزينتين غير موجودة' });
    }

    if (!fromVault.is_active || !toVault.is_active) {
      return res.status(400).json({ success: false, error: 'إحدى الخزينتين معطلة حالياً' });
    }

    // Permission check for source vault
    if (!canAccessVault(user, fromVault)) {
      return res.status(403).json({ success: false, error: 'غير مسموح لك بطلب تحويل من خزينة لا تملك أمانتها' });
    }

    const transferAmount = Number(amount);
    if (transferAmount > Number(fromVault.current_balance || 0)) {
      return res.status(400).json({ 
        success: false, 
        error: `رصيد الخزينة المصدر (${Number(fromVault.current_balance || 0).toLocaleString()} ج.م) لا يكفي لتغطية مبلغ التحويل المطلوب (${transferAmount.toLocaleString()} ج.م)` 
      });
    }

    // Check duplicate pending transfer request
    let hasPending = false;
    if (isFirebaseConnected() && firestore) {
      const pSnap = await firestore.collection('vault_transfers')
        .where('tenantId', '==', tenantId)
        .where('from_vault_id', '==', from_vault_id)
        .where('to_vault_id', '==', to_vault_id)
        .where('status', '==', 'pending')
        .get();
      hasPending = !pSnap.empty;
    } else {
      const db = getLocalDatabase();
      hasPending = (db.vault_transfers || []).some((t: any) => 
        t.tenantId === tenantId && 
        t.from_vault_id === from_vault_id && 
        t.to_vault_id === to_vault_id && 
        t.status === 'pending'
      );
    }

    if (hasPending) {
      return res.status(400).json({ 
        success: false, 
        error: 'يوجد بالفعل طلب تحويل معلّق بين نفس الخزينتين. يرجى الانتظار لحين معالجته أو قبوله/رفضه.' 
      });
    }

    const newTransfer = {
      id: `trsf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      transfer_number: `TR-${Date.now().toString().slice(-6)}`,
      tenantId,
      from_vault_id,
      from_vault_name: fromVault.name,
      to_vault_id,
      to_vault_name: toVault.name,
      amount: transferAmount,
      reason: reason || 'طلب تحويل سيولة بين الخزائن',
      status: 'pending', // معلق - لا تتأثر الأرصدة حتى القبول
      requested_by_id: user?.id || 'u-1',
      requested_by_name: user?.name || 'أمين الخزينة المصدر',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vault_transfers').doc(newTransfer.id).set(newTransfer);
    } else {
      const db = getLocalDatabase();
      if (!db.vault_transfers) db.vault_transfers = [];
      db.vault_transfers.push(newTransfer);
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'REQUEST_VAULT_TRANSFER',
      resource: 'VaultTransfers',
      resourceId: newTransfer.id,
      changes: { from_vault_id, to_vault_id, amount: transferAmount }
    });

    return res.status(201).json({ 
      success: true, 
      data: newTransfer, 
      message: 'تم إنشاء طلب التحويل بنجاح، بانتظار موافقة واستلام أمين الخزينة المستهدفة' 
    });
  } catch (error: any) {
    logger.error('Error requesting transfer:', error);
    return res.status(500).json({ success: false, error: 'فشل في إنشاء طلب التحويل' });
  }
};

export const acceptTransfer = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { id } = req.params;

  try {
    let transfer: any = null;
    if (isFirebaseConnected() && firestore) {
      const tDoc = await firestore.collection('vault_transfers').doc(id).get();
      if (tDoc.exists && tDoc.data()?.tenantId === tenantId) {
        transfer = { id: tDoc.id, ...tDoc.data() };
      }
    } else {
      const db = getLocalDatabase();
      transfer = (db.vault_transfers || []).find((t: any) => t.id === id && t.tenantId === tenantId);
    }

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'طلب التحويل غير موجود' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'تمت معالجة طلب التحويل هذا سابقاً' });
    }

    // Get both vaults
    let fromVault: any = null;
    let toVault: any = null;

    if (isFirebaseConnected() && firestore) {
      const fDoc = await firestore.collection('vaults').doc(transfer.from_vault_id).get();
      const tDoc = await firestore.collection('vaults').doc(transfer.to_vault_id).get();
      if (fDoc.exists) fromVault = { id: fDoc.id, ...fDoc.data() };
      if (tDoc.exists) toVault = { id: tDoc.id, ...tDoc.data() };
    } else {
      const db = getLocalDatabase();
      fromVault = (db.vaults || []).find((v: any) => v.id === transfer.from_vault_id);
      toVault = (db.vaults || []).find((v: any) => v.id === transfer.to_vault_id);
    }

    if (!fromVault || !toVault) {
      return res.status(404).json({ success: false, error: 'إحدى الخزينتين المرتبطتين بالطلب غير موجودة' });
    }

    // Permission check: Target vault custodian or Admin ONLY can accept
    if (!canAccessVault(user, toVault)) {
      return res.status(403).json({ success: false, error: 'فقط أمين الخزينة المستلمة أو الأدمن يمكنه قبول واستلام التحويل' });
    }

    const transferAmount = Number(transfer.amount);
    const fromBal = Number(fromVault.current_balance || 0);

    if (transferAmount > fromBal) {
      return res.status(400).json({ 
        success: false, 
        error: `رصيد الخزينة المصدر الحالي (${fromBal.toLocaleString()} ج.م) غير كاف لتنفيذ التحويل (${transferAmount.toLocaleString()} ج.م)` 
      });
    }

    const newFromBal = fromBal - transferAmount;
    const newToBal = Number(toVault.current_balance || 0) + transferAmount;

    // Create ledger vouchers for trace
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.split('T')[0];

    const outgoingVoucher = {
      id: `vchr-${Date.now()}-out`,
      voucher_number: `PV-${Date.now().toString().slice(-6)}`,
      tenantId,
      vault_id: fromVault.id,
      vault_name: fromVault.name,
      voucher_type: 'payment',
      category_type: 'inter_vault_transfer',
      amount: transferAmount,
      date: nowDate,
      notes: `تحويل صادرة إلى خزينة ${toVault.name} (طلب ${transfer.transfer_number})`,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'أمين الخزينة',
      createdAt: nowIso
    };

    const incomingVoucher = {
      id: `vchr-${Date.now()}-in`,
      voucher_number: `RV-${Date.now().toString().slice(-6)}`,
      tenantId,
      vault_id: toVault.id,
      vault_name: toVault.name,
      voucher_type: 'receipt',
      category_type: 'inter_vault_transfer',
      amount: transferAmount,
      date: nowDate,
      notes: `استلام تحويل واردة من خزينة ${fromVault.name} (طلب ${transfer.transfer_number})`,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'أمين الخزينة المستلم',
      createdAt: nowIso
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(fromVault.id).update({ current_balance: newFromBal, updatedAt: nowIso });
      await firestore.collection('vaults').doc(toVault.id).update({ current_balance: newToBal, updatedAt: nowIso });
      await firestore.collection('vault_transfers').doc(id).update({
        status: 'accepted',
        processed_by_id: user?.id || 'u-1',
        processed_by_name: user?.name || 'أمين الخزينة الهدف',
        processedAt: nowIso
      });
      await firestore.collection('vault_vouchers').doc(outgoingVoucher.id).set(outgoingVoucher);
      await firestore.collection('vault_vouchers').doc(incomingVoucher.id).set(incomingVoucher);
    } else {
      const db = getLocalDatabase();
      const fIdx = db.vaults.findIndex((v: any) => v.id === fromVault.id);
      const tIdx = db.vaults.findIndex((v: any) => v.id === toVault.id);
      if (fIdx !== -1) db.vaults[fIdx].current_balance = newFromBal;
      if (tIdx !== -1) db.vaults[tIdx].current_balance = newToBal;

      const trIdx = db.vault_transfers.findIndex((t: any) => t.id === id);
      if (trIdx !== -1) {
        db.vault_transfers[trIdx].status = 'accepted';
        db.vault_transfers[trIdx].processed_by_id = user?.id || 'u-1';
        db.vault_transfers[trIdx].processed_by_name = user?.name || 'أمين الخزينة الهدف';
        db.vault_transfers[trIdx].processedAt = nowIso;
      }

      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(outgoingVoucher, incomingVoucher);
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'ACCEPT_VAULT_TRANSFER',
      resource: 'VaultTransfers',
      resourceId: id,
      changes: { transfer_amount: transferAmount, newFromBal, newToBal }
    });

    return res.json({ 
      success: true, 
      message: 'تم قبول واستلام مبلغ التحويل بنجاح وتحديث أرصدة الخزينتين',
      data: { from_vault_balance: newFromBal, to_vault_balance: newToBal }
    });
  } catch (error: any) {
    logger.error('Error accepting transfer:', error);
    return res.status(500).json({ success: false, error: 'فشل في قبول طلب التحويل' });
  }
};

export const rejectTransfer = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { id } = req.params;
  const { reject_reason } = req.body;

  try {
    let transfer: any = null;
    if (isFirebaseConnected() && firestore) {
      const tDoc = await firestore.collection('vault_transfers').doc(id).get();
      if (tDoc.exists && tDoc.data()?.tenantId === tenantId) {
        transfer = { id: tDoc.id, ...tDoc.data() };
      }
    } else {
      const db = getLocalDatabase();
      transfer = (db.vault_transfers || []).find((t: any) => t.id === id && t.tenantId === tenantId);
    }

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'طلب التحويل غير موجود' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'تمت معالجة طلب التحويل هذا سابقاً' });
    }

    let toVault: any = null;
    if (isFirebaseConnected() && firestore) {
      const tDoc = await firestore.collection('vaults').doc(transfer.to_vault_id).get();
      if (tDoc.exists) toVault = { id: tDoc.id, ...tDoc.data() };
    } else {
      const db = getLocalDatabase();
      toVault = (db.vaults || []).find((v: any) => v.id === transfer.to_vault_id);
    }

    if (toVault && !canAccessVault(user, toVault)) {
      return res.status(403).json({ success: false, error: 'فقط أمين الخزينة المستلمة أو الأدمن يمكنه رفض طلب التحويل' });
    }

    const nowIso = new Date().toISOString();

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vault_transfers').doc(id).update({
        status: 'rejected',
        reject_reason: reject_reason || 'تم الرفض بواسطة أمين الخزينة',
        processed_by_id: user?.id || 'u-1',
        processed_by_name: user?.name || 'أمين الخزينة الهدف',
        processedAt: nowIso
      });
    } else {
      const db = getLocalDatabase();
      const trIdx = (db.vault_transfers || []).findIndex((t: any) => t.id === id);
      if (trIdx !== -1) {
        db.vault_transfers[trIdx].status = 'rejected';
        db.vault_transfers[trIdx].reject_reason = reject_reason || 'تم الرفض بواسطة أمين الخزينة';
        db.vault_transfers[trIdx].processed_by_id = user?.id || 'u-1';
        db.vault_transfers[trIdx].processed_by_name = user?.name || 'أمين الخزينة الهدف';
        db.vault_transfers[trIdx].processedAt = nowIso;
        saveLocalDatabase(db);
      }
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'REJECT_VAULT_TRANSFER',
      resource: 'VaultTransfers',
      resourceId: id,
      changes: { reject_reason }
    });

    return res.json({ success: true, message: 'تم رفض طلب التحويل بنجاح' });
  } catch (error: any) {
    logger.error('Error rejecting transfer:', error);
    return res.status(500).json({ success: false, error: 'فشل في رفض طلب التحويل' });
  }
};

// -------------------------------------------------------------
// 4. التغذية والسحب البنكي (Bank Deposit / Withdrawal)
// -------------------------------------------------------------

export const bankDeposit = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { vault_id, amount, date, notes } = req.body;

  if (!vault_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الخزينة ومبلغ التوريد البنكي' });
  }

  try {
    let vault: any = null;
    if (isFirebaseConnected() && firestore) {
      const vDoc = await firestore.collection('vaults').doc(vault_id).get();
      if (vDoc.exists && vDoc.data()?.tenantId === tenantId) vault = { id: vDoc.id, ...vDoc.data() };
    } else {
      const db = getLocalDatabase();
      vault = (db.vaults || []).find((v: any) => v.id === vault_id && v.tenantId === tenantId);
    }

    if (!vault) {
      return res.status(404).json({ success: false, error: 'الخزينة المحددة غير موجودة' });
    }

    if (!canAccessVault(user, vault)) {
      return res.status(403).json({ success: false, error: 'غير مسموح لك بإجراء معاملات على هذه الخزينة' });
    }

    const depositAmount = Number(amount);
    const currentBal = Number(vault.current_balance || 0);

    if (depositAmount > currentBal) {
      return res.status(400).json({ 
        success: false, 
        error: `رصيد الخزينة الحالي (${currentBal.toLocaleString()} ج.م) لا يكفي لتغذية البنك بهذا المبلغ (${depositAmount.toLocaleString()} ج.م)` 
      });
    }

    const newBalance = currentBal - depositAmount;
    const nowIso = new Date().toISOString();
    const nowDate = date || nowIso.split('T')[0];

    const voucher = {
      id: `vchr-${Date.now()}-bank-dep`,
      voucher_number: `BD-${Date.now().toString().slice(-6)}`,
      tenantId,
      vault_id,
      vault_name: vault.name,
      voucher_type: 'bank_deposit', // توريد للبنك (صادر من الخزينة)
      category_type: 'bank_feed',
      amount: depositAmount,
      date: nowDate,
      notes: notes || `توريد مالي من خزينة ${vault.name} للبنك (حساب 1010)`,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'مدير النظام',
      createdAt: nowIso
    };

    // Update account 1010 in ledger
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(vault_id).update({ current_balance: newBalance, updatedAt: nowIso });
      await firestore.collection('vault_vouchers').doc(voucher.id).set(voucher);

      const cashAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
      if (!cashAccSnap.empty) {
        const cashAccDoc = cashAccSnap.docs[0];
        await firestore.collection('accounts').doc(cashAccDoc.id).update({
          balance: Number(cashAccDoc.data().balance || 0) + depositAmount
        });
      }
    } else {
      const db = getLocalDatabase();
      const vIdx = (db.vaults || []).findIndex((v: any) => v.id === vault_id);
      if (vIdx !== -1) db.vaults[vIdx].current_balance = newBalance;
      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(voucher);

      if (db.accounts) {
        const cashAcc = db.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
        if (cashAcc) {
          cashAcc.balance = Number(cashAcc.balance || 0) + depositAmount;
        }
      }
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'BANK_DEPOSIT_FROM_VAULT',
      resource: 'VaultVouchers',
      resourceId: voucher.id,
      changes: { vault_id, amount: depositAmount, newBalance, accountCode: '1010' }
    });

    return res.status(201).json({ 
      success: true, 
      data: voucher, 
      new_balance: newBalance,
      message: 'تم توريد المبلغ للبنك وخصمه من الخزينة وزيادة رصيد النقدية (حساب 1010) بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error in bank deposit:', error);
    return res.status(500).json({ success: false, error: 'فشل في إتمام عملية التوريد البنكي' });
  }
};

export const bankWithdrawal = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { vault_id, amount, date, notes } = req.body;

  if (!vault_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'يرجى تحديد الخزينة ومبلغ السحب البنكي' });
  }

  try {
    let vault: any = null;
    if (isFirebaseConnected() && firestore) {
      const vDoc = await firestore.collection('vaults').doc(vault_id).get();
      if (vDoc.exists && vDoc.data()?.tenantId === tenantId) vault = { id: vDoc.id, ...vDoc.data() };
    } else {
      const db = getLocalDatabase();
      vault = (db.vaults || []).find((v: any) => v.id === vault_id && v.tenantId === tenantId);
    }

    if (!vault) {
      return res.status(404).json({ success: false, error: 'الخزينة المحددة غير موجودة' });
    }

    if (!canAccessVault(user, vault)) {
      return res.status(403).json({ success: false, error: 'غير مسموح لك بإجراء معاملات على هذه الخزينة' });
    }

    const withdrawalAmount = Number(amount);
    const newBalance = Number(vault.current_balance || 0) + withdrawalAmount;
    const nowIso = new Date().toISOString();
    const nowDate = date || nowIso.split('T')[0];

    const voucher = {
      id: `vchr-${Date.now()}-bank-wth`,
      voucher_number: `BW-${Date.now().toString().slice(-6)}`,
      tenantId,
      vault_id,
      vault_name: vault.name,
      voucher_type: 'bank_withdrawal', // سحب من البنك للخزينة (وارد للخزينة)
      category_type: 'bank_feed',
      amount: withdrawalAmount,
      date: nowDate,
      notes: notes || `سحب مالي من البنك لتغذية خزينة ${vault.name} (حساب 1010)`,
      created_by_id: user?.id || 'u-1',
      created_by_name: user?.name || 'مدير النظام',
      createdAt: nowIso
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vaults').doc(vault_id).update({ current_balance: newBalance, updatedAt: nowIso });
      await firestore.collection('vault_vouchers').doc(voucher.id).set(voucher);

      const cashAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
      if (!cashAccSnap.empty) {
        const cashAccDoc = cashAccSnap.docs[0];
        await firestore.collection('accounts').doc(cashAccDoc.id).update({
          balance: Math.max(0, Number(cashAccDoc.data().balance || 0) - withdrawalAmount)
        });
      }
    } else {
      const db = getLocalDatabase();
      const vIdx = (db.vaults || []).findIndex((v: any) => v.id === vault_id);
      if (vIdx !== -1) db.vaults[vIdx].current_balance = newBalance;
      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(voucher);

      if (db.accounts) {
        const cashAcc = db.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
        if (cashAcc) {
          cashAcc.balance = Math.max(0, Number(cashAcc.balance || 0) - withdrawalAmount);
        }
      }
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'BANK_WITHDRAWAL_TO_VAULT',
      resource: 'VaultVouchers',
      resourceId: voucher.id,
      changes: { vault_id, amount: withdrawalAmount, newBalance, accountCode: '1010' }
    });

    return res.status(201).json({ 
      success: true, 
      data: voucher, 
      new_balance: newBalance,
      message: 'تم سحب المبلغ من البنك وتغذية الخزينة بنجاح' 
    });
  } catch (error: any) {
    logger.error('Error in bank withdrawal:', error);
    return res.status(500).json({ success: false, error: 'فشل في إتمام عملية السحب البنكي' });
  }
};

// -------------------------------------------------------------
// 5. إحصائيات وملخص الخزينة (Treasury Stats)
// -------------------------------------------------------------

export const getTreasuryStats = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';

  try {
    let vaults: any[] = [];
    let vouchers: any[] = [];
    let transfers: any[] = [];

    if (isFirebaseConnected() && firestore) {
      const vSnap = await firestore.collection('vaults').where('tenantId', '==', tenantId).get();
      vaults = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const vcSnap = await firestore.collection('vault_vouchers').where('tenantId', '==', tenantId).get();
      vouchers = vcSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const trSnap = await firestore.collection('vault_transfers').where('tenantId', '==', tenantId).get();
      transfers = trSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      vaults = (db.vaults || []).filter((v: any) => v.tenantId === tenantId);
      vouchers = (db.vault_vouchers || []).filter((v: any) => v.tenantId === tenantId);
      transfers = (db.vault_transfers || []).filter((t: any) => t.tenantId === tenantId);
    }

    const activeVaults = vaults.filter(v => v.is_active !== false);
    const totalBalance = activeVaults.reduce((sum, v) => sum + Number(v.current_balance || 0), 0);
    
    const exceedingVaults = activeVaults.filter(v => Number(v.max_limit || 0) > 0 && Number(v.current_balance || 0) > Number(v.max_limit || 0));

    const totalReceipts = vouchers
      .filter(v => v.voucher_type === 'receipt' || v.voucher_type === 'bank_withdrawal')
      .reduce((sum, v) => sum + Number(v.amount || 0), 0);

    const totalPayments = vouchers
      .filter(v => v.voucher_type === 'payment' || v.voucher_type === 'bank_deposit')
      .reduce((sum, v) => sum + Number(v.amount || 0), 0);

    const pendingTransfersCount = transfers.filter(t => t.status === 'pending').length;

    return res.json({
      success: true,
      stats: {
        total_balance: totalBalance,
        active_vaults_count: activeVaults.length,
        total_vaults_count: vaults.length,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        pending_transfers_count: pendingTransfersCount,
        exceeding_limit_count: exceedingVaults.length,
        exceeding_vaults: exceedingVaults.map(v => ({ id: v.id, name: v.name, current_balance: v.current_balance, max_limit: v.max_limit }))
      }
    });
  } catch (error: any) {
    logger.error('Error fetching treasury stats:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب إحصائيات الخزينة' });
  }
};

// -------------------------------------------------------------
// 6. إغلاق وتقفيل الخزينة والجرد الدوري (Vault Closure & Reconciliation)
// -------------------------------------------------------------

export const closeVault = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const vaultId = req.params.id;
  const { physical_count, denominations, notes, adjust_balance } = req.body;

  try {
    const physicalAmount = Number(physical_count) || 0;

    let vault: any = null;
    let db: any = null;

    if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('vaults').doc(vaultId).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'الخزينة غير موجودة' });
      }
      vault = { id: doc.id, ...doc.data() };
    } else {
      db = getLocalDatabase();
      const vaults = db.vaults || [];
      vault = vaults.find((v: any) => v.id === vaultId && v.tenantId === tenantId);
      if (!vault) {
        return res.status(404).json({ success: false, error: 'الخزينة غير موجودة' });
      }
    }

    if (!canAccessVault(user, vault)) {
      return res.status(403).json({ success: false, error: 'غير مصرح لك بإغلاق هذه الخزينة' });
    }

    const bookBalance = Number(vault.current_balance) || 0;
    const difference = physicalAmount - bookBalance;
    const closureStatus = difference === 0 ? 'matched' : difference < 0 ? 'shortage' : 'surplus';

    const closureRecord = {
      id: `cls-${Date.now()}`,
      tenantId,
      vault_id: vault.id,
      vault_name: vault.name,
      closed_at: new Date().toISOString(),
      closed_by_id: user?.id || 'user-1',
      closed_by_name: user?.name || user?.email || vault.custodian_name || 'أمين الخزينة',
      book_balance: bookBalance,
      physical_count: physicalAmount,
      difference,
      status: closureStatus,
      denominations: denominations || {},
      notes: notes || '',
      adjusted: Boolean(adjust_balance && difference !== 0)
    };

    let newBalance = bookBalance;

    // Handle Balance adjustment if user requested automatic variance voucher creation
    if (adjust_balance && difference !== 0) {
      newBalance = physicalAmount;
      const voucherType = difference < 0 ? 'payment' : 'receipt';
      const voucherAmount = Math.abs(difference);

      const varianceVoucher = {
        id: `vch-var-${Date.now()}`,
        tenantId,
        voucher_number: `VCH-${Date.now().toString().slice(-6)}`,
        voucher_type: voucherType,
        vault_id: vault.id,
        vault_name: vault.name,
        amount: voucherAmount,
        date: new Date().toISOString().split('T')[0],
        type: difference < 0 ? 'shortage_adjustment' : 'surplus_adjustment',
        notes: `تسوية أوتوماتيكية ناتجة عن إغلاق الخزينة (${difference < 0 ? 'عجز' : 'زيادة'}: ${voucherAmount} ج.م)`,
        contact_id: '',
        contact_name: 'حساب فروقات وجرد الخزينة',
        created_by_id: user?.id || 'sys',
        created_by_name: user?.name || user?.email || 'أمين الخزينة',
        created_at: new Date().toISOString(),
        status: 'approved'
      };

      if (isFirebaseConnected() && firestore) {
        await firestore.collection('vault_vouchers').doc(varianceVoucher.id).set(varianceVoucher);
      } else if (db) {
        if (!db.vault_vouchers) db.vault_vouchers = [];
        db.vault_vouchers.unshift(varianceVoucher);
      }
    }

    const updatedVaultFields = {
      current_balance: newBalance,
      last_closed_at: closureRecord.closed_at,
      last_closure_diff: difference,
      last_closure_status: closureStatus,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('vault_closures').doc(closureRecord.id).set(closureRecord);
      await firestore.collection('vaults').doc(vaultId).update(updatedVaultFields);
    } else if (db) {
      if (!db.vault_closures) db.vault_closures = [];
      db.vault_closures.unshift(closureRecord);

      const vIdx = db.vaults.findIndex((v: any) => v.id === vaultId);
      if (vIdx !== -1) {
        db.vaults[vIdx] = { ...db.vaults[vIdx], ...updatedVaultFields };
      }
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: 'VAULT_DAILY_CLOSURE',
      resource: 'VaultClosures',
      resourceId: closureRecord.id,
      changes: { vaultId, bookBalance, physicalAmount, difference, status: closureStatus }
    });

    return res.status(200).json({
      success: true,
      closure: closureRecord,
      new_balance: newBalance,
      message: closureStatus === 'matched' 
        ? 'تم تقفيل الخزينة بنجاح، الرصيد متطابق تماماً.' 
        : `تم تقفيل الخزينة وإثبات الفرق (${difference < 0 ? 'عجز' : 'زيادة'}: ${Math.abs(difference)} ج.م).`
    });

  } catch (error: any) {
    logger.error('Error in closeVault:', error);
    return res.status(500).json({ success: false, error: 'فشل في عملية إغلاق الخزينة' });
  }
};

export const getVaultClosures = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const vaultId = req.query.vault_id as string;

  try {
    let closures: any[] = [];
    if (isFirebaseConnected() && firestore) {
      let query = firestore.collection('vault_closures').where('tenantId', '==', tenantId);
      if (vaultId) {
        query = query.where('vault_id', '==', vaultId);
      }
      const snap = await query.get();
      closures = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      closures = (db.vault_closures || []).filter((c: any) => c.tenantId === tenantId);
      if (vaultId) {
        closures = closures.filter((c: any) => c.vault_id === vaultId);
      }
    }

    closures.sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime());

    return res.json({
      success: true,
      data: closures
    });
  } catch (error: any) {
    logger.error('Error fetching vault closures:', error);
    return res.status(500).json({ success: false, error: 'فشل في جلب سجلات إغلاق الخزينة' });
  }
};

export const createContractSecurityVoucher = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const user = (req as any).user;
  const { vaultId, amount, contractName, clientName, expectedReturnDate, notes } = req.body;

  if (!vaultId || !amount || Number(amount) <= 0 || !contractName || !clientName) {
    return res.status(400).json({ success: false, error: 'يرجى إدخال جميع بيانات تأمين العقد المطلوبة بشكل صحيح (الخزينة، المبلغ، اسم العقد، اسم العميل)' });
  }

  try {
    const result = await TreasuryService.createContractSecurityVoucher(tenantId, user, {
      vaultId,
      amount: Number(amount),
      contractName,
      clientName,
      expectedReturnDate: expectedReturnDate || new Date().toISOString().split('T')[0],
      notes
    });

    return res.status(201).json({
      success: true,
      data: result.voucher,
      new_balance: result.new_balance,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Error creating contract security voucher:', error);
    return res.status(400).json({ success: false, error: error.message || 'فشل في إنشاء سند تأمين العقد' });
  }
};

export const TreasuryController = {
  getVaults,
  createVault,
  updateVault,
  toggleVaultStatus,
  deleteVault,
  getVouchers,
  createReceiptVoucher,
  createPaymentVoucher,
  createContractSecurityVoucher,
  getTransfers,
  requestTransfer,
  acceptTransfer,
  rejectTransfer,
  bankDeposit,
  bankWithdrawal,
  getTreasuryStats,
  closeVault,
  getVaultClosures
};

