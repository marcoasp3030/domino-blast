
-- Add store_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
CREATE INDEX idx_campaigns_store_id ON public.campaigns(store_id);
