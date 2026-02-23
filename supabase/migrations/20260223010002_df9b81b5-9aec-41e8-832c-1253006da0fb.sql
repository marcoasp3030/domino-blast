
-- Add ab_variant column to sends table to track A/B test group membership
ALTER TABLE public.sends ADD COLUMN ab_variant text DEFAULT NULL;

-- Add index for efficient querying by campaign + variant
CREATE INDEX idx_sends_campaign_variant ON public.sends (campaign_id, ab_variant) WHERE ab_variant IS NOT NULL;
