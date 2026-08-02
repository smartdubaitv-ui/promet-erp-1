import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { jsonDB } from '../data/jsonDatabase';
import { Approval } from '../types';
import { logger } from '../config/logger';
import { isPostgresConnected, InvoiceModel, PayrollModel } from '../../services/postgres.service';

export class ApprovalService {
  /**
   * إنشاء طلب اعتماد جديد
   */
  static async createApproval(approval: Omit<Approval, 'createdAt' | 'status'>): Promise<Approval> {
    const newApproval: Approval = {
      ...approval,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('approvals').doc(newApproval.id).set(newApproval);
    } else {
      const db = jsonDB.load();
      if (!db.approvals) db.approvals = [];
      db.approvals.push(newApproval);
      jsonDB.save(db);
    }

    logger.info(`📝 Approval request created for ${newApproval.recordType} ID: ${newApproval.recordId}`);
    return newApproval;
  }

  /**
   * جلب حد الموافقة على الفواتير من إعدادات الشركة
   */
  static async getInvoiceApprovalThreshold(tenantId: string): Promise<number> {
    let threshold = 50000; // default value

    if (isFirebaseConnected() && firestore) {
      try {
        const snap = await firestore.collection('company_settings').where('tenantId', '==', tenantId).get();
        if (!snap.empty) {
          const docData = snap.docs[0].data();
          if (docData && docData.invoiceApprovalThreshold !== undefined && docData.invoiceApprovalThreshold !== null) {
            threshold = Number(docData.invoiceApprovalThreshold);
          }
        }
      } catch (err) {
        logger.error(`Error fetching invoiceApprovalThreshold from Firestore for tenant ${tenantId}:`, err);
      }
    } else {
      try {
        const db = jsonDB.load();
        const settings = (db.company_settings_by_tenant && db.company_settings_by_tenant[tenantId]) || db.company_settings || {};
        if (settings.invoiceApprovalThreshold !== undefined && settings.invoiceApprovalThreshold !== null) {
          threshold = Number(settings.invoiceApprovalThreshold);
        }
      } catch (err) {
        logger.error(`Error reading invoiceApprovalThreshold from local DB for tenant ${tenantId}:`, err);
      }
    }

    return isNaN(threshold) ? 50000 : threshold;
  }

  /**
   * جلب جميع طلبات الاعتماد لشركة معينة مع فلتر اختياري للحالة
   */
  static async getApprovals(tenantId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<Approval[]> {
    if (isFirebaseConnected() && firestore) {
      let query = firestore.collection('approvals').where('tenantId', '==', tenantId);
      if (status) {
        query = query.where('status', '==', status);
      }
      const snap = await query.get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Approval));
    } else {
      const db = jsonDB.load();
      let list = (db.approvals || []).filter((appr: any) => appr.tenantId === tenantId);
      if (status) {
        list = list.filter((appr: any) => appr.status === status);
      }
      return list;
    }
  }

  /**
   * جلب طلب اعتماد محدد بالمعرف
   */
  static async getApprovalById(id: string): Promise<Approval | null> {
    if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('approvals').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as Approval;
    } else {
      const db = jsonDB.load();
      const appr = (db.approvals || []).find((a: any) => a.id === id);
      return appr || null;
    }
  }

  /**
   * الموافقة على طلب الاعتماد وتحديث حالة المستند المرتبط به
   */
  static async approveRecord(
    id: string,
    approverId: string,
    approverName: string,
    comments?: string
  ): Promise<Approval | null> {
    const approval = await this.getApprovalById(id);
    if (!approval) return null;

    const updatedApproval: Approval = {
      ...approval,
      status: 'approved',
      approverId,
      approverName,
      comments,
      updatedAt: new Date().toISOString()
    };

    // 1. تحديث طلب الاعتماد نفسه
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('approvals').doc(id).set(updatedApproval);
    } else {
      const db = jsonDB.load();
      const index = (db.approvals || []).findIndex((a: any) => a.id === id);
      if (index !== -1) {
        db.approvals[index] = updatedApproval;
        jsonDB.save(db);
      }
    }

    // 2. تحديث حالة المستند المرتبط (مثال: فاتورة أو راتب أو أمر شراء)
    await this.updateLinkedRecordStatus(approval.recordType, approval.recordId, 'approved', approval.tenantId);

    logger.info(`✅ Approval request APPROVED: ${approval.recordType} ID: ${approval.recordId} by ${approverName}`);
    return updatedApproval;
  }

  /**
   * رفض طلب الاعتماد وتحديث حالة المستند المرتبط به
   */
  static async rejectRecord(
    id: string,
    approverId: string,
    approverName: string,
    comments?: string
  ): Promise<Approval | null> {
    const approval = await this.getApprovalById(id);
    if (!approval) return null;

    const updatedApproval: Approval = {
      ...approval,
      status: 'rejected',
      approverId,
      approverName,
      comments,
      updatedAt: new Date().toISOString()
    };

    // 1. تحديث طلب الاعتماد نفسه
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('approvals').doc(id).set(updatedApproval);
    } else {
      const db = jsonDB.load();
      const index = (db.approvals || []).findIndex((a: any) => a.id === id);
      if (index !== -1) {
        db.approvals[index] = updatedApproval;
        jsonDB.save(db);
      }
    }

    // 2. تحديث حالة المستند المرتبط
    await this.updateLinkedRecordStatus(approval.recordType, approval.recordId, 'rejected', approval.tenantId);

    logger.info(`❌ Approval request REJECTED: ${approval.recordType} ID: ${approval.recordId} by ${approverName}`);
    return updatedApproval;
  }

  /**
   * تحديث حالة المستند المرتبط (فاتورة، أمر شراء، رواتب، إلخ)
   */
  private static async updateLinkedRecordStatus(
    recordType: 'invoice' | 'expense' | 'payroll' | 'purchase_order',
    recordId: string,
    status: 'approved' | 'rejected',
    tenantId: string
  ): Promise<void> {
    const targetStatus = status === 'approved' ? 'approved' : 'draft'; // أو حالة مخصصة حسب المستند

    if (recordType === 'invoice') {
      // الفواتير: تحديث الحالة
      if (isPostgresConnected()) {
        const invoice = await InvoiceModel.findOne({ where: { id: recordId, tenantId } });
        if (invoice) {
          const totalAmount = Number(invoice.totalAmount || 0);
          await invoice.update({
            status: status === 'approved' ? 'unpaid' : 'draft'
          });
          
          if (status === 'approved') {
            const { AccountModel } = require('../../services/postgres.service');
            const recAcc = await AccountModel.findOne({ where: { code: '1200', tenantId } });
            if (recAcc) {
              await recAcc.update({
                balance: Number(recAcc.balance || 0) + totalAmount
              });
            }
          }
        }
      } else if (isFirebaseConnected() && firestore) {
        const invDoc = await firestore.collection('invoices').doc(recordId).get();
        const totalAmount = invDoc.exists ? Number(invDoc.data()?.totalAmount || 0) : 0;

        await firestore.collection('invoices').doc(recordId).update({
          status: status === 'approved' ? 'unpaid' : 'draft' // إذا اعتُمدت تصبح unpaid وجاهزة للتحصيل، وإذا رُفضت ترجع draft
        });

        if (status === 'approved') {
          const recAccSnap = await firestore.collection('accounts').where('code', '==', '1200').where('tenantId', '==', tenantId).get();
          if (!recAccSnap.empty) {
            const recAccDoc = recAccSnap.docs[0];
            await firestore.collection('accounts').doc(recAccDoc.id).update({
              balance: Number(recAccDoc.data().balance || 0) + totalAmount
            });
          }
        }
      } else {
        const db = jsonDB.load();
        const index = (db.invoices || []).findIndex((i: any) => i.id === recordId);
        if (index !== -1) {
          db.invoices[index].status = status === 'approved' ? 'unpaid' : 'draft';
          
          if (status === 'approved') {
            const totalAmount = Number(db.invoices[index].totalAmount || 0);
            if (!db.accounts) db.accounts = [];
            const recAcc = db.accounts.find((a: any) => a.code === '1200' && a.tenantId === tenantId);
            if (recAcc) recAcc.balance = (Number(recAcc.balance) || 0) + totalAmount;
          }
          
          jsonDB.save(db);
        }
      }
    } else if (recordType === 'payroll') {
      // كشف الرواتب
      if (isPostgresConnected()) {
        await PayrollModel.update(
          { status: status === 'approved' ? 'approved' : 'draft' },
          { where: { id: recordId, tenantId } }
        );
      } else if (isFirebaseConnected() && firestore) {
        await firestore.collection('payroll').doc(recordId).update({
          status: status === 'approved' ? 'approved' : 'draft'
        });
      } else {
        const db = jsonDB.load();
        const index = (db.payroll || []).findIndex((p: any) => p.id === recordId);
        if (index !== -1) {
          db.payroll[index].status = status === 'approved' ? 'approved' : 'draft';
          jsonDB.save(db);
        }
      }
    } else if (recordType === 'purchase_order') {
      // طلبات الشراء
      if (isFirebaseConnected() && firestore) {
        await firestore.collection('purchase_orders').doc(recordId).update({
          status: status === 'approved' ? 'approved' : 'draft'
        });
      } else {
        const db = jsonDB.load();
        const index = (db.purchase_orders || []).findIndex((p: any) => p.id === recordId);
        if (index !== -1) {
          db.purchase_orders[index].status = status === 'approved' ? 'approved' : 'draft';
          jsonDB.save(db);
        }
      }
    }
  }
}
