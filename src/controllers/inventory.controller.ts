import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { ProductModel, isPostgresConnected } from '../../services/postgres.service';
import { cacheService } from '../services/cache.service';
import fs from 'fs';
import path from 'path';
import { jsonDB } from '../data/jsonDatabase';

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
 * جلب جميع المنتجات
 * GET /api/inventory
 */
export const getProducts = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const cacheKey = `products:all:${tenantId}`;
  try {
    const cached = await cacheService.get<any[]>(cacheKey);
    if (cached) {
      console.log(`[Cache Hit] Returning cached products list for tenant: ${tenantId}`);
      return res.json(cached);
    }

    let products: any[] = [];
    if (isPostgresConnected()) {
      console.log(`Fetching products from PostgreSQL for tenant: ${tenantId}...`);
      const pgProducts = await ProductModel.findAll({ where: { tenantId } });
      products = pgProducts.map(p => p.get({ plain: true }));
    } else if (isFirebaseConnected() && firestore) {
      console.log(`Fetching products from Firestore for tenant: ${tenantId}...`);
      const snapshot = await firestore.collection('products').where('tenantId', '==', tenantId).get();
      products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      console.log(`Fetching products from local database for tenant: ${tenantId}...`);
      const dbData = getLocalDatabase();
      products = (dbData.products || []).filter((p: any) => p.tenantId === tenantId);
    }

    await cacheService.set(cacheKey, products, 300); // cache for 5 minutes
    return res.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'فشل جلب المنتجات' });
  }
};

/**
 * جلب منتج بالمعرف
 * GET /api/inventory/:id
 */
export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    if (isPostgresConnected()) {
      console.log(`Fetching product ${id} from PostgreSQL...`);
      const product = await ProductModel.findOne({ where: { id, tenantId } });
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك الصلاحية للوصول إليه' });
      }
      return res.json(product);
    } else if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('products').doc(id).get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك الصلاحية للوصول إليه' });
      }
      return res.json({ id: doc.id, ...doc.data() });
    } else {
      const dbData = getLocalDatabase();
      const product = (dbData.products || []).find((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك الصلاحية للوصول إليه' });
      }
      return res.json(product);
    }
  } catch (error: any) {
    console.error('Error getting product:', error);
    return res.status(500).json({ error: 'فشل جلب المنتج' });
  }
};

/**
 * إضافة منتج جديد
 * POST /api/inventory
 */
export const createProduct = async (req: Request, res: Response) => {
  const { name, sku, description, unitPrice, stockQuantity, reorderPoint, category } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  
  if (!name || unitPrice === undefined) {
    return res.status(400).json({ error: 'الرجاء إدخال اسم المنتج وسعر الوحدة' });
  }

  const newProduct = {
    tenantId,
    name,
    sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    description: description || '',
    unitPrice: Number(unitPrice),
    stockQuantity: Number(stockQuantity) || 0,
    reorderPoint: Number(reorderPoint) || 0,
    category: category || '',
    isActive: true
  };

  try {
    // Invalidate product cache
    await cacheService.invalidatePrefix('products:');

    if (isPostgresConnected()) {
      console.log('Saving product to PostgreSQL...');
      const pId = req.body.id || `p-${Date.now()}`;
      const product = await ProductModel.create({
        id: pId,
        ...newProduct
      });
      return res.status(201).json(product);
    } else if (isFirebaseConnected() && firestore) {
      const docRef = await firestore.collection('products').add(newProduct);
      return res.status(201).json({ id: docRef.id, ...newProduct });
    } else {
      const db = getLocalDatabase();
      if (!db.products) db.products = [];
      const id = `p-${Date.now()}`;
      const productWithId = { id, ...newProduct };
      db.products.push(productWithId);
      saveLocalDatabase(db);
      return res.status(201).json(productWithId);
    }
  } catch (error: any) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'فشل إضافة المنتج' });
  }
};

/**
 * تحديث منتج
 * PUT /api/inventory/:id
 */
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, sku, description, unitPrice, stockQuantity, reorderPoint, isActive, category } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";

  try {
    // Invalidate product cache
    await cacheService.invalidatePrefix('products:');

    let oldPrice = 0;
    let productName = name || '';

    if (isPostgresConnected()) {
      console.log(`Updating product ${id} in PostgreSQL...`);
      const product = await ProductModel.findOne({ where: { id, tenantId } });
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتعديله' });
      }
      const existingProduct = product.get({ plain: true });
      oldPrice = Number(existingProduct.unitPrice || 0);
      productName = existingProduct.name;

      const updated: any = {};
      if (name !== undefined) updated.name = name;
      if (sku !== undefined) updated.sku = sku;
      if (description !== undefined) updated.description = description;
      if (unitPrice !== undefined) updated.unitPrice = Number(unitPrice);
      if (stockQuantity !== undefined) updated.stockQuantity = Number(stockQuantity);
      if (reorderPoint !== undefined) updated.reorderPoint = Number(reorderPoint);
      if (isActive !== undefined) updated.isActive = isActive;
      await product.update(updated);

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_PRICE',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: unitPrice !== undefined && Number(unitPrice) !== oldPrice
          ? `تم تعديل سعر المنتج "${productName}" من ${oldPrice} ج.م إلى ${unitPrice} ج.م.`
          : `تم تحديث بيانات المنتج "${productName}".`
      });

      return res.json(product);
    } else if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('products').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتعديله' });
      }

      const existing = doc.data() || {};
      oldPrice = Number(existing.unitPrice || 0);
      productName = existing.name || '';

      const updated = {
        name: name !== undefined ? name : existing.name,
        sku: sku !== undefined ? sku : existing.sku,
        description: description !== undefined ? description : existing.description,
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : existing.unitPrice,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
        reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : existing.reorderPoint,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        category: category !== undefined ? category : existing.category,
        updatedAt: new Date().toISOString()
      };

      await docRef.update(updated);

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_PRICE',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: unitPrice !== undefined && Number(unitPrice) !== oldPrice
          ? `تم تعديل سعر المنتج "${productName}" من ${oldPrice} ج.م إلى ${unitPrice} ج.م.`
          : `تم تحديث بيانات المنتج "${productName}".`
      });

      return res.json({ id, ...updated });
    } else {
      const db = getLocalDatabase();
      if (!db.products) db.products = [];
      const idx = db.products.findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx === -1) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتعديله' });
      }

      const existing = db.products[idx];
      oldPrice = Number(existing.unitPrice || 0);
      productName = existing.name || '';

      const updated = {
        ...existing,
        name: name !== undefined ? name : existing.name,
        sku: sku !== undefined ? sku : existing.sku,
        description: description !== undefined ? description : existing.description,
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : existing.unitPrice,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : existing.stockQuantity,
        reorderPoint: reorderPoint !== undefined ? Number(reorderPoint) : existing.reorderPoint,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        category: category !== undefined ? category : existing.category,
        updatedAt: new Date().toISOString()
      };

      db.products[idx] = updated;
      saveLocalDatabase(db);

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_PRICE',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: unitPrice !== undefined && Number(unitPrice) !== oldPrice
          ? `تم تعديل سعر المنتج "${productName}" من ${oldPrice} ج.م إلى ${unitPrice} ج.م.`
          : `تم تحديث بيانات المنتج "${productName}".`
      });

      return res.json(updated);
    }
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'فشل تحديث المنتج' });
  }
};

/**
 * حذف منتج
 * DELETE /api/inventory/:id
 */
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    // Invalidate product cache
    await cacheService.invalidatePrefix('products:');

    if (isPostgresConnected()) {
      console.log(`Deleting product ${id} from PostgreSQL...`);
      const product = await ProductModel.findOne({ where: { id, tenantId } });
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لحذفه' });
      }
      await product.destroy();
      return res.json({ message: 'تم حذف المنتج بنجاح' });
    } else if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('products').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لحذفه' });
      }
      await docRef.delete();
    } else {
      const db = getLocalDatabase();
      if (!db.products) db.products = [];
      const initialLength = db.products.length;
      db.products = db.products.filter((p: any) => !(String(p.id) === String(id) && p.tenantId === tenantId));
      if (db.products.length === initialLength) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لحذفه' });
      }
      saveLocalDatabase(db);
    }
    return res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'فشل حذف المنتج' });
  }
};

/**
 * تحديث كمية المخزون
 * PATCH /api/inventory/:id/stock
 */
export const updateStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  if (quantity === undefined) {
    return res.status(400).json({ error: 'الكمية مطلوبة' });
  }

  try {
    let productName = '';
    let oldStock = 0;

    if (isPostgresConnected()) {
      console.log(`Updating stock for product ${id} in PostgreSQL...`);
      const product = await ProductModel.findOne({ where: { id, tenantId } });
      if (!product) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتحديث مخزونه' });
      }
      productName = product.name;
      oldStock = Number(product.stockQuantity || 0);

      await product.update({ stockQuantity: Number(quantity) });

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_STOCK',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: `تم تحديث كمية مخزون المنتج "${productName}" من ${oldStock} إلى ${quantity}.`
      });

      return res.json({ message: `تم تحديث المخزون إلى ${quantity}` });
    } else if (isFirebaseConnected() && firestore) {
      const docRef = firestore.collection('products').doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.tenantId !== tenantId) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتحديث مخزونه' });
      }
      const data = doc.data() || {};
      productName = data.name || '';
      oldStock = Number(data.stockQuantity || 0);

      await docRef.update({ stockQuantity: Number(quantity) });

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_STOCK',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: `تم تحديث كمية مخزون المنتج "${productName}" من ${oldStock} إلى ${quantity}.`
      });

    } else {
      const db = getLocalDatabase();
      if (!db.products) db.products = [];
      const idx = db.products.findIndex((p: any) => String(p.id) === String(id) && p.tenantId === tenantId);
      if (idx === -1) {
        return res.status(404).json({ error: 'المنتج غير موجود أو لا تملك صلاحية لتحديث مخزونه' });
      }
      const p = db.products[idx];
      productName = p.name || '';
      oldStock = Number(p.stockQuantity || 0);

      db.products[idx].stockQuantity = Number(quantity);
      saveLocalDatabase(db);

      const userObj = (req as any).user;
      await logAuditHelper({
        userId: userObj?.id || 'u-1',
        userName: userObj?.name || 'أحمد حماد',
        userRole: userObj?.role || 'admin',
        actionType: 'UPDATE_STOCK',
        tableName: 'products',
        recordId: id,
        recordIdentifier: productName,
        description: `تم تحديث كمية مخزون المنتج "${productName}" من ${oldStock} إلى ${quantity}.`
      });
    }
    return res.json({ message: `تم تحديث المخزون إلى ${quantity}` });
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return res.status(500).json({ error: 'فشل تحديث المخزون' });
  }
};
