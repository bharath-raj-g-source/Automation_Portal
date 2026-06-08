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


import pandas as pd
import re
from datetime import datetime, timedelta, time
from .common import _find_column

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

            # 🔥 HANDLE EXCEL TIME (0 / 1 issue FIX)
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
    # ✅ CRITICAL: FULL CHRONOLOGICAL SORT
    # Channel → Market → Date → Start time
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

    # Default: no duplicates
    dup_mask = pd.Series([False] * n)

    try:
        if col_pay_free:
            # Identify internet / www rows (case-insensitive, partial match)
            internet_mask = (
                df[col_pay_free]
                .fillna("")
                .astype(str)
                .str.lower()
                .str.contains(r"internet|internet stream|www", regex=True)
            )

            # Run duplicate check ONLY on non-internet rows
            non_internet_df = df.loc[~internet_mask, dup_cols]
            dup_non_internet = non_internet_df.duplicated(keep=False)

            # Map results back to full DataFrame
            dup_mask.loc[~internet_mask] = dup_non_internet.values
        else:
            # No Pay/Free TV column → original behavior
            dup_mask = df.duplicated(subset=dup_cols, keep=False)

    except Exception:
        dup_mask = pd.Series([False] * n)

    # Assign results
    for i in range(n):
        if dup_mask.iloc[i]:
            duplicate_ok[i] = False
            duplicate_r[i] = "In-market duplicate (same channel/market/date/start/end)"

    # --------------------------------------------------
    # ✅ OVERLAP CHECK (WITH INTERNET / MATCH BYPASS)
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
        if col_combined:
            parts.append(str(row[col_combined] or ""))
        if col_phase:
            parts.append(str(row[col_phase] or ""))
        if col_prog_desc:
            parts.append(str(row[col_prog_desc] or ""))
        return normalize_match_text(" ".join(parts))

    def is_internet_row(row):
        if not col_pay_free:
            return False
        val = str(row[col_pay_free] or "").lower()
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

        # --------------------------------------------------
        # 🚀 HARD INTERNET BYPASS
        # --------------------------------------------------
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
    # ✅ FINAL DAYBREAK LOGIC (FIXED)
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

        prev_combined = str(prev.get(col_combined, "")).strip().lower()
        curr_combined = str(curr.get(col_combined, "")).strip().lower()

        if not prev_combined or not curr_combined or prev_combined != curr_combined:
            daybreak_r[i] = "OK – different match"
            continue

        # ✅ FIXED DATE LOGIC
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

    # --------------------------------------------------
    # Final assignment
    # --------------------------------------------------
    df["Duplicate_OK"] = duplicate_ok
    df["Duplicate_Remark"] = duplicate_r
    df["Overlap_OK"] = overlap_ok
    df["Overlap_Remark"] = overlap_r
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
    # -------------------------
    # Helpers
    # -------------------------
    def find_col(names):
        for c in df.columns:
            c_clean = str(c).strip().lower()
            for n in names:
                if n.strip().lower() in c_clean:
                    return c
        return None

    def parse_date(val):
        if pd.isna(val):
            return None
        if isinstance(val, (datetime, pd.Timestamp)):
            return val.date()
        val_str = str(val).strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}", val_str):
            return pd.to_datetime(val_str, errors="coerce").date()
        return pd.to_datetime(val, errors="coerce", dayfirst=True).date()

    def normalize_team(name):
        if pd.isna(name):
            return ""
        name = str(name).lower()
        name = re.sub(r"\(.*?\)", "", name)
        name = name.replace("fsf", "").replace("fs", "").replace("at.", "atletico")
        name = re.sub(r"[^a-z0-9]", "", name)
        return name.strip()

    def parse_time(val):
        if pd.isna(val):
            return None
        if isinstance(val, time):
            return val
        if isinstance(val, (datetime, pd.Timestamp)):
            return val.time()
        if isinstance(val, str) and not val.strip().startswith("#"):
            return pd.to_datetime(val, errors="coerce").time()
        return None

    def parse_tolerance_to_timedelta(val_in, default_mins=60):
        if val_in in [None, "", 0, "0"]:
            return timedelta(minutes=default_mins)
        val = str(val_in).strip()
        if ":" in val:
            parts = val.split(":")
            try:
                if len(parts) == 3:
                    return timedelta(hours=int(parts[0]), minutes=int(parts[1]), seconds=int(parts[2]))
                elif len(parts) == 2:
                    return timedelta(minutes=int(parts[0]), seconds=int(parts[1]))
            except:
                pass
        try:
            return timedelta(minutes=float(val))
        except:
            return timedelta(minutes=default_mins)

    def parse_tolerance_to_minutes(val_in):
        if val_in in [None, "", 0, "0"]:
            return None
        val = str(val_in).strip()
        if ":" in val:
            parts = val.split(":")
            try:
                if len(parts) == 3:
                    return int(parts[0]) * 60 + int(parts[1]) + int(parts[2]) / 60.0
                elif len(parts) == 2:
                    return int(parts[0]) + int(parts[1]) / 60.0
            except:
                pass
        try:
            return float(val)
        except:
            return None

    # -------------------------
    # Column detection
    # -------------------------
    col_program_type = find_col(["program type", "type of program"])
    col_desc = find_col(["combined (translated)", "program description", "description"])
    col_duration = find_col(["duration", "duration (mins)"])
   
    col_datetime_utc = find_col(["date + time utc", "datetime utc", "date time utc"])
    if col_datetime_utc:
        col_date_utc = col_datetime_utc
        col_start_utc = col_datetime_utc
    else:
        col_date_utc = find_col(["date"])
        col_start_utc = find_col(["start"])
       
    col_home = find_col(["home team"])
    col_away = find_col(["away team"])
    col_phase = find_col(["phase", "fixture", "episode"])
    col_source = find_col(["source", "data source", "source type"])

    # START OF CHANGE: Added targeted checking constraints to automatically intercept Event values inside the file fields
    col_event = find_col(["event"])
    if not col_event:
        # Graceful fallback mapping logic parameter context bounds
        col_event = find_col(["competition", "tournament", "league"])
    # END OF CHANGE: Added targeted checking constraints to automatically intercept Event values inside the file fields
   
    # -------------------------
    # Extract Monitoring Period (C3 of ROSCO)
    # -------------------------
    monitor_start = None
    monitor_end = None
    rosco_path = file_rules.get("rosco_path")

    if rosco_path:
        try:
            rosco_df = pd.read_excel(rosco_path, header=None)
            cell_value = str(rosco_df.iloc[2, 2])
            dates = re.findall(r"\d{2}[-/]\d{2}[-/]\d{4}", cell_value)

            if len(dates) == 2:
                monitor_start = pd.to_datetime(dates[0], dayfirst=True).date()
                monitor_end = pd.to_datetime(dates[1], dayfirst=True).date()
        except Exception:
            pass

    highlight_re = re.compile(
        r"\b(hits|hl|highlights|hlts|overview|review|show|goals?|summary|specials|league|reload)\b",
        re.I
    )

    magazine_re = re.compile(
        r"\b(sports|show|league|magazine|support|studio|magazin|weekly|preview|analysis|review|specials|weekly new|coming soon|coming|pre|post|Chrcha|interview)\b",
        re.I
    )

    live_tolerance = parse_tolerance_to_timedelta(rules.get("live_tolerance_min"), default_mins=60)
    highlight_tolerance_min = parse_tolerance_to_minutes(rules.get("highlight_tolerance_min"))

    fixtures_df = None
    try:
        xl = pd.ExcelFile(bsr_path)
        for s in xl.sheet_names:
            if "fixtures" in s.strip().lower():
                fixtures_df = xl.parse(s)
                break
    except Exception:
        fixtures_df = None

    # -------------------------
    # Precompute BSR UTC start
    # -------------------------
    df["_bsr_start_utc"] = None

    for i, r in df.iterrows():
        if col_date_utc == col_start_utc:
            raw_val = r.get(col_date_utc)
            if pd.notna(raw_val):
                try:
                    raw_str = str(raw_val).strip()
                    if re.match(r"^\d{4}-\d{2}-\d{2}", raw_str):
                        df.at[i, "_bsr_start_utc"] = pd.to_datetime(raw_str, errors="coerce")
                    else:
                        df.at[i, "_bsr_start_utc"] = pd.to_datetime(raw_str, errors="coerce", dayfirst=True)
                except:
                    df.at[i, "_bsr_start_utc"] = None
        else:
            d = parse_date(r.get(col_date_utc))
            t = parse_time(r.get(col_start_utc))
            if d and t:
                df.at[i, "_bsr_start_utc"] = datetime.combine(d, t)

    first_broadcast = {}
    for _, r in df.iterrows():
        bsr_start = r["_bsr_start_utc"]
        if not bsr_start:
            continue

        bsr_date = bsr_start.date()
        if monitor_start and monitor_end:
            if not (monitor_start <= bsr_date <= monitor_end):
                continue

        key = (
            str(r.get(col_home)).strip().lower(),
            str(r.get(col_away)).strip().lower()
        )

        if key not in first_broadcast or bsr_start < first_broadcast[key]:
            first_broadcast[key] = bsr_start

    df["program_category_check_result"] = ""
    df["program_category_check_remark"] = ""

    # -------------------------
    # Validation Loop
    # -------------------------
    for idx, row in df.iterrows():
        ptype = str(row[col_program_type]).strip().lower()
        desc = str(row[col_desc]) if col_desc else ""
        bsr_start = row["_bsr_start_utc"]

        # START OF CHANGE: Extracted strings from row instances inside BSR data to match exact target parameters
        event_val = str(row[col_event]).strip().lower() if col_event else ""
        source_val = str(row[col_source]).strip().lower() if col_source else ""
       
        me_leagues = ["saudi professional league", "afc", "king’s cup", "kings cup", "qatar star league", "afc 2"]
        is_target_me_league = any(lg in event_val for lg in me_leagues)
        is_client_data = "client data" in source_val
        # END OF CHANGE: Extracted strings from row instances inside BSR data to match exact target parameters

        # ===== HIGHLIGHTS =====
        if ptype == "highlights":
            # START OF CHANGE: Applied custom criteria bypass override exclusively for targeted Middle East client updates
            if is_target_me_league and is_client_data:
                df.at[idx, "program_category_check_result"] = "True"
                df.at[idx, "program_category_check_remark"] = "Valid Highlight (Retained as Highlights during live window per Client Data rules regardless of duration)"
                continue
            # END OF CHANGE: Applied custom criteria bypass override exclusively for targeted Middle East client updates

            dur = None
            raw_dur = row.get(col_duration)

            if pd.notna(raw_dur):
                try:
                    dur = float(re.findall(r"\d+\.?\d*", str(raw_dur))[0])
                except Exception:
                    dur = None

            if highlight_tolerance_min is not None:
                if dur is None:
                    df.at[idx, "program_category_check_result"] = "False"
                    df.at[idx, "program_category_check_remark"] = "Highlight duration missing"
                elif dur <= highlight_tolerance_min:
                    df.at[idx, "program_category_check_result"] = "True"
                    df.at[idx, "program_category_check_remark"] = f"Valid Highlight (duration ≤ {highlight_tolerance_min} mins)"
                else:
                    df.at[idx, "program_category_check_result"] = "False"
                    df.at[idx, "program_category_check_remark"] = f"Highlight duration exceeds {highlight_tolerance_min} mins"
            else:
                df.at[idx, "program_category_check_result"] = "True"
                df.at[idx, "program_category_check_remark"] = "Valid Highlights program (duration check not applied)"

        # ===== MAGAZINE & SUPPORT =====
        elif ptype in ["magazine & support", "magazine and support"]:
            df.at[idx, "program_category_check_result"] = "True"
            if magazine_re.search(desc):
                df.at[idx, "program_category_check_remark"] = "Valid Magazine & Support (keywords present)"
            else:
                df.at[idx, "program_category_check_remark"] = "Valid Magazine & Support"

        # ===== LIVE =====
        elif ptype == "live":
            if col_phase is not None:
                phase_val = str(row[col_phase]).strip().lower()
                if "simulcast" in phase_val:
                    df.at[idx, "program_category_check_result"] = "True"
                    df.at[idx, "program_category_check_remark"] = "Valid Live program (Simulcast)"
                    continue

            bsr_start = row.get("_bsr_start_utc")
            if fixtures_df is None or pd.isna(bsr_start):
                df.at[idx, "program_category_check_result"] = "False"
                df.at[idx, "program_category_check_remark"] = "Invalid Live timing or fixtures missing"
                continue

            if hasattr(bsr_start, 'tzinfo') and bsr_start.tzinfo is not None:
                bsr_start = bsr_start.replace(tzinfo=None)

            home = str(row[col_home]).strip().lower() if col_home else ""
            away = str(row[col_away]).strip().lower() if col_away else ""

            matched = False
            for _, fx in fixtures_df.iterrows():
                try:
                    fx_raw_start = fx.get("Date + Time UTC")
                    fx_start = pd.to_datetime(fx_raw_start, errors="coerce", dayfirst=True)
                   
                    if pd.isna(fx_start):
                        fx_d_col = next((c for c in fx.columns if str(c).strip().lower() in ["date utc", "date"]), None)
                        fx_t_col = next((c for c in fx.columns if str(c).strip().lower() in ["time utc", "time", "start utc", "start"]), None)
                        if fx_d_col and fx_t_col:
                            fd = parse_date(fx.get(fx_d_col))
                            ft = parse_time(fx.get(fx_t_col))
                            if fd and ft:
                                fx_start = datetime.combine(fd, ft)

                    if pd.isna(fx_start):
                        continue
                   
                    if hasattr(fx_start, 'tzinfo') and fx_start.tzinfo is not None:
                        fx_start = fx_start.replace(tzinfo=None)

                    raw_fx_dur = fx.get("Duration")
                    try:
                        if isinstance(raw_fx_dur, (time, datetime)):
                            dur_delta = timedelta(hours=raw_fx_dur.hour, minutes=raw_fx_dur.minute, seconds=raw_fx_dur.second)
                        else:
                            dur_delta = pd.to_timedelta(str(raw_fx_dur))
                        fx_end = fx_start + dur_delta
                    except:
                        fx_end = fx_start + timedelta(hours=3)

                    h_match = normalize_team(home) == normalize_team(fx.get("Home Team", ""))
                    a_match = normalize_team(away) == normalize_team(fx.get("Away Team", ""))
                    time_match = (fx_start - live_tolerance <= bsr_start <= fx_end + live_tolerance)

                    if h_match and a_match and time_match:
                        matched = True
                        break
                except Exception:
                    continue

            if matched:
                df.at[idx, "program_category_check_result"] = "True"
                df.at[idx, "program_category_check_remark"] = "Valid Live program"
            else:
                df.at[idx, "program_category_check_result"] = "False"
                df.at[idx, "program_category_check_remark"] = "Live program outside tolerance or team mismatch"
       
        # ===== DELAYED =====
        elif "delayed" in ptype:
            df.at[idx, "program_category_check_result"] = "True"
            df.at[idx, "program_category_check_remark"] = "Valid Delayed"

        # ===== REPEAT =====
        elif "repeat" in ptype:
            df.at[idx, "program_category_check_result"] = "True"
            df.at[idx, "program_category_check_remark"] = "Valid Repeat"

        # ===== OTHERS =====
        else:
            df.at[idx, "program_category_check_result"] = "NA"
            df.at[idx, "program_category_check_remark"] = "Program type not applicable"

    df.drop(columns=["_bsr_start_utc"], inplace=True, errors="ignore")
    return df
