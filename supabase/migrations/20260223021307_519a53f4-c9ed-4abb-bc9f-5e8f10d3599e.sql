
-- Create stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company isolation" ON public.stores FOR ALL
  USING (company_id = get_user_company_id(auth.uid()));

-- Add store_id to contacts
ALTER TABLE public.contacts ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_contacts_store_id ON public.contacts(store_id);
CREATE INDEX idx_stores_company_id ON public.stores(company_id);
