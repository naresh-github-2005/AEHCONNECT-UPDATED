# DutyCare Connect – Run & Deployment Guide

---

## 1. Running Locally in VS Code

### Prerequisites
- **Node.js** v18+ (LTS recommended)
- **npm** or **bun** package manager
- **VS Code** with recommended extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - Prettier

### Steps

```powershell
# 1. Navigate to project folder
cd "d:\ACEi App\dutycare-connect"

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will start at **http://localhost:8080** (or next available port like 8081).

### Environment Variables
Your `.env` file is already configured:

```env
VITE_SUPABASE_PROJECT_ID="ljwkylnzurldtsyrsvxe"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJI..."
VITE_SUPABASE_URL="https://ljwkylnzurldtsyrsvxe.supabase.co"
```

> **Note**: These are public/anon keys (safe for frontend). Never expose service role keys.

### Demo Login Credentials
After seeding (via `seed-demo-users` edge function):
- **Admin**: `admin@hospital.com` / `admin123`
- **Doctor**: `doctor@hospital.com` / `doctor123`

---

## 2. Building for Production

```powershell
npm run build
```

This creates an optimized build in the `dist/` folder.

To preview the production build locally:
```powershell
npm run preview
```

---

## 3. Deployment Options

### Option A: Deploy via Lovable (Recommended)
Since the backend is on **Lovable Cloud (Supabase)**, the easiest path is to deploy directly from Lovable:

1. Push your code to GitHub
2. Open your project in [Lovable](https://lovable.dev)
3. Connect your GitHub repo
4. Click **Deploy** → Lovable handles hosting + CI/CD

### Option B: Deploy Frontend to Vercel

1. **Push to GitHub**
   ```powershell
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo: `Mohammed0Arfath/dutycare-connect`
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Add Environment Variables** in Vercel Dashboard → Settings → Environment Variables:
   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://ljwkylnzurldtsyrsvxe.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJI...` (your anon key) |
   | `VITE_SUPABASE_PROJECT_ID` | `ljwkylnzurldtsyrsvxe` |

4. **Deploy** → Vercel builds and provides a URL like `https://dutycare-connect.vercel.app`

### Option C: Deploy Frontend to Netlify

1. **Push to GitHub** (same as above)

2. **Import to Netlify**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click **Add new site** → Import from Git
   - Select your repo

3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Environment Variables**: Same as Vercel (add in Netlify dashboard)

5. **Deploy**

### Option D: Self-Host (Docker/VPS)

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf` for SPA routing:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Build and run:
```bash
docker build -t dutycare-connect .
docker run -p 80:80 dutycare-connect
```

---

## 4. Backend (Supabase/Lovable Cloud)

Your backend is already deployed on **Lovable Cloud** (managed Supabase):
- **Project ID**: `ljwkylnzurldtsyrsvxe`
- **URL**: `https://ljwkylnzurldtsyrsvxe.supabase.co`

### Edge Functions
Two functions are deployed:
- `ai-scheduling-assistant` – AI-powered duty generation
- `seed-demo-users` – Demo user seeding

### Managing Backend

1. **Supabase Dashboard**  
   Access at: `https://supabase.com/dashboard/project/ljwkylnzurldtsyrsvxe`

2. **Run Migrations** (if needed locally):
   ```powershell
   npx supabase db push
   ```

3. **Deploy Edge Functions**:
   ```powershell
   npx supabase functions deploy ai-scheduling-assistant
   npx supabase functions deploy seed-demo-users
   ```

4. **Seed Demo Users** (call the edge function):
   ```powershell
   curl -X POST "https://ljwkylnzurldtsyrsvxe.supabase.co/functions/v1/seed-demo-users"
   ```

---

## 5. Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test login with demo credentials
- [ ] Check Supabase RLS policies are working
- [ ] Test real-time updates (duty changes, chat messages)
- [ ] Verify PWA install works on mobile
- [ ] Test AI scheduling (requires LOVABLE_API_KEY in Supabase secrets)

---

## 6. Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain (e.g., `roster.yourhospital.com`)
3. Configure DNS: Add CNAME pointing to `cname.vercel-dns.com`

### Netlify
1. Go to Site Settings → Domain management
2. Add custom domain
3. Configure DNS as instructed

---

## 7. Troubleshooting

### "Port 8080 is in use"
Vite auto-picks the next available port (8081, 8082, etc.)

### Supabase connection errors
- Check `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Ensure RLS policies allow authenticated access

### Build failures
```powershell
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### PWA not installing
- Serve over HTTPS (required for PWA)
- Check `manifest.json` is being served correctly

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

**Your app is now running!** 🎉

Access it at: **http://localhost:8081**
