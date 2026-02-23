
-- Add engagement score columns to contacts
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS engagement_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_updated_at timestamp with time zone;

-- Create index for score queries
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON public.contacts(engagement_score DESC);

-- Function to calculate engagement score for a single contact
-- Score formula:
--   click = 5pts, open = 2pts, delivered = 1pt
--   Recency multiplier: events in last 7d = 3x, 30d = 2x, 90d = 1x, older = 0.5x
--   Negative: bounce = -10, spam = -20, unsubscribe = -30
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(_contact_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_score numeric := 0;
  ev RECORD;
  base_pts numeric;
  recency_mult numeric;
  days_ago numeric;
BEGIN
  FOR ev IN
    SELECT event_type, timestamp
    FROM events
    WHERE contact_id = _contact_id
    ORDER BY timestamp DESC
    LIMIT 200
  LOOP
    -- Base points by event type
    CASE ev.event_type
      WHEN 'click' THEN base_pts := 5;
      WHEN 'open' THEN base_pts := 2;
      WHEN 'delivered' THEN base_pts := 1;
      WHEN 'bounce' THEN base_pts := -10;
      WHEN 'spam' THEN base_pts := -20;
      WHEN 'unsubscribe' THEN base_pts := -30;
      WHEN 'dropped' THEN base_pts := -5;
      ELSE base_pts := 0;
    END CASE;

    -- Recency multiplier (only for positive events)
    IF base_pts > 0 THEN
      days_ago := EXTRACT(EPOCH FROM (now() - ev.timestamp)) / 86400;
      IF days_ago <= 7 THEN recency_mult := 3;
      ELSIF days_ago <= 30 THEN recency_mult := 2;
      ELSIF days_ago <= 90 THEN recency_mult := 1;
      ELSE recency_mult := 0.5;
      END IF;
      total_score := total_score + (base_pts * recency_mult);
    ELSE
      total_score := total_score + base_pts;
    END IF;
  END LOOP;

  -- Clamp between 0 and 100
  RETURN GREATEST(0, LEAST(100, ROUND(total_score)));
END;
$$;

-- Function to recalculate scores for all contacts of a company
CREATE OR REPLACE FUNCTION public.recalculate_company_scores(_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contact RECORD;
  updated_count integer := 0;
  new_score integer;
BEGIN
  FOR contact IN
    SELECT id FROM contacts WHERE company_id = _company_id AND status = 'active'
  LOOP
    new_score := calculate_engagement_score(contact.id);
    UPDATE contacts SET engagement_score = new_score, score_updated_at = now() WHERE id = contact.id;
    updated_count := updated_count + 1;
  END LOOP;
  RETURN updated_count;
END;
$$;
