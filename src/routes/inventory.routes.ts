import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock
} from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all inventory endpoints
router.use(authenticate);

// GET /api/inventory - جلب جميع المنتجات (الأدمن، المدير، المستودع، الموظف)
router.get('/', authorize('admin', 'manager', 'warehouse', 'employee', 'user'), getProducts);

// GET /api/inventory/:id - جلب منتج بالمعرف
router.get('/:id', authorize('admin', 'manager', 'warehouse', 'employee', 'user'), getProductById);

// POST /api/inventory - إضافة منتج جديد (الأدمن والمدير)
router.post('/', authorize('admin', 'manager'), createProduct);

// PUT /api/inventory/:id - تحديث منتج (سعر) (الأدمن والمدير)
router.put('/:id', authorize('admin', 'manager'), updateProduct);

// DELETE /api/inventory/:id - حذف منتج (الأدمن فقط)
router.delete('/:id', authorize('admin'), deleteProduct);

// PATCH /api/inventory/:id/stock - تحديث كمية المخزون (الأدمن، المدير، المستودع)
router.patch('/:id/stock', authorize('admin', 'manager', 'warehouse'), updateStock);
router.put('/:id/stock', authorize('admin', 'manager', 'warehouse'), updateStock); // Support PUT for compatibility

export default router;

