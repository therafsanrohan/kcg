import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Service role key for bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Secret Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const dummyPaintings = [
  {
    title: 'The Silent River',
    slug: 'the-silent-river',
    painting_type: 'oil',
    exact_medium: 'Oil on Canvas',
    width: 120,
    height: 80,
    measurement_unit: 'cm',
    display_size: '120 x 80 cm',
    year: 2023,
    base_price_bdt: 25000,
    description: 'A serene depiction of a quiet river at dusk.',
    search_tags: 'river, dusk, nature, serene',
    availability_status: 'available',
    is_featured: true,
    is_published: true,
  },
  {
    title: 'Abstract Thoughts',
    slug: 'abstract-thoughts',
    painting_type: 'acrylic',
    exact_medium: 'Acrylic on Board',
    width: 90,
    height: 90,
    measurement_unit: 'cm',
    display_size: '90 x 90 cm',
    year: 2024,
    base_price_bdt: 18000,
    description: 'A vibrant explosion of colors reflecting modern thoughts.',
    search_tags: 'abstract, colorful, modern',
    availability_status: 'available',
    is_featured: true,
    is_published: true,
  },
  {
    title: 'City Lights',
    slug: 'city-lights',
    painting_type: 'mixed',
    exact_medium: 'Mixed Media on Canvas',
    width: 150,
    height: 100,
    measurement_unit: 'cm',
    display_size: '150 x 100 cm',
    year: 2022,
    base_price_bdt: 35000,
    description: 'A beautiful night view of the city skyline.',
    search_tags: 'city, night, skyline',
    availability_status: 'sold',
    is_featured: false,
    is_published: true,
  }
];

async function seed() {
  console.log('Seeding dummy data...');
  
  for (const painting of dummyPaintings) {
    const { data, error } = await supabase
      .from('paintings')
      .upsert(painting, { onConflict: 'slug' })
      .select()
      .single();
      
    if (error) {
      console.error(`Error inserting ${painting.title}:`, error.message);
    } else {
      console.log(`Inserted painting: ${data.title}`);
    }
  }
  
  console.log('Seeding complete!');
}

seed();
