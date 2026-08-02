import { getPayroll, createPayroll, updatePayroll, deletePayroll } from '../controllers/payroll.controller';
import { Request, Response } from 'express';
import { firestore } from '../../services/firebase.service';

jest.mock('../../services/firebase.service', () => {
  const mockGet = jest.fn();
  const mockAdd = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSet = jest.fn();
  const mockDocGet = jest.fn(() => Promise.resolve({ exists: true, data: () => ({ tenantId: "tenant-promet-sa" }) }));

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

describe('Payroll Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = { query: {} };
    res = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe('getPayroll', () => {
    it('should return all payroll records', async () => {
      const mockPayrollData = [
        { id: 'pay1', employeeId: 'emp1', salary: 5000, month: '2026-07' },
        { id: 'pay2', employeeId: 'emp2', salary: 6000, month: '2026-07' },
      ];
      mockGet
        .mockResolvedValueOnce({
          docs: mockPayrollData.map(data => ({
            id: data.id,
            data: () => ({ employeeId: data.employeeId, salary: data.salary, month: data.month, tenantId: "tenant-promet-sa" }),
          })),
        })
        .mockResolvedValueOnce({
          docs: [],
        });

      await getPayroll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return 500 status on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      await getPayroll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل جلب مسيرات الرواتب' });
    });
  });

  describe('createPayroll', () => {
    it('should create and return new payroll record', async () => {
      const newPayroll = { employeeId: 'emp3', basicSalary: 5500, month: '2026-07' };
      req.body = newPayroll;
      mockAdd.mockResolvedValueOnce({ id: 'new-pay-123' });

      await createPayroll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-pay-123',
        ...newPayroll,
      }));
    });

    it('should return 500 status on failure', async () => {
      req.body = { salary: 5500 };
      mockAdd.mockRejectedValueOnce(new Error('فشل إضافة الراتب'));

      await createPayroll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل إضافة الراتب' });
    });
  });

  describe('updatePayroll', () => {
    it('should update payroll and return success message', async () => {
      req.params = { id: 'pay1' };
      req.body = { salary: 5200 };
      mockUpdate.mockResolvedValueOnce(undefined);

      await updatePayroll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        salary: 5200,
      }));
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'pay1' };
      req.body = { salary: 5200 };
      mockSet.mockRejectedValueOnce(new Error('فشل تحديث الراتب'));

      await updatePayroll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تحديث الراتب' });
    });
  });

  describe('deletePayroll', () => {
    it('should delete payroll and return success message', async () => {
      req.params = { id: 'pay1' };
      mockDelete.mockResolvedValueOnce(undefined);

      await deletePayroll(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'تم حذف مسيرة الراتب بنجاح' });
    });

    it('should return 500 status on failure', async () => {
      req.params = { id: 'pay1' };
      mockDelete.mockRejectedValueOnce(new Error('فشل حذف الراتب'));

      await deletePayroll(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل حذف الراتب' });
    });
  });
});
