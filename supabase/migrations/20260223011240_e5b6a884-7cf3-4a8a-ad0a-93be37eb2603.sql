
-- ══════════════════════════════════════════════
-- Trigger functions to start workflows automatically
-- ══════════════════════════════════════════════

-- Function: when a contact is added to a list, check for matching workflows
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_list_member()
RETURNS TRIGGER AS $$
DECLARE
  _workflow RECORD;
  _contact_company_id UUID;
BEGIN
  -- Get the contact's company
  SELECT company_id INTO _contact_company_id FROM public.contacts WHERE id = NEW.contact_id;
  
  -- Find active workflows with trigger_type = 'contact_added_to_list' and matching list_id
  FOR _workflow IN
    SELECT id FROM public.workflows
    WHERE status = 'active'
      AND trigger_type = 'contact_added_to_list'
      AND company_id = _contact_company_id
      AND (trigger_config->>'list_id' = NEW.list_id::text OR trigger_config->>'list_id' IS NULL)
  LOOP
    -- Call start-workflow edge function via pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/start-workflow',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('workflow_id', _workflow.id, 'contact_id', NEW.contact_id)
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if workflow trigger fails
  RAISE WARNING 'Workflow trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: when a tag is added to a contact, check for matching workflows
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_tag_added()
RETURNS TRIGGER AS $$
DECLARE
  _workflow RECORD;
  _contact_company_id UUID;
BEGIN
  SELECT company_id INTO _contact_company_id FROM public.contacts WHERE id = NEW.contact_id;
  
  FOR _workflow IN
    SELECT id FROM public.workflows
    WHERE status = 'active'
      AND trigger_type = 'tag_added'
      AND company_id = _contact_company_id
      AND (trigger_config->>'tag_id' = NEW.tag_id::text OR trigger_config->>'tag_id' IS NULL)
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/start-workflow',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('workflow_id', _workflow.id, 'contact_id', NEW.contact_id)
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Workflow trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: when a campaign event occurs, check for matching workflows
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_campaign_event()
RETURNS TRIGGER AS $$
DECLARE
  _workflow RECORD;
BEGIN
  IF NEW.contact_id IS NULL OR NEW.campaign_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  FOR _workflow IN
    SELECT id FROM public.workflows
    WHERE status = 'active'
      AND trigger_type = 'campaign_event'
      AND company_id = NEW.company_id
      AND trigger_config->>'campaign_id' = NEW.campaign_id::text
      AND trigger_config->>'event_type' = NEW.event_type::text
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/start-workflow',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('workflow_id', _workflow.id, 'contact_id', NEW.contact_id)
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Workflow trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the triggers
CREATE TRIGGER trg_workflow_list_member
  AFTER INSERT ON public.list_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_on_list_member();

CREATE TRIGGER trg_workflow_tag_added
  AFTER INSERT ON public.contact_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_on_tag_added();

CREATE TRIGGER trg_workflow_campaign_event
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_on_campaign_event();
