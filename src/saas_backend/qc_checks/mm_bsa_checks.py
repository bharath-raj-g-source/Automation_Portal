import pandas as pd

def duplicate_aid_final(df):

    df = df.copy()
    df.columns = df.columns.str.strip()

    # Define combination
    group_cols = [
        "programme category",
        "country",
        "channel",
        "programme",
        "progr. start (date)",
        "progr. start (time)"
    ]

    # Create combo id
    df["_combo_id"] = df.groupby(group_cols).ngroup()

    # Count AIDs per combination
    df["_aid_count_per_combo"] = df.groupby(group_cols)["aID (MAT)"].transform("nunique")

    # Count combinations per AID
    df["_combo_count_per_aid"] = df.groupby("aID (MAT)")["_combo_id"].transform("nunique")

    flags = []
    remarks = []

    for _, row in df.iterrows():

        # PRIORITY 1: Same AID used across multiple combinations
        if row["_combo_count_per_aid"] > 1:
            flags.append(False)
            remarks.append(
                f"AID {row['aID (MAT)']} is used across multiple program combinations"
            )

        # PRIORITY 2: Multiple AIDs for same combination
        elif row["_aid_count_per_combo"] > 1:
            flags.append(False)
            remarks.append(
                f"Multiple AIDs assigned to same program combination ({row['programme']} at {row['progr. start (date)']} {row['progr. start (time)']})"
            )

        # 🟢 VALID
        else:
            flags.append(True)
            remarks.append("")

    # Final columns
    df["Duplicate_AID_Check_Flag"] = flags
    df["Duplicate_AID_Check_Remark"] = remarks

    # Drop helper columns
    df.drop(columns=[
        "_combo_id",
        "_aid_count_per_combo",
        "_combo_count_per_aid"
    ], inplace=True)

    return df


def audience_spotprice_check(df):

    df.columns = df.columns.str.strip()

    audience_col = "audience (in mio)"
    spot_price_col = "spot price"

    flags = []
    remarks = []

    for _, row in df.iterrows():

        audience = row[audience_col]
        spot_price = row[spot_price_col]

        audience_blank = pd.isna(audience) or str(audience).strip() == ""
        spot_blank = pd.isna(spot_price) or str(spot_price).strip() == ""

        if audience_blank and spot_blank:
            flags.append(False)
            remarks.append("Audience and Spot Price both are missing")

        elif audience_blank:
            flags.append(False)
            remarks.append("Audience value is missing")

        elif spot_blank:
            flags.append(False)
            remarks.append("Spot Price is missing")

        else:
            flags.append(True)
            remarks.append("")

    # 👉 IMPORTANT: Assign directly to SAME DF
    df["Audience_SpotPrice_Check_Flag"] = flags
    df["Audience_SpotPrice_Check_Remark"] = remarks

    return df

def program_category_check(df):

    df = df.copy()
    df.columns = df.columns.str.strip()

    category_col = "programme category"

    valid_categories = [
        "live",
        "sport (live)",
        "magazine",
        "highlights",
        "delayed",
        "relive",
        "news"
    ]

    flags = []
    remarks = []

    for _, row in df.iterrows():

        category = row.get(category_col)

        # Normalize
        if pd.isna(category):
            category_clean = ""
        else:
            category_clean = str(category).strip().lower()

        # ❌ Invalid / blank
        if category_clean == "":
            flags.append(False)
            remarks.append("Programme category is missing")

        elif category_clean not in valid_categories:
            flags.append(False)
            remarks.append(f"Invalid programme category: {category}")

        # ✅ Valid
        else:
            flags.append(True)
            remarks.append("Correct category")

    df["Program_Category_Check_Flag"] = flags
    df["Program_Category_Check_Remark"] = remarks

    return df

import re

def normalize_channel(name):
    if pd.isna(name):
        return ""
    name = str(name).lower()
    name = re.sub(r"\(.*?\)", "", name)   # remove brackets
    name = re.sub(r"[^a-z0-9]", "", name) # remove special chars
    return name.strip()


def channel_country_mapping_check(df, rosco_path):

    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()

    # -----------------------------------
    # STEP 1: READ ROSCO FILE
    # -----------------------------------
    rosco_excel = pd.ExcelFile(rosco_path)

    mapping_dict = {}

    for sheet in rosco_excel.sheet_names:

        if "rosco" not in sheet.lower():
            continue

        temp = pd.read_excel(rosco_excel, sheet_name=sheet)
        temp.columns = temp.columns.str.strip().str.lower()

        # Match correct columns
        if "channelname" in temp.columns and "channelcountry" in temp.columns:

            for _, row in temp.iterrows():
                ch_name = normalize_channel(row["channelname"])
                ch_country = str(row["channelcountry"]).strip().lower()

                if ch_name:
                    mapping_dict[ch_name] = ch_country

    # -----------------------------------
    # STEP 2: VALIDATE MM DATA
    # -----------------------------------
    flags = []
    remarks = []

    for _, row in df.iterrows():

        mm_channel_raw = row.get("channel")
        mm_country_raw = row.get("channel country")

        mm_channel = normalize_channel(mm_channel_raw)
        mm_country = str(mm_country_raw).strip().lower()

        # ❌ Channel not found
        if mm_channel not in mapping_dict:
            flags.append(False)
            remarks.append(f"Channel '{mm_channel_raw}' not found in ROSCO mapping")

        # ❌ Country mismatch
        elif mapping_dict[mm_channel] != mm_country:
            flags.append(False)
            remarks.append(
                f"Channel '{mm_channel_raw}' mapped to '{mapping_dict[mm_channel]}' but found in '{mm_country_raw}'"
            )

        # ✅ Valid
        else:
            flags.append(True)
            remarks.append("")

    df["Channel_Country_Check_Flag"] = flags
    df["Channel_Country_Check_Remark"] = remarks

    return df

def apt_bt_check(df, bt_threshold=None):

    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()

    apt_col = "apt"
    live_apt_col = "apt live"
    bt_col = "bt"
    category_col = "programme category"

    flags = []
    remarks = []

    for _, row in df.iterrows():

        category = str(row.get(category_col, "")).lower()

        # Safe conversions
        try:
            apt = float(row.get(apt_col))
        except:
            apt = None

        try:
            bt = float(row.get(bt_col))
        except:
            bt = None

        try:
            apt_live = float(row.get(live_apt_col))
        except:
            apt_live = None

        # -----------------------------------
        # PRIORITY 1: Live / Relive APT < 50%
        # -----------------------------------
        if category in ["live", "relive", "sport (live)"] and apt is not None and bt is not None:

            if apt < 0.5 * bt:
                flags.append(False)
                remarks.append("APT is less than 50% of BT for live/relive entry")
                continue

        # -----------------------------------
        # PRIORITY 2: Exceptionally high BT
        # -----------------------------------
        if bt_threshold is not None and bt is not None:

            if bt >= bt_threshold:
                flags.append(False)
                remarks.append(f"BT exceeds threshold ({bt_threshold})")
                continue

        # -----------------------------------
        # DEFAULT
        # -----------------------------------
        flags.append(True)
        remarks.append("")

    df["APT_BT_Check_Flag"] = flags
    df["APT_BT_Check_Remark"] = remarks

    return df

def season_monitoring_check(df, start_date, end_date):

    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()

    date_col = "progr. start (date)"

    # Convert input dates
    start = pd.to_datetime(start_date, errors="coerce")
    end = pd.to_datetime(end_date, errors="coerce")

    flags = []
    remarks = []

    for _, row in df.iterrows():

        prog_date = pd.to_datetime(row.get(date_col), dayfirst=True, errors="coerce")

        if pd.isna(prog_date):
            flags.append(False)
            remarks.append("Invalid programme start date")

        elif prog_date < start or prog_date > end:
            flags.append(False)
            remarks.append(
                f"Date {prog_date.date()} outside monitoring period ({start.date()} to {end.date()})"
            )

        else:
            flags.append(True)
            remarks.append("")

    df["Season_Check_Flag"] = flags
    df["Season_Check_Remark"] = remarks

    return df