
-- ══════════════════════════════════════════════
-- Workflows / Automations tables
-- ══════════════════════════════════════════════

-- Workflow definitions
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'contact_added_to_list',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow steps (nodes in the visual editor)
CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('send_email', 'delay', 'condition', 'add_tag', 'remove_tag')),
  config JSONB DEFAULT '{}'::jsonb,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Connections between steps (edges in the visual editor)
CREATE TABLE public.workflow_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  source_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  target_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  source_handle TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow executions (one per contact entering a workflow)
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Execution step log (tracks each step's execution)
CREATE TABLE public.workflow_execution_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'completed', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflows_company ON public.workflows(company_id);
CREATE INDEX idx_workflow_steps_workflow ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_edges_workflow ON public.workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status) WHERE status = 'running';
CREATE INDEX idx_workflow_execution_steps_status ON public.workflow_execution_steps(status) WHERE status IN ('pending', 'waiting');
CREATE UNIQUE INDEX idx_workflow_execution_unique ON public.workflow_executions(workflow_id, contact_id) WHERE status = 'running';

-- RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_steps ENABLE ROW LEVEL SECURITY;

-- Policies for workflows
CREATE POLICY "Users can view own company workflows"
  ON public.workflows FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create workflows for own company"
  ON public.workflows FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own company workflows"
  ON public.workflows FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own company workflows"
  ON public.workflows FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Policies for workflow_steps (via workflow ownership)
CREATE POLICY "Users can manage steps of own workflows"
  ON public.workflow_steps FOR ALL
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

-- Policies for workflow_edges
CREATE POLICY "Users can manage edges of own workflows"
  ON public.workflow_edges FOR ALL
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

-- Policies for workflow_executions
CREATE POLICY "Users can view executions of own workflows"
  ON public.workflow_executions FOR ALL
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

-- Policies for workflow_execution_steps
CREATE POLICY "Users can view execution steps of own workflows"
  ON public.workflow_execution_steps FOR ALL
  USING (execution_id IN (
    SELECT id FROM public.workflow_executions WHERE workflow_id IN (
      SELECT id FROM public.workflows WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  ));

-- Updated at trigger
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for workflow_executions
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
