import pandas as pd
import re

def extract_general_info_entities(general_df):

    events = set()
    sports = set()
    seasons = set()

    current_key = None

    for _, row in general_df.iterrows():

        key = str(row.get("Name", "")).strip()
        value = str(row.get("Value", "")).strip()

        if "sports" in key.lower():
            current_key = "sports"
        elif "events" in key.lower():
            current_key = "events"
        elif "seasons" in key.lower():
            current_key = "seasons"

        elif value:
            if current_key == "sports":
                sports.add(value.lower())
            elif current_key == "events":
                events.add(value.lower())
            elif current_key == "seasons":
                seasons.add(value.lower())

    return {
        "sports": sports,
        "events": events,
        "seasons": seasons
    }

def duplicate_aid_final(mm_df):
    df = mm_df.copy()
    
    # 1. Strip spaces and lowercase all columns to avoid case-sensitivity issues
    df.columns = df.columns.str.strip().str.lower()

    # 2. Dynamically check which date column exists in the uploaded file
    if "progr. start (date)" in df.columns:
        date_col = "progr. start (date)"
    elif "progr. start" in df.columns:
        date_col = "progr. start"
    else:
        # Fallback if neither exists to prevent server crashes
        date_col = None

    # Reference column for AID
    aid_col = "aid (mm)" if "aid (mm)" in df.columns else "aid"

    # 3. Define grouping columns based on what we found
    group_cols = [
        "programme category",
        "country",
        "channel",
        "programme"
    ]
    if date_col:
        group_cols.append(date_col)

    # 4. Safety Check: If ANY required column is missing, flag it gracefully instead of crashing
    missing_cols = [col for col in group_cols + [aid_col] if col not in df.columns]
    if missing_cols:
        df["Duplicate_AID_Check_Flag"] = False
        df["Duplicate_AID_Check_Remark"] = f"Check failed: Missing columns {missing_cols}"
        return df

    # --- Proceed with original logic ---
    # Create combo id
    df["_combo_id"] = df.groupby(group_cols).ngroup()

    # Count AIDs per combination
    df["_aid_count_per_combo"] = df.groupby(group_cols)[aid_col].transform("nunique")

    # Count combinations per AID
    df["_combo_count_per_aid"] = df.groupby(aid_col)["_combo_id"].transform("nunique")

    flags = []
    remarks = []

    for _, row in df.iterrows():
        # PRIORITY 1: Same AID used across multiple combinations
        if row["_combo_count_per_aid"] > 1:
            flags.append(False)
            remarks.append(f"AID {row[aid_col]} is used across multiple program combinations")

        # PRIORITY 2: Multiple AIDs for same combination
        elif row["_aid_count_per_combo"] > 1:
            flags.append(False)
            remarks.append(f"Multiple AIDs assigned to same program combination")

        # VALID
        else:
            flags.append(True)
            remarks.append("")

    df["Duplicate_AID_Check_Flag"] = flags
    df["Duplicate_AID_Check_Remark"] = remarks

    # Clean up
    df.drop(columns=["_combo_id", "_aid_count_per_combo", "_combo_count_per_aid"], inplace=True)

    return df


def audience_spotprice_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    audience_col = None
    possible_aud_cols = ["audience (in mio)", "audience (in 000's)", "audience (in 000s)", "audience"]
    for col in possible_aud_cols:
        if col in df.columns:
            audience_col = col
            break
            
    spot_price_col = None
    possible_spot_cols = ["spot price", "spotprice"]
    for col in possible_spot_cols:
        if col in df.columns:
            spot_price_col = col
            break

    if not audience_col or not spot_price_col:
        missing = []
        if not audience_col: missing.append("Audience")
        if not spot_price_col: missing.append("Spot Price")
        df.columns = original_cols
        df["Audience_SpotPrice_Check_Flag"] = False
        df["Audience_SpotPrice_Check_Remark"] = f"Check failed: Missing columns for {', '.join(missing)}"
        return df

    flags, remarks = [], []
    for _, row in df.iterrows():
        aud_val = row.get(audience_col, None)
        spot_val = row.get(spot_price_col, None)

        audience_blank = pd.isna(aud_val) or str(aud_val).strip() == "" or aud_val == 0
        spot_blank = pd.isna(spot_val) or str(spot_val).strip() == "" or spot_val == 0

        if audience_blank and spot_blank:
            flags.append(False)
            remarks.append("Audience and Spot Price both are missing or zero")
        elif audience_blank:
            flags.append(False)
            remarks.append("Audience value is missing or zero")
        elif spot_blank:
            flags.append(False)
            remarks.append("Spot Price is missing or zero")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["Audience_SpotPrice_Check_Flag"] = flags
    df["Audience_SpotPrice_Check_Remark"] = remarks
    return df

def program_category_check_mm(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    category_col = "programme category"
    
    if category_col not in df.columns:
        df.columns = original_cols
        df["Program_Category_Check_Flag"] = False
        df["Program_Category_Check_Remark"] = "Missing column: programme category"
        return df

    valid_categories = ["live", "sport (live)", "magazine", "highlights", "delayed", "relive", "news"]

    flags, remarks = [], []
    for _, row in df.iterrows():
        category = row.get(category_col)
        category_clean = "" if pd.isna(category) else str(category).strip().lower()

        if category_clean == "":
            flags.append(False)
            remarks.append("Programme category is missing")
        elif category_clean not in valid_categories:
            flags.append(False)
            remarks.append(f"Invalid programme category: {category}")
        else:
            flags.append(True)
            remarks.append("Correct category")

    df.columns = original_cols
    df["Program_Category_Check_Flag"] = flags
    df["Program_Category_Check_Remark"] = remarks
    return df

def normalize_channel(name):
    if pd.isna(name): return ""
    name = str(name).lower()
    name = re.sub(r"\(.*?\)", "", name)
    name = re.sub(r"[^a-z0-9]", "", name)
    return name.strip()

def channel_country_mapping_check(mm_df, rosco_path):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    rosco_excel = pd.ExcelFile(rosco_path)
    mapping_dict = {}

    for sheet in rosco_excel.sheet_names:
        if "rosco" not in sheet.lower(): continue
        temp = pd.read_excel(rosco_excel, sheet_name=sheet)
        temp.columns = temp.columns.str.strip().str.lower()
        if "channelname" in temp.columns and "channelcountry" in temp.columns:
            for _, row in temp.iterrows():
                ch_name = normalize_channel(row["channelname"])
                ch_country = str(row["channelcountry"]).strip().lower()
                if ch_name: mapping_dict[ch_name] = ch_country

    flags, remarks = [], []
    for _, row in df.iterrows():
        mm_channel_raw = row.get("channel", "")
        mm_country_raw = row.get("channel country", row.get("country", ""))

        mm_channel = normalize_channel(mm_channel_raw)
        mm_country = str(mm_country_raw).strip().lower()

        if mm_channel not in mapping_dict:
            flags.append(False)
            remarks.append(f"Channel '{mm_channel_raw}' not found in ROSCO mapping")
        elif mapping_dict[mm_channel] != mm_country:
            flags.append(False)
            remarks.append(f"Channel '{mm_channel_raw}' mapped to '{mapping_dict[mm_channel]}' but found in '{mm_country_raw}'")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["Channel_Country_Check_Flag"] = flags
    df["Channel_Country_Check_Remark"] = remarks
    return df

def apt_bt_check(mm_df, bt_threshold=None):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    apt_col, live_apt_col, bt_col, category_col = "apt", "apt live", "bt", "programme category"

    flags, remarks = [], []
    for _, row in df.iterrows():
        category = str(row.get(category_col, "")).lower()

        try: apt = float(row.get(apt_col))
        except: apt = None
        try: bt = float(row.get(bt_col))
        except: bt = None

        if category in ["live", "relive", "sport (live)"] and apt is not None and bt is not None:
            if apt < 0.5 * bt:
                flags.append(False)
                remarks.append("APT is less than 50% of BT for live/relive entry")
                continue

        if bt_threshold is not None and bt is not None:
            if bt >= float(bt_threshold):
                flags.append(False)
                remarks.append(f"BT exceeds threshold ({bt_threshold})")
                continue

        flags.append(True)
        remarks.append("")

    df.columns = original_cols
    df["APT_BT_Check_Flag"] = flags
    df["APT_BT_Check_Remark"] = remarks
    return df

def season_monitoring_check(mm_df, start_date, end_date):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    date_col = "progr. start (date)" if "progr. start (date)" in df.columns else "progr. start"
    
    if date_col not in df.columns:
        df.columns = original_cols
        df["Season_Check_Flag"] = False
        df["Season_Check_Remark"] = "Missing date column"
        return df

    start = pd.to_datetime(start_date, errors="coerce")
    end = pd.to_datetime(end_date, errors="coerce")

    flags, remarks = [], []
    for _, row in df.iterrows():
        prog_date = pd.to_datetime(row.get(date_col), dayfirst=True, errors="coerce")
        if pd.isna(prog_date):
            flags.append(False)
            remarks.append("Invalid programme start date")
        elif prog_date < start or prog_date > end:
            flags.append(False)
            remarks.append(f"Date {prog_date.date()} outside monitoring period ({start.date()} to {end.date()})")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["Season_Check_Flag"] = flags
    df["Season_Check_Remark"] = remarks
    return df

def fixture_validation_check(mm_df, fixture_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()
    
    f_df = fixture_df.copy()
    f_df.columns = f_df.columns.str.strip().str.lower()

    required_cols = ["event", "matchday", "matchday date", "match"]
    missing = [col for col in required_cols if col not in df.columns or col not in f_df.columns]
    
    if missing:
        df.columns = original_cols
        df["Fixture_Validation_Flag"] = False
        df["Fixture_Validation_Remark"] = f"Missing columns in data/fixture: {missing}"
        return df

    for col in required_cols + ["competition"]:
        if col in df.columns: df[col] = df[col].astype(str).str.lower().str.strip()
        if col in f_df.columns: f_df[col] = f_df[col].astype(str).str.lower().str.strip()

    fixture_set = set()
    for _, row in f_df.iterrows():
        key = (row["event"], row["matchday"], row["matchday date"], row["match"])
        fixture_set.add(key)

    flags, remarks = [], []
    for _, row in df.iterrows():
        key = (row["event"], row["matchday"], row["matchday date"], row["match"])
        if key in fixture_set:
            flags.append(True)
            remarks.append("")
        else:
            flags.append(False)
            remarks.append("Match/Event not found in Fixture file")

    df.columns = original_cols
    df["Fixture_Validation_Flag"] = flags
    df["Fixture_Validation_Remark"] = remarks
    return df

def stadium_consistency_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    required_cols = ["programme category", "matchday date", "stadium"]
    missing = [c for c in required_cols if c not in df.columns]
    
    if missing:
        df.columns = original_cols
        df["stadium_consistency_flag"] = False
        df["stadium_consistency_remark"] = f"Missing columns: {missing}"
        return df

    match_col_exists = "match" in df.columns
    team_col_exists = "team" in df.columns

    df["programme category"] = df["programme category"].astype(str).str.strip().str.lower()
    df["matchday date"] = df["matchday date"].astype(str).str.strip()
    df["stadium"] = df["stadium"].astype(str).str.strip().str.lower()

    if match_col_exists: df["match"] = df["match"].astype(str).str.strip().str.lower()
    if team_col_exists: df["team"] = df["team"].astype(str).str.strip().str.lower()

    live_df = df[df["programme category"].str.contains("live", na=False)].copy()

    def get_identifier(row):
        if match_col_exists and str(row.get("match", "")) not in ["", "nan"]:
            return row["match"]
        if team_col_exists:
            return row.get("team", "unknown")
        return "unknown"

    live_df["identifier"] = live_df.apply(get_identifier, axis=1)
    group = live_df.groupby(["identifier", "matchday date"])["stadium"].nunique()
    invalid_groups = group[group > 1].index

    flags, remarks = [], []
    for _, row in df.iterrows():
        category = str(row["programme category"]).lower()
        if "live" not in category:
            flags.append(True)
            remarks.append("")
            continue

        identifier = get_identifier(row)
        key = (identifier, str(row["matchday date"]).strip())

        if key in invalid_groups:
            flags.append(False)
            remarks.append("Multiple stadiums for same match/team on same date")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["stadium_consistency_flag"] = flags
    df["stadium_consistency_remark"] = remarks
    return df

def event_quality_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    if "programme category" not in df.columns:
        df.columns = original_cols
        df["event_quality_flag"] = False
        df["event_quality_remark"] = "Missing column: programme category"
        return df

    bt_col = "bt" if "bt" in df.columns else None
    df["programme category"] = df["programme category"].astype(str).str.lower().str.strip()
    allowed_categories = ["live", "delayed", "highlight", "magazine"]

    flags, remarks = [], []
    for _, row in df.iterrows():
        category = row["programme category"]

        if not any(x in category for x in allowed_categories):
            flags.append(False)
            remarks.append("Invalid programme category")
            continue

        if "live" in category and bt_col:
            try:
                bt_value = float(row[bt_col])
                if bt_value < 60:
                    flags.append(False)
                    remarks.append("BT too low for live program")
                    continue
            except:
                flags.append(False)
                remarks.append("Invalid BT value")
                continue

        flags.append(True)
        remarks.append("")

    df.columns = original_cols
    df["event_quality_flag"] = flags
    df["event_quality_remark"] = remarks
    return df

def home_market_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    required_cols = ["match", "programme category", "home/away", "country", "channel country"]
    missing = [c for c in required_cols if c not in df.columns]
    
    if missing:
        df.columns = original_cols
        df["home_market_flag"] = False
        df["home_market_remark"] = f"Missing columns: {missing}"
        return df

    for col in required_cols:
        df[col] = df[col].astype(str).str.strip().str.lower()

    live_df = df[df["programme category"].str.contains("live|delayed", na=False)].copy()
    all_markets_in_mm = set(df["channel country"].dropna().unique())

    match_market_map = live_df.groupby("match")["channel country"].apply(lambda x: set(x)).to_dict()
    home_country_map = {}
    for _, row in live_df.iterrows():
        if row["home/away"] == "home":
            home_country_map[row["match"]] = row["country"]

    flags, remarks = [], []
    for _, row in df.iterrows():
        category, match = row["programme category"], row["match"]

        if not ("live" in category or "delayed" in category) or match not in home_country_map:
            flags.append(True)
            remarks.append("")
            continue

        home_country = home_country_map[match]
        available_markets = match_market_map.get(match, set())

        if home_country in available_markets:
            flags.append(True)
            remarks.append("")
        elif home_country not in all_markets_in_mm:
            flags.append(True)
            remarks.append(f"{home_country} not covered in MM (allowed)")
        else:
            flags.append(False)
            remarks.append(f"Missing home market broadcast: {home_country}")

    df.columns = original_cols
    df["home_market_flag"] = flags
    df["home_market_remark"] = remarks
    return df

def ps_market_channel_check(mm_df, rosco_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()
    
    r_df = rosco_df.copy()
    r_df.columns = r_df.columns.str.strip()

    r_df["ChannelCountry"] = r_df["ChannelCountry"].astype(str).str.lower().str.strip()
    r_df["ChannelName"] = r_df["ChannelName"].astype(str).str.lower().str.strip()

    valid_markets = set(r_df["ChannelCountry"].dropna().unique())
    valid_channels = set(r_df["ChannelName"].dropna().unique())

    flags, remarks = [], []
    for _, row in df.iterrows():
        market = str(row.get("channel country", "")).lower().strip()
        channel = str(row.get("channel", "")).lower().strip()

        issues = []
        if market not in valid_markets: issues.append(f"Invalid market: {market}")
        if channel not in valid_channels: issues.append(f"Invalid channel: {channel}")

        if issues:
            flags.append(False)
            remarks.append(" | ".join(issues))
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["PS_Market_Channel_Flag"] = flags
    df["PS_Market_Channel_Remark"] = remarks
    return df

def ps_content_check(mm_df, rosco_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()
    
    r_df = rosco_df.copy()
    r_df.columns = r_df.columns.str.strip()

    if "programme" in df.columns:
        df["programme"] = df["programme"].astype(str).str.lower().str.strip()
    r_df["ChannelPrograms"] = r_df["ChannelPrograms"].astype(str).str.lower().str.strip()

    valid_programs = set(r_df["ChannelPrograms"].dropna().unique())
    flags, remarks = [], []

    for _, row in df.iterrows():
        prog = row.get("programme", "")
        if prog not in valid_programs:
            flags.append(False)
            remarks.append(f"Programme not in ROSCO: {prog}")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["PS_Content_Flag"] = flags
    df["PS_Content_Remark"] = remarks
    return df

def mm_bsr_consistency_check(mm_df, bsr_input):
    try:
        if isinstance(bsr_input, str):
            bsr_df = pd.read_excel(bsr_input)
        else:
            bsr_df = bsr_input.copy()

        df = mm_df.copy()
        original_cols = df.columns.tolist()
        df.columns = df.columns.str.strip().str.lower()
        bsr_df.columns = bsr_df.columns.str.strip().str.lower()

        if "home team" in bsr_df.columns and "away team" in bsr_df.columns:
            bsr_df["match"] = bsr_df["home team"].astype(str).str.strip() + " vs " + bsr_df["away team"].astype(str).str.strip()

        id_cols = ["event", "matchday", "competition", "match"]
        missing = [c for c in id_cols if c not in df.columns]
        if missing:
            df.columns = original_cols
            df["MM_BSR_Flag"] = False
            df["MM_BSR_Remark"] = f"Missing columns in MM: {missing}"
            return df

        for col in id_cols:
            df[col] = df[col].astype(str).str.lower().str.strip()
            if col in bsr_df.columns:
                bsr_df[col] = bsr_df[col].astype(str).str.lower().str.strip()

        df["_key"] = df["event"] + "|" + df["matchday"] + "|" + df["match"]
        bsr_df["_key"] = bsr_df["event"] + "|" + bsr_df["matchday"] + "|" + bsr_df["match"]
        bsr_map = bsr_df.drop_duplicates(subset=["_key"]).set_index("_key")

        flags, remarks = [], []
        for _, row in df.iterrows():
            key = row["_key"]
            if key not in bsr_map.index:
                flags.append(False)
                remarks.append("Match not found in BSR file")
                continue

            bsr_row = bsr_map.loc[key]
            mm_comp = str(row.get("competition", "")).strip()
            bsr_comp = str(bsr_row.get("competition", "")).strip()

            if mm_comp != bsr_comp:
                flags.append(False)
                remarks.append(f"Competition mismatch → MM: {mm_comp} | BSR: {bsr_comp}")
            else:
                flags.append(True)
                remarks.append("")

        df.columns = original_cols + ["_key"]
        df["MM_BSR_Flag"] = flags
        df["MM_BSR_Remark"] = remarks
        df.drop(columns=["_key"], inplace=True)
        return df

    except Exception as e:
        mm_df["MM_BSR_Flag"] = False
        mm_df["MM_BSR_Remark"] = f"Error: {str(e)}"
        return mm_df

def audience_spot_range_clean_view(mm_df):
    df = mm_df.copy()
    df.columns = df.columns.str.strip().str.lower()

    category_col = "programme category"
    channel_col = "channel"
    
    audience_col = next((c for c in ["audience (in mio)", "audience (in 000's)", "audience (in 000s)", "audience"] if c in df.columns), None)
    spot_col = next((c for c in ["spot price", "spotprice"] if c in df.columns), None)

    if not audience_col or not spot_col or category_col not in df.columns or channel_col not in df.columns:
        return pd.DataFrame([{"Error": "Missing required columns for Audience Range logic"}])

    output = []
    df = df.dropna(subset=[category_col, channel_col])
    grouped = df.groupby([category_col, channel_col])

    for (category, channel), group in grouped:
        group = group.copy()
        group[audience_col] = pd.to_numeric(group[audience_col], errors="coerce")
        group[spot_col] = pd.to_numeric(group[spot_col], errors="coerce")

        median_val = group[audience_col].median()
        if pd.isna(median_val) or median_val == 0: continue

        lower, upper = median_val * 0.5, median_val * 1.5

        for _, row in group.iterrows():
            val = row[audience_col]
            flag, remark, audience_viewers = True, "", None

            if pd.notna(val):
                # Check multiplier based on column name
                multiplier = 1_000_000 if "mio" in audience_col else (1_000 if "000" in audience_col else 1)
                audience_viewers = int(val * multiplier)

                if val > upper:
                    flag, remark = False, "Audience > 50% above expected range"
                elif val < lower:
                    flag, remark = False, "Audience > 50% below expected range"
            else:
                flag, remark = False, "Audience missing"

            output.append({
                "Programme Category": category,
                "Channel": channel,
                "Audience (viewers)": audience_viewers,
                "Spot Price": row[spot_col],
                "Flag": flag,
                "Remark": remark
            })

    return pd.DataFrame(output)

def ea_creation_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    col = "child analysis status"
    if col not in df.columns:
        df.columns = original_cols
        df["EA_Creation_Flag"] = False
        df["EA_Creation_Remark"] = "Missing column: child analysis status"
        return df

    flags, remarks = [], []
    for _, row in df.iterrows():
        val = row.get(col)
        if pd.isna(val) or str(val).strip() == "":
            flags.append(False)
            remarks.append("EA not created (Child Analysis missing)")
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["EA_Creation_Flag"] = flags
    df["EA_Creation_Remark"] = remarks
    return df

def previous_delivery_check(current_df, prev_df):
    c_df, p_df = current_df.copy(), prev_df.copy()
    c_df.columns = c_df.columns.str.strip().str.lower()
    p_df.columns = p_df.columns.str.strip().str.lower()

    aud_col_curr = next((c for c in ["audience (in mio)", "audience (in 000's)", "audience"] if c in c_df.columns), None)
    aud_col_prev = next((c for c in ["audience (in mio)", "audience (in 000's)", "audience"] if c in p_df.columns), None)
    spot_col = "spot price"

    required = ["programme category", "channel"]
    if not aud_col_curr or not aud_col_prev or spot_col not in c_df.columns or spot_col not in p_df.columns or any(c not in c_df.columns for c in required):
        return pd.DataFrame([{"Error": "Missing required columns in current or previous file"}])

    for df, aud in [(c_df, aud_col_curr), (p_df, aud_col_prev)]:
        df[aud] = pd.to_numeric(df[aud], errors="coerce")
        df[spot_col] = pd.to_numeric(df[spot_col], errors="coerce")
        multiplier = 1_000_000 if "mio" in aud else (1_000 if "000" in aud else 1)
        df["audience"] = df[aud] * multiplier

    curr_grp = c_df.groupby(["programme category", "channel"])
    prev_grp = p_df.groupby(["programme category", "channel"])

    output = []
    for key, curr_group in curr_grp:
        category, channel = key
        curr_med_aud, curr_med_sp = curr_group["audience"].median(), curr_group[spot_col].median()

        if key in prev_grp.groups:
            prev_group = prev_grp.get_group(key)
            p_aud, p_sp = prev_group["audience"], prev_group[spot_col]
            aud_lower, aud_upper = p_aud.min() * 0.5, p_aud.max() * 1.5
            sp_lower, sp_upper = p_sp.min() * 0.5, p_sp.max() * 1.5
            prev_med_aud, prev_med_sp = p_aud.median(), p_sp.median()
        else:
            aud_lower = aud_upper = sp_lower = sp_upper = prev_med_aud = prev_med_sp = None

        flag, remarks = True, []
        if aud_lower is not None and pd.notna(curr_med_aud) and not (aud_lower <= curr_med_aud <= aud_upper):
            flag, _ = False, remarks.append(f"Audience out of range (Expected: {aud_lower:.0f}-{aud_upper:.0f})")
        if sp_lower is not None and pd.notna(curr_med_sp) and not (sp_lower <= curr_med_sp <= sp_upper):
            flag, _ = False, remarks.append(f"Spot Price out of range (Expected: {sp_lower:.0f}-{sp_upper:.0f})")

        output.append({
            "Programme Category": category,
            "Channel": channel,
            "Current Audience Median": round(curr_med_aud, 0) if pd.notna(curr_med_aud) else None,
            "Previous Audience Median": round(prev_med_aud, 0) if prev_med_aud else None,
            "Current Spot Price Median": round(curr_med_sp, 0) if pd.notna(curr_med_sp) else None,
            "Previous Spot Price Median": round(prev_med_sp, 0) if prev_med_sp else None,
            "Audience Range": f"{round(aud_lower,0)} - {round(aud_upper,0)}" if aud_lower else "",
            "Spot Price Range": f"{round(sp_lower,0)} - {round(sp_upper,0)}" if sp_lower else "",
            "Flag": flag,
            "Remark": " | ".join(remarks)
        })

    return pd.DataFrame(output)

def live_delayed_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    required_cols = ["programme category", "match", "bt"]
    missing = [c for c in required_cols if c not in df.columns]
    
    if missing:
        df.columns = original_cols
        df["Live_Delayed_Check_Flag"] = False
        df["Live_Delayed_Check_Remark"] = f"Missing columns: {missing}"
        return df

    flags, remarks = [], []
    for _, row in df.iterrows():
        category = str(row.get("programme category", "")).lower()
        match = str(row.get("match", "")).strip()
        bt = row.get("bt")

        if not ("live" in category or "delayed" in category):
            flags.append(True)
            remarks.append("")
            continue

        issues = []
        if match == "" or match.lower() == "nan":
            issues.append("Match missing for live/delayed entry")
        if not any(x in category for x in ["live", "delayed"]):
            issues.append(f"Invalid category for live/delayed: {category}")

        try:
            if float(bt) < 90: issues.append("BT too low for live/delayed (expected ≥ 90 mins)")
        except:
            issues.append("Invalid BT value")

        if issues:
            flags.append(False)
            remarks.append(" | ".join(issues))
        else:
            flags.append(True)
            remarks.append("")

    df.columns = original_cols
    df["Live_Delayed_Check_Flag"] = flags
    df["Live_Delayed_Check_Remark"] = remarks
    return df

def program_analysis_status_check(mm_df):
    df = mm_df.copy()
    original_cols = df.columns.tolist()
    df.columns = df.columns.str.strip().str.lower()

    status_col = next((c for c in ["analysis status", "status", "mm status", "child analysis status"] if c in df.columns), None)

    if not status_col:
        df.columns = original_cols
        df["Program_Status_Flag"] = False
        df["Program_Status_Remark"] = "Missing status column"
        return df

    flags, remarks = [], []
    for _, row in df.iterrows():
        status = str(row.get(status_col, "")).strip().lower()

        if status == "done":
            flags.append(True)
            remarks.append("")
        elif status == "ready":
            flags.append(False)
            remarks.append("Status is READY (should be moved to DONE)")
        elif status in ["", "nan"]:
            flags.append(False)
            remarks.append("Status missing")
        else:
            flags.append(False)
            remarks.append(f"Invalid status: {status}")

    df.columns = original_cols
    df["Program_Status_Flag"] = flags
    df["Program_Status_Remark"] = remarks
    return df