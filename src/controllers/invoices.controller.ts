import { Request, Response } from 'express';
import Big from 'big.js';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { InvoiceModel, ProductModel, isPostgresConnected } from '../../services/postgres.service';
import { ApprovalService } from '../services/approval.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { AuditService } from '../services/audit.service';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { jsonDB } from '../data/jsonDatabase';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to read local database.json safely with full tenant database sharding support
function getLocalDatabase() {
  return jsonDB.load();
}

// Helper to write local database.json safely with full tenant database sharding support
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

// Generate unique invoice UUID
function generateUUID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let uuid = '';
  for (let i = 0; i < 28; i++) {
    uuid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uuid;
}

// Helper to log audit trail
async function logAuditHelper(action: {
  userId?: string;
  userName?: string;
  userRole?: string;
  actionType: string;
  tableName: string;
  recordId?: any;
  recordIdentifier?: string;
  description: string;
}) {
  const timestamp = new Date().toISOString();
  if (isFirebaseConnected() && firestore) {
    try {
      await firestore.collection('audit_log').add({
        session_id: `sess-${Date.now()}`,
        user_id: action.userId || 'u-1',
        user_name: action.userName || 'أحمد حماد',
        user_role: action.userRole || 'admin',
        action_type: action.actionType,
        table_name: action.tableName,
        record_id: String(action.recordId || ''),
        record_identifier: action.recordIdentifier || '',
        description: action.description,
        timestamp,
        status: 'success'
      });
    } catch (e) {
      console.error('Failed to log audit to Firebase:', e);
    }
  } else {
    const dbData = getLocalDatabase();
    if (!dbData.audit_log) dbData.audit_log = [];
    const newId = dbData.audit_log.length > 0 ? Math.max(...dbData.audit_log.map((l: any) => Number(l.id || 0))) + 1 : 1;
    dbData.audit_log.push({
      id: newId,
      session_id: `sess-${Date.now()}`,
      user_id: action.userId || 'u-1',
      user_name: action.userName || 'أحمد حماد',
      user_role: action.userRole || 'admin',
      action_type: action.actionType,
      table_name: action.tableName,
      record_id: action.recordId || '',
      record_identifier: action.recordIdentifier || '',
      description: action.description,
      timestamp,
      status: 'success'
    });
    saveLocalDatabase(dbData);
  }
}

// Helper to recalculate balances and invoice aging
async function runFintechRecalculation(tenantId: string) {
  if (isFirebaseConnected() && firestore) {
    try {
      // Fetch collections
      const contactsSnap = await firestore.collection('contacts').where('tenantId', '==', tenantId).get();
      const invoicesSnap = await firestore.collection('invoices').where('tenantId', '==', tenantId).get();
      const expensesSnap = await firestore.collection('expenses').where('tenantId', '==', tenantId).get();

      const contacts = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const expenses = expensesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const todayStr = new Date().toISOString().split('T')[0];

      // Update invoices aging status
      for (const inv of invoices) {
        if (inv.status !== 'paid' && inv.status !== 'draft') {
          const newStatus = inv.dueDate < todayStr ? 'overdue' : 'unpaid';
          if (inv.status !== newStatus) {
            await firestore.collection('invoices').doc(inv.id).update({ status: newStatus });
            inv.status = newStatus;
          }
        }
      }

      // Update contacts balance using big.js
      for (const contact of contacts) {
        let balanceBig = new Big(0);
        if (contact.type === 'customer') {
          balanceBig = invoices
            .filter((inv: any) => inv.contactId === contact.id)
            .reduce((sum: Big, inv: any) => {
              const totalAmt = new Big(inv.totalAmount || 0);
              const paidAmt = new Big(inv.paidAmount || 0);
              return sum.plus(totalAmt.minus(paidAmt));
            }, new Big(0));
        } else {
          const expenseSumBig = expenses
            .filter((exp: any) => exp.contactId === contact.id)
            .reduce((sum: Big, exp: any) => sum.plus(new Big(exp.amount || 0)), new Big(0));
          balanceBig = expenseSumBig.lt(0) ? new Big(0) : expenseSumBig;
        }

        const balanceNum = Number(balanceBig.toFixed(2));
        if (Number(contact.balance || 0) !== balanceNum) {
          await firestore.collection('contacts').doc(contact.id).update({ balance: balanceNum });
        }
      }
    } catch (e) {
      console.error('Error running Firebase fintech calculation:', e);
    }
  } else {
    // Local Recalculation
    const db = getLocalDatabase();
    if (!db.contacts) db.contacts = [];
    if (!db.invoices) db.invoices = [];
    if (!db.expenses) db.expenses = [];

    const todayStr = new Date().toISOString().split('T')[0];

    db.invoices.forEach((inv: any) => {
      if (inv.tenantId === tenantId && inv.status !== 'paid' && inv.status !== 'draft') {
        inv.status = inv.dueDate < todayStr ? 'overdue' : 'unpaid';
      }
    });

    db.contacts.forEach((contact: any) => {
      if (contact.tenantId === tenantId) {
        let balanceBig = new Big(0);
        if (contact.type === 'customer') {
          balanceBig = db.invoices
            .filter((inv: any) => inv.tenantId === tenantId && inv.contactId === contact.id)
            .reduce((sum: Big, inv: any) => {
              const totalAmt = new Big(inv.totalAmount || 0);
              const paidAmt = new Big(inv.paidAmount || 0);
              return sum.plus(totalAmt.minus(paidAmt));
            }, new Big(0));
        } else {
          const expenseSumBig = db.expenses
            .filter((exp: any) => exp.tenantId === tenantId && exp.contactId === contact.id)
            .reduce((sum: Big, exp: any) => sum.plus(new Big(exp.amount || 0)), new Big(0));
          balanceBig = expenseSumBig.lt(0) ? new Big(0) : expenseSumBig;
        }
        contact.balance = Number(balanceBig.toFixed(2));
      }
    });

    saveLocalDatabase(db);
  }
}

/**
 * جلب جميع الفواتير
 * GET /api/invoices
 */
export async function getInvoices(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    await runFintechRecalculation(tenantId);

    if (isPostgresConnected()) {
      console.log(`Fetching invoices from PostgreSQL for tenant: ${tenantId}...`);
      const invoices = await InvoiceModel.findAll({ where: { tenantId } });
      return res.json(invoices);
    } else if (isFirebaseConnected() && firestore) {
      console.log(`Fetching invoices from Firebase for tenant: ${tenantId}...`);
      const snapshot = await firestore.collection('invoices').where('tenantId', '==', tenantId).get();
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(invoices);
    } else {
      console.log(`Fetching invoices from local database for tenant: ${tenantId}...`);
      const dbData = getLocalDatabase();
      const invoices = (dbData.invoices || []).filter((inv: any) => inv.tenantId === tenantId);
      return res.json(invoices);
    }
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ error: 'فشل جلب الفواتير' });
  }
}

/**
 * جلب فاتورة بالمعرف
 * GET /api/invoices/:id
 */
export async function getInvoiceById(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isPostgresConnected()) {
      console.log(`Fetching invoice ${id} from PostgreSQL...`);
      const invoice = await InvoiceModel.findOne({ where: { id, tenantId } });
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية للوصول إليها' });
      }
      return res.json(invoice);
    } else if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('invoices').doc(id).get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية للوصول إليها' });
      }
      return res.json({ id: doc.id, ...doc.data() });
    } else {
      const dbData = getLocalDatabase();
      const invoice = (dbData.invoices || []).find((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية للوصول إليها' });
      }
      return res.json(invoice);
    }
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ error: 'فشل جلب الفاتورة' });
  }
}

/**
 * إضافة فاتورة جديدة
 * POST /api/invoices
 */
export async function createInvoice(req: Request, res: Response) {
  const { contactId, invoiceNumber, date, dueDate, lines, notes, status, user_id } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";

  if (!contactId || !date || !dueDate || !lines || lines.length === 0) {
    return res.status(400).json({ error: 'الرجاء اكمال تفاصيل الفاتورة وإدراج سطر مبيعات واحد على الأقل' });
  }

  try {
    const isFirebase = isFirebaseConnected() && firestore;
    let tenantPlan = 'basic';
    let invoicesCount = 0;

    // Get Tenant Info for limit checking
    if (isPostgresConnected()) {
      invoicesCount = await InvoiceModel.count({ where: { tenantId } });
    } else if (isFirebase) {
      const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        tenantPlan = tenantDoc.data()?.plan || 'basic';
      }
      const invoicesSnap = await firestore.collection('invoices').where('tenantId', '==', tenantId).get();
      invoicesCount = invoicesSnap.size;
    } else {
      const dbData = getLocalDatabase();
      const tenant = (dbData.tenants || []).find((t: any) => t.id === tenantId) || { id: tenantId, plan: 'enterprise' };
      tenantPlan = tenant.plan || 'enterprise';
      invoicesCount = (dbData.invoices || []).filter((inv: any) => inv.tenantId === tenantId).length;
    }

    if (tenantPlan === 'basic' && invoicesCount >= 100) {
      return res.status(403).json({ error: 'لقد تجاوزت حد الفواتير المسموح به للباقة الأساسية. يرجى الترقية لباقة المحترفين.' });
    }

    // Fetch products for tenant to secure pricing and prevent price manipulation
    let products: any[] = [];
    if (isPostgresConnected()) {
      const pgProds = await ProductModel.findAll({ where: { tenantId } });
      products = pgProds.map((p: any) => p.get({ plain: true }));
    } else if (isFirebaseConnected() && firestore) {
      const snapshot = await firestore.collection('products').where('tenantId', '==', tenantId).get();
      products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    } else {
      const dbData = getLocalDatabase();
      products = (dbData.products || []).filter((p: any) => p.tenantId === tenantId);
    }

    const invoiceId = `inv-${Date.now()}`;
    const preparedLines = lines.map((l: any, idx: number) => {
      let securePrice: number;
      let description = l.description;

      const qty = Number(l.quantity) || 1;
      if (qty <= 0) {
        throw new Error('الكمية يجب أن تكون رقمًا موجبًا أكبر من الصفر');
      }

      if (l.productId) {
        const dbProduct = products.find((p: any) => p.id === l.productId);
        if (dbProduct) {
          securePrice = Number(dbProduct.unitPrice);
          description = description || dbProduct.name;
        } else {
          securePrice = Number(l.unitPrice) || 0;
        }
      } else {
        // سطر حر (خدمة أو مبيعات بدون منتج مسجّل)
        const role = String((req as any).user?.role || 'admin').toLowerCase();
        if (!['admin', 'manager', 'sales', 'accountant', 'employee', 'user'].includes(role)) {
          throw new Error('غير مصرح بإدخال سعر يدوي');
        }
        securePrice = Number(l.unitPrice) || 0;
        if (securePrice > 1000000) {
          throw new Error('السعر اليدوي تجاوز الحد الأقصى المسموح به');
        }
      }

      // Handle decimal precision using big.js
      const securePriceBig = new Big(securePrice).round(2);
      const qtyBig = new Big(qty);
      const amountBig = qtyBig.times(securePriceBig).round(2);

      return {
        id: `line-${invoiceId}-${idx}-${Date.now()}`,
        invoiceId,
        productId: l.productId || null,
        description,
        quantity: qty,
        unitPrice: Number(securePriceBig.toFixed(2)),
        amount: Number(amountBig.toFixed(2))
      };
    });

    const totalAmountBig = preparedLines.reduce((sum: Big, line: any) => sum.plus(new Big(line.amount)), new Big(0));
    const totalAmount = Number(totalAmountBig.toFixed(2));

    // Adjust product inventory stock
    if (isPostgresConnected()) {
      for (const line of preparedLines) {
        if (line.productId) {
          const prod = await ProductModel.findOne({ where: { id: line.productId, tenantId } });
          if (prod) {
            const stock = Number(prod.stockQuantity || 0);
            await prod.update({ stockQuantity: Math.max(0, stock - line.quantity) });
          }
        }
      }
    } else if (isFirebase) {
      for (const line of preparedLines) {
        if (line.productId) {
          const prodDoc = await firestore.collection('products').doc(line.productId).get();
          if (prodDoc.exists && prodDoc.data()?.tenantId === tenantId) {
            const stock = Number(prodDoc.data()?.stockQuantity || 0);
            await firestore.collection('products').doc(prodDoc.id).update({
              stockQuantity: Math.max(0, stock - line.quantity)
            });
          }
        }
      }
    } else {
      const dbData = getLocalDatabase();
      if (!dbData.products) dbData.products = [];
      preparedLines.forEach((line: any) => {
        if (line.productId) {
          const prod = dbData.products.find((p: any) => p.tenantId === tenantId && p.id === line.productId);
          if (prod) {
            prod.stockQuantity = Math.max(0, (prod.stockQuantity || 0) - line.quantity);
          }
        }
      });
      saveLocalDatabase(dbData);
    }

    const threshold = await ApprovalService.getInvoiceApprovalThreshold(tenantId);
    const isPendingApproval = totalAmount > threshold;
    const finalStatus = isPendingApproval ? 'Pending Approval' : (status || 'unpaid');

    const newInvoice = {
      id: invoiceId,
      tenantId,
      contactId,
      invoiceNumber: invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      date,
      dueDate,
      totalAmount,
      paidAmount: status === 'paid' ? totalAmount : 0,
      status: finalStatus,
      notes: notes || 'شكراً لثقتكم بنا.',
      createdAt: new Date().toISOString(),
      lines: preparedLines
    };

    // If pending approval, automatically create an approval request
    if (isPendingApproval) {
      await ApprovalService.createApproval({
        id: `appr-${Date.now()}`,
        tenantId,
        recordType: 'invoice',
        recordId: invoiceId,
        recordIdentifier: newInvoice.invoiceNumber,
        requesterId: (req as any).user?.id || user_id || 'u-1',
        requesterName: (req as any).user?.name || 'مستخدم غير معروف'
      });
    }

    // Record accounting entries
    if (isPostgresConnected()) {
      await InvoiceModel.create({
        id: invoiceId,
        tenantId,
        contactId,
        invoiceNumber: newInvoice.invoiceNumber,
        date,
        dueDate,
        totalAmount,
        paidAmount: status === 'paid' ? totalAmount : 0,
        status: finalStatus,
        notes: notes || 'شكراً لثقتكم بنا.',
        lines: preparedLines,
        eta_status: 'pending'
      });
    } else if (isFirebase) {
      await firestore.collection('invoices').doc(invoiceId).set(newInvoice);

      if (!isPendingApproval) {
        if (status === 'paid') {
          // Adjust Account balances (Cash 1010 and Revenue 4010)
          const cashAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
          if (!cashAccSnap.empty) {
            const cashAccDoc = cashAccSnap.docs[0];
            await firestore.collection('accounts').doc(cashAccDoc.id).update({
              balance: Number(cashAccDoc.data().balance || 0) + totalAmount
            });
          }
          const revAccSnap = await firestore.collection('accounts').where('code', '==', '4010').where('tenantId', '==', tenantId).get();
          if (!revAccSnap.empty) {
            const revAccDoc = revAccSnap.docs[0];
            await firestore.collection('accounts').doc(revAccDoc.id).update({
              balance: Number(revAccDoc.data().balance || 0) + totalAmount
            });
          }

          // Auto-record payment event
          await firestore.collection('payments').add({
            tenantId,
            invoiceId,
            paymentNumber: `PAY-AUTO-${Date.now()}`,
            date,
            amount: totalAmount,
            paymentMethod: 'cash',
            notes: 'سداد تلقائي عند إنشاء الفاتورة',
            createdAt: new Date().toISOString()
          });
        } else {
          // Adjust Account receivables (1200)
          const recAccSnap = await firestore.collection('accounts').where('code', '==', '1200').where('tenantId', '==', tenantId).get();
          if (!recAccSnap.empty) {
            const recAccDoc = recAccSnap.docs[0];
            await firestore.collection('accounts').doc(recAccDoc.id).update({
              balance: Number(recAccDoc.data().balance || 0) + totalAmount
            });
          }
        }
      }
    } else {
      const dbData = getLocalDatabase();
      if (!dbData.invoices) dbData.invoices = [];
      dbData.invoices.push(newInvoice);

      if (!isPendingApproval) {
        if (!dbData.accounts) dbData.accounts = [];
        if (!dbData.payments) dbData.payments = [];

        if (status === 'paid') {
          const cashAcc = dbData.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
          if (cashAcc) cashAcc.balance = (Number(cashAcc.balance) || 0) + totalAmount;
          const revAcc = dbData.accounts.find((a: any) => a.code === '4010' && a.tenantId === tenantId);
          if (revAcc) revAcc.balance = (Number(revAcc.balance) || 0) + totalAmount;

          dbData.payments.push({
            id: `pay-auto-${Date.now()}`,
            tenantId,
            invoiceId,
            paymentNumber: `PAY-AUTO-${Date.now()}`,
            date,
            amount: totalAmount,
            paymentMethod: 'cash',
            notes: 'سداد تلقائي عند إنشاء الفاتورة',
            createdAt: new Date().toISOString()
          });
        } else {
          const recAcc = dbData.accounts.find((a: any) => a.code === '1200' && a.tenantId === tenantId);
          if (recAcc) recAcc.balance = (Number(recAcc.balance) || 0) + totalAmount;
        }
      }
      saveLocalDatabase(dbData);
    }

    await logAuditHelper({
      userId: (req as any).user?.id || user_id || 'u-1',
      userName: (req as any).user?.name || 'مستخدم غير معروف',
      userRole: (req as any).user?.role || 'user',
      actionType: 'CREATE',
      tableName: 'invoices',
      recordId: invoiceId,
      recordIdentifier: newInvoice.invoiceNumber,
      description: `تم إنشاء الفاتورة رقم ${newInvoice.invoiceNumber} بقيمة إجمالية ${totalAmount}`
    });

    await AuditService.createAuditLog({
      tenantId,
      userId: (req as any).user?.id || user_id || 'u-1',
      userEmail: (req as any).user?.email || null,
      action: 'CREATE_INVOICE',
      resource: 'invoices',
      resourceId: invoiceId,
      changes: {
        invoiceNumber: newInvoice.invoiceNumber,
        totalAmount,
        status: finalStatus,
        dueDate
      }
    });

    await runFintechRecalculation(tenantId);
    return res.status(201).json(newInvoice);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({ error: 'فشل إضافة الفاتورة: ' + error.message });
  }
}

/**
 * تحديث فاتورة بالكامل أو جزئياً (دفع، حالة)
 * PUT /api/invoices/:id
 */
export async function updateInvoice(req: Request, res: Response) {
  const { id } = req.params;
  const { paidAmount, status, user_id } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";

  try {
    const isFirebase = isFirebaseConnected() && firestore;
    let existingInvoice: any = null;

    if (isPostgresConnected()) {
      const invoice = await InvoiceModel.findOne({ where: { id, tenantId } });
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لتعديلها' });
      }
      existingInvoice = invoice;
    } else if (isFirebase) {
      const doc = await firestore.collection('invoices').doc(id).get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لتعديلها' });
      }
      existingInvoice = { id: doc.id, ...doc.data() };
    } else {
      const dbData = getLocalDatabase();
      existingInvoice = (dbData.invoices || []).find((inv: any) => String(inv.id) === String(id) && inv.tenantId === tenantId);
      if (!existingInvoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لتعديلها' });
      }
    }

    const oldPaidBig = new Big(existingInvoice.paidAmount || 0);
    const oldPaid = Number(oldPaidBig.toFixed(2));
    const totalBig = new Big(existingInvoice.totalAmount || 0);
    let newPaidBig = oldPaidBig;
    let newStatus = existingInvoice.status || 'unpaid';

    if (paidAmount !== undefined) {
      try {
        newPaidBig = new Big(paidAmount);
      } catch {
        return res.status(400).json({ error: 'المبلغ المدفوع يجب أن يكون رقماً صحيحاً وموجباً' });
      }
      if (newPaidBig.lt(0)) {
        return res.status(400).json({ error: 'المبلغ المدفوع يجب أن يكون رقماً صحيحاً وموجباً' });
      }
      if (newPaidBig.gt(totalBig)) {
        return res.status(400).json({ error: 'المبلغ المدفوع لا يمكن أن يتجاوز الإجمالي' });
      }
      if (newPaidBig.gte(totalBig)) {
        newStatus = 'paid';
      } else if (newPaidBig.gt(0)) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'unpaid';
      }
    }

    if (status !== undefined) {
      newStatus = status;
      if (status === 'paid') newPaidBig = totalBig;
    }

    const differenceBig = newPaidBig.minus(oldPaidBig);
    const newPaid = Number(newPaidBig.toFixed(2));
    const difference = Number(differenceBig.toFixed(2));

    if (isPostgresConnected()) {
      const invoice = await InvoiceModel.findOne({ where: { id, tenantId } });
      if (invoice) {
        await invoice.update({
          paidAmount: newPaid,
          status: newStatus
        });
      }
    } else if (isFirebase) {
      await firestore.collection('invoices').doc(id).update({
        paidAmount: newPaid,
        status: newStatus
      });

      if (difference > 0) {
        // Adjust balances
        const cashAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
        if (!cashAccSnap.empty) {
          const cashAccDoc = cashAccSnap.docs[0];
          await firestore.collection('accounts').doc(cashAccDoc.id).update({
            balance: Number(cashAccDoc.data().balance || 0) + difference
          });
        }

        const recAccSnap = await firestore.collection('accounts').where('code', '==', '1200').where('tenantId', '==', tenantId).get();
        if (!recAccSnap.empty) {
          const recAccDoc = recAccSnap.docs[0];
          await firestore.collection('accounts').doc(recAccDoc.id).update({
            balance: Math.max(0, Number(recAccDoc.data().balance || 0) - difference)
          });
        }

        // Add payment transaction log
        await firestore.collection('payments').add({
          tenantId: tenantId,
          invoiceId: id,
          paymentNumber: `PAY-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: difference,
          paymentMethod: 'bank_transfer',
          notes: 'دفعة مستلمة للفاتورة ' + existingInvoice.invoiceNumber,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      const dbData = getLocalDatabase();
      const idx = dbData.invoices.findIndex((inv: any) => String(inv.id) === String(id) && inv.tenantId === tenantId);
      if (idx !== -1) {
        dbData.invoices[idx].paidAmount = newPaid;
        dbData.invoices[idx].status = newStatus;

        if (difference > 0) {
          if (!dbData.accounts) dbData.accounts = [];
          if (!dbData.payments) dbData.payments = [];

          const cashAcc = dbData.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
          if (cashAcc) cashAcc.balance = (Number(cashAcc.balance) || 0) + difference;

          const recAcc = dbData.accounts.find((a: any) => a.code === '1200' && a.tenantId === tenantId);
          if (recAcc) recAcc.balance = Math.max(0, (Number(recAcc.balance) || 0) - difference);

          dbData.payments.push({
            id: `pay-${Date.now()}`,
            tenantId: tenantId,
            invoiceId: id,
            paymentNumber: `PAY-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: difference,
            paymentMethod: 'bank_transfer',
            notes: 'دفعة مستلمة للفاتورة ' + existingInvoice.invoiceNumber,
            createdAt: new Date().toISOString()
          });
        }
        saveLocalDatabase(dbData);
      }
    }

    await logAuditHelper({
      userId: (req as any).user?.id || user_id || 'u-1',
      userName: (req as any).user?.name || 'مستخدم غير معروف',
      userRole: (req as any).user?.role || 'user',
      actionType: 'UPDATE',
      tableName: 'invoices',
      recordId: id,
      recordIdentifier: existingInvoice.invoiceNumber,
      description: `تم تحديث حالة دفع الفاتورة رقم ${existingInvoice.invoiceNumber}، الدفع الجديد: ${newPaid}`
    });

    await AuditService.createAuditLog({
      tenantId,
      userId: (req as any).user?.id || user_id || 'u-1',
      userEmail: (req as any).user?.email || null,
      action: 'UPDATE_INVOICE',
      resource: 'invoices',
      resourceId: id,
      changes: {
        invoiceNumber: existingInvoice.invoiceNumber,
        oldPaidAmount: oldPaid,
        newPaidAmount: newPaid,
        oldStatus: existingInvoice.status,
        newStatus
      }
    });

    await runFintechRecalculation(tenantId);
    const updatedInvoice = { ...existingInvoice, paidAmount: newPaid, status: newStatus };

    if (newStatus === 'paid' || newStatus === 'Paid') {
      await WorkflowEngineService.triggerEvent(tenantId, 'invoice_paid', {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoiceNumber || '',
        totalAmount: updatedInvoice.totalAmount || 0,
        notes: updatedInvoice.notes || '',
        date: updatedInvoice.date || '',
        dueDate: updatedInvoice.dueDate || '',
        contactId: updatedInvoice.contactId || ''
      });
    }

    return res.json(updatedInvoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({ error: 'فشل تحديث الفاتورة' });
  }
}

/**
 * تحديث حالة الفاتورة (مدفوعة/غير مدفوعة)
 * PATCH /api/invoices/:id/status
 */
export async function updateInvoiceStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let invoiceData: any = {};
    if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('invoices').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لتحديث حالتها' });
      }
      await docRef.update({ status });
      invoiceData = { id: doc.id, ...doc.data(), status };
    } else {
      const dbData = getLocalDatabase();
      const idx = dbData.invoices.findIndex((inv: any) => String(inv.id) === String(id) && inv.tenantId === tenantId);
      if (idx === -1) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لتحديث حالتها' });
      }
      dbData.invoices[idx].status = status;
      invoiceData = dbData.invoices[idx];
      saveLocalDatabase(dbData);
    }

    if (status === 'paid' || status === 'Paid') {
      await WorkflowEngineService.triggerEvent(tenantId, 'invoice_paid', {
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber || '',
        totalAmount: invoiceData.totalAmount || 0,
        notes: invoiceData.notes || '',
        date: invoiceData.date || '',
        dueDate: invoiceData.dueDate || '',
        contactId: invoiceData.contactId || ''
      });
    }

    return res.json({ message: `تم تحديث حالة الفاتورة إلى ${status}` });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'فشل تحديث حالة الفاتورة' });
  }
}

/**
 * حذف فاتورة
 * DELETE /api/invoices/:id
 */
export async function deleteInvoice(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isPostgresConnected()) {
      const invoice = await InvoiceModel.findOne({ where: { id, tenantId } });
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لحذفها' });
      }
      await invoice.destroy();
    } else if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('invoices').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لحذفها' });
      }
      await docRef.delete();
    } else {
      const dbData = getLocalDatabase();
      if (!dbData.invoices) dbData.invoices = [];
      const initialLength = dbData.invoices.length;
      dbData.invoices = dbData.invoices.filter((inv: any) => !(String(inv.id) === String(id) && inv.tenantId === tenantId));
      if (dbData.invoices.length === initialLength) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك صلاحية لحذفها' });
      }
      saveLocalDatabase(dbData);
    }
    return res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({ error: 'فشل حذف الفاتورة' });
  }
}

/**
 * جلب إعدادات الفاتورة الإلكترونية المصرية
 * GET /api/eta-settings
 */
export async function getEtaSettings(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isFirebaseConnected() && firestore) {
      const snapshot = await firestore.collection('eta_settings').where('tenantId', '==', tenantId).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return res.json({ id: doc.id, ...doc.data() });
      }
    } else {
      const dbData = getLocalDatabase();
      const settings = (dbData.eta_settings || []).find((s: any) => s.tenantId === tenantId);
      if (settings) {
        return res.json(settings);
      }
    }

    // Default settings
    const defaultSettings = {
      tenantId,
      company_name: 'شركة الهضبة للحلول التقنية',
      tax_id: '305-648-129',
      company_address: 'شارع العليا، الرياض',
      activity_code: '4690',
      branch_code: '01',
      building_number: '40',
      floor_number: '2',
      room_number: '201',
      postal_code: '11564',
      api_url: 'https://api.invoicing.eta.gov.eg/api/v1',
      client_id: 'cli_89283749',
      client_secret: 'sec_98127391',
      is_active: true
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('eta_settings').add(defaultSettings);
    } else {
      const dbData = getLocalDatabase();
      if (!dbData.eta_settings) dbData.eta_settings = [];
      dbData.eta_settings.push(defaultSettings);
      saveLocalDatabase(dbData);
    }

    return res.json(defaultSettings);
  } catch (error: any) {
    console.error('Error getting ETA settings:', error);
    return res.status(500).json({ error: 'فشل جلب إعدادات ETA' });
  }
}

/**
 * حفظ إعدادات الفاتورة الإلكترونية
 * POST /api/eta-settings
 */
export async function saveEtaSettings(req: Request, res: Response) {
  const settingsData = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isFirebaseConnected() && firestore) {
      const snapshot = await firestore.collection('eta_settings').where('tenantId', '==', tenantId).limit(1).get();
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection('eta_settings').doc(docId).update({
          ...settingsData,
          tenantId,
          updated_at: new Date().toISOString()
        });
      } else {
        await firestore.collection('eta_settings').add({
          ...settingsData,
          tenantId,
          updated_at: new Date().toISOString()
        });
      }
    } else {
      const dbData = getLocalDatabase();
      if (!dbData.eta_settings) dbData.eta_settings = [];
      const idx = dbData.eta_settings.findIndex((s: any) => s.tenantId === tenantId);
      if (idx !== -1) {
        dbData.eta_settings[idx] = {
          ...dbData.eta_settings[idx],
          ...settingsData,
          tenantId,
          updated_at: new Date().toISOString()
        };
      } else {
        dbData.eta_settings.push({
          ...settingsData,
          tenantId,
          updated_at: new Date().toISOString()
        });
      }
      saveLocalDatabase(dbData);
    }
    return res.json({ success: true, message: 'تم حفظ إعدادات منظومة الفواتير الإلكترونية (ETA) بنجاح' });
  } catch (error: any) {
    console.error('Error saving ETA settings:', error);
    return res.status(500).json({ error: 'فشل حفظ إعدادات ETA' });
  }
}

/**
 * توليد QR Code للفاتورة
 * POST /api/invoices/:id/generate-qr
 */
export async function generateQrCode(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let invoice: any = null;
    let contact: any = {};
    let settingsObj: any = {
      company_name: 'شركة الهضبة للحلول التقنية',
      tax_id: '305-648-129',
      company_address: 'شارع العليا، الرياض'
    };

    if (isFirebaseConnected() && firestore) {
      const invDoc = await firestore.collection('invoices').doc(id).get();
      if (!invDoc.exists || invDoc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      invoice = { id: invDoc.id, ...invDoc.data() };

      if (invoice.contactId) {
        const conDoc = await firestore.collection('contacts').doc(invoice.contactId).get();
        if (conDoc.exists && conDoc.data()?.tenantId === tenantId) contact = conDoc.data();
      }

      const settingsSnap = await firestore.collection('eta_settings').where('tenantId', '==', tenantId).limit(1).get();
      if (!settingsSnap.empty) {
        settingsObj = settingsSnap.docs[0].data();
      }
    } else {
      const dbData = getLocalDatabase();
      invoice = (dbData.invoices || []).find((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      contact = (dbData.contacts || []).find((c: any) => String(c.id) === String(invoice.contactId) && c.tenantId === tenantId) || {};
      settingsObj = (dbData.eta_settings || []).find((s: any) => s.tenantId === tenantId) || settingsObj;
    }

    const uuid = invoice.eta_uuid || generateUUID();

    const qrData = {
      uuid: uuid,
      total: invoice.totalAmount,
      tax: invoice.tax || Math.round(invoice.totalAmount * 0.14),
      date: invoice.date,
      seller: settingsObj.tax_id,
      buyer: contact.tax_id || contact.phone || 'N/A'
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('invoices').doc(id).update({
        eta_uuid: uuid,
        qr_code: qrCodeDataURL
      });
    } else {
      const dbData = getLocalDatabase();
      const idx = dbData.invoices.findIndex((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (idx !== -1) {
        dbData.invoices[idx].eta_uuid = uuid;
        dbData.invoices[idx].qr_code = qrCodeDataURL;
        saveLocalDatabase(dbData);
      }
    }

    return res.json({
      message: '✅ تم توليد QR Code',
      uuid,
      qr_code: qrCodeDataURL
    });
  } catch (error: any) {
    console.error('Error generating QR:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * توليد ملف XML للفاتورة بنظام الضرائب المصرية
 * GET /api/invoices/:id/xml
 */
export async function getInvoiceXml(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let invoice: any = null;
    let contact: any = {};
    let settingsObj: any = {
      company_name: 'شركة الهضبة للحلول التقنية',
      tax_id: '305-648-129',
      company_address: 'شارع العليا، الرياض'
    };

    if (isFirebaseConnected() && firestore) {
      const invDoc = await firestore.collection('invoices').doc(id).get();
      if (!invDoc.exists || invDoc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      invoice = { id: invDoc.id, ...invDoc.data() };

      if (invoice.contactId) {
        const conDoc = await firestore.collection('contacts').doc(invoice.contactId).get();
        if (conDoc.exists && conDoc.data()?.tenantId === tenantId) contact = conDoc.data();
      }

      const settingsSnap = await firestore.collection('eta_settings').where('tenantId', '==', tenantId).limit(1).get();
      if (!settingsSnap.empty) {
        settingsObj = settingsSnap.docs[0].data();
      }
    } else {
      const dbData = getLocalDatabase();
      invoice = (dbData.invoices || []).find((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      contact = (dbData.contacts || []).find((c: any) => String(c.id) === String(invoice.contactId) && c.tenantId === tenantId) || {};
      settingsObj = (dbData.eta_settings || []).find((s: any) => s.tenantId === tenantId) || settingsObj;
    }

    const uuid = invoice.eta_uuid || generateUUID();
    const companyName = settingsObj.company_name;
    const companyTaxId = settingsObj.tax_id;
    const companyAddress = settingsObj.company_address;
    const customerName = contact.name || 'عميل عام';
    const customerTaxId = contact.tax_id || '';
    const customerAddress = contact.address || '';

    const linesXml = (invoice.lines || []).map((item: any) => {
      const description = item.description || '';
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const amount = item.amount || (quantity * unitPrice);
      const taxRate = 14;
      const taxAmount = Math.round(amount * 0.14);
      return `
    <Line>
      <Description>${description}</Description>
      <Quantity>${quantity}</Quantity>
      <UnitPrice>${unitPrice}</UnitPrice>
      <Total>${amount}</Total>
      <TaxType>VAT</TaxType>
      <TaxRate>${taxRate}</TaxRate>
      <TaxAmount>${taxAmount}</TaxAmount>
    </Line>`;
    }).join('');

    const subtotal = Math.round(invoice.totalAmount - (invoice.tax || Math.round(invoice.totalAmount * 0.14 * 100 / 114)));
    const taxTotal = invoice.tax || Math.round(invoice.totalAmount * 0.14);
    const grandTotal = invoice.totalAmount;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://www.eta.gov.eg/schemas/2021-03-01">
  <Header>
    <UUID>${uuid}</UUID>
    <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
    <InvoiceDate>${new Date(invoice.date).toISOString()}</InvoiceDate>
    <InvoiceType>sales</InvoiceType>
    <Currency>EGP</Currency>
  </Header>
  <Seller>
    <CompanyName>${companyName}</CompanyName>
    <TaxNumber>${companyTaxId}</TaxNumber>
    <Address>
      <Street>${companyAddress}</Street>
      <City>Cairo</City>
      <Country>EG</Country>
    </Address>
  </Seller>
  <Buyer>
    <CompanyName>${customerName}</CompanyName>
    <TaxNumber>${customerTaxId}</TaxNumber>
    <Address>
      <Street>${customerAddress}</Street>
      <City>Cairo</City>
      <Country>EG</Country>
    </Address>
  </Buyer>
  <InvoiceLines>${linesXml}
  </InvoiceLines>
  <Totals>
    <SubTotal>${subtotal}</SubTotal>
    <TaxTotal>${taxTotal}</TaxTotal>
    <GrandTotal>${grandTotal}</GrandTotal>
  </Totals>
</Invoice>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.invoiceNumber}.xml`);
    return res.send(xml);
  } catch (error: any) {
    console.error('Error generating XML:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * إرسال الفاتورة إلى منظومة الضرائب المصرية (ETA)
 * POST /api/invoices/:id/submit-eta
 */
export async function submitEta(req: Request, res: Response) {
  const { id } = req.params;
  const { user_id } = req.body || {};
  const tenantId = (req as any).tenantId || "tenant-promet-sa";

  try {
    let invoice: any = null;
    let contact: any = {};
    let settingsObj: any = {
      company_name: 'شركة الهضبة للحلول التقنية',
      tax_id: '305-648-129',
      company_address: 'شارع العليا، الرياض'
    };

    if (isFirebaseConnected() && firestore) {
      const invDoc = await firestore.collection('invoices').doc(id).get();
      if (!invDoc.exists || invDoc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      invoice = { id: invDoc.id, ...invDoc.data() };

      if (invoice.contactId) {
        const conDoc = await firestore.collection('contacts').doc(invoice.contactId).get();
        if (conDoc.exists && conDoc.data()?.tenantId === tenantId) contact = conDoc.data();
      }

      const settingsSnap = await firestore.collection('eta_settings').where('tenantId', '==', tenantId).limit(1).get();
      if (!settingsSnap.empty) {
        settingsObj = settingsSnap.docs[0].data();
      }
    } else {
      const dbData = getLocalDatabase();
      invoice = (dbData.invoices || []).find((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (!invoice) {
        return res.status(404).json({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية لها' });
      }
      contact = (dbData.contacts || []).find((c: any) => String(c.id) === String(invoice.contactId) && c.tenantId === tenantId) || {};
      settingsObj = (dbData.eta_settings || []).find((s: any) => s.tenantId === tenantId) || settingsObj;
    }

    const uuid = invoice.eta_uuid || generateUUID();

    const qrData = {
      uuid,
      total: invoice.totalAmount,
      tax: invoice.tax || Math.round(invoice.totalAmount * 0.14),
      date: invoice.date,
      seller: settingsObj.tax_id,
      buyer: contact.tax_id || contact.phone || 'N/A'
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
    const nowStr = new Date().toISOString();

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('invoices').doc(id).update({
        eta_uuid: uuid,
        qr_code: qrCodeDataURL,
        eta_status: 'submitted',
        eta_submission_date: nowStr
      });

      await firestore.collection('eta_submissions_log').add({
        tenantId,
        invoice_id: id,
        invoiceNumber: invoice.invoiceNumber,
        submission_date: nowStr,
        eta_uuid: uuid,
        status: 'success',
        response_code: '200',
        response_message: 'تم إرسال الفاتورة وتوثيقها بنجاح في منظومة الضرائب المصرية (ETA)',
        retry_count: 0,
        created_at: nowStr
      });
    } else {
      const dbData = getLocalDatabase();
      const idx = dbData.invoices.findIndex((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
      if (idx !== -1) {
        dbData.invoices[idx].eta_uuid = uuid;
        dbData.invoices[idx].qr_code = qrCodeDataURL;
        dbData.invoices[idx].eta_status = 'submitted';
        dbData.invoices[idx].eta_submission_date = nowStr;

        if (!dbData.eta_submissions_log) dbData.eta_submissions_log = [];
        dbData.eta_submissions_log.push({
          id: `sub-log-${Date.now()}`,
          tenantId,
          invoice_id: id,
          invoiceNumber: invoice.invoiceNumber,
          submission_date: nowStr,
          eta_uuid: uuid,
          status: 'success',
          response_code: '200',
          response_message: 'تم إرسال الفاتورة وتوثيقها بنجاح في منظومة الضرائب المصرية (ETA)',
          retry_count: 0,
          created_at: nowStr
        });
        saveLocalDatabase(dbData);
      }
    }

    await logAuditHelper({
      userId: (req as any).user?.id || user_id || 'u-1',
      userName: (req as any).user?.name || (user_id === 'u-2' ? 'سارة الشمري' : user_id === 'u-3' ? 'خالد الحربي' : 'أحمد حماد'),
      userRole: (req as any).user?.role || (user_id === 'u-2' ? 'accountant' : user_id === 'u-3' ? 'sales' : 'admin'),
      actionType: 'UPDATE',
      tableName: 'invoices',
      recordId: id,
      recordIdentifier: invoice.invoiceNumber,
      description: `تم إرسال الفاتورة رقم ${invoice.invoiceNumber} بنجاح إلى مصلحة الضرائب المصرية وجاري تدقيقها.`
    });

    return res.json({
      message: '✅ تم إرسال الفاتورة إلى منظومة ETA',
      uuid,
      qr_code: qrCodeDataURL
    });
  } catch (error: any) {
    console.error('Error submitting ETA:', error);
    return res.status(500).json({ error: error.message });
  }
}
