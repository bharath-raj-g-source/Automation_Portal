# tests/test_users_db.py

import pytest
# 1. Import engine and Base as well
from database import SessionLocal, engine, Base 
from core.users.models import User

# 2. Tell the test to ensure all tables exist before doing anything!
Base.metadata.create_all(bind=engine)

def test_user_creation_in_database():
    """
    Tests if we can successfully insert a User into the PostgreSQL database,
    read it back, and verify the fields are correct.
    """
    db = SessionLocal()
    test_email = "pytest_test_user@example.com"
    
    try:
        new_user = User(
            okta_uid="okta_12345abcde", # Replaced hashed_password with this
            email=test_email,
            first_name="Test",
            last_name="User"
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        assert new_user.id is not None, "PostgreSQL failed to generate an ID."
        assert new_user.email == test_email
        assert new_user.is_active == True, "Default value for is_active failed."
        assert new_user.created_at is not None, "Timestamp was not generated."
        
    finally:
        db.query(User).filter(User.email == test_email).delete()
        db.commit()
        db.close()