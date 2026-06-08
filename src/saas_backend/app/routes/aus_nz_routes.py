import sys
import os
import io
import json # 🆕 Added for stats serialization
from datetime import datetime # 🆕 Added for logging timestamps
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional

# Resolve path for 'automation_aus_nz'
current_file_path = os.path.abspath(__file__)
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file_path)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Standard imports
from automation_aus_nz.Processors.dedicated_processor import run_pipeline as run_dedicated
from automation_aus_nz.Processors.ip_processor import run_pipeline as run_ip
from automation_aus_nz.Processors.utils import google_sheets_helper

router = APIRouter()
SPREADSHEET_ID = "1BTh_zIm5KqIN35SLOwUX-ernV21nLCaJCuY_BK6USDs"

# 1. 👥 NEW: Fetch Team Members for React Dropdown
@router.get("/team")
async def get_team():
    names = google_sheets_helper.get_team_members(SPREADSHEET_ID)
    return {"members": names}

# 2. 📝 NEW: Final Log to Google Sheets (Triggered by React)
@router.post("/log-qi")
async def log_qi_run(data: dict = Body(...)):
    """
    Payload: { "user": "...", "media": "...", "market": "...", 
               "multiplier": 1.23, "qi_value": 450000, "status": "Increased" }
    """
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
    log_row = [
        timestamp,                    # Col A: Date Logged
        data.get('latest_file_date'), # Col B: Latest File Date (🆕 Was missing/misplaced)
        data.get('user'),             # Col C: User
        data.get('media'),            # Col D: Media Type
        data.get('market'),           # Col E: Market
        data.get('multiplier'),       # Col F: Multiplier Applied
        data.get('qi_value'),         # Col G: Total QI Value
        data.get('status')            # Col H: Status
    ]
    
    success = google_sheets_helper.append_qi_log(SPREADSHEET_ID, log_row)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to log to Master Tracker")
    
    return {"message": "Master Tracker Updated"}

# 3. ⚙️ UPDATED: Process Endpoint
@router.post("/process")
async def process_aus_nz_data(
    market: str = Form(...),
    media_type: str = Form(...),
    return_diagnostic: str = Form("false"),
    files: List[UploadFile] = File(...)
):
    is_qa_mode = return_diagnostic.lower() == "true"
    
    print(f"🚀 Processing Request: {media_type} | {market} | QA Mode: {is_qa_mode}")
    
    try:
        # Step 1: Handshake
        google_sheets_helper.test_connection(SPREADSHEET_ID)
        
        # Step 2: Synthesis
        # 🚨 result is now a dict: {"file": io.BytesIO, "stats": {...}}
        if media_type == "Dedicated":
            result = run_dedicated(market, files, return_diagnostic=is_qa_mode)
        else:
            result = run_ip(market, files[0], return_diagnostic=is_qa_mode)

        result_buffer = result["file"]
        stats = result["stats"]

        # Step 3: Stream File
        prefix = "QA_" if is_qa_mode else ""
        filename = f"{prefix}{media_type}_{market}_Master.xlsx"
        
        # 🚨 THE SECRET SAUCE: Add 'X-QI-Stats' and expose it to the browser
        headers = {
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "X-QI-Stats, X-Audit-Status",
            "X-Audit-Status": "Success",
            "X-QI-Stats": json.dumps(stats) 
        }
        
        return StreamingResponse(
            result_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
    except Exception as e:
        print(f"🔥 Backend Crash: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))