-- Self-registration for staff and clients with explicit administrator approval.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected'));

-- Existing accounts, including the initial administrator, remain usable.
UPDATE public.profiles
SET approval_status = 'Approved'
WHERE approval_status IS NULL OR approval_status = 'Pending';
UPDATE public.profiles p
SET approval_status = c.approval_status
FROM public.clients c
WHERE c.auth_user_id = p.id AND c.approval_status <> 'Approved';

CREATE OR REPLACE FUNCTION public.finalize_staff_registration(
  _full_name TEXT,
  _phone TEXT,
  _job_title TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_id UUID := auth.uid();
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (profile_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET full_name = _full_name,
      phone = _phone,
      job_title = _job_title,
      approval_status = 'Pending',
      is_active = true
  WHERE id = profile_id;

  RETURN profile_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finalize_staff_registration(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_staff(_user_id UUID, _approved BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.profiles
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END,
      is_active = _approved
  WHERE id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_staff(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_client(_client_id UUID, _approved BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.clients
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END
  WHERE id = _client_id;

  UPDATE public.profiles p
  SET approval_status = CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END,
      is_active = _approved
  FROM public.clients c
  WHERE c.id = _client_id AND p.id = c.auth_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_client(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'Pending')
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data->>'account_type' = 'staff' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles
    SET phone = NEW.raw_user_meta_data->>'phone',
        job_title = NEW.raw_user_meta_data->>'job_title'
    WHERE id = NEW.id;
  ELSIF NEW.raw_user_meta_data->>'account_type' = 'client' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.clients (auth_user_id, full_name, email, phone, address, city, state, approval_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'city',
      NEW.raw_user_meta_data->>'state',
      'Pending'
    )
    ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
