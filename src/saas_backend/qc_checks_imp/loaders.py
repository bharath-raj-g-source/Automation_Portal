# import datetime

# import numpy as np
# import pandas as pd
# import re
# import os
# from .common import DATE_FORMAT

# def detect_period_from_rosco(rosco_path):
#     df = pd.read_excel(rosco_path, header=None)

#     label_col = df.iloc[:, 1].astype(str)
#     period_row_mask = label_col.str.contains(
#         "monitoring period", case=False, na=False
#     )

#     if not period_row_mask.any():
#         raise ValueError("Missing monitoring period label in Column B of Rosco")

#     row_idx = period_row_mask.idxmax()

#     if df.shape[1] <= 2:
#         raise ValueError(
#             f"Missing monitoring period, please fill cell C{row_idx + 1} of Rosco"
#         )

#     user_input_text = str(df.iloc[row_idx, 2]).strip()

#     if not user_input_text or user_input_text.lower() == "nan":
#         raise ValueError(
#             f"Missing monitoring period in cell C{row_idx + 1} of Rosco"
#         )

#     found = re.findall(r"\d{4}-\d{2}-\d{2}", user_input_text)

#     if len(found) < 2:
#         raise ValueError(
#             f"Invalid date format in cell C{row_idx + 1}. "
#             "Expected two dates (YYYY-MM-DD)."
#         )

#     start_date = pd.to_datetime(found[0], format=DATE_FORMAT).date()
#     end_date   = pd.to_datetime(found[1], format=DATE_FORMAT).date()

#     if start_date > end_date:
#         raise ValueError(
#             f"Invalid monitoring period in cell C{row_idx + 1}: "
#             "start date is after end date"
#         )

#     return start_date, end_date

# def parse_frontend_dates(start_date_str, end_date_str):
#     if not start_date_str or not end_date_str:
#         raise ValueError("Missing monitoring period. Please select both Start and End dates in the UI.")
    
#     try:    
#         # Convert to Timestamp objects first
#         s_dt = pd.to_datetime(start_date_str, errors="coerce")
#         e_dt = pd.to_datetime(end_date_str, errors="coerce")

#         # Check if they became NaT
#         if pd.isna(s_dt) or pd.isna(e_dt):
#             raise ValueError("Invalid date format provided.")

#         # ONLY call .date() after confirming it's not NaT
#         start_date = s_dt.date()
#         end_date = e_dt.date()
        
#     except Exception as e:
#         if "Invalid date format" in str(e): raise
#         raise ValueError(f"Error parsing dates: {str(e)}")

#     if start_date > end_date:
#         raise ValueError("Invalid duration: Start Date cannot be after End Date.")
        
#     return start_date, end_date

# def detect_header_row_in_sheet(bsr_path, sheet_name):
#     df_sample = pd.read_excel(
#         bsr_path,
#         sheet_name=sheet_name,   #  LOCKED to this sheet
#         header=None,
#         nrows=200
#     )

#     for i, row in df_sample.iterrows():
#         row_str = " ".join(row.dropna().astype(str)).lower()

#         if "region" in row_str and "market" in row_str and "broadcaster" in row_str:
#             return i

#         if "date" in row_str and ("utc" in row_str or "gmt" in row_str):
#             return i

#     raise ValueError(
#         f"Header not found in sheet '{sheet_name}'"
#     )

# def parse_datetime(date_val, time_val=None):
#     """
#     Robust parser that handles multiple date and time formats.
#     Supports:
#     - DD-MM-YYYY
#     - YYYY-MM-DD
#     - MM/DD/YYYY
#     - Excel serial dates
#     - Datetime objects
#     - Missing or invalid values
#     """
#     try:
#         if pd.isna(date_val):
#             return pd.NaT

#         # Handle Excel serial numbers
#         if isinstance(date_val, (int, float)):
#             date_val = pd.to_datetime(date_val, unit="d", origin="1899-12-30")

#         # Combine date and time if time is provided
#         if time_val is not None and not pd.isna(time_val):
#             datetime_str = f"{date_val} {time_val}"
#         else:
#             datetime_str = date_val

#         return pd.to_datetime(
#             datetime_str,
#             errors="coerce",
#             infer_datetime_format=True,
#             dayfirst=True
#         )

#     except Exception:
#         return pd.NaT

# def _normalize_excel_columns(df):
#     WEEKDAY_NAMES = {
#         "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
#         "mon","tue","wed","thu","fri","sat","sun"
#     }

#     def excel_float_to_time(v):
#         """Convert Excel time fraction (including 0 and 1) to HH:MM:SS string."""
#         try:
#             f = float(v)
#             # f==1.0 means exactly 24:00 which is 00:00:00 next day — treat as 00:00:00
#             if f >= 1.0:
#                 f = f - int(f)
#             total_seconds = round(f * 86400)
#             h = total_seconds // 3600
#             m = (total_seconds % 3600) // 60
#             s = total_seconds % 60
#             return f"{h:02d}:{m:02d}:{s:02d}"
#         except Exception:
#             return v

#     def convert_value(v, target):
#         if v is None:
#             return v
#         # Check for pandas/numpy NA carefully — avoid calling pd.isna on non-scalar
#         try:
#             if pd.isna(v):
#                 return v
#         except Exception:
#             pass

#         # datetime.time → time string
#         if isinstance(v, datetime.time):
#             return v.strftime("%H:%M:%S") if target == "time" else v

#         # Full Timestamp or datetime → split by target
#         if isinstance(v, (pd.Timestamp, datetime.datetime)):
#             if target == "date":
#                 return v.strftime("%Y-%m-%d")
#             elif target == "time":
#                 return v.strftime("%H:%M:%S")

#         # date only (no time component)
#         if isinstance(v, datetime.date):
#             return v.strftime("%Y-%m-%d") if target == "date" else v

#         # ✅ Numeric — MUST handle 0 explicitly (midnight)
#         # Use explicit type check, not truthiness, so 0 is not skipped
#         if type(v) in (int, float) or (hasattr(np, 'integer') and isinstance(v, np.integer)) \
#                 or (hasattr(np, 'floating') and isinstance(v, np.floating)):
#             numeric = float(v)
#             if target == "time":
#                 return excel_float_to_time(numeric)
#             elif target == "date" and numeric > 2:
#                 try:
#                     converted = pd.Timestamp("1899-12-30") + pd.to_timedelta(numeric, unit="D")
#                     return converted.strftime("%Y-%m-%d")
#                 except Exception:
#                     return v

#         # String fallback
#         try:
#             s = str(v).strip()
#             parsed = pd.to_datetime(s, errors="coerce")
#             if pd.notna(parsed):
#                 if target == "date":
#                     return parsed.strftime("%Y-%m-%d")
#                 elif target == "time":
#                     return parsed.strftime("%H:%M:%S")
#         except Exception:
#             pass

#         return v

#     for col in df.columns:
#         col_lower = str(col).strip().lower()

#         if col_lower == "day":
#             continue

#         is_date_col = "date" in col_lower
#         is_time_col = any(kw in col_lower for kw in ["start", "end"])

#         if not is_date_col and not is_time_col:
#             continue

#         # Skip if column contains weekday names
#         sample_vals = df[col].dropna().head(20)
#         if sample_vals.apply(
#             lambda v: str(v).strip().lower() in WEEKDAY_NAMES
#         ).any():
#             continue

#         target = "date" if is_date_col else "time"
#         df[col] = df[col].apply(lambda v: convert_value(v, target))

#     return df

# def load_bsr(bsr_path):
#     xl = pd.ExcelFile(bsr_path)

#     allowed_sheets = {"worksheet", "database"}
#     target_sheet = None

#     for sheet in xl.sheet_names:
#         if sheet.strip().lower() in allowed_sheets:
#             target_sheet = sheet
#             break

#     if not target_sheet:
#         raise ValueError(
#             f"No valid sheet ('Worksheet' or 'Database') found in {os.path.basename(bsr_path)}"
#         )

#     header_row = detect_header_row_in_sheet(bsr_path, target_sheet)

#     # ── Step 1: peek at the header to find the Day column index ──
#     header_df = pd.read_excel(
#         bsr_path,
#         sheet_name=target_sheet,
#         header=header_row,
#         nrows=0          # just the header, no data rows
#     )
#     header_df.columns = [str(c).strip() for c in header_df.columns]

#     # Build dtype override: force every column whose name is exactly "Day" to str
#     dtype_overrides = {}
#     for col in header_df.columns:
#         if col.strip().lower() == "day":
#             dtype_overrides[col] = str

#     # ── Step 2: load with dtype overrides ──
#     df = pd.read_excel(
#         bsr_path,
#         sheet_name=target_sheet,
#         header=header_row,
#         dtype=dtype_overrides   # only Day is forced to str; everything else is auto
#     )

#     df.columns = [str(c).strip() for c in df.columns]

#     # ── Step 3: clean up any "nan" strings that dtype=str introduces ──
#     for col in df.columns:
#         if col.strip().lower() == "day":
#             df[col] = df[col].apply(
#                 lambda v: "" if str(v).strip().lower() in ("nan", "none", "") else str(v).strip()
#             )

#     # ── Step 4: normalize date/time columns ──
#     df = _normalize_excel_columns(df)

#     return df


import datetime

import numpy as np
import pandas as pd
import re
import os
from .common import DATE_FORMAT, parse_datetime

def detect_period_from_rosco(rosco_path):
    df = pd.read_excel(rosco_path, header=None)

    label_col = df.iloc[:, 1].astype(str)
    period_row_mask = label_col.str.contains(
        "monitoring period", case=False, na=False
    )

    if not period_row_mask.any():
        raise ValueError("Missing monitoring period label in Column B of Rosco")

    row_idx = period_row_mask.idxmax()

    if df.shape[1] <= 2:
        raise ValueError(
            f"Missing monitoring period, please fill cell C{row_idx + 1} of Rosco"
        )

    user_input_text = str(df.iloc[row_idx, 2]).strip()

    if not user_input_text or user_input_text.lower() == "nan":
        raise ValueError(
            f"Missing monitoring period in cell C{row_idx + 1} of Rosco"
        )

    found = re.findall(r"\d{4}-\d{2}-\d{2}", user_input_text)

    if len(found) < 2:
        raise ValueError(
            f"Invalid date format in cell C{row_idx + 1}. "
            "Expected two dates (YYYY-MM-DD)."
        )

    start_date = pd.to_datetime(found[0], format=DATE_FORMAT).date()
    end_date   = pd.to_datetime(found[1], format=DATE_FORMAT).date()

    if start_date > end_date:
        raise ValueError(
            f"Invalid monitoring period in cell C{row_idx + 1}: "
            "start date is after end date"
        )

    return start_date, end_date

def parse_frontend_dates(start_date_str, end_date_str):
    if not start_date_str or not end_date_str:
        raise ValueError("Missing monitoring period. Please select both Start and End dates in the UI.")
    
    try:    
        # Convert to Timestamp objects first
        s_dt = pd.to_datetime(start_date_str, errors="coerce")
        e_dt = pd.to_datetime(end_date_str, errors="coerce")

        # Check if they became NaT
        if pd.isna(s_dt) or pd.isna(e_dt):
            raise ValueError("Invalid date format provided.")

        # ONLY call .date() after confirming it's not NaT
        start_date = s_dt.date()
        end_date = e_dt.date()
        
    except Exception as e:
        if "Invalid date format" in str(e): raise
        raise ValueError(f"Error parsing dates: {str(e)}")

    if start_date > end_date:
        raise ValueError("Invalid duration: Start Date cannot be after End Date.")
        
    return start_date, end_date

def detect_header_row_in_sheet(bsr_path, sheet_name):
    df_sample = pd.read_excel(
        bsr_path,
        sheet_name=sheet_name,   #  LOCKED to this sheet
        header=None,
        nrows=200
    )

    for i, row in df_sample.iterrows():
        row_str = " ".join(row.dropna().astype(str)).lower()

        if "region" in row_str and "market" in row_str and "broadcaster" in row_str:
            return i

        if "date" in row_str and ("utc" in row_str or "gmt" in row_str):
            return i

    raise ValueError(
        f"Header not found in sheet '{sheet_name}'"
    )

def _normalize_excel_columns(df):
    WEEKDAY_NAMES = {
        "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
        "mon","tue","wed","thu","fri","sat","sun"
    }

    def excel_float_to_time(v):
        """Convert Excel time fraction (including 0 and 1) to HH:MM:SS string."""
        try:
            f = float(v)
            # f==1.0 means exactly 24:00 which is 00:00:00 next day — treat as 00:00:00
            if f >= 1.0:
                f = f - int(f)
            total_seconds = round(f * 86400)
            h = total_seconds // 3600
            m = (total_seconds % 3600) // 60
            s = total_seconds % 60
            return f"{h:02d}:{m:02d}:{s:02d}"
        except Exception:
            return v

    def convert_value(v, target):
        if v is None:
            return v
        # Check for pandas/numpy NA carefully — avoid calling pd.isna on non-scalar
        try:
            if pd.isna(v):
                return v
        except Exception:
            pass

        # datetime.time → time string
        if isinstance(v, datetime.time):
            return v.strftime("%H:%M:%S") if target == "time" else v

        # Full Timestamp or datetime → split by target
        if isinstance(v, (pd.Timestamp, datetime.datetime)):
            if target == "date":
                return v.strftime("%Y-%m-%d")
            elif target == "time":
                return v.strftime("%H:%M:%S")

        # date only (no time component)
        if isinstance(v, datetime.date):
            return v.strftime("%Y-%m-%d") if target == "date" else v

        # ✅ Numeric — MUST handle 0 explicitly (midnight)
        # Use explicit type check, not truthiness, so 0 is not skipped
        if type(v) in (int, float) or (hasattr(np, 'integer') and isinstance(v, np.integer)) \
                or (hasattr(np, 'floating') and isinstance(v, np.floating)):
            numeric = float(v)
            if target == "time":
                return excel_float_to_time(numeric)
            elif target == "date" and numeric > 2:
                try:
                    converted = pd.Timestamp("1899-12-30") + pd.to_timedelta(numeric, unit="D")
                    return converted.strftime("%Y-%m-%d")
                except Exception:
                    return v

        # String fallback
        try:
            s = str(v).strip()
            parsed = pd.to_datetime(s, errors="coerce")
            if pd.notna(parsed):
                if target == "date":
                    return parsed.strftime("%Y-%m-%d")
                elif target == "time":
                    return parsed.strftime("%H:%M:%S")
        except Exception:
            pass

        return v

    for col in df.columns:
        col_lower = str(col).strip().lower()

        if col_lower == "day":
            continue

        is_date_col = "date" in col_lower
        is_time_col = any(kw in col_lower for kw in ["start", "end"])

        if not is_date_col and not is_time_col:
            continue

        # Skip if column contains weekday names
        sample_vals = df[col].dropna().head(20)
        if sample_vals.apply(
            lambda v: str(v).strip().lower() in WEEKDAY_NAMES
        ).any():
            continue

        target = "date" if is_date_col else "time"
        df[col] = df[col].apply(lambda v: convert_value(v, target))

    return df

def load_bsr(bsr_path):
    xl = pd.ExcelFile(bsr_path)

    allowed_sheets = {"worksheet", "database"}
    target_sheet = None

    for sheet in xl.sheet_names:
        if sheet.strip().lower() in allowed_sheets:
            target_sheet = sheet
            break

    if not target_sheet:
        raise ValueError(
            f"No valid sheet ('Worksheet' or 'Database') found in {os.path.basename(bsr_path)}"
        )

    header_row = detect_header_row_in_sheet(bsr_path, target_sheet)

    # ── Step 1: peek at the header to find the Day column index ──
    header_df = pd.read_excel(
        bsr_path,
        sheet_name=target_sheet,
        header=header_row,
        nrows=0          # just the header, no data rows
    )
    header_df.columns = [str(c).strip() for c in header_df.columns]

    # Build dtype override: force every column whose name is exactly "Day" to str
    dtype_overrides = {}
    for col in header_df.columns:
        if col.strip().lower() == "day":
            dtype_overrides[col] = str

    # ── Step 2: load with dtype overrides ──
    df = pd.read_excel(
        bsr_path,
        sheet_name=target_sheet,
        header=header_row,
        dtype=dtype_overrides   # only Day is forced to str; everything else is auto
    )

    df.columns = [str(c).strip() for c in df.columns]

    # ── Step 3: clean up any "nan" strings that dtype=str introduces ──
    for col in df.columns:
        if col.strip().lower() == "day":
            df[col] = df[col].apply(
                lambda v: "" if str(v).strip().lower() in ("nan", "none", "") else str(v).strip()
            )

    # ── Step 4: normalize date/time columns ──
    df = _normalize_excel_columns(df)

    return df