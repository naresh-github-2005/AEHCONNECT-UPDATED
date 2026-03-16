# Admin Login Fix - Quick Checklist

## ✅ Follow these steps in order:

### 1️⃣ Create Admin Account
- [ ] Go to http://localhost:8081
- [ ] Click "Create Account" (not "Sign In")
- [ ] Enter email: `admin@hospital.com`
- [ ] Enter password: `admin123`
- [ ] Click "Create Account"
- [ ] ✅ Account created!

### 2️⃣ Add Admin Role in Database
- [ ] Go to Supabase Dashboard
- [ ] Click "SQL Editor" in sidebar
- [ ] Click "New Query"
- [ ] Copy and paste this SQL:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'admin@hospital.com'
ON CONFLICT (user_id, role) DO NOTHING;

SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@hospital.com';
```

- [ ] Click "Run" button
- [ ] Check output shows: `admin@hospital.com` | `admin`
- [ ] ✅ Admin role added!

### 3️⃣ Test Admin Login
- [ ] Go back to app: http://localhost:8081
- [ ] If logged in, click "Sign Out"
- [ ] Click "Admin Demo" button (auto-fills credentials)
- [ ] Click "Sign In"
- [ ] Check URL - should be `/dashboard`
- [ ] Check page title - should say "Dashboard" with admin view
- [ ] ✅ Admin login works!

---

## 🔧 Troubleshooting

### Problem: "User already registered"
**Solution**: Skip step 1, go directly to step 2

### Problem: "No rows returned" in step 2
**Solution**: The user doesn't exist yet. Go back to step 1 first.

### Problem: Still goes to Doctor Dashboard
**Solution**: 
1. Clear browser cache
2. Sign out completely
3. Close browser
4. Reopen and try again

### Problem: SQL Error "permission denied"
**Solution**: Make sure you're running the SQL in Supabase SQL Editor (not locally)

---

## 📝 Notes

- The admin role is stored in the `user_roles` table
- Without this role, everyone defaults to "doctor"
- You only need to do this ONCE per user
- The same process works for other users (just change the email)

---

## ✅ Done!

Once all checkboxes are checked, admin login should work perfectly!
