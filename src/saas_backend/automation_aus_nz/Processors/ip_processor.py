import pandas as pd
import numpy as np
import io
import re
import warnings
from datetime import datetime
from .utils import excel_helper, google_sheets_helper

# --- 1. INITIALIZATION ---
pd.set_option('future.no_silent_downcasting', True)
warnings.simplefilter(action='ignore', category=FutureWarning)

def run_pipeline(market, uploaded_file, return_diagnostic=False):
    print(f"--- 🚀 Executing Synchronized IP Pipeline: {market} (Diag: {return_diagnostic}) ---")
    SPREADSHEET_ID = "1BTh_zIm5KqIN35SLOwUX-ernV21nLCaJCuY_BK6USDs"
    
    # 1. LOAD ALL MAPPING TABS
    REQUIRED_SHEETS = [
        'New Cricket Events', 'Event', 'National Teams', 
        'Stadium_Concat', 'Stadium', 'Inventory', 'Industry', 'TL Logic'
    ]
    lookup_dfs = google_sheets_helper.get_sheets_as_df_dict(SPREADSHEET_ID, REQUIRED_SHEETS)

    # 2. HELPER FUNCTIONS
    def super_clean(text):
        if pd.isna(text) or str(text).lower() in ['nan', 'none', '']: return ""
        return re.sub(r'[^A-Z0-9]', '', str(text).upper())

    def smart_strip(text):
        if pd.isna(text) or str(text).lower() in ['nan', 'none', '']: return ""
        return str(text).strip()

    m_id_name = 'Australia' if market.upper() == 'AUS' else 'NewZealand'

    # --- 3. DICTIONARY BUILDING ---
    # L1: Master Key Map (6-Column)
    stadium_concat_map = {str(row.iloc[6]).strip().upper(): str(row.iloc[7]).strip() for _, row in lookup_dfs['Stadium_Concat'].iterrows() if len(row) >= 8}
    
    # L2: National Team Map (3-Column - Event+Sport+Team)
    nt_map = {super_clean(str(row.iloc[3])): str(row.iloc[4]).strip() for _, row in lookup_dfs['National Teams'].iterrows() if len(row) > 4}

    cricket_map = {}
    for _, row in lookup_dfs['New Cricket Events'].iterrows():
        val = str(row.iloc[4]).strip()
        key_raw = str(row.iloc[0]) + str(row.iloc[1])
        cricket_map[key_raw] = val
        cricket_map[super_clean(key_raw)] = val

    naming_map, event_master_sport_map, yn_map = {}, {}, {}
    for _, row in lookup_dfs['Event'].iterrows():
        raw_key = str(row.iloc[0]).strip()
        norm_key = super_clean(raw_key)
        s_val, y_val, n_val = str(row.iloc[1]).strip(), str(row.iloc[2]).strip(), row.iloc[3]
        event_master_sport_map[raw_key] = s_val
        event_master_sport_map[norm_key] = s_val
        naming_map[raw_key] = n_val
        naming_map[norm_key] = n_val
        yn_map[raw_key] = y_val
        yn_map[norm_key] = y_val

    industry_map = {}
    for _, row in lookup_dfs['Industry'].iterrows():
        b_key = str(row.iloc[0]).strip()
        s24_b = str(row.iloc[1]).strip()
        if s24_b.lower() in ['nan', '']: s24_b = b_key
        ind_data = {'industry': str(row.iloc[2]).strip(), 's24_brand': s24_b}
        industry_map[b_key] = ind_data
        industry_map[super_clean(b_key)] = ind_data

    tl_map = {super_clean(str(row.iloc[0])): str(row.iloc[1]).strip() for _, row in lookup_dfs['TL Logic'].iterrows()}
    stadium_map = {super_clean(str(row.iloc[0])): str(row.iloc[1]).strip() for _, row in lookup_dfs['Stadium'].iterrows()}
    inventory_map = {super_clean(str(row.iloc[0])): str(row.iloc[1]).strip() for _, row in lookup_dfs['Inventory'].iterrows()}

    # --- 4. RAW DATA LOAD (🚨 FIXED SECTION) ---
    # Handle both list and single file inputs gracefully
    if isinstance(uploaded_file, list):
        file_target = uploaded_file[0].file
    else:
        file_target = uploaded_file.file

    # 🚨 CRITICAL FIX: Reset the file pointer to the beginning. 
    # If the backend touched this file, the pointer is at the end. This prevents blank files!
    file_target.seek(0)
    
    df_raw = pd.read_excel(file_target)
    df_raw.columns = df_raw.columns.str.strip()
    row_count = len(df_raw)

    # --- 5. PROCESSING LOOP ---
    final_events, final_sports, final_inv, final_brands, final_industries, final_props, final_channels, final_stadiums, l1_keys, l2_keys, logic_trackers = [], [], [], [], [], [], [], [], [], [], []
    
    fallback_evt_series = df_raw.iloc[:, 8].astype(str).str.replace(r'.*Stadium Namingrights.*', '', regex=True, flags=re.I).str.strip()
    stadium_brand_list = {"OPTUS": "Optus Stadium", "MARVEL": "Marvel Stadium", "GMHBA": "GMHBA Stadium", "MARS": "Mars Stadium", "SUNCORP": "Suncorp Stadium", "ALLIANZ": "Allianz Stadium Sydney", "ACCOR": "Accor Stadium", "AAMI": "AAMI Park", "RAC": "RAC Arena", "GIO": "GIO Stadium"}

    for i in range(row_count):
        raw_country = smart_strip(df_raw.iloc[i, 3])
        raw_evt = smart_strip(df_raw.iloc[i, 8])
        raw_spr = smart_strip(df_raw.iloc[i, 7])
        raw_brd = smart_strip(df_raw.iloc[i, 11])
        raw_std = smart_strip(df_raw.iloc[i, 10])
        raw_inv = smart_strip(df_raw.iloc[i, 12])
        raw_team = smart_strip(df_raw.iloc[i, 9])
        raw_chan = smart_strip(df_raw.iloc[i, 5])

        # A. EVENT LOGIC
        assigned_event = None
        c_key = raw_evt + raw_spr
        if c_key in cricket_map: assigned_event = cricket_map[c_key]
        elif super_clean(c_key) in cricket_map: assigned_event = cricket_map[super_clean(c_key)]
        elif market.upper() == "AUS" and "BRIGHTON HOMES" in raw_brd.upper(): assigned_event = "Australian Football League Women"
        elif raw_evt in naming_map or super_clean(raw_evt) in naming_map:
            conv = naming_map.get(raw_evt, naming_map.get(super_clean(raw_evt)))
            if not pd.isna(conv) and "Change naming convention to" in str(conv):
                assigned_event = str(conv).replace("Change naming convention to", "").strip()
        if not assigned_event: assigned_event = fallback_evt_series.iloc[i]
        
        # B. SPORT, STADIUM, INVENTORY
        assigned_sport = event_master_sport_map.get(assigned_event, event_master_sport_map.get(super_clean(assigned_event), raw_spr))
        assigned_stadium = stadium_map.get(super_clean(raw_std), raw_std)
        n_inv = inventory_map.get(super_clean(raw_inv), raw_inv)
        assigned_inventory = tl_map.get(super_clean(n_inv), n_inv)
        assigned_chan = raw_chan.split("/")[-1] if "/" in raw_chan or "https" in raw_chan else raw_chan

        # C. BRAND & INDUSTRY
        lookup_data = industry_map.get(raw_brd, industry_map.get(super_clean(raw_brd), {'industry': '', 's24_brand': raw_brd}))
        assigned_brand, assigned_industry = lookup_data['s24_brand'], lookup_data['industry']

        # D. PROPERTY WATERFALL (MULTI-KEY LOGIC)
        prop = ""
        logic_step = "L5: Event Fallback"
        
        # 🚨 L1: 6-Column Concat Key
        l1_key = f"{raw_country}-{assigned_event}-{assigned_stadium}-{assigned_brand}-{assigned_inventory}-{raw_team}".upper()
        # 🚨 L2: 3-Column National Team Key
        l2_key = assigned_event + assigned_sport + raw_team
        
        generic_results = ['AUSTRALIA', 'NEW ZEALAND', 'AUSTRALIA (W)', 'NEW ZEALAND (W)']

        if l1_key in stadium_concat_map:
            prop = stadium_concat_map[l1_key]
            logic_step = "L1: Stadium Concat"
        
        # Sharpener check for L2 (triggers if empty OR generic)
        if (prop == "" or prop.upper() in generic_results):
            if nt_map.get(super_clean(l2_key)):
                prop = nt_map[super_clean(l2_key)]
                logic_step = "L2: National Team Refined"

        if prop == "":
            if raw_team not in ['', '_', 'nan', 'None']:
                prop = raw_team
                logic_step = "L3: Raw Team"
            elif raw_std not in ['', '_', 'nan', 'None']:
                prop = assigned_stadium
                logic_step = "L4: Raw Stadium Fallback"
            elif raw_brd.upper() in stadium_brand_list:
                prop = stadium_brand_list[raw_brd.upper()]
                logic_step = "L4: Naming Rights (Brand Override)"
            else:
                prop = assigned_event
                logic_step = "L5: Event Fallback"

        final_events.append(assigned_event); final_sports.append(assigned_sport)
        final_inv.append(assigned_inventory); final_channels.append(assigned_chan)
        final_brands.append(assigned_brand); final_industries.append(assigned_industry); final_props.append(prop)
        final_stadiums.append(assigned_stadium); logic_trackers.append(logic_step)
        l1_keys.append(l1_key); l2_keys.append(l2_key)

    # --- 6. FINAL ASSEMBLY ---
    res = pd.DataFrame()
    res['Nielsen Sports ID'] = [f"Sports24{m_id_name}{str(df_raw.iloc[j, 1])}-{j+1}" for j in range(row_count)]
    
    # 🚨 FIX: Date Purity (dt.date removes the 12:00:00 AM)
    res['progr. start (date)'] = pd.to_datetime(df_raw.iloc[:, 2], errors='coerce', dayfirst=True).dt.date
    
    res['country'] = [m_id_name] * row_count
    res['media type'] = "Internet Pictorial"; res['media type (generic)'] = "Internet"
    res['programme category'] = df_raw.iloc[:, 6].tolist()
    res['match'] = ""; res['matchday'] = ""; res['matchday (shorthand)'] = ""
    res['programme'] = df_raw.iloc[:, 5].tolist()
    res['channel'] = final_channels
    res['event'] = final_events; res['sport'] = final_sports; res['season'] = df_raw.iloc[:, 1].tolist()
    res['broadcast season'] = df_raw.iloc[:, 1].tolist(); res['stadium'] = final_stadiums
    res['brand'] = final_brands; res['tool'] = ""; res['location'] = ""
    res['new inventory item'] = final_inv; res['sponsored team (EA)'] = df_raw.iloc[:, 9].tolist()
    res['image/editorial'] = df_raw.iloc[:, 4].apply(lambda x: "Image" if "image" in str(x).lower() else "Editorial").tolist()
    res['sequences'] = df_raw.iloc[:, 13].tolist(); res['total exposure'] = ""
    res['currency'] = "AUD" if market.upper() == "AUS" else "NZD"
    res['AVE (100%)'] = pd.to_numeric(df_raw.iloc[:, 15], errors='coerce').fillna(0)
    res['QI value'] = pd.to_numeric(df_raw.iloc[:, 16], errors='coerce').fillna(0) * (1.2381 if market.upper() == "NZ" else 1)
    res['QI Score (in %)'] = (res['QI value'] / res['AVE (100%)'].replace(0, np.nan)) * 100
    res['Sport 24 Sponsorship Property/Team'] = final_props
    res['Sport 24 Brand'] = final_brands; res['Sport 24 Brand Industry'] = final_industries
    res['Sport 24 Event (Y/N)'] = [yn_map.get(super_clean(e), "No") for e in final_events]

    # --- 7. QI SUMMATION, DATE TRACKING & COMPARISON LOGIC ---
    
    # 🆕 A. Find the Latest Program Date from the file
    # We convert to datetime to safely find the max, then format as dd/mm/yyyy
    temp_dates = pd.to_datetime(res['progr. start (date)'], errors='coerce')
    latest_file_date = temp_dates.max().strftime('%d/%m/%Y') if not temp_dates.empty else "N/A"

    # B. Calculate Current Total (Force float to ensure JSON serializable)
    current_qi_total = float(res['QI value'].sum())
    
    # C. Identify Multiplier used
    multiplier_val = 1.2381 if market.upper() == "NZ" else 1.0
    
    # D. Fetch Last Known Value from Google Sheet Tracker
    last_qi_total = google_sheets_helper.get_last_qi_record(SPREADSHEET_ID, "IP", market.upper())

    # E. Determine if growth is positive
    is_growth_positive = current_qi_total > last_qi_total

    # --- 8. EXPORT ---
    master_headers = ["Nielsen Sports ID", "progr. start (date)", "country", "media type", "media type (generic)", "programme category", "match", "matchday", "matchday (shorthand)", "programme", "channel", "event", "sport", "season", "broadcast season", "stadium", "brand", "tool", "location", "new inventory item", "sponsored team (EA)", "image/editorial", "sequences", "total exposure", "currency", "AVE (100%)", "QI value", "QI Score (in %)", "Sport 24 Sponsorship Property/Team", "Sport 24 Brand", "Sport 24 Brand Industry", "Sport 24 Event (Y/N)"]
    
    output = io.BytesIO()
    
    if return_diagnostic:
        # QA/Forensic Workbook
        res['L1_MASTER_KEY'] = l1_keys
        res['L2_NT_KEY'] = l2_keys
        res['Logic_Step_Tracker'] = logic_trackers
        diagnostic_headers = master_headers + ['L1_MASTER_KEY', 'L2_NT_KEY', 'Logic_Step_Tracker']
        df_diag = res.reindex(columns=diagnostic_headers, fill_value="").fillna("").replace(['nan', 'NaN', 'None'], "")
        
        with pd.ExcelWriter(output, engine='xlsxwriter', datetime_format='dd-mm-yyyy') as writer:
            df_diag.to_excel(writer, sheet_name="1_IP_Output", index=False)
    else:
        # Standard Production Run
        df_final = res.reindex(columns=master_headers, fill_value="").fillna("").replace(['nan', 'NaN', 'None'], "")
        excel_helper.save_styled_xlsx(df_final, output, market)

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