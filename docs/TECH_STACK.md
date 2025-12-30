# DutyCare Connect — Technology Stack (Verified)

This document captures the **actual tech stack used in this repository**.

- **Verified** items are confirmed from `package.json`, `supabase/config.toml`, `supabase/functions/*`, and `supabase/migrations/*`.
- Anything marked **(inferred)** is a reasonable assumption based on conventions, but isn’t directly pinned in the repo.

> Repo: `dutycare-connect`

---

## Frontend (Verified)

### Core

| Category | Technology | Version (repo) | Notes |
|---|---:|---:|---|
| UI Framework | React | `^18.3.1` | Component UI |
| Language | TypeScript | `^5.8.3` | Type-safe frontend |
| Build tool | Vite | `^5.4.19` | Dev server + bundler |
| React compiler | `@vitejs/plugin-react-swc` | `^3.11.0` | Uses SWC for fast builds |

### Styling

| Category | Technology | Version (repo) | Notes |
|---|---:|---:|---|
| CSS framework | Tailwind CSS | `^3.4.17` | Utility-first styling |
| Tailwind plugin | `tailwindcss-animate` | `^1.0.7` | Animation utilities |
| Tailwind plugin | `@tailwindcss/typography` | `^0.5.16` | Prose styling |
| PostCSS | postcss | `^8.5.6` | Tailwind pipeline |
| PostCSS | autoprefixer | `^10.4.21` | Vendor prefixes |

### UI Components / shadcn-style ecosystem

This app uses a **shadcn/ui-style component structure** (`src/components/ui/*`) layered on **Radix UI primitives**.

| Library | Version (repo) | Purpose |
|---|---:|---|
| Radix UI (many packages) | `^1.x` / `^2.x` | Accessible primitives (dialog, dropdown, tabs, etc.) |
| Lucide React | `^0.462.0` | Icons |
| `cmdk` | `^1.1.1` | Command palette |
| `vaul` | `^0.9.9` | Drawer component |
| `sonner` | `^1.7.4` | Toast notifications |
| `embla-carousel-react` | `^8.6.0` | Carousel |
| `next-themes` | `^0.3.0` | Theme switching (dark/light) |
| `react-resizable-panels` | `^2.1.9` | Split panes / resizable layouts |
| `react-day-picker` | `^8.10.1` | Calendar picker |
| `input-otp` | `^1.4.2` | OTP input UI |

### Forms & validation

| Library | Version (repo) | Purpose |
|---|---:|---|
| React Hook Form | `^7.61.1` | Form state management |
| Zod | `^3.25.76` | Schema validation |
| `@hookform/resolvers` | `^3.10.0` | Zod integration |

### Data, routing, and utilities

| Library | Version (repo) | Purpose |
|---|---:|---|
| TanStack React Query | `^5.83.0` | Server-state caching & fetching |
| React Router DOM | `^6.30.1` | Client-side routing |
| `@supabase/supabase-js` | `^2.89.0` | Auth, DB, realtime client |
| `date-fns` | `^3.6.0` | Date utilities |
| `clsx` | `^2.1.1` | Conditional classes |
| `tailwind-merge` | `^2.6.0` | Merge Tailwind classes |
| `class-variance-authority` | `^0.7.1` | Variant-driven component styles |

### Data visualization & export

| Library | Version (repo) | Purpose |
|---|---:|---|
| Recharts | `^2.15.4` | Charts |
| jsPDF | `^3.0.4` | PDF generation |
| `jspdf-autotable` | `^5.0.2` | PDF tables |
| `xlsx` | `^0.18.5` | Excel export |

### PWA

| Library | Version (repo) | Purpose |
|---|---:|---|
| `vite-plugin-pwa` | `^1.2.0` | PWA support via Vite |
| Workbox | (via plugin) | Runtime caching + SW generation (plugin-managed) |

---

## Backend (Lovable Cloud / Supabase) (Verified)

### Platform & core services

| Component | Technology | Verified evidence | Notes |
|---|---|---|---|
| Backend platform | Supabase (Lovable Cloud) | `supabase/` directory + migrations + functions | Managed Postgres + Auth + Realtime + Edge Functions |
| Database | PostgreSQL | `supabase/migrations/*.sql` | Schema + policies managed via SQL migrations |
| Authentication | Supabase Auth | migrations reference `auth.users` | JWT sessions used client-side |
| Realtime | Supabase Realtime | migrations add tables to `supabase_realtime` publication | Live updates for duty/swaps/chat/attendance/classes |
| Edge Functions runtime | Deno | `supabase/functions/*` uses Deno + `deno.land/std` | HTTP serverless functions |

### Edge Functions (Verified)

| Function | Path | Auth behavior | Purpose |
|---|---|---|---|
| `ai-scheduling-assistant` | `supabase/functions/ai-scheduling-assistant/index.ts` | Verifies JWT manually in code; checks `user_roles` for `admin` | Calls Lovable AI Gateway to generate duty assignments |
| `seed-demo-users` | `supabase/functions/seed-demo-users/index.ts` | Uses service role key; creates demo users + inserts `user_roles` | Seeds an admin + doctor demo login |

**Note on `supabase/config.toml`:** both functions are configured with `verify_jwt = false`, so the function gateway won’t enforce JWT automatically; `ai-scheduling-assistant` still enforces auth **inside** the function code.

### External AI integration (Verified)

| API | Endpoint | Model | Evidence |
|---|---|---|---|
| Lovable AI Gateway | `https://ai.gateway.lovable.dev/v1/chat/completions` | `google/gemini-2.5-flash` | In `ai-scheduling-assistant/index.ts` |

---

## Database schema (Verified from migrations)

Your ERD is directionally correct, but the repo includes **additional tables and enums**, and a few field names differ.

### Key enums (as migrated)

- `public.app_role`: `admin`, `doctor`
- `public.duty_type`: `OPD`, `OT`, `Ward`, `Night Duty`, `Camp`, `Emergency`, plus later additions: `Cataract OT`, `Retina OT`, `Glaucoma OT`, `Cornea OT`, `Today Doctor`
- `public.leave_type`: `Casual`, `Emergency`, `Medical`, `Annual`
- `public.leave_status`: `pending`, `approved`, `rejected`
- `public.seniority_level`: `intern`, `resident`, `fellow`, `consultant`, `senior_consultant`
- `public.medical_specialty`: `general`, `cornea`, `retina`, `glaucoma`, `oculoplasty`, `pediatric`, `neuro`, `cataract`
- `public.designation_level`: `pg`, `fellow`, `mo`, `consultant`
- `public.class_type`: `lecture`, `grand_rounds`, `case_presentation`, `journal_club`, `complication_meeting`, `nbems_class`, `pharma_quiz`, `exam`, `other`

### Core tables

- `doctors`
  - Includes `user_id` linking to `auth.users`
  - Has scheduling-related columns: `seniority`, `specialty`, limits, capability flags, `eligible_duties[]`, `performance_score`, and `unit`
- `duty_assignments`
- `leave_requests`
- `user_roles`
- `swap_requests`
- `camps`, `camp_assignments`
- `doctor_duty_stats`
- `attendance_records`
- `classes`, `class_attendees`
- Collaboration/messaging:
  - `chat_channels`, `chat_messages`, `channel_members`
- Operational/support:
  - `activity_logs`
  - `ai_scheduling_suggestions` (stores AI suggestions as JSON)

### Realtime-enabled tables (as migrated)

The migrations explicitly add these to the `supabase_realtime` publication:

- `chat_messages`
- `duty_assignments`
- `swap_requests`
- `attendance_records`
- `classes`

### Security model (Verified)

- **RLS is enabled** on all major tables.
- `public.has_role(auth.uid(), 'admin')` is used widely for admin-only operations.
- Policies are written primarily for `authenticated` users.

---

## Notes vs your original stack description

Your write-up matches the repo very closely. A few differences/additions based on what’s actually in this codebase:

- **Present in repo but not mentioned**: `next-themes`, `input-otp`, `react-resizable-panels`, `react-day-picker`, `lovable-tagger` (dev)
- **Schema differs slightly**:
  - `doctors.specialization` exists (earlier migration), but the newer model uses `doctors.specialty` enum.
  - There is no `messages` table; messaging is implemented as `chat_channels`, `chat_messages`, `channel_members`.
  - Your ERD mentions `camp_assignments` and `class_attendees` (those do exist), but also includes more backend tables than shown (e.g., `doctor_duty_stats`, `ai_scheduling_suggestions`, `activity_logs`).
- **Functions auth**:
  - Gateway verification is disabled (`verify_jwt=false`), but `ai-scheduling-assistant` still does strict JWT + admin checks inside the function.

---

## If you want, I can generate an updated ERD

If you’d like, I can produce an ERD that matches the migrations exactly (tables + relationships + enums) and add it to this doc.
