
CREATE OR REPLACE FUNCTION public.get_campaign_performance(_company_id uuid)
RETURNS TABLE(
  campaign_id uuid,
  campaign_name text,
  sent_at timestamptz,
  total_recipients integer,
  delivered bigint,
  opens bigint,
  clicks bigint,
  bounces bigint,
  spam bigint,
  unsubscribes bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.sent_at,
    COALESCE(c.total_recipients, 0) AS total_recipients,
    COALESCE(SUM(CASE WHEN e.event_type = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered,
    COALESCE(SUM(CASE WHEN e.event_type = 'open' THEN 1 ELSE 0 END), 0) AS opens,
    COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0) AS clicks,
    COALESCE(SUM(CASE WHEN e.event_type = 'bounce' THEN 1 ELSE 0 END), 0) AS bounces,
    COALESCE(SUM(CASE WHEN e.event_type = 'spam' THEN 1 ELSE 0 END), 0) AS spam,
    COALESCE(SUM(CASE WHEN e.event_type = 'unsubscribe' THEN 1 ELSE 0 END), 0) AS unsubscribes
  FROM public.campaigns c
  LEFT JOIN public.events e ON e.campaign_id = c.id
  WHERE c.company_id = _company_id
    AND c.status = 'completed'
  GROUP BY c.id, c.name, c.sent_at, c.total_recipients
  ORDER BY c.sent_at DESC NULLS LAST
  LIMIT 20;
$$;
