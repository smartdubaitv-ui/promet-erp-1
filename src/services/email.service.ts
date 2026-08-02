import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

// ============================================================
// 1. الثوابت والتهيئة
// ============================================================

// تحميل خط Arabic للـ PDF (إذا كان مطلوباً)
const FONTS_DIR = path.join(process.cwd(), 'fonts');

export const ensureArabicFont = (): string => {
  const fontPath = path.join(FONTS_DIR, 'NotoSansArabic-Regular.ttf');
  
  // إذا لم يكن الخط موجوداً، استخدم خطاً بديلاً
  if (!fs.existsSync(fontPath)) {
    logger.warn('⚠️ Arabic font not found, using fallback');
    // Simple absolute fallback
    return 'Helvetica';
  }
  
  return fontPath;
};

// ============================================================
// 2. إعداد Nodemailer Transporter
// ============================================================

let transporter: nodemailer.Transporter | null = null;

export const getEmailTransporter = (): nodemailer.Transporter => {
  if (transporter) return transporter;
  
  // قراءة الإعدادات من البيئة
  const host = process.env.SMTP_HOST || (process.env.EMAIL_USER ? 'smtp.gmail.com' : '');
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
  
  // إذا لم تكن الإعدادات موجودة، استخدم حساباً وهمياً للتطوير فقط
  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ SMTP credentials missing in production! Email service disabled.');
      throw new Error('SMTP configuration required in production');
    }
    
    logger.warn('⚠️ SMTP credentials not configured, using ethereal.email for testing');
    
    // Create direct test transport or fallback dummy
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'test_user_promet',
        pass: 'test_pass_promet',
      },
    });
    return transporter;
  }
  
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // إعدادات إضافية للتحسين
    pool: true,
    maxConnections: 5,
    rateLimit: 100,
  });
  
  logger.info('📧 Email transporter initialized');
  return transporter;
};

// ============================================================
// 3. إرسال الإيميلات
// ============================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  bcc?: string | string[];
  cc?: string | string[];
  replyTo?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
}> => {
  try {
    const transport = getEmailTransporter();
    
    const from = process.env.SMTP_FROM || 'noreply@promet.com';
    
    const mailOptions = {
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      bcc: options.bcc,
      cc: options.cc,
      replyTo: options.replyTo,
    };
    
    const info = await transport.sendMail(mailOptions);
    
    // إذا كان حساباً وهمياً (ethereal.email)، نعرض رابط المعاينة
    const previewUrl = (transport as any).getTestMessageUrl 
      ? (transport as any).getTestMessageUrl(info)
      : undefined;
    
    logger.info(`📨 Email sent to ${options.to}: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error: any) {
    if (error.message?.includes('535') || error.response?.includes('535') || error.code === 'EAUTH') {
      logger.warn('⚠️ SMTP Authentication failed (535). Email sending skipped gracefully.');
      return {
        success: false,
        error: 'SMTP Authentication failed (535)',
      };
    }
    logger.error('❌ Failed to send email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

// ============================================================
// 4. قوالب الإيميلات الجاهزة
// ============================================================

export const emailTemplates = {
  // قالب ترحيبي
  welcome: (name: string, company: string): EmailOptions => ({
    to: '',
    subject: `مرحباً بك في ${company}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
        <h1 style="color: #1A3A5C;">مرحباً ${name}!</h1>
        <p>شكراً لتسجيلك في نظامنا المحاسبي.</p>
        <p>يمكنك الآن البدء في استخدام التطبيق وإدارة حساباتك بكل سهولة.</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">هذا بريد تلقائي، يرجى عدم الرد عليه.</p>
      </div>
    `,
  }),
  
  // قالب إشعار فاتورة
  invoiceNotification: (invoiceNumber: string, customerName: string, total: number): EmailOptions => ({
    to: '',
    subject: `فاتورة جديدة رقم ${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
        <h2 style="color: #1A3A5C;">فاتورة جديدة</h2>
        <p><strong>رقم الفاتورة:</strong> ${invoiceNumber}</p>
        <p><strong>العميل:</strong> ${customerName}</p>
        <p><strong>الإجمالي:</strong> ${total.toFixed(2)} ج.م</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">هذا بريد تلقائي، يرجى عدم الرد عليه.</p>
      </div>
    `,
  }),
  
  // قالب إشعار راتب
  payrollNotification: (employeeName: string, month: string, amount: number): EmailOptions => ({
    to: '',
    subject: `إشعار راتب ${month}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl;">
        <h2 style="color: #1A3A5C;">إشعار راتب</h2>
        <p><strong>الموظف:</strong> ${employeeName}</p>
        <p><strong>الشهر:</strong> ${month}</p>
        <p><strong>صافي الراتب:</strong> ${amount.toFixed(2)} ج.م</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">هذا بريد تلقائي، يرجى عدم الرد عليه.</p>
      </div>
    `,
  }),
};

// ============================================================
// 5. تصدير الوحدة
// ============================================================

export default {
  getEmailTransporter,
  sendEmail,
  emailTemplates,
  ensureArabicFont,
};
