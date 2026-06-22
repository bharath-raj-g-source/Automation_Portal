from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float,JSON
from sqlalchemy.sql import func
from database import Base 

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # We add okta_uid to link this user strictly to Okta
    okta_uid = Column(String(255), unique=True, index=True, nullable=False) 
    email = Column(String(255), unique=True, index=True, nullable=False)
    
    # We REMOVED hashed_password because Okta securely stores passwords!
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

# NEW TABLE: To track how they interact with the webapp
class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    # Links the activity directly to the user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # e.g., "VIEWED_DASHBOARD", "EXPORTED_REPORT", "CLICKED_SETTINGS"
    action = Column(String(255), nullable=False) 
    
    # Optional: Track where they did it from or specific details
    details = Column(String(500), nullable=True) 
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class RoscoSubmission(Base):
    __tablename__ = "rosco_submissions"
    id = Column(Integer, primary_key=True, index=True)
    
    # --- AUTO-EXTRACTED DATA ---
    rosco_id = Column(String(255), index=True, nullable=False) # Extracted from filename
    project_name = Column(String(255), nullable=True)          # Extracted from General Info
    
    # --- NEW: USER INPUT DATA ---
    manual_rosco_id = Column(String(255), nullable=True)       # From frontend text input
    destination_id = Column(String(255), nullable=True)        # From frontend text input
    user_name = Column(String(255), nullable=True)             # From frontend text input
    
    # --- ANALYTICS DATA ---
    qc_type = Column(String(50), nullable=True, default="") # 🎯 NEW COLUMN
    run_duration = Column(Float, nullable=True)
    error_count = Column(Integer, nullable=True)
    qc_summary = Column(JSON, nullable=True)
    original_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    