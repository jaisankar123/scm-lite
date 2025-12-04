from pydantic import BaseModel, EmailStr
from typing import List, Optional

class SignupModel(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginModel(BaseModel):
    email: EmailStr
    password: str

# --- New Model for Shipments ---
class ShipmentModel(BaseModel):
    shipmentNumber: str
    route: str
    device: str
    poNumber: str
    containerNumber: str
    goodsType: str
    deliveryDate: str
    description: str
    status: str
    created: str
    ndcNumber: str
    serialNumber: str
    deliveryNumber: str
    batchId: str

# --- New Model for Device List ---
class DeviceListModel(BaseModel):
    devices: List[str]

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    token: str # The token received via email link
    new_password: str