export type UserRole = 'admin' | 'accountant' | 'sales' | 'viewer';
export type SubscriptionPlanName = 'basic' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: SubscriptionPlanName;
  subscriptionStatus: string;
  subscriptionEndsAt: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId?: string;
  isActive: boolean;
  balance: number;
}

export interface Contact {
  id: string;
  tenantId: string;
  type: 'customer' | 'vendor';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  contactId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'unpaid' | 'paid' | 'overdue' | 'Pending Approval';
  notes?: string;
  createdAt: string;
  lines: InvoiceLine[];
}

export interface Expense {
  id: string;
  tenantId: string;
  contactId?: string; // Optional vendor
  expenseDate: string;
  amount: number;
  category: string;
  description?: string;
  receiptUrl?: string; // Base64 or mock URL
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  tenantId: string;
  bankAccountId: string; // e.g., 'Al-Rajhi Bank Main' or 'Cash On Hand'
  date: string;
  amount: number; // positive = credit/deposit, negative = debit/withdrawal
  description: string;
  category?: string;
  isReconciled: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  stockQuantity: number;
  reorderPoint: number;
  isActive: boolean;
  category?: string;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  managerId?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  department: string; // Storing department name or ID
  departmentId?: string; // Links to Department
  position: string;
  basicSalary: number;
  allowance: number;
  iban: string;
  joinDate: string;
  isActive: boolean;
  nationalId?: string;
  birthDate?: string;
  socialInsuranceNumber?: string;
  address?: string;
  phone?: string;
  status?: 'active' | 'terminated' | 'on_leave';
  worker_type?: 'employee' | 'daily_worker' | 'probation';
  is_daily_worker?: boolean;
  daily_wage?: number;
  is_available?: boolean;
  daily_rate?: number;
  employment_type?: string;
  full_name?: string;
  subject_to_social_insurance?: boolean;
}

export interface Payroll {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  month: string;
  basicSalary: number;
  allowance: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  paidAt?: string;
  
  // Snake case aliases for compatibility
  net_salary?: number;
  employee_name?: string;
  employee_id?: string;
  basic_salary?: number;
  base_salary?: number;
  month_year?: string;
  net_amount?: number;
  present_days?: number;
  presentDays?: number;
  absent_days?: number;
  absentDays?: number;
  leave_days?: number;
  leaveDays?: number;
  annual_leave_days?: number;
  annualLeaveDays?: number;
  non_annual_leave_days?: number;
  nonAnnualLeaveDays?: number;
  overtime_hours?: number;
  overtimeHours?: number;
  allowances?: number;
  bonuses?: number;
  bonus?: number;
  social_insurance?: number;
  socialInsurance?: number;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
  
  // Aliases for compatibility
  employee_name?: string;
  start_date?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface Approval {
  id: string;
  tenantId: string;
  recordType: 'invoice' | 'expense' | 'payroll' | 'purchase_order';
  recordId: string;
  recordIdentifier?: string;
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RecurringInvoiceTemplate {
  id: string;
  tenantId: string;
  contactId: string;
  contactName?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextExecutionDate: string;
  lastExecutionDate?: string;
  isActive: boolean;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    productId?: string;
  }[];
}
