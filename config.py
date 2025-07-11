"""
Configuration settings for the AI-Enhanced Todo Management System
"""
import os
from typing import Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    app_name: str = "AI-Enhanced Todo Management"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database Configuration
    database_url: str = "sqlite:///./ai_todo_management.db"
    
    # AI Configuration
    openai_api_key: Optional[str] = None
    use_local_models: bool = True
    
    # Parallel Processing Configuration
    max_workers: int = 4
    batch_size: int = 20
    max_concurrent_batches: int = 3
    processing_timeout: int = 300  # seconds
    
    # NLP Configuration
    spacy_model: str = "en_core_web_sm"
    sentiment_model: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    
    # Security Configuration
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    
    # Logging Configuration
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
