from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    DB_USERNAME: str
    DB_PASSWORD: str
    DB_NAME: str
    
    # REMOVE the 'class Config:' block and use this instead:
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    
@lru_cache
def get_settings() -> Settings:
    return Settings()