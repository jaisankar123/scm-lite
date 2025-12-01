from fastapi import FastAPI, HTTPException, Request, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.gzip import GZipMiddleware
from models import SignupModel, LoginModel, ShipmentModel, DeviceListModel
from fastapi.middleware.cors import CORSMiddleware

from database import db, USERS_COLLECTION, DEVICE_STREAM_DATA_COLLECTION
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from auth import (
    hash_password, 
    verify_password, 
    create_access_token, 
    get_current_user,
    get_websocket_user,
    pwd_context
)
from config import settings
import time
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta

app = FastAPI()

# Add GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)
origins = [
    # Allow all origins for development (less secure)
    "*" 
    # For production, you would list specific origins:
    # "http://localhost:8000",
    # "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all standard HTTP methods
    allow_headers=["*"],  # Allow all headers, including custom ones like 'Authorization'
)

# Initialize Jinja2Templates
templates = Jinja2Templates(directory="templates") 

# Configure Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# ------------------ HELPER FOR SCM DATABASE ACCESS ------------------
def get_scm_data_collection(collection_name: str):
    """Connects to the SCM database and returns a specific collection."""
    return db.get_collection(collection_name)

users_collection = get_scm_data_collection(USERS_COLLECTION)

# Add WebSocket manager class
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# ------------------ FRONTEND ROUTES (Template Serving) ------------------

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/device-data-stream", response_class=HTMLResponse)
def device_data_stream(request: Request):
    return templates.TemplateResponse("device-data-stream.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/create-shipment", response_class=HTMLResponse)
def create_shipment(request: Request):
    return templates.TemplateResponse("create-shipment.html", {"request": request})

@app.get("/myaccount", response_class=HTMLResponse)
def my_account(request: Request):
    return templates.TemplateResponse("myaccount.html", {"request": request})

@app.get("/myshipment", response_class=HTMLResponse)
def my_shipments(request: Request):
    return templates.TemplateResponse("myshipment.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/signup", response_class=HTMLResponse)
def signup(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})
# ------------------------------------------------------------------------


# ------------------ 2. CREATE NEW SHIPMENT ------------------
@app.post("/shipment/new")
def create_new_shipment(shipment: ShipmentModel, user_payload: dict = Depends(get_current_user)):
    """Saves a new user-created shipment to the shipments collection."""
    try:
        collection = get_scm_data_collection("shipment_data")
        
        shipment_data = shipment.dict()
        shipment_data['timestamp'] = int(time.time())
        shipment_data['creator_email'] = user_payload['email']
        
        insert_result = collection.insert_one(shipment_data)
        
        return {
            "message": "Shipment created successfully",
            "shipment_id": str(insert_result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during shipment creation: {e}")
# -----------------------------------------------------------

@app.get("/shipment/my")
def get_my_shipments(user_payload: dict = Depends(get_current_user)):
    """
    Fetch shipments created by the logged-in user.
    This route filters shipments based on the 'creator_email' matching
    the authenticated user's email from the JWT payload.
    """
    try:
        collection = get_scm_data_collection("shipment_data")

        # MongoDB query to filter by the current user's email
        shipments = list(collection.find(
            {"creator_email": user_payload["email"]}
        ).sort('timestamp', -1)) # Sort by most recent first

        # Convert ObjectId to string for JSON serialization
        for s in shipments:
            s["_id"] = str(s["_id"])
            # Format the timestamp for display
            if 'timestamp' in s and isinstance(s['timestamp'], int):
                 s['createdOnDisplay'] = datetime.fromtimestamp(s['timestamp']).strftime('%Y-%m-%d %H:%M')

        return shipments
    except Exception as e:
        # Log the error for debugging
        print(f"Error fetching user shipments: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve your shipment data.")


# ------------------ 3. GET ACCOUNT DETAILS ------------------
@app.get("/account/me/{email}")
def get_user_details(email: str, user_payload: dict = Depends(get_current_user)):
    
    if email != user_payload["email"]:
        raise HTTPException(403, "Not authorized")

    db_user = users_collection.find_one({"email": email}, {"password": 0})

    if not db_user:
        raise HTTPException(404, "User not found")

    db_user["_id"] = str(db_user["_id"])
    return db_user

# ------------------------------------------------------------


# ------------------ GET LATEST SCM DATA (POLLING) ------------------
@app.get("/device-data")
def get_latest_device_data():
    """Fetches the latest 15 documents from the live device data collection."""
    try:
        collection = get_scm_data_collection(DEVICE_STREAM_DATA_COLLECTION)
        
        latest_data = list(
            collection.find()
            .sort('_id', -1)
            .limit(15)
        )
        
        for doc in latest_data:
            doc['_id'] = str(doc['_id'])
            
        return latest_data
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve device data from database")
# --------------------------------------------------------------------


# ------------------ AUTH ROUTES ------------------

@app.get("/api/v1/verify-token")
def verify_token(current_user: dict = Depends(get_current_user)):
    return {"status": "valid"}


@app.post("/signup")
def signup_user(user: SignupModel):
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    print(user.password)
    users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password)
        
    })
    
    return {"message": "Signup successful!"}

# Updated Login to return JWT
@app.post("/login")
def login_user(user: LoginModel):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    # This is the line that generates the "Incorrect password" detail
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    
    # --- JWT Creation ---
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "message": "Login successful!", 
        "access_token": access_token, # Send JWT
        "token_type": "bearer",
        "user_data": {
            "name": db_user["name"], 
            "email": db_user["email"]
        }
    }

@app.post("/shipment/new")
def create_new_shipment(shipment: ShipmentModel, user_payload: dict = Depends(get_current_user)):
    """Saves a new user-created shipment to the shipments collection."""
    try:
        # Use the collection name defined in database.py
        shipments_collection = get_scm_data_collection("shipment_data")
        
        # Convert Pydantic model to dictionary
        shipment_data = shipment.dict()
        # Add metadata
        shipment_data['timestamp'] = int(time.time())
        shipment_data['creator_email'] = user_payload['email']
        
        insert_result = shipments_collection.insert_one(shipment_data)
        
        return {
            "message": "Shipment created successfully",
            "shipment_id": str(insert_result.inserted_id)
        }
    except Exception as e:
        # Log the error for debugging purposes
        print(f"Database error during shipment creation: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during shipment creation: {e}")
# -----------------------------------------------------------

@app.websocket("/ws/device-data")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_websocket_user(websocket, token)
    if not user:
        return

    client_id = f"{user['email']}_{int(time.time())}"
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)