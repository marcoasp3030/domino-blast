import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Plus, Play, Pause } from "lucide-react";
import { TriggerNode } from "@/components/workflows/nodes/TriggerNode";
import { SendEmailNode } from "@/components/workflows/nodes/SendEmailNode";
import { DelayNode } from "@/components/workflows/nodes/DelayNode";
import { ConditionNode } from "@/components/workflows/nodes/ConditionNode";
import { TagNode } from "@/components/workflows/nodes/TagNode";
import { WorkflowStepConfig } from "@/components/workflows/WorkflowStepConfig";
import { WorkflowTriggerConfig } from "@/components/workflows/WorkflowTriggerConfig";
import { AddStepMenu } from "@/components/workflows/AddStepMenu";

const nodeTypes = {
  trigger: TriggerNode,
  send_email: SendEmailNode,
  delay: DelayNode,
  condition: ConditionNode,
  add_tag: TagNode,
  remove_tag: TagNode,
};

export default function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("draft");
  const [triggerType, setTriggerType] = useState("contact_added_to_list");
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);

  // Load workflow
  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Load steps
  const { data: steps = [] } = useQuery({
    queryKey: ["workflow-steps", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Load edges
  const { data: dbEdges = [] } = useQuery({
    queryKey: ["workflow-edges", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_edges")
        .select("*")
        .eq("workflow_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  // Initialize nodes/edges from DB
  useEffect(() => {
    if (!workflow) return;
    setWorkflowName(workflow.name);
    setWorkflowStatus(workflow.status);
    setTriggerType(workflow.trigger_type);
    setTriggerConfig(workflow.trigger_config || {});

    const flowNodes: Node[] = [
      {
        id: "trigger",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: workflow.trigger_type, config: workflow.trigger_config },
        deletable: false,
      },
      ...steps.map((s: any) => ({
        id: s.id,
        type: s.step_type,
        position: { x: s.position_x || 250, y: s.position_y || 150 },
        data: { config: s.config || {}, stepType: s.step_type },
      })),
    ];

    const flowEdges: Edge[] = dbEdges.map((e: any) => ({
      id: e.id,
      source: e.source_step_id === "trigger" ? "trigger" : e.source_step_id,
      target: e.target_step_id,
      sourceHandle: e.source_handle || "default",
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [workflow, steps, dbEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, animated: true, style: { stroke: "hsl(var(--primary))", strokeWidth: 2 } },
          eds
        )
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === "trigger") {
      setShowTriggerConfig(true);
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setShowTriggerConfig(false);
    }
  }, []);

  const addStep = (stepType: string) => {
    const newId = crypto.randomUUID();
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const newNode: Node = {
      id: newId,
      type: stepType,
      position: { x: 250, y: maxY + 120 },
      data: { config: {}, stepType },
    };
    setNodes((nds) => [...nds, newNode]);

    // Auto-connect to last node
    const lastNode = nodes[nodes.length - 1];
    if (lastNode) {
      const newEdge: Edge = {
        id: `e-${lastNode.id}-${newId}`,
        source: lastNode.id,
        target: newId,
        sourceHandle: lastNode.type === "condition" ? "yes" : "default",
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    setShowAddMenu(false);
  };

  // Save workflow
  const saveWorkflow = useMutation({
    mutationFn: async () => {
      // Update workflow metadata
      await supabase.from("workflows").update({
        name: workflowName,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
      }).eq("id", id!);

      // Delete existing steps & edges, then re-insert
      await supabase.from("workflow_edges").delete().eq("workflow_id", id!);
      await supabase.from("workflow_steps").delete().eq("workflow_id", id!);

      // Insert steps (skip trigger node)
      const stepNodes = nodes.filter((n) => n.id !== "trigger");
      if (stepNodes.length > 0) {
        const stepsToInsert = stepNodes.map((n) => ({
          id: n.id,
          workflow_id: id!,
          step_type: n.type!,
          config: n.data?.config || {},
          position_x: n.position.x,
          position_y: n.position.y,
        }));
        const { error: stepErr } = await supabase.from("workflow_steps").insert(stepsToInsert);
        if (stepErr) throw stepErr;
      }

      // Insert edges
      if (edges.length > 0) {
        const edgesToInsert = edges.map((e) => ({
          id: e.id.startsWith("e-") || e.id.startsWith("reactflow") ? crypto.randomUUID() : e.id,
          workflow_id: id!,
          source_step_id: e.source,
          target_step_id: e.target,
          source_handle: e.sourceHandle || "default",
        }));
        const { error: edgeErr } = await supabase.from("workflow_edges").insert(edgesToInsert);
        if (edgeErr) throw edgeErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-steps", id] });
      queryClient.invalidateQueries({ queryKey: ["workflow-edges", id] });
      toast.success("Automação salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = async () => {
    const newStatus = workflowStatus === "active" ? "paused" : "active";
    await supabase.from("workflows").update({ status: newStatus }).eq("id", id!);
    setWorkflowStatus(newStatus);
    queryClient.invalidateQueries({ queryKey: ["workflows"] });
    toast.success(newStatus === "active" ? "Automação ativada!" : "Automação pausada!");
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, config } } : null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[70vh] text-muted-foreground">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/workflows")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="max-w-xs h-8 font-semibold"
        />
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddMenu(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar Step
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleStatus}>
          {workflowStatus === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {workflowStatus === "active" ? "Pausar" : "Ativar"}
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => saveWorkflow.mutate()} disabled={saveWorkflow.isPending}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
      </div>

      {/* Flow editor */}
      <div className="h-[calc(100vh-180px)] rounded-xl border border-border bg-card overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true, style: { stroke: "hsl(var(--primary))", strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--border))" />
          <Controls className="!bg-card !border-border !shadow-lg" />
        </ReactFlow>
      </div>

      {/* Step config sidebar */}
      {selectedNode && (
        <WorkflowStepConfig
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={(config) => updateNodeConfig(selectedNode.id, config)}
          onDelete={() => {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
            setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
            setSelectedNode(null);
          }}
        />
      )}

      {/* Trigger config sidebar */}
      {showTriggerConfig && (
        <WorkflowTriggerConfig
          triggerType={triggerType}
          triggerConfig={triggerConfig}
          onClose={() => setShowTriggerConfig(false)}
          onUpdate={(type, config) => {
            setTriggerType(type);
            setTriggerConfig(config);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === "trigger" ? { ...n, data: { ...n.data, triggerType: type, config } } : n
              )
            );
          }}
        />
      )}

      {/* Add step menu */}
      <AddStepMenu open={showAddMenu} onClose={() => setShowAddMenu(false)} onAdd={addStep} />
    </AppLayout>
  );
}
