import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException, Body, Request
from pydantic import BaseModel
import base64
from io import BytesIO
import tensorflow as tf
from fastapi.middleware.cors import CORSMiddleware
import googleapiclient.errors
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

movenet = hub.load("https://tfhub.dev/google/movenet/singlepose/lightning/4")
print("MoveNet model loaded successfully.")

def detect_pose(image_np):
    image_resized = tf.image.resize_with_pad(tf.expand_dims(image_np, axis=0), 192, 192)
    
    image_resized = tf.cast(image_resized, tf.int32) 

    outputs = movenet.signatures["serving_default"](image_resized)
    
    keypoints = outputs['output_0'].numpy()
    
    return keypoints

class ImageData(BaseModel):
    image: str

@app.post("/analyze_pose/")
async def analyze_pose(data: ImageData):
    img_data = base64.b64decode(data.image.split(',')[1])  
    img_array = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    keypoints = detect_pose(image_rgb)

    return {"pose": keypoints.tolist()}  

load_dotenv()

SERVICE_ACCOUNT_FILE = os.getenv('SERVICE_ACCOUNT_FILE')
SPREADSHEET_ID = os.getenv('SPREADSHEET_ID')

class RepCountRequest(BaseModel):
    rep_count: int

def authenticate_google_sheets():
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    service = build('sheets', 'v4', credentials=credentials)
    return service

def write_to_google_sheet(rep_count):
    service = authenticate_google_sheets()

    range_to_check = "Sheet1!A:A"  
    result = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=range_to_check
    ).execute()

    values = result.get("values", [])  
    next_row = len(values) + 1 

    range_to_write = f"Sheet1!A{next_row}"  
    body = {
        "values": [[rep_count]]
    }

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=range_to_write,
        valueInputOption="RAW",
        body=body
    ).execute()

    print(f"Rep count {rep_count} written to row {next_row} in column A.")

@app.post("/write_to_sheet/")
async def write_to_sheet(request: RepCountRequest):
    try:
        write_to_google_sheet(request.rep_count)
        return {"message": "Rep count updated in Google Sheets"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response