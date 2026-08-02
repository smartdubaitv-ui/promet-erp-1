import fs from 'fs';
import path from 'path';
import { jsonDB } from '../data/jsonDatabase';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { createNotification } from './notification.service';
import { logger } from '../config/logger';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { SecurityService } from './security.service';
import { computePayrollForEmployee } from '../controllers/payroll.controller';

const AUTOMATION_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds (responsive for testing)

export function startAutomationScheduler() {
  logger.info("⚙️ Starting Promet ERP advanced automation scheduler (Payroll & Auto-Reordering)...");

  // Run an initial scan after 5 seconds to let databases load
  setTimeout(() => {
    runAutomationCheck().catch(err => {
      logger.error("❌ Error running startup automation checks:", err);
    });
  }, 5000);

  // Set up periodic check
  setInterval(() => {
    runAutomationCheck().catch(err => {
      logger.error("❌ Error running periodic automation checks:", err);
    });
  }, AUTOMATION_CHECK_INTERVAL);
}

async function runAutomationCheck() {
  const tenantId = "tenant-promet-sa";
  
  // 1. Run Auto-Reordering Checks
  await checkInventoryAndAutoReorder(tenantId);

  // 2. Run Month-End Payroll Calculations Draft Checks
  await checkMonthEndPayrollAndAutoCalculate(tenantId);

  // 3. Process Recurring Invoices
  await checkRecurringInvoices(tenantId);
}

async function checkRecurringInvoices(tenantId: string) {
  try {
    await RecurringInvoicesService.processRecurringInvoices(tenantId);
  } catch (error) {
    logger.error("❌ Failed in checkRecurringInvoices automation:", error);
  }
}

/**
 * 1. نظام إعادة الطلب التلقائي (Auto-Reordering)
 * يقوم بفحص كميات المنتجات بالمخزن، وإذا قلت عن حد إعادة الطلب، ينشئ مسودة أمر شراء تلقائياً
 */
async function checkInventoryAndAutoReorder(tenantId: string) {
  try {
    let products: any[] = [];
    let purchaseOrders: any[] = [];
    let contacts: any[] = [];

    // Load data based on active database
    if (isFirebaseConnected() && firestore) {
      const prodSnap = await firestore.collection('products').where('tenantId', '==', tenantId).get();
      products = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const poSnap = await firestore.collection('purchase_orders').get();
      purchaseOrders = poSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const contactsSnap = await firestore.collection('contacts').where('tenantId', '==', tenantId).get();
      contacts = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = jsonDB.load();
      products = (db.products || []).filter((p: any) => p.tenantId === tenantId);
      purchaseOrders = db.purchase_orders || [];
      contacts = (db.contacts || []).filter((c: any) => c.tenantId === tenantId);
    }

    // Find vendors
    const vendors = contacts.filter((c: any) => c.type === 'vendor');
    const defaultVendor = vendors.length > 0 ? vendors[0] : { id: 'contact-v-default', name: 'المورد المعتمد' };

    for (const prod of products) {
      const stock = Number(prod.stockQuantity !== undefined ? prod.stockQuantity : 0);
      const reorderPoint = Number(prod.reorderPoint !== undefined ? prod.reorderPoint : 5);

      // Check if product quantity is low
      if (stock <= reorderPoint && prod.isActive !== false) {
        // Check if there is already a pending/draft purchase order for this specific product
        const hasExistingPO = purchaseOrders.some((po: any) => 
          po.product_id === prod.id && 
          ['draft', 'received', 'pending_approval'].includes(po.status || 'draft')
        );

        if (!hasExistingPO) {
          logger.info(`🚨 Product "${prod.name}" has low stock (${stock}/${reorderPoint}). Generating automatic draft purchase order...`);

          // Trigger low_stock workflow event
          try {
            await WorkflowEngineService.triggerEvent(tenantId, 'low_stock', {
              id: prod.id,
              productName: prod.name,
              stockQuantity: stock,
              reorderPoint: reorderPoint,
              sku: prod.sku || '',
              unitPrice: prod.unitPrice || 0
            });
          } catch (wfErr) {
            logger.error(`❌ Failed triggering workflow event 'low_stock' for product: ${prod.name}`, wfErr);
          }

          const orderQty = Math.max(10, reorderPoint * 2);
          const total = orderQty * Number(prod.unitPrice || 100);
          const poId = `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

          const newPO = {
            id: poId,
            po_number: poNumber,
            product_id: prod.id,
            product_name: prod.name,
            vendor_id: defaultVendor.id,
            vendor_name: defaultVendor.name,
            quantity: orderQty,
            unit_price: Number(prod.unitPrice || 100),
            total: total,
            status: 'draft',
            created_at: new Date().toISOString(),
            tenantId: tenantId
          };

          // Save purchase order
          if (isFirebaseConnected() && firestore) {
            await firestore.collection('purchase_orders').doc(poId).set(newPO);
          } else {
            const db = jsonDB.load();
            if (!db.purchase_orders) db.purchase_orders = [];
            db.purchase_orders.push(newPO);
            jsonDB.save(db);
          }

          // Trigger System Notification for admin
          await createNotification({
            userId: 'u-1', // Default Admin ID
            tenantId: tenantId,
            type: 'warning',
            title: `إعادة طلب تلقائي للمخزون: ${prod.name} 📦`,
            message: `كمية منتج "${prod.name}" قاربت على النفاد (${stock} متوفرة، حد إعادة الطلب: ${reorderPoint}). قام النظام تلقائياً بإنشاء "مسودة أمر شراء" رقم ${poNumber} للمورد "${defaultVendor.name}" بانتظار الموافقة.`,
            link: '/accounts-payable'
          });

          // Also push to active purchaseOrders list if cached
          purchaseOrders.push(newPO);
        }
      }
    }
  } catch (error) {
    logger.error("❌ Failed in checkInventoryAndAutoReorder automation:", error);
  }
}

/**
 * 2. أتمتة احتساب الرواتب الشهرية (Month-End Payroll Auto-Calculation)
 * بمجرد انتهاء الشهر، يحتسب النظام تلقائياً مسيرات الرواتب كمستندات مسودة بانتظار موافقة المدير بـ "نقرة واحدة"
 */
async function checkMonthEndPayrollAndAutoCalculate(tenantId: string) {
  try {
    // Determine the calendar month to check.
    // For automation, we calculate payroll for the previous month once we enter a new month.
    const now = new Date();
    let prevMonthYear = now.getFullYear();
    let prevMonthNum = now.getMonth(); // 0-indexed, so 0 is Jan, 6 is Jul. Previous month of Jul (6) is Jun (5)

    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevMonthYear -= 1;
    }
    
    const prevMonthStr = `${prevMonthYear}-${prevMonthNum < 10 ? '0' + prevMonthNum : prevMonthNum}`;

    let payrollRecords: any[] = [];
    let employees: any[] = [];
    let attendance: any[] = [];
    let leaves: any[] = [];

    if (isFirebaseConnected() && firestore) {
      const payrollSnap = await firestore.collection('payroll').where('tenantId', '==', tenantId).get();
      payrollRecords = payrollSnap.docs.map(doc => doc.data());

      const empsSnap = await firestore.collection('employees').where('tenantId', '==', tenantId).get();
      employees = empsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const attSnap = await firestore.collection('attendance').where('tenantId', '==', tenantId).get();
      attendance = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const leavesSnap = await firestore.collection('leaves').where('tenantId', '==', tenantId).get();
      leaves = leavesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = jsonDB.load();
      payrollRecords = (db.payroll || []).filter((p: any) => p.tenantId === tenantId);
      employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);
      attendance = (db.attendance || []).filter((a: any) => a.tenantId === tenantId);
      leaves = (db.leaves || []).filter((l: any) => l.tenantId === tenantId);
    }

    // Filter active employees (excluding daily workers)
    const activeEmployees = employees.filter((emp: any) => {
      const wt = emp.worker_type || (emp.employment_type === 'daily' ? 'daily_worker' : emp.employment_type === 'probation' ? 'probation' : 'employee');
      return emp.status === 'active' && (wt === 'employee' || wt === 'probation');
    });

    if (activeEmployees.length === 0) return;

    // Check if payroll has already been generated/saved for the previous month
    const hasExistingPayroll = payrollRecords.some((p: any) => {
      const pMonth = p.month || p.month_year || p.monthYear;
      return pMonth === prevMonthStr;
    });

    if (!hasExistingPayroll) {
      logger.info(`🕒 Month ended! Running automatic monthly payroll draft generation for ${prevMonthStr}...`);

      const startDate = `${prevMonthStr}-01`;
      const endDay = new Date(prevMonthYear, prevMonthNum, 0).getDate();
      const endDate = `${prevMonthStr}-${endDay < 10 ? '0' + endDay : endDay}`;

      const generatedRecords: any[] = [];

      for (const emp of activeEmployees) {
        const empId = emp.id;
        const calc = computePayrollForEmployee(emp, attendance, leaves, prevMonthStr);
        const { basicSalary, allowance, presentDays, absentDays, leaveDays, annualLeaveDays, nonAnnualLeaveDays, overtimeHours, overtimeAmount, deductions: deductionAmount, socialInsurance, incomeTax, netSalary } = calc;
        const empName = emp.name || emp.full_name || 'موظف';

        const recordId = `payr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const payrRecord = {
          id: recordId,
          tenantId,
          employeeId: emp.id,
          employee_id: emp.id,
          employeeName: empName,
          employee_name: empName,
          month: prevMonthStr,
          month_year: prevMonthStr,
          monthYear: prevMonthStr,
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
          netSalary,
          net_salary: netSalary,
          status: 'draft',
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        generatedRecords.push(payrRecord);
      }

      // Save all generated records
      if (isFirebaseConnected() && firestore) {
        const batch = firestore.batch();
        for (const record of generatedRecords) {
          const docRef = firestore.collection('payroll').doc(record.id);
          batch.set(docRef, record);
        }
        await batch.commit();
      } else {
        const db = jsonDB.load();
        if (!db.payroll) db.payroll = [];
        const encryptedRecords = generatedRecords.map(record => SecurityService.encryptPayrollFields(record));
        db.payroll.push(...encryptedRecords);
        jsonDB.save(db);
      }

      // Trigger Notification for admin
      await createNotification({
        userId: 'u-1',
        tenantId: tenantId,
        type: 'success',
        title: `احتساب مسودة رواتب شهر ${prevMonthStr} تلقائياً 💰`,
        message: `انتهى الشهر وبادر النظام تلقائياً باحتساب الرواتب لعدد ${generatedRecords.length} موظفاً بناءً على سجلات الحضور والإجازات. مسودة الرواتب جاهزة الآن للاعتماد والموافقة بنقرة واحدة.`,
        link: '/hr'
      });

      logger.info(`✅ Successfully auto-generated monthly payroll drafts for ${prevMonthStr}.`);
    }
  } catch (error) {
    logger.error("❌ Failed in checkMonthEndPayrollAndAutoCalculate automation:", error);
  }
}
