# core/users/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional

# What Next.js sends TO FastAPI
class UserSyncRequest(BaseModel):
    okta_uid: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

# What FastAPI sends BACK to Next.js
class UserResponse(BaseModel):
    id: int
    okta_uid: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    is_active: bool

    # Pydantic V2 config to read data from SQLAlchemy models
    class Config:
        from_attributes = True