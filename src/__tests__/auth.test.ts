import { login, register, verifyToken } from '../controllers/auth.controller';
import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { firestore } from '../../services/firebase.service';

// Mocking bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mocking jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../services/firebase.service', () => {
  const mockWhereGet = jest.fn();
  const mockAdd = jest.fn();
  const mockDocSet = jest.fn(() => Promise.resolve());

  const chainObj: any = {
    get: mockWhereGet,
    add: mockAdd,
    doc: (id: string) => ({
      set: mockDocSet,
    }),
  };
  chainObj.where = jest.fn(() => chainObj);

  return {
    isFirebaseConnected: jest.fn(() => true),
    firestore: {
      collection: jest.fn(() => chainObj),
      _mockWhereGet: mockWhereGet,
      _mockAdd: mockAdd,
      _mockDocSet: mockDocSet,
    },
  };
});

const mockWhereGet = (firestore as any)._mockWhereGet;
const mockAdd = (firestore as any)._mockAdd;
const mockDocSet = (firestore as any)._mockDocSet;

describe('Auth Controller Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' } as any,
    };
    res = {
      json: jsonMock,
      status: statusMock,
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 400 if email or password is empty', async () => {
      req.body = { email: '' };

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    });

    it('should return 401 if user is not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'password123' };
      mockWhereGet.mockResolvedValueOnce({ empty: true });

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    });

    it('should return 401 if password is invalid', async () => {
      req.body = { email: 'user@example.com', password: 'wrongpassword' };
      mockWhereGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'user123',
            data: () => ({ email: 'user@example.com', passwordHash: 'hashedpwd' }),
          },
        ],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    });

    it('should login successfully and return token and user without passwordHash', async () => {
      req.body = { email: 'user@example.com', password: 'correctpassword' };
      mockWhereGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'user123',
            data: () => ({ email: 'user@example.com', passwordHash: 'hashedpwd', role: 'admin', name: 'Test User' }),
          },
        ],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce('mockedtoken');

      await login(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: '✅ تم تسجيل الدخول بنجاح',
        token: 'mockedtoken',
        user: {
          id: 'user123',
          email: 'user@example.com',
          role: 'admin',
          name: 'Test User',
        },
      });
    });

    it('should return 500 on server error', async () => {
      req.body = { email: 'user@example.com', password: 'correctpassword' };
      mockWhereGet.mockRejectedValueOnce(new Error('Database error'));

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل تسجيل الدخول' });
    });
  });

  describe('register', () => {
    it('should return 400 if fields are missing', async () => {
      req.body = { email: 'user@example.com', name: '' };

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'جميع الحقول مطلوبة' });
    });

    it('should return 409 if email already exists', async () => {
      req.body = { email: 'existing@example.com', password: 'password', name: 'Existing User' };
      mockWhereGet.mockResolvedValueOnce({ empty: false });

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'البريد الإلكتروني موجود بالفعل' });
    });

    it('should register successfully, hash password, add to database, and return a token', async () => {
      req.body = { email: 'new@example.com', password: 'password', name: 'New User', role: 'user' };
      mockWhereGet.mockResolvedValueOnce({ empty: true });
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedpassword');
      mockAdd.mockResolvedValueOnce({ id: 'new-user-123' });
      (jwt.sign as jest.Mock).mockReturnValueOnce('newmockedtoken');

      await register(req as Request, res as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        passwordHash: 'hashedpassword',
        name: 'New User',
        role: 'user',
      }));
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: '✅ تم إنشاء الحساب بنجاح',
        token: 'newmockedtoken',
        user: expect.objectContaining({
          id: expect.any(String),
          email: 'new@example.com',
          name: 'New User',
          role: 'user',
        }),
      }));
    });

    it('should return 500 on server error', async () => {
      req.body = { email: 'new@example.com', password: 'password', name: 'New User' };
      mockWhereGet.mockRejectedValueOnce(new Error('Firestore down'));

      await register(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'فشل إنشاء الحساب' });
    });
  });

  describe('verifyToken', () => {
    it('should return 401 if no authorization header or bearer token', async () => {
      req.headers = {};

      await verifyToken(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'غير مصرح' });
    });

    it('should verify and return user details if token is valid', async () => {
      req.headers = { authorization: 'Bearer validtoken' };
      const decodedUser = { id: 'user123', email: 'user@example.com', role: 'admin' };
      (jwt.verify as jest.Mock).mockReturnValueOnce(decodedUser);

      await verifyToken(req as Request, res as Response);

      expect(jwt.verify).toHaveBeenCalledWith('validtoken', expect.any(String));
      expect(jsonMock).toHaveBeenCalledWith({ valid: true, user: decodedUser });
    });

    it('should return 401 if token is invalid or expired', async () => {
      req.headers = { authorization: 'Bearer invalidtoken' };
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Token expired');
      });

      await verifyToken(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'توكن غير صالح' });
    });
  });
});
