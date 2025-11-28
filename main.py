from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.responses import HTMLResponse 
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from models import SignupModel, LoginModel, ShipmentModel
from pymongo import MongoClient 
from database import users_collection
from auth import hash_password, verify_password, create_access_token, decode_access_token, get_current_user
from datetime import timedelta
import time
from typing import List



app = FastAPI()

# 1. Initialize Jinja2Templates
templates = Jinja2Templates(directory="templates") 

# 2. Configure Static Files (Recommended for serving index.css and index.js)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ------------------ HELPER FOR SCM DATABASE ACCESS ------------------
def get_scm_data_collection(collection_name: str):
    """Connects to the SCM database and returns a specific collection."""
    client = MongoClient("mongodb://localhost:27017/")
    db = client["scmlitedb"]
    return db[collection_name]
# --------------------------------------------------------------------


# ------------------ CORS CONFIGURATION ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------------------------------------------

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
        collection = get_scm_data_collection("shipments_collection")
        
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
    """Fetch shipments created by the logged-in user."""
    try:
        collection = get_scm_data_collection("shipments_collection")

        shipments = list(collection.find(
            {"creator_email": user_payload["email"]}
        ))

        for s in shipments:
            s["_id"] = str(s["_id"])

        return shipments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------ 3. GET ACCOUNT DETAILS ------------------
@app.get("/account/me/{email}")
def get_user_details(email: str, user_payload: dict = Depends(get_current_user)):
    """Fetches user details using their email from the auth database."""
    
    if email != user_payload['email']:
        raise HTTPException(status_code=403, detail="Not authorized to view this account.")
        
    db_user = users_collection.find_one({"email": email}, {"password": 0})
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user['_id'] = str(db_user['_id'])
    
    return db_user
# ------------------------------------------------------------


# ------------------ GET LATEST SCM DATA (POLLING) ------------------
@app.get("/device-data")
def get_latest_device_data(user=Depends(get_current_user)):
    """Fetches the latest 15 documents from the live device data collection."""
    try:
        collection = get_scm_data_collection("shipment_data")
        
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