# 🏠 RentEase Kenya

A professional, mobile-first rental management platform built for small landlords and tenants in Kenya.

## Features

### 🏢 Landlord Dashboard
- **Property Management** — Add and manage multiple rental properties
- **Unit Management** — Centralized view of all units with occupancy stats, rent tracking, and filtering
- **Tenant Management** — Invite tenants via email, track assignments, and manage profiles
- **Payment Tracking** — Record cash payments and track M-Pesa transactions with STK push integration
- **Maintenance Requests** — Receive and manage repair requests from tenants with image uploads
- **Announcements** — Broadcast messages to tenants
- **Notifications** — In-app notification bell with real-time updates
- **Rent Reminders** — Automated reminders via in-app notifications and SMS (Africa's Talking)

### 👤 Tenant Portal
- **Dashboard** — View assigned unit, rent status, and payment history
- **M-Pesa Payments** — Pay rent directly via M-Pesa STK push
- **Maintenance Requests** — Submit repair requests with photos
- **Notifications** — Receive rent reminders and announcements

### 📱 Progressive Web App (PWA)
- Installable on mobile devices (Android & iOS)
- Offline-capable with runtime caching
- Native app-like experience with standalone display

### 🔐 Authentication & Roles
- Email-based signup/login with role selection (Landlord or Tenant)
- Tenant invitation flow with email onboarding
- Role-based access control with RLS policies
- Dual-role support with role switching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack React Query |
| Routing | React Router v6 |
| Backend | Lovable Cloud (Supabase) |
| Payments | M-Pesa Daraja API (STK Push) |
| Email | Resend |
| SMS | Africa's Talking |
| PWA | vite-plugin-pwa + Workbox |
| Animations | Framer Motion |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/           # shadcn/ui primitives
│   └── ...           # App-specific components
├── contexts/         # Auth context with role management
├── hooks/            # Custom React hooks
├── integrations/     # Supabase client & types (auto-generated)
├── pages/            # Route pages
│   ├── Dashboard.tsx       # Landlord dashboard
│   ├── Properties.tsx      # Property CRUD
│   ├── Units.tsx           # Unit management
│   ├── Tenants.tsx         # Tenant invitations
│   ├── Payments.tsx        # Payment records
│   ├── Maintenance.tsx     # Maintenance requests
│   ├── TenantPortal.tsx    # Tenant-facing portal
│   └── ...
└── lib/              # Utilities

supabase/
└── functions/        # Edge functions
    ├── mpesa-stk-push/      # M-Pesa STK push initiation
    ├── mpesa-callback/      # M-Pesa payment callback
    ├── send-invitation/     # Tenant email invitations
    ├── send-notification/   # Push notifications
    ├── notify-maintenance/  # Maintenance email alerts
    └── rent-reminder/       # Automated rent reminders
```

## Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd rentease-kenya

# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

The following secrets are configured in the backend:

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Email delivery via Resend |
| `MPESA_CONSUMER_KEY` | M-Pesa Daraja API authentication |
| `MPESA_CONSUMER_SECRET` | M-Pesa Daraja API authentication |
| `AT_API_KEY` | Africa's Talking SMS |
| `AT_USERNAME` | Africa's Talking account |

## Database Schema

- **properties** — Rental properties owned by landlords
- **units** — Individual rental units within properties
- **profiles** — User profile information (name, phone, avatar)
- **user_roles** — Role assignments (landlord/tenant)
- **payments** — Payment records with M-Pesa transaction tracking
- **tenant_invitations** — Email-based tenant onboarding
- **maintenance_requests** — Repair requests with image support
- **notifications** — In-app notification system

## Deployment

Built with [Lovable](https://lovable.dev). Deploy via Lovable's publish feature or connect a custom domain.

## License

Private project. All rights reserved.
