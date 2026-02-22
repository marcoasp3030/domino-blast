
CREATE OR REPLACE FUNCTION public.get_event_timeline(_company_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(day date, event_type text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    DATE(e.timestamp) AS day,
    e.event_type::text,
    COUNT(*) AS count
  FROM public.events e
  WHERE e.company_id = _company_id
    AND e.timestamp >= (CURRENT_DATE - _days)
  GROUP BY day, e.event_type
  ORDER BY day;
$$;
