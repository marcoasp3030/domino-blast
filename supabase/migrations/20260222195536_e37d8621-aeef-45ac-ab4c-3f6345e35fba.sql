
CREATE OR REPLACE FUNCTION public.get_event_counts(_company_id uuid)
RETURNS TABLE (
  event_type text,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.event_type::text, COUNT(*) as count
  FROM public.events e
  WHERE e.company_id = _company_id
  GROUP BY e.event_type;
$$;
