import os
import time
import shutil
import pandas as pd
import numpy as np
import io
import base64
import gc
from datetime import datetime

# --- CHANNEL NAME MAPPING ---
RAW_CHANNEL_MAPPING = {
    "American Heroes Channel": "American Heroes Channel", "Animal Planet": "Animal Planet",
    "Discovery en Espanol": "Discovery en Espanol", "FYI": "FYI", "HLN": "HLN",
    "Investigation Discovery": "Investigation Discovery", "Discovery Turbo": "Discovery Turbo",
    "Nat Geo Wild": "Nat Geo Wild", "National Geographic": "National Geographic",
    "OWN": "OWN", "Oxygen": "Oxygen", "Science": "Science", "TLC": "TLC",
    "TV One": "TV One", "Vice TV": "Vice TV", "National Geographic Mundo": "National Geographic Mundo",
    "Smithsonian Channel": "Smithsonian Channel", "Story Television": "Story Television",
    "Discovery Life Channel": "Discovery Life Channel", "The Weather Channel": "The Weather Channel",
    "Fox News": "Fox News", "NewsNation": "NewsNation", "Newsmax TV": "Newsmax TV",
    "Court TV": "Court TV", "MSNBC": "MSNBC", "CNN Espanol": "CNN Espanol",
    "Comedy.TV": "Comedy.TV", "beIN Sports USA": "beIN Sports USA",
    "FOX Sports 1": "Fox Sports 1 USA", "ESPNU": "ESPN USA", 
    "FOX Sports 2": "Fox Sports 2 USA", "GSN": "GSN", "E": "E",
    "Great American Family": "Great American Family", "Hallmark Mystery": "Hallmark Mystery",
    "MTV": "MTV", "MTV2": "MTV2", "Ovation": "Ovation", "SUNDANCE TV": "SUNDANCE TV",
    "TBS USA": "TBS USA", "Adult Swim": "Adult Swim", "Comedy Central": "Comedy Central",
    "FXX": "FXX", "MeTV Toons": "MeTV Toons", "Antenna TV": "Antenna TV",
    "Black Entertainment TV": "Black Entertainment TV", "Catchy Comedy": "Catchy Comedy",
    "Cleo TV": "Cleo TV", "CoziTV": "CoziTV", "DABL": "DABL", "Galavision": "Galavision",
    "IFC": "IFC", "Me TV": "Me TV", "Nick-at-Nite": "Nick-at-Nite", "TheGrio TV": "TheGrio TV",
    "TV Land": "TV Land", "Baby First TV": "Baby First TV", "Boomerang": "Boomerang",
    "Disney Channel": "Disney Channel", "Disney XD": "Disney XD", "Nick Jr.": "Nick Jr.",
    "CHARGE": "CHARGE", "Comet TV": "Comet TV", "Hallmark Family": "Hallmark Family",
    "Ion Television": "Ion Television", "Ion Mystery": "Ion Mystery", "Ion Plus": "Ion Plus",
    "Pop TV": "Pop TV", "Reelz": "Reelz", "Start TV": "Start TV", "UP": "UP",
    "USA Network": "USA Network", "WETV": "WETV", "Discovery Channel USA": "Discovery Channel USA",
    "Justice Central": "Justice Central", "ESPN 2 USA": "ESPN 2 USA", "NBA TV": "NBA TV",
    "BTN": "BTN", "TUDN USA": "TUDN USA", "Telemundo": "Telemundo", "ESPN Deportes": "ESPN Deportes",
    "Fox Deportes": "Fox Deportes", "Univision": "Univision", "CNN USA": "CNN USA",
    "CNBC USA": "CNBC USA", "Cooking Channel": "Cooking Channel", "Food Network Star": "Food Network Star",
    "Discovery Familia": "Discovery Familia", "Discovery Family": "Discovery Family",
    "HGTV USA": "HGTV USA", "DIY Network": "DIY Network", "Destination America": "Destination America",
    "Hogar de HGTV": "Hogar de HGTV", "RFD TV": "RFD TV", "Travel Channel": "Travel Channel",
    "Estrella TV": "Estrella TV", "Logo": "Logo", "GetTV": "GetTV", "TBD": "TBD",
    "Heroes + Icons": "Heroes + Icons", "INSP": "INSP", "Hallmark Channel": "Hallmark Channel",
    "Lifetime Movie Network": "Lifetime Movie Network", "Lifetime": "Lifetime",
    "Starz Primary": "Starz Primary", "A+E Network": "A+E Network", "History": "History",
    "Disney Junior": "Disney Junior", "Family ENT TV": "Family ENT TV", "Nicktoons": "Nicktoons",
    "Telexitos": "Telexitos", "Turner Network Television": "Turner Network Television",
    "TeenNick": "TeenNick", "NBC Universo": "NBC Universo", "The Cowboy Channel": "The Cowboy Channel",
    "The Golf Channel USA": "The Golf Channel USA", "Tennis Channel": "Tennis Channel",
    "Bounce TV": "Bounce TV", "Grit": "Grit", "FX Movie Channel": "FX Movie Channel",
    "TruTV": "TruTV", "Showtime Prime": "Showtime Prime", "Bet Her": "Bet Her",
    "Bravo": "Bravo", "NFL Network": "NFL Network", "Paramount Network": "Paramount Network",
    "beIN Sports Espanol USA": "beIN Sports Espanol USA", "VH1": "VH1", "LAFF": "LAFF",
    "Syfy": "Syfy", "UniMas": "UniMas", "BBC America": "BBC America", "NBC True CRMZ": "NBC True CRMZ",
    "ESPN USA": "ESPN USA", "AMC": "AMC", "FX": "FX", "MLB Network": "MLB Network",
    "CMT": "CMT", "HBO Prime": "HBO Prime", "CBS": "CBS", "NBC": "NBC", "ABC": "ABC",
    "Fox Business Network": "Fox Business Network", "Tlnovelas": "Tlnovelas",
    "Freeform": "Freeform", "Cartoon Network": "Cartoon Network", "Nickelodeon": "Nickelodeon",
    "CW": "CW", "FOX USA": "FOX USA", "MotorTrend": "MotorTrend", "GalaNovelas": "GalaNovelas",
    "FS1": "Fox Sports 1 USA", "FS2": "Fox Sports 2 USA", "FOX BUSINESS": "Fox Business Network",
    "DISCOVERY CHANNEL": "Discovery Channel USA", "CNBC": "CNBC USA", "USA": "USA Network",
    "ESPN2": "ESPN 2 USA", "FOX (WNYW) New York": "FOX USA"
}

CHANNEL_MAPPING = {k.strip().upper(): v.strip().upper() for k, v in RAW_CHANNEL_MAPPING.items()}

def get_numeric_serial_vectorized(df, date_col, time_col):
    """Calculates Excel-style date serials without the format warning."""
    try:
        dt = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce', format='%d/%m/%Y')
        if dt.isna().all():
            dt = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')

        tm = pd.to_datetime(df[time_col].astype(str), format='%H:%M:%S', errors='coerce')
        
        base_date = datetime(1899, 12, 30)
        date_ints = (dt - base_date).dt.days
        time_decs = (tm.dt.hour * 3600 + tm.dt.minute * 60 + tm.dt.second) / 86400.0
        return date_ints + time_decs
    except Exception:
        return np.nan

def get_duration_decimal(df, duration_col):
    """Converts a duration string (HH:MM:SS) into a fraction of a day for serial math."""
    try:
        tm = pd.to_timedelta(df[duration_col].astype(str), errors='coerce')
        return tm.dt.total_seconds() / 86400.0
    except Exception:
        return 0.0

def clean_val(val):
    if pd.isna(val) or str(val).strip().upper() in ["#N/A", "#REF!", "NAN", "-", ""]:
        return 0.0
    try:
        return float(str(val).replace('$', '').replace(',', '').strip())
    except:
        return 0.0

async def process_usa_audit_logic_stream(usa_data, export_file, cpm_file, upload_folder):
    timestamp = int(time.time())
    start_time = time.time()
    
    is_windows = os.name == 'nt'
    work_dir = upload_folder if is_windows else "/tmp"
    
    yield f"data: [LOG] USA Engine Active. OS: {'Windows' if is_windows else 'Linux/ECS'}\n\n"
    
    usa_p = os.path.join(work_dir, f"u_{timestamp}.xlsx")
    exp_p = os.path.join(work_dir, f"e_{timestamp}.xlsx")
    cpm_p = os.path.join(work_dir, f"c_{timestamp}.xlsx")

    # 1. Buffering to Disk
    try:
        for f_obj, p in [(usa_data, usa_p), (export_file, exp_p), (cpm_file, cpm_p)]:
            with open(p, "wb") as f:
                shutil.copyfileobj(f_obj.file, f)
        yield "data: [LOG] Step 1/7: Files safely buffered to disk.\n\n"
    except Exception as e:
        yield f"data: [ERROR] Disk Write Failure: {str(e)}\n\n"
        return

    # 2. Load USA Data
    yield "data: [LOG] Step 2/7: Loading USA Data...\n\n"
    try:
        xl_usa = pd.ExcelFile(usa_p, engine='calamine')
        target_sheet = next((s for s in xl_usa.sheet_names if "usadata" in s.lower() or "sheet1" in s.lower()), xl_usa.sheet_names[0])
        needed_indices = [4, 8, 12, 15, 30]
        
        df_usa_raw = pd.read_excel(xl_usa, sheet_name=target_sheet, skiprows=5, usecols=needed_indices)
        xl_usa.close()
        gc.collect()

        usa_lookup = pd.DataFrame({
            '_calc_serial': get_numeric_serial_vectorized(df_usa_raw, df_usa_raw.columns[1], df_usa_raw.columns[2]),
            '_join_chan': df_usa_raw.iloc[:, 0].astype(str).str.strip().str.upper(),
            '_val_aud': df_usa_raw.iloc[:, 4],
            '_val_prog': df_usa_raw.iloc[:, 3]
        }).dropna(subset=['_calc_serial']).sort_values('_calc_serial')
        
    except Exception as e:
        yield f"data: [ERROR] Failed to process USA file: {str(e)}\n\n"
        return

    # 3. Load CPM Lookups
    yield "data: [LOG] Step 3/7: Extracting CPM and Platform mappings...\n\n"
    xl_cpm = pd.ExcelFile(cpm_p, engine='calamine')
    
    cpm_sheet = next((s for s in xl_cpm.sheet_names if "cpm data" in s.lower()), None)
    df_cpm = pd.read_excel(xl_cpm, sheet_name=cpm_sheet, skiprows=2) if cpm_sheet else pd.DataFrame()
    cpm_map = {}
    if not df_cpm.empty:
        df_cpm.rename(columns={df_cpm.columns[0]: 'DMA'}, inplace=True)
        demo_col = f"{datetime.now().month}P2+"
        actual_col = demo_col if demo_col in df_cpm.columns else df_cpm.columns[1]
        cpm_map = df_cpm.set_index('DMA')[actual_col].to_dict()

    yt_lookup, pck_lookup = {}, {}
    yt_sheet = next((s for s in xl_cpm.sheet_names if "youtube" in s.lower()), None)
    if yt_sheet:
        df_yt = pd.read_excel(xl_cpm, sheet_name=yt_sheet)
        for _, r in df_yt.iterrows():
            mday = str(r.iloc[12]).strip().lower()
            tvm, dur = clean_val(r.iloc[14]), clean_val(r.iloc[15])
            est_aud = round((tvm / dur) / 1000, 3) if dur != 0 else 0
            yt_lookup[mday] = {'aud': est_aud, 'rate': round((est_aud * 10.66 / 30) / 1.31, 2)}

    pck_sheet = next((s for s in xl_cpm.sheet_names if "peacock" in s.lower()), None)
    if pck_sheet:
        df_pck = pd.read_excel(xl_cpm, sheet_name=pck_sheet)
        pck_lookup = {str(r.iloc[0]).strip().lower(): clean_val(r.iloc[1]) / 1.31 for _, r in df_pck.iterrows()}

    xl_cpm.close()
    del df_cpm
    gc.collect()

    # 4. Process Export Data & FIND INTERNAL OVERLAPS
    yield "data: [LOG] Step 4/7: Scanning Export file for internal overlaps...\n\n"
    xl_exp = pd.ExcelFile(exp_p, engine='calamine')
    df_export = pd.read_excel(xl_exp, skiprows=3)
    xl_exp.close()
    
    df_export['_original_idx'] = df_export.index
    df_export['_calc_serial'] = get_numeric_serial_vectorized(df_export, 'progr. start (date)', 'progr. start (time)')
    df_export['_duration_dec'] = get_duration_decimal(df_export, 'progr. duration')
    df_export['_export_end_serial'] = df_export['_calc_serial'] + df_export['_duration_dec']
    df_export['_join_chan'] = df_export['channel'].astype(str).str.strip().str.upper().apply(lambda x: CHANNEL_MAPPING.get(x, x))
    
    df_export['_date_int'] = df_export['_calc_serial'].fillna(0).astype(int)
    df_export['Internal Overlap'] = "No"
    
    # NEW LOGIC: Text-based explicit overlap flagging
    if 'matchday' in df_export.columns:
        # Matches if the string ends with a word boundary followed by rd or rdc
        text_mask = df_export['matchday'].astype(str).str.strip().str.lower().str.contains(r'\b(rd|rdc)$', regex=True, na=False)
        df_export['_explicit_subsegment'] = text_mask
    else:
        df_export['_explicit_subsegment'] = False
    
    # 30 minutes converted to Excel days
    buffer_dec = 30.0 / 1440.0 
    
    grouped = df_export.groupby(['_join_chan', '_date_int'])
    for _, group in grouped:
        group = group.sort_values('_duration_dec', ascending=False)
        main_intervals = []
        
        for idx, row in group.iterrows():
            start = row['_calc_serial']
            end = row['_export_end_serial']
            
            # Short-circuit: If text logic flagged it as RD/RDC, mark as overlap and skip math
            if row['_explicit_subsegment']:
                df_export.at[idx, 'Internal Overlap'] = "Yes"
                continue
            
            is_overlap = False
            for m_start, m_end in main_intervals:
                if start < (m_end + buffer_dec) and end > (m_start - buffer_dec):
                    is_overlap = True
                    break
                    
            if is_overlap:
                df_export.at[idx, 'Internal Overlap'] = "Yes"
            else:
                main_intervals.append((start, end))
    # --- THE FIX: Clean nulls out of the merge keys so Pandas doesn't panic ---
    
    # 1. Force the time serial to be a strict number and fill any blanks with 0
    df_export['_calc_serial'] = pd.to_numeric(df_export['_calc_serial'], errors='coerce').fillna(0)
    
    # 2. Find whatever column you are using in your "by=" parameter (e.g., 'Network', 'Channel')
    # and fill any blanks with "UNKNOWN" so it doesn't crash. 
    # Example:
    # df_export['Network'] = df_export['Network'].fillna('UNKNOWN')

    # Merge with USA Data
    merged = pd.merge_asof(
        df_export.sort_values('_calc_serial'), 
        usa_lookup.sort_values('_calc_serial'), 
        on='_calc_serial', 
        by='_join_chan', 
        direction='backward'
    )
    merged = merged.sort_values('_original_idx')

    del usa_lookup
    del df_export
    gc.collect()

    # 5. Final Audit Calculations
    yield "data: [LOG] Step 5/7: Finalizing row-level audit calculations...\n\n"
    def finalize(row):
        chan_upper = str(row['_join_chan']).upper()
        mday = str(row.get('matchday', '')).strip().lower()
        is_internal_overlap = row['Internal Overlap'] == "Yes"
        
        if "YOUTUBE" in chan_upper and mday in yt_lookup:
            rate = 0.0 if is_internal_overlap else yt_lookup[mday]['rate']
            return pd.Series([yt_lookup[mday]['aud'], rate, "YouTube Match", row['Internal Overlap']])
            
        if "PEACOCK" in chan_upper and mday in pck_lookup:
            rate = 0.0 if is_internal_overlap else round(pck_lookup[mday], 3)
            return pd.Series([0.0, rate, "Peacock Match", row['Internal Overlap']])
            
        aud = clean_val(row['_val_aud'])
        cpm = clean_val(cpm_map.get(chan_upper, 0))
        
        rate = round((aud * cpm) / 30 / 1.31, 3)
        if is_internal_overlap:
            rate = 0.0
            
        return pd.Series([aud, rate, row['_val_prog'] if pd.notna(row['_val_prog']) else "#N/A", row['Internal Overlap']])

    merged[["aud_all_esti (000's)", "1sec Nielsen Rate in EUR", "Program check", "Internal Overlap Flag"]] = merged.apply(finalize, axis=1)

    # 6. Generate Output
    yield "data: [LOG] Step 6/7: Generating final Excel buffer...\n\n"
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Drop the temporary text-check column so it doesn't clutter the final excel
        if '_explicit_subsegment' in merged.columns:
            merged = merged.drop(columns=['_explicit_subsegment'])
            
        merged.to_excel(writer, sheet_name='Calculated Export', index=False)
        
        df_overlaps = merged[merged["Internal Overlap Flag"] == "Yes"].sort_values('channel')
        if not df_overlaps.empty:
            df_overlaps.to_excel(writer, sheet_name='Overlapped Line Items', index=False)
            
        df_usa_raw.to_excel(writer, sheet_name='USA Data Reference', index=False)
    
    # 7. Final Stream Encoding
    yield "data: [LOG] Step 7/7: Creating download stream...\n\n"
    del merged
    gc.collect()
    
    output.seek(0)
    file_bytes = output.read()
    output.close()
    base64_file = base64.b64encode(file_bytes).decode('utf-8')
    del file_bytes
    gc.collect()

    duration = round(time.time() - start_time, 2)
    yield f"data: [COMPLETED] Success! Audit took {duration}s.\n\n"
    yield f"file: {base64_file}\n\n"

    time.sleep(1)
    for p in [usa_p, exp_p, cpm_p]:
        try:
            if os.path.exists(p): os.remove(p)
        except: pass
        
# import os
# import time
# import shutil
# import pandas as pd
# from datetime import datetime

# # --- 1. VISUAL KEY HELPER ---
# def get_excel_serial_stitching(dt_val, tm_val):
#     """Creates the string 'NBC460250.625' for Excel display."""
#     try:
#         dt = pd.to_datetime(dt_val)
#         tm = pd.to_datetime(str(tm_val))
#         base_date = datetime(1899, 12, 30)
#         date_int = (dt - base_date).days
#         time_dec = (tm.hour * 3600 + tm.minute * 60 + tm.second) / 86400.0
        
#         full_str = f"{time_dec:.15f}"
#         integer_part, decimal_part = full_str.split('.')
#         truncated_decimal = decimal_part[:9]
        
#         stitched = f"{date_int}{integer_part}.{truncated_decimal}"
#         return stitched.rstrip('0').rstrip('.')
#     except:
#         return "0"

# # --- 2. LOGIC KEY HELPER ---
# def get_numeric_serial(dt_val, tm_val):
#     """Calculates float for sorting/matching."""
#     try:
#         dt = pd.to_datetime(dt_val)
#         tm = pd.to_datetime(str(tm_val))
#         base_date = datetime(1899, 12, 30)
#         date_int = (dt - base_date).days
#         time_dec = (tm.hour * 3600 + tm.minute * 60 + tm.second) / 86400.0
#         return float(date_int + time_dec)
#     except:
#         return None # Return None instead of 0.0 to easily identify bad rows

# def clean_val(val):
#     if pd.isna(val) or str(val).strip().upper() in ["#N/A", "#REF!", "NAN", "-", ""]:
#         return 0.0
#     s_val = str(val).replace('$', '').replace(',', '').strip()
#     try: return float(s_val)
#     except: return 0.0

# def process_usa_audit_logic(usa_data, export_file, cpm_file, upload_folder, output_folder):
#     timestamp = int(time.time())
#     print(f"\n--- [LOG] Process Started at {timestamp} ---")
    
#     usa_p = os.path.join(upload_folder, f"u_{timestamp}.xlsx")
#     exp_p = os.path.join(upload_folder, f"e_{timestamp}.xlsx")
#     cpm_p = os.path.join(upload_folder, f"c_{timestamp}.xlsx")

#     for f_obj, p in [(usa_data, usa_p), (export_file, exp_p), (cpm_file, cpm_p)]:
#         with open(p, "wb") as f:
#             shutil.copyfileobj(f_obj.file, f)

#     # --- LOAD USA DATA ---
#     xl_usa = pd.ExcelFile(usa_p)
#     target_sheet = next((s for s in xl_usa.sheet_names if "usadata" in s.lower() or "sheet1" in s.lower()), xl_usa.sheet_names[0])
#     df_usa = pd.read_excel(usa_p, sheet_name=target_sheet, skiprows=5)
    
#     IDX_CHAN = 4; IDX_DATE = 8; IDX_START = 12; IDX_PROG = 17; IDX_AUD = 30 

#     # Prepare USA Lookup
#     usa_lookup = pd.DataFrame()
#     usa_lookup['_calc_serial'] = df_usa.apply(lambda r: get_numeric_serial(r.iloc[IDX_DATE], r.iloc[IDX_START]), axis=1)
#     usa_lookup['_join_chan'] = df_usa.iloc[:, IDX_CHAN].astype(str).str.strip().str.upper()
#     usa_lookup['_val_aud'] = df_usa.iloc[:, IDX_AUD]
#     usa_lookup['_val_prog'] = df_usa.iloc[:, IDX_PROG]
    
#     # --- CRITICAL FIX: CLEAN NULLS BEFORE MERGE ---
#     initial_len = len(usa_lookup)
    
#     # 1. Drop rows where channel is 'NAN' or empty string (often caused by empty excel rows)
#     usa_lookup = usa_lookup[usa_lookup['_join_chan'].replace('NAN', '') != '']
    
#     # 2. Drop rows where serial calculation failed (returned None)
#     usa_lookup = usa_lookup.dropna(subset=['_calc_serial'])
    
#     print(f"[LOG] Cleaning USA Data: Dropped {initial_len - len(usa_lookup)} empty/invalid rows.")
    
#     usa_lookup = usa_lookup.sort_values('_calc_serial')

#     # Prepare Visual Reference Tab
#     df_usa['cont date time'] = df_usa.apply(lambda r: get_excel_serial_stitching(r.iloc[IDX_DATE], r.iloc[IDX_START]), axis=1)
#     df_usa['concat channel date time'] = df_usa.iloc[:, IDX_CHAN].astype(str).str.strip() + df_usa['cont date time']

#     # --- LOAD AUX SHEETS ---
#     yt_sheet = next((s for s in xl_usa.sheet_names if "youtube" in s.lower()), None)
#     t3_sheet = next((s for s in xl_usa.sheet_names if "table3" in s.lower()), None)
#     df_yt = pd.read_excel(usa_p, sheet_name=yt_sheet) if yt_sheet else pd.DataFrame()
#     df_t3 = pd.read_excel(usa_p, sheet_name=t3_sheet) if t3_sheet else pd.DataFrame()

#     # --- LOAD EXPORT & CPM ---
#     df_export = pd.read_excel(exp_p, skiprows=3)
    
#     # Load CPM (Headers on Row 3 -> skiprows=2)
#     df_cpm = pd.read_excel(cpm_p, skiprows=2)
#     df_cpm.rename(columns={df_cpm.columns[0]: 'DMA'}, inplace=True)
#     df_cpm['DMA'] = df_cpm['DMA'].astype(str).str.strip().str.upper()

#     # Prepare Export for Merge
#     df_export['_calc_serial'] = df_export.apply(lambda r: get_numeric_serial(r['progr. start (date)'], r['progr. start (time)']), axis=1)
#     df_export['_join_chan'] = df_export['channel'].astype(str).str.strip().str.upper()
#     df_export = df_export.sort_values('_calc_serial')

#     # --- MERGE (Get Audience) ---
#     print("[LOG] Running Approximate Time Match...")
#     merged = pd.merge_asof(
#         df_export, usa_lookup,
#         on='_calc_serial', by='_join_chan', direction='backward', suffixes=('', '_lookup')
#     )

#     # --- CALCULATE RATES ---
#     target_demo = f"{datetime.now().month}P2+"
#     print(f"[LOG] Target CPM Column: '{target_demo}'")

#     def finalize_row(row):
#         # 1. Visual Key
#         chan_raw = str(row['channel']).strip()
#         display_serial = get_excel_serial_stitching(row['progr. start (date)'], row['progr. start (time)'])
#         v5_key = f"{chan_raw}{display_serial}"
        
#         # 2. Audience
#         aud = clean_val(row['_val_aud'])
#         prog = row['_val_prog'] if pd.notna(row['_val_prog']) else "#N/A"
        
#         # 3. Logic Setup
#         chan_clean = chan_raw.lower()
#         chan_upper = chan_raw.upper()
#         matchday = str(row.get('matchday', '')).strip().lower()

#         # --- AUDIENCE OVERRIDE (YouTube) ---
#         if "youtube" in chan_clean and not df_yt.empty:
#             match = df_yt[df_yt.iloc[:, 12].astype(str).str.strip().str.lower() == matchday]
#             if not match.empty:
#                 aud = clean_val(match.iloc[0, 16])
#                 prog = "YouTube Match"
#             else:
#                 aud = 0.0

#         # --- RATE CALCULATION ---
#         rate = 0.0
        
#         # A. YouTube
#         if "youtube" in chan_clean and not df_yt.empty:
#             match = df_yt[df_yt.iloc[:, 0].astype(str).str.strip().str.lower() == matchday]
#             rate = clean_val(match.iloc[0, 19]) if not match.empty else 0.0

#         # B. Peacock
#         elif "peacock" in chan_clean and not df_t3.empty:
#             match = df_t3[df_t3.iloc[:, 0].astype(str).str.strip().str.lower() == matchday]
#             rate = clean_val(match.iloc[0, 2]) if not match.empty else 0.0

#         # C. Standard CPM (NBC, Fox, etc.)
#         else:
#             if chan_upper in df_cpm['DMA'].values:
#                 if target_demo in df_cpm.columns:
#                     cpm_raw = df_cpm.loc[df_cpm['DMA'] == chan_upper, target_demo].values[0]
#                     cpm_val = clean_val(cpm_raw)
#                     rate = (aud * cpm_val) / 30 / 1.31
#                 else:
#                     rate = 0.0 # Column missing
#             else:
#                 rate = 0.0

#         return pd.Series([aud, rate, v5_key, prog])

#     merged[["aud_all_esti (000's)", "1sec Nielsen Rate in EUR", "Concat Channel Date Time", "Program check"]] = merged.apply(finalize_row, axis=1)

#     # Cleanup
#     final_order = [
#         "gID", "channel country", "channel", "programme", "programme category",
#         "progr. start (date)", "progr. start (time)", "progr. duration", "progr. end (time)",
#         "sports", "event", "matchday", "home team", "away team", "rating source",
#         "rate/rating country", "aud_all_orig", "official Share All Individuals (in %)",
#         "aud_all_esti (000's)", "1sec Repucom Rate in EUR", "1sec Nielsen Rate in EUR",
#         "Concat Channel Date Time", "Program check"
#     ]
#     merged = merged[[c for c in final_order if c in merged.columns]]

#     out_filename = f"USA_Audit_Calculated_{timestamp}.xlsx"
#     out_path = os.path.join(output_folder, out_filename)
    
#     with pd.ExcelWriter(out_path, engine='openpyxl') as writer:
#         merged.to_excel(writer, sheet_name='Calculated Export', index=False)
#         df_usa.to_excel(writer, sheet_name='USA Data Reference', index=False)
        
#     print(f"[LOG] Process Complete. File saved: {out_filename}")
#     return out_path, out_filename