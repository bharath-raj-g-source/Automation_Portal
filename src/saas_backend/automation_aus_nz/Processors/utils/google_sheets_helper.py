import os
import pandas as pd
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def get_creds():
    """Handles OAuth2 User Tokens and refreshes if expired."""
    creds_path = os.path.join(os.getcwd(), 'authorized_user.json')
    if not os.path.exists(creds_path):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.abspath(os.path.join(base_dir, '..', '..', '..', 'authorized_user.json'))

    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"❌ authorized_user.json not found at {creds_path}")

    creds = Credentials.from_authorized_user_file(creds_path)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds

def test_connection(spreadsheet_id):
    """
    REQUIRED BY TESTSHTEET.PY. 
    Verifies the handshake and reads the first cell of the 'Event' sheet.
    """
    try:
        creds = get_creds()
        service = build('sheets', 'v4', credentials=creds)
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, 
            range="Event!A1:A1"
        ).execute()
        val = result.get('values', [['Empty']])[0][0]
        print(f"✅ Connection Established. A1: {val}")
        return val
    except Exception as e:
        print(f"❌ Connection Failed: {str(e)}")
        raise e

def get_sheets_as_df_dict(spreadsheet_id, requested_sheets):
    """
    Advanced fetch with Surgical Normalization to achieve 100% parity.
    Ensures every row matches header length exactly.
    """
    creds = get_creds()
    service = build('sheets', 'v4', credentials=creds)
    
    sheet_metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    actual_names = [s['properties']['title'] for s in sheet_metadata.get('sheets', [])]
    
    df_dict = {}
    for req in requested_sheets:
        # Fuzzy match (case-insensitive, strips spaces)
        match = next((a for a in actual_names if a.strip().lower() == req.strip().lower()), None)
        if match:
            # FIXED: Removed A1:Z2000. Using just the sheet name pulls the entire used range.
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id, 
                range=f"'{match}'" 
            ).execute()
            
            values = result.get('values', [])
            if values:
                # 1. Clean headers
                headers = [str(h).strip() for h in values[0] if h is not None]
                num_cols = len(headers)
                data_rows = values[1:]
                
                # 2. Row Normalization (Crucial for 100% accuracy)
                normalized_data = []
                for row in data_rows:
                    if len(row) > num_cols:
                        normalized_data.append(row[:num_cols])
                    else:
                        normalized_data.append(row + [""] * (num_cols - len(row)))
                
                # 3. Create DataFrame
                df = pd.DataFrame(normalized_data, columns=headers)
                df = df.astype(str).replace(['nan', 'NaN', 'None', 'null'], "")
                df_dict[req] = df
            else:
                df_dict[req] = pd.DataFrame()
        else:
            df_dict[req] = pd.DataFrame()
    return df_dict

def get_all_sheets_as_dict(spreadsheet_id):
    """
    Discovers all tabs and loads them using the normalized dictionary logic.
    """
    creds = get_creds()
    service = build('sheets', 'v4', credentials=creds)
    
    sheet_metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    all_sheet_names = [s['properties']['title'] for s in sheet_metadata.get('sheets', [])]
    
    print(f"📂 System found {len(all_sheet_names)} total sheets: {all_sheet_names}")
    return get_sheets_as_df_dict(spreadsheet_id, all_sheet_names)

# --- QI TRACKER & TEAM MANAGEMENT FUNCTIONS ---

def get_team_members(spreadsheet_id):
    """Fetches the list of names from the 'Team Members' tab."""
    try:
        creds = get_creds()
        service = build('sheets', 'v4', credentials=creds)
        # Assumes names start from A2
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, 
            range="'Team Members'!A2:A100"
        ).execute()
        values = result.get('values', [])
        # Returns a flat list of strings
        return [name[0] for name in values if name]
    except Exception as e:
        print(f"⚠️ Could not fetch team members: {e}")
        return []

def get_last_qi_record(spreadsheet_id, media_type, market):
    """
    Finds the most recent QI value matching the Media Type and Market.
    Column Index Reference: A:Date(0), B:User(1), C:Media(2), D:Market(3), E:Mult(4), F:QI(5)
    """
    try:
        creds = get_creds()
        service = build('sheets', 'v4', credentials=creds)
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, 
            range="'QI Value Tracker'!A:G"
        ).execute()
        rows = result.get('values', [])
        
        if not rows:
            return 0.0

        # Scan backwards from the bottom to find the most recent entry
        for row in reversed(rows):
            if len(row) >= 6:
                # index 2 = Media Type, index 3 = Market
                if row[2].strip().upper() == media_type.upper() and \
                   row[3].strip().upper() == market.upper():
                    # Clean the QI value string (remove commas) and convert to float
                    raw_val = str(row[5]).replace(',', '').replace('$', '').strip()
                    return float(raw_val) if raw_val else 0.0
        return 0.0
    except Exception as e:
        print(f"⚠️ Error fetching last QI: {e}")
        return 0.0

def append_qi_log(spreadsheet_id, log_data):
    """
    Appends a new row to the 'QI Value Tracker'.
    log_data: [Date, User, Media, Market, Multiplier, QI, Status]
    """
    try:
        creds = get_creds()
        service = build('sheets', 'v4', credentials=creds)
        body = {'values': [log_data]}
        service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range="'QI Value Tracker'!A:G",
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()
        print(f"✅ Google Sheet Updated: {log_data[2]} {log_data[3]} | QI: {log_data[5]}")
        return True
    except Exception as e:
        print(f"❌ Failed to write to log: {e}")
        return False