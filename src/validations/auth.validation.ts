import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    username: z.string().optional(),
    login: z.string().optional(),
    password: z.string().min(1, 'كلمة المرور مطلوبة')
  })
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'الاسم مطلوب').min(2, 'الاسم يجب أن لا يقل عن حرفين'),
    email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('البريد الإلكتروني غير صالح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة').min(6, 'يجب أن لا تقل كلمة المرور عن 6 أحرف'),
    role: z.string().optional()
  })
});

