import io
import base64
import pandas as pd
from datetime import time

def process_japan_bsr(bsr_file, rates_file, rr_file, mm_file, event_id, season):
    """
    Complete Japan BSR Audit Engine.
    Processes BSR, Master Rates (.xlsm), RR File, and MM File dynamically based on event and season.
    """
    try:
        yield "data: 🚀 Initializing Japan BSR Engine...\n\n"
        
        # 1. LOAD DATASETS
        # ---------------------------------------------------------
        bsr_data = pd.read_excel(bsr_file, sheet_name="Sheet1")
        rr_data = pd.read_excel(rr_file)
        mm_data = pd.read_excel(mm_file)
        
        # Apply dynamic configurations
        events_map = {1: "J League", 2: "Nippon Professional Baseball"}
        event = events_map.get(event_id, events_map[1]) # fallback to J League if invalid
        
        jap_to_euro = 0.0077

        yield f"data: 📈 Files loaded. Running audit for {event} - Season {season}...\n\n"

        # Load Master Workbook Sheets
        name_std_df = pd.read_excel(rates_file, sheet_name='Broadcast Distribution', usecols='A:M')
        bsr_data.columns = name_std_df.columns
        
        name_standardization = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='A:D')
        program_standardization = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='H:I')
        event_id_sheet = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='S:T')
        match_id_sheet = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='Y:AC')
        team_id_sheet = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='O:P')
        team_name_sheet = pd.read_excel(rates_file, sheet_name='Name Standardizations', usecols='M:N')
        time_band_sheet = pd.read_excel(rates_file, sheet_name="Time bands")
        media_rates_sheet = pd.read_excel(rates_file, sheet_name="Media Rates")
        
        # Mapping Dictionaries
        channel_map = dict(zip(name_standardization['Non-Standard Channel Name'], name_standardization['Standard Channel Name']))
        channel_map['NHK BS-1'] = 'NHK BS1'
        
        channel_id_map = dict(zip(name_standardization['Standard Channel Name'].astype(str).str.strip().str.lower(), name_standardization['Channel Id']))
        channel_id_map['nhk bs1'] = 3601
        
        team_id_map = dict(zip(team_id_sheet.iloc[:, 1].astype(str).str.strip().str.lower(), team_id_sheet.iloc[:, 0]))
        team_name_map = dict(zip(team_name_sheet.iloc[:, 0].astype(str).str.strip().str.lower(), team_name_sheet.iloc[:, 1]))
        program_map = dict(zip(program_standardization['Standardized'], program_standardization['Program Name']))
        event_lookup_map = dict(zip(event_id_sheet.iloc[:, 1], event_id_sheet.iloc[:, 0]))
        matchid_map = dict(zip(match_id_sheet.iloc[:, 0], match_id_sheet.iloc[:, 4]))
        
        yield "data: 🕒 Standardizing Channels and Time Logic...\n\n"

        # 2. STANDARDIZATION & TIME CALCULATIONS
        # ---------------------------------------------------------
        bsr_data['Non- Standard Channel'] = bsr_data['Network']
        bsr_data['Standardized Channel Name'] = bsr_data['Non- Standard Channel'].apply(lambda x: channel_map.get(x, x))

        def calculate_week_part(row):
            actual_date = pd.to_datetime(row['Actual Date'])
            boundary_time = time(3, 0, 0) 
            if row['Actual Time'] >= time(0, 0, 0) and row['Actual Time'] <= boundary_time:
                adjusted_date = actual_date - pd.Timedelta(days=1)
            else:
                adjusted_date = actual_date
            
            day_to_num_map = {'Sunday': 1, 'Monday': "Weekday", 'Tuesday': "Weekday", 'Wednesday': "Weekday", 'Thursday': "Weekday", 'Friday': 'Friday', 'Saturday': 7}
            return day_to_num_map.get(adjusted_date.day_name())

        bsr_data['Week Part'] = bsr_data.apply(calculate_week_part, axis=1)
        bsr_data['Actual Hour'] = bsr_data['Actual Time'].apply(lambda x: 24 if x.hour == 0 else x.hour)

        def std_team(name):
            return team_name_map.get(str(name).strip().lower(), name) if pd.notna(name) else None
        
        bsr_data['Home'] = bsr_data['Home'].apply(std_team)
        bsr_data['Away'] = bsr_data['Away'].apply(std_team)

        time_band_updated = time_band_sheet.drop_duplicates(subset=['Week Part_1'], keep='first')
        tb_lookup_dict = dict(zip(time_band_updated['Week Part_1'].str.lower(), time_band_updated['Timebands']))
        
        temp_key = (bsr_data['Standardized Channel Name'].str.strip() + bsr_data['Week Part'].astype(str) + bsr_data['Actual Hour'].astype(str)).str.lower()
        bsr_data['Timeband'] = temp_key.map(tb_lookup_dict)

        yield "data: 💰 Running Rate Lookup (RR Check)...\n\n"

        # 3. RR FILE LOGIC
        # ---------------------------------------------------------
        broadcast_map = {'Live': 'Sport (live)', 'Replay': 'Sport (relive)', 'Relive': 'Sport (relive)', 'Sport (live)': 'Sport (live)', 'Sport (relive)': 'Sport (relive)'}
        bsr_data['Program Category'] = bsr_data['Program Category'].map(broadcast_map)

        def generate_match_key(row):
            date_val = row['Original date'] if (pd.isna(row['Match']) or str(row['Match']).strip() == "") else row['Match']
            return f"{str(date_val).strip()}{str(row['Program Category']).strip()}{str(row['Standardized Channel Name']).strip()}{str(row['Home']).strip()} - {str(row['Away']).strip()}".lower()

        bsr_data['Concatenate'] = bsr_data.apply(generate_match_key, axis=1)
        
        rr_data['Concatinate Key'] = (
            rr_data['matchday'].astype(str).str.strip() + rr_data['programme category'].astype(str).str.strip() + 
            rr_data['channel'].astype(str).str.strip() + rr_data['home team'].astype(str).str.strip() + 
            " - " + rr_data['away team'].astype(str).str.strip()
        ).str.lower()
        
        existing_keys = set(rr_data['Concatinate Key'])
        bsr_data['To be uploaded to BSR'] = bsr_data['Concatenate'].apply(lambda x: "No" if x in existing_keys else "Yes")

        yield "data: 📺 Mapping MM (Media Master) Data...\n\n"

        # 4. MM FILE LOGIC
        # ---------------------------------------------------------
        bsr_data['MM_Lookup Key'] = (bsr_data['Match'].astype(str).str.strip().str.lower() + bsr_data['Home'].astype(str).str.strip().str.lower() + " - " + bsr_data['Away'].astype(str).str.strip().str.lower())
        mm_data['Column1'] = (mm_data['matchday'].astype(str).str.strip().str.lower() + mm_data['match'].astype(str).str.strip().str.lower())
        
        mm_data['APT'] = mm_data.groupby('Column1')['APT'].transform('max')
        mm_data['BT'] = mm_data.groupby('Column1')['BT'].transform('max')
        
        apt_map = dict(zip(mm_data['Column1'], mm_data['APT']))
        bt_map = dict(zip(mm_data['Column1'], mm_data['BT']))

        bsr_data['APT'] = bsr_data["MM_Lookup Key"].map(apt_map)
        bsr_data['BCT'] = bsr_data["MM_Lookup Key"].map(bt_map)

        # 5. FINAL EXPORT PREP
        # ---------------------------------------------------------
        yield "data: 🧹 Finalizing Column Mappings...\n\n"
        
        media_rates_map = dict(zip(media_rates_sheet['Tag'].str.lower(), media_rates_sheet['Per Second Rate']))
        
        def calculate_per_sec(row):
            lookup_key = (str(row['Standardized Channel Name']).strip() + str(row['Week Part']).strip() + str(row['Timeband']).strip()).lower()
            rate = media_rates_map.get(lookup_key)
            return rate * jap_to_euro if rate else None

        bsr_data['Rate 1 seconds'] = bsr_data.apply(calculate_per_sec, axis=1)
        
        # Prepare final structure using injected parameters
        bsr_data['Country'] = "Japan"
        bsr_data['Country ID'] = 44
        bsr_data['TV Channel'] = bsr_data["Standardized Channel Name"]
        bsr_data['Channel Id'] = bsr_data['TV Channel'].astype(str).str.strip().str.lower().map(channel_id_map)
        bsr_data['Date'] = pd.to_datetime(bsr_data['Actual Date'], errors='coerce').dt.strftime('%d-%m-%Y')
        bsr_data['Season'] = season
        bsr_data['Sports'] = event_lookup_map.get(event)
        bsr_data['Event'] = event
        bsr_data['Program Description'] = bsr_data['Program Category']
        bsr_data['Program Start (local)'] = bsr_data['Actual Time']
        bsr_data['Program Start (local)2'] = bsr_data['Actual Time']
        bsr_data['Team home'] = bsr_data['Home']
        bsr_data['Team away'] = bsr_data['Away']
        bsr_data['Matchday'] = bsr_data['Match']
        
        # Exact final columns requested
        final_columns = [
            "Country", "Country ID", "TV Channel", "Channel Id", "Parent Network", 
            "Parent Network Id", "Date", "Program Name", "Program Description", 
            "Program Type", "Program Start (local)", "Program End", "Rating Source", 
            "Rating 3+ (in 000)", "Share3 (in %)", "Rating 14+ (in 000)", 
            "Rate per Second", "Program Start (local)2", "BCT", "APT", "LAPT", 
            "Sports", "Event", "Gender", "Season", "Matchday ID", "Matchday", 
            "Competition ID", "Competition", "Team home ID", "Team home", 
            "Team away ID", "Team away", "Rate 1 seconds", "1sec Nielsen Rate in EUR"
        ]
        
        # Ensure columns exist, fill with None if they don't
        for col in final_columns:
            if col not in bsr_data.columns:
                bsr_data[col] = None
                
        # Filter and reorder
        upload_df = bsr_data[bsr_data['To be uploaded to BSR'] == "Yes"].copy()
        upload_df = upload_df[final_columns]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            upload_df.to_excel(writer, index=False, sheet_name='BSR_Upload')
        
        output.seek(0)
        base64_file = base64.b64encode(output.read()).decode('utf-8')

        yield f"file: {base64_file}\n\n"
        yield "data: ✅ COMPLETED: Japan BSR Audit Finished.\n\n"

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(error_details)
        yield f"data: ❌ ERROR: {str(e)}\n\n"