export type InvoiceStatus = 'draft' | 'issued' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type InvoiceItemType = 'painting' | 'frame' | 'delivery' | 'discount' | 'custom';

export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  invoice_date: string;
  due_date: string | null;
  
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
  
  created_by: string | null;
  issued_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  
  invoice_items?: InvoiceItem[];
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
