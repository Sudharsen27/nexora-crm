"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Copy,
  Pause,
  Play,
  Redo2,
  Save,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  PALETTE_ITEMS,
  createPaletteNode,
  workflowNodeTypes,
} from "@/components/workflows/workflow-node";
import type { WorkflowDefinition } from "@/lib/api/workflows";
import { cn } from "@/lib/utils";

interface WorkflowBuilderProps {
  initialName: string;
  initialDescription?: string;
  initialTrigger: string;
  initialDefinition?: WorkflowDefinition;
  triggers: string[];
  actions: string[];
  readOnly?: boolean;
  onSave: (data: {
    name: string;
    description: string;
    trigger_type: string;
    definition: WorkflowDefinition;
  }) => Promise<void>;
  onPublish?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  status?: string;
}

function toDefinition(nodes: Node[], edges: Edge[]): WorkflowDefinition {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type ?? "action",
      position: n.position,
      data: n.data as Record<string, unknown>,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof e.label === "string" ? e.label : null,
    })),
  };
}

function fromDefinition(definition?: WorkflowDefinition): { nodes: Node[]; edges: Edge[] } {
  if (!definition?.nodes?.length) {
    return {
      nodes: [createPaletteNode("trigger", 0) as Node],
      edges: [],
    };
  }
  return {
    nodes: definition.nodes.map((n) => ({ ...n, type: n.type, data: n.data })) as Node[],
    edges: definition.edges.map((e) => ({ ...e, id: e.id })) as Edge[],
  };
}

function BuilderCanvas({
  initialName,
  initialDescription = "",
  initialTrigger,
  initialDefinition,
  triggers,
  actions,
  readOnly,
  onSave,
  onPublish,
  onDuplicate,
  onPause,
  onResume,
  status,
}: WorkflowBuilderProps) {
  const initial = fromDefinition(initialDefinition);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [triggerType, setTriggerType] = useState(initialTrigger);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const futureRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (historyRef.current.length > 30) historyRef.current.shift();
    futureRef.current = [];
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current.push({ nodes, edges });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({ nodes, edges });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory();
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [pushHistory, setEdges],
  );

  const addNode = (type: string) => {
    pushHistory();
    const node = createPaletteNode(type, nodes.length) as Node;
    setNodes((nds) => [...nds, node]);
  };

  const updateSelectedNode = (patch: Record<string, unknown>) => {
    if (!selectedId) return;
    pushHistory();
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        trigger_type: triggerType,
        definition: toDefinition(nodes, edges),
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (triggerNode?.data?.trigger_type) {
      setTriggerType(String(triggerNode.data.trigger_type));
    }
  }, [nodes]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs font-semibold"
          disabled={readOnly}
        />
        {status && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium capitalize dark:bg-zinc-800">
            {status}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => zoomOut()} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => zoomIn()} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fitView()} title="Fit view">
            Fit
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={undo} disabled={readOnly}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={redo} disabled={readOnly}>
            <Redo2 className="h-4 w-4" />
          </Button>
          {!readOnly && (
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Saving..." : "Save draft"}
            </Button>
          )}
          {onPublish && !readOnly && (
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                await handleSave();
                await onPublish();
              }}
            >
              <Upload className="mr-1 h-4 w-4" />
              Publish
            </Button>
          )}
          {onDuplicate && (
            <Button type="button" variant="outline" size="sm" onClick={() => void onDuplicate()}>
              <Copy className="mr-1 h-4 w-4" />
              Duplicate
            </Button>
          )}
          {onPause && status === "published" && (
            <Button type="button" variant="outline" size="sm" onClick={() => void onPause()}>
              <Pause className="mr-1 h-4 w-4" />
              Pause
            </Button>
          )}
          {onResume && status === "paused" && (
            <Button type="button" variant="outline" size="sm" onClick={() => void onResume()}>
              <Play className="mr-1 h-4 w-4" />
              Resume
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Blocks
          </p>
          <div className="space-y-2">
            {PALETTE_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                disabled={readOnly}
                onClick={() => addNode(item.type)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-left transition hover:border-[var(--primary)] hover:bg-violet-50/50 disabled:opacity-50 dark:hover:bg-violet-950/20"
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={workflowNodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            className="bg-zinc-50 dark:bg-zinc-950"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={!readOnly} />
            <MiniMap zoomable pannable />
          </ReactFlow>
        </div>

        <aside className="w-72 shrink-0 overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Properties
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
              />
            </div>
            {selectedNode ? (
              <>
                <div className="space-y-2">
                  <Label>Node label</Label>
                  <Input
                    value={String(selectedNode.data?.label ?? "")}
                    onChange={(e) => updateSelectedNode({ label: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                {selectedNode.type === "trigger" && (
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select
                      value={String(selectedNode.data?.trigger_type ?? triggerType)}
                      onChange={(e) => updateSelectedNode({ trigger_type: e.target.value })}
                      disabled={readOnly}
                    >
                      {triggers.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {selectedNode.type === "action" && (
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={String(selectedNode.data?.action_type ?? "create_task")}
                      onChange={(e) => updateSelectedNode({ action_type: e.target.value })}
                      disabled={readOnly}
                    >
                      {actions.map((a) => (
                        <option key={a} value={a}>
                          {a.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                {selectedNode.data?.action_type === "create_task" && (
                  <div className="space-y-2">
                    <Label>Task title</Label>
                    <Input
                      value={String((selectedNode.data?.config as Record<string, unknown>)?.title ?? "")}
                      onChange={(e) =>
                        updateSelectedNode({
                          config: {
                            ...((selectedNode.data?.config as Record<string, unknown>) ?? {}),
                            title: e.target.value,
                          },
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Select a node to edit its properties.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <BuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}
