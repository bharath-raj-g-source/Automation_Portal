# import os

# import pandas as pd
# import numpy as np
# import logging
# from .common import _find_column, _is_present

# # ----------------------------- 3️⃣ Period Check -----------------------------
# def period_check(bsr_df, start_date, end_date):
#     bsr_df = bsr_df.copy()

#     start_ts = pd.to_datetime(start_date).normalize()
#     end_ts   = pd.to_datetime(end_date).normalize()

#     utc_col = None
#     local_col = None

#     for c in bsr_df.columns:
#         cname = str(c).lower().replace(" ", "").replace("_", "")
#         # ✅ NEVER treat the "Day" column as a date column
#         if str(c).strip().lower() == "day":
#             continue
#         if "date" in cname and "utc" in cname:
#             utc_col = c
#         elif cname == "date":
#             local_col = c

#     if utc_col is None and local_col is None:
#         raise ValueError("No valid date columns found in BSR")

#     def normalize_dt(series):
#         if pd.api.types.is_datetime64_any_dtype(series):
#             return series.dt.normalize()
#         return pd.to_datetime(series, errors="coerce").dt.normalize()

#     bsr_df["BSR_UTC_Date"] = (
#         normalize_dt(bsr_df[utc_col]) if utc_col else pd.NaT
#     )
#     bsr_df["BSR_Local_Date"] = (
#         normalize_dt(bsr_df[local_col]) if local_col else pd.NaT
#     )

#     utc_in_range = bsr_df["BSR_UTC_Date"].between(start_ts, end_ts)
#     local_in_range = bsr_df["BSR_Local_Date"].between(start_ts, end_ts)

#     bsr_df["Within_Period_OK"] = utc_in_range | local_in_range
#     bsr_df["Within_Period_Remark"] = bsr_df["Within_Period_OK"].apply(
#         lambda x: "" if x else "Date outside monitoring period"
#     )

#     return bsr_df

# # ----------------------------- 4️⃣ Completeness Check -----------------------------
# def get_sport_from_rosco(rosco_path):
#     try:
#         df_rosco = pd.read_excel(rosco_path, sheet_name="General Information", header=None)

#         for i in range(len(df_rosco)):
#             for j in range(len(df_rosco.columns) - 1):
#                 cell = str(df_rosco.iat[i, j]).strip().lower()

#                 if cell == "sports":
#                     return str(df_rosco.iat[i, j + 1]).strip().lower()

#         return ""
#     except:
#         return ""


# def is_motorsport_type(sport_value):
#     keywords = ["motor", "motorsport", "formula", "f1", "moto", "nascar", "race"]
#     return any(k in sport_value for k in keywords)

# def completeness_check(df, bsr_cols, rules, rosco_path= None):
#     colmap = {
#         "tv_channel": _find_column(df, bsr_cols['tv_channel']),
#         "channel_id": _find_column(df, bsr_cols.get('channel_id')),
#         "broadcaster": _find_column(df, bsr_cols.get('broadcaster')),
#         "type_of_program": _find_column(df, bsr_cols.get('type_of_program')),
#         "match_day": _find_column(df, bsr_cols.get('matchday') or bsr_cols.get('match_day', [])),
#         "home_team": _find_column(df, bsr_cols.get('home_team')),
#         "away_team": _find_column(df, bsr_cols.get('away_team')),
#         "aud_estimates": _find_column(df, bsr_cols.get('aud_estimates')),
#         "aud_metered": _find_column(df, bsr_cols.get('aud_metered')),
#         "source": _find_column(df, bsr_cols.get('source'))
#     }

#     df["Completeness_OK"] = True
#     df["Completeness_Remark"] = ""

#     live_types = set(rules.get('live_types', ['live', 'repeat', 'delayed']))
#     sport_value = get_sport_from_rosco(rosco_path) if rosco_path else ""
#     is_motorsport = is_motorsport_type(sport_value)

#     for idx, row in df.iterrows():
#         missing = []

#         # ---------------- Base mandatory fields ----------------
#         for logical, display in [
#             ("tv_channel", "TV Channel"),
#             ("channel_id", "Channel ID"),
#             ("broadcaster", "Broadcaster"),
#             ("match_day", "Match Day"),
#             ("source", "Source")
#         ]:
#             colname = colmap.get(logical)
#             if colname is None:
#                 missing.append(f"{display} (column not found)")
#             elif not _is_present(row.get(colname)):
#                 missing.append(display)

#         # ---------------- Audience logic ----------------
#         aud_est_col = colmap.get("aud_estimates")
#         aud_met_col = colmap.get("aud_metered")

#         if not aud_est_col and not aud_met_col:
#             missing.append("Audience (Estimates/Metered) (columns not found)")
#         else:
#             est_present = _is_present(row.get(aud_est_col)) if aud_est_col else False
#             met_present = _is_present(row.get(aud_met_col)) if aud_met_col else False

#             if not est_present and not met_present:
#                 missing.append("Both Audience fields are empty")
#             elif est_present and met_present:
#                 missing.append("Both Audience fields are filled")

#         # ---------------- Program type ----------------
#         type_col = colmap.get("type_of_program")
#         prog_type = str(row.get(type_col) or "").strip().lower() if type_col else ""

#         # ---------------- Simulcast detection ----------------
#         is_simulcast = False
#         for value in row.values:
#             try:
#                 if "simulcast" in str(value).lower():
#                     is_simulcast = True
#                     break
#             except Exception:
#                 continue

#         # ---------------- Home / Away logic ----------------
#         home_col = colmap.get("home_team")
#         away_col = colmap.get("away_team")

#         # ONLY enforce for Live / Repeat / Delayed AND not simulcast
#         if prog_type in live_types and not is_simulcast and not is_motorsport:
#             if not home_col:
#                 missing.append("Home Team (column not found)")
#             elif not _is_present(row.get(home_col)):
#                 missing.append("Home Team")

#             if not away_col:
#                 missing.append("Away Team (column not found)")
#             elif not _is_present(row.get(away_col)):
#                 missing.append("Away Team")

#         # Highlights & Magazine & Support → no Home/Away checks at all

#         # ---------------- Final result ----------------
#         if missing:
#             df.at[idx, "Completeness_OK"] = False
#             df.at[idx, "Completeness_Remark"] = "; ".join(missing)
#         else:
#             df.at[idx, "Completeness_Remark"] = "All key fields present"

#     return df

# def rates_and_ratings_check(df, bsr_cols):
#     est_col = _find_column(df, bsr_cols.get('aud_estimates'))
#     met_col = _find_column(df, bsr_cols.get('aud_metered'))
#     est_col_exists = est_col is not None and est_col in df.columns
#     met_col_exists = met_col is not None and met_col in df.columns
#     if est_col is None:
#         est_col = "Audience_Estimates_Dummy"
#         df[est_col] = np.nan
#         logging.warning("Rates/Ratings Check: Audience Estimates column not found.")
#     if met_col is None:
#         met_col = "Audience_Metered_Dummy"
#         df[met_col] = np.nan
#         logging.warning("Rates/Ratings Check: Audience Metered column not found.")
#     present_est = df[est_col].apply(_is_present)
#     present_met = df[met_col].apply(_is_present)
#     both_empty_mask = (~present_est) & (~present_met)
#     both_present_mask = (present_est) & (present_met)
#     exactly_one_mask = (present_est ^ present_met)
#     df["Rates_Ratings_QC_OK"] = True
#     df["Rates_Ratings_QC_Remark"] = ""
#     df.loc[both_empty_mask, "Rates_Ratings_QC_OK"] = False
#     df.loc[both_empty_mask, "Rates_Ratings_QC_Remark"] = "Missing audience ratings (both empty)"
#     df.loc[both_present_mask, "Rates_Ratings_QC_OK"] = False
#     df.loc[both_present_mask, "Rates_Ratings_QC_Remark"] = "Invalid: both metered and estimated present"
#     df.loc[exactly_one_mask, "Rates_Ratings_QC_OK"] = True
#     df.loc[exactly_one_mask, "Rates_Ratings_QC_Remark"] = "Valid: one rating source available"
#     if est_col == "Audience_Estimates_Dummy" and est_col in df.columns:
#         df.drop(columns=[est_col], inplace=True)
#     if met_col == "Audience_Metered_Dummy" and met_col in df.columns:
#         df.drop(columns=[met_col], inplace=True)
#     return df

# def country_channel_id_check(df, bsr_cols):
#     """
#     Check consistency of channel IDs per (market, tv_channel) pair.

#     RULE:
#     - For each (Market, TV-Channel) pair → must have exactly ONE unique non-blank Channel ID.
#     - If same pair appears with different non-blank Channel IDs → inconsistent.
#     - If the only channel_id is blank → inconsistent (Missing channel ID).
#     - Same TV-Channel across different markets is allowed (treated independently).

#     Adds these columns:
#         Market_Channel_ID_OK (bool)
#         Market_Channel_ID_Remark (str)
#     """

#     df = df.copy()  # work on a copy to avoid side-effects
#     df["Market_Channel_ID_OK"] = True
#     df["Market_Channel_ID_Remark"] = "OK"

#     # Resolve column names (use _find_column)
#     ch_col = _find_column(df, bsr_cols.get("tv_channel"))
#     ch_id_col = _find_column(df, bsr_cols.get("channel_id"))
#     mkt_col = _find_column(df, bsr_cols.get("market"))

#     if not all([ch_col, ch_id_col, mkt_col]):
#         logging.warning("Country/Channel ID Check: Missing required columns. Skipping.")
#         df["Market_Channel_ID_OK"] = False
#         df["Market_Channel_ID_Remark"] = "Check skipped: missing required columns"
#         return df

#     def norm(x):
#         if pd.isna(x) or x is None:
#             return ""
#         return str(x).strip()

#     # Build mapping: (market, tv_channel) → set(channel_ids) & row indices
#     pair_ids = {}
#     pair_idxs = {}

#     for idx, row in df.iterrows():
#         market = norm(row.get(mkt_col, ""))
#         channel = norm(row.get(ch_col, ""))
#         channel_id = norm(row.get(ch_id_col, ""))

#         # Normalize for comparisons (lower-case for market and channel)
#         key = (market.lower(), channel.lower())

#         pair_ids.setdefault(key, set()).add(channel_id)
#         pair_idxs.setdefault(key, []).append(idx)

#     # Evaluate each pair
#     for key, id_set in pair_ids.items():
#         idxs = pair_idxs.get(key, [])
#         # consider only non-blank IDs for uniqueness check
#         non_blank_ids = {cid for cid in id_set if cid != ""}

#         inconsistent = False
#         remark = "OK"

#         if len(non_blank_ids) == 0:
#             inconsistent = True
#             remark = "Missing channel ID"
#         elif len(non_blank_ids) > 1:
#             inconsistent = True
#             # keep blanks visible as <BLANK> if present
#             ids_list = [cid if cid != "" else "<BLANK>" for cid in sorted(id_set)]
#             # include market/channel for clarity in remark
#             market_display, channel_display = key
#             remark = f"Conflicting Channel IDs for {channel_display} in market {market_display}: {', '.join(ids_list)}"
#         else:
#             inconsistent = False
#             remark = "OK"

#         for i in idxs:
#             df.at[i, "Market_Channel_ID_OK"] = not inconsistent
#             df.at[i, "Market_Channel_ID_Remark"] = remark

#     return df

# def metered_channel_estimation_check(df, bsr_cols):
#     """
#     Validates metered channels using Market + Channel ID combination.
#     Skips channels where Source in master list = 'Broadcaster Data'
#     """

#     df = df.copy()
#     df["Metered_Estimation_Check_OK"] = True
#     df["Metered_Estimation_Check_Remark"] = "OK"

#     # --- 1. Load Local Master List ---
#     master_list_path = "master_metered_list.xlsx"

#     if not os.path.exists(master_list_path):
#         df["Metered_Estimation_Check_OK"] = False
#         df["Metered_Estimation_Check_Remark"] = "Error: master_metered_list.xlsx not found."
#         return df

#     try:
#         metered_list_df = pd.read_excel(master_list_path)

#         # Detect columns
#         m_col_market = _find_column(metered_list_df, ["market"])
#         m_col_ch_id = _find_column(metered_list_df, ["channel id", "channel_id"])
#         m_col_source = _find_column(metered_list_df, ["source"])

#         if not m_col_market or not m_col_ch_id:
#             df["Metered_Estimation_Check_OK"] = False
#             df["Metered_Estimation_Check_Remark"] = (
#                 f"Error: Master list headers mismatch. Found: {list(metered_list_df.columns)}"
#             )
#             return df

#         # --- Create reference sets ---
#         metered_reference_set = set()
#         broadcaster_skip_set = set()

#         for _, row in metered_list_df.iterrows():
#             market_val = str(row.get(m_col_market, "")).strip().lower()
#             channel_id_val = str(row.get(m_col_ch_id, "")).strip().lower()
#             key = (market_val, channel_id_val)

#             source_val = str(row.get(m_col_source, "")).strip().lower() if m_col_source else ""

#             if source_val == "broadcaster data":
#                 broadcaster_skip_set.add(key)
#             else:
#                 metered_reference_set.add(key)

#     except Exception as e:
#         df["Metered_Estimation_Check_OK"] = False
#         df["Metered_Estimation_Check_Remark"] = f"Error reading Master List: {e}"
#         return df

#     # --- 2. Resolve BSR Columns ---
#     col_market = _find_column(df, bsr_cols.get("market"))
#     col_ch_id = _find_column(df, bsr_cols.get("channel_id"))
#     col_est_aud = _find_column(df, bsr_cols.get("aud_estimates"))
#     col_met_aud = _find_column(df, bsr_cols.get("aud_metered"))

#     # --- 3. Run Validation ---
#     for idx, row in df.iterrows():
#         market_val = str(row.get(col_market, "")).strip().lower()
#         channel_id_val = str(row.get(col_ch_id, "")).strip().lower()

#         key = (market_val, channel_id_val)

#         # 🚫 Skip Broadcaster Data channels
#         if key in broadcaster_skip_set:
#             df.at[idx, "Metered_Estimation_Check_OK"] = True
#             df.at[idx, "Metered_Estimation_Check_Remark"] = (
#                 "Skipped: Source is Broadcaster Data"
#             )
#             continue

#         is_metered = key in metered_reference_set

#         if is_metered:
#             est_present = _is_present(row.get(col_est_aud))
#             met_present = _is_present(row.get(col_met_aud))

#             if est_present:
#                 df.at[idx, "Metered_Estimation_Check_OK"] = False
#                 df.at[idx, "Metered_Estimation_Check_Remark"] = (
#                     f"Violation: Metered channel (Market: {row.get(col_market)}, "
#                     f"Channel ID: {row.get(col_ch_id)}) has ESTIMATED data."
#                 )
#             elif not met_present:
#                 df.at[idx, "Metered_Estimation_Check_OK"] = False
#                 df.at[idx, "Metered_Estimation_Check_Remark"] = (
#                     f"Violation: Metered channel (Market: {row.get(col_market)}, "
#                     f"Channel ID: {row.get(col_ch_id)}) is missing metered audience."
#                 )
#         else:
#             df.at[idx, "Metered_Estimation_Check_Remark"] = "Non-metered channel"

#     return df



import os
import pandas as pd
import numpy as np
import logging
from .common import _find_column, _is_present
from pathlib import Path

# ----------------------------- 3️⃣ Period Check -----------------------------
def period_check(bsr_df, start_date, end_date, tolerance_days=1):
    """
    Checks if BSR dates fall within the specified period.
    Accounts for timezone spillovers (+/- 1 day) ONLY if the 'Source' 
    column indicates the program is 'Duplicated'.
    """
    # Force dayfirst=True and format="mixed" to correctly handle DD-MM-YYYY from UI and YYYY-MM-DD from file
    start_ts = pd.to_datetime(start_date, dayfirst=True, format="mixed").normalize()
    end_ts   = pd.to_datetime(end_date, dayfirst=True, format="mixed").normalize()

    start_buffer = start_ts - pd.Timedelta(days=tolerance_days)
    end_buffer   = end_ts + pd.Timedelta(days=tolerance_days)

    utc_col = None
    local_col = None
    source_col = None

    # Identify Date and Source columns (Grabbing the FIRST match to avoid overwriting)
    for c in bsr_df.columns:
        cname = str(c).lower().replace(" ", "").replace("_", "")
        clean_c = str(c).strip().lower()
        
        if clean_c == "day":
            continue
        elif "date" in cname and "utc" in cname and utc_col is None:
            utc_col = c
        elif cname == "date" and local_col is None:
            local_col = c
        elif "source" in clean_c and source_col is None: # Broader check for 'source'
            source_col = c

    if utc_col is None and local_col is None:
        raise ValueError("No valid date columns found in BSR")

    def normalize_dt(series):
        if pd.api.types.is_datetime64_any_dtype(series):
            return series.dt.normalize()
        # Added format="mixed" here to safely handle both date layouts in the DataFrame
        return pd.to_datetime(series, errors="coerce", dayfirst=True, format="mixed").dt.normalize()

    bsr_df["BSR_UTC_Date"] = normalize_dt(bsr_df[utc_col]) if utc_col else pd.NaT
    bsr_df["BSR_Local_Date"] = normalize_dt(bsr_df[local_col]) if local_col else pd.NaT

    # 1. Check strict bounds 
    strict_utc = bsr_df["BSR_UTC_Date"].between(start_ts, end_ts) if utc_col else pd.Series(False, index=bsr_df.index)
    strict_local = bsr_df["BSR_Local_Date"].between(start_ts, end_ts) if local_col else pd.Series(False, index=bsr_df.index)
    strict_in_range = strict_utc | strict_local

    # 2. Check buffered bounds (+/- 1 day)
    buffer_utc = bsr_df["BSR_UTC_Date"].between(start_buffer, end_buffer) if utc_col else pd.Series(False, index=bsr_df.index)
    buffer_local = bsr_df["BSR_Local_Date"].between(start_buffer, end_buffer) if local_col else pd.Series(False, index=bsr_df.index)
    buffer_in_range = buffer_utc | buffer_local

    # 3. Identify Duplicated Rows
    if source_col:
        is_duplicated = bsr_df[source_col].astype(str).str.contains("duplicated", case=False, na=False)
    else:
        print("⚠️ WARNING: Could not find a 'Source' column. The +/- 1 day duplicated rule will NOT be applied.")
        is_duplicated = pd.Series(False, index=bsr_df.index)

    # 4. Final OK Logic
    bsr_df["Within_Period_OK"] = strict_in_range | (buffer_in_range & is_duplicated)

    # 5. Apply remarks
    conditions = [
        strict_in_range,
        buffer_in_range & is_duplicated & ~strict_in_range
    ]
    
    choices = [
        "", 
        "These programs are duplicated from programs within period. Due to timezone difference they fall outside the period which is still relevant for the delivery"
    ]

    bsr_df["Within_Period_Remark"] = np.select(
        conditions, 
        choices, 
        default="Date outside monitoring period"
    )

    return bsr_df

# ----------------------------- 4️⃣ Completeness Check -----------------------------
def get_sport_from_rosco(rosco_path):
    try:
        # Load the excel sheet
        df_rosco = pd.read_excel(rosco_path, sheet_name="General Information", header=None)

        for i in range(len(df_rosco)):
            for j in range(len(df_rosco.columns) - 1):
                cell = str(df_rosco.iat[i, j]).strip().lower()

                # FIX: Use .startswith() to handle "Sports:" or "Sports " cleanly
                if cell.startswith("sports"):
                    return str(df_rosco.iat[i, j + 1]).strip().lower()

        return ""
    except Exception:
        return ""

def is_individual_sport(sport_value):
    """
    Checks if the sport is an Individual/Non-Team Sport (including motorsports and athletics).
    These sports do not require home and away team information.
    """
    keywords = [
        # Motorsports
        "motor", "motorsport", "formula", "f1", "moto", "nascar", "race",
        # Athletics / Track and Field
        "athletic", "track", "field", "olympics", "paralympics",
        # Other Individual / Non-Team Sports
        "golf", "cyclocross", "winter sports", "surfing", "cycling",
        "badminton", "horse racing", "equitation", "judo", "trail running",
        "mma", "skating", "tennis", "canoe", "sailing", "running",
        "boxing", "fencing", "swimming", "biathlon", "marthon", "marathon", 
        "dart", "wrestling", "table tennis"
    ]
    return any(k in sport_value for k in keywords)

def completeness_check(df, bsr_cols, rules, rosco_path=None):
    colmap = {
        "tv_channel": _find_column(df, bsr_cols['tv_channel']),
        "channel_id": _find_column(df, bsr_cols.get('channel_id')),
        "broadcaster": _find_column(df, bsr_cols.get('broadcaster')),
        "type_of_program": _find_column(df, bsr_cols.get('type_of_program')),
        "match_day": _find_column(df, bsr_cols.get('matchday') or bsr_cols.get('match_day', [])),
        "home_team": _find_column(df, bsr_cols.get('home_team')),
        "away_team": _find_column(df, bsr_cols.get('away_team')),
        "aud_estimates": _find_column(df, bsr_cols.get('aud_estimates')),
        "aud_metered": _find_column(df, bsr_cols.get('aud_metered')),
        "source": _find_column(df, bsr_cols.get('source'))
    }

    df["Completeness_OK"] = True
    df["Completeness_Remark"] = ""

    live_types = set(rules.get('live_types', ['live', 'repeat', 'delayed']))
    
    # Retrieve sport value from rosco
    sport_value = get_sport_from_rosco(rosco_path) if rosco_path else ""
    
    # Check if the sport falls under Individual / Non-Team Sport category
    is_individual = is_individual_sport(sport_value)

    for idx, row in df.iterrows():
        missing = []

        # ---------------- Base mandatory fields ----------------
        for logical, display in [
            ("tv_channel", "TV Channel"),
            ("channel_id", "Channel ID"),
            ("broadcaster", "Broadcaster"),
            ("match_day", "Match Day"),
            ("source", "Source")
        ]:
            colname = colmap.get(logical)
            if colname is None:
                missing.append(f"{display} (column not found)")
            elif not _is_present(row.get(colname)):
                missing.append(display)

        # ---------------- Audience logic ----------------
        aud_est_col = colmap.get("aud_estimates")
        aud_met_col = colmap.get("aud_metered")

        if not aud_est_col and not aud_met_col:
            missing.append("Audience (Estimates/Metered) (columns not found)")
        else:
            est_present = _is_present(row.get(aud_est_col)) if aud_est_col else False
            met_present = _is_present(row.get(aud_met_col)) if aud_met_col else False

            if not est_present and not met_present:
                missing.append("Both Audience fields are empty")
            elif est_present and met_present:
                missing.append("Both Audience fields are filled")

        # ---------------- Program type ----------------
        type_col = colmap.get("type_of_program")
        prog_type = str(row.get(type_col) or "").strip().lower() if type_col else ""

        # ---------------- Simulcast detection ----------------
        is_simulcast = False
        for value in row.values:
            try:
                if "simulcast" in str(value).lower():
                    is_simulcast = True
                    break
            except Exception:
                continue

        # ---------------- Home / Away logic ----------------
        home_col = colmap.get("home_team")
        away_col = colmap.get("away_team")

        # Skip logic triggers if the sport is an individual/non-team sport (including motorsports and athletics)
        if prog_type in live_types and not is_simulcast and not is_individual:
            if not home_col:
                missing.append("Home Team (column not found)")
            elif not _is_present(row.get(home_col)):
                missing.append("Home Team")

            if not away_col:
                missing.append("Away Team (column not found)")
            elif not _is_present(row.get(away_col)):
                missing.append("Away Team")

        # ---------------- Final result ----------------
        if missing:
            df.at[idx, "Completeness_OK"] = False
            df.at[idx, "Completeness_Remark"] = "; ".join(missing)
        else:
            df.at[idx, "Completeness_Remark"] = "All key fields present"

    return df

def rates_and_ratings_check(df, bsr_cols):
    est_col = _find_column(df, bsr_cols.get('aud_estimates'))
    met_col = _find_column(df, bsr_cols.get('aud_metered'))
    est_col_exists = est_col is not None and est_col in df.columns
    met_col_exists = met_col is not None and met_col in df.columns
    if est_col is None:
        est_col = "Audience_Estimates_Dummy"
        df[est_col] = np.nan
        logging.warning("Rates/Ratings Check: Audience Estimates column not found.")
    if met_col is None:
        met_col = "Audience_Metered_Dummy"
        df[met_col] = np.nan
        logging.warning("Rates/Ratings Check: Audience Metered column not found.")
    present_est = df[est_col].apply(_is_present)
    present_met = df[met_col].apply(_is_present)
    both_empty_mask = (~present_est) & (~present_met)
    both_present_mask = (present_est) & (present_met)
    exactly_one_mask = (present_est ^ present_met)
    df["Rates_Ratings_QC_OK"] = True
    df["Rates_Ratings_QC_Remark"] = ""
    df.loc[both_empty_mask, "Rates_Ratings_QC_OK"] = False
    df.loc[both_empty_mask, "Rates_Ratings_QC_Remark"] = "Missing audience ratings (both empty)"
    df.loc[both_present_mask, "Rates_Ratings_QC_OK"] = False
    df.loc[both_present_mask, "Rates_Ratings_QC_Remark"] = "Invalid: both metered and estimated present"
    df.loc[exactly_one_mask, "Rates_Ratings_QC_OK"] = True
    df.loc[exactly_one_mask, "Rates_Ratings_QC_Remark"] = "Valid: one rating source available"
    if est_col == "Audience_Estimates_Dummy" and est_col in df.columns:
        df.drop(columns=[est_col], inplace=True)
    if met_col == "Audience_Metered_Dummy" and met_col in df.columns:
        df.drop(columns=[met_col], inplace=True)
    return df

def country_channel_id_check(df, bsr_cols):
    """
    Check consistency of channel IDs per (market, tv_channel) pair.

    RULE:
    - For each (Market, TV-Channel) pair → must have exactly ONE unique non-blank Channel ID.
    - If same pair appears with different non-blank Channel IDs → inconsistent.
    - If the only channel_id is blank → inconsistent (Missing channel ID).
    - Same TV-Channel across different markets is allowed (treated independently).

    Adds these columns:
        Market_Channel_ID_OK (bool)
        Market_Channel_ID_Remark (str)
    """

    df["Market_Channel_ID_OK"] = True
    df["Market_Channel_ID_Remark"] = "OK"

    # Resolve column names (use _find_column)
    ch_col = _find_column(df, bsr_cols.get("tv_channel"))
    ch_id_col = _find_column(df, bsr_cols.get("channel_id"))
    mkt_col = _find_column(df, bsr_cols.get("market"))

    if not all([ch_col, ch_id_col, mkt_col]):
        logging.warning("Country/Channel ID Check: Missing required columns. Skipping.")
        df["Market_Channel_ID_OK"] = False
        df["Market_Channel_ID_Remark"] = "Check skipped: missing required columns"
        return df

    def norm(x):
        if pd.isna(x) or x is None:
            return ""
        return str(x).strip()

    # Build mapping: (market, tv_channel) → set(channel_ids) & row indices
    pair_ids = {}
    pair_idxs = {}

    for idx, row in df.iterrows():
        market = norm(row.get(mkt_col, ""))
        channel = norm(row.get(ch_col, ""))
        channel_id = norm(row.get(ch_id_col, ""))

        # Normalize for comparisons (lower-case for market and channel)
        key = (market.lower(), channel.lower())

        pair_ids.setdefault(key, set()).add(channel_id)
        pair_idxs.setdefault(key, []).append(idx)

    # Evaluate each pair
    for key, id_set in pair_ids.items():
        idxs = pair_idxs.get(key, [])
        # consider only non-blank IDs for uniqueness check
        non_blank_ids = {cid for cid in id_set if cid != ""}

        inconsistent = False
        remark = "OK"

        if len(non_blank_ids) == 0:
            inconsistent = True
            remark = "Missing channel ID"
        elif len(non_blank_ids) > 1:
            inconsistent = True
            # keep blanks visible as <BLANK> if present
            ids_list = [cid if cid != "" else "<BLANK>" for cid in sorted(id_set)]
            # include market/channel for clarity in remark
            market_display, channel_display = key
            remark = f"Conflicting Channel IDs for {channel_display} in market {market_display}: {', '.join(ids_list)}"
        else:
            inconsistent = False
            remark = "OK"

        for i in idxs:
            df.at[i, "Market_Channel_ID_OK"] = not inconsistent
            df.at[i, "Market_Channel_ID_Remark"] = remark

    return df

def metered_channel_estimation_check(df, bsr_cols):

    df["Metered_Estimation_Check_OK"] = True
    df["Metered_Estimation_Check_Remark"] = "OK"

    # Correct absolute path
    BASE_DIR = Path(__file__).resolve().parent
    master_list_path = BASE_DIR / "data" / "master_metered_list.xlsx"

    # File existence check
    if not master_list_path.exists():
        df["Metered_Estimation_Check_OK"] = False
        df["Metered_Estimation_Check_Remark"] = (
            f"Error: {master_list_path} not found."
        )
        return df

    try:
        metered_list_df = pd.read_excel(master_list_path)

        # Detect columns
        m_col_market = _find_column(metered_list_df, ["market"])
        m_col_ch_id = _find_column(metered_list_df, ["channel id", "channel_id"])
        m_col_source = _find_column(metered_list_df, ["source"])

        if not m_col_market or not m_col_ch_id:
            df["Metered_Estimation_Check_OK"] = False
            df["Metered_Estimation_Check_Remark"] = (
                f"Error: Master list headers mismatch. Found: {list(metered_list_df.columns)}"
            )
            return df

        # --- Create reference sets ---
        metered_reference_set = set()
        broadcaster_skip_set = set()

        for _, row in metered_list_df.iterrows():
            market_val = str(row.get(m_col_market, "")).strip().lower()
            channel_id_val = str(row.get(m_col_ch_id, "")).strip().lower()

            key = (market_val, channel_id_val)

            source_val = (
                str(row.get(m_col_source, "")).strip().lower()
                if m_col_source else ""
            )

            if source_val == "broadcaster data":
                broadcaster_skip_set.add(key)
            else:
                metered_reference_set.add(key)

    except Exception as e:
        df["Metered_Estimation_Check_OK"] = False
        df["Metered_Estimation_Check_Remark"] = (
            f"Error reading Master List: {e}"
        )
        return df

    # --- Resolve BSR Columns ---
    col_market = _find_column(df, bsr_cols.get("market"))
    col_ch_id = _find_column(df, bsr_cols.get("channel_id"))
    col_est_aud = _find_column(df, bsr_cols.get("aud_estimates"))
    col_met_aud = _find_column(df, bsr_cols.get("aud_metered"))

    # --- Run Validation ---
    for idx, row in df.iterrows():

        market_val = str(row.get(col_market, "")).strip().lower()
        channel_id_val = str(row.get(col_ch_id, "")).strip().lower()

        key = (market_val, channel_id_val)

        # Skip broadcaster data
        if key in broadcaster_skip_set:
            df.at[idx, "Metered_Estimation_Check_OK"] = True
            df.at[idx, "Metered_Estimation_Check_Remark"] = (
                "Skipped: Source is Broadcaster Data"
            )
            continue

        is_metered = key in metered_reference_set

        if is_metered:

            est_present = _is_present(row.get(col_est_aud))
            met_present = _is_present(row.get(col_met_aud))

            if est_present:
                df.at[idx, "Metered_Estimation_Check_OK"] = False
                df.at[idx, "Metered_Estimation_Check_Remark"] = (
                    f"Violation: Metered channel "
                    f"(Market: {row.get(col_market)}, "
                    f"Channel ID: {row.get(col_ch_id)}) "
                    f"has ESTIMATED data."
                )

            elif not met_present:
                df.at[idx, "Metered_Estimation_Check_OK"] = False
                df.at[idx, "Metered_Estimation_Check_Remark"] = (
                    f"Violation: Metered channel "
                    f"(Market: {row.get(col_market)}, "
                    f"Channel ID: {row.get(col_ch_id)}) "
                    f"is missing metered audience."
                )

        else:
            df.at[idx, "Metered_Estimation_Check_Remark"] = (
                "Non-metered channel"
            )

    return df

