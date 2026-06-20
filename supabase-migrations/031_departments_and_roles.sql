-- ============================================================
-- Migration 031: Departments, Admin Roles & User Management
-- Full departmental structure for admin control
-- ============================================================

-- ── Table: departments ──
CREATE TABLE IF NOT EXISTS public.departments (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    name_en text DEFAULT '',
    description text DEFAULT '',
    color text DEFAULT '#5C1A1B',
    icon text DEFAULT 'building',
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Table: admin_users ──
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    display_name text NOT NULL,
    avatar_url text DEFAULT '',
    role text NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'manager', 'supervisor', 'employee', 'support')),
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Table: admin_permissions ──
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    module text NOT NULL,
    can_view boolean NOT NULL DEFAULT false,
    can_create boolean NOT NULL DEFAULT false,
    can_edit boolean NOT NULL DEFAULT false,
    can_delete boolean NOT NULL DEFAULT false,
    can_approve boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(admin_user_id, module)
);

-- ── Table: admin_activity_log ──
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_email text,
    action text NOT NULL,
    module text NOT NULL,
    entity_id text,
    entity_type text,
    description text,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_admin_users_dept ON public.admin_users(department_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON public.admin_permissions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON public.admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON public.admin_activity_log(created_at DESC);

-- ── RLS Policies ──
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (admin app uses service_role key)
CREATE POLICY "service_role_full_departments" ON public.departments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_admin_users" ON public.admin_users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_admin_permissions" ON public.admin_permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_full_admin_activity" ON public.admin_activity_log
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Seed default departments ──
INSERT INTO public.departments (name, name_en, description, color, icon, sort_order) VALUES
    ('الإدارة العليا', 'Top Management', 'مدراء ومسؤولو النظام', '#5C1A1B', 'crown', 0),
    ('العمليات المالية', 'Financial Operations', 'إدارة الإيداعات والسحوبات والمعاملات', '#2563EB', 'banknote', 1),
    ('دعم العملاء', 'Customer Support', 'التذاكر والشكاوى والدردشة المباشرة', '#059669', 'headset', 2),
    ('تقنية المعلومات', 'IT & Technical', 'إدارة النظام والـ API والتقنيات', '#7C3AED', 'cpu', 3),
    ('التسويق', 'Marketing', 'البنرات والعروض الترويجية والمحتوى', '#D97706', 'megaphone', 4),
    ('خدمات المنتجات', 'Product Services', 'إدارة الخدمات والمنتجات والموردين', '#0891B2', 'package', 5),
    ('الامتثال والأمن', 'Compliance & Security', 'KYC ومراجعة الهوية والأمان', '#DC2626', 'shield', 6)
ON CONFLICT DO NOTHING;

-- ── Function: get department stats ──
CREATE OR REPLACE FUNCTION public.get_department_stats()
RETURNS TABLE(
    department_id uuid,
    department_name text,
    total_members bigint,
    active_members bigint
) LANGUAGE sql STABLE AS $$
    SELECT
        d.id,
        d.name,
        COUNT(au.id) AS total_members,
        COUNT(au.id) FILTER (WHERE au.is_active = true) AS active_members
    FROM departments d
    LEFT JOIN admin_users au ON au.department_id = d.id
    GROUP BY d.id, d.name
    ORDER BY d.sort_order;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.get_department_stats() TO service_role;
GRANT ALL ON public.departments TO service_role;
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.admin_permissions TO service_role;
GRANT ALL ON public.admin_activity_log TO service_role;
