# Kazi Canvas Gallery — cPanel Deployment Guide for Website Owners

Welcome to the deployment guide for **Kazi Canvas Gallery**. This guide is written in clear, step-by-step language so that you can deploy and run the website on your cPanel hosting without needing deep technical knowledge.

---

## 1. Hosting Requirements to Verify First
Before deploying, log in to your cPanel hosting account and verify the following:
1. **Setup Node.js App** icon is available in cPanel (under the **Software** section).
2. **Node.js Version:** Select **Node.js 20.x** or **Node.js 22.x** (Node.js 20+ is required by Next.js 16 and React 19).
3. **SSH Access / Terminal:** (Optional but helpful) A Terminal icon in cPanel to run build commands. If not available, we can build on your local machine and upload the build folder.

---

## 2. Choosing the Application Directory
- **Important:** Do **NOT** place the Next.js project code directly into `public_html`.
- Create a dedicated folder outside `public_html` (for example: `/home/yourusername/kcg` or `/home/yourusername/apps/kcg`).
- This keeps your application code and environment secrets completely private and secure.

---

## 3. Step-by-Step cPanel Setup

### Step A: Create the Node.js Application in cPanel
1. In cPanel, click **Setup Node.js App**.
2. Click the **Create Application** button.
3. Configure the following fields:
   - **Node.js version:** `20.x` or `22.x`
   - **Application mode:** `Production`
   - **Application root:** `kcg` (or the folder name where your code is located)
   - **Application URL:** Select your domain (e.g. `kazicanvasgallery.com` or a staging subdomain `test.kazicanvasgallery.com`)
   - **Application startup file:** `server.js`
4. Click **Create**.

### Step B: Upload or Clone the Code
- **Option 1 (Using Git in cPanel):** Use the **Git™ Version Control** tool in cPanel to clone `therafsanrohan/kcg` into `/home/yourusername/kcg`.
- **Option 2 (Using File Manager):** Zip the repository files on your computer and upload them into `/home/yourusername/kcg`, then extract them. (Do not upload `node_modules` or `.next`).

### Step C: Configure Environment Variables (Secrets)
In cPanel under **Setup Node.js App** for your app, scroll down to **Environment variables** and add the following keys:

| Key Name | Value Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Mode | `production` |
| `NEXT_PUBLIC_SITE_URL` | Your website live URL | `https://kazicanvasgallery.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Found in Supabase API settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Key | Found in Supabase API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret Key | Used privately for admin tasks |
| `ADMIN_SESSION_MAX_AGE_SECONDS` | Session duration | `2592000` (30 days) |

*(Refer to `.env.example` in the project root for reference.)*

### Step D: Install Dependencies and Build
1. In cPanel **Setup Node.js App**, copy the command provided at the top to enter the virtual environment (looks like: `source /home/yourusername/nodevenv/kcg/20/bin/activate && cd /home/yourusername/kcg`).
2. Open the cPanel **Terminal** and paste that command, then run:
   ```bash
   npm install
   npm run build
   ```
3. If your cPanel host has low memory limits for building, you can simply run `npm run build` on your computer and upload the generated `.next/` folder via cPanel File Manager.

### Step E: Start / Restart the Application
1. In the **Setup Node.js App** page, click the **Restart** button.
2. Visit your domain in the browser (e.g., `https://kazicanvasgallery.com`).

---

## 4. Staging Test Checklist (Before Switching Live Domain)
Test the following on your staging subdomain:
- [ ] **Homepage:** Banner, featured artwork, and story sections load properly.
- [ ] **Artwork Catalog:** Gallery page filters, search, and images load crisp and fast.
- [ ] **Artwork Details:** Click an artwork, test frame selector and price calculation.
- [ ] **Reviews:** Click "Write a Review" and verify the official Google Review dialog opens.
- [ ] **Admin Login:** Go to `/admin/login`, enter credentials, verify remember me and session hold.
- [ ] **Admin Invoices:** Download or view an invoice PDF to verify `@react-pdf/renderer` works.

---

## 5. Safe Rollback Procedure
If anything unexpected occurs:
1. In cPanel **Setup Node.js App**, click **Stop Application**.
2. If reverting to a previous version, restore the backup of the application folder.
3. Click **Start Application**.
4. Your Supabase database is completely hosted on Supabase Cloud, so application rollbacks will **never** alter or delete your paintings, invoices, or customer data.
