import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { PayrollModel, EmployeeModel, isPostgresConnected } from '../../services/postgres.service';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { jsonDB } from '../data/jsonDatabase';
import { SecurityService } from '../services/security.service';
import { getDueAdvanceDeductionForMonth, markAdvanceInstallmentsAsDeducted } from './advances.controller';

const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to read local database.json safely with full tenant database sharding support
function getLocalDatabase() {
  return jsonDB.load();
}

// Helper to write local database.json safely with full tenant database sharding support
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

// Mail Utility
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const emailTransporter = emailUser && emailPass ? nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass,
  }
}) : null;

async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  try {
    if (!to || !emailTransporter) {
      if (!emailTransporter) console.log('⚠️ SMTP credentials not configured. Email notification skipped.');
      return false;
    }
    await emailTransporter.sendMail({
      from: `"الهضبة ERP" <${emailUser}>`,
      to,
      subject,
      html: htmlContent
    });
    console.log(`Email successfully sent to ${to}`);
    return true;
  } catch (error: any) {
    if (error.message?.includes('535') || error.response?.includes('535') || error.code === 'EAUTH') {
      console.warn('⚠️ SMTP Authentication failed (535) in payroll controller. Email notification skipped gracefully.');
      return false;
    }
    console.error('❌ Failed to send email in payroll controller:', error.message);
    return false;
  }
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

/**
 * جلب جميع مسيرات الرواتب
 * GET /api/payroll
 */
export const getPayroll = async (req: Request, res: Response) => {
  const month = req.query.month as string;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let payrollRecords: any[] = [];
    let employees: any[] = [];

    if (isPostgresConnected()) {
      console.log(`Fetching payroll from PostgreSQL for tenant: ${tenantId}...`);
      payrollRecords = await PayrollModel.findAll({ where: { tenantId } });
      employees = await EmployeeModel.findAll({ where: { tenantId } });
    } else if (isFirebaseConnected() && firestore) {
      console.log(`Fetching payroll from Firestore for tenant: ${tenantId}...`);
      const payrollSnap = await firestore.collection('payroll').where('tenantId', '==', tenantId).get();
      payrollRecords = payrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const employeesSnap = await firestore.collection('employees').where('tenantId', '==', tenantId).get();
      employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      console.log(`Fetching payroll from local database for tenant: ${tenantId}...`);
      const dbData = getLocalDatabase();
      payrollRecords = (dbData.payroll || []).filter((p: any) => p.tenantId === tenantId).map((p: any) => SecurityService.decryptPayrollFields(p));
      employees = (dbData.employees || []).filter((e: any) => e.tenantId === tenantId);
    }

    // Role-based security access control filtration
    const user = (req as any).user;
    const requesterRole = user?.role;
    const requesterEmployeeId = user?.employeeId;

    if (!['admin', 'manager', 'hr'].includes(requesterRole)) {
      if (!requesterEmployeeId) {
        payrollRecords = [];
      } else {
        payrollRecords = payrollRecords.filter((p: any) => {
          const empId = p.employeeId || p.employee_id;
          return String(empId) === String(requesterEmployeeId);
        });
      }
    }

    if (month) {
      payrollRecords = payrollRecords.filter((p: any) => p.month === month || p.month_year === month || p.monthYear === month);
    }

    const mapped = payrollRecords.map((p: any) => {
      const empId = p.employeeId || p.employee_id;
      const emp = employees.find((e: any) => String(e.id) === String(empId));
      const empName = emp ? (emp.name || emp.full_name) : (p.employeeName || p.employee_name || 'موظف غير معروف');

      return {
        ...p,
        id: p.id,
        employeeId: empId,
        employee_id: empId,
        employeeName: empName,
        employee_name: empName,
        month: p.month || p.month_year || p.monthYear,
        month_year: p.month || p.month_year || p.monthYear,
        monthYear: p.month || p.month_year || p.monthYear,
        basicSalary: Number(p.basicSalary !== undefined ? p.basicSalary : (p.basic_salary || p.base_salary || p.basic_salary || 0)),
        basic_salary: Number(p.basicSalary !== undefined ? p.basicSalary : (p.basic_salary || p.base_salary || p.basic_salary || 0)),
        base_salary: Number(p.basicSalary !== undefined ? p.basicSalary : (p.basic_salary || p.base_salary || p.basic_salary || 0)),
        present_days: Number(p.present_days !== undefined ? p.present_days : (p.presentDays || 0)),
        presentDays: Number(p.present_days !== undefined ? p.present_days : (p.presentDays || 0)),
        absent_days: Number(p.absent_days !== undefined ? p.absent_days : (p.absentDays || 0)),
        absentDays: Number(p.absent_days !== undefined ? p.absent_days : (p.absentDays || 0)),
        leave_days: Number(p.leave_days !== undefined ? p.leave_days : (p.leaveDays || 0)),
        leaveDays: Number(p.leave_days !== undefined ? p.leave_days : (p.leaveDays || 0)),
        overtime_hours: Number(p.overtime_hours !== undefined ? p.overtime_hours : (p.overtimeHours || 0)),
        overtimeHours: Number(p.overtime_hours !== undefined ? p.overtime_hours : (p.overtimeHours || 0)),
        overtime_amount: Number(p.overtime_amount !== undefined ? p.overtime_amount : (p.overtimeAmount || 0)),
        overtimeAmount: Number(p.overtime_amount !== undefined ? p.overtime_amount : (p.overtimeAmount || 0)),
        allowances: Number(p.allowances !== undefined ? p.allowances : (p.allowance || 0)),
        allowance: Number(p.allowances !== undefined ? p.allowances : (p.allowance || 0)),
        bonuses: Number(p.bonuses !== undefined ? p.bonuses : (p.bonus || 0)),
        bonus: Number(p.bonuses !== undefined ? p.bonuses : (p.bonus || 0)),
        deductions: Number(p.deductions !== undefined ? p.deductions : 0),
        social_insurance: Number(p.social_insurance !== undefined ? p.social_insurance : (p.socialInsurance || 0)),
        socialInsurance: Number(p.social_insurance !== undefined ? p.social_insurance : (p.socialInsurance || 0)),
        netSalary: Number(p.netSalary !== undefined ? p.netSalary : (p.net_salary || 0)),
        net_salary: Number(p.netSalary !== undefined ? p.netSalary : (p.net_salary || 0)),
        status: p.status || 'draft'
      };
    });

    mapped.sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'ar'));
    return res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching payroll:', error);
    return res.status(500).json({ error: 'فشل جلب مسيرات الرواتب' });
  }
};

export function computePayrollForEmployee(emp: any, attendance: any[], leaves: any[], month: string, overrides?: { basicSalary?: number; allowance?: number; deductions?: number; }, advanceDeduction: number = 0) {
  const baseSalary = overrides?.basicSalary !== undefined ? Number(overrides.basicSalary) : Number(emp.basicSalary !== undefined ? emp.basicSalary : (emp.base_salary || emp.basic_salary || 0));
  const allowance = overrides?.allowance !== undefined ? Number(overrides.allowance) : Number(emp.allowance || 0);

  const startDate = `${month}-01`;
  const endDay = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
  const endDate = `${month}-${endDay < 10 ? '0' + endDay : endDay}`;

  const employeeAttendance = attendance.filter((a: any) => {
    const empId = a.employee_id || a.employeeId;
    return String(empId) === String(emp.id) && a.date >= startDate && a.date <= endDate;
  });

  const presentDays = employeeAttendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  const absentDays = employeeAttendance.filter((a: any) => a.status === 'absent').length;
  const overtimeHours = employeeAttendance.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0);

  let annualLeaveDays = 0;
  let nonAnnualLeaveDays = 0;
  let totalLeaveDays = 0;

  for (const l of leaves) {
    const empId = l.employee_id || l.employeeId;
    if (String(empId) !== String(emp.id)) continue;
    if (l.status !== 'approved') continue;

    const lStart = l.start_date || l.startDate;
    const lEnd = l.end_date || l.endDate;
    if (!lStart || !lEnd) continue;

    if (lStart <= endDate && lEnd >= startDate) {
      const overlapStart = lStart < startDate ? new Date(startDate) : new Date(lStart);
      const overlapEnd = lEnd > endDate ? new Date(endDate) : new Date(lEnd);
      const diffMs = overlapEnd.getTime() - overlapStart.getTime();
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);

      totalLeaveDays += diffDays;
      const lType = String(l.type || '').trim().toLowerCase();
      if (lType.includes('سنوية') || lType === 'annual') {
        annualLeaveDays += diffDays;
      } else {
        nonAnnualLeaveDays += diffDays;
      }
    }
  }

  const dailyRate = baseSalary / 30;
  const overtimeAmount = overtimeHours * (dailyRate / 8 * 1.5);
  const deductionDays = absentDays + nonAnnualLeaveDays;
  const deductionAmount = overrides?.deductions !== undefined ? Number(overrides.deductions) : (deductionDays * dailyRate);

  const subjectToSocialInsurance = emp.subject_to_social_insurance === true;
  const socialInsurance = subjectToSocialInsurance ? (baseSalary * 0.14) : 0;
  const incomeTax = 0;

  const netSalary = Math.max(0, baseSalary + allowance + overtimeAmount - deductionAmount - socialInsurance - incomeTax - advanceDeduction);

  return {
    basicSalary: baseSalary,
    allowance,
    presentDays,
    absentDays,
    leaveDays: totalLeaveDays,
    annualLeaveDays,
    nonAnnualLeaveDays,
    overtimeHours,
    overtimeAmount,
    deductions: deductionAmount,
    socialInsurance,
    incomeTax,
    advanceDeduction,
    netSalary
  };
}

/**
 * حساب الرواتب آلياً بناءً على الحضور والإجازات
 * POST /api/payroll/calculate
 */
export const calculatePayroll = async (req: Request, res: Response) => {
  const { month } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  if (!month) return res.status(400).json({ error: 'الشهر مطلوب' });

  try {
    let employees: any[] = [];
    let attendance: any[] = [];
    let leaves: any[] = [];
    let payroll: any[] = [];

    if (isPostgresConnected()) {
      employees = await EmployeeModel.findAll({ where: { tenantId } });
      payroll = await PayrollModel.findAll({ where: { tenantId } });
      attendance = [];
      leaves = [];
    } else if (isFirebaseConnected() && firestore) {
      const empsSnap = await firestore.collection('employees').where('tenantId', '==', tenantId).get();
      employees = empsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const attSnap = await firestore.collection('attendance').where('tenantId', '==', tenantId).get();
      attendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const leavesSnap = await firestore.collection('leaves').where('tenantId', '==', tenantId).get();
      leaves = leavesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const payrollSnap = await firestore.collection('payroll').where('tenantId', '==', tenantId).get();
      payroll = payrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);
      attendance = (db.attendance || []).filter((a: any) => a.tenantId === tenantId);
      leaves = (db.leaves || []).filter((l: any) => l.tenantId === tenantId);
      payroll = (db.payroll || []).filter((p: any) => p.tenantId === tenantId);
    }

    // Filter employees (exclude daily workers)
    const activeEmployees = employees.filter((emp: any) => {
      const wt = emp.worker_type || (emp.employment_type === 'daily' ? 'daily_worker' : emp.employment_type === 'probation' ? 'probation' : 'employee');
      return emp.status === 'active' && (wt === 'employee' || wt === 'probation');
    });

    const dailyWorkers = employees.filter((emp: any) => {
      const wt = emp.worker_type || (emp.employment_type === 'daily' ? 'daily_worker' : emp.employment_type === 'probation' ? 'probation' : 'employee');
      return wt === 'daily_worker';
    });

    for (const emp of activeEmployees) {
      const advanceDeduction = getDueAdvanceDeductionForMonth(tenantId, emp.id, month);
      const calc = computePayrollForEmployee(emp, attendance, leaves, month, undefined, advanceDeduction);
      const { basicSalary, allowance, presentDays, absentDays, leaveDays, annualLeaveDays, nonAnnualLeaveDays, overtimeHours, overtimeAmount, deductions: deductionAmount, socialInsurance, incomeTax, netSalary } = calc;

      // Find if record already exists
      const existingIdx = payroll.findIndex((p: any) => {
        const empId = p.employeeId || p.employee_id;
        const pMonth = p.month || p.month_year || p.monthYear;
        return String(empId) === String(emp.id) && pMonth === month;
      });

      const empName = emp.name || emp.full_name || 'موظف';

      const payrRecord = {
        tenantId,
        employeeId: emp.id,
        employee_id: emp.id,
        employeeName: empName,
        employee_name: empName,
        month: month,
        month_year: month,
        monthYear: month,
        basicSalary: basicSalary,
        basic_salary: basicSalary,
        base_salary: basicSalary,
        presentDays,
        present_days: presentDays,
        absentDays,
        absent_days: absentDays,
        leaveDays,
        leave_days: leaveDays,
        annual_leave_days: annualLeaveDays,
        annualLeaveDays: annualLeaveDays,
        non_annual_leave_days: nonAnnualLeaveDays,
        nonAnnualLeaveDays: nonAnnualLeaveDays,
        overtimeHours,
        overtime_hours: overtimeHours,
        overtimeAmount,
        overtime_amount: overtimeAmount,
        allowances: allowance,
        allowance: allowance,
        bonuses: 0,
        bonus: 0,
        deductions: deductionAmount,
        socialInsurance,
        social_insurance: socialInsurance,
        incomeTax,
        income_tax: incomeTax,
        advanceDeduction,
        advance_deduction: advanceDeduction,
        netSalary,
        net_salary: netSalary,
        status: existingIdx !== -1 ? payroll[existingIdx].status : 'draft',
        createdAt: existingIdx !== -1 ? payroll[existingIdx].createdAt || payroll[existingIdx].created_at : new Date().toISOString(),
        created_at: existingIdx !== -1 ? payroll[existingIdx].createdAt || payroll[existingIdx].created_at : new Date().toISOString()
      };

      if (isPostgresConnected()) {
        if (existingIdx !== -1) {
          const pRecord = await PayrollModel.findOne({ where: { id: payroll[existingIdx].id, tenantId } });
          if (pRecord) {
            await pRecord.update(payrRecord);
          }
        } else {
          const recordId = `payr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          await PayrollModel.create({ id: recordId, ...payrRecord });
        }
      } else if (isFirebaseConnected() && firestore) {
        if (existingIdx !== -1) {
          await firestore.collection('payroll').doc(payroll[existingIdx].id).set(payrRecord);
        } else {
          await firestore.collection('payroll').add(payrRecord);
        }
      } else {
        const db = getLocalDatabase();
        if (!db.payroll) db.payroll = [];
        // Find idx in real db
        const realIdx = db.payroll.findIndex((p: any) => p.tenantId === tenantId && String(p.employeeId || p.employee_id) === String(emp.id) && (p.month || p.month_year || p.monthYear) === month);
        const recordId = realIdx !== -1 ? db.payroll[realIdx].id : `payr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const recordWithId = { id: recordId, ...payrRecord };
        const encryptedRecord = SecurityService.encryptPayrollFields(recordWithId);
        if (realIdx !== -1) {
          db.payroll[realIdx] = encryptedRecord;
        } else {
          db.payroll.push(encryptedRecord);
        }
        saveLocalDatabase(db);
      }
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'CALCULATE',
      tableName: 'payroll',
      recordIdentifier: month,
      description: `تم احتساب مسيرات الرواتب لشهر ${month} لعدد ${activeEmployees.length} موظفاً آلياً.`
    });

    return res.json({
      success: true,
      message: '✅ تم حساب الرواتب للموظفين فقط',
      employeeCount: activeEmployees.length,
      dailyWorkerCount: dailyWorkers.length,
      note: 'العمالة اليومية يتم صرف مستحقاتهم بشكل منفصل'
    });
  } catch (error: any) {
    console.error('Error calculating payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * اعتماد راتب معين للموظف وإرسال بريد إلكتروني تلقائي له
 * PUT /api/payroll/:id/approve
 */
export const approvePayroll = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let employees: any[] = [];
    let record: any = null;

    if (isPostgresConnected()) {
      const pRecord = await PayrollModel.findOne({ where: { id, tenantId } });
      if (!pRecord) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = pRecord;
      employees = await EmployeeModel.findAll({ where: { tenantId } });
      await pRecord.update({ status: 'approved' });
    } else if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('payroll').doc(id).get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = { id: doc.id, ...doc.data() };

      const empsSnap = await firestore.collection('employees').where('tenantId', '==', tenantId).get();
      employees = empsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      const idx = (db.payroll || []).findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx === -1) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = SecurityService.decryptPayrollFields(db.payroll[idx]);
      employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);
    }

    // Set status to approved
    if (isPostgresConnected()) {
      // already updated above
    } else if (isFirebaseConnected() && firestore) {
      await firestore.collection('payroll').doc(id).update({ status: 'approved' });
    } else {
      const db = getLocalDatabase();
      const idx = db.payroll.findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx !== -1) {
        db.payroll[idx].status = 'approved';
        saveLocalDatabase(db);
      }
    }

    {
      const empId = record.employeeId || record.employee_id;
      const payrollMonth = record.month || record.month_year || record.monthYear;
      if (empId && payrollMonth) {
        markAdvanceInstallmentsAsDeducted(tenantId, String(empId), payrollMonth, id);
      }
    }

    // Send email notification
    const empId = record.employeeId || record.employee_id;
    const emp = employees.find((e: any) => String(e.id) === String(empId));
    if (emp && emp.email) {
      sendEmail(
        emp.email,
        '💰 إشعار بصرف الراتب',
        `
          <div style="direction: rtl; text-align: right; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #0f172a;">تم اعتماد راتبك الشهري</h2>
            <p><b>الشهر:</b> ${record.month || record.month_year || record.monthYear}</p>
            <p><b>صافي الراتب:</b> ${Number(record.netSalary || record.net_salary || 0).toLocaleString()} ج.م</p>
            <p>سيتم إيداع الراتب في حسابك البنكي خلال 48 ساعة.</p>
          </div>
        `
      ).catch(err => console.error('Error sending payroll approval email:', err));
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'APPROVE',
      tableName: 'payroll',
      recordId: id,
      recordIdentifier: record.employeeName,
      description: `تم اعتماد راتب الموظف ${record.employeeName || record.employee_name || 'موظف'} لشهر ${record.month || record.month_year || record.monthYear} وصافي راتب بقيمة ${record.netSalary || record.net_salary || 0} ج.م`
    });

    return res.json({ message: '✅ تم اعتماد الراتب', success: true });
  } catch (error: any) {
    console.error('Error approving payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * اعتماد جميع الرواتب لشهر معين دفعة واحدة
 * PUT /api/payroll/approve-all
 */
export const approveAllPayroll = async (req: Request, res: Response) => {
  const { month } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  if (!month) return res.status(400).json({ error: 'الشهر مطلوب' });

  try {
    let payrollRecords: any[] = [];
    let employees: any[] = [];

    if (isPostgresConnected()) {
      payrollRecords = await PayrollModel.findAll({ where: { tenantId } });
      employees = await EmployeeModel.findAll({ where: { tenantId } });
    } else if (isFirebaseConnected() && firestore) {
      const payrollSnap = await firestore.collection('payroll').where('tenantId', '==', tenantId).get();
      payrollRecords = payrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const empsSnap = await firestore.collection('employees').where('tenantId', '==', tenantId).get();
      employees = empsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      payrollRecords = (db.payroll || []).filter((p: any) => p.tenantId === tenantId).map((p: any) => SecurityService.decryptPayrollFields(p));
      employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);
    }

    let count = 0;

    for (const p of payrollRecords) {
      const pMonth = p.month || p.month_year || p.monthYear;
      if (pMonth === month && p.status === 'draft') {
        count++;
        p.status = 'approved';

        const empIdForAdvance = p.employeeId || p.employee_id;
        if (empIdForAdvance) {
          markAdvanceInstallmentsAsDeducted(tenantId, String(empIdForAdvance), pMonth, p.id);
        }

        if (isPostgresConnected()) {
          const pRecord = await PayrollModel.findOne({ where: { id: p.id, tenantId } });
          if (pRecord) await pRecord.update({ status: 'approved' });
        } else if (isFirebaseConnected() && firestore) {
          await firestore.collection('payroll').doc(p.id).update({ status: 'approved' });
        }

        const empId = p.employeeId || p.employee_id;
        const emp = employees.find((e: any) => String(e.id) === String(empId));
        if (emp && emp.email) {
          sendEmail(
            emp.email,
            '💰 إشعار بصرف الراتب',
            `
              <div style="direction: rtl; text-align: right; font-family: sans-serif; line-height: 1.6;">
                <h2 style="color: #0f172a;">تم اعتماد راتبك الشهري</h2>
                <p><b>الشهر:</b> ${pMonth}</p>
                <p><b>صافي الراتب:</b> ${Number(p.netSalary || p.net_salary || 0).toLocaleString()} ج.م</p>
                <p>سيتم إيداع الراتب في حسابك البنكي خلال 48 ساعة.</p>
              </div>
            `
          ).catch(err => console.error('Error sending payroll approval email:', err));
        }
      }
    }

    if (isPostgresConnected()) {
      // already processed above
    } else if (!isFirebaseConnected() || !firestore) {
      const db = getLocalDatabase();
      db.payroll.forEach((p: any) => {
        if (p.tenantId === tenantId && (p.month || p.month_year || p.monthYear) === month && p.status === 'draft') {
          p.status = 'approved';
        }
      });
      saveLocalDatabase(db);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'APPROVE_ALL',
      tableName: 'payroll',
      recordIdentifier: month,
      description: `تم اعتماد جميع مسيرات الرواتب لشهر ${month} لعدد ${count} موظفاً.`
    });

    return res.json({ message: `✅ تم اعتماد ${count} راتب`, success: true });
  } catch (error: any) {
    console.error('Error approving all payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * إضافة مسيرة راتب يدوياً
 * POST /api/payroll
 */
export const createPayroll = async (req: Request, res: Response) => {
  const { employeeId, employeeName, month, basicSalary, allowance, deductions, status } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    let emp: any = null;
    let attendance: any[] = [];
    let leaves: any[] = [];
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    if (isPostgresConnected()) {
      emp = await EmployeeModel.findOne({ where: { id: employeeId, tenantId } });
    } else if (isFirebaseConnected() && firestore) {
      const empDoc = await firestore.collection('employees').doc(employeeId).get();
      if (empDoc.exists) emp = { id: empDoc.id, ...empDoc.data() };

      const attSnap = await firestore.collection('attendance').where('tenantId', '==', tenantId).get();
      attendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const leavesSnap = await firestore.collection('leaves').where('tenantId', '==', tenantId).get();
      leaves = leavesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      emp = (db.employees || []).find((e: any) => String(e.id) === String(employeeId));
      attendance = db.attendance || [];
      leaves = db.leaves || [];
    }

    const calc = computePayrollForEmployee(
      emp || { id: employeeId, basicSalary: basicSalary || 0, allowance: allowance || 0, subject_to_social_insurance: false },
      attendance,
      leaves,
      targetMonth,
      {
        basicSalary: basicSalary !== undefined ? Number(basicSalary) : undefined,
        allowance: allowance !== undefined ? Number(allowance) : undefined,
        deductions: deductions !== undefined ? Number(deductions) : undefined
      }
    );

    const payr = {
      tenantId,
      employeeId,
      employee_id: employeeId,
      employeeName: employeeName || emp?.name || 'موظف',
      employee_name: employeeName || emp?.name || 'موظف',
      month: targetMonth,
      month_year: targetMonth,
      monthYear: targetMonth,
      basicSalary: calc.basicSalary,
      basic_salary: calc.basicSalary,
      base_salary: calc.basicSalary,
      allowance: calc.allowance,
      allowances: calc.allowance,
      deductions: calc.deductions,
      socialInsurance: calc.socialInsurance,
      social_insurance: calc.socialInsurance,
      netSalary: calc.netSalary,
      net_salary: calc.netSalary,
      status: status || 'draft',
      paidAt: status === 'paid' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    let savedPayroll: any = null;

    if (isPostgresConnected()) {
      const pId = req.body.id || `payr-${Date.now()}`;
      const record = await PayrollModel.create({
        id: pId,
        tenantId,
        employeeId,
        employeeName,
        month,
        basicSalary: Number(basicSalary || 0),
        allowance: Number(allowance || 0),
        deductions: Number(deductions || 0),
        netSalary: Number(basicSalary || 0) + Number(allowance || 0) - Number(deductions || 0),
        status: status || 'draft',
        paidAt: status === 'paid' ? new Date().toISOString() : undefined
      });
      savedPayroll = record;
    } else if (isFirebaseConnected() && firestore) {
      const docRef = await firestore.collection('payroll').add(payr);
      savedPayroll = { id: docRef.id, ...payr };

      if (status === 'paid') {
        const amount = payr.netSalary;

        // Register expense
        await firestore.collection('expenses').add({
          tenantId,
          expenseDate: new Date().toISOString().split('T')[0],
          amount,
          category: 'رواتب ومستحقات الموظفين',
          description: `صرف راتب شهر ${month} للموظف ${employeeName}`,
          createdAt: new Date().toISOString()
        });

        // Register bank transactions
        await firestore.collection('bankTransactions').add({
          tenantId,
          bankAccountId: '1010',
          date: new Date().toISOString().split('T')[0],
          amount: -amount,
          description: `رواتب ومستحقات الموظفين - الموظف ${employeeName} شهر ${month}`,
          category: 'رواتب ومستحقات الموظفين',
          isReconciled: false,
          createdAt: new Date().toISOString()
        });

        // Adjust accounts
        const bankAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
        if (!bankAccSnap.empty) {
          const bankAccDoc = bankAccSnap.docs[0];
          await firestore.collection('accounts').doc(bankAccDoc.id).update({
            balance: Number(bankAccDoc.data().balance || 0) - amount
          });
        }
      }
    } else {
      const db = getLocalDatabase();
      if (!db.payroll) db.payroll = [];
      const id = `payr-${Date.now()}`;
      savedPayroll = { id, ...payr };
      const encryptedRecord = SecurityService.encryptPayrollFields(savedPayroll);
      db.payroll.push(encryptedRecord);

      if (status === 'paid') {
        const amount = payr.netSalary;
        if (!db.expenses) db.expenses = [];
        db.expenses.push({
          id: `exp-${Date.now()}`,
          tenantId,
          expenseDate: new Date().toISOString().split('T')[0],
          amount,
          category: 'رواتب ومستحقات الموظفين',
          description: `صرف راتب شهر ${month} للموظف ${employeeName}`,
          createdAt: new Date().toISOString()
        });

        if (!db.bankTransactions) db.bankTransactions = [];
        db.bankTransactions.unshift({
          id: `bt-${Date.now()}`,
          tenantId,
          bankAccountId: '1010',
          date: new Date().toISOString().split('T')[0],
          amount: -amount,
          description: `رواتب ومستحقات الموظفين - الموظف ${employeeName} شهر ${month}`,
          category: 'رواتب ومستحقات الموظفين',
          isReconciled: false,
          createdAt: new Date().toISOString()
        });

        if (!db.accounts) db.accounts = [];
        const bankAcc = db.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
        if (bankAcc) {
          bankAcc.balance = (Number(bankAcc.balance) || 0) - amount;
        }
      }
      saveLocalDatabase(db);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'CREATE',
      tableName: 'payroll',
      recordId: savedPayroll.id,
      recordIdentifier: employeeName,
      description: `تم إنشاء مسيرة راتب يدوياً للموظف ${employeeName} لشهر ${month} بصافي راتب ${payr.netSalary} ج.م.`
    });

    return res.status(201).json(savedPayroll);
  } catch (error: any) {
    console.error('Error creating payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * تحديث مسيرة راتب معينة
 * PUT /api/payroll/:id
 */
export const updatePayroll = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";

  try {
    let record: any = null;

    if (isPostgresConnected()) {
      const pRecord = await PayrollModel.findOne({ where: { id, tenantId } });
      if (!pRecord) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = pRecord;
    } else if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('payroll').doc(id).get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = { id: doc.id, ...doc.data() };
    } else {
      const db = getLocalDatabase();
      const idx = (db.payroll || []).findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx === -1) return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية له' });
      record = SecurityService.decryptPayrollFields(db.payroll[idx]);
    }

    const oldStatus = record.status;
    const empId = record.employeeId || record.employee_id;
    let emp: any = null;
    let attendance: any[] = [];
    let leaves: any[] = [];
    if (empId) {
      if (isPostgresConnected()) {
        emp = await EmployeeModel.findOne({ where: { id: empId, tenantId } });
      } else if (isFirebaseConnected() && firestore) {
        const empDoc = await firestore.collection('employees').doc(empId).get();
        if (empDoc.exists) emp = { id: empDoc.id, ...empDoc.data() };

        const attSnap = await firestore.collection('attendance').where('tenantId', '==', tenantId).get();
        attendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const leavesSnap = await firestore.collection('leaves').where('tenantId', '==', tenantId).get();
        leaves = leavesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const db = getLocalDatabase();
        emp = (db.employees || []).find((e: any) => String(e.id) === String(empId));
        attendance = db.attendance || [];
        leaves = db.leaves || [];
      }
    }

    const basicVal = req.body.basicSalary !== undefined ? Number(req.body.basicSalary) : Number(record.basicSalary || record.basic_salary || 0);
    const allowanceVal = req.body.allowance !== undefined ? Number(req.body.allowance) : Number(record.allowance || record.allowances || 0);
    const deductionVal = req.body.deductions !== undefined ? Number(req.body.deductions) : Number(record.deductions || 0);

    const calc = computePayrollForEmployee(
      emp || { id: empId, basicSalary: basicVal, allowance: allowanceVal, subject_to_social_insurance: Number(record.socialInsurance || record.social_insurance || 0) > 0 },
      attendance,
      leaves,
      record.month || record.month_year || new Date().toISOString().substring(0, 7),
      { basicSalary: basicVal, allowance: allowanceVal, deductions: deductionVal }
    );

    const updatedData = {
      ...record,
      ...req.body,
      tenantId,
      basicSalary: calc.basicSalary,
      basic_salary: calc.basicSalary,
      base_salary: calc.basicSalary,
      allowance: calc.allowance,
      allowances: calc.allowance,
      deductions: calc.deductions,
      socialInsurance: calc.socialInsurance,
      social_insurance: calc.socialInsurance,
      netSalary: calc.netSalary,
      net_salary: calc.netSalary,
      status: status || record.status
    };

    if (status === 'paid' && oldStatus !== 'paid') {
      updatedData.paidAt = new Date().toISOString();
      const amount = calc.netSalary;

      if (isPostgresConnected()) {
        const pRecord = await PayrollModel.findOne({ where: { id, tenantId } });
        if (pRecord) await pRecord.update(updatedData);
      } else if (isFirebaseConnected() && firestore) {
        // Register expense
        await firestore.collection('expenses').add({
          tenantId,
          expenseDate: new Date().toISOString().split('T')[0],
          amount,
          category: 'رواتب ومستحقات الموظفين',
          description: `صرف راتب شهر ${updatedData.month} للموظف ${updatedData.employeeName}`,
          createdAt: new Date().toISOString()
        });

        // Register bank transactions
        await firestore.collection('bankTransactions').add({
          tenantId,
          bankAccountId: '1010',
          date: new Date().toISOString().split('T')[0],
          amount: -amount,
          description: `رواتب ومستحقات الموظفين - الموظف ${updatedData.employeeName} شهر ${updatedData.month}`,
          category: 'رواتب ومستحقات الموظفين',
          isReconciled: false,
          createdAt: new Date().toISOString()
        });

        // Adjust accounts
        const bankAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
        if (!bankAccSnap.empty) {
          const bankAccDoc = bankAccSnap.docs[0];
          await firestore.collection('accounts').doc(bankAccDoc.id).update({
            balance: Number(bankAccDoc.data().balance || 0) - amount
          });
        }
      } else {
        const db = getLocalDatabase();
        if (!db.expenses) db.expenses = [];
        db.expenses.push({
          id: `exp-${Date.now()}`,
          tenantId,
          expenseDate: new Date().toISOString().split('T')[0],
          amount,
          category: 'رواتب ومستحقات الموظفين',
          description: `صرف راتب شهر ${updatedData.month} للموظف ${updatedData.employeeName}`,
          createdAt: new Date().toISOString()
        });

        if (!db.bankTransactions) db.bankTransactions = [];
        db.bankTransactions.unshift({
          id: `bt-${Date.now()}`,
          tenantId,
          bankAccountId: '1010',
          date: new Date().toISOString().split('T')[0],
          amount: -amount,
          description: `رواتب ومستحقات الموظفين - الموظف ${updatedData.employeeName} شهر ${updatedData.month}`,
          category: 'رواتب ومستحقات الموظفين',
          isReconciled: false,
          createdAt: new Date().toISOString()
        });

        if (!db.accounts) db.accounts = [];
        const bankAcc = db.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
        if (bankAcc) {
          bankAcc.balance = (Number(bankAcc.balance) || 0) - amount;
        }
        saveLocalDatabase(db);
      }
    }

    if (isPostgresConnected()) {
      // updated above
    } else if (isFirebaseConnected() && firestore) {
      await firestore.collection('payroll').doc(id).set(updatedData);
    } else {
      const db = getLocalDatabase();
      const idx = db.payroll.findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx !== -1) {
        db.payroll[idx] = SecurityService.encryptPayrollFields(updatedData);
        saveLocalDatabase(db);
      }
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'UPDATE',
      tableName: 'payroll',
      recordId: id,
      recordIdentifier: updatedData.employeeName,
      description: `تم تحديث مسيرة راتب الموظف ${updatedData.employeeName} لشهر ${updatedData.month}.`
    });

    return res.json(updatedData);
  } catch (error: any) {
    console.error('Error updating payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * حذف مسيرة راتب
 * DELETE /api/payroll/:id
 */
export const deletePayroll = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isPostgresConnected()) {
      const pRecord = await PayrollModel.findOne({ where: { id, tenantId } });
      if (!pRecord) {
        return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية لحذفه' });
      }
      await pRecord.destroy();
    } else if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('payroll').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية لحذفه' });
      }
      await docRef.delete();
    } else {
      const db = getLocalDatabase();
      if (!db.payroll) db.payroll = [];
      const initialLength = db.payroll.length;
      db.payroll = db.payroll.filter((p: any) => !(String(p.id) === String(id) && p.tenantId === tenantId));
      if (db.payroll.length === initialLength) {
        return res.status(404).json({ error: 'الراتب غير موجود أو لا تملك الصلاحية لحذفه' });
      }
      saveLocalDatabase(db);
    }
    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'DELETE',
      tableName: 'payroll',
      recordId: id,
      description: `تم حذف مسيرة راتب المعرف ${id}.`
    });

    return res.json({ success: true, message: 'تم حذف مسيرة الراتب بنجاح' });
  } catch (error: any) {
    console.error('Error deleting payroll:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * ترحيل الرواتب للقيود المحاسبية الثنائية
 * POST /api/payroll/post
 */
export const postPayroll = async (req: Request, res: Response) => {
  const { month } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  if (!month) return res.status(400).json({ error: 'الشهر مطلوب' });

  try {
    let payrollRecords: any[] = [];
    let accounts: any[] = [];

    if (isFirebaseConnected() && firestore) {
      const payrollSnap = await firestore.collection('payroll').where('tenantId', '==', tenantId).get();
      payrollRecords = payrollSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const accSnap = await firestore.collection('accounts').where('tenantId', '==', tenantId).get();
      accounts = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      payrollRecords = (db.payroll || []).filter((p: any) => p.tenantId === tenantId).map((p: any) => SecurityService.decryptPayrollFields(p));
      accounts = (db.accounts || []).filter((a: any) => a.tenantId === tenantId);
    }

    // Get approved payrolls for month
    const approvedPayrolls = payrollRecords.filter((p: any) => {
      const pMonth = p.month || p.month_year || p.monthYear;
      return pMonth === month && p.status === 'approved';
    });

    if (approvedPayrolls.length === 0) {
      return res.status(400).json({ error: 'لا توجد رواتب معتمدة لهذا الشهر' });
    }

    let totalNetSalary = 0;
    let totalSocialInsurance = 0;
    let totalIncomeTax = 0;
    let totalDeductions = 0;

    approvedPayrolls.forEach((p: any) => {
      const netVal = Number(p.net_salary !== undefined ? p.net_salary : (p.netSalary || 0));
      const insuranceVal = Number(p.social_insurance !== undefined ? p.social_insurance : (p.socialInsurance || 0));
      const taxVal = Number(p.income_tax !== undefined ? p.income_tax : (p.incomeTax || 0));
      const dedVal = Number(p.deductions !== undefined ? p.deductions : 0);

      totalNetSalary += netVal;
      totalSocialInsurance += insuranceVal;
      totalIncomeTax += taxVal;
      totalDeductions += dedVal;
    });

    const entryId = `entry-${Date.now()}`;
    const entryDate = month + '-01';
    const description = `رواتب شهر ${month}`;

    const newEntry = {
      id: entryId,
      tenantId,
      entry_date: entryDate,
      description,
      reference_type: 'payroll',
      reference_id: month,
      created_at: new Date().toISOString()
    };

    const details: any[] = [];

    // Debit salary expense (5010)
    details.push({
      id: `det-${Date.now()}-1`,
      entry_id: entryId,
      account_code: '5010',
      account_name: 'مرتبات الموظفين',
      debit: totalNetSalary + totalSocialInsurance + totalIncomeTax,
      credit: 0,
      notes: `إجمالي مرتبات شهر ${month}`
    });

    // Credit social insurance liability (2510)
    if (totalSocialInsurance > 0) {
      details.push({
        id: `det-${Date.now()}-2`,
        entry_id: entryId,
        account_code: '2510',
        account_name: 'التأمينات الاجتماعية',
        debit: 0,
        credit: totalSocialInsurance,
        notes: `التأمينات الاجتماعية شهر ${month}`
      });
    }

    // Credit tax liability (2520)
    if (totalIncomeTax > 0) {
      details.push({
        id: `det-${Date.now()}-3`,
        entry_id: entryId,
        account_code: '2520',
        account_name: 'ضريبة المرتبات',
        debit: 0,
        credit: totalIncomeTax,
        notes: `ضريبة المرتبات شهر ${month}`
      });
    }

    // Credit cash/bank (1010)
    const bankAccount = accounts.find((a: any) => a.code === '1010');
    const bankAccountName = bankAccount ? bankAccount.name : 'الخزينة';
    details.push({
      id: `det-${Date.now()}-4`,
      entry_id: entryId,
      account_code: '1010',
      account_name: bankAccountName,
      debit: 0,
      credit: totalNetSalary,
      notes: `صافي مرتبات شهر ${month}`
    });

    // Save Accounting Entry and Details
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('accountingEntries').doc(entryId).set(newEntry);
      for (const d of details) {
        await firestore.collection('accountingEntryDetails').doc(d.id).set(d);
      }

      // Update account balances
      const empSalarySnap = await firestore.collection('accounts').where('code', '==', '5010').where('tenantId', '==', tenantId).get();
      if (!empSalarySnap.empty) {
        const empSalaryAcc = empSalarySnap.docs[0];
        await firestore.collection('accounts').doc(empSalaryAcc.id).update({
          balance: (Number(empSalaryAcc.data().balance) || 0) + (totalNetSalary + totalSocialInsurance + totalIncomeTax)
        });
      }

      if (totalSocialInsurance > 0) {
        const socialInsSnap = await firestore.collection('accounts').where('code', '==', '2510').where('tenantId', '==', tenantId).get();
        if (!socialInsSnap.empty) {
          const socialInsAcc = socialInsSnap.docs[0];
          await firestore.collection('accounts').doc(socialInsAcc.id).update({
            balance: (Number(socialInsAcc.data().balance) || 0) + totalSocialInsurance
          });
        }
      }

      if (totalIncomeTax > 0) {
        const taxSnap = await firestore.collection('accounts').where('code', '==', '2520').where('tenantId', '==', tenantId).get();
        if (!taxSnap.empty) {
          const taxAcc = taxSnap.docs[0];
          await firestore.collection('accounts').doc(taxAcc.id).update({
            balance: (Number(taxAcc.data().balance) || 0) + totalIncomeTax
          });
        }
      }

      const bankAccSnap = await firestore.collection('accounts').where('code', '==', '1010').where('tenantId', '==', tenantId).get();
      if (!bankAccSnap.empty) {
        const bankAccDoc = bankAccSnap.docs[0];
        await firestore.collection('accounts').doc(bankAccDoc.id).update({
          balance: (Number(bankAccDoc.data().balance) || 0) - totalNetSalary
        });
      }

      // Mark payroll status as paid
      for (const p of approvedPayrolls) {
        await firestore.collection('payroll').doc(p.id).update({
          status: 'paid',
          paid_at: entryDate
        });
      }
    } else {
      const db = getLocalDatabase();
      if (!db.accountingEntries) db.accountingEntries = [];
      db.accountingEntries.push(newEntry);

      if (!db.accountingEntryDetails) db.accountingEntryDetails = [];
      db.accountingEntryDetails.push(...details);

      if (!db.accounts) db.accounts = [];
      const empSalaryAcc = db.accounts.find((a: any) => a.code === '5010' && a.tenantId === tenantId);
      if (empSalaryAcc) {
        empSalaryAcc.balance = (Number(empSalaryAcc.balance) || 0) + (totalNetSalary + totalSocialInsurance + totalIncomeTax);
      }

      const socialInsAcc = db.accounts.find((a: any) => a.code === '2510' && a.tenantId === tenantId);
      if (socialInsAcc) {
        socialInsAcc.balance = (Number(socialInsAcc.balance) || 0) + totalSocialInsurance;
      }

      const taxAcc = db.accounts.find((a: any) => a.code === '2520' && a.tenantId === tenantId);
      if (taxAcc) {
        taxAcc.balance = (Number(taxAcc.balance) || 0) + totalIncomeTax;
      }

      const bankAccLocal = db.accounts.find((a: any) => a.code === '1010' && a.tenantId === tenantId);
      if (bankAccLocal) {
        bankAccLocal.balance = (Number(bankAccLocal.balance) || 0) - totalNetSalary;
      }

      db.payroll.forEach((p: any) => {
        const pMonth = p.month || p.month_year || p.monthYear;
        if (p.tenantId === tenantId && pMonth === month && p.status === 'approved') {
          p.status = 'paid';
          p.paid_at = entryDate;
        }
      });

      saveLocalDatabase(db);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'POST_LEDGER',
      tableName: 'payroll',
      recordId: entryId,
      recordIdentifier: month,
      description: `تم ترحيل مسيرات رواتب شهر ${month} للقيود المحاسبية بالرقم ${entryId}.`
    });

    return res.json({
      message: '✅ تم ترحيل الرواتب للقيود المحاسبية بنجاح',
      entry_id: entryId,
      total_amount: totalNetSalary,
      employees_count: approvedPayrolls.length
    });
  } catch (error: any) {
    console.error('Error posting payroll to GL:', error);
    return res.status(500).json({ error: error.message });
  }
};
