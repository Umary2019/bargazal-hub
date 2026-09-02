-- Run this in Supabase SQL Editor after creating the auth user
-- Replace the UUID with the real auth.users.id for the admin account

INSERT INTO public.profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'System Administrator')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow admins to manage roles and profiles
CREATE POLICY "admin_manage_profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_manage_user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Optional: allow admins to update a user's profile name and email
CREATE POLICY "admin_manage_own_profile_only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Quick role assignment example for another user
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('OTHER_USER_UUID', 'staff')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- To remove a role:
-- DELETE FROM public.user_roles
-- WHERE user_id = 'OTHER_USER_UUID' AND role = 'staff';
