import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, updateInvoiceStatus } from '../controllers/invoices.controller';
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
  const mockSet = jest.fn();
  const mockDocGet = jest.fn();

  const chainObj: any = {
    get: mockGet,
    add: mockAdd,
    doc: (id: string) => ({
      get: mockDocGet,
      update: mockUpdate,
      delete: mockDelete,
      set: mockSet,
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
      _mockSet: mockSet,
    },
  };
});

const mockGet = (firestore as any)._mockGet;
const mockAdd = (firestore as any)._mockAdd;
const mockUpdate = (firestore as any)._mockUpdate;
const mockDelete = (firestore as any)._mockDelete;
const mockDocGet = (firestore as any)._mockDocGet;
const mockSet = (firestore as any)._mockSet;

describe('Invoices Controller Tests', () => {
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

    // Reset mock implementations and histories
    mockGet.mockReset();
    mockDocGet.mockReset();
    mockAdd.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockSet.mockReset();

    // Apply defaults
    mockGet.mockResolvedValue({
      docs: [],
      empty: true,
      size: 0,
    });
    mockDocGet.mockResolvedValue({
      exists: true,
      id: 'doc-123',
      data: () => ({ tenantId: 'tenant-promet-sa' }),
    });
  });

  describe('getInvoices', () => {
    it('should return all invoices', async () => {
      const mockInvoicesData = [
        { id: 'inv1', clientName: 'Client A', amount: 1500, status: 'unpaid', tenantId: 'tenant-promet-sa' },
        { id: 'inv2', clientName: 'Client B', amount: 3200, status: 'paid', tenantId: 'tenant-promet-sa' },
      ];
      mockGet
        .mockResolvedValueOnce({ docs: [] }) // contacts
        .mockResolvedValueOnce({ docs: [] }) // invoices recalculation
        .mockResolvedValueOnce({ docs: [] }) // expenses
        .mockResolvedValueOnce({
          docs: mockInvoicesData.map(data => ({
            id: data.id,
            data: () => ({ clientName: data.clientName, amount: data.amount, status: data.status, tenantId: 'tenant-promet-sa' }),
          })),
        }); // final fetch invoices

      await getInvoices(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(mockInvoicesData);
    });

    it('should return 500 status on failure', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'));

      await getInvoices(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل جلب الفواتير' });
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice details if found', async () => {
      req.params = { id: 'inv-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: 'inv-1',
        data: () => ({ clientName: 'Client A', amount: 1500, status: 'unpaid', tenantId: 'tenant-promet-sa' }),
      });

      await getInvoiceById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        id: 'inv-1',
        clientName: 'Client A',
        amount: 1500,
        status: 'unpaid',
        tenantId: 'tenant-promet-sa',
      });
    });

    it('should return 404 if invoice is not found', async () => {
      req.params = { id: 'inv-nonexistent' };
      mockDocGet.mockResolvedValueOnce({
        exists: false,
      });

      await getInvoiceById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'الفاتورة غير موجودة أو لا تملك الصلاحية للوصول إليها' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'inv-1' };
      mockDocGet.mockRejectedValueOnce(new Error('Firestore error'));

      await getInvoiceById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل جلب الفاتورة' });
    });
  });

  describe('createInvoice', () => {
    it('should create and return new invoice', async () => {
      const newInvoice = {
        contactId: 'contact-1',
        date: '2026-07-18',
        dueDate: '2026-08-18',
        lines: [
          { productId: 'prod-1', quantity: 2 }
        ],
        status: 'unpaid'
      };
      req.body = newInvoice;

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ plan: 'premium' }),
      });

      mockGet
        .mockResolvedValueOnce({ size: 5 }) // invoices count
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'prod-1',
              data: () => ({ tenantId: 'tenant-promet-sa', name: 'Product A', unitPrice: 1250 }),
            }
          ]
        }); // products list

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: 'prod-1',
        data: () => ({ tenantId: 'tenant-promet-sa', name: 'Product A', unitPrice: 1250 }),
      });

      await createInvoice(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(String),
        status: 'unpaid',
        totalAmount: 2500,
      }));
    });

    it('should return 500 status on failure', async () => {
      req.body = {
        contactId: 'contact-1',
        date: '2026-07-18',
        dueDate: '2026-08-18',
        lines: [
          { productId: 'prod-1', quantity: 2 }
        ],
        status: 'unpaid'
      };
      mockDocGet.mockRejectedValueOnce(new Error('Firestore error'));

      await createInvoice(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل إضافة الفاتورة: Firestore error' });
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice and return success message', async () => {
      req.params = { id: 'inv-1' };
      req.body = { paidAmount: 1500 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: 'inv-1',
        data: () => ({ invoiceNumber: 'INV-123', totalAmount: 1500, paidAmount: 0, status: 'unpaid', tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      await updateInvoice(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'inv-1',
        paidAmount: 1500,
        status: 'paid',
      }));
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'inv-1' };
      req.body = { paidAmount: 1500 };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        id: 'inv-1',
        data: () => ({ invoiceNumber: 'INV-123', totalAmount: 1500, paidAmount: 0, status: 'unpaid', tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockRejectedValueOnce(new Error('Firestore error'));

      await updateInvoice(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تحديث الفاتورة' });
    });
  });

  describe('deleteInvoice', () => {
    it('should delete invoice and return success message', async () => {
      req.params = { id: 'inv-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa' }),
      });
      mockDelete.mockResolvedValueOnce(undefined);

      await deleteInvoice(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'تم حذف الفاتورة بنجاح' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'inv-1' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa' }),
      });
      mockDelete.mockRejectedValueOnce(new Error('Firestore error'));

      await deleteInvoice(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل حذف الفاتورة' });
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update status and return success message', async () => {
      req.params = { id: 'inv-1' };
      req.body = { status: 'paid' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      await updateInvoiceStatus(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'تم تحديث حالة الفاتورة إلى paid' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'inv-1' };
      req.body = { status: 'paid' };
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa' }),
      });
      mockUpdate.mockRejectedValueOnce(new Error('Firestore error'));

      await updateInvoiceStatus(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تحديث حالة الفاتورة' });
    });
  });
});
