import { jsonDB } from '../data/jsonDatabase';
import { isFirebaseConnected, firestore } from '../../services/firebase.service';
import { AuditService } from './audit.service';
import { logger } from '../config/logger';

function getLocalDatabase() {
  return jsonDB.load();
}

function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

export class TreasuryService {
  /**
   * Create standard or contract security payment voucher
   */
  static async createPaymentVoucher(tenantId: string, user: any, voucherData: {
    vault_id: string;
    amount: number;
    date?: string;
    type?: string;
    notes?: string;
    contact_id?: string;
    contact_name?: string;
    contract_name?: string;
    client_name?: string;
    expected_return_date?: string;
  }) {
    const { vault_id, amount, date, type = 'operational_expense', notes, contact_id, contact_name, contract_name, client_name, expected_return_date } = voucherData;

    if (!vault_id || !amount || Number(amount) <= 0) {
      throw new Error('يرجى تحديد الخزينة ومبلغ صرف صحيح أكبر من صفر');
    }

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
      throw new Error('الخزينة المحددة غير موجودة');
    }

    if (!vault.is_active) {
      throw new Error('الخزينة المحددة معطلة حالياً ولا يمكن الصرف منها');
    }

    const paymentAmount = Number(amount);
    const currentBal = Number(vault.current_balance || 0);

    if (paymentAmount > currentBal) {
      throw new Error(`رصيد الخزينة الحالي (${currentBal.toLocaleString()} ج.م) لا يكفي لتغطية مبلغ الصرف المطلوب (${paymentAmount.toLocaleString()} ج.م)`);
    }

    const newBalance = currentBal - paymentAmount;
    const voucherNumber = `PV-${Date.now().toString().slice(-6)}`;
    
    const isContractSecurity = type === 'contract_security';

    const voucher = {
      id: `vchr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      voucher_number: voucherNumber,
      tenantId,
      vault_id,
      vault_name: vault.name,
      voucher_type: 'payment',
      category_type: type,
      amount: paymentAmount,
      date: date || new Date().toISOString().split('T')[0],
      notes: notes || (isContractSecurity ? `تأمين عقد / ضمان تنفيذ: ${contract_name || ''}` : 'سند صرف - الخزينة'),
      contact_id: contact_id || null,
      contact_name: contact_name || null,
      contract_name: contract_name || null,
      client_name: client_name || null,
      expected_return_date: expected_return_date || null,
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

      // If contract security, record in current assets "Security Deposits" (Account code 1010)
      if (isContractSecurity) {
        await firestore.collection('security_deposits').doc(voucher.id).set({
          id: voucher.id,
          tenantId,
          contract_name: contract_name,
          client_name: client_name,
          amount: paymentAmount,
          account_code: '1010',
          account_name: 'ودائع تأمينية لدى الغير (Security Deposits)',
          expected_return_date: expected_return_date,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      const db = getLocalDatabase();
      const vIdx = (db.vaults || []).findIndex((v: any) => v.id === vault_id && v.tenantId === tenantId);
      if (vIdx !== -1) {
        db.vaults[vIdx].current_balance = newBalance;
        db.vaults[vIdx].updatedAt = new Date().toISOString();
      }
      if (!db.vault_vouchers) db.vault_vouchers = [];
      db.vault_vouchers.push(voucher);

      if (isContractSecurity) {
        if (!db.security_deposits) db.security_deposits = [];
        db.security_deposits.push({
          id: voucher.id,
          tenantId,
          contract_name,
          client_name,
          amount: paymentAmount,
          account_code: '1010',
          account_name: 'ودائع تأمينية لدى الغير (Security Deposits)',
          expected_return_date,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      saveLocalDatabase(db);
    }

    await AuditService.createAuditLog({
      tenantId,
      userId: user?.id,
      userEmail: user?.email,
      action: isContractSecurity ? 'CREATE_CONTRACT_SECURITY_VOUCHER' : 'CREATE_PAYMENT_VOUCHER',
      resource: 'VaultVouchers',
      resourceId: voucher.id,
      changes: { vault_id, amount: paymentAmount, newBalance, voucherNumber, type, isContractSecurity }
    });

    return {
      voucher,
      new_balance: newBalance,
      message: isContractSecurity 
        ? 'تم صرف تأمين العقد بنجاح وتسجيله في أصول ودائع تأمينية لدى الغير (كود 1010) دون احتساب كمصروف تشغيلي' 
        : 'تم تسجيل سند الصرف وخصم المبلغ من رصيد الخزينة بنجاح'
    };
  }

  /**
   * Dedicated method for contract security vouchers
   */
  static async createContractSecurityVoucher(tenantId: string, user: any, data: {
    vaultId: string;
    amount: number;
    contractName: string;
    clientName: string;
    expectedReturnDate: string;
    notes?: string;
  }) {
    return this.createPaymentVoucher(tenantId, user, {
      vault_id: data.vaultId,
      amount: data.amount,
      type: 'contract_security',
      contract_name: data.contractName,
      client_name: data.clientName,
      expected_return_date: data.expectedReturnDate,
      notes: data.notes || `تأمين عقد / ضمان تنفيذ: ${data.contractName} للعميل ${data.clientName}`
    });
  }
}
