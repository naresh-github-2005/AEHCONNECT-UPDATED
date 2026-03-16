-- FIX: Add Admin User Role
-- Run this SQL in Supabase SQL Editor AFTER running the main migrations
-- This will ensure admin@hospital.com gets admin role

-- IMPORTANT: Replace 'YOUR_ADMIN_USER_ID' with the actual UUID of admin@hospital.com user
-- You can find this in Supabase Dashboard > Authentication > Users

-- Option 1: If you know the admin user's UUID
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR_ADMIN_USER_ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Option 2: Automatic - finds admin@hospital.com and adds admin role
-- This only works if the user already exists in auth.users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@hospital.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Add other demo users as doctors
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'doctor'::app_role
FROM auth.users
WHERE email IN ('doctor@hospital.com', 'fellow@hospital.com', 'pg@hospital.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the roles were created
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('admin@hospital.com', 'doctor@hospital.com', 'fellow@hospital.com', 'pg@hospital.com')
ORDER BY u.email;
