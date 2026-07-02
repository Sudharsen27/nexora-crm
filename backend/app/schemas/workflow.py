from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class WorkflowNodeInput(BaseModel):
    id: str
    type: str
    position: dict
    data: dict = Field(default_factory=dict)


class WorkflowEdgeInput(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: str | None = None
    targetHandle: str | None = None
    label: str | None = None


class WorkflowDefinitionInput(BaseModel):
    nodes: list[WorkflowNodeInput] = Field(default_factory=list)
    edges: list[WorkflowEdgeInput] = Field(default_factory=list)


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    trigger_type: str = "manual"
    definition: WorkflowDefinitionInput | None = None
    is_template: bool = False
    template_slug: str | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    trigger_type: str | None = None
    definition: WorkflowDefinitionInput | None = None
    status: str | None = None


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    status: str
    trigger_type: str
    definition: dict
    version: int
    published_version: int | None
    is_template: bool
    template_slug: str | None
    published_at: datetime | None
    created_by_id: uuid.UUID | None
    updated_by_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkflowListResponse(BaseModel):
    items: list[WorkflowResponse]
    total: int
    page: int
    page_size: int


class WorkflowVersionResponse(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    version: int
    snapshot: dict
    note: str | None
    created_by_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowExecutionResponse(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    tenant_id: uuid.UUID
    version: int
    trigger_type: str
    trigger_payload: dict
    status: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    error_message: str | None
    retry_count: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    workflow_name: str | None = None

    model_config = {"from_attributes": True}


class WorkflowExecutionListResponse(BaseModel):
    items: list[WorkflowExecutionResponse]
    total: int
    page: int
    page_size: int


class WorkflowLogResponse(BaseModel):
    id: uuid.UUID
    execution_id: uuid.UUID
    workflow_id: uuid.UUID
    level: str
    message: str
    node_key: str | None
    data: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowMetaResponse(BaseModel):
    triggers: list[str]
    actions: list[str]
    conditions: list[str]
    statuses: list[str]
    execution_statuses: list[str]


class WorkflowExecuteRequest(BaseModel):
    payload: dict = Field(default_factory=dict)
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None


class WorkflowDuplicateRequest(BaseModel):
    name: str | None = None
