from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    email: EmailStr
    full_name: str
    role_id: UUID
    role_slug: str
    role_name: str
    status: str


class MemberListResponse(BaseModel):
    items: list[MemberResponse]


class MemberUpdate(BaseModel):
    role_id: UUID | None = None
    status: str | None = None


class MemberCreate(BaseModel):
    email: EmailStr
    role_id: UUID


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    is_system: bool


class RoleListResponse(BaseModel):
    items: list[RoleResponse]
