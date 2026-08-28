"""
Database connection and session initialization using SQLModel / SQLite.
"""

from sqlmodel import SQLModel, create_engine, Session
from backend.app.config import settings

# SQLite connection args
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args
)


def init_db():
    """Create tables if they do not exist."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency for database sessions."""
    with Session(engine) as session:
        yield session
