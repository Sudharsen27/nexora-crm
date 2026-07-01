from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.email import EMAIL_FOLDERS, EMAIL_PRIORITIES, EMAIL_STATUSES, TEMPLATE_CATEGORIES


class EmailRecipientInput(BaseModel):
    recipient_type: str = Field(pattern="^(to|cc|bcc)$")
    email_address: EmailStr
    display_name: str | None = None
    user_id: UUID | None = None
    contact_id: UUID | None = None


class EmailRecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    recipient_type: str
    email_address: str
    display_name: str | None
    user_id: UUID | None
    contact_id: UUID | None


class EmailAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime


class EmailLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    metadata: dict | None = None
    created_at: datetime


class UserRef(BaseModel):
    id: UUID
    full_name: str
    email: str


class EmailCreate(BaseModel):
    subject: str = Field(default="", max_length=500)
    body_html: str | None = None
    body_text: str | None = None
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    recipients: list[EmailRecipientInput] = Field(default_factory=list)
    company_id: UUID | None = None
    contact_id: UUID | None = None
    lead_id: UUID | None = None
    deal_id: UUID | None = None
    task_id: UUID | None = None
    meeting_id: UUID | None = None
    template_id: UUID | None = None
    parent_email_id: UUID | None = None
    thread_id: UUID | None = None
    from_name: str | None = None
    metadata: dict | None = None


class EmailUpdate(BaseModel):
    subject: str | None = Field(default=None, max_length=500)
    body_html: str | None = None
    body_text: str | None = None
    priority: str | None = Field(default=None, pattern="^(low|normal|high|urgent)$")
    recipients: list[EmailRecipientInput] | None = None
    company_id: UUID | None = None
    contact_id: UUID | None = None
    lead_id: UUID | None = None
    deal_id: UUID | None = None
    task_id: UUID | None = None
    meeting_id: UUID | None = None
    is_read: bool | None = None
    is_starred: bool | None = None
    is_important: bool | None = None
    from_name: str | None = None
    metadata: dict | None = None


class EmailSendRequest(BaseModel):
    email_id: UUID | None = None
    subject: str = Field(default="", max_length=500)
    body_html: str | None = None
    body_text: str | None = None
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    recipients: list[EmailRecipientInput] = Field(min_length=1)
    company_id: UUID | None = None
    contact_id: UUID | None = None
    lead_id: UUID | None = None
    deal_id: UUID | None = None
    task_id: UUID | None = None
    meeting_id: UUID | None = None
    template_id: UUID | None = None
    parent_email_id: UUID | None = None
    from_name: str | None = None
    include_signature: bool = True


class EmailScheduleRequest(EmailSendRequest):
    scheduled_at: datetime


class EmailReplyRequest(BaseModel):
    body_html: str | None = None
    body_text: str | None = None
    recipients: list[EmailRecipientInput] | None = None
    include_signature: bool = True
    reply_all: bool = False


class EmailForwardRequest(BaseModel):
    body_html: str | None = None
    body_text: str | None = None
    recipients: list[EmailRecipientInput] = Field(min_length=1)
    include_signature: bool = True


class EmailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    thread_id: UUID | None
    parent_email_id: UUID | None
    sender_id: UUID | None
    sender: UserRef | None = None
    created_by_id: UUID | None
    created_by: UserRef | None = None
    template_id: UUID | None
    from_email: str | None
    from_name: str | None
    subject: str
    body_html: str | None
    body_text: str | None
    status: str
    priority: str
    folder: str
    direction: str
    is_read: bool
    is_starred: bool
    is_important: bool
    has_attachments: bool
    scheduled_at: datetime | None
    sent_at: datetime | None
    archived_at: datetime | None
    company_id: UUID | None
    contact_id: UUID | None
    lead_id: UUID | None
    deal_id: UUID | None
    task_id: UUID | None
    meeting_id: UUID | None
    activity_id: UUID | None
    metadata: dict | None = None
    recipients: list[EmailRecipientResponse] = []
    attachments: list[EmailAttachmentResponse] = []
    logs: list[EmailLogResponse] = []
    created_at: datetime
    updated_at: datetime


class EmailListResponse(BaseModel):
    items: list[EmailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class EmailTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(default="sales")
    subject: str = Field(min_length=1, max_length=500)
    body_html: str = Field(min_length=1)
    body_text: str | None = None
    variables: list[str] | None = None


class EmailTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    category: str | None = None
    subject: str | None = Field(default=None, max_length=500)
    body_html: str | None = None
    body_text: str | None = None
    variables: list[str] | None = None


class EmailTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    category: str
    subject: str
    body_html: str
    body_text: str | None
    variables: list[str] | None = None
    created_by_id: UUID | None
    created_by: UserRef | None = None
    created_at: datetime
    updated_at: datetime


class EmailTemplateListResponse(BaseModel):
    items: list[EmailTemplateResponse]
    total: int


class EmailStatisticsResponse(BaseModel):
    unread_count: int
    drafts_count: int
    scheduled_count: int
    sent_today: int
    sent_this_week: int
    open_rate: float
    click_rate: float
    reply_rate: float
    delivery_rate: float


class EmailUserSettingsResponse(BaseModel):
    signature_html: str | None
    signature_text: str | None
    default_from_name: str | None


class EmailUserSettingsUpdate(BaseModel):
    signature_html: str | None = None
    signature_text: str | None = None
    default_from_name: str | None = None


class EmailThreadResponse(BaseModel):
    thread_id: UUID
    subject: str
    last_message_at: datetime | None
    emails: list[EmailResponse]
