import pandas as pd
import numpy as np
import io
import re
import warnings
from datetime import datetime
from .utils import excel_helper, google_sheets_helper

# --- 1. INITIALIZATION ---
pd.set_option('future.no_silent_downcasting', True)
warnings.simplefilter(action='ignore', category=UserWarning)

def run_pipeline(market, uploaded_files, return_diagnostic=False):
    print(f"--- 🚀 Executing Synchronized Multi-Key Pipeline: {market} ---")
    SPREADSHEET_ID = "1BTh_zIm5KqIN35SLOwUX-ernV21nLCaJCuY_BK6USDs"
    
    # 1. LOAD LOOKUP ENGINE
    REQUIRED_SHEETS = ['New Cricket Events', 'Event', 'National Teams', 'Stadium_Concat', 'Stadium', 'Global Asset Rules', 'Industry', 'Matchday Shorthand Abbreviation']
    sheets_dict = google_sheets_helper.get_sheets_as_df_dict(SPREADSHEET_ID, REQUIRED_SHEETS)

    # 🚨 FIX: Safe sheet retrieval using .get() to prevent unpacking errors
    l_cricket = sheets_dict.get('New Cricket Events', pd.DataFrame())
    l_event = sheets_dict.get('Event', pd.DataFrame())
    l_nt = sheets_dict.get('National Teams', pd.DataFrame())
    l_std_concat = sheets_dict.get('Stadium_Concat', pd.DataFrame())
    l_stadium = sheets_dict.get('Stadium', pd.DataFrame())
    l_assets = sheets_dict.get('Global Asset Rules', pd.DataFrame())
    l_industry = sheets_dict.get('Industry', pd.DataFrame())
    l_ms = sheets_dict.get('Matchday Shorthand Abbreviation', pd.DataFrame())

    def u_clean_val(v): 
        if pd.isna(v) or str(v).lower() in ['nan', 'none', '']: return ""
        return re.sub(r'[^A-Z0-9]', '', str(v).upper()).strip()

    # --- 2. DICTIONARY BUILDING ---
    map_l1_master = {u_clean_val(k): v for k, v in zip(l_std_concat.iloc[:, 6], l_std_concat.iloc[:, 7])}
    map_l2_nt = {u_clean_val(r.iloc[3]): r.iloc[4] for _, r in l_nt.iterrows()}
    map_sport = {u_clean_val(k): v for k, v in zip(l_event.iloc[:, 0], l_event.iloc[:, 1])}
    map_yn = {u_clean_val(k): v for k, v in zip(l_event.iloc[:, 0], l_event.iloc[:, 2])}
    map_ms = {str(k).strip(): str(v).strip() for k, v in zip(l_ms.iloc[:, 0], l_ms.iloc[:, 1])}
    map_cricket = {u_clean_val(str(r.iloc[0]) + str(r.iloc[1]) + str(r.iloc[2])): r.iloc[4] for _, r in l_cricket.iterrows()}
    map_asset = {u_clean_val(str(r.iloc[0]) + str(r.iloc[1])): r.iloc[3] for _, r in l_assets.iterrows()}
    industry_map = {u_clean_val(r.iloc[0]): [r.iloc[1], r.iloc[2]] for _, r in l_industry.iterrows()}

    # --- 3. DATA INGESTION & SOP SYNTHESIS (The Brain) ---
    all_raw_dfs = []
    for f in uploaded_files:
        temp = pd.read_excel(f.file)
        temp.columns = temp.columns.str.strip()
        temp['__filename__'] = f.filename
        cols = ['sport','event','stadium','brand','tool','location','sponsored team (EA)','matchday','match','country','AVE (100%)','QI value','programme','programme category','channel','season','sequences','total exposure','progr. start (date)', 'QI Score (in %)']
        for col in cols:
            if col not in temp.columns: temp[col] = 0 if 'Score' in col or 'value' in col else ""
        all_raw_dfs.append(temp)
    
    df_raw = pd.concat(all_raw_dfs, ignore_index=True)

    if market.upper() == "AUS":
        is_gf = df_raw['__filename__'].str.contains("Aus Default|Aus Vbrand", case=False, na=False)
        is_tvgi = df_raw['__filename__'].str.contains("AFL|NRL", case=False, na=False)
        pre_mask = df_raw['matchday'].astype(str).str.contains(r'Pre-?season|All\s?Star', case=False, na=False)
        
        tvgi_list = ["Australian Football League", "Australian Football League Women", "National Rugby League", "NRL All Stars", "NRL Women's Premiership"]
        to_purge_mask = is_gf & df_raw['event'].isin(tvgi_list) & ~pre_mask
        
        df_processed = pd.concat([
            df_raw[is_gf & ~(pre_mask | to_purge_mask)], 
            df_raw[is_tvgi], 
            df_raw[is_gf & pre_mask]
        ], ignore_index=True).reset_index(drop=True)
    else:
        df_processed = df_raw[df_raw['__filename__'].str.contains("NZ|NEWZEALAND", case=False, na=False)].copy().reset_index(drop=True)

    # --- 4. WATERFALL LOGIC ---
    df_processed['tmp_sport_pre'] = df_processed['event'].apply(u_clean_val).map(map_sport).fillna(df_processed['sport'])
    cr_key = (df_processed['event'].astype(str) + df_processed['tmp_sport_pre'].astype(str) + df_processed['matchday'].astype(str)).apply(u_clean_val)
    df_processed['event'] = cr_key.map(map_cricket).fillna(df_processed['event'])

    df_processed['tmp_ev'] = df_processed['event'].astype(str).str.strip()
    df_processed['tmp_tm'] = df_processed['sponsored team (EA)'].astype(str).replace(['nan','_','None','NAN'], '').str.strip()
    df_processed['tmp_nii'] = (df_processed['tool'].astype(str) + " " + df_processed['location'].astype(str).replace(['nan','_','None'],'')).str.strip()
    
    c_col = df_processed['country'].fillna('Australia').astype(str)
    df_processed['L1_KEY'] = (c_col + df_processed['tmp_ev'] + df_processed['stadium'].astype(str) + df_processed['brand'].astype(str) + df_processed['tmp_nii'] + df_processed['tmp_tm']).apply(u_clean_val)
    df_processed['sport'] = df_processed['tmp_ev'].apply(u_clean_val).map(map_sport).fillna(df_processed['tmp_sport_pre'])
    df_processed['L2_KEY'] = (df_processed['tmp_ev'] + df_processed['sport'] + df_processed['tmp_tm']).apply(u_clean_val)

    # Waterfall Start
    df_processed['final_prop'] = df_processed['L1_KEY'].map(map_l1_master).fillna("")
    df_processed['Logic_Step_Tracker'] = "L5: Event Fallback"
    df_processed.loc[df_processed['final_prop'] != "", 'Logic_Step_Tracker'] = "L1: Stadium Concat"

    # L2 National Team Sharpener
    nt_ref = df_processed['L2_KEY'].map(map_l2_nt).fillna("")
    generic_results = ['AUSTRALIA', 'NEW ZEALAND', 'AUSTRALIA (W)', 'NEW ZEALAND (W)']
    nt_mask = (nt_ref != "") & ((df_processed['final_prop'] == "") | (df_processed['final_prop'].str.upper().isin(generic_results)))
    df_processed.loc[nt_mask, 'final_prop'] = nt_ref
    df_processed.loc[nt_mask, 'Logic_Step_Tracker'] = "L2: National Team Refined"

    # L3 Raw Team Fallback
    l3_mask = (df_processed['final_prop'] == "") & (df_processed['tmp_tm'] != "")
    df_processed.loc[l3_mask, 'final_prop'] = df_processed['tmp_tm']
    df_processed.loc[l3_mask, 'Logic_Step_Tracker'] = "L3: Raw Team"

    df_processed['Sport 24 Sponsorship Property/Team'] = df_processed['final_prop'].where(df_processed['final_prop'] != "", df_processed['tmp_ev'])
    
    # L4 Naming Rights (🚨 Fixed: Scalar assignment to prevent inhomogeneous shape crash)
    naming_rights = {"OPTUS": "Optus Stadium", "MARVEL": "Marvel Stadium", "GMHBA": "GMHBA Stadium", "MARS": "Mars Stadium", "SUNCORP": "Suncorp Stadium", "ALLIANZ": "Allianz Stadium Sydney", "ACCOR": "Accor Stadium", "AAMI": "AAMI Park", "RAC": "RAC Arena", "QUDOS BANK ARENA": "Qudos Bank Arena", "MYSTATE BANK ARENA": "MyState Bank Arena", "WIN ENTERTAINMENT CENTRE": "WIN Entertainment Centre", "GIO": "GIO Stadium", "GABBA": "Brisbane Cricket Ground (The Gabba)"}
    for kw, venue in naming_rights.items():
        nr_mask = (df_processed['Logic_Step_Tracker'] == "L5: Event Fallback") & (df_processed['brand'].astype(str).str.upper().str.contains(kw))
        df_processed.loc[nr_mask, 'Sport 24 Sponsorship Property/Team'] = venue
        df_processed.loc[nr_mask, 'Logic_Step_Tracker'] = f"L4: Naming Rights ({kw})"

    # --- 5. NUMERICAL RECOVERY & METADATA ---
    df_processed['progr. start (date)'] = pd.to_datetime(df_processed['progr. start (date)'], errors='coerce').dt.date
    
    for col in ['AVE (100%)', 'QI value', 'QI Score (in %)']:
        df_processed[col] = pd.to_numeric(df_processed[col], errors='coerce').fillna(0.0)
    
    # RESCUE RULE: If AVE > 0 but QI is 0, QI pulls from AVE
    rescue_mask = (df_processed['AVE (100%)'] > 0) & (df_processed['QI value'] == 0)
    df_processed.loc[rescue_mask, 'QI value'] = df_processed['AVE (100%)']
    df_processed.loc[rescue_mask, 'QI Score (in %)'] = 100.0

    df_processed['QI Score (in %)'] = (df_processed['QI value'] / df_processed['AVE (100%)'].replace(0, np.nan) * 100).fillna(0)

    # Verbal Mentions
    df_processed.loc[df_processed['tool'].astype(str).str.lower().str.contains('verbal mention'), 'QI Score (in %)'] = 100.0

    # Brand & Industry
    brand_res = df_processed['brand'].apply(u_clean_val).map(industry_map)
    df_processed['Sport 24 Brand'] = [val[0] if isinstance(val, list) else b for b, val in zip(df_processed['brand'], brand_res)]
    df_processed['Sport 24 Brand Industry'] = [val[1] if isinstance(val, list) else "" for val in brand_res]
    df_processed['new inventory item'] = (df_processed['sport'].apply(u_clean_val) + df_processed['tmp_nii'].apply(u_clean_val)).map(map_asset).fillna(df_processed['tmp_nii'])
    df_processed['Sport 24 Event (Y/N)'] = df_processed['tmp_ev'].apply(u_clean_val).map(map_yn).fillna('No')
    df_processed['matchday (shorthand)'] = df_processed['matchday'].astype(str).str.strip().map(map_ms).fillna(df_processed['matchday'])
    
    df_processed = df_processed.sort_values(by=['progr. start (date)', 'match', 'matchday']).reset_index(drop=True)
    master_year = pd.to_datetime(df_processed['progr. start (date)']).dt.year.mode()[0] if not df_processed.empty else 2026
    m_id = 'Australia' if market.upper() == 'AUS' else 'NewZealand'
    df_processed['Nielsen Sports ID'] = [f"Sport24{m_id}{master_year}-{i+1}" for i in range(len(df_processed))]
    df_processed['country'] = 'Australia' if market.upper() == 'AUS' else 'New Zealand'
    df_processed['media type'] = df_processed['media type (generic)'] = "Dedicated"; df_processed['broadcast season'] = master_year; df_processed['image/editorial'] = "Video"; df_processed['currency'] = "AUD" if market.upper() == "AUS" else "NZD"

    # --- 6. QI SUMMATION, DATE TRACKING & COMPARISON LOGIC ---
    
    # 🆕 A. Find the Latest Program Date from the processed data
    # Dedicated usually handles multiple files, so we find the max date across all rows
    temp_dates = pd.to_datetime(df_processed['progr. start (date)'], errors='coerce')
    latest_file_date = temp_dates.max().strftime('%d/%m/%Y') if not temp_dates.empty else "N/A"

    # B. Calculate Current Total
    current_qi_total = float(df_processed['QI value'].sum())
    
    # C. Identify Multiplier used for logging
    multiplier_val = 1.2381 if market.upper() == "NZ" else 1.0
    
    # D. Fetch Last Known Value from Google Sheet Tracker
    last_qi_total = google_sheets_helper.get_last_qi_record(SPREADSHEET_ID, "Dedicated", market.upper())

    # E. Determine growth status
    is_growth_positive = current_qi_total > last_qi_total

    # --- 7. EXPORT ---
    master_headers = ["Nielsen Sports ID", "progr. start (date)", "country", "media type", "media type (generic)", "programme category", "match", "matchday", "matchday (shorthand)", "programme", "channel", "event", "sport", "season", "broadcast season", "stadium", "brand", "tool", "location", "new inventory item", "sponsored team (EA)", "image/editorial", "sequences", "total exposure", "currency", "AVE (100%)", "QI value", "QI Score (in %)", "Sport 24 Sponsorship Property/Team", "Sport 24 Brand", "Sport 24 Brand Industry", "Sport 24 Event (Y/N)"]
    
    output = io.BytesIO()
    
    if return_diagnostic:
        # 🚨 QA/DIAGNOSTIC MODE
        diagnostic_headers = master_headers + ["L1_KEY", "L2_KEY", "Logic_Step_Tracker"]
        df_final = df_processed.reindex(columns=diagnostic_headers, fill_value="").fillna("")
        
        with pd.ExcelWriter(output, engine='xlsxwriter', datetime_format='dd-mm-yyyy') as writer:
            df_final.to_excel(writer, sheet_name="1_Aus_Output", index=False)
            
            if market.upper() == "AUS":
                df_raw[to_purge_mask].to_excel(writer, sheet_name="2_Purged_Old_TVGI", index=False)
                df_raw[is_tvgi].to_excel(writer, sheet_name="3_New_TVGI_Added", index=False)
    else:
        # STANDARD MODE: Apply styling via excel_helper
        excel_helper.save_styled_xlsx(df_processed.reindex(columns=master_headers, fill_value=""), output, market)

    output.seek(0)

    # 🚨 RETURN THE WRAPPER DICTIONARY WITH THE NEW DATE 🚨
    return {
        "file": output,
        "stats": {
            "current_total": round(current_qi_total, 2),
            "last_total": round(last_qi_total, 2),
            "is_growth_positive": is_growth_positive,
            "multiplier": multiplier_val,
            "latest_file_date": latest_file_date  # 🆕 Added this key!
        }
    }