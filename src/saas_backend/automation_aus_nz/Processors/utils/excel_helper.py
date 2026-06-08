import pandas as pd
import re

def save_styled_xlsx(df, output, market, is_diagnostic=False):
    # --- 1. DATA TYPE HARDENING (Crucial for Excel Masks) ---
    # Strip "0 days" from exposure
    if 'total exposure' in df.columns:
        df['total exposure'] = df['total exposure'].astype(str).str.replace(r'0 days\s*', '', regex=True)
        df['total exposure'] = df['total exposure'].replace(['nan', 'NaN', 'None', '0.0', '0', '00:00:00'], '')

    # Force numbers to floats so the $ and % masks stick
    for col in ['AVE (100%)', 'QI value', 'QI Score (in %)']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)

    # Force proper Date objects
    if 'progr. start (date)' in df.columns:
        df['progr. start (date)'] = pd.to_datetime(df['progr. start (date)'], errors='coerce').dt.date

    # --- 2. INITIALIZE WRITER ---
    writer = pd.ExcelWriter(output, engine='xlsxwriter')
    df.to_excel(writer, index=False, sheet_name='Master Data')
    workbook = writer.book
    worksheet = writer.sheets['Master Data']

    # --- 3. HEADER STYLES ---
    header_yellow = workbook.add_format({'bg_color': '#FFFF00', 'font_color': 'black', 'bold': True, 'border': 1, 'align': 'center'})
    header_blue = workbook.add_format({'bg_color': '#B8D3EF', 'font_color': 'black', 'bold': True, 'border': 1, 'align': 'center'})
    header_red = workbook.add_format({'bg_color': '#FF0000', 'font_color': 'black', 'bold': True, 'border': 1, 'align': 'center'})
    header_white = workbook.add_format({'bg_color': '#FFFFFF', 'font_color': 'black', 'bold': True, 'border': 1, 'align': 'center'})

    yellow_cols, blue_cols, red_cols = [0, 9, 10, 14, 24], [4, 7, 8, 12, 15, 21], [28, 29, 30, 31]

    for col_num, value in enumerate(df.columns.values):
        if col_num in yellow_cols:
            worksheet.write(0, col_num, value, header_yellow)
        elif col_num in blue_cols:
            worksheet.write(0, col_num, value, header_blue)
        elif col_num in red_cols:
            worksheet.write(0, col_num, value, header_red)
        else:
            worksheet.write(0, col_num, value, header_white)

    # --- 4. CONTENT FORMATTING MASKS ---
    date_fmt = workbook.add_format({'num_format': 'dd/mm/yyyy'})
    curr_fmt = workbook.add_format({'num_format': '$#,##0.00'}) 
    time_fmt = workbook.add_format({'num_format': 'hh:mm:ss'})
    pct_fmt  = workbook.add_format({'num_format': '0.00"%"'})

    # 🚨 FIX: Set the global width FIRST so it doesn't overwrite specific formats
    worksheet.set_column('A:AF', 20)
    
    # Now apply the specific column masks safely
    worksheet.set_column('B:B', 15, date_fmt)
    worksheet.set_column('X:X', 15, time_fmt)  # Exposure
    worksheet.set_column('Z:AA', 18, curr_fmt) # AVE & QI with $
    worksheet.set_column('AB:AB', 12, pct_fmt) # QI Score %
    
    # --- 5. FINAL POLISH ---
    worksheet.freeze_panes(1, 0) # Freezes the top row so scrolling is easier
    
    writer.close()