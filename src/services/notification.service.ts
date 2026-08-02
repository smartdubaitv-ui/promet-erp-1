import { logger } from '../config/logger';
import { jsonDB } from '../data/jsonDatabase';

// ============================================================
// 1. الأنواع
// ============================================================

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface NotificationOptions {
  userId: string;
  tenantId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  link?: string;
  expiresAt?: string;
}

// ============================================================
// 2. إنشاء إشعار جديد
// ============================================================

export const createNotification = async (
  options: NotificationOptions
): Promise<Notification> => {
  const { userId, tenantId, type, title, message, link, expiresAt } = options;
  
  const notification: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    tenantId,
    type,
    title,
    message,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 يوم
  };
  
  try {
    jsonDB.insert('notifications', notification);
    logger.debug(`🔔 Notification created for user ${userId}: ${title}`);
    
    // إذا كان الإشعار خطأ أو تحذير، نسجله في اللوج
    if (type === 'error' || type === 'warning') {
      logger.warn(`📢 ${type.toUpperCase()} notification: ${title} - ${message}`);
    }
    
    return notification;
  } catch (error) {
    logger.error('❌ Failed to create notification:', error);
    throw error;
  }
};

// ============================================================
// 3. دوال إدارة الإشعارات
// ============================================================

export const getNotifications = (
  userId: string,
  options?: {
    isRead?: boolean;
    limit?: number;
    offset?: number;
    type?: string;
  }
): Notification[] => {
  try {
    let notifications = jsonDB.find<Notification>(
      'notifications',
      (n: Notification) => n.userId === userId
    );
    
    if (options?.isRead !== undefined) {
      notifications = notifications.filter((n) => n.isRead === options.isRead);
    }
    
    if (options?.type) {
      notifications = notifications.filter((n) => n.type === options.type);
    }
    
    // ترتيب تنازلي (الأحدث أولاً)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    if (options?.limit !== undefined) {
      const offset = options.offset || 0;
      notifications = notifications.slice(offset, offset + options.limit);
    }
    
    return notifications;
  } catch (error) {
    logger.error('❌ Failed to get notifications:', error);
    return [];
  }
};

export const getUnreadCount = (userId: string): number => {
  try {
    return jsonDB.count('notifications', (n: Notification) => 
      n.userId === userId && !n.isRead
    );
  } catch (error) {
    logger.error('❌ Failed to get unread count:', error);
    return 0;
  }
};

export const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<Notification | null> => {
  try {
    const notification = jsonDB.findOne<Notification>(
      'notifications',
      (n: Notification) => n.id === notificationId && n.userId === userId
    );
    
    if (!notification) {
      return null;
    }
    
    const updated = jsonDB.update<Notification>(
      'notifications',
      notificationId,
      {
        isRead: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Partial<Notification>
    );
    
    logger.debug(`📖 Notification ${notificationId} marked as read`);
    return updated;
  } catch (error) {
    logger.error('❌ Failed to mark notification as read:', error);
    return null;
  }
};

export const markAllAsRead = async (userId: string): Promise<number> => {
  try {
    const notifications = jsonDB.find<Notification>(
      'notifications',
      (n: Notification) => n.userId === userId && !n.isRead
    );
    
    let count = 0;
    for (const notif of notifications) {
      await markAsRead(notif.id, userId);
      count++;
    }
    
    logger.debug(`📖 Marked ${count} notifications as read for user ${userId}`);
    return count;
  } catch (error) {
    logger.error('❌ Failed to mark all notifications as read:', error);
    return 0;
  }
};

export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const notification = jsonDB.findOne<Notification>(
      'notifications',
      (n: Notification) => n.id === notificationId && n.userId === userId
    );
    
    if (!notification) {
      return false;
    }
    
    const deleted = jsonDB.delete('notifications', notificationId);
    logger.debug(`🗑️ Notification ${notificationId} deleted`);
    return deleted;
  } catch (error) {
    logger.error('❌ Failed to delete notification:', error);
    return false;
  }
};

export const deleteAllNotifications = async (userId: string): Promise<number> => {
  try {
    const notifications = jsonDB.find<Notification>(
      'notifications',
      (n: Notification) => n.userId === userId
    );
    
    let count = 0;
    for (const notif of notifications) {
      jsonDB.delete('notifications', notif.id);
      count++;
    }
    
    logger.debug(`🗑️ Deleted ${count} notifications for user ${userId}`);
    return count;
  } catch (error) {
    logger.error('❌ Failed to delete all notifications:', error);
    return 0;
  }
};

// ============================================================
// 4. إشعارات مخصصة لسيناريوهات محددة
// ============================================================

export const sendNotification = {
  // إشعار فاتورة جديدة
  invoiceCreated: async (userId: string, tenantId: string, invoiceNumber: string) => {
    return createNotification({
      userId,
      tenantId,
      type: 'success',
      title: 'فاتورة جديدة',
      message: `تم إنشاء فاتورة رقم ${invoiceNumber} بنجاح`,
      link: `/invoices/${invoiceNumber}`,
    });
  },
  
  // إشعار راتب
  payrollProcessed: async (userId: string, tenantId: string, employeeName: string, month: string) => {
    return createNotification({
      userId,
      tenantId,
      type: 'info',
      title: 'تم معالجة الرواتب',
      message: `تم احتساب راتب ${employeeName} لشهر ${month} بنجاح`,
      link: '/payroll',
    });
  },
  
  // إشعار مخزون منخفض
  lowStock: async (userId: string, tenantId: string, productName: string, quantity: number) => {
    return createNotification({
      userId,
      tenantId,
      type: 'warning',
      title: 'تنبيه: مخزون منخفض',
      message: `المنتج "${productName}" يقترب من نفاذ المخزون (المتبقي: ${quantity})`,
      link: '/inventory',
    });
  },
  
  // إشعار خطأ
  systemError: async (userId: string, tenantId: string, errorMessage: string) => {
    return createNotification({
      userId,
      tenantId,
      type: 'error',
      title: 'خطأ في النظام',
      message: errorMessage,
    });
  },
};

// ============================================================
// 5. تصدير الوحدة
// ============================================================

export default {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  sendNotification,
};
