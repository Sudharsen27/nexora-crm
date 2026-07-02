"""Built-in workflow templates for quick starts."""

WORKFLOW_TEMPLATES: list[dict] = [
    {
        "template_slug": "lead-follow-up",
        "name": "Lead Follow-up",
        "description": "Create a follow-up task when a new lead is captured.",
        "trigger_type": "lead_created",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Lead Created", "trigger_type": "lead_created"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Create Task",
                        "action_type": "create_task",
                        "config": {
                            "title": "Follow up with new lead",
                            "priority": "medium",
                            "due_in_days": 1,
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "deal-won",
        "name": "Deal Won Celebration",
        "description": "Notify the team when a deal is won.",
        "trigger_type": "deal_won",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Deal Won", "trigger_type": "deal_won"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Send Notification",
                        "action_type": "send_notification",
                        "config": {
                            "title": "Deal won!",
                            "message": "A deal was marked as won.",
                            "priority": "high",
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "deal-lost",
        "name": "Deal Lost Review",
        "description": "Create a review task when a deal is lost.",
        "trigger_type": "deal_lost",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Deal Lost", "trigger_type": "deal_lost"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Create Task",
                        "action_type": "create_task",
                        "config": {
                            "title": "Review lost deal",
                            "priority": "low",
                            "due_in_days": 3,
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "task-reminder",
        "name": "Task Reminder",
        "description": "Log activity when a task is completed.",
        "trigger_type": "task_completed",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Task Completed", "trigger_type": "task_completed"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Create Activity",
                        "action_type": "create_activity",
                        "config": {
                            "title": "Task completed via workflow",
                            "description": "Automated activity from task completion.",
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "meeting-reminder",
        "name": "Meeting Reminder",
        "description": "Notify assignee when a meeting is scheduled.",
        "trigger_type": "meeting_scheduled",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Meeting Scheduled", "trigger_type": "meeting_scheduled"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Send Notification",
                        "action_type": "send_notification",
                        "config": {
                            "title": "Meeting scheduled",
                            "message": "A new meeting was added to the calendar.",
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "email-follow-up",
        "name": "Email Follow-up",
        "description": "Create a task when an email is opened.",
        "trigger_type": "email_opened",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Email Opened", "trigger_type": "email_opened"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Create Task",
                        "action_type": "create_task",
                        "config": {
                            "title": "Follow up on opened email",
                            "priority": "high",
                            "due_in_days": 0,
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "new-customer",
        "name": "New Customer",
        "description": "Welcome workflow when a company is created.",
        "trigger_type": "company_created",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Company Created", "trigger_type": "company_created"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Create Activity",
                        "action_type": "create_activity",
                        "config": {
                            "title": "New customer onboarded",
                            "description": "Automated welcome activity for new company.",
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
    {
        "template_slug": "sales-onboarding",
        "name": "Sales Onboarding",
        "description": "Assign and task when a lead is assigned.",
        "trigger_type": "lead_assigned",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Lead Assigned", "trigger_type": "lead_assigned"},
                },
                {
                    "id": "condition-1",
                    "type": "condition",
                    "position": {"x": 320, "y": 120},
                    "data": {
                        "label": "Has assignee",
                        "logic": "and",
                        "rules": [
                            {"field": "assigned_to_id", "operator": "is_not_empty", "value": ""},
                        ],
                    },
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 560, "y": 80},
                    "data": {
                        "label": "Create Task",
                        "action_type": "create_task",
                        "config": {
                            "title": "Onboard assigned lead",
                            "priority": "high",
                            "due_in_days": 1,
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 820, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "condition-1"},
                {"id": "e2", "source": "condition-1", "target": "action-1", "sourceHandle": "true"},
                {"id": "e3", "source": "action-1", "target": "end-1"},
                {"id": "e4", "source": "condition-1", "target": "end-1", "sourceHandle": "false"},
            ],
        },
    },
    {
        "template_slug": "customer-onboarding",
        "name": "Customer Onboarding",
        "description": "Multi-step onboarding when a contact is created.",
        "trigger_type": "contact_created",
        "definition": {
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "position": {"x": 80, "y": 120},
                    "data": {"label": "Contact Created", "trigger_type": "contact_created"},
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "position": {"x": 360, "y": 120},
                    "data": {
                        "label": "Send Notification",
                        "action_type": "send_notification",
                        "config": {
                            "title": "New contact added",
                            "message": "A new contact was added to the CRM.",
                        },
                    },
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "position": {"x": 640, "y": 120},
                    "data": {"label": "End"},
                },
            ],
            "edges": [
                {"id": "e1", "source": "trigger-1", "target": "action-1"},
                {"id": "e2", "source": "action-1", "target": "end-1"},
            ],
        },
    },
]
