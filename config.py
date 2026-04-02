from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    KAFKA_TOPIC: str = os.getenv("KAFKA_TOPIC")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
    ZOOKEEPER_CLIENT_PORT: str = int(os.getenv("ZOOKEEPER_CLIENT_PORT"))


    EMAIL_HOST: str = os.getenv("EMAIL_HOST")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT"))
    EMAIL_USERNAME: str = os.getenv("EMAIL_USERNAME")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD")
    
    @property
    def kafka_bootstrap_servers(self) -> List[str]:
        return self.KAFKA_BOOTSTRAP_SERVERS.split(",")

    class Config:   
        env_file = ".env"
        extra = "ignore"

settings = Settings()



