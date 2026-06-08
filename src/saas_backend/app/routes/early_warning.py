# app/routes/early_warning.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx

# --- ✅ ADD THESE TWO NEW IMPORTS AT THE TOP OF THE FILE ---
import io
import pandas as pd
from fastapi.responses import StreamingResponse
import urllib.parse
# Import your unified pipeline orchestrator function
#  PASTE THIS EXACT LINE INSTEAD:
from early_warning_automation import run_unified_extraction_pipeline
router = APIRouter()


# --- PYDANTIC VALIDATION MODELS ---
class ExtractionInputSchema(BaseModel):
    username: str
    password: str
    overwrite_existing: bool
    target_dates: List[str]

# ✅ ADD This validation scheme layout model for your frontend table body fields
class ExportGSheetsPayloadSchema(BaseModel):
    file_name: str
    headers: List[str]
    rows: List[Dict[str, Any]]
# --- LIVE WORKSPACE ROUTE TARGETS ---

@router.get("/status")
async def get_extraction_status_metadata():
    """
    DEFAULT VIEW METADATA: Serves information regarding database update thresholds 
    to populate the frontend status banners automatically on mount.
    """
    # This acts as a placeholder or hooks directly into your gdrive_service script
    # to show users the latest date processed in Drive folder 1kXZ3J5OV97T9C5SJNCnU33J91vyepiux
    return {
        "status": "ONLINE",
        "refreshed_up_to": "2026-05-25",
        "display_label": "May 25, 2026"
    }


@router.post("/run")
async def trigger_extraction_job(payload: ExtractionInputSchema, background_tasks: BackgroundTasks):
    """
    CONTROL PANEL MODE RUNNER: Intercepts user parameters, validates the GlobalProtect
    VPN tunnel route state, and schedules your 3-stage extraction scripts in the background.
    """
    
    # 1. LIVE GLOBALPROTECT VPN CONNECTIVITY CHECK
    try:
        async with httpx.AsyncClient() as client:
            # Ping the private internal Nielsen URL host to verify tunnel routing state
            response = await client.get("https://bsa.map-p.sports.nlsn.media", timeout=4.0)
    except (httpx.ConnectTimeout, httpx.ConnectError):
        raise HTTPException(
            status_code=503, 
            detail="🚨 Network Connectivity Timeout. Private tunnel routing failed. Please verify your GlobalProtect VPN connection state and try again."
        )

    # Validate that dates are present if not running automated catch up
    if not payload.target_dates:
        raise HTTPException(status_code=400, detail="Target processing date queue cannot be empty.")

    # 2. ASSIGN PIPELINE TASK ASYNCHRONOUSLY TO BACKEND WORKER THREADS
    # This maps the calendar dates from payload.target_dates straight into your Python loops
    background_tasks.add_task(
        run_unified_extraction_pipeline,
        username_str=payload.username,
        password_str=payload.password,
        date_queue_strings=payload.target_dates,
        overwrite_flag=payload.overwrite_existing
    )
    
    return {
        "status": "PROCESSING",
        "message": f"Nielsen extraction initialized successfully for a batch tracking queue of {len(payload.target_dates)} dates."
    }
# Inside your app/routes/early_warning.py:
@router.post("/api/export-gsheets")
async def export_filtered_matrix_to_binary_stream(payload: ExportGSheetsPayloadSchema):
    """
    Architecturally isolated handler: Converts incoming data rows into an Excel 
    workbook in-memory stream, using an explicit, unambiguous API prefix route.
    """
    try:
        if not payload.rows:
            raise HTTPException(status_code=400, detail="Data payload rows cannot be empty.")
            
        # Convert incoming JSON rows right into a Pandas DataFrame
        df = pd.DataFrame(payload.rows)
        
        # Ensure all columns exist inside dataframe frame mapping structures
        for expected_header in payload.headers:
            if expected_header not in df.columns:
                df[expected_header] = "—"
        
        # Align column sequences exactly with frontend view indexing parameters
        df = df[payload.headers]
        
        # Write binary excel workbook bytes into an isolated memory buffer stream
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Filtered Stream Metrics")
            
            # Format custom auto-fit widths across column cells dynamically
            workbook = writer.book
            worksheet = workbook.active
            for col in worksheet.columns:
                cells_str = [str(cell.value or '') for cell in col]
                max_len = max(len(s) for s in cells_str) if cells_str else 10
                col_letter = chr(65 + col[0].column - 1) if col[0].column <= 26 else "A"
                worksheet.column_dimensions[col_letter].width = max(max_len + 3, 12)
                
        output.seek(0)
        
        # Stream the file down directly to the browser client instance window
        encoded_filename = urllib.parse.quote(f"{payload.file_name}.xlsx")
        headers = {
            'Content-Disposition': f"attachment; filename*=UTF-8''{encoded_filename}",
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
        
    except Exception as e:
        print(f"❌ Excel Matrix Streaming Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Spreadsheet stream compiler failure: {str(e)}")