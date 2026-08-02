import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import fs from 'fs';
import path from 'path';

import { jsonDB } from '../data/jsonDatabase';

function getLocalDatabase(): any {
  return jsonDB.load();
}

function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

/**
 * 1. توليد بيانات تجريبية شاملة (Seed Demo Data)
 */
export async function seedDemoData(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId || req.body?.tenantId || 'tenant-promet-sa';
    const now = new Date().toISOString();
    const todayStr = now.slice(0, 10);

    // ----------------------------------------------------
    // أ) الموظفون (22 موظفاً موزعين على كافة الأقسام)
    // ----------------------------------------------------
    const demoEmployees = [
      // 1. الإدارة المالية
      {
        id: 'emp-101',
        tenantId,
        name: 'أحمد علي السيد',
        full_name: 'أحمد علي السيد',
        email: 'ahmed.ali@company.com',
        phone: '+966501112233',
        nationalId: '10987654321',
        position: 'المدير المالي (CFO)',
        department: 'Finance',
        basicSalary: 22000,
        housingAllowance: 5000,
        transportAllowance: 1500,
        otherAllowances: 1000,
        status: 'active',
        joinDate: '2022-01-15',
        contractType: 'full_time',
        iban: 'SA0380000000123456789001',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-102',
        tenantId,
        name: 'محاسن فاروق الحصري',
        full_name: 'محاسن فاروق الحصري',
        email: 'mahasen@company.com',
        phone: '+966502223344',
        nationalId: '10876543210',
        position: 'رئيس قسم المحاسبة',
        department: 'Finance',
        basicSalary: 15000,
        housingAllowance: 3500,
        transportAllowance: 1000,
        otherAllowances: 500,
        status: 'active',
        joinDate: '2023-03-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789002',
        bankName: 'البنك الأهلي السعودي',
        createdAt: now,
      },
      {
        id: 'emp-103',
        tenantId,
        name: 'محمد عبدالفتاح علي',
        full_name: 'محمد عبدالفتاح علي',
        email: 'm.fatah@company.com',
        phone: '+966503334455',
        nationalId: '10765432109',
        position: 'أخصائي رواتب وبنوك أول',
        department: 'Finance',
        basicSalary: 11000,
        housingAllowance: 2500,
        transportAllowance: 800,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2024-02-10',
        contractType: 'full_time',
        iban: 'SA0380000000123456789003',
        bankName: 'بنك بنك الرياض',
        createdAt: now,
      },

      // 2. المبيعات والتسويق
      {
        id: 'emp-104',
        tenantId,
        name: 'خالد بن منصور العتيبي',
        full_name: 'خالد بن منصور العتيبي',
        email: 'khalid.m@company.com',
        phone: '+966504445566',
        nationalId: '10654321098',
        position: 'مدير المبيعات والتسويق',
        department: 'Sales',
        basicSalary: 20000,
        housingAllowance: 4500,
        transportAllowance: 1500,
        otherAllowances: 2000,
        status: 'active',
        joinDate: '2021-06-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789004',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-105',
        tenantId,
        name: 'ياسر عبدالله الغامدي',
        full_name: 'ياسر عبدالله الغامدي',
        email: 'yasser.g@company.com',
        phone: '+966505556677',
        nationalId: '10543210987',
        position: 'مسؤول كبار العملاء (KAM)',
        department: 'Sales',
        basicSalary: 13500,
        housingAllowance: 3000,
        transportAllowance: 1200,
        otherAllowances: 1500,
        status: 'active',
        joinDate: '2023-01-10',
        contractType: 'full_time',
        iban: 'SA0380000000123456789005',
        bankName: 'مصرف الإنماء',
        createdAt: now,
      },
      {
        id: 'emp-106',
        tenantId,
        name: 'سارة محمد الشمري',
        full_name: 'سارة محمد الشمري',
        email: 'sara.s@company.com',
        phone: '+966506667788',
        nationalId: '10432109876',
        position: 'أخصائية تسويق رقمي وإعلام',
        department: 'Sales',
        basicSalary: 10500,
        housingAllowance: 2500,
        transportAllowance: 800,
        otherAllowances: 300,
        status: 'active',
        joinDate: '2024-05-15',
        contractType: 'full_time',
        iban: 'SA0380000000123456789006',
        bankName: 'البنك الأهلي السعودي',
        createdAt: now,
      },
      {
        id: 'emp-107',
        tenantId,
        name: 'طارق بن عبدالعزيز الحازمي',
        full_name: 'طارق بن عبدالعزيز الحازمي',
        email: 'tariq.h@company.com',
        phone: '+966507778899',
        nationalId: '10321098765',
        position: 'ممثل مبيعات وتطوير أعمال',
        department: 'Sales',
        basicSalary: 8000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        otherAllowances: 1000,
        status: 'active',
        joinDate: '2024-08-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789007',
        bankName: 'بنك البلاد',
        createdAt: now,
      },

      // 3. الموارد البشرية
      {
        id: 'emp-108',
        tenantId,
        name: 'فاطمة الزهراء حسن',
        full_name: 'فاطمة الزهراء حسن',
        email: 'fatima.hr@company.com',
        phone: '+966508889900',
        nationalId: '10210987654',
        position: 'مديرة الموارد البشرية (HR Manager)',
        department: 'Human Resources',
        basicSalary: 18000,
        housingAllowance: 4000,
        transportAllowance: 1200,
        otherAllowances: 800,
        status: 'active',
        joinDate: '2022-09-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789008',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-109',
        tenantId,
        name: 'عبدالمجيد الدوسري',
        full_name: 'عبدالمجيد الدوسري',
        email: 'abdulmajeed@company.com',
        phone: '+966509990011',
        nationalId: '10109876543',
        position: 'أخصائي توظيف وجذب مواهب',
        department: 'Human Resources',
        basicSalary: 11500,
        housingAllowance: 2500,
        transportAllowance: 800,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2023-11-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789009',
        bankName: 'البنك السعودي الفرنسي',
        createdAt: now,
      },
      {
        id: 'emp-110',
        tenantId,
        name: 'هند ناصر المطيري',
        full_name: 'هند ناصر المطيري',
        email: 'hind.m@company.com',
        phone: '+966500001122',
        nationalId: '10098765432',
        position: 'منسقة شئون موظفين وعقود',
        department: 'Human Resources',
        basicSalary: 8500,
        housingAllowance: 2000,
        transportAllowance: 700,
        otherAllowances: 300,
        status: 'active',
        joinDate: '2024-01-20',
        contractType: 'full_time',
        iban: 'SA0380000000123456789010',
        bankName: 'بنك الرياض',
        createdAt: now,
      },

      // 4. المشتريات وسلسلة الإمداد
      {
        id: 'emp-111',
        tenantId,
        name: 'عمر الفاروق بن سعيد',
        full_name: 'عمر الفاروق بن سعيد',
        email: 'omar.f@company.com',
        phone: '+966511112233',
        nationalId: '10998877665',
        position: 'مدير المشتريات وسلسلة الإمداد',
        department: 'Procurement',
        basicSalary: 17500,
        housingAllowance: 4000,
        transportAllowance: 1200,
        otherAllowances: 600,
        status: 'active',
        joinDate: '2022-04-10',
        contractType: 'full_time',
        iban: 'SA0380000000123456789011',
        bankName: 'البنك الأهلي السعودي',
        createdAt: now,
      },
      {
        id: 'emp-112',
        tenantId,
        name: 'وليد بن خالد السليم',
        full_name: 'وليد بن خالد السليم',
        email: 'waleed.s@company.com',
        phone: '+966522223344',
        nationalId: '10887766554',
        position: 'أخصائي مشتريات ومناقصات',
        department: 'Procurement',
        basicSalary: 11000,
        housingAllowance: 2500,
        transportAllowance: 800,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2023-07-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789012',
        bankName: 'مصرف الإنماء',
        createdAt: now,
      },

      // 5. المخازن والمستودعات
      {
        id: 'emp-113',
        tenantId,
        name: 'إبراهيم أحمد الشريف',
        full_name: 'إبراهيم أحمد الشريف',
        email: 'ibrahim.s@company.com',
        phone: '+966533334455',
        nationalId: '10776655443',
        position: 'مشرف المستودع المركزي',
        department: 'Inventory',
        basicSalary: 12000,
        housingAllowance: 2500,
        transportAllowance: 1000,
        otherAllowances: 500,
        status: 'active',
        joinDate: '2022-11-15',
        contractType: 'full_time',
        iban: 'SA0380000000123456789013',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-114',
        tenantId,
        name: 'بدر بن ناصر الزهراني',
        full_name: 'بدر بن ناصر الزهراني',
        email: 'badr.z@company.com',
        phone: '+966544445566',
        nationalId: '10665544332',
        position: 'أمين مخزن ومراقب مخزون',
        department: 'Inventory',
        basicSalary: 8500,
        housingAllowance: 2000,
        transportAllowance: 700,
        otherAllowances: 300,
        status: 'active',
        joinDate: '2023-10-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789014',
        bankName: 'بنك البلاد',
        createdAt: now,
      },
      {
        id: 'emp-115',
        tenantId,
        name: 'حسن درويش درويش',
        full_name: 'حسن درويش درويش',
        email: 'hassan.d@company.com',
        phone: '+966555556677',
        nationalId: '10554433221',
        position: 'فني مناولة وتجهيز طلبات',
        department: 'Inventory',
        basicSalary: 6000,
        housingAllowance: 1500,
        transportAllowance: 600,
        otherAllowances: 200,
        status: 'active',
        joinDate: '2024-03-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789015',
        bankName: 'بنك الرياض',
        createdAt: now,
      },

      // 6. السائقين والنقل واللوجستيات
      {
        id: 'emp-116',
        tenantId,
        name: 'صالح بن سعيد السلمي',
        full_name: 'صالح بن سعيد السلمي',
        email: 'saleh.s@company.com',
        phone: '+966566667788',
        nationalId: '10443322110',
        position: 'مدير الحركة والأسطول',
        department: 'Logistics',
        basicSalary: 14000,
        housingAllowance: 3000,
        transportAllowance: 1200,
        otherAllowances: 800,
        status: 'active',
        joinDate: '2021-08-15',
        contractType: 'full_time',
        iban: 'SA0380000000123456789016',
        bankName: 'البنك الأهلي السعودي',
        createdAt: now,
      },
      {
        id: 'emp-117',
        tenantId,
        name: 'عثمان إبراهيم هوساوي',
        full_name: 'عثمان إبراهيم هوساوي',
        email: 'othman.h@company.com',
        phone: '+966577778899',
        nationalId: '10332211009',
        position: 'سائق شاحنة ثقيلة (تريلا)',
        department: 'Logistics',
        basicSalary: 7500,
        housingAllowance: 1500,
        transportAllowance: 800,
        otherAllowances: 500,
        status: 'active',
        joinDate: '2022-02-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789017',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-118',
        tenantId,
        name: 'راشد بن سالم المري',
        full_name: 'راشد بن سالم المري',
        email: 'rashed.m@company.com',
        phone: '+966588889900',
        nationalId: '10221100998',
        position: 'سائق دينات ونقل سريع',
        department: 'Logistics',
        basicSalary: 6500,
        housingAllowance: 1500,
        transportAllowance: 700,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2023-04-10',
        contractType: 'full_time',
        iban: 'SA0380000000123456789018',
        bankName: 'مصرف الإنماء',
        createdAt: now,
      },
      {
        id: 'emp-119',
        tenantId,
        name: 'توفيق بن علي القحطاني',
        full_name: 'توفيق بن علي القحطاني',
        email: 'tawfiq.q@company.com',
        phone: '+966599990011',
        nationalId: '10110099887',
        position: 'سائق نقل خردة ومواد',
        department: 'Logistics',
        basicSalary: 6800,
        housingAllowance: 1500,
        transportAllowance: 700,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2023-09-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789019',
        bankName: 'بنك البلاد',
        createdAt: now,
      },

      // 7. التقنية والصيانة
      {
        id: 'emp-120',
        tenantId,
        name: 'مازن بن عبدالله الحربي',
        full_name: 'مازن بن عبدالله الحربي',
        email: 'mazen.h@company.com',
        phone: '+966501234567',
        nationalId: '10001122334',
        position: 'مهندس شبكات وبنية تحتية',
        department: 'IT',
        basicSalary: 16000,
        housingAllowance: 3500,
        transportAllowance: 1000,
        otherAllowances: 500,
        status: 'active',
        joinDate: '2022-05-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789020',
        bankName: 'بنك الراجحي',
        createdAt: now,
      },
      {
        id: 'emp-121',
        tenantId,
        name: 'كمال الدين مصطفى عبده',
        full_name: 'كمال الدين مصطفى عبده',
        email: 'kamal.m@company.com',
        phone: '+966502345678',
        nationalId: '10990011223',
        position: 'مهندس صيانة ومعدات ثقيلة',
        department: 'Maintenance',
        basicSalary: 13000,
        housingAllowance: 3000,
        transportAllowance: 900,
        otherAllowances: 400,
        status: 'active',
        joinDate: '2023-02-15',
        contractType: 'full_time',
        iban: 'SA0380000000123456789021',
        bankName: 'البنك الأهلي السعودي',
        createdAt: now,
      },
      {
        id: 'emp-122',
        tenantId,
        name: 'ريم بنت صالح القحطاني',
        full_name: 'ريم بنت صالح القحطاني',
        email: 'reem.q@company.com',
        phone: '+966503456789',
        nationalId: '10889900112',
        position: 'أخصائية دعم فني ونظم',
        department: 'IT',
        basicSalary: 9500,
        housingAllowance: 2000,
        transportAllowance: 800,
        otherAllowances: 300,
        status: 'active',
        joinDate: '2024-04-01',
        contractType: 'full_time',
        iban: 'SA0380000000123456789022',
        bankName: 'بنك الرياض',
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // ب) مسيرات الرواتب والمستحقات (Payroll & Payslips)
    // ----------------------------------------------------
    const demoPayroll: any[] = [];
    const monthsToSeed = ['2026-05', '2026-06'];

    monthsToSeed.forEach((m) => {
      demoEmployees.forEach((e) => {
        const basic = e.basicSalary;
        const allowances = e.housingAllowance + e.transportAllowance + e.otherAllowances;
        const overtime = Math.floor(Math.random() * 500);
        const deductions = Math.floor(Math.random() * 300);
        const socialInsurance = Math.round(basic * 0.09); // 9% GOSI / Insurance
        const advanceDeduction = e.id === 'emp-105' ? 2000 : (e.id === 'emp-113' ? 2000 : 0);
        const netSalary = basic + allowances + overtime - deductions - socialInsurance - advanceDeduction;

        demoPayroll.push({
          id: `pay-${m}-${e.id}`,
          tenantId,
          employeeId: e.id,
          employee_id: e.id,
          employeeName: e.name,
          employee_name: e.name,
          month: m,
          month_year: m,
          basicSalary: basic,
          allowance: allowances,
          overtimeAmount: overtime,
          deductions,
          advanceDeduction,
          advance_deduction: advanceDeduction,
          socialInsurance,
          incomeTax: 0,
          netSalary,
          net_salary: netSalary,
          status: 'approved',
          createdAt: `${m}-28T10:00:00.000Z`,
        });
      });
    });

    // ----------------------------------------------------
    // ج) الخزائن والمالية (Treasury & Vaults)
    // ----------------------------------------------------
    const demoVaults = [
      {
        id: 'vault-1',
        tenantId,
        name: 'الخزينة الرئيسية (النقدية)',
        type: 'cash',
        balance: 145000,
        currency: 'SAR',
        accountNumber: 'CASH-MAIN-01',
        bankName: 'الخزينة الداخلية',
        status: 'active',
        updatedAt: now,
      },
      {
        id: 'vault-2',
        tenantId,
        name: 'الخزينة الفرعية - مواقع المشاريع',
        type: 'cash',
        balance: 35000,
        currency: 'SAR',
        accountNumber: 'CASH-SUB-02',
        bankName: 'الخزينة الفرعية',
        status: 'active',
        updatedAt: now,
      },
      {
        id: 'vault-3',
        tenantId,
        name: 'حساب مصرف الراجحي الجاري',
        type: 'bank',
        balance: 850000,
        currency: 'SAR',
        accountNumber: 'SA8080000001234567890123',
        bankName: 'مصرف الراجحي',
        status: 'active',
        updatedAt: now,
      },
      {
        id: 'vault-4',
        tenantId,
        name: 'حساب البنك الأهلي السعودي - العمليات',
        type: 'bank',
        balance: 1250000,
        currency: 'SAR',
        accountNumber: 'SA1010000009876543210987',
        bankName: 'البنك الأهلي السعودي',
        status: 'active',
        updatedAt: now,
      }
    ];

    const demoVouchers = [
      {
        id: 'vouch-101',
        tenantId,
        vaultId: 'vault-3',
        direction: 'in',
        voucherType: 'receipt',
        amount: 85000,
        date: '2026-06-05',
        description: 'تحصيل دفعة فاتورة INV-2026-101 - شركة النهضة للمقاولات',
        performedBy: 'أحمد علي السيد',
        balanceAfter: 850000,
        createdAt: now,
      },
      {
        id: 'vouch-102',
        tenantId,
        vaultId: 'vault-4',
        direction: 'out',
        voucherType: 'payment',
        amount: 38000,
        date: '2026-06-12',
        description: 'سداد مشتريات اسمنت ومواد بناء - مؤسسة الأمل للتوريدات',
        performedBy: 'عمر الفاروق بن سعيد',
        balanceAfter: 1250000,
        createdAt: now,
      },
      {
        id: 'vouch-103',
        tenantId,
        vaultId: 'vault-1',
        direction: 'out',
        voucherType: 'employee_advance_or_salary',
        amount: 12000,
        date: '2026-06-15',
        description: 'صرف سلفة للموظف ياسر عبدالله الغامدي - ظرف عائلي طارئ',
        employeeId: 'emp-105',
        performedBy: 'أحمد علي السيد',
        balanceAfter: 145000,
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // د) العملاء والموردين والفواتير (Sales & Invoices)
    // ----------------------------------------------------
    const demoContacts = [
      {
        id: 'c-101',
        tenantId,
        name: 'شركة النهضة للمقاولات العامة',
        type: 'customer',
        phone: '+966501122334',
        email: 'info@alnahda-const.sa',
        taxNumber: '300458129300003',
        address: 'طريق الملك فهد، الرياض، المملكة العربية السعودية',
        balance: 65000,
        createdAt: now,
      },
      {
        id: 'c-102',
        tenantId,
        name: 'مجموعة البناء والتعمير الحديثة',
        type: 'customer',
        phone: '+966505544332',
        email: 'projects@modernbuild.sa',
        taxNumber: '310987654300003',
        address: 'حي الزهراء، جدة، المملكة العربية السعودية',
        balance: 0,
        createdAt: now,
      },
      {
        id: 'c-103',
        tenantId,
        name: 'شركة الرياض للتطوير العقاري',
        type: 'customer',
        phone: '+966509988776',
        email: 'contracts@riyadh-dev.sa',
        taxNumber: '300123987600003',
        address: 'شارع العليا، الرياض، المملكة العربية السعودية',
        balance: 94000,
        createdAt: now,
      },
      {
        id: 'c-104',
        tenantId,
        name: 'مؤسسة الأمل للتوريدات والتجارة',
        type: 'vendor',
        phone: '+966503322110',
        email: 'sales@alamal-supplies.com',
        taxNumber: '301122334400003',
        address: 'المنطقة الصناعية، الدمام، المملكة العربية السعودية',
        balance: 18000,
        createdAt: now,
      },
      {
        id: 'c-105',
        tenantId,
        name: 'شركة مصانع الحديد المتحد',
        type: 'vendor',
        phone: '+966504455667',
        email: 'orders@unitedsteel.com',
        taxNumber: '302233445500003',
        address: 'المدينة الصناعية الثانية، الرياض، المملكة العربية السعودية',
        balance: 45000,
        createdAt: now,
      }
    ];

    const demoInvoices = [
      {
        id: 'inv-101',
        tenantId,
        invoiceNumber: 'INV-2026-101',
        contactId: 'c-101',
        contactName: 'شركة النهضة للمقاولات العامة',
        type: 'sales',
        issueDate: '2026-06-01',
        dueDate: '2026-06-15',
        status: 'paid',
        items: [
          { id: 'item-1', name: 'حديد تسليح 12 ملم (طن)', quantity: 25, unitPrice: 2850, total: 71250 },
          { id: 'item-2', name: 'اسمنت بورتلاندي (كيس)', quantity: 100, unitPrice: 28, total: 2680 }
        ],
        subtotal: 73930,
        taxAmount: 11089.5,
        totalAmount: 85019.5,
        paidAmount: 85019.5,
        qrCode: 'zatca-qr-code-demo-101',
        createdAt: now,
      },
      {
        id: 'inv-102',
        tenantId,
        invoiceNumber: 'INV-2026-102',
        contactId: 'c-102',
        contactName: 'مجموعة البناء والتعمير الحديثة',
        type: 'sales',
        issueDate: '2026-06-10',
        dueDate: '2026-06-25',
        status: 'paid',
        items: [
          { id: 'item-3', name: 'كيابل كهربائية 10 ملم (لفة)', quantity: 10, unitPrice: 420, total: 4200 },
          { id: 'item-4', name: 'أنبوب بلاستيك PVC 4 بوصة', quantity: 200, unitPrice: 65, total: 13000 }
        ],
        subtotal: 17200,
        taxAmount: 2580,
        totalAmount: 19780,
        paidAmount: 19780,
        qrCode: 'zatca-qr-code-demo-102',
        createdAt: now,
      },
      {
        id: 'inv-103',
        tenantId,
        invoiceNumber: 'INV-2026-103',
        contactId: 'c-101',
        contactName: 'شركة النهضة للمقاولات العامة',
        type: 'sales',
        issueDate: '2026-07-01',
        dueDate: '2026-07-20',
        status: 'unpaid',
        items: [
          { id: 'item-5', name: 'حديد تسليح 12 ملم (طن)', quantity: 20, unitPrice: 2850, total: 57000 }
        ],
        subtotal: 57000,
        taxAmount: 8550,
        totalAmount: 65550,
        paidAmount: 0,
        qrCode: 'zatca-qr-code-demo-103',
        createdAt: now,
      },
      {
        id: 'inv-104',
        tenantId,
        invoiceNumber: 'INV-2026-104',
        contactId: 'c-103',
        contactName: 'شركة الرياض للتطوير العقاري',
        type: 'sales',
        issueDate: '2026-05-15',
        dueDate: '2026-06-15',
        status: 'overdue',
        items: [
          { id: 'item-6', name: 'حاسوب مكتبي للأعمال i7', quantity: 10, unitPrice: 3800, total: 38000 },
          { id: 'item-7', name: 'شاشة عرض 27 بوصة HD', quantity: 10, unitPrice: 850, total: 8500 }
        ],
        subtotal: 46500,
        taxAmount: 6975,
        totalAmount: 53475,
        paidAmount: 0,
        qrCode: 'zatca-qr-code-demo-104',
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // هـ) المنتجات والمخزون (Inventory & Products)
    // ----------------------------------------------------
    const demoProducts = [
      {
        id: 'p-101',
        tenantId,
        name: 'حديد تسليح 12 ملم (مباني)',
        sku: 'STL-12MM',
        description: 'حديد تسليح عالي المقاومة للخرسانة المسلحة',
        category: 'مواد بناء وتشييد',
        unitPrice: 2850,
        costPrice: 2400,
        stockQuantity: 120,
        minStock: 20,
        unit: 'طن',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-102',
        tenantId,
        name: 'اسمنت بورتلاندي عادي (كيس 50 كجم)',
        sku: 'CMT-50KG',
        description: 'اسمنت بورتلاندي مطابق للمواصفات القياسية السعودية',
        category: 'مواد بناء وتشييد',
        unitPrice: 28,
        costPrice: 22,
        stockQuantity: 450,
        minStock: 100,
        unit: 'كيس',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-103',
        tenantId,
        name: 'كيابل كهربائية نحاس 10 ملم3 (لفة 100م)',
        sku: 'CBL-10MM',
        description: 'كيابل معزولة مقاومة للحرارة العالية',
        category: 'كهرباء وتقنية',
        unitPrice: 420,
        costPrice: 340,
        stockQuantity: 8, // ⚠️ أقل من الحد الأدنى لتفعيل التنبيهات
        minStock: 15,
        unit: 'لفة',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-104',
        tenantId,
        name: 'أنبوب بلاستيك PVC مقاس 4 بوصة',
        sku: 'PVC-4INCH',
        description: 'أنابيب تصريف مياه وصرف صحي مقاومة للضغط',
        category: 'سباكة وبنية تحتية',
        unitPrice: 65,
        costPrice: 48,
        stockQuantity: 300,
        minStock: 50,
        unit: 'قطعة',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-105',
        tenantId,
        name: 'زيت هيدروليك معدات ثقيلة (جالون 20 لتر)',
        sku: 'OIL-HYD20L',
        description: 'زيت تشغيل الروافع والمعدات الثقيلة',
        category: 'قطع غيار وصيانة',
        unitPrice: 310,
        costPrice: 250,
        stockQuantity: 4, // ⚠️ أقل من الحد الأدنى لتفعيل التنبيهات
        minStock: 10,
        unit: 'جالون',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-106',
        tenantId,
        name: 'حاسوب مكتبي للأعمال Core i7',
        sku: 'PC-DELL-I7',
        description: 'جهاز كمبيوتر مكتبي للمكاتب والمهندسين مع شاشة',
        category: 'أجهزة ومعدات تقنية',
        unitPrice: 3800,
        costPrice: 3100,
        stockQuantity: 18,
        minStock: 5,
        unit: 'جهاز',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-107',
        tenantId,
        name: 'شاشة عرض 27 بوصة HD متقدمة',
        sku: 'MON-27INCH',
        description: 'شاشة عالية الوضوح لمكاتب التصميم والمحاسبة',
        category: 'أجهزة ومعدات تقنية',
        unitPrice: 850,
        costPrice: 680,
        stockQuantity: 22,
        minStock: 5,
        unit: 'شاشة',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-108',
        tenantId,
        name: 'طابعة ليزر متعددة الوظائف ملونة',
        sku: 'PRN-LASER-HP',
        description: 'طابعة ماسح ضوئي وتصوير سريعة للمستندات',
        category: 'أجهزة ومعدات تقنية',
        unitPrice: 1600,
        costPrice: 1250,
        stockQuantity: 3, // ⚠️ أقل من الحد الأدنى لتفعيل التنبيهات
        minStock: 5,
        unit: 'جهاز',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-109',
        tenantId,
        name: 'نحاس سكراب خردة نقي (كجم)',
        sku: 'SCRAP-COPPER',
        description: 'مخلفات نحاس أحمر نقي من تفكيك المولدات',
        category: 'خردة وسكراب',
        unitPrice: 38,
        costPrice: 30,
        stockQuantity: 1450,
        minStock: 200,
        unit: 'كجم',
        status: 'active',
        createdAt: now,
      },
      {
        id: 'p-110',
        tenantId,
        name: 'حديد هيكلي سكراب ومخلفات مصانع (طن)',
        sku: 'SCRAP-STEEL',
        description: 'حديد خردة ثقيل صالح لإعادة التدوير',
        category: 'خردة وسكراب',
        unitPrice: 1100,
        costPrice: 850,
        stockQuantity: 65,
        minStock: 10,
        unit: 'طن',
        status: 'active',
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // و) الشحن والنقل (Shipping & Logistics)
    // ----------------------------------------------------
    const demoShipping = [
      {
        id: 'shp-101',
        tenantId,
        trackingNumber: 'TRK-2026-901',
        routeName: 'الرياض ⬅️ جدة',
        origin: 'المستودع المركزي - الرياض',
        destination: 'موقع مشروع البرج - جدة',
        driverId: 'emp-117',
        driverName: 'عثمان إبراهيم هوساوي',
        vehicleNumber: 'أ ب ج 1234 (مرسيدس أكتروس)',
        cargoDescription: 'حمولة حديد تسليح 25 طن',
        weightTons: 25,
        cost: 3500,
        status: 'delivered',
        createdAt: now,
      },
      {
        id: 'shp-102',
        tenantId,
        trackingNumber: 'TRK-2026-902',
        routeName: 'الدمام ⬅️ الرياض',
        origin: 'مصنع الحديد المتحد - الدمام',
        destination: 'مستودع السكراب - الرياض',
        driverId: 'emp-119',
        driverName: 'توفيق بن علي القحطاني',
        vehicleNumber: 'ر س ط 5678 (مان ثقيل)',
        cargoDescription: 'نقل سكراب ونحاس معزول 18 طن',
        weightTons: 18,
        cost: 2800,
        status: 'in_transit',
        createdAt: now,
      },
      {
        id: 'shp-103',
        tenantId,
        trackingNumber: 'TRK-2026-903',
        routeName: 'الرياض ⬅️ الخرج',
        origin: 'المستودع الرئيسي - الرياض',
        destination: 'فرع الشركة - الخرج',
        driverId: 'emp-118',
        driverName: 'راشد بن سالم المري',
        vehicleNumber: 'ح خ د 9101 (دينا إيسوزو)',
        cargoDescription: 'أجهزة حاسوب ومستلزمات مكتبية',
        weightTons: 2,
        cost: 950,
        status: 'delivered',
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // ز) السكراب والخرداء (Scrap Operations)
    // ----------------------------------------------------
    const demoScrap = [
      {
        id: 'scrap-101',
        tenantId,
        type: 'purchase',
        metalType: 'نحاس أحمر ممتاز',
        weightKg: 3500,
        weightTons: 3.5,
        unitPrice: 38,
        totalPrice: 133000,
        scaleTicketNumber: 'BSK-8841',
        partyName: 'شركة المعادن النقية',
        expenses: 2500,
        notes: 'تم الوزن بميزان البسكول الآلي رقم 1 مع تحرير تذكرة وزن رسمية',
        date: '2026-06-08',
        createdAt: now,
      },
      {
        id: 'scrap-102',
        tenantId,
        type: 'sale',
        metalType: 'حديد سكراب ثقيل',
        weightKg: 18000,
        weightTons: 18.0,
        unitPrice: 1.3,
        totalPrice: 23400,
        scaleTicketNumber: 'BSK-8842',
        partyName: 'مصنع الصلب الوطني',
        expenses: 1200,
        notes: 'بيع وتفريغ كبائن الحديد في موقع العميل',
        date: '2026-06-18',
        createdAt: now,
      }
    ];

    // ----------------------------------------------------
    // ح) السلف والقروض (Employee Advances)
    // ----------------------------------------------------
    const demoAdvances = [
      {
        id: 'adv-101',
        tenantId,
        employeeId: 'emp-105',
        employeeName: 'ياسر عبدالله الغامدي',
        amount: 12000,
        reason: 'ظرف عائلي طارئ وسداد رسوم',
        repaymentMethod: 'installments',
        installmentsCount: 6,
        monthlyInstallmentAmount: 2000,
        startMonth: '2026-05',
        status: 'approved',
        vaultId: 'vault-1',
        requestedBy: 'ياسر عبدالله الغامدي',
        approvedBy: 'أحمد علي السيد',
        createdAt: '2026-05-01T10:00:00.000Z',
        updatedAt: now,
      },
      {
        id: 'adv-102',
        tenantId,
        employeeId: 'emp-113',
        employeeName: 'إبراهيم أحمد الشريف',
        amount: 6000,
        reason: 'مصاريف علاجية طارئة',
        repaymentMethod: 'installments',
        installmentsCount: 3,
        monthlyInstallmentAmount: 2000,
        startMonth: '2026-04',
        status: 'approved',
        vaultId: 'vault-1',
        requestedBy: 'إبراهيم أحمد الشريف',
        approvedBy: 'أحمد علي السيد',
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: now,
      }
    ];

    const demoInstallments = [
      { id: 'advinst-adv-101-0', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-05', amount: 2000, status: 'deducted', deductedInPayrollId: 'pay-2026-05-emp-105' },
      { id: 'advinst-adv-101-1', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-06', amount: 2000, status: 'deducted', deductedInPayrollId: 'pay-2026-06-emp-105' },
      { id: 'advinst-adv-101-2', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-07', amount: 2000, status: 'due' },
      { id: 'advinst-adv-101-3', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-08', amount: 2000, status: 'due' },
      { id: 'advinst-adv-101-4', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-09', amount: 2000, status: 'due' },
      { id: 'advinst-adv-101-5', tenantId, advanceId: 'adv-101', employeeId: 'emp-105', month: '2026-10', amount: 2000, status: 'due' },

      { id: 'advinst-adv-102-0', tenantId, advanceId: 'adv-102', employeeId: 'emp-113', month: '2026-04', amount: 2000, status: 'deducted' },
      { id: 'advinst-adv-102-1', tenantId, advanceId: 'adv-102', employeeId: 'emp-113', month: '2026-05', amount: 2000, status: 'deducted', deductedInPayrollId: 'pay-2026-05-emp-113' },
      { id: 'advinst-adv-102-2', tenantId, advanceId: 'adv-102', employeeId: 'emp-113', month: '2026-06', amount: 2000, status: 'deducted', deductedInPayrollId: 'pay-2026-06-emp-113' }
    ];

    // ----------------------------------------------------
    // ط) المشاريع والأصول الثابتة (Projects & Assets)
    // ----------------------------------------------------
    const demoProjects = [
      {
        id: 101,
        tenantId,
        name: 'مشروع برج النخيل السكني الفاخر',
        code: 'PRJ-2026-01',
        description: 'إنشاء برج سكني وتجاري بارتفاع 18 طابقاً مع مواقف سفلية',
        client_name: 'شركة النهضة للمقاولات العامة',
        project_manager_name: 'أحمد علي السيد',
        start_date: '2026-01-10',
        end_date: '2026-12-31',
        budget: 8500000,
        priority: 'high',
        status: 'in_progress',
        progress: 42,
        createdAt: now,
      },
      {
        id: 102,
        tenantId,
        name: 'مشروع مجمع المستودعات المركزية',
        code: 'PRJ-2026-02',
        description: 'تجهيز وتشييد 4 مستودعات مغلقة بالمنطقة الصناعية الثانية',
        client_name: 'مجموعة البناء والتعمير الحديثة',
        project_manager_name: 'إبراهيم أحمد الشريف',
        start_date: '2026-03-01',
        end_date: '2026-09-30',
        budget: 3200000,
        priority: 'medium',
        status: 'in_progress',
        progress: 68,
        createdAt: now,
      }
    ];

    const demoTasks = [
      { id: 201, tenantId, project_id: 101, title: 'أعمال صب الخرسانة المسلحة للأساسات والقواعد', assigned_to: 'كمال الدين مصطفى', status: 'completed', due_date: '2026-03-15' },
      { id: 202, tenantId, project_id: 101, title: 'توريد وتركيب هيكل حديد التسليح للطوابق الأولى', assigned_to: 'عمر الفاروق بن سعيد', status: 'in_progress', due_date: '2026-07-30' },
      { id: 203, tenantId, project_id: 102, title: 'تركيب العزل الحراري وأبواب الهيدروليك التلقائية', assigned_to: 'إبراهيم أحمد الشريف', status: 'in_progress', due_date: '2026-08-15' }
    ];

    const demoAssets = [
      { id: 'ast-101', tenantId, name: 'شاحنة نقل هينو ثقيلة 2024', category: 'الأسطول والمركبات', cost: 280000, purchaseDate: '2024-01-15', location: 'مستودع الأسطول', status: 'active' },
      { id: 'ast-102', tenantId, name: 'رافعة شوكية تويوتا 3 طن', category: 'المعدات والآلات', cost: 95000, purchaseDate: '2023-06-20', location: 'المستودع الرئيسي', status: 'active' },
      { id: 'ast-103', tenantId, name: 'مولد كهربائي كاتربيلر 150 KVA', category: 'المعدات والآلات', cost: 120000, purchaseDate: '2023-11-05', location: 'موقع برج النخيل', status: 'active' },
      { id: 'ast-104', tenantId, name: 'مكبس خردة هيدروليكي ألماني', category: 'معدات السكراب', cost: 340000, purchaseDate: '2022-08-10', location: 'ساحة الخردة المركزية', status: 'active' }
    ];

    // ----------------------------------------------------
    // حفظ البيانات في database.json وفي Firebase (إن وجد)
    // ----------------------------------------------------
    const db = getLocalDatabase();

    db.employees = demoEmployees;
    db.payroll = demoPayroll;
    db.vaults = demoVaults;
    db.treasury_vouchers = demoVouchers;
    db.contacts = demoContacts;
    db.invoices = demoInvoices;
    db.products = demoProducts;
    db.shipping = demoShipping;
    db.scrap = demoScrap;
    db.employee_advances = demoAdvances;
    db.advance_installments = demoInstallments;
    db.projects = demoProjects;
    db.project_tasks = demoTasks;
    db.assets = demoAssets;

    saveLocalDatabase(db);

    // إذا كان Firebase متصلاً، نقوم بتحديث المجموعات أيضاً
    if (isFirebaseConnected() && firestore) {
      const collectionsMap: Record<string, any[]> = {
        employees: demoEmployees,
        payroll: demoPayroll,
        vaults: demoVaults,
        treasury_vouchers: demoVouchers,
        contacts: demoContacts,
        invoices: demoInvoices,
        products: demoProducts,
        shipping: demoShipping,
        scrap: demoScrap,
        employee_advances: demoAdvances,
        advance_installments: demoInstallments,
        projects: demoProjects,
        project_tasks: demoTasks,
        assets: demoAssets,
      };

      for (const [colName, items] of Object.entries(collectionsMap)) {
        try {
          // حذف القديم
          const snap = await firestore.collection(colName).where('tenantId', '==', tenantId).get();
          const batch = firestore.batch();
          snap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();

          // إضافة الجديد
          for (const item of items) {
            await firestore.collection(colName).doc(item.id ? String(item.id) : undefined).set(item, { merge: true });
          }
        } catch (fbErr) {
          console.error(`Error seeding Firestore collection ${colName}:`, fbErr);
        }
      }
    }

    return res.json({
      success: true,
      message: '✅ تم توليد وتحديث جميع البيانات التجريبية بنجاح بنسبة 100%!',
      summary: {
        employeesCount: demoEmployees.length,
        payrollCount: demoPayroll.length,
        vaultsCount: demoVaults.length,
        vouchersCount: demoVouchers.length,
        contactsCount: demoContacts.length,
        invoicesCount: demoInvoices.length,
        productsCount: demoProducts.length,
        shippingCount: demoShipping.length,
        scrapCount: demoScrap.length,
        advancesCount: demoAdvances.length,
        projectsCount: demoProjects.length,
        assetsCount: demoAssets.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in seedDemoData:', error);
    return res.status(500).json({ error: 'فشل توليد البيانات التجريبية: ' + error.message });
  }
}

/**
 * 2. مسح وتصفير البيانات التجريبية (Clear Demo Data)
 */
export async function clearDemoData(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId || req.body?.tenantId || 'tenant-promet-sa';
    const db = getLocalDatabase();

    const collectionsToClear = [
      'employees',
      'payroll',
      'invoices',
      'products',
      'contacts',
      'purchases',
      'projects',
      'project_tasks',
      'project_team',
      'scrap',
      'shipping',
      'treasury_vouchers',
      'employee_advances',
      'advance_installments',
      'inventory_movements',
      'expenses',
      'assets',
      'vaults',
      'audit_log',
      'notifications',
    ];

    // مسح من الملف المحلي مع الحفاظ على هيكل الجداول
    collectionsToClear.forEach((col) => {
      db[col] = [];
    });

    saveLocalDatabase(db);

    // مسح من Firestore إذا كان متصلاً
    if (isFirebaseConnected() && firestore) {
      for (const colName of collectionsToClear) {
        try {
          const snap = await firestore.collection(colName).where('tenantId', '==', tenantId).get();
          if (!snap.empty) {
            const batch = firestore.batch();
            snap.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (fbErr) {
          console.error(`Error clearing Firestore collection ${colName}:`, fbErr);
        }
      }
    }

    return res.json({
      success: true,
      message: '✅ تم مسح وتصفير كافة البيانات التجريبية بنجاح، والنظام جاهز الآن لإدخال بيانات قناتك الحقيقية.',
    });
  } catch (error: any) {
    console.error('❌ Error in clearDemoData:', error);
    return res.status(500).json({ error: 'فشل مسح البيانات التجريبية: ' + error.message });
  }
}
