# AEH Connect

A comprehensive **Hospital Duty Roster Management System** built for Aravind Eye Hospital. This smart rostering platform helps healthcare administrators manage doctor duties, leave requests, academic schedules, and team communication efficiently.

![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan?logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Ready-purple)

## Features

### For Administrators
- **Dashboard** - Overview of pending approvals, hospital stats, and quick actions
- **AI Scheduling Assistant** - Intelligent duty scheduling powered by Google Gemini
- **Monthly Roster Generator** - Bulk roster generation with fairness tracking
- **Doctor Management** - Add, edit, and manage doctor profiles and capabilities
- **Leave Management** - Approve/reject leave and permission requests
- **Camp Management** - Organize and assign doctors to eye camps
- **Academic Management** - Schedule and track academic classes
- **Analytics Dashboard** - Visual insights on duty distribution and workload

### For Doctors
- **Personal Dashboard** - Today's duty, upcoming assignments, and quick stats
- **Roster View** - Monthly and yearly roster visualization
- **Leave Requests** - Submit leave applications and permissions
- **Duty Swap** - Request duty swaps with colleagues
- **Attendance** - Punch in/out for shifts
- **Academic Classes** - View and attend scheduled classes
- **Test Marks** - View academic performance (Fellows/PG)
- **Team Messaging** - In-app communication with team members

### System Features
- **PWA Support** - Install as mobile app
- **Real-time Updates** - Live data sync via Supabase Realtime
- **Role-based Access** - Secure access control with RLS policies
- **Export Options** - Download rosters as PDF or Excel
- **20+ Departments** - Pre-configured department settings

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| State | TanStack React Query |
| Routing | React Router DOM |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| AI | Google Gemini 2.5 Flash |
| Charts | Recharts |
| Export | jsPDF, xlsx |

## Project Structure

```
aehconnect-new/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin-specific components
│   │   ├── layout/         # App layout (header, nav, sidebar)
│   │   ├── roster/         # Roster view components
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # Auth & Data contexts
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Supabase client & types
│   ├── lib/                # Utilities, rules, export functions
│   └── pages/              # Page components
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── docs/
│   ├── database/           # SQL scripts & schemas
│   └── setup/              # Setup guides & checklists
├── scripts/                # Migration & utility scripts
└── public/                 # Static assets & PWA config
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aehconnect.git
   cd aehconnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment**

   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run database migrations**

   Execute the SQL files in `docs/database/` in your Supabase SQL editor, starting with:
   - `PRODUCTION_SCHEMA.sql`
   - `INSERT_DEPARTMENTS.sql`
   - `SEED_DATA.sql`

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8081`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | admin123 |
| Doctor | doctor@hospital.com | doctor123 |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Documentation

Detailed documentation is available in the `docs/` folder:

- [Quick Start Guide](docs/QUICK_START.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Tech Stack Details](docs/TECH_STACK.md)
- [Role Access Guide](docs/ROLE_ACCESS_GUIDE.md)
- [Supabase Setup](docs/setup/SUPABASE_SETUP_GUIDE.md)
- [Troubleshooting](docs/setup/TROUBLESHOOTING.md)

## Database Schema

Key tables in the system:

| Table | Purpose |
|-------|---------|
| `doctors` | Doctor profiles with specialties and capabilities |
| `duty_assignments` | Daily duty assignments |
| `leave_requests` | Leave applications |
| `monthly_rosters` | Monthly roster records |
| `swap_requests` | Duty swap requests |
| `camps` | Eye camp management |
| `classes` | Academic schedule |
| `attendance_records` | Punch in/out tracking |
| `chat_messages` | Team messaging |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software developed for Aravind Eye Hospital.

## Support

For issues and feature requests, please open an issue on GitHub.

---

Built with care for healthcare professionals
