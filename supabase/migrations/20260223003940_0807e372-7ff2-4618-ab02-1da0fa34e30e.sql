
-- A/B Testing columns on campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS ab_test_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_b text,
  ADD COLUMN IF NOT EXISTS ab_test_sample_percent integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS ab_test_wait_hours integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS ab_test_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ab_test_winner text,
  ADD COLUMN IF NOT EXISTS ab_test_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS ab_test_winner_sent_at timestamptz;

-- ab_test_status values: 'none', 'testing', 'winner_selected', 'winner_sent'

COMMENT ON COLUMN public.campaigns.ab_test_sample_percent IS 'Percentage of list used for A/B test (split equally between A and B)';
COMMENT ON COLUMN public.campaigns.ab_test_wait_hours IS 'Hours to wait before evaluating winner';
COMMENT ON COLUMN public.campaigns.ab_test_status IS 'none | testing | winner_selected | winner_sent';
COMMENT ON COLUMN public.campaigns.ab_test_winner IS 'A or B';
