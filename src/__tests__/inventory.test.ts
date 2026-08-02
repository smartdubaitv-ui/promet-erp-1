import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, updateStock } from '../controllers/inventory.controller';
import { Request, Response } from 'express';
import { firestore } from '../../services/firebase.service';

jest.mock('../services/cache.service', () => ({
  cacheService: {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve()),
    invalidatePrefix: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../services/firebase.service', () => {
  const mockGet = jest.fn();
  const mockAdd = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockDocGet = jest.fn();

  const chainObj: any = {
    get: mockGet,
    add: mockAdd,
    doc: (id: string) => ({
      get: mockDocGet,
      update: mockUpdate,
      delete: mockDelete,
    }),
  };
  chainObj.where = jest.fn(() => chainObj);
  chainObj.limit = jest.fn(() => chainObj);
  chainObj.orderBy = jest.fn(() => chainObj);

  return {
    isFirebaseConnected: jest.fn(() => true),
    firestore: {
      collection: jest.fn(() => chainObj),
      _mockGet: mockGet,
      _mockAdd: mockAdd,
      _mockUpdate: mockUpdate,
      _mockDelete: mockDelete,
      _mockDocGet: mockDocGet,
    },
  };
});

const mockGet = (firestore as any)._mockGet;
const mockAdd = (firestore as any)._mockAdd;
const mockUpdate = (firestore as any)._mockUpdate;
const mockDelete = (firestore as any)._mockDelete;
const mockDocGet = (firestore as any)._mockDocGet;

describe('Inventory Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {};
    res = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return all products', async () => {
      const mockProductsData = [
        { id: '1', name: 'Product A', price: 100, stockQuantity: 5 },
        { id: '2', name: 'Product B', price: 200, stockQuantity: 10 },
      ];
      mockGet.mockResolvedValueOnce({
        docs: mockProductsData.map(data => ({
          id: data.id,
          data: () => ({ name: data.name, price: data.price, stockQuantity: data.stockQuantity }),
        })),
      });

      await getProducts(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(mockProductsData);
    });

    it('should return 500 status on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      await getProducts(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل جلب المنتجات' });
    });
  });

  describe('getProductById', () => {
    it('should return product details if found', async () => {
      req.params = { id: 'prod-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: 'prod-1',
        data: () => ({ name: 'Product A', price: 100, stockQuantity: 5, tenantId: 'tenant-promet-sa' }),
      });

      await getProductById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        id: 'prod-1',
        name: 'Product A',
        price: 100,
        stockQuantity: 5,
        tenantId: 'tenant-promet-sa',
      });
    });

    it('should return 404 if product is not found', async () => {
      req.params = { id: 'prod-nonexistent' };
      mockDocGet.mockResolvedValueOnce({
        exists: false,
      });

      await getProductById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'المنتج غير موجود أو لا تملك الصلاحية للوصول إليه' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'prod-1' };
      mockDocGet.mockRejectedValueOnce(new Error('Firestore error'));

      await getProductById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل جلب المنتج' });
    });
  });

  describe('createProduct', () => {
    it('should create and return new product', async () => {
      const newProduct = { name: 'Product C', unitPrice: 150, stockQuantity: 20 };
      req.body = newProduct;
      mockAdd.mockResolvedValueOnce({ id: 'new-prod-123' });

      await createProduct(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-prod-123',
        name: 'Product C',
        unitPrice: 150,
        stockQuantity: 20,
      }));
    });

    it('should return 500 status on failure', async () => {
      req.body = { name: 'Product C', unitPrice: 150 };
      mockAdd.mockRejectedValueOnce(new Error('Firestore error'));

      await createProduct(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل إضافة المنتج' });
    });
  });

  describe('updateProduct', () => {
    it('should update product and return success message', async () => {
      req.params = { id: 'prod-1' };
      req.body = { unitPrice: 120 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', unitPrice: 100, tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      await updateProduct(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'prod-1',
        unitPrice: 120,
      }));
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'prod-1' };
      req.body = { unitPrice: 120 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', unitPrice: 100, tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockRejectedValueOnce(new Error('Firestore error'));

      await updateProduct(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تحديث المنتج' });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product and return success message', async () => {
      req.params = { id: 'prod-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', tenantId: 'tenant-promet-sa' }),
      });
      mockDelete.mockResolvedValueOnce(undefined);

      await deleteProduct(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'تم حذف المنتج بنجاح' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'prod-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', tenantId: 'tenant-promet-sa' }),
      });
      mockDelete.mockRejectedValueOnce(new Error('Firestore error'));

      await deleteProduct(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل حذف المنتج' });
    });
  });

  describe('updateStock', () => {
    it('should update stock quantity and return success message', async () => {
      req.params = { id: 'prod-1' };
      req.body = { quantity: 15 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      await updateStock(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'تم تحديث المخزون إلى 15' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'prod-1' };
      req.body = { quantity: 15 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Product A', tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockRejectedValueOnce(new Error('Firestore error'));

      await updateStock(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تحديث المخزون' });
    });
  });
});
