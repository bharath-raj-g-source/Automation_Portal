import os
import io
import re
import logging
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List  # Added List here
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel      # Added BaseModel here
# 🛰️ ENTERPRISE GOOGLE DRIVE INTERACTION PIPELINE
from automation_aus_nz.Processors.utils.google_sheets_helper import get_creds
from googleapiclient.discovery import build

logger = logging.getLogger("uvicorn.error")
early_warning_router = APIRouter(prefix="/api/qc/early-warning")

TARGET_FOLDER_ID = "1kXZ3J5OV97T9C5SJNCnU33J91vyepiux"
MANDATORY_SPREADSHEET_ID = "1ME5vg9HXeWxKpj7_LR7nXUsWQ6WTzB-R"
# ✅ NEW CONSTANT: Targets your unique AURA Checklist spreadsheet file asset signature
AURA_SPREADSHEET_ID = "1VlSSDbLSQqlVgv7OHIx-GlEW5MsQ9OG_"
# ✅ NEW PYDANTIC VALIDATION PARSER: Validates array payload structures sent from SheetJS
class RoscoReconciliationPayload(BaseModel):
    channels: List[Dict[str, str]]
def parse_custom_date(date_str):
    if isinstance(date_str, datetime): return date_str
    s = str(date_str).strip()
    s_clean = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', s, flags=re.IGNORECASE)
    for fmt in ('%d %b %Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d'):
        try: return datetime.strptime(s_clean, fmt)
        except ValueError: continue
    return None

# ✅ REFACTORED INLINE COMPILER: Now accepts both mandatory and aura channel list structures
def compile_and_normalize_payload(df_bsa: pd.DataFrame, live_mandatory_channels: list, live_aura_channels: list) -> Dict[str, Any]:
    """Normalizes the extracted file sheets cleanly matching frontend layout contracts."""
    df_bsa.columns = [str(c).strip() for c in df_bsa.columns]
    
    src_chan_col = next((c for c in df_bsa.columns if "channel" in str(c).lower() or "station" in str(c).lower()), "TV-Channel")
    src_mkt_col = next((c for c in df_bsa.columns if "market" in str(c).lower() or "region" in str(c).lower()), "Market")
    src_id_col = next((c for c in df_bsa.columns if "channel id" in str(c).lower() or "id" in str(c).lower()), "Channel ID")
    src_pay_col = next((c for c in df_bsa.columns if "pay" in str(c).lower() or "tv" in str(c).lower()), "Pay/Free TV")

    core_cols_map = {src_chan_col, src_mkt_col, src_id_col, src_pay_col, "Region", "Broadcaster", "Market ID", "Final Status", "Critical Channel"}
    raw_date_cols = [c for c in df_bsa.columns if c not in core_cols_map]

    normalized_headers_map = {}
    date_columns_payload = []
    for c in raw_date_cols:
        cleaned_date = str(c).replace('.', '-').replace('/', '-').strip()
        parsed_date = parse_custom_date(cleaned_date)
        final_date_header = parsed_date.strftime('%d-%m-%Y') if parsed_date else cleaned_date
        normalized_headers_map[c] = final_date_header
        date_columns_payload.append(final_date_header)

    df_bsa = df_bsa.fillna("-").replace(r'^\s*$', "-", regex=True)
    bsa_view_json = []
    
    mandatory_lower_set = set(x.lower().strip() for x in live_mandatory_channels)
    # Convert aura channel items into a standard lowercase lookup array
    aura_lower_set = set(x.lower().strip() for x in live_aura_channels)

    for _, row in df_bsa.iterrows():
        cn = str(row.get(src_chan_col, "-")).strip()
        mkt = str(row.get(src_mkt_col, "-")).strip()
        cid = str(row.get(src_id_col, "-")).strip()
        pay_tv = str(row.get(src_pay_col, "-")).strip()

        is_critical = cn.lower() in mandatory_lower_set
        # ✅ NEW PROPERTY LOOKUP: Checks if row item channel exists in our new aura baseline array
        is_in_aura = cn.lower() in aura_lower_set
        
        row_statuses = [str(row.get(d, "")).lower() for d in raw_date_cols]

        if any("processing gaps" in s for s in row_statuses): final_s = "FLAG: PROCESSING GAPS"
        elif all("no schedule" in s for s in row_statuses) and row_statuses: final_s = "FLAG: NO SCHEDULE"
        elif any("no schedule" in s for s in row_statuses): final_s = "FLAG: PARTIAL SCHEDULE"
        else: final_s = "OK"

        row_item = {
            "TV Channel": cn, "Market": mkt, "Channel ID": cid, "Pay-Free TV": pay_tv,
            "Critical Channel": "CRITICAL" if is_critical else "Non-Critical", "Final Status": final_s,
            # Pass variable context over to frontend grid records safely
            "In Aura": "YES" if is_in_aura else "NO"
        }
        for original_col, normalized_col in normalized_headers_map.items():
            row_item[normalized_col] = str(row.get(original_col, "-")).strip()
        bsa_view_json.append(row_item)

    lookup_set = set(str(r["TV Channel"]).lower().strip() for r in bsa_view_json)
    
    # Generate the standard mandatory check array
    mandatory_audit = [{"Channel": m, "Found": "YES" if m.lower().strip() in lookup_set else "NO", "Status": "OK" if m.lower().strip() in lookup_set else "MISSING"} for m in live_mandatory_channels]
    
    # ✅ NEW METADATA OBJECT ARRAY: Builds a cross-reconciled list tracking coverage values for AURA stations explicitly
    aura_audit = [{"Channel": a, "Found": "YES" if a.lower().strip() in lookup_set else "NO", "Status": "OK" if a.lower().strip() in lookup_set else "MISSING"} for a in live_aura_channels]
    
    return {
        "bsa_view": bsa_view_json, 
        "rosco_view": [], 
        "mandatory_audit": mandatory_audit, 
        # Pack the aura analysis array into the return JSON packet boundary
        "aura_audit": aura_audit, 
        "date_columns": date_columns_payload
    }

@early_warning_router.get("/status")
async def get_early_warning_dashboard_matrix():
    try:
        creds = get_creds()
        drive_service = build('drive', 'v3', credentials=creds)

        # 🗂️ 1. Download baseline mandatory checklist over the wire
        m_request = drive_service.files().get_media(fileId=MANDATORY_SPREADSHEET_ID)
        m_stream = io.BytesIO(m_request.execute())
        df_mandatory_raw = pd.read_excel(m_stream, sheet_name=0)
        df_mandatory_raw.columns = [str(c).strip() for c in df_mandatory_raw.columns]
        chan_col_name = next((c for c in df_mandatory_raw.columns if "channel" in str(c).lower()), df_mandatory_raw.columns[0])
        live_mandatory_channels = df_mandatory_raw[chan_col_name].dropna().astype(str).str.strip().tolist()

        # 🗂️ 2. NEW OVER-THE-WIRE DATA GRAB: Pulls your fresh AURA checklist spreadsheet file matrix
        a_request = drive_service.files().get_media(fileId=AURA_SPREADSHEET_ID)
        a_stream = io.BytesIO(a_request.execute())
        df_aura_raw = pd.read_excel(a_stream, sheet_name=0)
        df_aura_raw.columns = [str(c).strip() for c in df_aura_raw.columns]
        aura_col_name = next((c for c in df_aura_raw.columns if "channel" in str(c).lower() or "station" in str(c).lower()), df_aura_raw.columns[0])
        live_aura_channels = df_aura_raw[aura_col_name].dropna().astype(str).str.strip().tolist()

        # 🔍 3. Find absolute latest consolidated file inside folder target volume
        query = f"'{TARGET_FOLDER_ID}' in parents and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed = false"
        response = drive_service.files().list(q=query, fields="files(id, name, createdTime)", supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        matching_files = [f for f in response.get('files', []) if "consolidated" in f.get('name', '').lower() or "bsa_report" in f.get('name', '').lower()]

        if not matching_files:
            raise HTTPException(status_code=404, detail="No matching Consolidated tracking sheets found in GDrive folder.")

        matching_files.sort(key=lambda x: x.get('createdTime', ''), reverse=True)
        media_request = drive_service.files().get_media(fileId=matching_files[0]['id'])
        file_stream = io.BytesIO(media_request.execute())

        try: df_bsa = pd.read_excel(file_stream, sheet_name="BSA_View")
        except Exception: file_stream.seek(0); df_bsa = pd.read_excel(file_stream, sheet_name=0)

        # Update compiler args configuration reference mappings
        payload_data = compile_and_normalize_payload(df_bsa, live_mandatory_channels, live_aura_channels)
        return JSONResponse(content={"status": "ONLINE", "cached_analysis": payload_data, "last_refreshed_file": matching_files[0]['name']})
    except Exception as e:
        logger.error(f"VIEW A HANDSHAKE FAULT: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# ✅ NEW RECONCILIATION ROUTE: Appended safely to the bottom of early_warning_api.py
@early_warning_router.post("/reconcile-rosco")
async def reconcile_client_rosco_pipeline(payload: RoscoReconciliationPayload):
    try:
        creds = get_creds()
        drive_service = build('drive', 'v3', credentials=creds)

        # 1. Pull down the Master AURA Comparison Dictionary
        a_request = drive_service.files().get_media(fileId=AURA_SPREADSHEET_ID)
        df_aura = pd.read_excel(io.BytesIO(a_request.execute()), sheet_name=0)
        df_aura.columns = [str(c).strip() for c in df_aura.columns]

        # 2. Pull down the Latest Consolidated BSA Tracking Matrix Data
        query = f"'{TARGET_FOLDER_ID}' in parents and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed = false"
        response = drive_service.files().list(q=query, fields="files(id, name, createdTime)", supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        matching_files = [f for f in response.get('files', []) if "consolidated" in f.get('name', '').lower() or "bsa_report" in f.get('name', '').lower()]
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="Consolidated database index files missing.")
            
        matching_files.sort(key=lambda x: x.get('createdTime', ''), reverse=True)
        media_request = drive_service.files().get_media(fileId=matching_files[0]['id'])
        df_bsa = pd.read_excel(io.BytesIO(media_request.execute()), sheet_name=0)
        df_bsa.columns = [str(c).strip() for c in df_bsa.columns]

        # Standardize matching helper functions
        def _normalize(s): return str(s or "").strip().lower()

        # Build optimization lookups for AURA matching indices
        # Maps (Normalized Channel Name, Normalized Country) -> AURA Row Data
        aura_map = {}
        for _, r in df_aura.iterrows():
            # Rule 3: Map Country-to-Market via direct string normalizations
            c_key = (_normalize(r.get("TV-Channel")), _normalize(r.get("Market")))
            aura_map[c_key] = r

        reconciled_payload_rows = []

        # 3. Process incoming ROSCO targets through the Priority Matching Engine
        for channel in payload.channels:
            r_name = channel.get("name", "")
            r_country = channel.get("country", "")
            
            norm_name = _normalize(r_name)
            norm_country = _normalize(r_country)

            # Pass 1: Translate ROSCO string to standard AURA identity metadata parameters
            matched_aura_row = aura_map.get((norm_name, norm_country), None)
            
            # Lenient check: If exact match fails, attempt lookup by clearing brackets/parentheses
            if matched_aura_row is None:
                cleaned_norm_name = re.sub(r"\(.*?\)|\[.*?\]", "", norm_name).strip()
                for (a_chan, a_mkt), a_row in aura_map.items():
                    a_chan_clean = re.sub(r"\(.*?\)|\[.*?\]", "", a_chan).strip()
                    if a_chan_clean == cleaned_norm_name and a_mkt == norm_country:
                        matched_aura_row = a_row
                        break

            target_channel_id = str(matched_aura_row.get("Channel ID", "")) if matched_aura_row is not None else None
            aura_standard_name = str(matched_aura_row.get("Channel Name Match", "—")) if matched_aura_row is not None else "—"
            is_in_aura = "YES" if matched_aura_row is not None else "NO"

            # Pass 2: Extract real-time scheduling metrics from Consolidated rows using Channel ID
            # Rule 5: Implement Row-Level Grouping to merge parallel sub-rows (Live/Delayed/Repeat)
            matching_bsa_rows = pd.DataFrame()
            if target_channel_id and target_channel_id != "nan":
                matching_bsa_rows = df_bsa[df_bsa[next((c for c in df_bsa.columns if "id" in c.lower()), df_bsa.columns[0])].astype(str) == target_channel_id]
            else:
                # Fallback to loose name lookup inside country space if channel ID is unavailable
                chan_col = next((c for c in df_bsa.columns if "channel" in c.lower() or "station" in c.lower()), df_bsa.columns[0])
                mkt_col = next((c for c in df_bsa.columns if "market" in c.lower() or "region" in c.lower()), df_bsa.columns[1])
                matching_bsa_rows = df_bsa[(df_bsa[chan_col].astype(str).str.lower().str.strip() == norm_name) & (df_bsa[mkt_col].astype(str).str.lower().str.strip() == norm_country)]

            # Aggregate schedule cells down to a single consolidated dictionary entity string
            system_health = "No Schedule Profile Available"
            if not matching_bsa_rows.empty:
                # Compile unified statuses across date headers
                core_header_keys = {"tv-channel", "market", "channel id", "pay/free tv", "region", "broadcaster", "market id", "final status", "critical channel"}
                date_headers = [c for c in df_bsa.columns if c.lower().strip() not in core_header_keys]
                
                combined_statuses = []
                for d_hdr in date_headers:
                    combined_statuses.extend(matching_bsa_rows[d_hdr].dropna().astype(str).str.lower().tolist())

                if any("processing gaps" in s for s in combined_statuses): system_health = "Processing Gaps"
                elif all("no schedule" in s for s in combined_statuses) and combined_statuses: system_health = "No Schedule"
                else: system_health = "Scheduled OK"

            # Rule 4: Compute the Composite "AURA Status Overrule" code tag logic
            final_badge_action = "CRITICAL_FAULT"
            if system_health == "Scheduled OK": 
                final_badge_action = "SUCCESS_OK"
            elif is_in_aura == "YES": 
                final_badge_action = "AURA_OVERRULE" # Triggers the deep Cobalt Blue badge variant
            elif system_health == "No Schedule": 
                final_badge_action = "AMBER_WARNING"

            reconciled_payload_rows.append({
                "index": len(reconciled_payload_rows) + 1,
                "rosco_name": r_name,
                "country": r_country,
                "aura_standard_name": aura_standard_name,
                "is_in_aura": is_in_aura,
                "system_health": system_health,
                "badge_code": final_badge_action
            })

        return JSONResponse(content={"status": "ONLINE", "reconciled_matrix": reconciled_payload_rows})

    except Exception as e:
        logger.error(f"ROSCO PIPELINE CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
