
import os
import json
import uuid

from pathlib import Path
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import gspread
import jwt

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from gspread.exceptions import APIError
from pydantic import BaseModel, Field
from pwdlib import PasswordHash


# ==============================
# Configuration
# ==============================

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")

app = FastAPI(title="NovaPay API", version="1.0.0")

security = HTTPBearer()
hasher = PasswordHash.recommended()

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "")
SHEET_ID = os.getenv("GOOGLE_SHEETS_ID", "")

GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")

# Local credentials fallback
cred = Path(
    os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
)

if not cred.is_absolute():
    cred = BASE / cred

if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters.")

if not SHEET_ID:
    raise RuntimeError("GOOGLE_SHEETS_ID is missing.")

if not GOOGLE_SERVICE_ACCOUNT_JSON and not cred.is_file():
    raise RuntimeError(
        "Google credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_JSON "
        "or provide service-account.json."
    )

origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,"
    "http://localhost:8000,http://127.0.0.1:8000"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        x.strip().rstrip("/")
        for x in origins.split(",")
        if x.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

HEADERS = [
    "username",
    "password_hash",
    "wallet_id",
    "transactions",
    "wallet_money",
    "email",
    "avatar",
]


# ==============================
# Google Sheets Connection
# ==============================

def get_google_client():
    try:
        if GOOGLE_SERVICE_ACCOUNT_JSON:
            credentials_info = json.loads(GOOGLE_SERVICE_ACCOUNT_JSON)

            return gspread.service_account_from_dict(
                credentials_info
            )

        return gspread.service_account(
            filename=str(cred)
        )

    except Exception as e:
        print("Google credentials error:", str(e))
        raise HTTPException(
            status_code=503,
            detail="Google Sheets credentials are invalid or unavailable."
        )


def sheet():
    try:
        client = get_google_client()

        s = client.open_by_key(SHEET_ID).sheet1

        if s.row_values(1)[:7] != HEADERS:
            raise HTTPException(
                status_code=500,
                detail="Google Sheet headers are incorrect."
            )

        return s

    except HTTPException:
        raise

    except APIError:
        raise HTTPException(
            status_code=503,
            detail="Google Sheets temporarily unavailable."
        )

    except Exception as e:
        print("Google Sheets connection error:", str(e))
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Google Sheets."
        )


def users():
    s = sheet()

    try:
        return s, s.get_all_records()

    except APIError:
        raise HTTPException(
            status_code=503,
            detail="Could not read user records."
        )


# ==============================
# Models
# ==============================

class Register(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=128)


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1, max_length=128)


# ==============================
# Authentication
# ==============================

def token_for(username):
    now = datetime.now(timezone.utc)

    return jwt.encode(
        {
            "sub": username,
            "iat": now,
            "exp": now + timedelta(hours=2)
        },
        JWT_SECRET,
        algorithm="HS256"
    )


def current_user(
    c: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        name = jwt.decode(
            c.credentials,
            JWT_SECRET,
            algorithms=["HS256"]
        ).get("sub")

        if not name:
            raise HTTPException(401, "Invalid token.")

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            401,
            "Token expired. Please log in again."
        )

    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token.")

    _, rows = users()

    u = next(
        (
            x for x in rows
            if str(x.get("username", "")) == name
        ),
        None
    )

    if not u:
        raise HTTPException(401, "User not found.")

    return u


# ==============================
# Routes
# ==============================

@app.get("/")
def home():
    return {
        "message": "NovaPay Backend is running"
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok"
    }


@app.get("/api/sheets-test")
def sheets_test():
    s = sheet()

    return {
        "status": "connected",
        "worksheet": s.title,
        "headers": s.row_values(1)
    }


@app.post("/api/register", status_code=201)
def register(d: Register):
    name = d.username.strip()
    email = d.email.strip().lower()

    if not name or "@" not in email:
        raise HTTPException(
            400,
            "Enter a valid username and email."
        )

    s, rows = users()

    if any(
        str(x.get("username", "")).strip().lower() == name.lower()
        for x in rows
    ):
        raise HTTPException(409, "Username already exists.")

    if any(
        str(x.get("email", "")).strip().lower() == email
        for x in rows
    ):
        raise HTTPException(409, "Email already exists.")

    try:
        s.append_row(
            [
                name,
                hasher.hash(d.password),
                str(uuid.uuid4()),
                "[]",
                "0.00",
                email,
                ""
            ],
            value_input_option="RAW"
        )

    except APIError:
        raise HTTPException(
            503,
            "Could not save account. Try again."
        )

    return {
        "message": "Account created",
        "username": name,
        "token": token_for(name),
        "token_type": "bearer"
    }


@app.post("/api/login")
def login(d: Login):
    _, rows = users()

    u = next(
        (
            x for x in rows
            if str(x.get("username", "")).strip().lower()
            == d.username.strip().lower()
        ),
        None
    )

    if not u:
        raise HTTPException(
            401,
            "Invalid username or password."
        )

    try:
        valid = hasher.verify(
            d.password,
            str(u.get("password_hash", ""))
        )

    except Exception:
        valid = False

    if not valid:
        raise HTTPException(
            401,
            "Invalid username or password."
        )

    return {
        "message": "Login successful",
        "username": u["username"],
        "token": token_for(u["username"]),
        "token_type": "bearer"
    }


@app.get("/api/wallet")
def wallet(u=Depends(current_user)):
    try:
        balance = Decimal(
            str(u.get("wallet_money", "0.00"))
        )

        if not balance.is_finite():
            raise InvalidOperation

    except (InvalidOperation, ValueError):
        raise HTTPException(
            500,
            "Wallet balance is invalid."
        )

    return {
        "wallet_id": u["wallet_id"],
        "wallet_money": str(balance),
        "currency": "EGP"
    }


@app.get("/api/transactions")
def transactions(u=Depends(current_user)):
    try:
        items = json.loads(
            u.get("transactions", "[]") or "[]"
        )

        if not isinstance(items, list):
            raise ValueError

    except (ValueError, TypeError):
        raise HTTPException(
            500,
            "Stored transactions data is invalid."
        )

    return {
        "transactions": items
    }
