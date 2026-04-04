# # core/users/router.py
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from database import get_db # Ensure get_db is imported from where you placed it
# from .models import User
# from .schemas import UserSyncRequest, UserResponse

# auth_router = APIRouter()

# @auth_router.post("/sync", response_model=UserResponse)
# def sync_okta_user(user_data: UserSyncRequest, db: Session = Depends(get_db)):
#     # 1. Check if user already exists by Okta UID
#     user = db.query(User).filter(User.okta_uid == user_data.okta_uid).first()
    
#     # Fallback: Check by email in case they were manually added to DB earlier
#     if not user:
#         user = db.query(User).filter(User.email == user_data.email).first()

#     if user:
#         # 2. Update existing user's details and last login
#         user.first_name = user_data.first_name
#         user.last_name = user_data.last_name
#         user.okta_uid = user_data.okta_uid # Ensure they are strictly linked
#     else:
#         # 3. Create a brand new user
#         user = User(
#             okta_uid=user_data.okta_uid,
#             email=user_data.email,
#             first_name=user_data.first_name,
#             last_name=user_data.last_name
#         )
#         db.add(user)

#     db.commit()
#     db.refresh(user)
    
#     return user