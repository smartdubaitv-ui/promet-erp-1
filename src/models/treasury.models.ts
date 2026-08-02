export interface IVault {
  id: string;
  name: string;
  type: string;
  custodian_id: string;
  custodian_name: string;
  custodian_email: string;
  opening_balance: number;
  current_balance: number;
  max_limit: number;
  is_active: boolean;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPaymentVoucher {
  id: string;
  voucher_number: string;
  tenantId: string;
  vault_id: string;
  vault_name: string;
  voucher_type: 'payment';
  category_type: 'supplier_payment' | 'operational_expense' | 'salary_advance' | 'broker_commission' | 'contract_security' | string;
  amount: number;
  date: string;
  notes: string;
  contact_id?: string;
  contact_name?: string;
  contract_name?: string;
  client_name?: string;
  expected_return_date?: string;
  created_by_id: string;
  created_by_name: string;
  created_by_email: string;
  createdAt: string;
}

export interface IContractSecurityVoucherInput {
  vaultId: string;
  amount: number;
  contractName: string;
  clientName: string;
  expectedReturnDate: string;
  notes?: string;
}
