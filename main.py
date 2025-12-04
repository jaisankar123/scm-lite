from fastapi import FastAPI, HTTPException, Request, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.gzip import GZipMiddleware
from models import SignupModel, LoginModel, ShipmentModel, DeviceListModel, TwoFactorVerifyModel
from fastapi.middleware.cors import CORSMiddleware
from auth import create_password_reset_token
from email_service import send_password_reset_email, send_2fa_code_email # The file we just created
from models import  ForgotPasswordRequest, PasswordResetRequest
from jose import JWTError, jwt
import secrets

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

@app.get("/forgot-password", response_class=HTMLResponse)
def forgot_password(request: Request):
    return templates.TemplateResponse("forgot-password.html", {"request": request})

# --- In main.py, near your other template routes ---

@app.get("/reset-password", response_class=HTMLResponse)
def reset_password(request: Request):
    """Serves the password reset form page."""
    return templates.TemplateResponse("reset-password.html", {"request": request})

# Note: No changes needed to the app.include_router(reset_router) line

# --- Add this function to your existing reset_routes.py file ---


# ... existing code for APIRouter and handle_reset_request ...

@app.post("/reset-password-confirm")
async def handle_reset_confirm(request: PasswordResetRequest):
    """
    Validates the reset token and updates the user's password.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token.",
    )
    
    try:
        # 1. Decode and validate the token (checks expiry automatically)
        payload = jwt.decode(
            request.token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # 2. Find the user and validate the token status in the database
    db_user = users_collection.find_one({"email": email})

    if not db_user or db_user.get("reset_token") != request.token:
        # Token doesn't match the one stored (or user not found)
        raise credentials_exception
    
    if db_user.get("reset_token_expires") < datetime.utcnow():
        # Token has expired
        raise credentials_exception

    # 3. Hash the new password
    hashed_password = hash_password(request.new_password)

    # 4. Update the password and clear the reset token fields
    users_collection.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {
                "password": hashed_password
            },
            "$unset": {
                "reset_token": "",
                "reset_token_expires": ""
            }
        }
    )

    return {"message": "Password updated successfully."}

@app.post("/reset-password-request")
async def handle_reset_request(request: ForgotPasswordRequest):
    """
    Receives email, generates reset token, updates DB, and sends email.
    Uses generic success message for security.
    """
    try:
        # 1. Find the user in the database
        db_user = users_collection.find_one({"email": request.email})
        
        # 2. Security Check: Always return generic success regardless of user existence.
        if not db_user:
            return {"message": "If an account is associated with this email, a reset link has been sent."}

        # 3. Generate a Password Reset Token (e.g., expires in 15 minutes)
        reset_token_expires = timedelta(minutes=15)
        reset_token = create_password_reset_token(
            data={"sub": request.email}, expires_delta=reset_token_expires
        )
        
        # 4. Save the Token and Expiration to the User's Database Document
        expiry_timestamp = datetime.utcnow() + reset_token_expires
        
        users_collection.update_one(
            {"_id": db_user["_id"]},
            {
                "$set": {
                    "reset_token": reset_token,
                    "reset_token_expires": expiry_timestamp
                }
            }
        )
        
        # 5. Construct the full reset URL
        # NOTE: You MUST replace this with your EC2 Public IP or actual domain name!
        RESET_DOMAIN = "https//:127.0.0.1:8000" # Use HTTPS in production
        reset_url = f"{RESET_DOMAIN}/reset-password?token={reset_token}"
        
        # 6. Send the Email
        email_sent = await send_password_reset_email(request.email, reset_url)
        
        if not email_sent and settings.EMAIL_HOST != "smtp.example.com":
             # Log a failure, but still return a generic success to the user (security)
             logger.error(f"EMAIL SEND FAILURE for {request.email}")

        # 7. Final Response (Generic Success)
        return {"message": "A reset link has been sent."}
    
    except Exception as e:
        logger.error(f"Password reset request failed: {e}")
        return {"message": "If an account is associated with this email, a reset link has been sent."}


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
    

@app.post("/device-data/filter")
def get_filtered_device_data(
    device_list: DeviceListModel, 
    user_payload: dict = Depends(get_current_user) # Secure the route
):
    """
    Fetches the latest 15 documents from the live device data collection, 
    filtered by the Device_ID list provided in the request body.
    """
    try:
        collection = get_scm_data_collection(DEVICE_STREAM_DATA_COLLECTION)
        
        # 1. Create a query filter using the list of device IDs
        filter_query = {"Device_ID": {"$in": device_list.devices}}
        
        # 2. Query the database
        latest_data = list(
            collection.find(filter_query)
            .sort('_id', -1)
            .limit(15)
        )
        
        # 3. Serialize and return
        for doc in latest_data:
            doc['_id'] = str(doc['_id'])
            
        return latest_data
        
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve filtered device data.")    
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
# Updated Login to implement 2FA
@app.post("/login", status_code=status.HTTP_202_ACCEPTED) # Set default status to 202
async def login_user(user: LoginModel):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")
    
    # 1. Generate 6-digit code
    # NOTE: secrets.randbelow(1000000) generates a number from 0 to 999999
    code = str(secrets.randbelow(1000000)).zfill(6) 
    code_expiry = datetime.utcnow() + timedelta(minutes=5)

    # 2. Save code and expiry to the database
    users_collection.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {
                "two_factor_code": code,
                "code_expires_at": code_expiry
            }
        }
    )

    # 3. Send the code via email
    await send_2fa_code_email(user.email, code)

    # 4. Return 202 status to client, prompting for the 2FA code
    # The client-side logic (login.js) expects this 202 status.
    return {
        "message": "Two-factor authentication required. Code sent to email.", 
        "email": user.email
    }


# NEW ROUTE: Verify 2FA Code
@app.post("/verify-2fa")
def verify_two_factor_code(request: TwoFactorVerifyModel):
    db_user = users_collection.find_one({"email": request.email})

    # Basic user/code existence check
    if not db_user or db_user.get("two_factor_code") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Verification process timed out or is invalid."
        )

    # 1. Check if the code has expired
    if db_user.get("code_expires_at") < datetime.utcnow():
        # Clear the expired code
        users_collection.update_one(
            {"_id": db_user["_id"]},
            {"$unset": {"two_factor_code": "", "code_expires_at": ""}}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Verification code expired. Please log in again."
        )

    # 2. Check if the code matches
    if request.code != db_user["two_factor_code"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Incorrect verification code."
        )
    
    # 3. SUCCESS: Clear the code and generate the final JWT
    users_collection.update_one(
        {"_id": db_user["_id"]},
        {"$unset": {"two_factor_code": "", "code_expires_at": ""}}
    )

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": request.email}, expires_delta=access_token_expires
    )
    
    return {
        "message": "Verification successful!", 
        "access_token": access_token, 
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