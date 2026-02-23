
-- Create user_permissions table for granular access control
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins manage permissions" ON public.user_permissions
FOR ALL USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin')
);

-- Users can view their own permissions
CREATE POLICY "Users view own permissions" ON public.user_permissions
FOR SELECT USING (user_id = auth.uid());
