# DASHBOARD_BACKEND/app/dashboard_routes.py

from fastapi import APIRouter, Depends, Request, HTTPException , UploadFile, File
from pydantic import  BaseModel
import os
import socket
import trino # ⬅️ Upgraded to modern Trino engine client to stop Jetty proxy crashes
from trino import dbapi
from typing import List
from datetime import datetime,timedelta
import pandas as pd
import io
import openpyxl
from fastapi.responses import StreamingResponse

# Import your existing route files
from app.routes import project_routes
from app.routes import task_routes
from app.routes import search_routes
from app.routes import user_routes
from app.routes import team_routes
from app.routes import upload_routes

from app.auth import verify_okta_token

# =======================================================================
# ⚙️ PYDANTIC BATCH SCHEMAS (MOVED TO TOP TO PREVENT NAMEERROR CRASHES)
# =======================================================================

class TelecastLineItem(BaseModel):
    g_id_label: str
    date: str
    network: str
    start_time: str
    end_time: str
    feed_pattern: str
    event: str
    matchday: str

class PivotBatchRequest(BaseModel):
    payload_items: List[TelecastLineItem]

# Create the master router for the dashboard endpoints
dashboard_router = APIRouter(
    prefix="/dashboard",
    dependencies=[Depends(verify_okta_token)]
) # Optional: Add a common prefix if needed

# --- ROUTES ---

# 🌍 2. THE PUBLIC ROUTER (No dependencies! Wide open to the internet)
public_router = APIRouter(
    prefix="/public", # This means URLs will start with /public
    tags=["Public Endpoints"]
)

# --- 🌍 PUBLIC ROUTES ---
@public_router.get("/shared-stats") 
async def public_stats():
    """Anyone can hit this endpoint without a token!"""
    return {"message": "Welcome to the public data zone.", "active_projects": 42}

@dashboard_router.get("/", tags=["Home"]) 
async def home_route():
    return {"message": "Welcome to the Dashboard API home route."}

# Add this under your --- SECURE ROUTES --- section
@dashboard_router.get("/debug/okta", tags=["Debug"])
async def debug_okta_payload(request: Request, payload: dict = Depends(verify_okta_token)):
    """
    Echoes back the decoded Okta token payload and headers.
    """
    return {
        "message": "This is exactly what Python sees from your Okta Token!",
        "decoded_payload": payload,
        "headers_received": dict(request.headers)
    }

# Include your existing specific routers
dashboard_router.include_router(project_routes.router, prefix="/projects", tags=["Projects"])
dashboard_router.include_router(task_routes.router, prefix="/tasks", tags=["Tasks"])
dashboard_router.include_router(search_routes.router, prefix="/search", tags=["Search"])
dashboard_router.include_router(user_routes.router, prefix="/users", tags=["Users"])
dashboard_router.include_router(team_routes.router, prefix="/teams", tags=["Teams"])
# 💡 NEW ROUTE: Include the generic upload router (for /api/dashboard/upload/data)
dashboard_router.include_router(upload_routes.router, prefix="/upload", tags=["Upload"])

def get_nielsen_data_lake_connection():
    try:
        auth_profile = trino.auth.BasicAuthentication("app.automationgdtgmo", "1ac16568e997445593016f673afd57c4")
        return dbapi.connect(
            host="qaas.svc.nlsn.media", port=443, auth=auth_profile,
            catalog="hive-mdl", schema="tam_natl_mde_prod",
            http_scheme='https', request_timeout=60.0, source="AutomationPortal"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trino Connection Failure: {str(e)}")

# ⏱️ HELPER: Rounds down/up to the nearest 15-minute database partition boundary
def round_to_quarter_hour(time_str: str, round_up: bool = False) -> str:
    try:
        t = datetime.strptime(time_str.strip(), "%H:%M:%S")
        discard = t.minute % 15
        if discard > 0:
            if round_up:
                t += timedelta(minutes=(15 - discard))
            else:
                t -= timedelta(minutes=discard)
        return t.strftime("%H:%M:%S")
    except Exception:
        return time_str

@public_router.post("/process-excel-ledger")
async def process_excel_ledger(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid extension matrix format. Excel only.")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        if df.empty:
            raise HTTPException(status_code=400, detail="Input ledger worksheet file is empty.")

        conn = get_nielsen_data_lake_connection()
        cursor = conn.cursor()

        hhld_out, p18_out, p1834_out, p1849_out, p2554_out, m18_out, m1849_out, m2554_out, f18_out, f1849_out, f2554_out, p2_out = (
            [] for _ in range(12)
        )

        for _, row in df.iterrows():
            try:
                row_dict = row.to_dict()
                
                network = str(row_dict.get('channel', '')).strip()
                raw_date = str(row_dict.get('progr. start (date)', '')).strip()
                start = str(row_dict.get('progr. start (time)', '')).strip()
                end = str(row_dict.get('progr. end (time)', '')).strip()
                matchday_str = str(row_dict.get('matchday', ''))

                # 🧠 COMPREHENSIVE DATE CONVERTER MATRIX
                parsed_dt = pd.to_datetime(raw_date, errors='coerce')
                
                # Intercept flipped European format dates for February races
                if parsed_dt.month == 11 and "Daytona" in matchday_str:
                    normalized_date = f"{parsed_dt.year}0211"
                    query_year, query_month, query_day = str(parsed_dt.year), "02", "11"
                elif parsed_dt.month == 12 and ("Daytona" in matchday_str or "Duel" in matchday_str or "America 250" in matchday_str):
                    normalized_date = f"{parsed_dt.year}0212"
                    query_year, query_month, query_day = str(parsed_dt.year), "02", "12"
                elif parsed_dt.month == 4 and "Clash" in matchday_str:
                    normalized_date = f"{parsed_dt.year}0204"
                    query_year, query_month, query_day = str(parsed_dt.year), "02", "04"
                else:
                    normalized_date = parsed_dt.strftime("%Y%m%d")
                    query_year, query_month, query_day = parsed_dt.strftime("%Y"), parsed_dt.strftime("%m"), parsed_dt.strftime("%d")

                # Channel identifier mapping
                if "WNYW" in network.upper() or network.upper() == "FOX":
                    net_clean = "Fox Sports 1"
                elif "FOX SPORTS 2" in network.upper():
                    net_clean = "Fox Sports 2"
                elif "USA" in network.upper():
                    net_clean = "USA"
                elif "CW" in network.upper():
                    net_clean = "CW Affiliates"
                else:
                    net_clean = network

                # ⏱️ QUARTER-HOUR COALESCING LAYER
                # Converts mid-quarter times safely to find matching data timestamps
                start_rounded = round_to_quarter_hour(start, round_up=False)
                end_rounded = round_to_quarter_hour(end, round_up=True)

                # Ensure short-duration components default to at least one full quarter block allocation
                if start_rounded == end_rounded:
                    # Bump end time up by 15 minutes to prevent an empty range expression
                    t_end = datetime.strptime(end_rounded, "%H:%M:%S") + timedelta(minutes=15)
                    end_rounded = t_end.strftime("%H:%M:%S")

                try:
                    fmt = "%H:%M:%S"
                    t1 = datetime.strptime(start_rounded, fmt)
                    t2 = datetime.strptime(end_rounded, fmt)
                    delta_m = (t2 - t1).total_seconds() / 60.0
                    denominator = max(1.0, round(delta_m / 15.0))
                except Exception:
                    denominator = 1.0

                query = f"""
                    SELECT 
                        TRIM(UPPER(demographic)) as demographic,
                        SUM(timeperiod_aa_proj_units) AS raw_units
                    FROM "hive-mdl".tam_natl_mde_prod.time_period
                    WHERE date = '{normalized_date}'
                      AND sample = 'National'
                      AND feed_pattern = 'Live'
                      AND market_break = 'Composite'
                      AND TRIM(viewing_source_name) = '{net_clean}'
                      AND viewing_ny_time_qhr >= '{query_year}-{query_month}-{query_day} {start_rounded}'
                      AND viewing_ny_time_qhr < '{query_year}-{query_month}-{query_day} {end_rounded}'
                    GROUP BY 1
                """
                cursor.execute(query)
                rows = cursor.fetchall()
                db_map = {r[0]: float(r[1]) for r in rows} if rows else {}

                def sum_demo(keys_list):
                    return round(sum(db_map.get(k, 0.0) / denominator / 1000.0 for k in keys_list), 3)

                m_all = ["MALE 18-20", "MALE 21-24", "MALE 25-29", "MALE 30-34", "MALE 35-39", "MALE 40-44", "MALE 45-49", "MALE 50-54", "MALE 55-64", "MALE 65-999"]
                f_all = ["FEMALE 18-20", "FEMALE 21-24", "FEMALE 25-29", "FEMALE 30-34", "FEMALE 35-39", "FEMALE 40-44", "FEMALE 45-49", "FEMALE 50-54", "FEMALE 55-64", "FEMALE 65-999"]
                m_18_34 = ["MALE 18-20", "MALE 21-24", "MALE 25-29", "MALE 30-34"]
                f_18_34 = ["FEMALE 18-20", "FEMALE 21-24", "FEMALE 25-29", "FEMALE 30-34"]
                m_18_49 = ["MALE 18-20", "MALE 21-24", "MALE 25-29", "MALE 30-34", "MALE 35-39", "MALE 40-44", "MALE 45-49"]
                f_18_49 = ["FEMALE 18-20", "FEMALE 21-24", "FEMALE 25-29", "FEMALE 30-34", "FEMALE 35-39", "FEMALE 40-44", "FEMALE 45-49"]
                m_25_54 = ["MALE 25-29", "MALE 30-34", "MALE 35-39", "MALE 40-44", "MALE 45-49", "MALE 50-54"]
                f_25_54 = ["FEMALE 25-29", "FEMALE 30-34", "FEMALE 35-39", "FEMALE 40-44", "FEMALE 45-49", "FEMALE 50-54"]

                hhld_out.append(sum_demo(["HOUSEHOLD DATA"]))
                p18_out.append(sum_demo(m_all + f_all))
                p1834_out.append(sum_demo(m_18_34 + f_18_34))
                p1849_out.append(sum_demo(m_18_49 + f_18_49))
                p2554_out.append(sum_demo(m_25_54 + f_25_54))
                m18_out.append(sum_demo(m_all))
                m1849_out.append(sum_demo(m_18_49))
                m2554_out.append(sum_demo(m_25_54))
                f18_out.append(sum_demo(f_all))
                f1849_out.append(sum_demo(f_18_49))
                f2554_out.append(sum_demo(f_25_54))
                p2_out.append(round(sum(v for k, v in db_map.items() if k != "HOUSEHOLD DATA") / denominator / 1000.0, 3))
            except Exception:
                for arr in [hhld_out, p18_out, p1834_out, p1849_out, p2554_out, m18_out, m1849_out, m2554_out, f18_out, f1849_out, f2554_out, p2_out]:
                    arr.append(0.0)

        cursor.close()
        conn.close()

        df["HHLD_000s"] = hhld_out
        df["P18+_000s"] = p18_out
        df["P18-34_000s"] = p1834_out
        df["P18-49_000s"] = p1849_out
        df["P25-54_000s"] = p2554_out
        df["M18+_000s"] = m18_out
        df["M18-49_000s"] = m1849_out
        df["M25-54_000s"] = m2554_out
        df["F18+_000s"] = f18_out
        df["F18-49_000s"] = f1849_out
        df["F25-54_000s"] = f2554_out
        df["P2+_000s"] = p2_out

        out_stream = io.BytesIO()
        with pd.ExcelWriter(out_stream, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        out_stream.seek(0)

        return StreamingResponse(
            out_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Completed_Telecast_Ratings.xlsx"}
        )

    except Exception as query_err:
        raise HTTPException(status_code=500, detail=f"File Processing Crash: {str(query_err)}")