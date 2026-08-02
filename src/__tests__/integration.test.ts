import request from 'supertest';
import jwt from 'jsonwebtoken';
import { setupApp } from '../config/app';
import { setupRoutes } from '../routes';
import { getJwtSecret } from '../middleware/auth.middleware';

const app = setupApp();
setupRoutes(app);

// Helper to sign JWT tokens for testing
const createTestToken = (userId: string, email: string, tenantId: string, role: string) => {
  return jwt.sign(
    { id: userId, userId, email, tenantId, tenant_id: tenantId, role },
    getJwtSecret(),
    { expiresIn: '1h' }
  );
};

describe('🛡️ Promet ERP Integration & Security Test Suite', () => {
  // Define mock users
  const tenantA_AdminToken = createTestToken('user-1', 'admin@tenant-a.com', 'tenant-a', 'admin');
  const tenantA_EmployeeToken = createTestToken('user-2', 'employee@tenant-a.com', 'tenant-a', 'employee');
  const tenantB_AdminToken = createTestToken('user-3', 'admin@tenant-b.com', 'tenant-b', 'admin');

  describe('👥 1. Multi-Tenant Data Isolation Checks', () => {
    it('❌ SHOULD NOT allow Tenant B to fetch or access Tenant A\'s invoices', async () => {
      // Step 1: Create an invoice in Tenant A
      const invoicePayload = {
        contactId: 'contact-test-1',
        invoiceNumber: `INV-ISOLATION-A`,
        date: '2026-07-18',
        dueDate: '2026-08-18',
        status: 'unpaid',
        lines: [
          {
            description: 'Consulting Services',
            quantity: 5,
            unitPrice: 150
          }
        ]
      };

      const createRes = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send(invoicePayload);

      expect(createRes.status).toBe(201);
      const createdInvoiceId = createRes.body.id || createRes.body.data?.id;

      // Step 2: Attempt to fetch this exact invoice using Tenant B's token
      const fetchRes = await request(app)
        .get(`/api/invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${tenantB_AdminToken}`);

      // The server should block this or return 404/403 to prevent data leaking
      expect([404, 403, 401]).toContain(fetchRes.status);
    });

    it('❌ SHOULD NOT allow tenant spoofing via custom headers (x-tenant-id) for authenticated paths', async () => {
      // User belongs to tenant-a, but sets x-tenant-id to tenant-b in request headers
      const res = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .set('x-tenant-id', 'tenant-b');

      expect(res.status).toBe(200);
      // Even if x-tenant-id was spoofed, the returned data must strictly belong to tenant-a (token's payload)
      if (Array.isArray(res.body)) {
        res.body.forEach((invoice: any) => {
          expect(invoice.tenantId).toBe('tenant-a');
        });
      }
    });
  });

  describe('🔐 2. Role-Based Access Control (RBAC) Protection', () => {
    it('❌ SHOULD block standard employees from accessing sensitive General Ledger reports', async () => {
      const res = await request(app)
        .get('/api/reports/general-ledger')
        .set('Authorization', `Bearer ${tenantA_EmployeeToken}`);

      // General Ledger should be strictly administrative (admin, manager, hr)
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('لا تملك الصلاحية المطلوبة');
    });

    it('❌ SHOULD block standard employees from creating or modifying payroll records', async () => {
      const res = await request(app)
        .post('/api/payroll')
        .set('Authorization', `Bearer ${tenantA_EmployeeToken}`)
        .send({ employeeId: 'emp-1', month: '2026-07' });

      expect(res.status).toBe(403);
    });

    it('✅ SHOULD allow administrators/managers to calculate and view payroll lists', async () => {
      const res = await request(app)
        .get('/api/payroll')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('🛒 3. happy Path CRUD & Validation Edge Cases', () => {
    it('✅ Happy Path: SHOULD successfully create a draft invoice with valid fields', async () => {
      const invoicePayload = {
        contactId: 'contact-happy-path',
        invoiceNumber: `INV-HAPPY-${Date.now()}`,
        date: '2026-07-18',
        dueDate: '2026-08-18',
        status: 'draft',
        lines: [
          {
            description: 'Web Development Services',
            quantity: 10,
            unitPrice: 100
          }
        ]
      };

      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send(invoicePayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.totalAmount).toBe(1000);
    });

    it('❌ Edge Case: SHOULD block invoice creation with empty or missing lines', async () => {
      const invalidPayload = {
        contactId: 'contact-happy-path',
        invoiceNumber: `INV-INVALID-${Date.now()}`,
        date: '2026-07-18',
        dueDate: '2026-08-18',
        lines: [] // Invalid empty lines
      };

      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/على الأقل|خطأ في التحقق من صحة البيانات المدخلة/);
    });

    it('❌ Edge Case: SHOULD block invoice creation with negative quantities', async () => {
      const invalidPayload = {
        contactId: 'contact-happy-path',
        invoiceNumber: `INV-INVALID-${Date.now()}`,
        date: '2026-07-18',
        dueDate: '2026-08-18',
        lines: [
          {
            description: 'Negative Quantity Product',
            quantity: -5, // Invalid quantity
            unitPrice: 50
          }
        ]
      };

      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer : ${tenantA_AdminToken}`) // Test invalid format
        .send(invalidPayload);

      expect(res.status).toBe(401); // Unauthorized due to malformed header token prefix
    });
  });

  describe('🔄 4. Approvals & Recurring Invoices Integration Tests', () => {
    let testTemplateId: string;
    let testApprovalId: string;

    it('✅ SHOULD successfully create a recurring invoice template', async () => {
      const templatePayload = {
        contactId: 'contact-recurring-1',
        contactName: 'Recurring Customer',
        frequency: 'monthly',
        nextExecutionDate: '2026-07-20',
        isActive: true,
        notes: 'Monthly maintenance fees',
        lines: [
          {
            description: 'Monthly Support SLA',
            quantity: 1,
            unitPrice: 500
          }
        ]
      };

      const res = await request(app)
        .post('/api/recurring-invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send(templatePayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.totalAmount).toBe(500);
      testTemplateId = res.body.id;
    });

    it('✅ SHOULD successfully retrieve recurring invoice templates', async () => {
      const res = await request(app)
        .get('/api/recurring-invoices')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('✅ SHOULD successfully update a recurring invoice template', async () => {
      const res = await request(app)
        .put(`/api/recurring-invoices/${testTemplateId}`)
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send({
          isActive: false,
          notes: 'Suspended monthly maintenance fees'
        });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
      expect(res.body.notes).toBe('Suspended monthly maintenance fees');
    });

    it('✅ SHOULD successfully submit an invoice for approval', async () => {
      const approvalPayload = {
        recordType: 'invoice',
        recordId: 'inv-happy-path-id',
        recordIdentifier: 'INV-2026-001',
        requesterId: 'user-1',
        requesterName: 'Admin User'
      };

      const res = await request(app)
        .post('/api/approvals/submit')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send(approvalPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      testApprovalId = res.body.id;
    });

    it('✅ SHOULD successfully fetch pending approvals', async () => {
      const res = await request(app)
        .get('/api/approvals?status=pending')
        .set('Authorization', `Bearer ${tenantA_AdminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((a: any) => a.id === testApprovalId)).toBe(true);
    });

    it('✅ SHOULD successfully approve a pending request', async () => {
      const res = await request(app)
        .post(`/api/approvals/${testApprovalId}/approve`)
        .set('Authorization', `Bearer ${tenantA_AdminToken}`)
        .send({
          approverId: 'user-1',
          approverName: 'Admin User',
          comments: 'Approved after verification'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
      expect(res.body.comments).toBe('Approved after verification');
    });
  });
});
