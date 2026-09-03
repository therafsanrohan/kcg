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
}

export interface PaintingImage {
  id: string;
  painting_id: string;
  storage_key: string;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface FrameOption {
  id: string;
  painting_id: string;
  frame_name: string;
  outer_size: string | null;
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
