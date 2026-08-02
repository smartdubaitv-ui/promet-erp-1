import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DB_FILE = path.join(process.cwd(), 'database.json');

// Read database helper
function getLocalDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local database in crm router:', e);
  }
  return {};
}

// Save database helper
function saveLocalDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local database in crm router:', e);
  }
}

// 1. GET /api/crm/dashboard - إحصائيات لوحة التحكم
router.get('/dashboard', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const customers = db.crm_customers || [];
  const opportunities = db.crm_opportunities || [];
  const activities = db.crm_activities || [];

  const activeOpps = opportunities.filter((o: any) => o.status === 'active');
  const wonOpps = opportunities.filter((o: any) => o.status === 'won');

  const expectedRevenue = activeOpps.reduce((sum: number, o: any) => {
    const prob = parseFloat(o.probability) || 0;
    const amt = parseFloat(o.amount) || 0;
    return sum + (amt * prob) / 100;
  }, 0);

  const totalRevenue = wonOpps.reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);
  const pendingActivities = activities.filter((a: any) => a.status === 'pending').length;

  res.json({
    totalCustomers: customers.length,
    activeOpportunities: activeOpps.length,
    expectedRevenue: expectedRevenue,
    wonOpportunities: wonOpps.length,
    totalRevenue: totalRevenue,
    pendingActivities: pendingActivities
  });
});

// 2. GET /api/crm/customers - قائمة عملاء CRM المصنفين
router.get('/customers', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const customers = db.crm_customers || [];
  const contacts = db.contacts || [];
  const opportunities = db.crm_opportunities || [];
  const employees = db.employees || [];

  const enhancedCustomers = customers.map((cust: any) => {
    // Find matching contact for phone/email
    const contact = contacts.find((c: any) => c.id === cust.contact_id);
    // Find matching employee
    const emp = employees.find((e: any) => e.id === cust.assigned_to);
    // Calculate opportunities stats
    const custOpps = opportunities.filter((o: any) => o.customer_id === cust.id);
    const activeOppsCount = custOpps.filter((o: any) => o.status === 'active').length;
    const wonOppsRevenue = custOpps
      .filter((o: any) => o.status === 'won')
      .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);

    return {
      ...cust,
      contact_email: contact?.email || cust.contact_email || '',
      contact_phone: contact?.phone || cust.contact_phone || '',
      assigned_to_name: emp?.name || cust.assigned_to_name || 'غير معين',
      active_opportunities: activeOppsCount,
      total_revenue: wonOppsRevenue
    };
  });

  res.json(enhancedCustomers);
});

// 3. POST /api/crm/customers - ترقية جهة اتصال لعميل CRM
router.post('/customers', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const customers = db.crm_customers || [];
  const contacts = db.contacts || [];

  const {
    contact_id,
    company_name,
    industry,
    website,
    tax_id,
    commercial_register,
    customer_type,
    customer_segment,
    annual_revenue,
    employee_count,
    preferred_contact_method,
    assigned_to,
    credit_limit,
    payment_terms,
    notes
  } = req.body;

  if (!contact_id) {
    return res.status(400).json({ error: 'الرجاء اختيار جهة اتصال أولاً' });
  }

  // Check if contact already upgraded
  const existing = customers.find((c: any) => c.contact_id === contact_id);
  if (existing) {
    return res.status(400).json({ error: 'جهة الاتصال هذه تمت ترقيتها بالفعل كعميل CRM' });
  }

  const contact = contacts.find((c: any) => c.id === contact_id);
  const finalCompanyName = company_name || contact?.name || 'عميل جديد';

  const newCustomer = {
    id: `cust-${Date.now()}`,
    contact_id,
    company_name: finalCompanyName,
    industry: industry || '',
    website: website || '',
    tax_id: tax_id || '',
    commercial_register: commercial_register || '',
    customer_type: customer_type || 'company',
    customer_segment: customer_segment || 'lead',
    annual_revenue: parseFloat(annual_revenue) || 0,
    employee_count: parseInt(employee_count) || 0,
    preferred_contact_method: preferred_contact_method || 'whatsapp',
    assigned_to: assigned_to || null,
    credit_limit: parseFloat(credit_limit) || 0,
    payment_terms: parseInt(payment_terms) || 30,
    notes: notes || '',
    created_at: new Date().toISOString(),
    created_by: 'u-1'
  };

  db.crm_customers = [...customers, newCustomer];
  saveLocalDatabase(db);

  res.status(201).json(newCustomer);
});

// 4. GET /api/crm/opportunities - قائمة فرص المبيعات
router.get('/opportunities', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const opportunities = db.crm_opportunities || [];
  const customers = db.crm_customers || [];
  const employees = db.employees || [];

  const enhancedOpportunities = opportunities.map((opp: any) => {
    const cust = customers.find((c: any) => c.id === opp.customer_id);
    const emp = employees.find((e: any) => e.id === opp.assigned_to);

    return {
      ...opp,
      company_name: cust?.company_name || 'عميل غير معروف',
      assigned_to_name: emp?.name || opp.assigned_to_name || 'غير معين'
    };
  });

  res.json(enhancedOpportunities);
});

// 5. POST /api/crm/opportunities - إضافة فرصة مبيعات جديدة
router.post('/opportunities', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const opportunities = db.crm_opportunities || [];

  const {
    customer_id,
    name,
    description,
    amount,
    pipeline_stage_id,
    expected_close_date,
    probability,
    assigned_to,
    source,
    notes
  } = req.body;

  if (!customer_id || !name || amount === undefined) {
    return res.status(400).json({ error: 'الرجاء ملء الحقول الإلزامية: العميل، الاسم، القيمة' });
  }

  const newOpp = {
    id: `opp-${Date.now()}`,
    customer_id,
    name,
    description: description || '',
    amount: parseFloat(amount) || 0,
    pipeline_stage_id: pipeline_stage_id || 'stage-1',
    expected_close_date: expected_close_date || new Date().toISOString().split('T')[0],
    probability: parseInt(probability) || 10,
    assigned_to: assigned_to || null,
    source: source || 'referral',
    status: 'active',
    notes: notes || '',
    created_at: new Date().toISOString(),
    created_by: 'u-1'
  };

  db.crm_opportunities = [...opportunities, newOpp];
  saveLocalDatabase(db);

  res.status(201).json(newOpp);
});

// 6. GET /api/crm/pipeline-stages - مراحل أنابيب المبيعات
router.get('/pipeline-stages', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  res.json(db.crm_pipeline_stages || []);
});

// 7. GET /api/crm/activities - سجل التفاعلات والمتابعات
router.get('/activities', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const activities = db.crm_activities || [];
  // Sort descending by date
  const sorted = [...activities].sort((a: any, b: any) => {
    return new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime();
  });
  res.json(sorted);
});

// 8. POST /api/crm/activities - تسجيل نشاط أو تفاعل جديد
router.post('/activities', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const activities = db.crm_activities || [];

  const {
    customer_id,
    opportunity_id,
    activity_type,
    subject,
    description,
    activity_date,
    duration_minutes,
    assigned_to,
    follow_up_date,
    status
  } = req.body;

  if (!customer_id || !subject) {
    return res.status(400).json({ error: 'الرجاء اختيار العميل وعنوان التفاعل' });
  }

  const newActivity = {
    id: `act-${Date.now()}`,
    customer_id,
    opportunity_id: opportunity_id || null,
    activity_type: activity_type || 'call',
    subject,
    description: description || '',
    activity_date: activity_date || new Date().toISOString(),
    duration_minutes: parseInt(duration_minutes) || 15,
    assigned_to: assigned_to || null,
    status: status || 'completed',
    follow_up_date: follow_up_date || null,
    created_at: new Date().toISOString(),
    created_by: 'u-1'
  };

  db.crm_activities = [...activities, newActivity];
  saveLocalDatabase(db);

  res.status(201).json(newActivity);
});

// 9. PUT /api/crm/opportunities/:oppId/stage - تحديث مرحلة الصفقة
router.put('/opportunities/:oppId/stage', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const opportunities = db.crm_opportunities || [];
  const { oppId } = req.params;
  const { pipeline_stage_id, probability } = req.body;

  const idx = opportunities.findIndex((o: any) => o.id === oppId);
  if (idx === -1) {
    return res.status(404).json({ error: 'الصفقة غير موجودة' });
  }

  // Update fields
  opportunities[idx].pipeline_stage_id = pipeline_stage_id;
  if (probability !== undefined) {
    opportunities[idx].probability = parseInt(probability);
  }

  // Automatically mark status as 'won' if stage is 'stage-6' or probability is 100
  if (pipeline_stage_id === 'stage-6' || parseInt(probability) === 100) {
    opportunities[idx].status = 'won';
  } else {
    opportunities[idx].status = 'active';
  }

  db.crm_opportunities = opportunities;
  saveLocalDatabase(db);

  res.json(opportunities[idx]);
});

export default router;
