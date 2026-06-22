# import pandas as pd
# import re
# from datetime import datetime, timedelta, time
# from .common import _find_column

# def overlap_duplicate_daybreak_check(df, bsr_cols, rules):
#     df = df.copy()

#     # --------------------------------------------------
#     # Column resolution
#     # --------------------------------------------------
#     col_channel = _find_column(df, bsr_cols.get("tv_channel"))
#     col_channel_id = _find_column(df, bsr_cols.get("channel_id"))
#     col_market = _find_column(df, bsr_cols.get("market"))
#     col_broadcaster = _find_column(df, bsr_cols.get("broadcaster"))

#     col_date = (
#         _find_column(df, ["Date (UTC)", "Date (UTC/GMT)"])
#         or _find_column(df, ["Date"])
#     )
#     col_start = (
#         _find_column(df, ["Start (UTC)", "Start UTC"])
#         or _find_column(df, ["Start"])
#     )
#     col_end = (
#         _find_column(df, ["End (UTC)", "End UTC"])
#         or _find_column(df, ["End"])
#     )

#     col_prog_type = (
#         _find_column(df, bsr_cols.get("type_of_program"))
#         or _find_column(df, ["Program Type", "Type of Program"])
#     )

#     if not col_market or not col_date or not col_start or not col_end:
#         return df

#     compare_channel = col_channel if col_channel else col_channel_id
#     if not compare_channel:
#         return df

#     # --------------------------------------------------
#     # Build timezone-naive datetimes ONLY
#     # --------------------------------------------------
#     def build_dt(d, t):
#         if pd.isna(d) or pd.isna(t):
#             return pd.NaT
#         try:
#             date_part = pd.to_datetime(d, errors="coerce")
#             if pd.isna(date_part):
#                 return pd.NaT

#             # 🔥 HANDLE EXCEL TIME (0 / 1 issue FIX)
#             if isinstance(t, (int, float)):
#                 time_part = pd.to_timedelta(float(t), unit="D")
#             else:
#                 # Handle HH:MM:SS
#                 try:
#                     time_part = pd.to_timedelta(str(t))
#                 except:
#                     return pd.NaT

#             return date_part + time_part

#         except Exception:
#             return pd.NaT

#     df["_start_dt"] = df.apply(lambda r: build_dt(r[col_date], r[col_start]), axis=1)
#     df["_end_dt"]   = df.apply(lambda r: build_dt(r[col_date], r[col_end]), axis=1)

#     # HARD safety: ensure tz-naive
#     df["_start_dt"] = pd.to_datetime(df["_start_dt"], errors="coerce").dt.tz_localize(None)
#     df["_end_dt"]   = pd.to_datetime(df["_end_dt"], errors="coerce").dt.tz_localize(None)

#     # --------------------------------------------------
#     # Fix cross-midnight programs
#     # --------------------------------------------------
#     mask_midnight = (
#         pd.notna(df["_start_dt"]) &
#         pd.notna(df["_end_dt"]) &
#         (df["_end_dt"] < df["_start_dt"])
#     )
#     df.loc[mask_midnight, "_end_dt"] += pd.Timedelta(days=1)

#     # --------------------------------------------------
#     # Normalize program type
#     # --------------------------------------------------
#     df["_prog_type_norm"] = (
#         df[col_prog_type].fillna("").astype(str).str.lower().str.strip()
#         if col_prog_type else ""
#     )

#     # --------------------------------------------------
#     # Preserve original order
#     # --------------------------------------------------
#     df["_orig_idx"] = df.index

#     # --------------------------------------------------
#     # ✅ CRITICAL: FULL CHRONOLOGICAL SORT
#     # Channel → Market → Date → Start time
#     # --------------------------------------------------
#     df["_sort_date"] = df["_start_dt"].dt.date

#     df = df.sort_values(
#         [compare_channel, col_market, "_sort_date", "_start_dt"],
#         na_position="last"
#     ).reset_index(drop=True)

#     n = len(df)

#     # --------------------------------------------------
#     # Output containers
#     # --------------------------------------------------
#     overlap_ok   = [pd.NA] * n
#     overlap_r    = [""] * n
#     duplicate_ok = [True] * n
#     duplicate_r  = [""] * n
#     daybreak_ok  = [pd.NA] * n
#     daybreak_r   = [""] * n

#     # --------------------------------------------------
#     # Duplicate check (IGNORE INTERNET / WWW)
#     # --------------------------------------------------
#     col_pay_free = _find_column(df, ["Pay/Free TV", "Pay Free TV", "Platform", "Distribution"])

#     dup_cols = [compare_channel, col_market, col_date, col_start, col_end]
#     if col_broadcaster:
#         dup_cols.insert(2, col_broadcaster)

#     # Default: no duplicates
#     dup_mask = pd.Series([False] * n)

#     try:
#         if col_pay_free:
#             # Identify internet / www rows (case-insensitive, partial match)
#             internet_mask = (
#                 df[col_pay_free]
#                 .fillna("")
#                 .astype(str)
#                 .str.lower()
#                 .str.contains(r"internet|internet stream|www", regex=True)
#             )

#             # Run duplicate check ONLY on non-internet rows
#             non_internet_df = df.loc[~internet_mask, dup_cols]
#             dup_non_internet = non_internet_df.duplicated(keep=False)

#             # Map results back to full DataFrame
#             dup_mask.loc[~internet_mask] = dup_non_internet.values
#         else:
#             # No Pay/Free TV column → original behavior
#             dup_mask = df.duplicated(subset=dup_cols, keep=False)

#     except Exception:
#         dup_mask = pd.Series([False] * n)

#     # Assign results
#     for i in range(n):
#         if dup_mask.iloc[i]:
#             duplicate_ok[i] = False
#             duplicate_r[i] = "In-market duplicate (same channel/market/date/start/end)"

#     # --------------------------------------------------
#     # ✅ OVERLAP CHECK (WITH INTERNET / MATCH BYPASS)
#     # --------------------------------------------------
#     VALID_TYPES = {"live", "repeat", "delayed"}

#     col_pay_free = _find_column(df, ["Pay/Free TV", "Pay Free TV", "Platform", "Distribution"])
#     col_combined = _find_column(df, ["Combined"])
#     col_phase = _find_column(df, ["Phase/Fixture/Episode", "Phase / Fixture / Episode"])
#     col_prog_desc = _find_column(df, ["Program Description", "Program Desc"])

#     def normalize_match_text(text):
#         if not text:
#             return ""
#         text = str(text).lower()
#         text = re.sub(r"(simulcast|live|repeat|delayed)", "", text)
#         text = re.sub(r"\bvs\.?\b|\bv\b", "vs", text)
#         text = re.sub(r"[^a-z0-9\s]", " ", text)
#         text = re.sub(r"\s+", " ", text).strip()
#         return text

#     def get_match_signature(row):
#         parts = []
#         if col_combined:
#             parts.append(str(row[col_combined] or ""))
#         if col_phase:
#             parts.append(str(row[col_phase] or ""))
#         if col_prog_desc:
#             parts.append(str(row[col_prog_desc] or ""))
#         return normalize_match_text(" ".join(parts))

#     def is_internet_row(row):
#         if not col_pay_free:
#             return False
#         val = str(row[col_pay_free] or "").lower()
#         return "internet" in val or "www" in val

#     prev_key = None
#     prev_end = None
#     prev_row = None
#     prev_match = None

#     for i in range(n):
#         row = df.iloc[i]
#         key = (row[compare_channel], row[col_market], row["_sort_date"])
#         start = row["_start_dt"]
#         end = row["_end_dt"]
#         ptype = row["_prog_type_norm"]

#         # --------------------------------------------------
#         # 🚀 HARD INTERNET BYPASS
#         # --------------------------------------------------
#         if is_internet_row(row):
#             overlap_ok[i] = True
#             overlap_r[i] = "Internet Channel, skipped overlap check"
#             prev_key = key
#             prev_end = end
#             prev_row = row
#             prev_match = get_match_signature(row)
#             continue

#         if key != prev_key:
#             prev_end = None
#             prev_row = None
#             prev_match = None

#         if ptype and ptype not in VALID_TYPES:
#             overlap_ok[i] = pd.NA
#             overlap_r[i] = f"Ignored program type '{ptype}'"
#             prev_key = key
#             continue

#         if pd.isna(start) or pd.isna(end) or end <= start:
#             overlap_ok[i] = pd.NA
#             overlap_r[i] = "Not Applicable – invalid timing"
#             prev_key = key
#             continue

#         if prev_end is None:
#             overlap_ok[i] = True
#             overlap_r[i] = "OK (first program)"
#             prev_end = end
#             prev_row = row
#             prev_match = get_match_signature(row)
#             prev_key = key
#             continue

#         if start == prev_end:
#             overlap_ok[i] = True
#             overlap_r[i] = "OK – back-to-back"
#             prev_end = end
#             prev_row = row
#             prev_match = get_match_signature(row)
#             prev_key = key
#             continue

#         if start < prev_end:
#             overlap_ok[i] = False
#             overlap_r[i] = (
#                 f"Overlap: starts {start.time()} "
#                 f"before previous ends {prev_end.time()}"
#             )
#             prev_end = max(prev_end, end)
#             prev_row = row
#             prev_match = get_match_signature(row)
#             prev_key = key
#             continue

#         overlap_ok[i] = True
#         overlap_r[i] = "OK"
#         prev_end = end
#         prev_row = row
#         prev_match = get_match_signature(row)
#         prev_key = key

#     # --------------------------------------------------
#     # ✅ FINAL DAYBREAK LOGIC (FIXED)
#     # --------------------------------------------------
#     gap_tolerance = rules.get("daybreak_gap_tolerance_min", 30)

#     for i in range(1, n):
#         prev = df.iloc[i - 1]
#         curr = df.iloc[i]

#         daybreak_ok[i] = True
#         daybreak_r[i] = "OK"

#         if not (
#             str(prev[compare_channel]) == str(curr[compare_channel]) and
#             str(prev[col_market]) == str(curr[col_market])
#         ):
#             continue

#         if pd.isna(prev["_end_dt"]) or pd.isna(curr["_start_dt"]):
#             daybreak_r[i] = "OK – missing timestamps"
#             continue

#         prev_end = prev["_end_dt"]
#         curr_start = curr["_start_dt"]

#         prev_combined = str(prev.get(col_combined, "")).strip().lower()
#         curr_combined = str(curr.get(col_combined, "")).strip().lower()

#         if not prev_combined or not curr_combined or prev_combined != curr_combined:
#             daybreak_r[i] = "OK – different match"
#             continue

#         # ✅ FIXED DATE LOGIC
#         same_or_next_day = (
#             curr_start.date() == prev_end.date() or
#             curr_start.date() == (prev_end.date() + pd.Timedelta(days=1))
#         )

#         if not same_or_next_day:
#             daybreak_r[i] = "OK – not a daybreak"
#             continue

#         gap = (curr_start - prev_end).total_seconds() / 60

#         if 0 <= gap <= gap_tolerance:
#             daybreak_ok[i] = False
#             daybreak_r[i] = "Daybreak – same match continued across midnight"
#         else:
#             daybreak_r[i] = f"OK – gap too large ({gap:.1f} min)"

#     # --------------------------------------------------
#     # Final assignment
#     # --------------------------------------------------
#     df["Duplicate_OK"] = duplicate_ok
#     df["Duplicate_Remark"] = duplicate_r
#     df["Overlap_OK"] = overlap_ok
#     df["Overlap_Remark"] = overlap_r
#     df["Daybreak_OK"] = daybreak_ok
#     df["Daybreak_Remark"] = daybreak_r

#     return df.sort_values("_orig_idx").drop(
#         columns=[
#             "_start_dt",
#             "_end_dt",
#             "_sort_date",
#             "_orig_idx",
#             "_prog_type_norm"
#         ],
#         errors="ignore"
#     )

# def program_category_check(bsr_path, df, col_map, rules, file_rules):
#     from datetime import datetime, timedelta, time

#     # -------------------------
#     # Helpers
#     # -------------------------
#     def find_col(names):
#         for c in df.columns:
#             c_clean = c.strip().lower()
#             for n in names:
#                 if n.strip().lower() in c_clean:
#                     return c
#         return None

#     def parse_date(val):
#         if pd.isna(val):
#             return None
#         if isinstance(val, (datetime, pd.Timestamp)):
#             return val.date()
#         return pd.to_datetime(val,errors="coerce").date()
   
#     with pd.ExcelFile(bsr_path) as xl:
#         for s in xl.sheet_names:
#             if "fixtures" in s.strip().lower():
#                 fixtures_df = xl.parse(s)
#                 break
   
#     def normalize_team(name):
#         if pd.isna(name):
#             return ""
#         name = str(name).lower()
#         # Remove everything in parentheses including the parentheses
#         name = re.sub(r"\(.*?\)", "", name)
#         # Remove common suffixes that cause mismatches
#         name = name.replace("fsf", "").replace("fs", "").replace("at.", "atletico")
#         # Keep only alphanumeric
#         name = re.sub(r"[^a-z0-9]", "", name)
#         return name.strip()

#     def parse_time(val):
#         if pd.isna(val):
#             return None
#         if isinstance(val, time):
#             return val
#         if isinstance(val, (datetime, pd.Timestamp)):
#             return val.time()
#         if isinstance(val, str) and not val.strip().startswith("#"):
#             return pd.to_datetime(val, errors="coerce").time()
#         return None

#     # -------------------------
#     # Column detection
#     # -------------------------
#     col_program_type = find_col(["program type", "type of program"])
#     col_desc = find_col(["combined (translated)", "program description", "description"])
#     col_duration = find_col(["duration", "duration (mins)"])
#     # ---- Robust UTC column detection ----
#     col_datetime_utc = find_col(["date + time utc", "datetime utc", "date time utc"])
#     if col_datetime_utc:
#         col_date_utc = col_datetime_utc
#         col_start_utc = col_datetime_utc
#     else:
#         col_date_utc = find_col(["date"])
#         col_start_utc = find_col(["start"])
#     col_home = find_col(["home team"])
#     col_away = find_col(["away team"])
#     col_phase = find_col(["phase", "fixture", "episode"])
   
#     # -------------------------
#     # Extract Monitoring Period (C3 of ROSCO)
#     # -------------------------
#     monitor_start = None
#     monitor_end = None

#     rosco_path = file_rules.get("rosco_path")

#     if rosco_path:
#         try:
#             rosco_df = pd.read_excel(rosco_path, header=None)
#             cell_value = str(rosco_df.iloc[2, 2])  # C3
#             dates = re.findall(r"\d{2}[-/]\d{2}[-/]\d{4}", cell_value)

#             if len(dates) == 2:
#                 monitor_start = pd.to_datetime(dates[0], dayfirst=True).date()
#                 monitor_end = pd.to_datetime(dates[1], dayfirst=True).date()
#         except Exception:
#             pass
#     # -------------------------
#     # Keywords
#     # -------------------------
#     highlight_re = re.compile(
#         r"\b(hits|hl|highlights|hlts|overview|review|show|goals?|summary|specials|league|reload)\b",
#         re.I
#     )

#     magazine_re = re.compile(
#         r"\b(sports|show|league|magazine|support|studio|magazin|weekly|preview|analysis|review|specials|weekly new|coming soon|coming|pre|post|Chrcha|interview)\b",
#         re.I
#     )

#     # -------------------------
#     # Tolerances
#     # -------------------------
#     live_tol_min = rules.get("live_tolerance_min")
#     live_tolerance = timedelta(minutes=int(live_tol_min)) if live_tol_min else timedelta(minutes=60)

#     highlight_tol_min = rules.get("highlight_tolerance_min")
#     highlight_tolerance_min = int(highlight_tol_min) if highlight_tol_min not in [None, "", 0] else None

#     # -------------------------
#     # Load Fixtures (Fixed for "Fixtures list")
#     # -------------------------
#     fixtures_df = None

#     try:
#         xl = pd.ExcelFile(bsr_path)

#         for s in xl.sheet_names:
#             if "fixtures" in s.strip().lower():
#                 fixtures_df = xl.parse(s)
#                 break

#     except Exception:
#         fixtures_df = None

#     # -------------------------
#     # Precompute BSR UTC start
#     # -------------------------
#     df["_bsr_start_utc"] = None

#     for i, r in df.iterrows():

#         # Case 1: Combined UTC datetime column exists
#         if col_date_utc == col_start_utc:
#             raw_val = r.get(col_date_utc)

#             if pd.notna(raw_val):
#                 try:
#                     df.at[i, "_bsr_start_utc"] = pd.to_datetime(raw_val, errors="coerce")
#                 except:
#                     df.at[i, "_bsr_start_utc"] = None

#         # Case 2: Separate date and time columns
#         else:
#             d = parse_date(r.get(col_date_utc))
#             t = parse_time(r.get(col_start_utc))

#             if d and t:
#                 df.at[i, "_bsr_start_utc"] = datetime.combine(d, t)

#     # -------------------------
#     # First broadcast map (Monitoring Period Only)
#     # -------------------------
#     first_broadcast = {}

#     for _, r in df.iterrows():
#         bsr_start = r["_bsr_start_utc"]
#         if not bsr_start:
#             continue

#         bsr_date = bsr_start.date()

#         if monitor_start and monitor_end:
#             if not (monitor_start <= bsr_date <= monitor_end):
#                 continue

#         key = (
#             str(r.get(col_home)).strip().lower(),
#             str(r.get(col_away)).strip().lower()
#         )

#         if key not in first_broadcast or bsr_start < first_broadcast[key]:
#             first_broadcast[key] = bsr_start

#     # -------------------------
#     # Output columns
#     # -------------------------
#     df["program_category_check_result"] = ""
#     df["program_category_check_remark"] = ""

#     # -------------------------
#     # Validation
#     # -------------------------
#     for idx, row in df.iterrows():
#         ptype = str(row[col_program_type]).strip().lower()
#         desc = str(row[col_desc]) if col_desc else ""
#         bsr_start = row["_bsr_start_utc"]

#         # ===== HIGHLIGHTS =====
#         if ptype == "highlights":
#             # Clean duration properly
#             dur = None
#             raw_dur = row.get(col_duration)

#             if pd.notna(raw_dur):
#                 try:
#                     # Extract numeric part only
#                     dur = float(re.findall(r"\d+\.?\d*", str(raw_dur))[0])
#                 except Exception:
#                     dur = None

#             # Case 1: User has provided highlight tolerance → enforce duration
#             if highlight_tolerance_min is not None:
#                 if dur is None:
#                     df.at[idx, "program_category_check_result"] = "False"
#                     df.at[idx, "program_category_check_remark"] = "Highlight duration missing"

#                 elif dur <= highlight_tolerance_min:
#                     df.at[idx, "program_category_check_result"] = "True"
#                     df.at[idx, "program_category_check_remark"] = (
#                         f"Valid Highlight (duration ≤ {highlight_tolerance_min} mins)"
#                     )

#                 else:
#                     df.at[idx, "program_category_check_result"] = "False"
#                     df.at[idx, "program_category_check_remark"] = (
#                         f"Highlight duration exceeds {highlight_tolerance_min} mins"
#                     )

#             # Case 2: User did NOT provide tolerance → bypass duration check
#             else:
#                 df.at[idx, "program_category_check_result"] = "True"
#                 df.at[idx, "program_category_check_remark"] = (
#                     "Valid Highlights program (duration check not applied)"
#                 )

#         # ===== MAGAZINE & SUPPORT =====
#         elif ptype in ["magazine & support", "magazine and support"]:

#             # Always True irrespective of keywords
#             df.at[idx, "program_category_check_result"] = "True"

#             if magazine_re.search(desc):
#                 df.at[idx, "program_category_check_remark"] = "Valid Magazine & Support (keywords present)"
#             else:
#                 df.at[idx, "program_category_check_remark"] = "Valid Magazine & Support"

#         # ===== LIVE =====
#         elif ptype == "live":

#             # --- STRICT SIMULCAST OVERRIDE (PHASE COLUMN ONLY) ---
#             if col_phase is not None:
#                 phase_val = str(row[col_phase]).strip().lower()
#                 if "simulcast" in phase_val:
#                     df.at[idx, "program_category_check_result"] = "True"
#                     df.at[idx, "program_category_check_remark"] = "Valid Live program (Simulcast)"
#                     continue

#             # Check if bsr_start exists
#             bsr_start = row.get("_bsr_start_utc")
#             if fixtures_df is None or pd.isna(bsr_start):
#                 df.at[idx, "program_category_check_result"] = "False"
#                 df.at[idx, "program_category_check_remark"] = "Invalid Live timing or fixtures missing"
#                 continue

#             # Ensure bsr_start is naive (no timezone) for comparison
#             if hasattr(bsr_start, 'tzinfo') and bsr_start.tzinfo is not None:
#                 bsr_start = bsr_start.replace(tzinfo=None)

#             home = str(row[col_home]).strip().lower() if col_home else ""
#             away = str(row[col_away]).strip().lower() if col_away else ""

#             matched = False
#             for _, fx in fixtures_df.iterrows():
#                 try:
#                     # 1. Parse Fixture Start
#                     fx_raw_start = fx.get("Date + Time UTC")
#                     fx_start = pd.to_datetime(fx_raw_start, errors="coerce")
#                     if pd.isna(fx_start):
#                         continue
                   
#                     if hasattr(fx_start, 'tzinfo') and fx_start.tzinfo is not None:
#                         fx_start = fx_start.replace(tzinfo=None)

#                     # 2. Parse Duration and Calculate End
#                     raw_fx_dur = fx.get("Duration")
#                     try:
#                         if isinstance(raw_fx_dur, (time, datetime)):
#                             dur_delta = timedelta(hours=raw_fx_dur.hour, minutes=raw_fx_dur.minute, seconds=raw_fx_dur.second)
#                         else:
#                             # Handles "02:00:00" or similar strings
#                             dur_delta = pd.to_timedelta(str(raw_fx_dur))
                       
#                         fx_end = fx_start + dur_delta
#                     except:
#                         fx_end = fx_start + timedelta(hours=3) # Fallback to 3h for Live

#                     # 3. Team Matching (Normalized)
#                     h_match = normalize_team(home) == normalize_team(fx.get("Home Team", ""))
#                     a_match = normalize_team(away) == normalize_team(fx.get("Away Team", ""))

#                     # 4. Time Window Check
#                     # We check if BSR start falls within Fixture Start - Tolerance AND Fixture End + Tolerance
#                     time_match = (fx_start - live_tolerance <= bsr_start <= fx_end + live_tolerance)

#                     if h_match and a_match and time_match:
#                         matched = True
#                         break
#                 except Exception as e:
#                     # Log the specific error if needed: print(f"Error at index {idx}: {e}")
#                     continue

#             if matched:
#                 df.at[idx, "program_category_check_result"] = "True"
#                 df.at[idx, "program_category_check_remark"] = "Valid Live program"
#             else:
#                 df.at[idx, "program_category_check_result"] = "False"
#                 df.at[idx, "program_category_check_remark"] = "Live program outside tolerance or team mismatch"
       
#         # =====================================================
#         # DELAYED
#         # =====================================================
#         elif "delayed" in ptype:

#             df.at[idx, "program_category_check_result"] = "True"
#             df.at[idx, "program_category_check_remark"] = "Valid Delayed"

#         # =====================================================
#         # REPEAT
#         # =====================================================
#         elif "repeat" in ptype:

#             df.at[idx, "program_category_check_result"] = "True"
#             df.at[idx, "program_category_check_remark"] = "Valid Repeat"

#         # =====================================================
#         # OTHERS
#         # =====================================================
#         else:
#             df.at[idx, "program_category_check_result"] = "NA"
#             df.at[idx, "program_category_check_remark"] = "Program type not applicable"

#         # # =====================================================
#         # # DELAYED
#         # # =====================================================
#         # elif ptype == "delayed":

#         #     if not bsr_start:
#         #         df.at[idx, "program_category_check_result"] = "False"
#         #         df.at[idx, "program_category_check_remark"] = "Invalid start time"
#         #         continue

#         #     home = str(row[col_home]).strip().lower()
#         #     away = str(row[col_away]).strip().lower()

#         #     first_time = first_broadcast.get((home, away))

#         #     if first_time and bsr_start == first_time:
#         #         df.at[idx, "program_category_check_result"] = "True"
#         #         df.at[idx, "program_category_check_remark"] = "Valid Delayed (first in monitoring period)"
#         #     else:
#         #         df.at[idx, "program_category_check_result"] = "False"
#         #         df.at[idx, "program_category_check_remark"] = "Not first in monitoring period - should be Repeat"

#         # # =====================================================
#         # # REPEAT
#         # # =====================================================
#         # elif ptype == "repeat":

#         #     if not bsr_start:
#         #         df.at[idx, "program_category_check_result"] = "False"
#         #         df.at[idx, "program_category_check_remark"] = "Invalid start time"
#         #         continue

#         #     home = str(row[col_home]).strip().lower()
#         #     away = str(row[col_away]).strip().lower()

#         #     first_time = first_broadcast.get((home, away))

#         #     if first_time and bsr_start > first_time:
#         #         df.at[idx, "program_category_check_result"] = "True"
#         #         df.at[idx, "program_category_check_remark"] = "Valid Repeat"
#         #     else:
#         #         df.at[idx, "program_category_check_result"] = "False"
#         #         df.at[idx, "program_category_check_remark"] = "First broadcast cannot be Repeat"
#         # else:
#         #     df.at[idx, "program_category_check_result"] = "NA"
#         #     df.at[idx, "program_category_check_remark"] = "Program type not applicable"

#     df.drop(columns=["_bsr_start_utc"], inplace=True, errors="ignore")
#     return df


import re
import pandas as pd
from datetime import datetime, timedelta, time
from .common import _find_column, auto_detect_individual_sport, _norm

def overlap_duplicate_daybreak_check(df, bsr_cols, rules):
    df = df.copy()

    # --------------------------------------------------
    # Column resolution
    # --------------------------------------------------
    col_channel = _find_column(df, bsr_cols.get("tv_channel"))
    col_channel_id = _find_column(df, bsr_cols.get("channel_id"))
    col_market = _find_column(df, bsr_cols.get("market"))
    col_broadcaster = _find_column(df, bsr_cols.get("broadcaster"))

    col_date = (
        _find_column(df, ["Date (UTC)", "Date (UTC/GMT)"])
        or _find_column(df, ["Date"])
    )
    col_start = (
        _find_column(df, ["Start (UTC)", "Start UTC"])
        or _find_column(df, ["Start"])
    )
    col_end = (
        _find_column(df, ["End (UTC)", "End UTC"])
        or _find_column(df, ["End"])
    )

    col_prog_type = (
        _find_column(df, bsr_cols.get("type_of_program"))
        or _find_column(df, ["Program Type", "Type of Program"])
    )

    if not col_market or not col_date or not col_start or not col_end:
        return df

    compare_channel = col_channel if col_channel else col_channel_id
    if not compare_channel:
        return df

    # --------------------------------------------------
    # Build timezone-naive datetimes ONLY
    # --------------------------------------------------
    def build_dt(d, t):
        if pd.isna(d) or pd.isna(t):
            return pd.NaT
        try:
            date_part = pd.to_datetime(d, errors="coerce")
            if pd.isna(date_part):
                return pd.NaT

            # HANDLE EXCEL TIME (0 / 1 issue FIX)
            if isinstance(t, (int, float)):
                time_part = pd.to_timedelta(float(t), unit="D")
            else:
                # Handle HH:MM:SS
                try:
                    time_part = pd.to_timedelta(str(t))
                except:
                    return pd.NaT

            return date_part + time_part

        except Exception:
            return pd.NaT

    df["_start_dt"] = df.apply(lambda r: build_dt(r[col_date], r[col_start]), axis=1)
    df["_end_dt"]   = df.apply(lambda r: build_dt(r[col_date], r[col_end]), axis=1)

    # HARD safety: ensure tz-naive
    df["_start_dt"] = pd.to_datetime(df["_start_dt"], errors="coerce").dt.tz_localize(None)
    df["_end_dt"]   = pd.to_datetime(df["_end_dt"], errors="coerce").dt.tz_localize(None)

    # --------------------------------------------------
    # Fix cross-midnight programs
    # --------------------------------------------------
    mask_midnight = (
        pd.notna(df["_start_dt"]) &
        pd.notna(df["_end_dt"]) &
        (df["_end_dt"] < df["_start_dt"])
    )
    df.loc[mask_midnight, "_end_dt"] += pd.Timedelta(days=1)

    # --------------------------------------------------
    # Normalize program type
    # --------------------------------------------------
    df["_prog_type_norm"] = (
        df[col_prog_type].fillna("").astype(str).str.lower().str.strip()
        if col_prog_type else ""
    )

    # --------------------------------------------------
    # Preserve original order
    # --------------------------------------------------
    df["_orig_idx"] = df.index

    # --------------------------------------------------
    # ✅ FULL CHRONOLOGICAL SORT
    # --------------------------------------------------
    df["_sort_date"] = df["_start_dt"].dt.date

    df = df.sort_values(
        [compare_channel, col_market, "_sort_date", "_start_dt"],
        na_position="last"
    ).reset_index(drop=True)

    n = len(df)

    # --------------------------------------------------
    # Output containers
    # --------------------------------------------------
    overlap_ok   = [pd.NA] * n
    overlap_r    = [""] * n
    duplicate_ok = [True] * n
    duplicate_r  = [""] * n
    daybreak_ok  = [pd.NA] * n
    daybreak_r   = [""] * n

    # --------------------------------------------------
    # Duplicate check (IGNORE INTERNET / WWW)
    # --------------------------------------------------
    col_pay_free = _find_column(df, ["Pay/Free TV", "Pay Free TV", "Platform", "Distribution"])

    dup_cols = [compare_channel, col_market, col_date, col_start, col_end]
    if col_broadcaster:
        dup_cols.insert(2, col_broadcaster)

    dup_mask = pd.Series([False] * n)

    try:
        if col_pay_free:
            internet_mask = (
                df[col_pay_free]
                .fillna("")
                .astype(str)
                .str.lower()
                .str.contains(r"internet|internet stream|www", regex=True)
            )

            non_internet_df = df.loc[~internet_mask, dup_cols]
            dup_non_internet = non_internet_df.duplicated(keep=False)
            dup_mask.loc[~internet_mask] = dup_non_internet.values
        else:
            dup_mask = df.duplicated(subset=dup_cols, keep=False)

    except Exception:
        dup_mask = pd.Series([False] * n)

    for i in range(n):
        if dup_mask.iloc[i]:
            duplicate_ok[i] = False
            duplicate_r[i] = "In-market duplicate (same channel/market/date/start/end)"

    # --------------------------------------------------
    # ✅ OVERLAP CHECK (FIXED PD.NA BOOLEAN AMBIGUITY)
    # --------------------------------------------------
    VALID_TYPES = {"live", "repeat", "delayed"}

    col_pay_free = _find_column(df, ["Pay/Free TV", "Pay Free TV", "Platform", "Distribution"])
    col_combined = _find_column(df, ["Combined"])
    col_phase = _find_column(df, ["Phase/Fixture/Episode", "Phase / Fixture / Episode"])
    col_prog_desc = _find_column(df, ["Program Description", "Program Desc"])

    def normalize_match_text(text):
        if not text:
            return ""
        text = str(text).lower()
        text = re.sub(r"(simulcast|live|repeat|delayed)", "", text)
        text = re.sub(r"\bvs\.?\b|\bv\b", "vs", text)
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def get_match_signature(row):
        parts = []
        if col_combined and pd.notna(row[col_combined]):
            parts.append(str(row[col_combined]))
        if col_phase and pd.notna(row[col_phase]):
            parts.append(str(row[col_phase]))
        if col_prog_desc and pd.notna(row[col_prog_desc]):
            parts.append(str(row[col_prog_desc]))
        return normalize_match_text(" ".join(parts))

    def is_internet_row(row):
        if not col_pay_free or pd.isna(row[col_pay_free]):
            return False
        val = str(row[col_pay_free]).lower()
        return "internet" in val or "www" in val

    prev_key = None
    prev_end = None
    prev_row = None
    prev_match = None

    for i in range(n):
        row = df.iloc[i]
        key = (row[compare_channel], row[col_market], row["_sort_date"])
        start = row["_start_dt"]
        end = row["_end_dt"]
        ptype = row["_prog_type_norm"]

        if is_internet_row(row):
            overlap_ok[i] = True
            overlap_r[i] = "Internet Channel, skipped overlap check"
            prev_key = key
            prev_end = end
            prev_row = row
            prev_match = get_match_signature(row)
            continue

        if key != prev_key:
            prev_end = None
            prev_row = None
            prev_match = None

        if ptype and ptype not in VALID_TYPES:
            overlap_ok[i] = pd.NA
            overlap_r[i] = f"Ignored program type '{ptype}'"
            prev_key = key
            continue

        if pd.isna(start) or pd.isna(end) or end <= start:
            overlap_ok[i] = pd.NA
            overlap_r[i] = "Not Applicable – invalid timing"
            prev_key = key
            continue

        if prev_end is None:
            overlap_ok[i] = True
            overlap_r[i] = "OK (first program)"
            prev_end = end
            prev_row = row
            prev_match = get_match_signature(row)
            prev_key = key
            continue

        if start == prev_end:
            overlap_ok[i] = True
            overlap_r[i] = "OK – back-to-back"
            prev_end = end
            prev_row = row
            prev_match = get_match_signature(row)
            prev_key = key
            continue

        if start < prev_end:
            overlap_ok[i] = False
            overlap_r[i] = (
                f"Overlap: starts {start.time()} "
                f"before previous ends {prev_end.time()}"
            )
            prev_end = max(prev_end, end)
            prev_row = row
            prev_match = get_match_signature(row)
            prev_key = key
            continue

        overlap_ok[i] = True
        overlap_r[i] = "OK"
        prev_end = end
        prev_row = row
        prev_match = get_match_signature(row)
        prev_key = key

    # --------------------------------------------------
    # ✅ FINAL DAYBREAK LOGIC
    # --------------------------------------------------
    gap_tolerance = rules.get("daybreak_gap_tolerance_min", 30)

    for i in range(1, n):
        prev = df.iloc[i - 1]
        curr = df.iloc[i]

        daybreak_ok[i] = True
        daybreak_r[i] = "OK"

        if not (
            str(prev[compare_channel]) == str(curr[compare_channel]) and
            str(prev[col_market]) == str(curr[col_market])
        ):
            continue

        if pd.isna(prev["_end_dt"]) or pd.isna(curr["_start_dt"]):
            daybreak_r[i] = "OK – missing timestamps"
            continue

        prev_end = prev["_end_dt"]
        curr_start = curr["_start_dt"]

        prev_combined = str(prev.get(col_combined, "")).strip().lower() if pd.notna(prev.get(col_combined)) else ""
        curr_combined = str(curr.get(col_combined, "")).strip().lower() if pd.notna(curr.get(col_combined)) else ""

        if not prev_combined or not curr_combined or prev_combined != curr_combined:
            daybreak_r[i] = "OK – different match"
            continue

        same_or_next_day = (
            curr_start.date() == prev_end.date() or
            curr_start.date() == (prev_end.date() + pd.Timedelta(days=1))
        )

        if not same_or_next_day:
            daybreak_r[i] = "OK – not a daybreak"
            continue

        gap = (curr_start - prev_end).total_seconds() / 60

        if 0 <= gap <= gap_tolerance:
            daybreak_ok[i] = False
            daybreak_r[i] = "Daybreak – same match continued across midnight"
        else:
            daybreak_r[i] = f"OK – gap too large ({gap:.1f} min)"

    # Final assignment
    df["Duplicate_OK"] = duplicate_ok
    df["Duplicate_Remark"] = duplicate_r
    df["Overlap_OK"] = overlap_ok
    df["Overlap_Remark"] = overlap_r
    df["Duplicate_OK"] = df["Duplicate_OK"].astype(object) # Handle nullable assignments safely
    df["Overlap_OK"] = df["Overlap_OK"].astype(object)
    df["Daybreak_OK"] = daybreak_ok
    df["Daybreak_Remark"] = daybreak_r

    return df.sort_values("_orig_idx").drop(
        columns=[
            "_start_dt",
            "_end_dt",
            "_sort_date",
            "_orig_idx",
            "_prog_type_norm"
        ],
        errors="ignore"
    )

def program_category_check(bsr_path, df, col_map, rules, file_rules):
    def find_col(columns, names):
        for c in columns:
            c_clean = str(c).strip().lower()
            for n in names:
                if n.strip().lower() in c_clean:
                    return c
        return None

    columns = df.columns.tolist()
    col_program_type = find_col(columns, ["program type", "type of program"])
    col_desc = find_col(columns, ["combined (translated)", "program description", "description"])
    col_duration = find_col(columns, ["duration", "duration (mins)"])
    col_date_utc = find_col(columns, ["date(utc)", "date utc"]) or find_col(columns, ["date"])
    col_start_utc = find_col(columns, ["start(utc)", "start utc"]) or find_col(columns, ["start"])
    col_home = find_col(columns, ["home team"])
    col_away = find_col(columns, ["away team"])
    col_phase = find_col(columns, ["phase", "fixture", "episode"])
    col_source = find_col(columns, ["source", "data source", "source type"])
    col_event = find_col(columns, ["event"]) or find_col(columns, ["competition", "tournament", "league"])

    def normalize_team(name):
        if pd.isna(name):
            return ""
        name = str(name).lower()
        name = re.sub(r"\(.*?\)", "", name)
        name = name.replace("fsf", "").replace("fs", "").replace("at.", "atletico")
        return re.sub(r"[^a-z0-9]", "", name).strip()

    # Vectorized Datetime String Concat
    if col_date_utc and col_start_utc:
        if col_date_utc == col_start_utc:
            df["_bsr_start_utc"] = pd.to_datetime(df[col_date_utc], errors="coerce")
        else:
            df["_bsr_start_utc"] = pd.to_datetime(
                df[col_date_utc].astype(str) + " " + df[col_start_utc].astype(str),
                errors="coerce"
            )
        if df["_bsr_start_utc"].dt.tz is not None:
            df["_bsr_start_utc"] = df["_bsr_start_utc"].dt.tz_localize(None)
    else:
        df["_bsr_start_utc"] = pd.NaT

    # Dynamic Sport Check Integration
    fixtures_not_required = auto_detect_individual_sport(bsr_path, df, rules, file_rules)

    # Precompute Fixture Windows (RESOLVED FILE LOCKING ISSUE VIA WITH MANIFEST)
    fixtures_dict = {}
    if not fixtures_not_required:
        try:
            if str(bsr_path).lower().endswith('.csv'):
                fixtures_df = pd.read_csv(bsr_path)
            else:
                # Wrapped inside explicit with statement to instantly drop system file locks
                with pd.ExcelFile(bsr_path) as xl:
                    fixtures_df = next((xl.parse(s) for s in xl.sheet_names if "fixture" in s.lower()), None)
           
            if fixtures_df is not None:
                fix_cols = {str(c).strip().lower(): c for c in fixtures_df.columns}
                f_date = next((v for k, v in fix_cols.items() if k in ["date", "date utc"]), None)
                f_time = next((v for k, v in fix_cols.items() if k in ["start time", "time", "time utc", "start"]), None)
                f_dur = next((v for k, v in fix_cols.items() if k in ["duration", "duration (mins)"]), None)
                f_home = next((v for k, v in fix_cols.items() if k in ["home team", "home"]), None)
                f_away = next((v for k, v in fix_cols.items() if k in ["away team", "away"]), None)
               
                fixtures_df["_start_dt"] = pd.to_datetime(
                    fixtures_df[f_date].astype(str) + " " + fixtures_df[f_time].astype(str),
                    errors="coerce"
                )
                fixtures_df.loc[fixtures_df["_start_dt"].dt.year < 2000, "_start_dt"] = pd.NaT
               
                fixtures_df["_dur_delta"] = pd.to_timedelta(fixtures_df[f_dur].astype(str), errors="coerce")
                fixtures_df["_dur_delta"] = fixtures_df["_dur_delta"].fillna(timedelta(hours=3))
                fixtures_df["_end_dt"] = fixtures_df["_start_dt"] + fixtures_df["_dur_delta"]
               
                for _, fx in fixtures_df.dropna(subset=["_start_dt"]).iterrows():
                    h_team = normalize_team(fx.get(f_home, ""))
                    a_team = normalize_team(fx.get(f_away, ""))
                    fixtures_dict.setdefault((h_team, a_team), []).append({
                        "start": fx["_start_dt"],
                        "end": fx["_end_dt"]
                    })
        except Exception:
            fixtures_dict = {}

    magazine_re = re.compile(r"\b(sports|show|league|magazine|support|studio|magazin|weekly|preview|analysis|review|specials|weekly new|coming soon|coming|pre|post|Chrcha|interview)\b", re.I)
   
    def get_minutes(val):
        if val in [None, "", 0, "0"]: return 60.0
        if ":" in str(val):
            p = str(val).split(":")
            return int(p[0])*60 + int(p[1]) if len(p) == 2 else int(p[0])*60 + int(p[1]) + int(p[2])/60
        return float(val)

    live_tolerance = timedelta(minutes=get_minutes(rules.get("live_tolerance_min", 60)))
    highlight_tolerance_min = get_minutes(rules.get("highlight_tolerance_min", 60))

    results = []
    remarks = []

    for idx, row in df.iterrows():
        ptype = str(row[col_program_type]).strip().lower() if col_program_type and pd.notna(row[col_program_type]) else ""
        desc = str(row[col_desc]) if col_desc and pd.notna(row[col_desc]) else ""
        bsr_start = row["_bsr_start_utc"]
       
        # ===== HIGHLIGHTS =====
        if ptype == "highlights":
            event_val = str(row[col_event]).strip().lower() if col_event else ""
            source_val = str(row[col_source]).strip().lower() if col_source else ""
            me_leagues = ["saudi professional league", "afc", "king’s cup", "kings cup", "qatar star league", "afc 2"]
           
            if any(lg in event_val for lg in me_leagues) and "client data" in source_val:
                results.append("True")
                remarks.append("Valid Highlight (Retained per Client Data rules)")
                continue

            raw_dur = row.get(col_duration)
            try:
                dur = float(re.findall(r"\d+\.?\d*", str(raw_dur))[0]) if pd.notna(raw_dur) else None
            except:
                dur = None

            if dur is None:
                results.append("False")
                remarks.append("Highlight duration missing")
            elif dur <= highlight_tolerance_min:
                results.append("True")
                remarks.append(f"Valid Highlight (duration ≤ {highlight_tolerance_min} mins)")
            else:
                results.append("False")
                remarks.append(f"Highlight duration exceeds {highlight_tolerance_min} mins")

        # ===== MAGAZINE & SUPPORT =====
        elif ptype in ["magazine & support", "magazine and support"]:
            results.append("True")
            remarks.append("Valid Magazine & Support (keywords present)" if magazine_re.search(desc) else "Valid Magazine & Support")

        # ===== LIVE =====
        elif ptype == "live":
            phase_val = str(row[col_phase]).strip().lower() if col_phase and pd.notna(row[col_phase]) else ""
            if "simulcast" in phase_val or "switch" in phase_val or "diretta" in phase_val:
                results.append("True")
                remarks.append("Valid Live program (Simulcast/Multi-match)")
                continue

            if fixtures_not_required:
                if pd.notna(bsr_start):
                    results.append("True")
                    remarks.append("Valid Live program (Fixtures not required for individual sport)")
                else:
                    results.append("False")
                    remarks.append("Invalid Live timing (Missing broadcast start time)")
                continue

            if not fixtures_dict or pd.isna(bsr_start):
                results.append("False")
                remarks.append("Invalid Live timing or fixtures missing")
                continue

            home = normalize_team(row[col_home]) if col_home else ""
            away = normalize_team(row[col_away]) if col_away else ""
            key = (home, away)

            matched = False
            if key in fixtures_dict:
                for fx in fixtures_dict[key]:
                    if fx["start"] - live_tolerance <= bsr_start <= fx["end"] + live_tolerance:
                        matched = True
                        break

            if matched:
                results.append("True")
                remarks.append("Valid Live program")
            else:
                results.append("False")
                remarks.append("Live program outside tolerance or team mismatch")

        # ===== DELAYED & REPEAT =====
        elif "delayed" in ptype:
            results.append("True")
            remarks.append("Valid Delayed")
        elif "repeat" in ptype:
            results.append("True")
            remarks.append("Valid Repeat")
        else:
            results.append("NA")
            remarks.append("Program type not applicable")

    df["program_category_check_result"] = results
    df["program_category_check_remark"] = remarks
   
    df.drop(columns=["_bsr_start_utc"], inplace=True, errors="ignore")
    return df
