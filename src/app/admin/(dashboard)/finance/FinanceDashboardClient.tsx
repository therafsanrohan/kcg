'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  FinancialAccount,
  FinancialCategory,
  FinancialTransaction,
  CashFlowMetrics,
  FinancialAuditLog,
  PermissionCode,
} from '@/types/finance'
import { UserPermissionProfile } from '@/utils/finance-permissions'
import {
  getCashFlowMetricsAction,
  getFinanceDashboardDataAction,
  createTransactionAction,
  createTransferAction,
  reverseTransactionAction,
  reconcileAccountBalanceAction,
  pruneFinancialAuditLogsAction,
  getFinancialAuditLogsAction,
} from './actions'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Search,
  Plus,
  RotateCcw,
  FileSpreadsheet,
  Building2,
  Smartphone,
  Banknote,
  Clock,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Activity,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'

type DatePresetType = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'

interface FinanceDashboardClientProps {
  initialMetrics: CashFlowMetrics
  initialAccounts: FinancialAccount[]
  initialCategories: FinancialCategory[]
  initialTransactions: FinancialTransaction[]
  initialAuditLogs: FinancialAuditLog[]
  permissionProfile: UserPermissionProfile
}

export default function FinanceDashboardClient({
  initialMetrics,
  initialAccounts,
  initialCategories,
  initialTransactions,
  initialAuditLogs,
  permissionProfile,
}: FinanceDashboardClientProps) {
  const [metrics, setMetrics] = useState<CashFlowMetrics>(initialMetrics)
  const [accounts, setAccounts] = useState<FinancialAccount[]>(initialAccounts)
  const [categories] = useState<FinancialCategory[]>(initialCategories)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(initialTransactions)
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>(initialAuditLogs)
  const [isPruningLogs, setIsPruningLogs] = useState(false)

  // Filters & State
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'accounts' | 'audit'>('overview')
  const [datePreset, setDatePreset] = useState<DatePresetType>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [isPending, startTransition] = useTransition()

  // Transaction Search & Filter state
  const [txSearch, setTxSearch] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all')

  // Graph Interactive State
  const [trackerMode, setTrackerMode] = useState<'daily' | 'weekly'>('daily')
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

  // Modals state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [reconcilingAccount, setReconcilingAccount] = useState<FinancialAccount | null>(null)
  const [reversingTx, setReversingTx] = useState<FinancialTransaction | null>(null)
  const [reversalReason, setReversalReason] = useState('')

  // Form states for Quick-Add Transaction
  const [txType, setTxType] = useState<'income' | 'expense'>('expense')
  const [txExpenseSource, setTxExpenseSource] = useState<'liquid_cash' | 'custom_pocket'>('liquid_cash')
  const [txAccountId, setTxAccountId] = useState(accounts[0]?.id || '')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txRef, setTxRef] = useState('')
  const [txDesc, setTxDesc] = useState('')
  const [txPaymentMethod, setTxPaymentMethod] = useState('cash')
  const [txError, setTxError] = useState<string | null>(null)

  // Form states for Transfer
  const [transferFromId, setTransferFromId] = useState(accounts[0]?.id || '')
  const [transferToId, setTransferToId] = useState(accounts[1]?.id || '')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [transferRef, setTransferRef] = useState('')
  const [transferDesc, setTransferDesc] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)

  // Reconciliation state
  const [actualStatementBal, setActualStatementBal] = useState('')
  const [reconcileNotes, setReconcileNotes] = useState('')
  const [reconcileError, setReconcileError] = useState<string | null>(null)

  // Permission helpers
  const canCreateTx = permissionProfile.isSuperAdmin || permissionProfile.permissions.has('cashflow.create')
  const canReverseTx = permissionProfile.isSuperAdmin || permissionProfile.permissions.has('cashflow.reverse')
  const canManageAccounts = permissionProfile.isSuperAdmin || permissionProfile.permissions.has('cashflow.manage_accounts')
  const canExportReports = permissionProfile.isSuperAdmin || permissionProfile.permissions.has('cashflow.reports')

  // Format a local Date object into 'YYYY-MM-DD' without UTC timezone offset corruption
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate dates based on preset
  const getDateRangeForPreset = (preset: DatePresetType): { startDate: string; endDate: string } | undefined => {
    const now = new Date()
    const todayStr = formatLocalDate(now)

    if (preset === 'today') {
      return { startDate: todayStr, endDate: todayStr }
    }
    if (preset === 'this_week') {
      const d = new Date(now)
      const day = d.getDay()
      // Adjust to Monday (1). If Sunday (0), go back 6 days.
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      return { startDate: formatLocalDate(monday), endDate: todayStr }
    }
    if (preset === 'this_month') {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      return { startDate: `${year}-${month}-01`, endDate: todayStr }
    }
    if (preset === 'this_year') {
      return { startDate: `${now.getFullYear()}-01-01`, endDate: todayStr }
    }
    return undefined // 'all' or 'custom'
  }

  // Active date range based on preset
  const activeDateRange = useMemo(() => {
    return getDateRangeForPreset(datePreset)
  }, [datePreset])

  // Refetch metrics on date filter change
  const handleDatePresetChange = (preset: DatePresetType) => {
    setDatePreset(preset)
    const range = getDateRangeForPreset(preset)
    startTransition(async () => {
      const res = await getCashFlowMetricsAction(range)
      if (res.success && res.data) {
        setMetrics(res.data)
      }
    })
  }

  // Filtered transactions for the transactions table (incorporating active date preset, type, account & search)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Date Range Filter
      if (activeDateRange) {
        const txDate = tx.transaction_date
        if (txDate) {
          if (activeDateRange.startDate && txDate < activeDateRange.startDate) return false
          if (activeDateRange.endDate && txDate > activeDateRange.endDate) return false
        }
      }

      // 2. Transaction Type Filter
      if (txTypeFilter !== 'all' && tx.transaction_type !== txTypeFilter) return false

      // 3. Account Filter
      if (
        txAccountFilter !== 'all' &&
        tx.source_account_id !== txAccountFilter &&
        tx.destination_account_id !== txAccountFilter
      ) {
        return false
      }

      // 4. Search Filter
      if (!txSearch.trim()) return true
      const q = txSearch.toLowerCase()
      return (
        tx.description?.toLowerCase().includes(q) ||
        tx.reference_number?.toLowerCase().includes(q) ||
        tx.payment_method?.toLowerCase().includes(q) ||
        tx.invoice?.invoice_number?.toLowerCase().includes(q)
      )
    })
  }, [transactions, activeDateRange, txTypeFilter, txAccountFilter, txSearch])

  // Dynamic Daily & Weekly Timeline chart bars for accurate Income vs Expense graph (scoped to selected date range)
  const timelineChartData = useMemo(() => {
    const dailyMap: Record<string, { date: string; label: string; income: number; expense: number; count: number }> = {}
    const weeklyMap: Record<string, { key: string; label: string; income: number; expense: number; count: number }> = {}

    // Filter transactions by date range first so chart accurately reflects the selected preset
    const scopedTransactions = transactions.filter((tx) => {
      if (tx.status !== 'posted') return false
      if (activeDateRange) {
        const txDate = tx.transaction_date
        if (txDate) {
          if (activeDateRange.startDate && txDate < activeDateRange.startDate) return false
          if (activeDateRange.endDate && txDate > activeDateRange.endDate) return false
        }
      }
      return true
    })

    // Sort transactions chronologically
    const sorted = [...scopedTransactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )

    sorted.forEach((t) => {
      const d = t.transaction_date || 'Unknown'
      const amt = Number(t.amount_bdt) || 0
      const dateObj = new Date(d)

      // Daily Grouping
      if (!dailyMap[d]) {
        const label = isNaN(dateObj.getTime())
          ? d
          : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dailyMap[d] = { date: d, label, income: 0, expense: 0, count: 0 }
      }
      if (t.transaction_type === 'income') dailyMap[d].income += amt
      else if (t.transaction_type === 'expense') dailyMap[d].expense += amt
      dailyMap[d].count += 1

      // Weekly Grouping
      if (!isNaN(dateObj.getTime())) {
        const startOfWeek = new Date(dateObj)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        const weekKey = formatLocalDate(startOfWeek)
        const weekEnd = new Date(startOfWeek)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const weekLabel = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { key: weekKey, label: weekLabel, income: 0, expense: 0, count: 0 }
        }
        if (t.transaction_type === 'income') weeklyMap[weekKey].income += amt
        else if (t.transaction_type === 'expense') weeklyMap[weekKey].expense += amt
        weeklyMap[weekKey].count += 1
      }
    })

    const isDaily = trackerMode === 'daily'
    const rawList = isDaily ? Object.values(dailyMap) : Object.values(weeklyMap)
    const items = isDaily ? rawList.slice(-14) : rawList.slice(-8)

    const maxVal = Math.max(
      1,
      ...items.map((d) => Math.max(d.income, d.expense))
    )

    // Category breakdown
    const categoryTotals: Record<string, { name: string; type: 'income' | 'expense'; amount: number }> = {}
    sorted.forEach((t) => {
      const cat = t.category_name || (t.transaction_type === 'income' ? 'Sales Revenue' : 'Operational Expense')
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { name: cat, type: t.transaction_type as any, amount: 0 }
      }
      categoryTotals[cat].amount += Number(t.amount_bdt) || 0
    })

    const topCategories = Object.values(categoryTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)

    return {
      days: items,
      maxVal,
      topCategories,
      totalIncome: items.reduce((s, i) => s + i.income, 0),
      totalExpense: items.reduce((s, i) => s + i.expense, 0),
    }
  }, [transactions, activeDateRange, trackerMode])

  // Handle Quick Add Transaction Submit
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setTxError(null)
    const amountNum = Number(txAmount)
    if (!amountNum || amountNum <= 0) {
      setTxError('Please enter a valid positive amount in BDT.')
      return
    }
    if (txType === 'expense' && txExpenseSource === 'liquid_cash' && !txAccountId) {
      setTxError('Please select a financial account for available liquid cash.')
      return
    }

    startTransition(async () => {
      const res = await createTransactionAction({
        transactionType: txType,
        accountId: txExpenseSource === 'custom_pocket' ? undefined : txAccountId,
        expenseSource: txType === 'expense' ? txExpenseSource : undefined,
        categoryId: txCategoryId || undefined,
        amountBdt: amountNum,
        transactionDate: txDate,
        referenceNumber: txRef || undefined,
        description: txDesc || (txExpenseSource === 'custom_pocket' ? 'Personal Out-of-Pocket Expense' : `${txType === 'income' ? 'Income' : 'Expense'} entry`),
        paymentMethod: txExpenseSource === 'custom_pocket' ? 'out_of_pocket' : txPaymentMethod,
      })

      if (!res.success) {
        setTxError(res.error || 'Failed to record transaction.')
      } else {
        setIsAddTxOpen(false)
        setTxAmount('')
        setTxRef('')
        setTxDesc('')
        // Refresh metrics and dashboard data
        const [metRes, dashRes] = await Promise.all([
          getCashFlowMetricsAction(getDateRangeForPreset(datePreset)),
          getFinanceDashboardDataAction(),
        ])
        if (metRes.success && metRes.data) setMetrics(metRes.data)
        if (dashRes.success && dashRes.recentTransactions) setTransactions(dashRes.recentTransactions)
        if (dashRes.success && dashRes.accounts) setAccounts(dashRes.accounts)
      }
    })
  }

  // Handle Transfer Submit
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)
    const amountNum = Number(transferAmount)
    if (!amountNum || amountNum <= 0) {
      setTransferError('Please enter a valid transfer amount.')
      return
    }
    if (!transferFromId || !transferToId) {
      setTransferError('Please select both source and destination accounts.')
      return
    }
    if (transferFromId === transferToId) {
      setTransferError('Source and destination accounts must be different.')
      return
    }

    startTransition(async () => {
      const res = await createTransferAction({
        sourceAccountId: transferFromId,
        destinationAccountId: transferToId,
        amountBdt: amountNum,
        transactionDate: transferDate,
        paymentMethod: 'bank_transfer',
        referenceNumber: transferRef || undefined,
        description: transferDesc.trim() || 'Account Transfer',
      })

      if (!res.success) {
        setTransferError(res.error || 'Transfer failed.')
      } else {
        setIsTransferOpen(false)
        setTransferAmount('')
        setTransferRef('')
        setTransferDesc('')
        // Refresh data
        const [metRes, dashRes] = await Promise.all([
          getCashFlowMetricsAction(getDateRangeForPreset(datePreset)),
          getFinanceDashboardDataAction(),
        ])
        if (metRes.success && metRes.data) setMetrics(metRes.data)
        if (dashRes.success && dashRes.recentTransactions) setTransactions(dashRes.recentTransactions)
        if (dashRes.success && dashRes.accounts) setAccounts(dashRes.accounts)
      }
    })
  }

  // Handle Reversal Submit
  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reversingTx) return
    if (!reversalReason.trim()) {
      alert('Please state a reason for this reversal.')
      return
    }

    startTransition(async () => {
      const res = await reverseTransactionAction(reversingTx.id, reversalReason.trim())
      if (!res.success) {
        alert(res.error || 'Reversal failed.')
      } else {
        setReversingTx(null)
        setReversalReason('')
        const [metRes, dashRes] = await Promise.all([
          getCashFlowMetricsAction(getDateRangeForPreset(datePreset)),
          getFinanceDashboardDataAction(),
        ])
        if (metRes.success && metRes.data) setMetrics(metRes.data)
        if (dashRes.success && dashRes.recentTransactions) setTransactions(dashRes.recentTransactions)
        if (dashRes.success && dashRes.accounts) setAccounts(dashRes.accounts)
      }
    })
  }

  // Handle Account Reconcile Submit
  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reconcilingAccount) return
    setReconcileError(null)
    const stmtBal = Number(actualStatementBal)
    if (isNaN(stmtBal) || stmtBal < 0) {
      setReconcileError('Please enter a valid statement balance.')
      return
    }

    startTransition(async () => {
      const res = await reconcileAccountBalanceAction(reconcilingAccount.id, stmtBal, reconcileNotes)
      if (!res.success) {
        setReconcileError(res.error || 'Reconciliation failed.')
      } else {
        setReconcilingAccount(null)
        setActualStatementBal('')
        setReconcileNotes('')
        const [metRes, dashRes] = await Promise.all([
          getCashFlowMetricsAction(getDateRangeForPreset(datePreset)),
          getFinanceDashboardDataAction(),
        ])
        if (metRes.success && metRes.data) setMetrics(metRes.data)
        if (dashRes.success && dashRes.accounts) setAccounts(dashRes.accounts)
      }
    })
  }

  // CSV Export for transactions
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Account', 'Reference', 'Category', 'Description', 'Amount (BDT)', 'Status']
    const rows = filteredTransactions.map((t) => [
      t.transaction_date,
      t.transaction_type,
      t.source_account?.account_name || t.destination_account?.account_name || '',
      t.reference_number || '',
      t.category_name || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount_bdt,
      t.status,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `kcg-transactions-${datePreset}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatBDT = (amount: number) => {
    return `৳${Math.round(amount || 0).toLocaleString('en-US')}`
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'mobile_banking':
        return <Smartphone className="w-5 h-5 text-rose-600" />
      case 'bank':
        return <Building2 className="w-5 h-5 text-indigo-600" />
      default:
        return <Banknote className="w-5 h-5 text-emerald-600" />
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── 1. TOP HEADER & DATE RANGE FILTER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-black text-white rounded-2xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-xl text-gray-950 tracking-tight">
                Finance & Cash Flow Management
              </h1>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Authoritative financial balances, income, expenses, accounts receivable, and audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Date presets & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200/80 text-xs font-medium">
            {(['today', 'this_week', 'this_month', 'this_year', 'all'] as DatePresetType[]).map((p) => {
              const labels: Record<string, string> = {
                today: 'Today',
                this_week: 'This Week',
                this_month: 'This Month',
                this_year: 'This Year',
                all: 'All Time',
              }
              const isActive = datePreset === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleDatePresetChange(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                    isActive ? 'bg-white text-black font-semibold shadow-xs' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {labels[p]}
                </button>
              )
            })}
          </div>

          {/* Active Range Badge */}
          {activeDateRange && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {activeDateRange.startDate === activeDateRange.endDate
                  ? activeDateRange.startDate
                  : `${activeDateRange.startDate} → ${activeDateRange.endDate}`}
              </span>
            </span>
          )}

          {/* Quick-Add Buttons */}
          {canCreateTx && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTxType('income')
                  setIsAddTxOpen(true)
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Entry</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTransferOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-50 transition-colors shadow-xs"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-gray-500" />
                <span>Transfer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. PRIMARY 3 EXECUTIVE QUESTIONS (KPI ROW) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Q1: Total Available Cash */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              1. Available Liquid Cash
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-sans text-gray-950">
              {formatBDT(metrics.currentAvailableBalance)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Across {accounts.length} active cash & bank accounts
          </p>
        </div>

        {/* Q2a: Income Received */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              2a. Income Received
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-sans text-emerald-700">
              +{formatBDT(metrics.totalIncome)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Actual cash inflow collected
          </p>
        </div>

        {/* Q2b: Expenses Paid */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              2b. Expenses Paid
            </span>
            <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-sans text-rose-700">
              -{formatBDT(metrics.totalExpense)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Net cash flow: <strong className={metrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {metrics.netCashFlow >= 0 ? '+' : ''}{formatBDT(metrics.netCashFlow)}
            </strong>
          </p>
        </div>

        {/* Q3: Accounts Receivable */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200/90 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              3. Accounts Receivable
            </span>
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-sans text-amber-900">
              {formatBDT(metrics.accountsReceivable)}
            </span>
          </div>
          <p className="text-[11px] text-amber-800/80 mt-1">
            Outstanding customer balances due
          </p>
        </div>
      </div>

      {/* ── 3. NAVIGATION TABS ── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: 'overview', label: 'Executive Overview' },
          {
            key: 'transactions',
            label: `Transactions (${filteredTransactions.length}${
              filteredTransactions.length !== transactions.length ? ` / ${transactions.length}` : ''
            })`,
          },
          { key: 'accounts', label: `Financial Accounts (${accounts.length})` },
          { key: 'audit', label: `Audit Trail (${auditLogs.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px ${
              activeTab === t.key
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Liquid Cash by Channel (Clean, high-level summary) */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-950 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Liquid Cash Distribution by Account</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time cleared funds across active store accounts and payment channels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('accounts')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <span>Manage & Reconcile ({accounts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100/90 hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white rounded-xl border border-gray-200/60 shadow-xs">
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <div className="font-sans font-semibold text-xs text-gray-900 leading-tight">
                        {acc.account_name}
                      </div>
                      <div className="text-[10px] text-gray-400 capitalize mt-0.5">
                        {acc.account_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-sans font-bold text-sm text-gray-950">
                      {formatBDT(acc.current_balance_bdt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── ADVANCED DYNAMIC CASH INFLOW (INCOME) VS OUTFLOW (EXPENSES) TRACKER ── */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/90 shadow-sm space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-bold text-base text-gray-950 flex items-center gap-2">
                    <span>Cash Inflow (Income) vs Outflow (Expenses) Tracker</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Sparkles className="w-3 h-3" /> Live
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-light pl-9">
                  Interactive chronological comparison between actual collections and outgoing operational costs.
                </p>
              </div>

              {/* View Switcher & Legends */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Granularity Toggle */}
                <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTrackerMode('daily')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      trackerMode === 'daily'
                        ? 'bg-white text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Daily Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackerMode('weekly')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      trackerMode === 'weekly'
                        ? 'bg-white text-black shadow-xs font-bold'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Weekly Trend
                  </button>
                </div>

                {/* Legend badges */}
                <div className="flex items-center gap-2.5 bg-gray-50/90 px-3 py-1.5 rounded-xl border border-gray-200/60 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                    <span>Inflow</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                    <span>Outflow</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Bar Graph */}
            {timelineChartData.days.length === 0 ? (
              <div className="p-12 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <h4 className="font-sans font-bold text-sm text-gray-800">No cash movement in this date range</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Once customer payments are received or operational expenses are logged, this dynamic chart updates instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Interactive Bar Columns */}
                <div className="relative pt-6">
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-100 w-full" />
                    <div className="border-b border-gray-200 w-full" />
                  </div>

                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4 items-end min-h-[220px]">
                    {timelineChartData.days.map((item: any, idx: number) => {
                      const isHovered = hoveredBarIndex === idx
                      const incPct = Math.min(100, Math.round((item.income / timelineChartData.maxVal) * 100))
                      const expPct = Math.min(100, Math.round((item.expense / timelineChartData.maxVal) * 100))
                      const net = item.income - item.expense

                      return (
                        <div
                          key={item.date || item.key || idx}
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          className={`group relative flex flex-col items-center justify-end h-full gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                            isHovered
                              ? 'bg-white border-black shadow-lg -translate-y-1'
                              : 'bg-gray-50/60 border-gray-100/90 hover:bg-gray-50'
                          }`}
                        >
                          {/* Live Hover Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[11px] py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap z-30 pointer-events-none animate-in fade-in zoom-in-95">
                              <div className="font-bold">{item.label}</div>
                              <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                                <span className="text-emerald-400">+{formatBDT(item.income)}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-rose-400">-{formatBDT(item.expense)}</span>
                              </div>
                            </div>
                          )}

                          {/* Dual Animated Bars */}
                          <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-36">
                            {/* Inflow Bar */}
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span
                                className={`text-[9px] font-mono font-bold text-emerald-700 mb-1 transition-opacity ${
                                  isHovered ? 'opacity-100' : 'opacity-0'
                                }`}
                              >
                                {formatBDT(item.income)}
                              </span>
                              <div
                                style={{ height: `${Math.max(item.income > 0 ? 10 : 3, incPct)}%` }}
                                className="w-full max-w-[24px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-300 shadow-2xs group-hover:brightness-110"
                              />
                            </div>

                            {/* Outflow Bar */}
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span
                                className={`text-[9px] font-mono font-bold text-rose-700 mb-1 transition-opacity ${
                                  isHovered ? 'opacity-100' : 'opacity-0'
                                }`}
                              >
                                {formatBDT(item.expense)}
                              </span>
                              <div
                                style={{ height: `${Math.max(item.expense > 0 ? 10 : 3, expPct)}%` }}
                                className="w-full max-w-[24px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-300 shadow-2xs group-hover:brightness-110"
                              />
                            </div>
                          </div>

                          {/* Period Label & Net Delta */}
                          <div className="text-center border-t border-gray-200/80 w-full pt-2">
                            <span className="text-[11px] font-bold text-gray-800 block truncate leading-tight">
                              {item.label}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-semibold block mt-0.5 ${
                                net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {net >= 0 ? '+' : ''}
                              {formatBDT(net)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom Insights Bar & Dynamic Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {/* Period Inflow */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Total Inflow (Period)
                      </span>
                      <div className="text-lg font-bold font-sans text-emerald-950 mt-0.5">
                        +{formatBDT(timelineChartData.totalIncome)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-emerald-100/70 rounded-xl text-emerald-800">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Period Outflow */}
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                        Total Outflow (Period)
                      </span>
                      <div className="text-lg font-bold font-sans text-rose-950 mt-0.5">
                        -{formatBDT(timelineChartData.totalExpense)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-100/70 rounded-xl text-rose-800">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Period Net Flow */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        Net Operating Cash Flow
                      </span>
                      <div
                        className={`text-lg font-bold font-sans mt-0.5 ${
                          timelineChartData.totalIncome - timelineChartData.totalExpense >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {timelineChartData.totalIncome - timelineChartData.totalExpense >= 0 ? '+' : ''}
                        {formatBDT(timelineChartData.totalIncome - timelineChartData.totalExpense)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-gray-200/60 shadow-2xs">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                </div>

                {/* Top Contributing Categories Preview */}
                {timelineChartData.topCategories.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>Top Cash Flow Drivers:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {timelineChartData.topCategories.map((c, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                            c.type === 'income'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50/70 border-rose-200 text-rose-800'
                          }`}
                        >
                          <span>{c.name}</span>
                          <strong className="font-mono">৳{Number(c.amount).toLocaleString('en-US')}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Accounts Receivable & Invoice Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-950">
                  Accounts Receivable & Invoicing Overview
                </h3>
                <p className="text-xs text-gray-500">
                  Invoices awaiting customer settlement. Unpaid invoices contribute to receivables, not cash inflow.
                </p>
              </div>
              <Link
                href="/admin/invoices"
                className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
              >
                <span>View Invoices</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[11px] font-bold uppercase text-gray-500">
                  Total Accounts Receivable
                </span>
                <div className="text-xl font-bold font-sans text-gray-950 mt-1">
                  {formatBDT(metrics.accountsReceivable)}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Total pending gallery dues</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                <span className="text-[11px] font-bold uppercase text-rose-700">
                  Unpaid Invoices Total
                </span>
                <div className="text-xl font-bold font-sans text-rose-900 mt-1">
                  {formatBDT(metrics.unpaidInvoicesTotal)}
                </div>
                <p className="text-[11px] text-rose-600/80 mt-0.5">Zero payment recorded</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <span className="text-[11px] font-bold uppercase text-amber-800">
                  Partially Paid Remaining Due
                </span>
                <div className="text-xl font-bold font-sans text-amber-950 mt-1">
                  {formatBDT(metrics.partiallyPaidDueTotal)}
                </div>
                <p className="text-[11px] text-amber-700/80 mt-0.5">Advance received, balance pending</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: TRANSACTIONS ── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters & Export Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ref, memo, invoice..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              {/* Type Filter */}
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-hidden focus:border-black"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
                <option value="transfer">Transfers Only</option>
              </select>

              {/* Account Filter */}
              <select
                value={txAccountFilter}
                onChange={(e) => setTxAccountFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-hidden focus:border-black"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Export */}
            {canExportReports && (
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Account</th>
                    <th className="py-3 px-5">Description & Reference</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No financial transactions matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isIncome = tx.transaction_type === 'income'
                      const isExpense = tx.transaction_type === 'expense'
                      const isTransfer = tx.transaction_type === 'transfer'
                      const isReversed = tx.status === 'reversed'

                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-mono text-gray-500 whitespace-nowrap">
                            {tx.transaction_date}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {isIncome && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                <ArrowDownLeft className="w-3 h-3" /> Income
                              </span>
                            )}
                            {isExpense && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700">
                                <ArrowUpRight className="w-3 h-3" /> Expense
                              </span>
                            )}
                            {isTransfer && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                <ArrowLeftRight className="w-3 h-3" /> Transfer
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap font-medium text-gray-900">
                            {tx.source_account?.account_name || tx.destination_account?.account_name || '—'}
                            {tx.transaction_type === 'transfer' && tx.destination_account && (
                              <span className="text-gray-400 text-[10px] block">
                                → {tx.destination_account.account_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="font-medium text-gray-900 truncate max-w-xs" title={tx.description || ''}>
                              {tx.description}
                            </div>
                            <div className="text-gray-400 font-mono text-[10px]">
                              {tx.reference_number || (tx.invoice ? `Inv: ${tx.invoice.invoice_number}` : '—')}
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right font-sans font-bold whitespace-nowrap">
                            <span
                              className={
                                isReversed
                                  ? 'line-through text-gray-400'
                                  : isIncome
                                  ? 'text-emerald-700'
                                  : isExpense
                                  ? 'text-rose-700'
                                  : 'text-indigo-700'
                              }
                            >
                              {isIncome ? '+' : isExpense ? '-' : ''}
                              {formatBDT(tx.amount_bdt)}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-center whitespace-nowrap">
                            {isReversed ? (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500">
                                Reversed
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                Posted
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {!isReversed && canReverseTx && (
                              <button
                                type="button"
                                onClick={() => setReversingTx(tx)}
                                className="text-rose-600 hover:text-rose-800 font-medium text-[11px] hover:underline"
                              >
                                Reverse
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACCOUNTS & RECONCILIATION ── */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {acc.account_type.replace('_', ' ')}
                    </span>
                    <div className="p-2 bg-gray-50 rounded-xl">
                      {getAccountIcon(acc.account_type)}
                    </div>
                  </div>
                  <h4 className="font-sans font-bold text-base text-gray-950 mt-2">
                    {acc.account_name}
                  </h4>
                  {acc.bank_name && (
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {acc.bank_name} {acc.account_number ? `(${acc.account_number})` : ''}
                    </p>
                  )}
                  <div className="mt-4 text-2xl font-bold font-sans text-gray-950">
                    {formatBDT(acc.current_balance_bdt)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Opening: {formatBDT(acc.opening_balance_bdt)}
                  </div>
                </div>

                {canManageAccounts && (
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setReconcilingAccount(acc)
                        setActualStatementBal(String(acc.current_balance_bdt))
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Reconcile Balance</span>
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-sm text-gray-950">
                  Financial Audit Trail & Event Log
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  3-Month Auto Retention
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Financial mutations, reversals, and balance adjustments are kept for 90 days to prevent storage bloat.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                {auditLogs.length} Events
              </span>

              {permissionProfile.isSuperAdmin && (
                <button
                  type="button"
                  disabled={isPruningLogs}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        'Clean up audit logs older than 90 days (3 months)? Any events older than 90 days will be permanently deleted to free up database storage.'
                      )
                    ) {
                      return
                    }
                    setIsPruningLogs(true)
                    try {
                      const res = await pruneFinancialAuditLogsAction(90)
                      if (res.success) {
                        alert(
                          res.deletedCount && res.deletedCount > 0
                            ? `Storage cleanup complete: ${res.deletedCount} audit log record(s) older than 90 days removed.`
                            : 'Database clean: No audit logs older than 90 days found.'
                        )
                        // Refresh audit logs
                        const logsRes = await getFinancialAuditLogsAction(100)
                        if (logsRes.success && logsRes.data) {
                          setAuditLogs(logsRes.data)
                        }
                      } else {
                        alert(`Cleanup failed: ${res.error}`)
                      }
                    } catch (err: any) {
                      alert(`Error: ${err.message}`)
                    } finally {
                      setIsPruningLogs(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-gray-700 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Purge audit logs older than 90 days"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
                  <span>{isPruningLogs ? 'Cleaning...' : 'Prune >90 Days'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Entity</th>
                  <th className="py-3 px-5">Reason / Description</th>
                  <th className="py-3 px-5">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-mono text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-5 font-semibold text-gray-900 uppercase text-[10px]">
                        {log.action}
                      </td>
                      <td className="py-3 px-5 text-gray-500">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="py-3 px-5 text-gray-700">
                        {log.reason || '—'}
                      </td>
                      <td className="py-3 px-5 text-gray-500 font-mono text-[11px]">
                        {log.actor_name || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: QUICK-ADD TRANSACTION ── */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-sans font-bold text-base text-gray-950">
                Record Financial Entry
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTxOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-4">
              {txError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {txError}
                </div>
              )}

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    txType === 'expense' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Record Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    txType === 'income' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Other Income (+)
                </button>
              </div>

              {/* Special Note for Income */}
              {txType === 'income' && (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Artwork & Order Payments Come From Invoices</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Client artwork sales are recorded through the <strong>Invoices</strong> module to prevent duplicate revenue and maintain strict accounts receivable tracking. Use this form only for non-invoice external receipts.
                  </p>
                </div>
              )}

              {/* Expense Source / Payment Channel */}
              {txType === 'expense' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Paid From (Channel / Source) *
                  </label>
                  <select
                    value={txExpenseSource === 'custom_pocket' ? 'custom_pocket' : txPaymentMethod}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === 'custom_pocket') {
                        setTxExpenseSource('custom_pocket')
                        setTxPaymentMethod('out_of_pocket')
                      } else {
                        setTxExpenseSource('liquid_cash')
                        setTxPaymentMethod(val)
                        // Auto-assign corresponding financial account
                        const matched = accounts.find((a) => {
                          const n = a.account_name.toLowerCase()
                          if (val === 'bkash') return n.includes('bkash')
                          if (val === 'nagad') return n.includes('nagad')
                          if (val === 'rocket') return n.includes('rocket')
                          if (val === 'bank_transfer' || val === 'card') return n.includes('bank')
                          if (val === 'cash') return n.includes('cash')
                          return false
                        })
                        if (matched) setTxAccountId(matched.id)
                        else if (accounts[0]) setTxAccountId(accounts[0].id)
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900 focus:bg-white focus:border-black outline-none"
                  >
                    <optgroup label="Gallery Liquid Cash (Deducted from balance)">
                      <option value="cash">Cash in Hand</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                      <option value="bank_transfer">Bank Account</option>
                      <option value="card">Card / POS</option>
                    </optgroup>
                    <optgroup label="Personal / Independent">
                      <option value="custom_pocket">Out of Pocket (Personal funds - gallery balance unchanged)</option>
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Amount (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 5000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-sans focus:outline-hidden focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    {txType === 'income' ? 'Income Category' : 'Expense Category'}
                  </label>
                  <select
                    value={txCategoryId}
                    onChange={(e) => setTxCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black font-medium"
                  >
                    <option value="">
                      {txType === 'income' ? 'Select Income Category (Optional)' : 'Select Expense Category (Optional)'}
                    </option>
                    {categories
                      .filter((c) => c.category_type === txType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Reference # / TrxID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRX-98721"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Description / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Canvas framing raw materials purchase"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? 'Recording...' : 'Post Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFER BETWEEN ACCOUNTS ── */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-sans font-bold text-base text-gray-950 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" /> Transfer Between Accounts
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="mt-4 space-y-4">
              {transferError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {transferError}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Transfers move money between recorded accounts atomically without creating new income or expenses.
              </p>

              {/* Source & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    From Account *
                  </label>
                  <select
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({formatBDT(a.current_balance_bdt)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    To Account *
                  </label>
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} ({formatBDT(a.current_balance_bdt)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Transfer Amount (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 10000"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-sans focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash-out TRX"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cash out from bKash to petty cash"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? 'Processing...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RECONCILE ACCOUNT BALANCE ── */}
      {reconcilingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-sans font-bold text-base text-gray-950 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reconcile {reconcilingAccount.account_name}
              </h3>
              <button
                type="button"
                onClick={() => setReconcilingAccount(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcile} className="mt-4 space-y-4">
              {reconcileError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {reconcileError}
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">System Recorded Balance:</span>
                  <span className="font-bold text-gray-900">{formatBDT(reconcilingAccount.current_balance_bdt)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Actual Bank / Statement Balance (৳ BDT) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={actualStatementBal}
                  onChange={(e) => setActualStatementBal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-sans focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Reconciliation Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bank statement verification on 25-Oct"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReconcilingAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {isPending ? 'Reconciling...' : 'Confirm Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REVERSE TRANSACTION ── */}
      {reversingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-sans font-bold text-base text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Reverse Transaction
              </h3>
              <button
                type="button"
                onClick={() => setReversingTx(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReverse} className="mt-4 space-y-4">
              <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs space-y-1 text-rose-900">
                <p>
                  You are reversing a posted <strong>{reversingTx.transaction_type}</strong> of{' '}
                  <strong>{formatBDT(reversingTx.amount_bdt)}</strong>.
                </p>
                <p className="text-[11px] text-rose-700/80">
                  This creates an immutable audit trail entry and restores the account balance.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Reason for Reversal *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Erroneous entry, wrong account chosen by staff"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversingTx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {isPending ? 'Reversing...' : 'Execute Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
