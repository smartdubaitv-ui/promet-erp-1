import { logger } from '../config/logger';
import { loadDatabase, saveDatabase, DatabaseSchema, jsonDB } from './jsonDatabase';

// ============================================================
// الثوابت
// ============================================================

const THROTTLE_MS = 10000; // 10 ثوانٍ
const lastRecalculation: Record<string, number> = {};

// ============================================================
// 1. الدالة الأساسية لإعادة الحسابات المالية
// ============================================================

export interface FintechSummary {
  tenantId: string;
  totalPaid: number;
  totalDue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  outstandingBalance: number;
  lastUpdated: string;
}

export const performFintechRecalculation = async (
  tenantId: string,
  options?: { force?: boolean }
): Promise<FintechSummary | null> => {
  try {
    logger.debug(`🔄 Starting fintech recalculation for tenant ${tenantId}`);
    
    const db = loadDatabase();
    const tenantInvoices = db.invoices?.filter(
      (inv: any) => inv.tenantId === tenantId
    ) || [];
    
    if (tenantInvoices.length === 0) {
      logger.debug(`📭 No invoices found for tenant ${tenantId}`);
      return null;
    }
    
    // حساب الإجماليات
    let totalPaid = 0;
    let totalAmount = 0;
    let totalDue = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let overdueCount = 0;
    
    const now = new Date();
    
    tenantInvoices.forEach((invoice: any) => {
      const paid = Number(invoice.paid) || 0;
      const total = Number(invoice.total) || 0;
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      
      totalPaid += paid;
      totalAmount += total;
      totalDue += total - paid;
      
      if (paid >= total) {
        paidCount++;
      }
      
      if (dueDate && dueDate < now && paid < total) {
        totalOverdue += total - paid;
        overdueCount++;
      }
    });
    
    const summary: FintechSummary = {
      tenantId,
      totalPaid,
      totalDue,
      totalInvoices: tenantInvoices.length,
      averageInvoiceValue: tenantInvoices.length > 0 ? totalAmount / tenantInvoices.length : 0,
      outstandingBalance: totalDue,
      lastUpdated: new Date().toISOString(),
    };
    
    // تحديث بيانات المستأجر
    const dbUpdated = loadDatabase();
    const tenantIndex = dbUpdated.tenants?.findIndex(
      (t: any) => t.id === tenantId
    ) ?? -1;
    
    if (tenantIndex !== -1 && dbUpdated.tenants) {
      if (!dbUpdated.tenants[tenantIndex].fintech) {
        dbUpdated.tenants[tenantIndex].fintech = {};
      }
      dbUpdated.tenants[tenantIndex].fintech = {
        ...dbUpdated.tenants[tenantIndex].fintech,
        ...summary,
        paidInvoices: paidCount,
        overdueInvoices: overdueCount,
        totalOverdue,
      };
      saveDatabase(dbUpdated);
      logger.info(`✅ Fintech recalculation completed for tenant ${tenantId}`);
    }
    
    return summary;
  } catch (error) {
    logger.error(`❌ Fintech recalculation failed for tenant ${tenantId}:`, error);
    throw error;
  }
};

// ============================================================
// 2. نظام Throttling لمنع إعادة الحساب المتكرر
// ============================================================

export const throttledRecalculation = async (
  tenantId: string
): Promise<FintechSummary | null> => {
  const now = Date.now();
  const last = lastRecalculation[tenantId] || 0;
  
  if (now - last < THROTTLE_MS) {
    logger.debug(`⏳ Throttling recalculation for tenant ${tenantId} (${THROTTLE_MS}ms cooldown)`);
    return null;
  }
  
  lastRecalculation[tenantId] = now;
  return await performFintechRecalculation(tenantId);
};

// ============================================================
// 3. إعادة حساب جميع المستأجرين
// ============================================================

export const recalculateAllTenants = async (): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: FintechSummary[];
}> => {
  const db = loadDatabase();
  const tenants = db.tenants || [];
  
  const results: FintechSummary[] = [];
  let failed = 0;
  
  for (const tenant of tenants) {
    try {
      const result = await performFintechRecalculation(tenant.id);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      failed++;
      logger.error(`❌ Failed to recalculate tenant ${tenant.id}:`, error);
    }
  }
  
  return {
    total: tenants.length,
    succeeded: results.length,
    failed,
    results,
  };
};

// ============================================================
// 4. دالة للحصول على ملخص مالي لشركة
// ============================================================

export const getFintechSummary = (tenantId: string): FintechSummary | null => {
  const db = loadDatabase();
  const tenant = db.tenants?.find((t: any) => t.id === tenantId);
  
  if (tenant?.fintech) {
    return tenant.fintech as FintechSummary;
  }
  
  return null;
};

export default {
  performFintechRecalculation,
  throttledRecalculation,
  recalculateAllTenants,
  getFintechSummary,
};
