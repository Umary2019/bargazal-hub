-- ====================================================================
-- Migration 0014: Complete Project Lifecycle, Revisions, Deliverables,
-- Client Communication, In-App Notifications & Approval Synchronization
-- 100% idempotent and production-safe
-- ====================================================================

-- 1. Create project_revisions table for structured revision requests and history
CREATE TABLE IF NOT EXISTS public.project_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Closed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_revisions_project_id ON public.project_revisions (project_id);
CREATE INDEX IF NOT EXISTS idx_project_revisions_client_id ON public.project_revisions (client_id);
ALTER TABLE public.project_revisions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.project_revisions TO authenticated;
GRANT ALL ON public.project_revisions TO service_role;

DROP POLICY IF EXISTS project_revisions_staff ON public.project_revisions;
CREATE POLICY project_revisions_staff ON public.project_revisions FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS project_revisions_client_read ON public.project_revisions;
CREATE POLICY project_revisions_client_read ON public.project_revisions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS project_revisions_client_insert ON public.project_revisions;
CREATE POLICY project_revisions_client_insert ON public.project_revisions FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND c.auth_user_id = auth.uid()
    )
  );

-- 2. Create project_messages table for project communications & clarification
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'staff', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON public.project_messages (project_id, created_at ASC);
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;

DROP POLICY IF EXISTS project_messages_staff ON public.project_messages;
CREATE POLICY project_messages_staff ON public.project_messages FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS project_messages_client_read ON public.project_messages;
CREATE POLICY project_messages_client_read ON public.project_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = project_id AND c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS project_messages_client_insert ON public.project_messages;
CREATE POLICY project_messages_client_insert ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.client_id
      WHERE p.id = project_id AND c.auth_user_id = auth.uid()
    )
  );

-- 3. Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'request', 'project', 'invoice', 'payment', 'revision')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON public.notifications (user_id, is_read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS notifications_owner_access ON public.notifications;
CREATE POLICY notifications_owner_access ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Enable clients to view project_files and project_tasks for their own projects
DROP POLICY IF EXISTS project_files_client_read ON public.project_files;
CREATE POLICY project_files_client_read ON public.project_files FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = project_id AND c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS project_tasks_client_read ON public.project_tasks;
CREATE POLICY project_tasks_client_read ON public.project_tasks FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.clients c ON c.id = p.client_id
    WHERE p.id = project_id AND c.auth_user_id = auth.uid()
  ));

-- 5. Storage RLS: Allow clients to download files from business-files bucket for their projects
DROP POLICY IF EXISTS "business_files_read_client" ON storage.objects;
CREATE POLICY "business_files_read_client" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'business-files' AND (
      public.is_staff_or_admin() OR
      EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.clients c ON c.id = p.client_id
        WHERE c.auth_user_id = auth.uid()
          AND (storage.foldername(name))[1] = p.id::text
      )
    )
  );

-- 6. Enable clients to view quotations addressed to them
DROP POLICY IF EXISTS quotes_client_read ON public.quotes;
CREATE POLICY quotes_client_read ON public.quotes FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS quote_items_client_read ON public.quote_items;
CREATE POLICY quote_items_client_read ON public.quote_items FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR EXISTS (
    SELECT 1 FROM public.quotes q
    JOIN public.clients c ON c.id = q.client_id
    WHERE q.id = quote_id AND c.auth_user_id = auth.uid()
  ));

-- 7. Bidirectional approval synchronization between public.clients and public.profiles
CREATE OR REPLACE FUNCTION public.sync_client_profile_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET approval_status = NEW.approval_status,
        is_active = (NEW.approval_status = 'Approved')
    WHERE id = NEW.auth_user_id
      AND (approval_status IS DISTINCT FROM NEW.approval_status OR is_active IS DISTINCT FROM (NEW.approval_status = 'Approved'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_profile_approval ON public.clients;
CREATE TRIGGER trg_sync_client_profile_approval
AFTER INSERT OR UPDATE OF approval_status, auth_user_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.sync_client_profile_approval();

-- 8. Hardened approve_client RPC ensuring both clients and profiles are updated
CREATE OR REPLACE FUNCTION public.approve_client(_client_id UUID, _approved BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_status TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  v_status := CASE WHEN _approved THEN 'Approved' ELSE 'Rejected' END;

  UPDATE public.clients
  SET approval_status = v_status
  WHERE id = _client_id
  RETURNING auth_user_id INTO v_auth_user_id;

  IF v_auth_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET approval_status = v_status,
        is_active = _approved
    WHERE id = v_auth_user_id;

    -- Send in-app notification to the client
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_auth_user_id,
      CASE WHEN _approved THEN 'Account Approved' ELSE 'Registration Status Update' END,
      CASE WHEN _approved THEN 'Your client account has been approved by the administrator. You now have full access to services and projects.' ELSE 'Your registration was not approved. Please contact support.' END,
      CASE WHEN _approved THEN 'success' ELSE 'warning' END,
      '/dashboard'
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_client(UUID, BOOLEAN) TO authenticated;

-- 9. RPC: Client accepts project delivery
CREATE OR REPLACE FUNCTION public.accept_project_delivery(_project_id UUID, _feedback TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_title TEXT;
  v_staff_id UUID;
BEGIN
  SELECT p.client_id, p.title, p.assigned_staff_id
  INTO v_client_id, v_title, v_staff_id
  FROM public.projects p
  JOIN public.clients c ON c.id = p.client_id
  WHERE p.id = _project_id AND c.auth_user_id = auth.uid();

  IF v_client_id IS NULL AND NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'You do not have permission to accept delivery for this project';
  END IF;

  UPDATE public.projects
  SET status = 'Completed'::public.project_status,
      progress = 100,
      updated_at = now()
  WHERE id = _project_id;

  -- Mark any pending revisions as Resolved
  UPDATE public.project_revisions
  SET status = 'Resolved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
  WHERE project_id = _project_id AND status IN ('Pending', 'In Progress');

  -- Log audit activity
  INSERT INTO public.activity_log (entity_type, entity_id, action, detail, actor_id)
  VALUES ('project', _project_id, 'delivery_accepted', COALESCE(_feedback, 'Client accepted delivery and completed project'), auth.uid());

  -- Notify assigned staff if present
  IF v_staff_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_staff_id,
      'Project Completed',
      'The client has accepted delivery for project "' || COALESCE(v_title, 'Project') || '".',
      'success',
      '/projects/' || _project_id::text
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_project_delivery(UUID, TEXT) TO authenticated;

-- 10. RPC: Client requests project revision
CREATE OR REPLACE FUNCTION public.request_project_revision(_project_id UUID, _reason TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_title TEXT;
  v_staff_id UUID;
  v_rev_id UUID;
BEGIN
  SELECT p.client_id, p.title, p.assigned_staff_id
  INTO v_client_id, v_title, v_staff_id
  FROM public.projects p
  JOIN public.clients c ON c.id = p.client_id
  WHERE p.id = _project_id AND c.auth_user_id = auth.uid();

  IF v_client_id IS NULL AND NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'You do not have permission to request a revision for this project';
  END IF;

  IF trim(COALESCE(_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required for revision requests';
  END IF;

  -- Insert revision request record
  INSERT INTO public.project_revisions (project_id, client_id, requested_by, reason, status)
  VALUES (_project_id, v_client_id, auth.uid(), trim(_reason), 'Pending')
  RETURNING id INTO v_rev_id;

  -- Update project status to Client Review
  UPDATE public.projects
  SET status = 'Client Review'::public.project_status,
      updated_at = now()
  WHERE id = _project_id;

  -- Log audit activity
  INSERT INTO public.activity_log (entity_type, entity_id, action, detail, actor_id)
  VALUES ('project', _project_id, 'revision_requested', trim(_reason), auth.uid());

  -- Notify assigned staff
  IF v_staff_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_staff_id,
      'Revision Requested',
      'A revision has been requested for project "' || COALESCE(v_title, 'Project') || '": ' || substring(_reason from 1 for 100),
      'revision',
      '/projects/' || _project_id::text
    );
  END IF;

  RETURN v_rev_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_project_revision(UUID, TEXT) TO authenticated;

-- 11. RPC: Staff/Admin resolves or updates revision request
CREATE OR REPLACE FUNCTION public.resolve_project_revision(_revision_id UUID, _status TEXT, _notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rev public.project_revisions%ROWTYPE;
  v_client_user_id UUID;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Staff or admin access required';
  END IF;

  SELECT * INTO v_rev FROM public.project_revisions WHERE id = _revision_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision request not found'; END IF;

  UPDATE public.project_revisions
  SET status = _status,
      admin_notes = COALESCE(_notes, admin_notes),
      resolved_at = CASE WHEN _status IN ('Resolved', 'Closed') THEN now() ELSE resolved_at END,
      resolved_by = CASE WHEN _status IN ('Resolved', 'Closed') THEN auth.uid() ELSE resolved_by END,
      updated_at = now()
  WHERE id = _revision_id;

  -- If marked Resolved, notify the client
  SELECT auth_user_id INTO v_client_user_id FROM public.clients WHERE id = v_rev.client_id;
  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_client_user_id,
      'Revision Updated',
      'Your revision request has been marked ' || _status || ': ' || COALESCE(_notes, 'Updated deliverables are ready for your review.'),
      'project',
      '/dashboard'
    );
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_project_revision(UUID, TEXT, TEXT) TO authenticated;

-- 12. RPC: Post a project message
CREATE OR REPLACE FUNCTION public.post_project_message(_project_id UUID, _message TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_role TEXT;
  v_sender_name TEXT;
  v_msg_id UUID;
  v_client_user_id UUID;
  v_staff_id UUID;
  v_project_title TEXT;
BEGIN
  IF trim(COALESCE(_message, '')) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;

  -- Determine sender role and name
  IF public.is_admin() THEN
    v_sender_role := 'admin';
  ELSIF public.is_staff_or_admin() THEN
    v_sender_role := 'staff';
  ELSE
    v_sender_role := 'client';
  END IF;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = auth.uid();
  IF v_sender_name IS NULL OR v_sender_name = '' THEN
    SELECT full_name INTO v_sender_name FROM public.clients WHERE auth_user_id = auth.uid();
  END IF;
  v_sender_name := COALESCE(v_sender_name, 'User');

  -- Verify project exists and caller has access
  SELECT p.title, p.assigned_staff_id, c.auth_user_id
  INTO v_project_title, v_staff_id, v_client_user_id
  FROM public.projects p
  JOIN public.clients c ON c.id = p.client_id
  WHERE p.id = _project_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;

  IF v_sender_role = 'client' AND v_client_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to post in this project';
  END IF;

  INSERT INTO public.project_messages (project_id, sender_id, sender_name, sender_role, message)
  VALUES (_project_id, auth.uid(), v_sender_name, v_sender_role, trim(_message))
  RETURNING id INTO v_msg_id;

  -- Send notification to recipient
  IF v_sender_role = 'client' AND v_staff_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_staff_id,
      'New Client Message',
      v_sender_name || ' posted a message on "' || COALESCE(v_project_title, 'Project') || '".',
      'project',
      '/projects/' || _project_id::text
    );
  ELSIF v_sender_role IN ('staff', 'admin') AND v_client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_client_user_id,
      'Project Update Message',
      v_sender_name || ' sent an update on your project.',
      'project',
      '/dashboard'
    );
  END IF;

  RETURN v_msg_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_project_message(UUID, TEXT) TO authenticated;

-- 13. RPC: Client cancels pending service request
CREATE OR REPLACE FUNCTION public.cancel_service_request(_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_requests sr
  SET status = 'Rejected',
      admin_notes = COALESCE(admin_notes || ' ', '') || '[Cancelled by client on ' || CURRENT_DATE::text || ']',
      updated_at = now()
  FROM public.clients c
  WHERE sr.id = _request_id
    AND sr.client_id = c.id
    AND c.auth_user_id = auth.uid()
    AND sr.status = 'Pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request cannot be cancelled (must be in Pending status and belong to you)';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_service_request(UUID) TO authenticated;

-- 14. RPC: Client accepts or rejects quotation
CREATE OR REPLACE FUNCTION public.respond_to_quote(_quote_id UUID, _accept BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  v_new_status := CASE WHEN _accept THEN 'Accepted' ELSE 'Rejected' END;

  UPDATE public.quotes q
  SET status = v_new_status,
      updated_at = now()
  FROM public.clients c
  WHERE q.id = _quote_id
    AND q.client_id = c.id
    AND c.auth_user_id = auth.uid()
    AND q.status IN ('Draft', 'Sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation cannot be updated (must be Sent or Draft and belong to your account)';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_to_quote(UUID, BOOLEAN) TO authenticated;
