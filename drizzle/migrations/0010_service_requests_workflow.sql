-- Service Requests workflow: Add tracking fields, lifecycle RPCs, and hardened authorization
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON public.service_requests (client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests (created_at DESC);

-- RPC for approving a service request with atomic project creation
CREATE OR REPLACE FUNCTION public.approve_service_request(
  _request_id UUID,
  _assigned_staff_id UUID DEFAULT NULL,
  _admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.service_requests%ROWTYPE;
  v_project_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT * INTO v_request
  FROM public.service_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Service request not found';
  END IF;

  IF v_request.status <> 'Pending' THEN
    RAISE EXCEPTION 'This request has already been processed (current status: %)', v_request.status;
  END IF;

  -- Validate assigned staff member if provided
  IF _assigned_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = _assigned_staff_id
        AND ur.role = 'staff'
        AND (p.approval_status IS NULL OR p.approval_status = 'Approved')
        AND (p.is_active IS NULL OR p.is_active = true)
    ) THEN
      RAISE EXCEPTION 'Selected staff member is not valid or eligible for assignment';
    END IF;
  END IF;

  -- Create corresponding project
  INSERT INTO public.projects (
    project_number,
    title,
    client_id,
    service_id,
    description,
    institution,
    budget,
    deadline,
    assigned_staff_id,
    status
  )
  VALUES (
    '',
    v_request.title,
    v_request.client_id,
    v_request.service_id,
    v_request.details,
    v_request.institution,
    COALESCE(v_request.budget, 0),
    v_request.preferred_deadline,
    _assigned_staff_id,
    'Pending'
  )
  RETURNING id INTO v_project_id;

  -- Update request status
  UPDATE public.service_requests
  SET status = 'Approved',
      project_id = v_project_id,
      approved_by = auth.uid(),
      approved_at = now(),
      processed_by = auth.uid(),
      processed_at = now(),
      admin_note = COALESCE(_admin_note, admin_note),
      updated_at = now()
  WHERE id = _request_id;

  -- Audit log
  INSERT INTO public.activity_log (entity_type, entity_id, action, detail, actor_id)
  VALUES ('service_request', _request_id, 'approved', 'Approved service request: ' || v_request.title, auth.uid());

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'project_id', v_project_id,
    'status', 'Approved',
    'approved_at', now()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_service_request(UUID, UUID, TEXT) TO authenticated;

-- RPC for rejecting a service request with required reason
CREATE OR REPLACE FUNCTION public.reject_service_request(
  _request_id UUID,
  _rejection_reason TEXT,
  _admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.service_requests%ROWTYPE;
  v_clean_reason TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  v_clean_reason := trim(_rejection_reason);
  IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO v_request
  FROM public.service_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Service request not found';
  END IF;

  IF v_request.status <> 'Pending' THEN
    RAISE EXCEPTION 'This request has already been processed (current status: %)', v_request.status;
  END IF;

  UPDATE public.service_requests
  SET status = 'Rejected',
      rejection_reason = v_clean_reason,
      rejected_by = auth.uid(),
      rejected_at = now(),
      processed_by = auth.uid(),
      processed_at = now(),
      admin_note = COALESCE(_admin_note, v_clean_reason),
      updated_at = now()
  WHERE id = _request_id;

  -- Audit log
  INSERT INTO public.activity_log (entity_type, entity_id, action, detail, actor_id)
  VALUES ('service_request', _request_id, 'rejected', 'Rejected service request: ' || v_request.title || '. Reason: ' || v_clean_reason, auth.uid());

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'status', 'Rejected',
    'rejected_at', now(),
    'rejection_reason', v_clean_reason
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.reject_service_request(UUID, TEXT, TEXT) TO authenticated;

-- Hardened RLS policies
DROP POLICY IF EXISTS service_requests_read_approved ON public.service_requests;
CREATE POLICY service_requests_read_approved ON public.service_requests FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR (client_id = public.current_client_id() AND public.is_approved_client()));

DROP POLICY IF EXISTS service_requests_insert_approved ON public.service_requests;
CREATE POLICY service_requests_insert_approved ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_client_id() AND public.is_approved_client() AND status = 'Pending');

DROP POLICY IF EXISTS service_requests_update_approved ON public.service_requests;
CREATE POLICY service_requests_update_approved ON public.service_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow authenticated users to view active staff profiles (for project and assignment visibility)
DROP POLICY IF EXISTS profiles_select_staff_directory ON public.profiles;
CREATE POLICY profiles_select_staff_directory ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = public.profiles.id
          AND ur.role = 'staff'
      )
      AND (approval_status = 'Approved' OR approval_status IS NULL)
      AND is_active = true
    )
  );

