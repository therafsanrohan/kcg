# Kazi Canvas Gallery

This is a premium, full-stack Next.js web application built for Kazi Canvas Gallery. It features a bespoke online gallery for handmade artwork, an integrated WhatsApp ordering flow, live currency conversion (for display), and a secure admin dashboard powered by Supabase.

## Tech Stack
- **Frontend Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database & Auth & Storage:** Supabase (PostgreSQL)
- **Validation:** Zod

## Setup Instructions

### 1. Supabase Initialization
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL script located at `supabase/migrations/00000000000000_init.sql` in the Supabase SQL Editor to create all necessary tables and security policies.
3. In Supabase Storage, create a public bucket named `paintings`.

### 2. Environment Variables
1. Copy `.env.example` to `.env.local`
2. Retrieve your Supabase URL and keys from `Project Settings > API` in the Supabase Dashboard.
3. Fill in the keys in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required for the admin panel bypass logic, but keep this safe)

### 3. Running the Development Server
```bash
npm run dev
```

## How to use the Admin Panel
The admin panel is securely located at `/admin`. To sign in, you must first create an authenticated user in the Supabase Auth dashboard.

1. **How the admin signs in:** Navigate to `/admin/login` and use the email/password of the user you created in Supabase Auth.
2. **How to add a painting:** Go to `/admin/paintings` and click "Add Painting". Fill out the required metadata and click Save.
3. **How to update stock status:** Click "Edit" on any painting in the list. Change the "Status" dropdown to Available, Reserved, or Sold.
4. **How to add frame options:** On the painting edit page, scroll to the bottom to find the "Manage Frame Options" section. Add the frame name, dimensions, and BDT price.
5. **How to change prices:** Edit the "Base Price (BDT)" field directly on the painting edit page.
6. **How to replace an image:** On the painting edit page, scroll to "Manage Images". Upload a new image. You can also view the active image references.
7. **How to change the WhatsApp number:** The base WhatsApp number is hardcoded in the `generateWhatsAppLink` function in `src/app/gallery/[slug]/ClientDetails.tsx`. Update the `8801824951514` value if it changes.
8. **How to deploy safely:** Push your code to GitHub and connect the repository to Vercel. Ensure you add the `.env` variables into the Vercel project settings before deploying.
