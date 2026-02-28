# 🔑 Get Your Supabase Keys

Follow these steps to retrieve your publishable and secret keys from the Supabase dashboard and fill them into `.env`.

---

## Step 1: Log in to Supabase

1. Go to **https://app.supabase.com**
2. Log in with your account
3. Select your project from the left pane

---

## Step 2: Navigate to API Settings

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** (should be one of the first options)

You'll see a page with:
- Project URL (already in your `.env`)
- Project API keys section

---

## Step 3: Copy the Anon/Public Key

Under **"Project API keys"** you'll see:

```
anon [public]
pk_anon_xxxxxxxxxxxxxxxxxxxxxxxx
```

1. Click the **copy icon** next to it
2. Paste it into `.env` as the value for `SUPABASE_ANON_KEY`

Example:
```env
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 4: Copy the Service Role Key

Below the anon key you'll see:

```
service_role [secret]
sb_xxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ This is SECRET – never commit it to git.**

1. Click the **copy icon** next to it
2. Paste it into `.env` as the value for `SUPABASE_SERVICE_ROLE_KEY`

Example:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 5: Fill in Database Password

Add the password you used when creating the Supabase project:

```env
DATABASE_PASSWORD=YourStrongPassword123
```

---

## ✅ Your `.env` should now look like

```env
SUPABASE_URL=https://xbrndlhzaluksjhdbnur.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
DATABASE_PASSWORD=YourStrongPassword123
PORT=3000
```

---

## 🚀 Next: Run the server

Once all values are filled in:

```bash
cd jcinunibentoypdashboard
npm install
npm start
```

You should see:
```
✅ Server listening on port 3000
📝 API ready at http://localhost:3000/api/nominations
🏢 Health check: http://localhost:3000/api/health
```
