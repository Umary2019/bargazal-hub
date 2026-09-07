-- Normalize legacy client statuses before using the title-case approval workflow.
UPDATE public.clients
SET approval_status = CASE lower(approval_status)
  WHEN 'approved' THEN 'Approved'
  WHEN 'rejected' THEN 'Rejected'
  ELSE 'Pending'
END
WHERE approval_status IS NOT NULL;

UPDATE public.profiles
SET approval_status = CASE lower(approval_status)
  WHEN 'approved' THEN 'Approved'
  WHEN 'rejected' THEN 'Rejected'
  ELSE 'Pending'
END
WHERE approval_status IS NOT NULL;

-- Existing clients with legacy approved status should remain usable.
UPDATE public.profiles p
SET approval_status = c.approval_status,
    is_active = c.approval_status = 'Approved'
FROM public.clients c
WHERE c.auth_user_id = p.id;

-- Staff access must only be granted by an administrator.
REVOKE EXECUTE ON FUNCTION public.finalize_staff_registration(TEXT, TEXT, TEXT) FROM authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'Pending')
  ON CONFLICT (id) DO NOTHING;

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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_client_to_staff(
  _client_id UUID,
  _job_title TEXT DEFAULT 'Staff'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  promoted_user_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT auth_user_id INTO promoted_user_id
  FROM public.clients
  WHERE id = _client_id;

  IF promoted_user_id IS NULL THEN
    RAISE EXCEPTION 'This client does not have a login account';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (promoted_user_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET job_title = NULLIF(trim(_job_title), ''),
      approval_status = 'Approved',
      is_active = true
  WHERE id = promoted_user_id;

  RETURN promoted_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.promote_client_to_staff(UUID, TEXT) TO authenticated;

-- Keep approval status synchronized whenever an administrator approves a client.
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
