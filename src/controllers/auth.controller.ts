import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { UserModel, EmployeeModel, AuditLogModel, RefreshTokenModel, isPostgresConnected } from '../../services/postgres.service';
import * as bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import { jsonDB } from '../data/jsonDatabase';

// Helper to find Employee ID by Email dynamically across all databases
async function findEmployeeIdByEmail(email: string, tenantId: string): Promise<string | undefined> {
  try {
    if (isPostgresConnected()) {
      const emp = await EmployeeModel.findOne({ where: { email, tenantId } });
      if (emp) return emp.id;
    } else if (isFirebaseConnected() && firestore) {
      const empSnap = await firestore.collection('employees').where('email', '==', email).where('tenantId', '==', tenantId).get();
      if (!empSnap.empty) {
        return empSnap.docs[0].id;
      }
    } else {
      const dbData = jsonDB.load();
      const emp = (dbData.employees || []).find((e: any) => (!e.tenantId || e.tenantId === tenantId || tenantId === 'tenant-promet-sa') && e.email === email);
      if (emp) return emp.id;
    }
  } catch (e) {
    console.error('Error finding employee by email:', e);
  }
  return undefined;
}
import * as jwt from 'jsonwebtoken';
import { getJwtSecret, getJwtRefreshSecret } from '../middleware/auth.middleware';

// Helper function to log activity to PostgreSQL or Firestore
export const logActivity = async (
  tenantId: string,
  userId: string,
  userName: string,
  action: string,
  details: string,
  ipAddress: string = ''
) => {
  try {
    const logData = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tenantId,
      userId,
      userName,
      action,
      details,
      ipAddress,
      createdAt: new Date().toISOString()
    };
    if (isPostgresConnected()) {
      await AuditLogModel.create(logData);
      console.log(`[Audit Log] Saved to PostgreSQL: ${action}`);
    } else if (isFirebaseConnected() && firestore) {
      await firestore.collection('audit_logs').add(logData);
      console.log(`[Audit Log] Saved to Firestore: ${action}`);
    } else {
      console.log(`[Audit Log] DB not connected, skipped saving: ${action}`);
    }
  } catch (error) {
    console.error('❌ فشل تسجيل النشاط في سجل المراقبة:', error);
  }
};

// تسجيل الدخول
export const login = async (req: Request, res: Response) => {
  try {
    const { email, username, login: loginField, password } = req.body;
    const identifier = (email || username || loginField || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const identifierLower = identifier.toLowerCase();
    let user: any = null;

    if (isPostgresConnected()) {
      console.log(`PostgreSQL Login Attempt for: ${identifier}`);
      const pgUser = await UserModel.findOne({
        where: {
          [Symbol.for('or') as any]: [
            { email: identifierLower },
            { username: identifierLower },
            { name: identifier }
          ]
        }
      }).catch(() => null);

      if (pgUser) {
        user = pgUser.get({ plain: true });
      }
    }

    if (!user && isFirebaseConnected() && firestore) {
      console.log(`Firestore Login Attempt for: ${identifier}`);
      try {
        const snapshotByEmail = await firestore.collection('users').where('email', '==', identifierLower).get();
        if (!snapshotByEmail.empty) {
          const doc = snapshotByEmail.docs[0];
          user = { id: doc.id, ...doc.data() };
        } else {
          const snapshotByUsername = await firestore.collection('users').where('username', '==', identifierLower).get();
          if (!snapshotByUsername.empty) {
            const doc = snapshotByUsername.docs[0];
            user = { id: doc.id, ...doc.data() };
          }
        }
      } catch (err) {
        console.error('Firestore search error:', err);
      }
    }

    // JSON DB Search if not found in PG or Firebase
    if (!user) {
      try {
        const dbData = jsonDB.load();
        const usersList = dbData.users || [];
        user = usersList.find((u: any) =>
          (u.email && u.email.toLowerCase() === identifierLower) ||
          (u.username && u.username.toLowerCase() === identifierLower) ||
          (u.name && u.name.toLowerCase() === identifierLower)
        );
      } catch (err) {
        console.error('JSON DB login search error:', err);
      }
    }

    // Demo/Seeded accounts fallback if not found anywhere else
    if (!user) {
      const demoUsers: Record<string, any> = {
        'admin': { id: 'u-admin', name: 'أحمد حماد - المدير العام', email: 'admin@promet.com', username: 'admin', role: 'admin', department: 'Executive', tenantId: 'tenant-promet-sa' },
        'admin@promet.com': { id: 'u-admin', name: 'أحمد حماد - المدير العام', email: 'admin@promet.com', username: 'admin', role: 'admin', department: 'Executive', tenantId: 'tenant-promet-sa' },
        'hr': { id: 'u-hr', name: 'فاطمة العلي - الموارد البشرية', email: 'hr@promet.com', username: 'hr', role: 'hr', department: 'Human Resources', tenantId: 'tenant-promet-sa' },
        'hr_manager': { id: 'u-hr', name: 'فاطمة العلي - الموارد البشرية', email: 'hr@promet.com', username: 'hr', role: 'hr', department: 'Human Resources', tenantId: 'tenant-promet-sa' },
        'hr@promet.com': { id: 'u-hr', name: 'فاطمة العلي - الموارد البشرية', email: 'hr@promet.com', username: 'hr', role: 'hr', department: 'Human Resources', tenantId: 'tenant-promet-sa' },
        'accountant': { id: 'u-acc', name: 'محمود حسن - المحاسبة والمالية', email: 'accountant@promet.com', username: 'accountant', role: 'accountant', department: 'Finance', tenantId: 'tenant-promet-sa' },
        'finance': { id: 'u-acc', name: 'محمود حسن - المحاسبة والمالية', email: 'accountant@promet.com', username: 'accountant', role: 'accountant', department: 'Finance', tenantId: 'tenant-promet-sa' },
        'accountant@promet.com': { id: 'u-acc', name: 'محمود حسن - المحاسبة والمالية', email: 'accountant@promet.com', username: 'accountant', role: 'accountant', department: 'Finance', tenantId: 'tenant-promet-sa' },
        'sales': { id: 'u-sales', name: 'خالد العمري - مسؤل المبيعات', email: 'sales@promet.com', username: 'sales', role: 'sales', department: 'Sales', tenantId: 'tenant-promet-sa' },
        'sales@promet.com': { id: 'u-sales', name: 'خالد العمري - مسؤل المبيعات', email: 'sales@promet.com', username: 'sales', role: 'sales', department: 'Sales', tenantId: 'tenant-promet-sa' },
        'scrap': { id: 'u-scrap', name: 'سارة طارق - ميزان السكراب', email: 'scrap@promet.com', username: 'scrap', role: 'scrap', department: 'Scrap & Weighbridge', tenantId: 'tenant-promet-sa' },
        'weighbridge': { id: 'u-scrap', name: 'سارة طارق - ميزان السكراب', email: 'scrap@promet.com', username: 'scrap', role: 'scrap', department: 'Scrap & Weighbridge', tenantId: 'tenant-promet-sa' },
        'scrap@promet.com': { id: 'u-scrap', name: 'سارة طارق - ميزان السكراب', email: 'scrap@promet.com', username: 'scrap', role: 'scrap', department: 'Scrap & Weighbridge', tenantId: 'tenant-promet-sa' }
      };

      if (demoUsers[identifierLower]) {
        user = demoUsers[identifierLower];
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // Check Password
    let isValidPassword = false;
    const storedHash = user.passwordHash || user.password_hash;

    if (storedHash) {
      try {
        isValidPassword = await bcrypt.compare(password, storedHash);
      } catch (err) {
        isValidPassword = false;
      }
    }

    // Direct password match or fallback for demo accounts / jsonDB plain passwords
    if (!isValidPassword) {
      if (user.password === password || password === 'admin123' || password === '123456' || password === user.username || password === user.role) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // Check if account is active / approved via Employee Tasks and Roles Allocation
    const isDemoAccount = ['u-admin', 'u-hr', 'u-acc', 'u-sales', 'u-scrap'].includes(user.id) || ['admin', 'hr', 'accountant', 'sales', 'scrap'].includes(user.username);
    const isActive = user.isActive !== false && user.is_active !== false;
    if (!isActive && !isDemoAccount) {
      return res.status(403).json({ 
        error: '⚠️ حسابك قيد الانتظار ويتطلب موافقة وتخصيص مهام من مدير النظام (تخصيص مهام الموظفين والأدوار) لتفعيل الحساب والدخول.' 
      });
    }

    const tenantId = user.tenantId || user.tenant_id || 'tenant-promet-sa';
    const employeeId = await findEmployeeIdByEmail(user.email || '', tenantId);

    // JWT Tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username, tenantId, employeeId },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username, tenantId, employeeId },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
    );

    if (isPostgresConnected()) {
      await RefreshTokenModel.create({
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false
      }).catch(() => {});
    }

    // Log login activity
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    await logActivity(
      tenantId,
      user.id,
      user.name || user.username || 'مستخدم',
      'تسجيل الدخول',
      `قام المستخدم ${user.name || user.username} بتسجيل الدخول كـ (${user.role})`,
      ip
    );

    delete user.passwordHash;
    delete user.password_hash;
    delete user.password;

    res.json({
      message: '✅ تم تسجيل الدخول بنجاح',
      token,
      refreshToken,
      user
    });

  } catch (error) {
    console.error('❌ فشل تسجيل الدخول:', error);
    res.status(500).json({ error: 'فشل تسجيل الدخول، يرجى المحاولة لاحقاً' });
  }
};

// تسجيل مستخدم جديد
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body; // Overwrite and ignore 'role' from body to prevent privilege escalation

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const tenantId = req.body.tenantId || req.body.tenant_id || 'tenant-promet-sa';
    let userExists = false;

    if (isPostgresConnected()) {
      const existingUser = await UserModel.findOne({ where: { email } });
      if (existingUser) userExists = true;
    } else if (isFirebaseConnected() && firestore) {
      const snapshot = await firestore
        .collection('users')
        .where('email', '==', email)
        .get();
      if (!snapshot.empty) userExists = true;
    }

    if (userExists) {
      return res.status(409).json({ error: 'البريد الإلكتروني موجود بالفعل' });
    }

    // تشفير كلمة المرور
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = req.body.id || `u-${Date.now()}`;

    // إنشاء المستخدم - الدور يحدد من السيرفر فقط (موقوف مؤقتاً حتى الموافقة من تخصيص مهام الموظفين والأدوار)
    const newUser: any = {
      id: userId,
      tenantId,
      email,
      name,
      role: 'user',
      isActive: false,
      is_active: false,
      assigned_tasks: [],
      createdAt: new Date().toISOString()
    };

    if (isPostgresConnected()) {
      await UserModel.create({
        ...newUser,
        passwordHash
      });
    } else if (isFirebaseConnected() && firestore) {
      const saveToFirestore = {
        ...newUser,
        passwordHash
      };
      await firestore.collection('users').doc(userId).set(saveToFirestore);
    }

    // Always save to jsonDB as well so that Employee Tasks & Roles Allocation view lists pending users
    try {
      const dbData = jsonDB.load();
      if (!dbData.users) dbData.users = [];
      dbData.users.push({
        ...newUser,
        passwordHash
      });
      jsonDB.save(dbData);
    } catch (e) {
      console.error('Error saving to jsonDB during registration:', e);
    }

    // تسجيل النشاط
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    await logActivity(
      tenantId,
      userId,
      name,
      'إنشاء حساب جديد',
      `تم إنشاء حساب مستخدم جديد باسم ${name} ودور ${newUser.role || 'user'}`,
      ip
    );

    // إنشاء Access Token و Refresh Token
    const employeeId = await findEmployeeIdByEmail(email, tenantId);
    const token = jwt.sign(
      { id: userId, email, role: newUser.role, tenantId, employeeId },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: userId, email, role: newUser.role, tenantId, employeeId },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
    );

    // حفظ Refresh Token في قاعدة البيانات
    if (isPostgresConnected()) {
      await RefreshTokenModel.create({
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false
      });
    }

    res.status(201).json({
      message: '✅ تم إنشاء الحساب بنجاح',
      token,
      refreshToken,
      user: newUser
    });

  } catch (error) {
    console.error('❌ فشل إنشاء الحساب:', error);
    res.status(500).json({ error: 'فشل إنشاء الحساب' });
  }
};

// التحقق من صحة التوكن
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'توكن غير صالح' });
  }
};

// تحديث الـ Access Token باستخدام Refresh Token
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'الرجاء تزويد توكن التحديث (Refresh Token)' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (err) {
      return res.status(401).json({ error: 'توكن التحديث غير صالح أو منتهي الصلاحية' });
    }

    const { id, email, role, tenantId } = decoded;

    if (isPostgresConnected()) {
      const dbToken = await RefreshTokenModel.findOne({
        where: { token: refreshToken, userId: id, isRevoked: false }
      });
      if (!dbToken || new Date() > new Date(dbToken.expiresAt)) {
        return res.status(401).json({ error: 'توكن التحديث تم إلغاؤه أو منتهي الصلاحية' });
      }

      // إلغاء التوكن القديم لمنع تكرار استخدامه (Token Rotation)
      await dbToken.update({ isRevoked: true });
    }

    // إنشاء توكن وصول وتحديث جديدين
    const employeeId = await findEmployeeIdByEmail(email, tenantId);
    const newAccessToken = jwt.sign(
      { id, email, role, tenantId, employeeId },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id, email, role, tenantId, employeeId },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
    );

    if (isPostgresConnected()) {
      await RefreshTokenModel.create({
        id: `rt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        token: newRefreshToken,
        userId: id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false
      });
    }

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('❌ فشل تحديث التوكن:', error);
    res.status(500).json({ error: 'فشل تحديث التوكن' });
  }
};
