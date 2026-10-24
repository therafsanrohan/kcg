export type InvoiceStatus = 'draft' | 'issued' | 'cancelled' | 'void';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type InvoiceItemType = 'painting' | 'frame' | 'delivery' | 'discount' | 'custom';

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'card' | 'other';

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount_bdt: number;
  payment_method: PaymentMethod | string;
  payment_date: string;
  transaction_ref?: string | null;
  internal_notes?: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  client_number?: string;
  client_type: 'individual' | 'organization';
  name: string;
  organization_name?: string | null;
  email?: string | null;
  phone: string;
  billing_address?: string | null;
  shipping_address?: string | null;
  tax_id?: string | null;
  membership_tier?: 'none' | 'standard' | 'silver' | 'gold' | string;
  membership_status?: 'active' | 'inactive' | 'expired' | string;
  membership_start_date?: string | null;
  membership_expiry_date?: string | null;
  internal_notes?: string | null;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  invoice_date: string;
  due_date: string | null;
  
  client_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  
  delivery_zone_code: string | null;
  delivery_mode_snapshot: string | null;
  delivery_note_snapshot: string | null;
  
  currency_code: string;
  exchange_rate_snapshot: number;
  
  subtotal_bdt: number;
  discount_bdt: number;
  delivery_charge_bdt: number;
  additional_charge_bdt: number;
  grand_total_bdt: number;
  
  notes: string | null;
  terms: string | null;
  
  // Void tracking
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  
  // Share link
  share_token?: string | null;
  is_share_link_active?: boolean;
  share_link_created_at?: string | null;

  created_by: string | null;
  issued_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  
  invoice_items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: InvoiceItemType;
  
  painting_id: string | null;
  
  item_name: string;
  item_description: string | null;
  artwork_sku: string | null;
  size_snapshot: string | null;
  
  quantity: number;
  unit_price_bdt: number;
  line_total_bdt: number;
  
  sort_order: number;
  created_at: string;
}
