export type FinancialAccountType = 'cash' | 'bank' | 'mobile_banking' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'posted' | 'pending' | 'reversed' | 'void';
export type CategoryType = 'income' | 'expense';

export interface FinancialAccount {
  id: string;
  account_name: string;
  account_type: FinancialAccountType;
  account_number?: string | null;
  bank_name?: string | null;
  opening_balance_bdt: number;
  current_balance_bdt: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  category_type: CategoryType;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_number: string;
  transaction_type: TransactionType;
  amount_bdt: number;
  transaction_date: string;
  status: TransactionStatus;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  payment_method: string;
  reference_number?: string | null;
  description: string;
  invoice_id?: string | null;
  invoice_payment_id?: string | null;
  client_id?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  reversal_reason?: string | null;
  reversed_at?: string | null;
  reversed_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  source_account?: FinancialAccount | null;
  destination_account?: FinancialAccount | null;
  invoice?: {
    id: string;
    invoice_number: string;
    customer_name: string;
  } | null;
}

export interface FinancialAuditLog {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  previous_values?: any;
  new_values?: any;
  reason?: string | null;
  created_at: string;
}

export interface AdminPermissions {
  admin_id: string;
  permissions: string[];
  is_finance_only: boolean;
  updated_by?: string | null;
  updated_at: string;
}

export type PermissionCode =
  | 'cashflow.view'
  | 'cashflow.create'
  | 'cashflow.edit'
  | 'cashflow.approve'
  | 'cashflow.reverse'
  | 'cashflow.manage_accounts'
  | 'cashflow.reports'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.edit'
  | 'invoices.payments'
  | 'invoices.void'
  | 'invoices.adjustments'
  | 'finance.audit_logs';

export const ALL_PERMISSIONS: { code: PermissionCode; label: string; group: 'Cash Flow' | 'Invoices' | 'Audit' }[] = [
  { code: 'cashflow.view', label: 'View Cash Flow Dashboard & Summary', group: 'Cash Flow' },
  { code: 'cashflow.create', label: 'Create Income & Expense Transactions', group: 'Cash Flow' },
  { code: 'cashflow.edit', label: 'Edit Unposted / Pending Transactions', group: 'Cash Flow' },
  { code: 'cashflow.approve', label: 'Approve & Post Financial Movements', group: 'Cash Flow' },
  { code: 'cashflow.reverse', label: 'Reverse & Refund Transactions', group: 'Cash Flow' },
  { code: 'cashflow.manage_accounts', label: 'Manage Accounts, Balances & Categories', group: 'Cash Flow' },
  { code: 'cashflow.reports', label: 'View & Export Financial Reports', group: 'Cash Flow' },
  
  { code: 'invoices.view', label: 'View Invoices List & Details', group: 'Invoices' },
  { code: 'invoices.create', label: 'Create & Issue New Invoices', group: 'Invoices' },
  { code: 'invoices.edit', label: 'Edit Draft Invoices', group: 'Invoices' },
  { code: 'invoices.payments', label: 'Record Full & Partial Invoice Payments', group: 'Invoices' },
  { code: 'invoices.void', label: 'Void or Cancel Invoices', group: 'Invoices' },
  { code: 'invoices.adjustments', label: 'Adjust & Reverse Invoice Payments', group: 'Invoices' },

  { code: 'finance.audit_logs', label: 'View Financial Security Audit Trail', group: 'Audit' },
];

export interface CashFlowMetrics {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentAvailableBalance: number;
  accountsReceivable: number;
  unpaidInvoicesTotal: number;
  partiallyPaidDueTotal: number;
  netCashFlow: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  accountBalances: {
    id: string;
    accountName: string;
    accountType: FinancialAccountType;
    balance: number;
    bankName?: string | null;
  }[];
}
