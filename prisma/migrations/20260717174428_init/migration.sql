-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "subdomain" TEXT,
    "plan" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionEndsAt" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN,
    "createdAt" TEXT,
    "username" TEXT,
    "password_hash" TEXT,
    "role_id" INTEGER,
    "is_active" BOOLEAN
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "code" TEXT,
    "name" TEXT,
    "type" TEXT,
    "isActive" BOOLEAN,
    "balance" INTEGER
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "type" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "balance" INTEGER,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "contactId" TEXT,
    "invoiceNumber" TEXT,
    "date" TEXT,
    "dueDate" TEXT,
    "totalAmount" INTEGER,
    "paidAmount" INTEGER,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TEXT,
    "lines" TEXT,
    "eta_status" TEXT
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "contactId" TEXT,
    "expenseDate" TEXT,
    "amount" INTEGER,
    "category" TEXT,
    "description" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "bankTransactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "bankAccountId" TEXT,
    "date" TEXT,
    "amount" INTEGER,
    "description" TEXT,
    "category" TEXT,
    "isReconciled" BOOLEAN,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "unitPrice" INTEGER,
    "stockQuantity" INTEGER,
    "reorderPoint" INTEGER,
    "isActive" BOOLEAN
);

-- CreateTable
CREATE TABLE "purchaseOrders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "contactId" TEXT,
    "poNumber" TEXT,
    "date" TEXT,
    "totalAmount" INTEGER,
    "status" TEXT,
    "createdAt" TEXT,
    "lines" TEXT
);

-- CreateTable
CREATE TABLE "salesOrders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "contactId" TEXT,
    "soNumber" TEXT,
    "date" TEXT,
    "totalAmount" INTEGER,
    "status" TEXT,
    "createdAt" TEXT,
    "lines" TEXT
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "contactId" TEXT,
    "qNumber" TEXT,
    "date" TEXT,
    "totalAmount" INTEGER,
    "status" TEXT,
    "createdAt" TEXT,
    "lines" TEXT
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "invoiceId" TEXT,
    "paymentNumber" TEXT,
    "date" TEXT,
    "amount" INTEGER,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "fixedAssets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT,
    "code" TEXT,
    "asset_code" TEXT,
    "category_id" TEXT,
    "purchaseDate" TEXT,
    "purchase_date" TEXT,
    "purchaseValue" INTEGER,
    "purchase_cost" INTEGER,
    "total_cost" INTEGER,
    "additional_costs" INTEGER,
    "depreciation_method" TEXT,
    "useful_life_years" INTEGER,
    "salvage_value" INTEGER,
    "depreciationRate" INTEGER,
    "depreciation_rate" INTEGER,
    "accumulated_depreciation" INTEGER,
    "net_book_value" INTEGER,
    "currentValue" INTEGER,
    "status" TEXT,
    "location" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "companyName" TEXT,
    "vatNumber" TEXT,
    "vatRate" INTEGER,
    "currency" TEXT,
    "fiscalYearEnd" TEXT,
    "visibleSections" TEXT
);

-- CreateTable
CREATE TABLE "assetCategories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT,
    "code" TEXT,
    "description" TEXT,
    "depreciation_method" TEXT,
    "useful_life_years" INTEGER,
    "salvage_value_percent" INTEGER,
    "depreciation_rate" INTEGER,
    "asset_account_id" TEXT,
    "depreciation_expense_account_id" TEXT,
    "accumulated_depreciation_account_id" TEXT,
    "is_active" BOOLEAN,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "assetTransactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "asset_id" TEXT,
    "transaction_type" TEXT,
    "transaction_date" TEXT,
    "amount" INTEGER,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_by" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "depreciationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "assetRevaluations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "maintenanceContracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "department" TEXT,
    "position" TEXT,
    "basicSalary" INTEGER,
    "allowance" INTEGER,
    "iban" TEXT,
    "joinDate" TEXT,
    "isActive" BOOLEAN
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "month" TEXT,
    "basicSalary" INTEGER,
    "allowance" INTEGER,
    "deductions" INTEGER,
    "netSalary" INTEGER,
    "status" TEXT,
    "paidAt" TEXT
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "type" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "days" INTEGER,
    "status" TEXT,
    "reason" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TEXT
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "accountingEntries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "entry_date" TEXT,
    "description" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "accountingEntryDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entry_id" TEXT,
    "account_code" TEXT,
    "account_name" TEXT,
    "debit" INTEGER,
    "credit" INTEGER,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "training_enrollments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "code" TEXT,
    "location" TEXT,
    "manager_id" INTEGER,
    "status" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "parent_id" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "products_advanced" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "inventory_stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "po_number" TEXT,
    "vendor_id" TEXT,
    "order_date" TEXT,
    "expected_delivery" TEXT,
    "subtotal" INTEGER,
    "tax" INTEGER,
    "total" INTEGER,
    "status" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "code" TEXT,
    "description" TEXT,
    "client_id" INTEGER,
    "project_manager_id" INTEGER,
    "department_id" INTEGER,
    "start_date" TEXT,
    "end_date" TEXT,
    "budget" INTEGER,
    "priority" TEXT,
    "status" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "assigned_to" INTEGER,
    "start_date" TEXT,
    "due_date" TEXT,
    "estimated_hours" INTEGER,
    "actual_hours" INTEGER,
    "status" TEXT,
    "priority" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "project_team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" INTEGER,
    "employee_id" INTEGER,
    "role" TEXT,
    "start_date" TEXT
);

-- CreateTable
CREATE TABLE "project_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "project_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "notification_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "notification_type_id" INTEGER,
    "receive_in_app" BOOLEAN,
    "receive_by_email" BOOLEAN
);

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "report_type" TEXT,
    "filters" TEXT,
    "columns" TEXT,
    "chart_type" TEXT,
    "chart_config" TEXT,
    "is_favorite" BOOLEAN,
    "is_public" BOOLEAN,
    "created_by" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "report_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "default_dashboard" TEXT,
    "date_range_days" INTEGER,
    "auto_refresh_seconds" INTEGER,
    "theme" TEXT
);

-- CreateTable
CREATE TABLE "crm_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contact_id" TEXT,
    "company_name" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "tax_id" TEXT,
    "commercial_register" TEXT,
    "customer_type" TEXT,
    "customer_segment" TEXT,
    "annual_revenue" INTEGER,
    "employee_count" INTEGER,
    "preferred_contact_method" TEXT,
    "assigned_to" TEXT,
    "credit_limit" INTEGER,
    "payment_terms" INTEGER,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "crm_contact_persons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT,
    "full_name" TEXT,
    "job_title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "is_primary" BOOLEAN,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "crm_pipeline_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "order_index" INTEGER,
    "probability" INTEGER,
    "color" TEXT
);

-- CreateTable
CREATE TABLE "crm_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT,
    "name" TEXT,
    "description" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "pipeline_stage_id" TEXT,
    "expected_close_date" TEXT,
    "probability" INTEGER,
    "assigned_to" TEXT,
    "source" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_id" TEXT,
    "opportunity_id" TEXT,
    "activity_type" TEXT,
    "subject" TEXT,
    "description" TEXT,
    "activity_date" TEXT,
    "duration_minutes" INTEGER,
    "assigned_to" TEXT,
    "status" TEXT,
    "follow_up_date" TEXT,
    "created_by" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "crm_quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "crm_quote_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT,
    "user_id" TEXT,
    "user_name" TEXT,
    "user_role" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "action_type" TEXT,
    "table_name" TEXT,
    "record_id" INTEGER,
    "record_identifier" TEXT,
    "description" TEXT,
    "status" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "audit_sensitive_changes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "audit_log_id" INTEGER,
    "sensitive_type" TEXT,
    "description" TEXT,
    "old_value" INTEGER,
    "new_value" INTEGER,
    "approved_by" INTEGER,
    "approval_status" TEXT,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "audit_user_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "activity_date" TEXT,
    "total_actions" INTEGER,
    "inserts" INTEGER,
    "updates" INTEGER,
    "deletes" INTEGER,
    "views" INTEGER,
    "exports" INTEGER,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "audit_retention_policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "table_name" TEXT,
    "retention_days" INTEGER,
    "is_active" BOOLEAN
);

-- CreateTable
CREATE TABLE "audit_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alert_type" TEXT,
    "severity" TEXT,
    "message" TEXT,
    "details" TEXT,
    "is_read" BOOLEAN,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "eta_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT,
    "tax_id" TEXT,
    "company_address" TEXT,
    "activity_code" TEXT,
    "branch_code" TEXT,
    "building_number" TEXT,
    "floor_number" TEXT,
    "room_number" TEXT,
    "postal_code" TEXT,
    "api_url" TEXT,
    "client_id" TEXT,
    "client_secret" TEXT,
    "is_active" BOOLEAN DEFAULT true
);

-- CreateTable
CREATE TABLE "eta_submissions_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "bank_transactions_imported" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_account_id" TEXT,
    "transaction_date" TEXT,
    "description" TEXT,
    "amount" INTEGER,
    "transaction_type" TEXT,
    "reference_number" TEXT,
    "counterparty_name" TEXT,
    "counterparty_account" TEXT,
    "reconciliation_status" TEXT,
    "matched_invoice_id" TEXT,
    "matched_payment_id" TEXT,
    "matched_contact_id" TEXT,
    "match_score" TEXT,
    "match_method" TEXT,
    "matched_by" TEXT,
    "matched_at" TEXT,
    "notes" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT
);

-- CreateTable
CREATE TABLE "reconciliation_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "reconciliation_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "anomaly_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "rule_type" TEXT,
    "conditions" TEXT,
    "severity" TEXT,
    "is_active" BOOLEAN,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "anomaly_detection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "anomaly_type" TEXT,
    "severity" TEXT,
    "description" TEXT,
    "details" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "status" TEXT,
    "detected_by" TEXT,
    "assigned_to" INTEGER,
    "assigned_to_name" TEXT,
    "detected_at" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "closing_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "closing_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "suggested_adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "closing_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "daily_workers_attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "daily_workers_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "probation_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "installment_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "employee_installments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "installment_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "installment_deductions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);

-- CreateTable
CREATE TABLE "activity_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "default_modules" TEXT,
    "is_active" BOOLEAN,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT,
    "activity_code" TEXT,
    "activity_id" INTEGER,
    "tax_id" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT,
    "language" TEXT,
    "timezone" TEXT,
    "fiscal_year_start" TEXT,
    "fiscal_year_end" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT
);

-- CreateTable
CREATE TABLE "company_activity_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" INTEGER,
    "module_code" TEXT,
    "is_enabled" BOOLEAN,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activity_code" TEXT,
    "entity_type" TEXT,
    "field_name" TEXT,
    "field_label" TEXT,
    "field_type" TEXT,
    "options" TEXT,
    "is_required" BOOLEAN,
    "order_index" INTEGER,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN,
    "is_core" INTEGER,
    "order_index" INTEGER,
    "created_at" TEXT
);

-- CreateTable
CREATE TABLE "user_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "createdAt" TEXT,
    "updatedAt" TEXT
);
