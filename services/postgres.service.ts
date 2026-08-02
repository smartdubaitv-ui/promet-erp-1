import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'postgres_db';
const DATABASE_URL = process.env.DATABASE_URL || '';

let sequelize: Sequelize;
let pgConnected = false;

// Initialize Sequelize
try {
  if (DATABASE_URL) {
    sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
} catch (error) {
  console.error('PostgreSQL Service: Initialization failed:', error);
}

export class EmployeeModel extends Model {
  public id!: string;
  public tenantId!: string;
  public name!: string;
  public email!: string;
  public department!: string;
  public departmentId?: string;
  public position!: string;
  public basicSalary!: number;
  public allowance!: number;
  public iban!: string;
  public joinDate!: string;
  public isActive!: boolean;
  public nationalId?: string;
  public birthDate?: string;
  public socialInsuranceNumber?: string;
  public address?: string;
  public phone?: string;
  public status?: string;
  public worker_type?: string;
  public is_daily_worker?: boolean;
  public daily_wage?: number;
  public is_available?: boolean;
  public daily_rate?: number;
  public employment_type?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Define the Employee model
if (sequelize!) {
  EmployeeModel.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'tenant_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'department_id'
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false
    },
    basicSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'basic_salary',
      defaultValue: 0.00
    },
    allowance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    iban: {
      type: DataTypes.STRING,
      allowNull: true
    },
    joinDate: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'join_date'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    nationalId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'national_id'
    },
    birthDate: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'birth_date'
    },
    socialInsuranceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'social_insurance_number'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'active'
    },
    worker_type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'employee'
    },
    is_daily_worker: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    daily_wage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    daily_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    employment_type: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'employment_type'
    }
  }, {
    sequelize,
    tableName: 'employees',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] }
    ]
  });
}

export class PayrollModel extends Model {
  public id!: string;
  public tenantId!: string;
  public employeeId!: string;
  public employeeName!: string;
  public month!: string;
  public basicSalary!: number;
  public allowance!: number;
  public deductions!: number;
  public netSalary!: number;
  public status!: string;
  public paidAt?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  PayrollModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    employeeId: { type: DataTypes.STRING, allowNull: false, field: 'employee_id' },
    employeeName: { type: DataTypes.STRING, allowNull: false, field: 'employee_name' },
    month: { type: DataTypes.STRING, allowNull: false },
    basicSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'basic_salary', defaultValue: 0.00 },
    allowance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    deductions: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    netSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'net_salary', defaultValue: 0.00 },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    paidAt: { type: DataTypes.STRING, allowNull: true, field: 'paid_at' }
  }, {
    sequelize,
    tableName: 'payroll',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['employee_id'] }
    ]
  });
}

export class ProductModel extends Model {
  public id!: string;
  public tenantId!: string;
  public name!: string;
  public sku!: string;
  public description!: string;
  public unitPrice!: number;
  public stockQuantity!: number;
  public reorderPoint!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  ProductModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    name: { type: DataTypes.STRING, allowNull: false },
    sku: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'unit_price', defaultValue: 0.00 },
    stockQuantity: { type: DataTypes.INTEGER, allowNull: false, field: 'stock_quantity', defaultValue: 0 },
    reorderPoint: { type: DataTypes.INTEGER, allowNull: false, field: 'reorder_point', defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
  }, {
    sequelize,
    tableName: 'products',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['sku'] }
    ]
  });
}

export class InvoiceModel extends Model {
  public id!: string;
  public tenantId!: string;
  public contactId!: string;
  public invoiceNumber!: string;
  public date!: string;
  public dueDate!: string;
  public totalAmount!: number;
  public paidAmount!: number;
  public status!: string;
  public notes!: string;
  public lines!: any;
  public eta_status!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  InvoiceModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    contactId: { type: DataTypes.STRING, allowNull: false, field: 'contact_id' },
    invoiceNumber: { type: DataTypes.STRING, allowNull: false, field: 'invoice_number' },
    date: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.STRING, allowNull: false, field: 'due_date' },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'total_amount', defaultValue: 0.00 },
    paidAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'paid_amount', defaultValue: 0.00 },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    lines: { type: DataTypes.JSON, allowNull: true },
    eta_status: { type: DataTypes.STRING, allowNull: true, defaultValue: 'pending' }
  }, {
    sequelize,
    tableName: 'invoices',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['contact_id'] },
      { fields: ['status'] }
    ]
  });
}

export class UserModel extends Model {
  public id!: string;
  public tenantId!: string;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public role!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  UserModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'user' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['email'] }
    ]
  });
}

export class AuditLogModel extends Model {
  public id!: string;
  public tenantId!: string;
  public userId!: string;
  public userName!: string;
  public action!: string;
  public details!: string;
  public ipAddress!: string;
  public readonly createdAt!: Date;
}

if (sequelize!) {
  AuditLogModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    userId: { type: DataTypes.STRING, allowNull: false, field: 'user_id' },
    userName: { type: DataTypes.STRING, allowNull: false, field: 'user_name' },
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true, field: 'ip_address' }
  }, {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['user_id'] }
    ]
  });
}

export class ContactModel extends Model {
  public id!: string;
  public tenantId!: string;
  public name!: string;
  public email!: string;
  public phone!: string;
  public company!: string;
  public type!: string; // 'customer' or 'vendor'
  public balance!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  ContactModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    company: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'customer' },
    balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
  }, {
    sequelize,
    tableName: 'contacts',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['type'] }
    ]
  });
}

export class ExpenseModel extends Model {
  public id!: string;
  public tenantId!: string;
  public contactId!: string;
  public category!: string;
  public amount!: number;
  public date!: string;
  public description!: string;
  public status!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  ExpenseModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    contactId: { type: DataTypes.STRING, allowNull: true, field: 'contact_id' },
    category: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    date: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'paid' }
  }, {
    sequelize,
    tableName: 'expenses',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['contact_id'] }
    ]
  });
}

export class AccountModel extends Model {
  public id!: string;
  public tenantId!: string;
  public code!: string;
  public name!: string;
  public type!: string; // 'asset', 'liability', 'equity', 'revenue', 'expense'
  public balance!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  AccountModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: false, field: 'tenant_id' },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 }
  }, {
    sequelize,
    tableName: 'accounts',
    timestamps: true,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['code'] }
    ]
  });
}

export class RefreshTokenModel extends Model {
  public id!: string;
  public token!: string;
  public userId!: string;
  public expiresAt!: Date;
  public isRevoked!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

if (sequelize!) {
  RefreshTokenModel.init({
    id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    userId: { type: DataTypes.STRING, allowNull: false, field: 'user_id' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    isRevoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_revoked' }
  }, {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      { fields: ['token'] },
      { fields: ['user_id'] }
    ]
  });
}

export const connectPostgres = async () => {
  if (!sequelize) {
    console.error('PostgreSQL Service: Sequelize is not initialized.');
    pgConnected = false;
    return false;
  }
  try {
    // Attempt authentication with a short timeout to prevent blocking dev server startup
    console.log('PostgreSQL Service: Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('PostgreSQL Service: Connection has been established successfully.');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL Service: Models synchronized with database.');
    pgConnected = true;
    return true;
  } catch (error) {
    console.error('PostgreSQL Service: Unable to connect to the database:', error);
    pgConnected = false;
    return false;
  }
};

export function isPostgresConnected() {
  return pgConnected;
}

export { sequelize };
