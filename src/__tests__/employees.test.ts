import { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employees.controller';
import { Request, Response } from 'express';

// Mocking firebase.service
const mockGet = jest.fn();
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDoc = jest.fn();

const mockQuery: any = {
  where: () => mockQuery,
  get: mockGet,
};

jest.mock('../../services/firebase.service', () => ({
  isFirebaseConnected: jest.fn(() => true),
  firestore: {
    collection: () => ({
      where: () => mockQuery,
      get: mockGet,
      add: mockAdd,
      doc: (id: string) => ({
        get: () => mockDoc(id),
        update: mockUpdate,
        delete: mockDelete,
      }),
    }),
  },
}));

describe('Employees Controller Tests', () => {
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

  describe('getEmployees', () => {
    it('should return all employees when firebase is connected', async () => {
      const mockEmployeesData = [
        { id: '1', name: 'Ahmad', tenantId: 'tenant-promet-sa' },
        { id: '2', name: 'Sara', tenantId: 'tenant-promet-sa' },
      ];
      mockGet.mockResolvedValueOnce({
        docs: mockEmployeesData.map(data => ({
          id: data.id,
          data: () => ({ name: data.name, tenantId: 'tenant-promet-sa' }),
        })),
      });

      await getEmployees(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(mockEmployeesData);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee details if found', async () => {
      req.params = { id: 'emp-1' };
      mockDoc.mockResolvedValueOnce({
        exists: true,
        id: 'emp-1',
        data: () => ({ name: 'Ahmad', position: 'Developer', tenantId: 'tenant-promet-sa' }),
      });

      await getEmployeeById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        id: 'emp-1',
        name: 'Ahmad',
        position: 'Developer',
        tenantId: 'tenant-promet-sa',
      });
    });

    it('should return 404 if employee is not found', async () => {
      req.params = { id: 'emp-nonexistent' };
      mockDoc.mockResolvedValueOnce({
        exists: false,
      });

      await getEmployeeById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'الموظف غير موجود في قاعدة بيانات Firebase أو لا تملك الصلاحية للوصول إليه' });
    });
  });

  describe('createEmployee', () => {
    it('should create and return new employee', async () => {
      req.body = { name: 'Ali', position: 'Manager' };
      mockAdd.mockResolvedValueOnce({ id: 'new-id-123' });

      await createEmployee(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'new-id-123',
        name: 'Ali',
        position: 'Manager',
      }));
    });
  });

  describe('updateEmployee', () => {
    it('should update employee and return updated data', async () => {
      req.params = { id: 'emp-1' };
      req.body = { name: 'Ahmad Updated', position: 'Senior Developer' };
      mockDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa', name: 'Ahmad' }),
      });
      mockUpdate.mockResolvedValueOnce(undefined);

      await updateEmployee(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        id: 'emp-1',
        name: 'Ahmad Updated',
        position: 'Senior Developer',
      }));
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee successfully', async () => {
      req.params = { id: 'emp-1' };
      mockDoc.mockResolvedValueOnce({
        exists: true,
        data: () => ({ tenantId: 'tenant-promet-sa', name: 'Ahmad' }),
      });
      mockDelete.mockResolvedValueOnce(undefined);

      await deleteEmployee(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'تم حذف الموظف بنجاح من قاعدة البيانات',
      });
    });
  });
});
