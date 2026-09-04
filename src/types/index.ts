export type PaintingType = 'oil' | 'acrylic' | 'mixed';
export type AvailabilityStatus = 'available' | 'reserved' | 'sold';

export interface Painting {
  id: string;
  title: string;
  slug: string;
  painting_type: PaintingType;
  exact_medium: string;
  width: number;
  height: number;
  measurement_unit: string;
  display_size: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
  year: number | null;
  base_price_bdt: number;
  discount_price_bdt?: number | null;
  offer_badge?: string | null;
  description: string | null;
  search_tags: string | null;
  availability_status: AvailabilityStatus;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  painting_images?: PaintingImage[];
  frame_options?: FrameOption[];
}

export interface PaintingImage {
  id: string;
  painting_id: string;
  storage_key: string;
  processed_key?: string | null;
  thumbnail_key?: string | null;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
  width: number | null;
  height: number | null;
  file_size?: number | null;
  mime_type?: string | null;
  crop_x?: number | null;
  crop_y?: number | null;
  crop_zoom?: number | null;
  crop_rotation?: number | null;
  processing_status?: string | null;
  created_at: string;
}

export interface FrameOption {
  id: string;
  painting_id: string;
  frame_name: string;
  outer_size: string | null;
  outer_width_mm?: number | null;
  outer_height_mm?: number | null;
  price_bdt: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: string;
  business_name: string;
  whatsapp_number: string;
  default_currency: string;
  contact_info: string | null;
  gallery_address: string | null;
  social_links: any;
  currency_config: any;
  updated_at: string;
}

export type PricingMode = 'free' | 'fixed' | 'courier_quotation' | 'destination_quotation';

export interface DeliveryZone {
  id: string;
  code: 'inside_dhaka' | 'outside_dhaka' | 'international';
  label: string;
  is_active: boolean;
  pricing_mode: PricingMode;
  charge_bdt: number;
  free_delivery: boolean;
  offer_text?: string | null;
  customer_message?: string | null;
  courier_note?: string | null;
  estimated_delivery_time?: string | null;
  sort_order: number;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'superadmin' | 'admin';
  created_at: string;
}
