'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { requirePermission, getAdminPermissionProfile } from '@/utils/finance-permissions'
import { revalidatePath } from 'next/cache'
import {
  FinancialAccount,
  FinancialCategory,
  FinancialTransaction,
  CashFlowMetrics,
  FinancialAuditLog,
} from '@/types/finance'

/**
 * Log an immutable entry to public.financial_audit_logs
 */
export async function logFinancialAuditAction({
  action,
  entityType,
  entityId,
  previousValues,
  newValues,
  reason,
}: {
  action: string
  entityType: string
  entityId?: string
  previousValues?: any
  newValues?: any
  reason?: string
}) {
  try {
    const { supabase, user } = await requireAdmin()
    const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator'

    await supabase.from('financial_audit_logs').insert({
      actor_id: user.id,
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      previous_values: previousValues || null,
      new_values: newValues || null,
      reason: reason || null,
    })
  } catch (err) {
    console.warn('Could not record financial audit log:', err)
  }
}

/**
 * Get comprehensive Cash Flow metrics calculated directly from database records
 */
export async function getCashFlowMetricsAction(dateFilter?: {
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data?: CashFlowMetrics; error?: string }> {
  try {
    const { supabase } = await requireAdmin()
    await requirePermission('cashflow.view')

    // 1. Fetch all financial accounts
    const { data: accounts, error: accErr } = await supabase
      .from('financial_accounts')
      .select('*')
      .order('sort_order', { ascending: true })

    if (accErr && accErr.code !== 'PGRST205') throw accErr

    const accountList: FinancialAccount[] = accounts || []

    // 2. Fetch all posted transactions
    let txQuery = supabase
      .from('financial_transactions')
      .select('*')
      .eq('status', 'posted')

    if (dateFilter?.startDate) {
      txQuery = txQuery.gte('transaction_date', dateFilter.startDate)
    }
    if (dateFilter?.endDate) {
      txQuery = txQuery.lte('transaction_date', dateFilter.endDate)
    }

    const { data: txns, error: txErr } = await txQuery
    if (txErr && txErr.code !== 'PGRST205') throw txErr

    const txnList: FinancialTransaction[] = txns || []

    // 3. Invoices for accounts receivable & pending collections
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, grand_total_bdt, status, payment_status, invoice_payments(amount_bdt)')

    if (invErr) throw invErr

    let totalReceivable = 0
    let unpaidInvoicesTotal = 0
    let partiallyPaidDueTotal = 0

    ;(invoices || []).forEach((inv: any) => {
      if (inv.status !== 'void' && inv.status !== 'cancelled') {
        const grandTotal = Number(inv.grand_total_bdt) || 0
        const totalPaid = (inv.invoice_payments || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount_bdt) || 0),
          0
        )
        const due = Math.max(0, grandTotal - totalPaid)
        if (due > 0) {
          totalReceivable += due
          if (inv.payment_status === 'unpaid') {
            unpaidInvoicesTotal += due
          } else if (inv.payment_status === 'partially_paid') {
            partiallyPaidDueTotal += due
          }
        }
      }
    })

    // 4. Calculate actual cash movements from transactions
    let totalIncome = 0
    let totalExpense = 0

    txnList.forEach((t) => {
      const amt = Number(t.amount_bdt) || 0
      if (t.transaction_type === 'income') {
        totalIncome += amt
      } else if (t.transaction_type === 'expense') {
        totalExpense += amt
      }
    })

    // If transactions table hasn't been migrated yet, calculate income from invoice payments fallback
    if (txnList.length === 0 && accountList.length === 0) {
      const { data: allPayments } = await supabase.from('invoice_payments').select('amount_bdt')
      const legacyPaid = (allPayments || []).reduce((sum: number, p: any) => sum + (Number(p.amount_bdt) || 0), 0)
      totalIncome = legacyPaid
    }

    const openingBalance = accountList.reduce((sum, a) => sum + (Number(a.opening_balance_bdt) || 0), 0)
    const currentAvailableBalance = accountList.length > 0
      ? accountList.reduce((sum, a) => sum + (Number(a.current_balance_bdt) || 0), 0)
      : totalIncome - totalExpense

    const netCashFlow = totalIncome - totalExpense

    // Monthly inflow & outflow (current calendar month)
    const now = new Date()
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    let monthlyInflow = 0
    let monthlyOutflow = 0
    txnList.forEach((t) => {
      if (t.transaction_date && t.transaction_date.startsWith(currentMonthPrefix)) {
        const amt = Number(t.amount_bdt) || 0
        if (t.transaction_type === 'income') monthlyInflow += amt
        if (t.transaction_type === 'expense') monthlyOutflow += amt
      }
    })

    return {
      success: true,
      data: {
        openingBalance,
        totalIncome,
        totalExpense,
        currentAvailableBalance,
        accountsReceivable: totalReceivable,
        unpaidInvoicesTotal,
        partiallyPaidDueTotal,
        netCashFlow,
        monthlyInflow,
        monthlyOutflow,
        accountBalances: accountList.map((a) => ({
          id: a.id,
          accountName: a.account_name,
          accountType: a.account_type,
          balance: Number(a.current_balance_bdt) || 0,
          bankName: a.bank_name,
        })),
      },
    }
  } catch (err: any) {
    console.error('getCashFlowMetricsAction error:', err)
    return { success: false, error: err.message || 'Failed to fetch cash flow metrics' }
  }
}

/**
 * Fetch accounts, categories, and recent transactions for Finance Dashboard
 */
export async function getFinanceDashboardDataAction(filter?: {
  startDate?: string
  endDate?: string
}) {
  try {
    const { supabase } = await requireAdmin()
    await requirePermission('cashflow.view')

    const [accRes, catRes, txnRes] = await Promise.all([
      supabase.from('financial_accounts').select('*').order('sort_order', { ascending: true }),
      supabase.from('financial_categories').select('*').eq('is_active', true).order('name', { ascending: true }),
      supabase
        .from('financial_transactions')
        .select(`
          *,
          source_account:source_account_id(id, account_name, account_type),
          destination_account:destination_account_id(id, account_name, account_type),
          invoice:invoice_id(id, invoice_number, customer_name)
        `)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return {
      success: true,
      accounts: accRes.data || [],
      categories: catRes.data || [],
      recentTransactions: txnRes.data || [],
    }
  } catch (err: any) {
    console.error('getFinanceDashboardDataAction error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Create a new Income or Expense transaction
 */
export async function createTransactionAction(formData: {
  transactionType: 'income' | 'expense'
  amountBdt: number
  transactionDate: string
  accountId?: string
  expenseSource?: 'liquid_cash' | 'custom_pocket'
  categoryId?: string
  paymentMethod?: string
  referenceNumber?: string
  description: string
  clientId?: string
}) {
  try {
    const { supabase, user } = await requireAdmin()
    await requirePermission('cashflow.create')

    const amount = Number(formData.amountBdt)
    if (!amount || amount <= 0 || isNaN(amount)) {
      return { success: false, error: 'Transaction amount must be greater than zero.' }
    }
    if (formData.expenseSource !== 'custom_pocket' && !formData.accountId) {
      return { success: false, error: 'Please select an account for this payment.' }
    }
    if (!formData.description?.trim()) {
      return { success: false, error: 'Description is required.' }
    }

    // Fetch account if specified
    let account: any = null
    if (formData.accountId) {
      const { data: accData, error: accErr } = await supabase
        .from('financial_accounts')
        .select('id, account_name, current_balance_bdt')
        .eq('id', formData.accountId)
        .single()

      if (accErr || !accData) {
        return { success: false, error: 'Selected account not found.' }
      }
      account = accData
    }

    // Fetch category name
    let categoryName = null
    if (formData.categoryId) {
      const { data: cat } = await supabase
        .from('financial_categories')
        .select('name')
        .eq('id', formData.categoryId)
        .single()
      if (cat) categoryName = cat.name
    }

    const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator'

    // Determine account allocation
    const isIncome = formData.transactionType === 'income'
    const isOutOfPocket = formData.expenseSource === 'custom_pocket'
    const destAccountId = isIncome ? account?.id : null
    const srcAccountId = !isIncome && !isOutOfPocket ? account?.id : null

    // Insert transaction
    const { data: inserted, error: insErr } = await supabase
      .from('financial_transactions')
      .insert({
        transaction_type: formData.transactionType,
        amount_bdt: amount,
        transaction_date: formData.transactionDate || new Date().toISOString().split('T')[0],
        status: 'posted',
        source_account_id: srcAccountId || null,
        destination_account_id: destAccountId || null,
        category_id: formData.categoryId || null,
        category_name: isOutOfPocket ? 'Out of Pocket / Personal' : categoryName,
        payment_method: isOutOfPocket ? 'out_of_pocket' : (formData.paymentMethod || 'cash'),
        reference_number: formData.referenceNumber?.trim() || null,
        description: isOutOfPocket ? `[Paid Out of Pocket / Personal] ${formData.description.trim()}` : formData.description.trim(),
        client_id: formData.clientId || null,
        created_by: user.id,
        created_by_name: actorName,
      })
      .select()
      .single()

    if (insErr) throw insErr

    // Update account balance atomically only if not paid out of pocket
    if (account && !isOutOfPocket) {
      const balanceDelta = isIncome ? amount : -amount
      const newBalance = Number(account.current_balance_bdt) + balanceDelta

      await supabase
        .from('financial_accounts')
        .update({ current_balance_bdt: newBalance })
        .eq('id', account.id)
    }

    // Log audit trail
    await logFinancialAuditAction({
      action: isIncome ? 'CREATE_INCOME' : isOutOfPocket ? 'CREATE_EXPENSE_OUT_OF_POCKET' : 'CREATE_EXPENSE',
      entityType: 'transaction',
      entityId: inserted.id,
      newValues: inserted,
      reason: formData.description,
    })

    revalidatePath('/admin/finance')
    return { success: true, transaction: inserted }
  } catch (err: any) {
    console.error('createTransactionAction error:', err)
    return { success: false, error: err.message || 'Failed to create transaction' }
  }
}

/**
 * Transfer funds atomically between two financial accounts
 */
export async function createTransferAction(formData: {
  amountBdt: number
  transactionDate: string
  sourceAccountId: string
  destinationAccountId: string
  paymentMethod: string
  referenceNumber?: string
  description: string
}) {
  try {
    const { supabase, user } = await requireAdmin()
    await requirePermission('cashflow.create')

    const amount = Number(formData.amountBdt)
    if (!amount || amount <= 0 || isNaN(amount)) {
      return { success: false, error: 'Transfer amount must be greater than zero.' }
    }
    if (formData.sourceAccountId === formData.destinationAccountId) {
      return { success: false, error: 'Source and destination accounts must be different.' }
    }

    const { data: srcAccount } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', formData.sourceAccountId)
      .single()

    const { data: destAccount } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', formData.destinationAccountId)
      .single()

    if (!srcAccount || !destAccount) {
      return { success: false, error: 'One or both accounts could not be verified.' }
    }

    const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator'

    // 1. Insert transfer transaction
    const { data: inserted, error: insErr } = await supabase
      .from('financial_transactions')
      .insert({
        transaction_type: 'transfer',
        amount_bdt: amount,
        transaction_date: formData.transactionDate || new Date().toISOString().split('T')[0],
        status: 'posted',
        source_account_id: srcAccount.id,
        destination_account_id: destAccount.id,
        category_name: 'Account Transfer',
        payment_method: formData.paymentMethod || 'bank_transfer',
        reference_number: formData.referenceNumber?.trim() || null,
        description: formData.description?.trim() || `Transfer from ${srcAccount.account_name} to ${destAccount.account_name}`,
        created_by: user.id,
        created_by_name: actorName,
      })
      .select()
      .single()

    if (insErr) throw insErr

    // 2. Decrement source account
    await supabase
      .from('financial_accounts')
      .update({ current_balance_bdt: Number(srcAccount.current_balance_bdt) - amount })
      .eq('id', srcAccount.id)

    // 3. Increment destination account
    await supabase
      .from('financial_accounts')
      .update({ current_balance_bdt: Number(destAccount.current_balance_bdt) + amount })
      .eq('id', destAccount.id)

    // Audit log
    await logFinancialAuditAction({
      action: 'ACCOUNT_TRANSFER',
      entityType: 'transaction',
      entityId: inserted.id,
      newValues: {
        amount,
        from: srcAccount.account_name,
        to: destAccount.account_name,
      },
      reason: formData.description,
    })

    revalidatePath('/admin/finance')
    return { success: true, transaction: inserted }
  } catch (err: any) {
    console.error('createTransferAction error:', err)
    return { success: false, error: err.message || 'Failed to complete transfer' }
  }
}

/**
 * Reverse an erroneous financial transaction with full audit trail
 */
export async function reverseTransactionAction(transactionId: string, reason: string) {
  try {
    const { supabase, user } = await requireAdmin()
    await requirePermission('cashflow.reverse')

    if (!reason?.trim()) {
      return { success: false, error: 'Reversal reason is required for financial audit integrity.' }
    }

    const { data: txn, error: txnErr } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (txnErr || !txn) {
      return { success: false, error: 'Transaction not found.' }
    }

    if (txn.status !== 'posted') {
      return { success: false, error: `Cannot reverse a transaction that is already ${txn.status}.` }
    }

    const amount = Number(txn.amount_bdt) || 0

    // Adjust balances based on transaction type
    if (txn.transaction_type === 'income' && txn.destination_account_id) {
      const { data: acc } = await supabase
        .from('financial_accounts')
        .select('current_balance_bdt')
        .eq('id', txn.destination_account_id)
        .single()
      if (acc) {
        await supabase
          .from('financial_accounts')
          .update({ current_balance_bdt: Number(acc.current_balance_bdt) - amount })
          .eq('id', txn.destination_account_id)
      }
    } else if (txn.transaction_type === 'expense' && txn.source_account_id) {
      const { data: acc } = await supabase
        .from('financial_accounts')
        .select('current_balance_bdt')
        .eq('id', txn.source_account_id)
        .single()
      if (acc) {
        await supabase
          .from('financial_accounts')
          .update({ current_balance_bdt: Number(acc.current_balance_bdt) + amount })
          .eq('id', txn.source_account_id)
      }
    } else if (txn.transaction_type === 'transfer') {
      // Revert transfer: refund source, deduct destination
      if (txn.source_account_id) {
        const { data: src } = await supabase.from('financial_accounts').select('current_balance_bdt').eq('id', txn.source_account_id).single()
        if (src) await supabase.from('financial_accounts').update({ current_balance_bdt: Number(src.current_balance_bdt) + amount }).eq('id', txn.source_account_id)
      }
      if (txn.destination_account_id) {
        const { data: dest } = await supabase.from('financial_accounts').select('current_balance_bdt').eq('id', txn.destination_account_id).single()
        if (dest) await supabase.from('financial_accounts').update({ current_balance_bdt: Number(dest.current_balance_bdt) - amount }).eq('id', txn.destination_account_id)
      }
    }

    // Mark transaction as reversed
    const { error: revErr } = await supabase
      .from('financial_transactions')
      .update({
        status: 'reversed',
        reversal_reason: reason.trim(),
        reversed_at: new Date().toISOString(),
        reversed_by: user.id,
      })
      .eq('id', transactionId)

    if (revErr) throw revErr

    // Audit log
    await logFinancialAuditAction({
      action: 'REVERSE_TRANSACTION',
      entityType: 'transaction',
      entityId: transactionId,
      previousValues: { status: 'posted' },
      newValues: { status: 'reversed' },
      reason: reason.trim(),
    })

    revalidatePath('/admin/finance')
    return { success: true }
  } catch (err: any) {
    console.error('reverseTransactionAction error:', err)
    return { success: false, error: err.message || 'Failed to reverse transaction' }
  }
}

/**
 * Super Admin Management: Update an administrator's granular permissions
 */
export async function updateAdminPermissionsAction(
  targetAdminId: string,
  permissions: string[],
  isFinanceOnly: boolean
) {
  try {
    const { supabase, user, adminRecord } = await requireAdmin()

    if (adminRecord.role !== 'superadmin') {
      return { success: false, error: 'Forbidden: Only a Super Admin can configure administrator permissions.' }
    }

    const { error } = await supabase
      .from('admin_user_permissions')
      .upsert(
        {
          admin_id: targetAdminId,
          permissions: permissions,
          is_finance_only: isFinanceOnly,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'admin_id' }
      )

    if (error) throw error

    await logFinancialAuditAction({
      action: 'UPDATE_ADMIN_PERMISSIONS',
      entityType: 'permission',
      entityId: targetAdminId,
      newValues: { permissions, isFinanceOnly },
      reason: `Updated permissions by Super Admin ${adminRecord.email}`,
    })

    revalidatePath('/admin/profile')
    revalidatePath('/admin/finance')
    return { success: true }
  } catch (err: any) {
    console.error('updateAdminPermissionsAction error:', err)
    return { success: false, error: err.message || 'Failed to update permissions' }
  }
}

/**
 * Fetch granular permissions for a given administrator
 */
export async function getAdminPermissionsAction(targetAdminId: string) {
  try {
    const { supabase, adminRecord } = await requireAdmin()
    if (adminRecord.role !== 'superadmin') {
      return { success: false, error: 'Forbidden' }
    }

    const { data, error } = await supabase
      .from('admin_user_permissions')
      .select('*')
      .eq('admin_id', targetAdminId)
      .maybeSingle()

    if (error && error.code !== 'PGRST205') throw error

    return {
      success: true,
      data: data || { admin_id: targetAdminId, permissions: [], is_finance_only: false },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch financial audit logs (with automatic retention pruning of entries older than 90 days / 3 months)
 */
export async function getFinancialAuditLogsAction(limit: number = 100) {
  try {
    const { supabase } = await requireAdmin()
    await requirePermission('finance.audit_logs')

    // Automatically prune audit entries older than 90 days (3 months) to conserve storage
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('financial_audit_logs')
        .delete()
        .lt('created_at', ninetyDaysAgo)
    } catch (cleanupErr) {
      console.warn('Background 90-day audit log cleanup skipped:', cleanupErr)
    }

    const { data, error } = await supabase
      .from('financial_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error && error.code !== 'PGRST205') throw error

    return { success: true, data: (data as FinancialAuditLog[]) || [] }
  } catch (err: any) {
    console.error('getFinancialAuditLogsAction error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Explicit action to prune financial audit logs older than retentionDays (default: 90 days)
 */
export async function pruneFinancialAuditLogsAction(retentionDays: number = 90) {
  try {
    const { supabase } = await requireAdmin()
    await requirePermission('finance.audit_logs')

    const safeDays = Math.max(30, retentionDays)
    const cutoffDate = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString()

    // 1. Try invoking PostgreSQL stored procedure if migration was executed
    const { data: rpcDeleted, error: rpcError } = await supabase.rpc(
      'cleanup_expired_financial_audit_logs',
      { retention_days: safeDays }
    )

    if (!rpcError && typeof rpcDeleted === 'number') {
      return { success: true, deletedCount: rpcDeleted }
    }

    // 2. Direct database query fallback
    const { data, error } = await supabase
      .from('financial_audit_logs')
      .delete()
      .lt('created_at', cutoffDate)
      .select('id')

    if (error) throw error

    return { success: true, deletedCount: data?.length || 0 }
  } catch (err: any) {
    console.error('pruneFinancialAuditLogsAction error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Reconcile account balance: updates current balance with auditable difference entry
 */
export async function reconcileAccountBalanceAction(
  accountId: string,
  actualVerifiedBalance: number,
  notes: string
) {
  try {
    const { supabase, user } = await requireAdmin()
    await requirePermission('cashflow.manage_accounts')

    const verified = Number(actualVerifiedBalance)
    if (isNaN(verified)) {
      return { success: false, error: 'Please enter a valid balance.' }
    }

    const { data: account, error: accErr } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accErr || !account) {
      return { success: false, error: 'Account not found.' }
    }

    const oldBalance = Number(account.current_balance_bdt) || 0
    const difference = verified - oldBalance

    // Update account
    await supabase
      .from('financial_accounts')
      .update({ current_balance_bdt: verified })
      .eq('id', accountId)

    // If difference exists, create an adjustment transaction
    if (difference !== 0) {
      const isPositive = difference > 0
      const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator'

      await supabase.from('financial_transactions').insert({
        transaction_type: isPositive ? 'income' : 'expense',
        amount_bdt: Math.abs(difference),
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'posted',
        source_account_id: !isPositive ? account.id : null,
        destination_account_id: isPositive ? account.id : null,
        category_name: 'Balance Reconciliation Adjustment',
        payment_method: account.account_type,
        description: `Reconciliation adjustment for ${account.account_name}: ${notes || 'Verified against bank/account statement'}`,
        created_by: user.id,
        created_by_name: actorName,
      })
    }

    // Audit log
    await logFinancialAuditAction({
      action: 'RECONCILE_ACCOUNT_BALANCE',
      entityType: 'account',
      entityId: account.id,
      previousValues: { balance: oldBalance },
      newValues: { balance: verified, difference },
      reason: notes || 'Account statement reconciliation',
    })

    revalidatePath('/admin/finance')
    return { success: true }
  } catch (err: any) {
    console.error('reconcileAccountBalanceAction error:', err)
    return { success: false, error: err.message || 'Failed to reconcile balance' }
  }
}
