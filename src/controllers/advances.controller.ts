import { Request, Response } from 'express';
import { jsonDB } from '../data/jsonDatabase';
import { AuditService } from '../services/audit.service';

// ============================================================
// أنواع بيانات السلف
// ============================================================

export type RepaymentMethod = 'lump_sum' | 'installments';
export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type InstallmentStatus = 'due' | 'deducted' | 'paid_manually' | 'waived';

export interface EmployeeAdvance {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  repaymentMethod: RepaymentMethod;
  installmentsCount: number;
  monthlyInstallmentAmount: number;
  startMonth: string;
  status: AdvanceStatus;
  vaultId?: string | null;
  requestedBy: string;
  requestedById: string | null;
  approvedBy?: string;
  approvedById?: string | null;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceInstallment {
  id: string;
  tenantId: string;
  advanceId: string;
  employeeId: string;
  month: string;
  amount: number;
  status: InstallmentStatus;
  deductedInPayrollId?: string | null;
  paidAt?: string | null;
}

function getTenantId(req: Request): string {
  return (req as any).tenantId || (req as any).user?.tenantId || 'tenant-promet-sa';
}

function getCurrentUser(req: Request) {
  const u = (req as any).user || {};
  return {
    id: u.id || u.userId || null,
    name: u.name || u.email || 'مستخدم غير معروف',
    role: u.role || '',
  };
}

async function auditLog(req: Request, action: string, resourceId: string, changes?: any) {
  const tenantId = getTenantId(req);
  const user = getCurrentUser(req);
  try {
    await AuditService.createAuditLog({
      tenantId, userId: user.id || 'u-1', userEmail: user.name,
      action, resource: 'employee_advances', resourceId, changes,
    });
  } catch (e) {
    console.error('❌ Failed to write audit log for advance action:', e);
  }
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function createAdvance(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const user = getCurrentUser(req);
  const { employeeId, amount, reason, repaymentMethod, installmentsCount, startMonth } = req.body;

  const db = jsonDB.load();
  const employee = (db.employees || []).find((e: any) => 
    String(e.id) === String(employeeId) && 
    (!e.tenantId || e.tenantId === tenantId || tenantId === 'tenant-promet-sa')
  );
  if (!employee) return res.status(404).json({ error: 'الموظف غير موجود' });

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'قيمة السلفة يجب أن تكون أكبر من الصفر' });
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: 'سبب السلفة مطلوب' });
  if (!['lump_sum', 'installments'].includes(repaymentMethod)) {
    return res.status(400).json({ error: 'طريقة السداد يجب أن تكون lump_sum أو installments' });
  }

  const count = repaymentMethod === 'lump_sum' ? 1 : Math.max(1, Number(installmentsCount) || 1);
  const monthlyAmount = Number((numAmount / count).toFixed(2));
  const firstMonth = startMonth || new Date().toISOString().slice(0, 7);

  const now = new Date().toISOString();
  const advance: EmployeeAdvance = {
    id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId,
    employeeId: String(employeeId),
    employeeName: employee.name || employee.full_name || '',
    amount: numAmount,
    reason: String(reason).trim(),
    repaymentMethod,
    installmentsCount: count,
    monthlyInstallmentAmount: monthlyAmount,
    startMonth: firstMonth,
    status: 'pending',
    requestedBy: user.name,
    requestedById: user.id,
    createdAt: now,
    updatedAt: now,
  };

  jsonDB.insert<EmployeeAdvance>('employee_advances', advance);
  await auditLog(req, 'REQUEST_ADVANCE', advance.id, advance);

  return res.status(201).json(advance);
}

export async function approveAdvance(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const user = getCurrentUser(req);
  const { id } = req.params;
  const { vaultId } = req.body;

  const advance = jsonDB.findOne<EmployeeAdvance>('employee_advances', (a: any) => a.id === id && (!a.tenantId || a.tenantId === tenantId));
  if (!advance) return res.status(404).json({ error: 'طلب السلفة غير موجود' });
  if (advance.status !== 'pending') return res.status(400).json({ error: 'تم اتخاذ قرار بخصوص هذا الطلب مسبقًا' });

  if (vaultId) {
    const db = jsonDB.load();
    const vault = (db.vaults || []).find((v: any) => v.id === vaultId && (!v.tenantId || v.tenantId === tenantId));
    if (!vault) return res.status(404).json({ error: 'الخزينة المحددة غير موجودة' });
    if (Number(vault.balance) < advance.amount) {
      return res.status(400).json({ error: `رصيد خزينة "${vault.name}" لا يكفي لصرف هذه السلفة` });
    }
    const newBalance = Number(vault.balance) - advance.amount;
    jsonDB.update('vaults', vaultId, { balance: newBalance, updatedAt: new Date().toISOString() });

    if (!db.treasury_vouchers) db.treasury_vouchers = [];
    db.treasury_vouchers.push({
      id: `pv-adv-${Date.now()}`,
      tenantId,
      vaultId,
      direction: 'out',
      voucherType: 'employee_advance_or_salary',
      amount: advance.amount,
      date: new Date().toISOString().split('T')[0],
      description: `صرف سلفة للموظف ${advance.employeeName} — ${advance.reason}`,
      employeeId: advance.employeeId,
      performedBy: user.name,
      performedById: user.id,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    });
    jsonDB.save(db);
  }

  for (let i = 0; i < advance.installmentsCount; i++) {
    const installment: AdvanceInstallment = {
      id: `advinst-${advance.id}-${i}`,
      tenantId,
      advanceId: advance.id,
      employeeId: advance.employeeId,
      month: addMonths(advance.startMonth, i),
      amount: advance.monthlyInstallmentAmount,
      status: 'due',
    };
    jsonDB.insert<AdvanceInstallment>('advance_installments', installment);
  }

  const updated = jsonDB.update<EmployeeAdvance>('employee_advances', id, {
    status: 'approved',
    vaultId: vaultId || null,
    approvedBy: user.name,
    approvedById: user.id,
  });

  await auditLog(req, 'APPROVE_ADVANCE', id, updated);
  return res.json(updated);
}

export async function rejectAdvance(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const user = getCurrentUser(req);
  const { id } = req.params;
  const { rejectionReason } = req.body;

  const advance = jsonDB.findOne<EmployeeAdvance>('employee_advances', (a: any) => a.id === id && (!a.tenantId || a.tenantId === tenantId));
  if (!advance) return res.status(404).json({ error: 'طلب السلفة غير موجود' });
  if (advance.status !== 'pending') return res.status(400).json({ error: 'تم اتخاذ قرار بخصوص هذا الطلب مسبقًا' });

  const updated = jsonDB.update<EmployeeAdvance>('employee_advances', id, {
    status: 'rejected',
    approvedBy: user.name,
    approvedById: user.id,
    rejectionReason: rejectionReason || '',
  });
  await auditLog(req, 'REJECT_ADVANCE', id, updated);
  return res.json(updated);
}

export async function getAdvances(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { employeeId, status } = req.query;
  const advances = jsonDB
    .find<EmployeeAdvance>('employee_advances', (a: any) => {
      if (a.tenantId && a.tenantId !== tenantId) return false;
      if (employeeId && String(a.employeeId) !== String(employeeId)) return false;
      if (status && a.status !== status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(advances);
}

export async function getAdvanceInstallments(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const installments = jsonDB
    .find<AdvanceInstallment>('advance_installments', (i: any) => (!i.tenantId || i.tenantId === tenantId) && i.advanceId === id)
    .sort((a, b) => a.month.localeCompare(b.month));
  return res.json(installments);
}

export async function markInstallmentPaidManually(req: Request, res: Response) {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const installment = jsonDB.findOne<AdvanceInstallment>('advance_installments', (i: any) => i.id === id && (!i.tenantId || i.tenantId === tenantId));
  if (!installment) return res.status(404).json({ error: 'القسط غير موجود' });
  if (installment.status !== 'due') return res.status(400).json({ error: 'هذا القسط مسدد بالفعل أو تم إعفاؤه' });

  const updated = jsonDB.update<AdvanceInstallment>('advance_installments', id, {
    status: 'paid_manually',
    paidAt: new Date().toISOString(),
  });
  await auditLog(req, 'MARK_INSTALLMENT_PAID_MANUALLY', id, updated);
  await checkAndCompleteAdvance(tenantId, installment.advanceId);
  return res.json(updated);
}

async function checkAndCompleteAdvance(tenantId: string, advanceId: string) {
  const installments = jsonDB.find<AdvanceInstallment>('advance_installments', (i: any) => (!i.tenantId || i.tenantId === tenantId) && i.advanceId === advanceId);
  const allSettled = installments.length > 0 && installments.every((i) => i.status !== 'due');
  if (allSettled) {
    jsonDB.update<EmployeeAdvance>('employee_advances', advanceId, { status: 'completed' });
  }
}

export function getDueAdvanceDeductionForMonth(tenantId: string, employeeId: string, month: string): number {
  const due = jsonDB.find<AdvanceInstallment>(
    'advance_installments',
    (i: any) => (!i.tenantId || i.tenantId === tenantId) && String(i.employeeId) === String(employeeId) && i.month === month && i.status === 'due'
  );
  return due.reduce((sum, i) => sum + Number(i.amount), 0);
}

export function markAdvanceInstallmentsAsDeducted(tenantId: string, employeeId: string, month: string, payrollId: string) {
  const due = jsonDB.find<AdvanceInstallment>(
    'advance_installments',
    (i: any) => (!i.tenantId || i.tenantId === tenantId) && String(i.employeeId) === String(employeeId) && i.month === month && i.status === 'due'
  );
  for (const inst of due) {
    jsonDB.update<AdvanceInstallment>('advance_installments', inst.id, {
      status: 'deducted',
      deductedInPayrollId: payrollId,
    });
    checkAndCompleteAdvance(tenantId, inst.advanceId);
  }
}
