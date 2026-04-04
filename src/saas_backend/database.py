from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import get_settings

# 1. Fetch the cached settings
settings = get_settings()

# CORRECTED: Changed DB_NAME to DB_USERNAME and port 8000 to 6000
# DB_URL = f'postgresql://{settings.DB_USERNAME}:{settings.DB_PASSWORD}@localhost:6000/{settings.DB_NAME}'
DB_URL = f"postgresql://{settings.DB_USERNAME}:{settings.DB_PASSWORD}@automationgdtgmo.chmwmsi0mo8j.ap-south-1.rds.amazonaws.com:5432/{settings.DB_NAME}"
# 2. Create the SQLAlchemy engine
# pool_pre_ping=True is a great practice; it tests the connection for liveness
engine = create_engine(DB_URL, pool_pre_ping=True)

# 3. Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create the Base class for your SQLAlchemy models
Base = declarative_base()

# 5. Dependency to yield a DB session in your FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        # This ensures the connection is ALWAYS returned to the pool, 
        # even if your API crashes halfway through!
        db.close()