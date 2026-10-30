import os,json,uuid
from pathlib import Path
from datetime import datetime,timedelta,timezone
from decimal import Decimal,InvalidOperation
import gspread,jwt
from dotenv import load_dotenv
from fastapi import FastAPI,Depends,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from gspread.exceptions import APIError
from pydantic import BaseModel,Field
from pwdlib import PasswordHash

BASE=Path(__file__).resolve().parent
load_dotenv(BASE/'.env')
app=FastAPI(title='NovaPay API',version='1.0.0')
security=HTTPBearer()
hasher=PasswordHash.recommended()
JWT_SECRET=os.getenv('JWT_SECRET_KEY','')
SHEET_ID=os.getenv('GOOGLE_SHEETS_ID','')
cred=Path(os.getenv('GOOGLE_APPLICATION_CREDENTIALS','service-account.json'))
if not cred.is_absolute(): cred=BASE/cred
if not JWT_SECRET or len(JWT_SECRET)<32: raise RuntimeError('Set a random JWT_SECRET_KEY (32+ chars) in backend/.env')
if not SHEET_ID: raise RuntimeError('Set GOOGLE_SHEETS_ID in backend/.env')
if not cred.is_file(): raise RuntimeError(f'Google credentials not found: {cred}')
origins=os.getenv('FRONTEND_ORIGINS','http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000')
app.add_middleware(CORSMiddleware,allow_origins=[x.strip().rstrip('/') for x in origins.split(',') if x.strip()],allow_credentials=False,allow_methods=['GET','POST','OPTIONS'],allow_headers=['Authorization','Content-Type'])
HEADERS=['username','password_hash','wallet_id','transactions','wallet_money','email','avatar']
class Register(BaseModel):
 username:str=Field(min_length=3,max_length=30)
 email:str=Field(min_length=5,max_length=254)
 password:str=Field(min_length=12,max_length=128)
class Login(BaseModel):
 username:str=Field(min_length=1,max_length=30)
 password:str=Field(min_length=1,max_length=128)
def sheet():
 try:
  s=gspread.service_account(filename=str(cred)).open_by_key(SHEET_ID).sheet1
  if s.row_values(1)[:7]!=HEADERS: raise HTTPException(500,'Google Sheet headers are incorrect.')
  return s
 except HTTPException: raise
 except APIError: raise HTTPException(503,'Google Sheets temporarily unavailable.')
 except Exception: raise HTTPException(503,'Could not connect to Google Sheets.')
def users():
 s=sheet()
 try:return s,s.get_all_records()
 except APIError:raise HTTPException(503,'Could not read user records.')
def token_for(username):
 now=datetime.now(timezone.utc)
 return jwt.encode({'sub':username,'iat':now,'exp':now+timedelta(hours=2)},JWT_SECRET,algorithm='HS256')
def current_user(c:HTTPAuthorizationCredentials=Depends(security)):
 try:
  name=jwt.decode(c.credentials,JWT_SECRET,algorithms=['HS256']).get('sub')
  if not name: raise HTTPException(401,'Invalid token.')
 except jwt.ExpiredSignatureError: raise HTTPException(401,'Token expired. Please log in again.')
 except jwt.InvalidTokenError: raise HTTPException(401,'Invalid token.')
 _,rows=users()
 u=next((x for x in rows if str(x.get('username',''))==name),None)
 if not u: raise HTTPException(401,'User not found.')
 return u
@app.get('/')
def home():return {'message':'NovaPay Backend is running'}
@app.get('/api/health')
def health():return {'status':'ok'}
@app.get('/api/sheets-test')
def sheets_test():
 s=sheet();return {'status':'connected','worksheet':s.title,'headers':s.row_values(1)}
@app.post('/api/register',status_code=201)
def register(d:Register):
 name=d.username.strip();email=d.email.strip().lower()
 if not name or '@' not in email:raise HTTPException(400,'Enter a valid username and email.')
 s,rows=users()
 if any(str(x.get('username','')).strip().lower()==name.lower() for x in rows):raise HTTPException(409,'Username already exists.')
 if any(str(x.get('email','')).strip().lower()==email for x in rows):raise HTTPException(409,'Email already exists.')
 try:s.append_row([name,hasher.hash(d.password),str(uuid.uuid4()),'[]','0.00',email,''],value_input_option='RAW')
 except APIError:raise HTTPException(503,'Could not save account. Try again.')
 return {'message':'Account created','username':name,'token':token_for(name),'token_type':'bearer'}
@app.post('/api/login')
def login(d:Login):
 _,rows=users();u=next((x for x in rows if str(x.get('username','')).strip().lower()==d.username.strip().lower()),None)
 if not u:raise HTTPException(401,'Invalid username or password.')
 try:valid=hasher.verify(d.password,str(u.get('password_hash','')))
 except Exception:valid=False
 if not valid:raise HTTPException(401,'Invalid username or password.')
 return {'message':'Login successful','username':u['username'],'token':token_for(u['username']),'token_type':'bearer'}
@app.get('/api/wallet')
def wallet(u=Depends(current_user)):
 try:
  balance=Decimal(str(u.get('wallet_money','0.00')))
  if not balance.is_finite():raise InvalidOperation
 except (InvalidOperation,ValueError):raise HTTPException(500,'Wallet balance is invalid.')
 return {'wallet_id':u['wallet_id'],'wallet_money':str(balance),'currency':'EGP'}
@app.get('/api/transactions')
def transactions(u=Depends(current_user)):
 try:
  items=json.loads(u.get('transactions','[]') or '[]')
  if not isinstance(items,list):raise ValueError
 except (ValueError,TypeError):raise HTTPException(500,'Stored transactions data is invalid.')
 return {'transactions':items}
