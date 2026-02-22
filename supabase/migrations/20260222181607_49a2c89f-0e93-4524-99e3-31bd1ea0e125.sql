
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'marketing', 'readonly');

-- Enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'completed', 'paused', 'error');

-- Enum for domain verification status
CREATE TYPE public.domain_status AS ENUM ('pending', 'validating', 'validated', 'error');

-- Enum for contact status
CREATE TYPE public.contact_status AS ENUM ('active', 'inactive', 'unsubscribed', 'bounced');

-- Enum for send status
CREATE TYPE public.send_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- Enum for event types
CREATE TYPE public.event_type AS ENUM ('delivered', 'open', 'click', 'bounce', 'spam', 'unsubscribe', 'dropped');

-- ===================== COMPANIES =====================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ===================== PROFILES =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===================== USER ROLES =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'marketing',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===================== DOMAINS =====================
CREATE TABLE public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  spf_status domain_status NOT NULL DEFAULT 'pending',
  dkim_status domain_status NOT NULL DEFAULT 'pending',
  dmarc_status domain_status NOT NULL DEFAULT 'pending',
  overall_status domain_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- ===================== SENDERS =====================
CREATE TABLE public.senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;

-- ===================== CONTACTS =====================
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  status contact_status NOT NULL DEFAULT 'active',
  origin TEXT,
  lgpd_consent BOOLEAN DEFAULT false,
  lgpd_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ===================== TAGS =====================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  UNIQUE (company_id, name)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- ===================== CONTACT TAGS =====================
CREATE TABLE public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE (contact_id, tag_id)
);
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- ===================== LISTS =====================
CREATE TABLE public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'static', -- 'static' or 'dynamic'
  filter_criteria JSONB, -- for dynamic lists
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- ===================== LIST MEMBERS =====================
CREATE TABLE public.list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, contact_id)
);
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

-- ===================== TEMPLATES =====================
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'newsletter',
  html_content TEXT,
  design_json JSONB,
  preview_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ===================== CAMPAIGNS =====================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  preheader TEXT,
  sender_id UUID REFERENCES public.senders(id),
  template_id UUID REFERENCES public.email_templates(id),
  list_id UUID REFERENCES public.lists(id),
  status campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT DEFAULT 'email',
  utm_campaign TEXT,
  batch_size INTEGER DEFAULT 500,
  batch_delay_seconds INTEGER DEFAULT 60,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- ===================== SENDS =====================
CREATE TABLE public.sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  sendgrid_message_id TEXT,
  status send_status NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sends ENABLE ROW LEVEL SECURITY;

-- ===================== EVENTS =====================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES public.sends(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  sendgrid_message_id TEXT,
  url TEXT, -- for click events
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Index for fast event lookups
CREATE INDEX idx_events_campaign ON public.events(campaign_id);
CREATE INDEX idx_events_contact ON public.events(contact_id);
CREATE INDEX idx_events_company ON public.events(company_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_sends_campaign ON public.sends(campaign_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- ===================== SUPPRESSIONS =====================
CREATE TABLE public.suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);
ALTER TABLE public.suppressions ENABLE ROW LEVEL SECURITY;

-- ===================== AUDIT LOG =====================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ===================== SECURITY DEFINER FUNCTIONS =====================

-- Get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- ===================== RLS POLICIES =====================

-- Companies: users can only see their own company
CREATE POLICY "Users view own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins update own company" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users view own company profiles" ON public.profiles
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- All company-scoped tables use same pattern
CREATE POLICY "Company isolation" ON public.domains
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.senders
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.contacts
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.tags
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.lists
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.email_templates
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.campaigns
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.events
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.suppressions
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Company isolation" ON public.audit_log
  FOR ALL USING (company_id = public.get_user_company_id(auth.uid()));

-- Contact tags: via contact's company
CREATE POLICY "Contact tags via contact" ON public.contact_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id AND c.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- List members: via list's company
CREATE POLICY "List members via list" ON public.list_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_id AND l.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- Sends: via campaign's company
CREATE POLICY "Sends via campaign" ON public.sends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- ===================== UPDATED_AT TRIGGER =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON public.domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lists_updated_at BEFORE UPDATE ON public.lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
