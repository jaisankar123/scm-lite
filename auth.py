# auth.py
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import OAuth2PasswordBearer
from pymongo import MongoClient
from typing import Optional
from config import settings
from database import db
from passlib.context import CryptContext

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    users_collection = db.get_collection("users")
    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

async def get_websocket_user(websocket: WebSocket, token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
            
        users_collection = db.get_collection("users")
        user = users_collection.find_one({"email": email})
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
            
        return user
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

#for password reset token
def create_password_reset_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a short-lived JWT for password reset purposes (e.g., 15 minutes)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration for reset token is very short, e.g., 15 minutes
        expire = datetime.utcnow() + timedelta(minutes=15) 
    to_encode.update({"exp": expire})
    
    # Use the existing settings for secret key and algorithm
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt