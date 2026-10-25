import { getAdminPermissionProfile } from '@/utils/finance-permissions'
import {
  getCashFlowMetricsAction,
  getFinanceDashboardDataAction,
  getFinancialAuditLogsAction,
} from './actions'
import FinanceDashboardClient from './FinanceDashboardClient'
import { redirect } from 'next/navigation'
import { CashFlowMetrics } from '@/types/finance'

export const metadata = {
  title: 'Finance & Cash Flow | Kazi Canvas Admin',
  description: 'Manage cash balances, income, expenses, accounts receivable, and financial reports.',
}

export default async function FinancePage() {
  const profile = await getAdminPermissionProfile()

  if (!profile.isSuperAdmin && !profile.permissions.has('cashflow.view')) {
    redirect('/admin/invoices')
  }

  // Preload initial metrics & dashboard data
  const [metricsRes, dashboardDataRes, auditRes] = await Promise.all([
    getCashFlowMetricsAction(),
    getFinanceDashboardDataAction(),
    profile.isSuperAdmin || profile.permissions.has('finance.audit_logs')
      ? getFinancialAuditLogsAction(50)
      : Promise.resolve({ success: true, data: [] }),
  ])

  const defaultMetrics: CashFlowMetrics = {
    openingBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    currentAvailableBalance: 0,
    accountsReceivable: 0,
    unpaidInvoicesTotal: 0,
    partiallyPaidDueTotal: 0,
    netCashFlow: 0,
    monthlyInflow: 0,
    monthlyOutflow: 0,
    accountBalances: [],
  }

  return (
    <FinanceDashboardClient
      initialMetrics={metricsRes.data || defaultMetrics}
      initialAccounts={dashboardDataRes.accounts || []}
      initialCategories={dashboardDataRes.categories || []}
      initialTransactions={dashboardDataRes.recentTransactions || []}
      initialAuditLogs={auditRes.data || []}
      permissionProfile={profile}
    />
  )
}
