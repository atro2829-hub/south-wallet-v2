# محفظة الجنوب — South Wallet v2

<div align="center">
  <strong>تطبيق محفظة رقمية متكامل مع لوحة إدارة شاملة</strong><br/>
  <em>Full-featured digital wallet app with comprehensive admin panel</em>
</div>

---

## 📦 هيكل المشروع / Project Structure

```
south-wallet-v2/
├── src/                          # User App (Next.js + Capacitor)
│   ├── app/                      # Next.js App Router pages
│   ├── components/
│   │   ├── fahed/                # Core wallet screens
│   │   ├── jaib/                 # Service screens
│   │   └── ui/                   # Shared UI components
│   ├── hooks/                    # React hooks
│   └── lib/                      # Utilities & Supabase client
├── south-admin/                  # Admin App (Next.js)
│   └── src/
│       ├── app/                  # Admin pages
│       ├── components/admin/     # 50+ admin panels
│       └── lib/                  # Admin utilities & Supabase
├── supabase-migrations/          # PostgreSQL migrations (031 files)
│   └── 031_departments_and_roles.sql   # NEW: Departments & Roles
├── supabase/functions/           # Supabase Edge Functions
│   ├── g2bulk-proxy/             # G2Bulk API proxy
│   ├── manage-balance/           # Balance management
│   ├── process-finance/          # Finance operations
│   ├── process-order/            # Order processing
│   └── send-notification/        # FCM push notifications
└── scripts/                      # Build & sync scripts
```

## 🔗 قاعدة البيانات / Database

- **Provider**: Supabase (PostgreSQL)
- **Project ID**: `kifmxseonkdsxuanznny`
- **URL**: `https://kifmxseonkdsxuanznny.supabase.co`
- **Tables**: 30+ tables covering all wallet operations
- **RLS**: Row-Level Security enabled on all user-facing tables

### جداول رئيسية / Key Tables
| Table | Purpose |
|-------|---------|
| `users` | Wallet user accounts & balances |
| `transactions` | All financial transactions |
| `orders` | Service/product orders |
| `deposit_requests` | Deposit requests & receipts |
| `withdraw_requests` | Withdrawal requests |
| `escrow_transactions` | P2P escrow deals |
| `investments` | Investment plans & holdings |
| `support_tickets` | Customer support |
| `departments` | Admin department structure *(NEW)* |
| `admin_users` | Admin team members *(NEW)* |
| `admin_permissions` | Granular per-module permissions *(NEW)* |

## 🚀 التشغيل / Running the Apps

### تطبيق المستخدم / User App
```bash
cd south-wallet-v2
npm install
npm run dev        # → http://localhost:3000
```

### تطبيق الإدارة / Admin App
```bash
cd south-wallet-v2/south-admin
npm install
npm run dev        # → http://localhost:3001
```

## 📱 بناء APK / Building APK

```bash
# User App APK
cd south-wallet-v2
npm run build
npx cap sync android
npx cap open android
# Then build APK from Android Studio

# Admin App APK
cd south-wallet-v2/south-admin
npm run build
npx cap sync android
npx cap open android
```

## ⚙️ متغيرات البيئة / Environment Variables

Create `.env.local` in both `south-wallet-v2/` and `south-wallet-v2/south-admin/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kifmxseonkdsxuanznny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🗄️ تطبيق Migrations / Applying Migrations

```bash
# Run all migrations against your Supabase project
# Via Supabase Dashboard → SQL Editor → run each file in order
# Or via Supabase CLI:
supabase db push
```

## 🏢 إدارة الأقسام / Department Management (NEW)

The admin app now includes a full **Departments & Roles** panel:

- ✅ Create/edit/delete departments with custom colors & icons
- ✅ Assign admin users to departments
- ✅ Set granular permissions per user per module (view/create/edit/delete/approve)
- ✅ Role hierarchy: Super Admin → Admin → Manager → Supervisor → Employee → Support
- ✅ Real-time member counts per department
- ✅ Activity log for all admin actions

## 🔐 الأدوار / Admin Roles

| Role | Arabic | Access Level |
|------|--------|-------------|
| `super_admin` | مدير عام | Full system access |
| `admin` | مدير | All panels except owner-only |
| `manager` | مشرف قسم | Department-scoped access |
| `supervisor` | مشرف | Supervised access |
| `employee` | موظف | Permission-based access |
| `support` | دعم فني | Support panels only |

## 📡 API Integration

- **G2Bulk**: Digital products provider (games, gift cards, recharge)
- **Supabase Edge Functions**: Serverless order processing
- **Firebase FCM**: Push notifications

## 🛠️ المكتبات / Tech Stack

- **Framework**: Next.js 16 + React 19
- **Mobile**: Capacitor 8 (Android APK)
- **Database**: Supabase (PostgreSQL + RLS + Realtime)
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI + shadcn/ui
- **Animations**: Framer Motion
- **State**: Zustand
- **Forms**: Zod validation

---

<div align="center">
  Supabase Project: <code>kifmxseonkdsxuanznny</code> | Branch: <code>main</code>
</div>
