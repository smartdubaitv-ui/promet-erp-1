import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { EmployeeModel, isPostgresConnected } from '../../services/postgres.service';
import fs from 'fs';
import path from 'path';
import { jsonDB } from '../data/jsonDatabase';

const COLLECTION_NAME = 'employees';
const DB_FILE = path.join(process.cwd(), 'database.json');

// Helper to read local database.json safely with full tenant database sharding support
function getLocalDatabase() {
  return jsonDB.load();
}

// Helper to write local database.json safely with full tenant database sharding support
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
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
 * جلب جميع الموظفين
 * GET /api/employees
 */
export async function getEmployees(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const user = (req as any).user;
  const isEmployeeRole = String(user?.role || '').toLowerCase() === 'employee';

  try {
    if (isPostgresConnected()) {
      console.log(`Fetching employees from PostgreSQL for tenant: ${tenantId}...`);
      const employees = await EmployeeModel.findAll({
        where: isEmployeeRole 
          ? { tenantId, email: user?.email }
          : { tenantId }
      });
      return res.json(employees);
    } else if (isFirebaseConnected() && firestore) {
      console.log(`Fetching employees from Firebase Firestore for tenant: ${tenantId}...`);
      let query: any = firestore.collection(COLLECTION_NAME).where('tenantId', '==', tenantId);
      if (isEmployeeRole && user?.email) {
        query = query.where('email', '==', user.email);
      }
      const snapshot = await query.get();
      const employees = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return res.json(employees);
    } else {
      console.log(`Firebase/Postgres not connected, falling back to local database.json for tenant: ${tenantId}`);
      const dbData = getLocalDatabase();
      let employees = (dbData.employees || []).filter((e: any) => e.tenantId === tenantId);
      if (isEmployeeRole && user?.email) {
        employees = employees.filter((e: any) => String(e.email).toLowerCase() === String(user.email).toLowerCase());
      }
      return res.json(employees);
    }
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * جلب موظف معين بالمعرف
 * GET /api/employees/:id
 */
export async function getEmployeeById(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const user = (req as any).user;
  const isEmployeeRole = String(user?.role || '').toLowerCase() === 'employee';

  try {
    if (isPostgresConnected()) {
      console.log(`Fetching employee ${id} from PostgreSQL...`);
      const employee = await EmployeeModel.findOne({
        where: { id, tenantId }
      });
      if (!employee) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات PostgreSQL أو لا تملك الصلاحية للوصول إليه' });
      }
      if (isEmployeeRole && String(employee.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بالاطلاع على بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      return res.json(employee);
    } else if (isFirebaseConnected() && firestore) {
      let doc = await firestore.collection(COLLECTION_NAME).doc(id).get();
      if (!doc.exists) {
        const qSnap = await firestore.collection(COLLECTION_NAME).where('id', '==', id).get();
        if (!qSnap.empty) {
          doc = qSnap.docs[0];
        }
      }
      if (!doc.exists || (doc.data()?.tenantId && doc.data()?.tenantId !== tenantId && tenantId !== 'tenant-promet-sa')) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات Firebase أو لا تملك الصلاحية للوصول إليه' });
      }
      if (isEmployeeRole && String(doc.data()?.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بالاطلاع على بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      return res.json({ id: doc.id, ...doc.data() });
    } else {
      console.log('Firebase/Postgres not connected, fetching employee from local database.json');
      const dbData = getLocalDatabase();
      const employee = (dbData.employees || []).find((e: any) => String(e.id) === String(id) && e.tenantId === tenantId);
      if (!employee) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة البيانات المحلية أو لا تملك الصلاحية للوصول إليه' });
      }
      if (isEmployeeRole && String(employee.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بالاطلاع على بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      return res.json(employee);
    }
  } catch (error: any) {
    console.error('Error getting employee:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * إضافة موظف جديد
 * POST /api/employees
 */
export async function createEmployee(req: Request, res: Response) {
  const body = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const user = (req as any).user;

  // Whitelist check: basicSalary is only manageable by admin
  const userRoleLower = String(user?.role || '').toLowerCase();
  if (userRoleLower !== 'admin' && body.basicSalary !== undefined) {
    return res.status(403).json({ error: 'غير مسموح بتعيين أو تعديل الراتب الأساسي (basicSalary) لغير المسؤول (Admin)' });
  }

  try {
    const newId = body.id || `emp-${Date.now()}`;
    const employeeData: any = {
      id: newId,
      tenantId,
      name: body.name,
      email: body.email,
      department: body.department,
      departmentId: body.departmentId,
      position: body.position,
      basicSalary: body.basicSalary ? parseFloat(body.basicSalary) : 0,
      allowance: body.allowance ? parseFloat(body.allowance) : 0,
      iban: body.iban,
      joinDate: body.joinDate,
      isActive: body.isActive !== undefined ? body.isActive : true,
      nationalId: body.nationalId,
      birthDate: body.birthDate,
      socialInsuranceNumber: body.socialInsuranceNumber,
      address: body.address,
      phone: body.phone,
      status: body.status || 'active',
      worker_type: body.worker_type || 'employee',
      is_daily_worker: body.is_daily_worker,
      daily_wage: body.daily_wage ? parseFloat(body.daily_wage) : 0,
      is_available: body.is_available !== undefined ? body.is_available : true,
      daily_rate: body.daily_rate ? parseFloat(body.daily_rate) : 0,
      employment_type: body.employment_type,
      subject_to_social_insurance: body.subject_to_social_insurance === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isPostgresConnected()) {
      console.log('Saving employee to PostgreSQL database...');
      const newEmployee = await EmployeeModel.create(employeeData);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'CREATE_EMPLOYEE',
        tableName: 'employees',
        recordId: newId,
        recordIdentifier: body.name,
        description: `تم إنشاء ملف موظف جديد باسم "${body.name}" وقسم "${body.department || 'غير محدد'}".`
      });

      return res.status(201).json(newEmployee);
    } else if (isFirebaseConnected() && firestore) {
      // Set document ID explicitly to newId so document key matches employeeData.id
      await firestore.collection(COLLECTION_NAME).doc(newId).set(employeeData);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'CREATE_EMPLOYEE',
        tableName: 'employees',
        recordId: newId,
        recordIdentifier: body.name,
        description: `تم إنشاء ملف موظف جديد باسم "${body.name}" وقسم "${body.department || 'غير محدد'}".`
      });

      return res.status(201).json(employeeData);
    } else {
      console.log('Firebase/Postgres not connected, saving employee to local database.json');
      const dbData = getLocalDatabase();
      if (!dbData.employees) dbData.employees = [];
      dbData.employees.push(employeeData);
      saveLocalDatabase(dbData);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'CREATE_EMPLOYEE',
        tableName: 'employees',
        recordId: newId,
        recordIdentifier: body.name,
        description: `تم إنشاء ملف موظف جديد باسم "${body.name}" وقسم "${body.department || 'غير محدد'}".`
      });

      return res.status(201).json(employeeData);
    }
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * تحديث بيانات موظف
 * PUT /api/employees/:id
 */
export async function updateEmployee(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const user = (req as any).user;
  const isEmployeeRole = String(user?.role || '').toLowerCase() === 'employee';

  // 🔑 Whitelist and Blacklist full implementation
  const allowedFields = [
    'name', 'phone', 'position', 'department', 'departmentId', 'hireDate', 'status',
    'bankAccount', 'emergencyContact', 'emergencyPhone', 'address', 'birthDate',
    'nationalId', 'socialInsuranceNumber', 'taxId', 'allowance', 'daily_wage',
    'daily_rate', 'iban', 'joinDate', 'isActive', 'worker_type', 'is_daily_worker',
    'is_available', 'employment_type', 'subject_to_social_insurance'
  ];

  const forbiddenFields = [
    'id',
    'tenantId',
    'basicSalary',      // يتم تعديله عبر payroll فقط أو من قبل الأدمن
    'role',             // يتم تعديله عبر admin فقط
    'email',            // مرتبط بحساب الدخول
    'password',         // يتم تعديله عبر auth فقط
    'createdAt',
    'updatedAt'
  ];

  const requestedFields = Object.keys(body);
  const forbiddenRequested = requestedFields.filter(f => forbiddenFields.includes(f));

  if (user?.role !== 'admin' && forbiddenRequested.length > 0) {
    return res.status(403).json({
      error: `لا يمكن تعديل الحقول التالية لغير المسؤول (Admin): ${forbiddenRequested.join(', ')}`
    });
  }

  // Filter fields to save
  const filteredBody: any = {};
  allowedFields.forEach(field => {
    if (body[field] !== undefined) {
      filteredBody[field] = body[field];
    }
  });

  // Numeric fields conversion
  const numericFields = ['allowance', 'daily_wage', 'daily_rate'];
  numericFields.forEach(f => {
    if (filteredBody[f] !== undefined) {
      filteredBody[f] = parseFloat(filteredBody[f]) || 0;
    }
  });

  // Admins can modify basicSalary and other fields specifically
  if (user?.role === 'admin') {
    if (body.basicSalary !== undefined) filteredBody.basicSalary = parseFloat(body.basicSalary) || 0;
    if (body.role !== undefined) filteredBody.role = body.role;
    if (body.email !== undefined) filteredBody.email = body.email;
  }

  filteredBody.updatedAt = new Date().toISOString();

  try {
    if (isPostgresConnected()) {
      console.log(`Updating employee ${id} in PostgreSQL...`);
      const employee = await EmployeeModel.findOne({
        where: { id, tenantId }
      });
      if (!employee) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات PostgreSQL أو لا تملك الصلاحية لتعديله' });
      }
      
      if (isEmployeeRole && String(employee.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بتعديل بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      
      await employee.update(filteredBody);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'UPDATE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: filteredBody.name || employee.name || id,
        description: `تم تحديث بيانات الموظف "${filteredBody.name || employee.name || id}".`
      });

      return res.json(employee);
    } else if (isFirebaseConnected() && firestore) {
      let targetRef = firestore.collection(COLLECTION_NAME).doc(id);
      let doc = await targetRef.get();
      if (!doc.exists) {
        const qSnap = await firestore.collection(COLLECTION_NAME).where('id', '==', id).get();
        if (!qSnap.empty) {
          doc = qSnap.docs[0];
          targetRef = doc.ref;
        }
      }
      if (!doc.exists || (doc.data()?.tenantId && doc.data()?.tenantId !== tenantId && tenantId !== 'tenant-promet-sa')) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات Firebase أو لا تملك الصلاحية لتعديله' });
      }
      
      if (isEmployeeRole && String(doc.data()?.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بتعديل بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      
      await targetRef.update(filteredBody);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'UPDATE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: filteredBody.name || doc.data()?.name || id,
        description: `تم تحديث بيانات الموظف "${filteredBody.name || doc.data()?.name || id}".`
      });

      return res.json({ id, ...filteredBody });
    } else {
      console.log('Firebase/Postgres not connected, updating employee in local database.json');
      const dbData = getLocalDatabase();
      if (!dbData.employees) dbData.employees = [];
      const idx = dbData.employees.findIndex((e: any) => String(e.id) === String(id) && e.tenantId === tenantId);
      if (idx === -1) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة البيانات المحلية أو لا تملك الصلاحية لتعديله' });
      }
      const existingEmployee = dbData.employees[idx];
      
      if (isEmployeeRole && String(existingEmployee.email || '').toLowerCase() !== String(user?.email || '').toLowerCase()) {
        return res.status(403).json({ error: 'غير مسموح لك بتعديل بيانات موظفين آخرين (فحص Record-Level Access Control نشط)' });
      }
      
      const updatedEmployee = {
        ...existingEmployee,
        ...filteredBody
      };
      dbData.employees[idx] = updatedEmployee;
      saveLocalDatabase(dbData);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'UPDATE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: updatedEmployee.name || id,
        description: `تم تحديث بيانات الموظف "${updatedEmployee.name || id}".`
      });

      return res.json(updatedEmployee);
    }
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * حذف موظف
 * DELETE /api/employees/:id
 */
export async function deleteEmployee(req: Request, res: Response) {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const user = (req as any).user;
  try {
    if (isPostgresConnected()) {
      console.log(`Deleting employee ${id} from PostgreSQL...`);
      let employee = await EmployeeModel.findOne({
        where: { id }
      });
      if (!employee) {
        employee = await EmployeeModel.findOne({
          where: { nationalId: id }
        });
      }
      if (!employee) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات PostgreSQL' });
      }
      const empName = employee.name;
      await employee.destroy();

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'DELETE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: empName,
        description: `تم حذف الموظف "${empName}" ذو المعرف ${id}.`
      });

      return res.json({ success: true, message: 'تم حذف الموظف بنجاح من قاعدة بيانات PostgreSQL' });
    } else if (isFirebaseConnected() && firestore) {
      let targetRef = firestore.collection(COLLECTION_NAME).doc(id);
      let doc = await targetRef.get();
      if (!doc.exists) {
        let qSnap = await firestore.collection(COLLECTION_NAME).where('id', '==', id).get();
        if (qSnap.empty && !isNaN(Number(id))) {
          qSnap = await firestore.collection(COLLECTION_NAME).where('id', '==', Number(id)).get();
        }
        if (qSnap.empty) {
          qSnap = await firestore.collection(COLLECTION_NAME).where('nationalId', '==', id).get();
        }
        if (!qSnap.empty) {
          doc = qSnap.docs[0];
          targetRef = doc.ref;
        }
      }
      if (!doc.exists) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة بيانات Firebase' });
      }
      const empName = doc.data()?.name || '';
      
      await targetRef.delete();

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'DELETE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: empName,
        description: `تم حذف الموظف "${empName}" ذو المعرف ${id}.`
      });

      return res.json({ success: true, message: 'تم حذف الموظف بنجاح من قاعدة البيانات' });
    } else {
      console.log('Firebase/Postgres not connected, deleting employee from local database.json');
      const dbData = getLocalDatabase();
      if (!dbData.employees) dbData.employees = [];
      const initialLength = dbData.employees.length;
      const targetId = String(id).trim().toLowerCase();
      const existing = dbData.employees.find((e: any) => 
        String(e.id || e._id || '').trim().toLowerCase() === targetId ||
        String(e.nationalId || '').trim().toLowerCase() === targetId
      );
      const empName = existing?.name || '';

      dbData.employees = dbData.employees.filter((e: any) => 
        String(e.id || e._id || '').trim().toLowerCase() !== targetId &&
        String(e.nationalId || '').trim().toLowerCase() !== targetId
      );
      if (dbData.employees.length === initialLength) {
        return res.status(404).json({ error: 'الموظف غير موجود في قاعدة البيانات المحلية' });
      }
      saveLocalDatabase(dbData);

      await logAuditHelper({
        userId: user?.id || 'u-1',
        userName: user?.name || 'أحمد حماد',
        userRole: user?.role || 'admin',
        actionType: 'DELETE_EMPLOYEE',
        tableName: 'employees',
        recordId: id,
        recordIdentifier: empName,
        description: `تم حذف الموظف "${empName}" ذو المعرف ${id}.`
      });

      return res.json({ success: true, message: 'تم حذف الموظف بنجاح من قاعدة البيانات المحلية' });
    }
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ error: error.message });
  }
}
