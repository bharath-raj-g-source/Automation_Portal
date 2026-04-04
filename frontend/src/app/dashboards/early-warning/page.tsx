"use client";

import React, { useState, useMemo } from "react";
import { useRunEarlyWarningAnalysisMutation } from "@/state/api"; 
import { 
  FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, 
  Search, Filter, X, Activity, ShieldCheck, 
  ArrowUpDown, Calendar, Globe, Layers, Eraser,
  Tv, Download, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

// --- BRAND COLOR PALETTE (Synchronized) ---
const COLORS = {
  GAPS: "#E41C63",        // Rose/Red
  PARTIAL: "#0F39B1",     // Deep Blue
  NO_SCHEDULE: "#FFC000", // Amber/Yellow
  OK: "#22786A",          // Emerald Green
  TOTAL: "#3B82F6"        // Standard Blue
};

// --- INTERFACES ---
interface TrendStat {
  Date: string;
  Scheduled: number;
  "Processing Gaps": number;
  "No Schedule": number;
  "Partial Schedule"?: number;
}

interface BsaViewItem {
  "TV Channel": string;
  Market: string;
  "Final Status": string;
  "Critical Channel"?: string;
  [key: string]: any; 
}

interface MandatoryItem {
  Channel: string;
  Found: string; 
  Status: string; 
}

interface RoscoViewItem {
  Channel: string;
  Market: string;
  "IN AURA": string;
  "IN BSA": string;
  "Final Status": string;
  [key: string]: any; 
}

interface FilterOptions {
  markets: string[];
  channels: string[];
  statuses: string[];
}

const EarlyWarningPage = () => {
  // --- STATE ---
  const [bsaFile, setBsaFile] = useState<File | null>(null);
  const [roscoFile, setRoscoFile] = useState<File | null>(null);
  
  const [activeTab, setActiveTab] = useState<"bsa" | "trends" | "mandatory" | "rosco" | "timeline">("bsa");
  const [showFilters, setShowFilters] = useState(true);

  // Filters State
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [isCriticalOnly, setIsCriticalOnly] = useState(true); 
  
  const [globalSearch, setGlobalSearch] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // RTK Query API Hook (Live Server)
  const [runAnalysis, { data, isLoading: isApiLoading }] = useRunEarlyWarningAnalysisMutation();
  const [isExporting, setIsExporting] = useState(false);

  // --- HELPER: ROBUST DATE PARSING ---
  const toISODateString = (dateStr: string): string => {
    try {
      const cleanStr = dateStr.replace(/(\d+)(st|nd|rd|th)/i, '$1');
      const dateObj = new Date(cleanStr);
      if (isNaN(dateObj.getTime())) return "";
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return "";
    }
  };

  // --- THE BRAIN: DYNAMIC LOGIC ---
  const { filteredTableData, filterOptions, stats, visibleDateColumns, dynamicTrendStats, timelineData } = useMemo(() => {
    if (!data) return { 
      filteredTableData: [], 
      filterOptions: { markets: [], channels: [], statuses: [] }, 
      stats: null,
      visibleDateColumns: [] as string[],
      dynamicTrendStats: [],
      timelineData: null
    };

    const rawBsa = data.bsa_view || [];
    const rawRosco = data.rosco_view || [];
    
    // 1. Identify currently visible date columns (Monitoring Period)
    let dateCols: string[] = data.date_columns || [];
    if (startDate || endDate) {
      dateCols = dateCols.filter((colName: string) => {
        const colIso = toISODateString(colName); 
        if (!colIso) return true; 
        const startIso = startDate || "0000-01-01";
        const endIso = endDate || "9999-12-31";
        return colIso >= startIso && colIso <= endIso;
      });
    }

    // Optimized Critical Channels lookup from server data
    const criticalChannelNames = new Set(
      data.mandatory_audit?.map((m: any) => String(m.Channel).toLowerCase().trim()) || []
    );

    // 2. RE-CALCULATE STATUS DYNAMICALLY (Severity Hierarchy)
    const processedBsa = rawBsa.map((row: any) => {
      const visibleValues = dateCols.map(d => String(row[d] || "").toLowerCase());
      let dynamicStatus = "OK";
      
      if (visibleValues.length === 0) {
        dynamicStatus = row["Final Status"]; 
      } else if (visibleValues.some(v => v.includes("gaps") || v.includes("missing"))) {
        dynamicStatus = "FLAG: PROCESSING GAPS";
      } else if (visibleValues.every(v => v.includes("no schedule"))) {
        dynamicStatus = "FLAG: NO SCHEDULE";
      } else if (visibleValues.some(v => v.includes("no schedule"))) {
        dynamicStatus = "FLAG: PARTIAL SCHEDULE";
      }

      return { ...row, "Final Status": dynamicStatus };
    });

    const getChannel = (item: any) => item["TV Channel"] || item["Channel"];

    // 3. APPLY FILTERS
    const applyFilters = (dataset: any[]) => {
      return dataset.filter((item: any) => {
        const marketMatch = selectedMarkets.length === 0 || selectedMarkets.includes(item.Market);
        const channelMatch = selectedChannels.length === 0 || selectedChannels.includes(getChannel(item));
        const statusMatch = selectedStatus.length === 0 || selectedStatus.includes(item["Final Status"]);
        
        const isCrit = item["Critical Channel"] === "CRITICAL" || criticalChannelNames.has(String(getChannel(item)).toLowerCase().trim());
        const criticalMatch = !isCriticalOnly || isCrit;
        
        const searchMatch = !globalSearch || Object.values(item).some(val => 
          String(val).toLowerCase().includes(globalSearch.toLowerCase())
        );
        
        return marketMatch && channelMatch && statusMatch && criticalMatch && searchMatch;
      });
    };

    const filteredBsa = applyFilters(processedBsa);
    const filteredRosco = applyFilters(rawRosco);

    // 4. TREND CALCULATION (Synchronized with Partial)
    const calcTrendStats = dateCols.map((dCol) => {
      let scheduled = 0, gaps = 0, noSchedule = 0, partial = 0;
      filteredBsa.forEach((row) => {
        const val = String(row[dCol] || "").toLowerCase();
        if (val.includes("gaps") || val.includes("missing")) gaps++;
        else if (val.includes("no schedule") || val.includes("not in bsa")) noSchedule++;
        else if (val.includes("partial")) partial++;
        else if (val === "ok" || val.includes("scheduled")) scheduled++;
      });
      return { 
        Date: dCol, 
        Scheduled: scheduled, 
        "Processing Gaps": gaps, 
        "No Schedule": noSchedule,
        "Partial Schedule": partial
      };
    });

    // 5. CALCULATE 5-CARD STATS
    const stats = {
      total: filteredBsa.length,
      gaps: filteredBsa.filter((i: any) => i["Final Status"].includes("GAPS")).length,
      partial: filteredBsa.filter((i: any) => i["Final Status"].includes("PARTIAL")).length,
      noSchedule: filteredBsa.filter((i: any) => i["Final Status"].includes("NO SCHEDULE")).length,
      ok: filteredBsa.filter((i: any) => i["Final Status"] === "OK").length
    };

    const markets = Array.from(new Set(processedBsa.map((i: any) => i.Market))).sort() as string[];
    const channels = Array.from(new Set(processedBsa.map((i: any) => getChannel(i)))).sort() as string[];
    const statuses = ["OK", "FLAG: PROCESSING GAPS", "FLAG: PARTIAL SCHEDULE", "FLAG: NO SCHEDULE"];

    let tableData = activeTab === 'rosco' ? filteredRosco : filteredBsa;

    // Sorting Logic
    if (sortConfig) {
      tableData.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    // 6. TIMELINE PROCESSING (GANTT)
    let processedTimeline = null;
    const responseData = data as any;
    if (responseData.timeline_view && responseData.timeline_view.length > 0) {
      const liveEvents = responseData.timeline_view.filter((d: any) => String(d["Type of program"] || "").toLowerCase() === 'live');
      const parsedEvents = liveEvents.map((d: any) => {
        const startTs = new Date(d.Start_Datetime).getTime();
        const endTs = new Date(d.End_Datetime).getTime();
        return { ...d, marketChannel: `${d.Market} - ${d["TV-Channel"]}`, startTs, endTs, duration: endTs - startTs };
      }).filter((d: any) => !isNaN(d.startTs) && !isNaN(d.endTs) && d.duration > 0);

      const filteredEvents = parsedEvents.filter((d: any) => {
        const marketMatch = selectedMarkets.length === 0 || selectedMarkets.includes(d.Market);
        const channelMatch = selectedChannels.length === 0 || selectedChannels.includes(d["TV-Channel"]);
        return marketMatch && channelMatch;
      });

      if (filteredEvents.length > 0) {
        const minTs = Math.min(...filteredEvents.map((d: any) => d.startTs));
        const maxTs = Math.max(...filteredEvents.map((d: any) => d.endTs));
        const grouped = filteredEvents.reduce((acc: any, curr: any) => {
          if (!acc[curr.marketChannel]) acc[curr.marketChannel] = [];
          acc[curr.marketChannel].push(curr);
          return acc;
        }, {});
        const sortedKeys = Object.keys(grouped).sort();
        const ticks = [];
        let currentTick = new Date(minTs);
        currentTick.setMinutes(0, 0, 0); 
        while (currentTick.getTime() <= maxTs + (3600000 * 6)) { 
          ticks.push(currentTick.getTime());
          currentTick.setHours(currentTick.getHours() + 6); 
        }
        processedTimeline = { minTs, maxTs, totalSpan: maxTs - minTs, grouped, sortedKeys, ticks };
      }
    }

    return { 
      filteredTableData: tableData, filterOptions: { markets, channels, statuses }, 
      stats, visibleDateColumns: dateCols, dynamicTrendStats: calcTrendStats, timelineData: processedTimeline
    };
  }, [data, activeTab, selectedMarkets, selectedChannels, selectedStatus, isCriticalOnly, startDate, endDate, sortConfig, globalSearch]);

  // --- ACTIONS ---
  const handleUpload = async () => {
    if (!bsaFile) return;
    const formData = new FormData();
    formData.append("bsa_file", bsaFile);
    if (roscoFile) formData.append("rosco_file", roscoFile);
    
    // Reset Filters on new run
    setSelectedMarkets([]); setSelectedChannels([]); setSelectedStatus([]); 
    setIsCriticalOnly(true); setStartDate(""); setEndDate(""); setGlobalSearch("");
    
    try { 
      await runAnalysis(formData).unwrap(); 
    } catch (err) { 
      console.error("API Error: ", err); 
      alert("Failed to analyze files. Please check connection.");
    }
  };

  const handleDownload = async () => {
    if (!data || filteredTableData.length === 0) return;

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    // --- NATIVE .XLSX EXPORT FOR MAIN TABLES (With Colors) ---
    if (activeTab === 'bsa' || activeTab === 'rosco') {
      try {
        setIsExporting(true);
        
        // Dynamically import ExcelJS so it doesn't slow down initial page load
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(activeTab === 'bsa' ? 'BSA Analysis' : 'Rosco Compare');

        // 1. Define Columns & Widths
        const columns = [
          { header: 'Sr.', key: 'sr', width: 6 },
          { header: activeTab === 'bsa' ? 'TV Channel' : 'Channel', key: 'channel', width: 28 },
          { header: 'Market', key: 'market', width: 20 },
        ];
        
        if (activeTab === 'rosco') {
          columns.push({ header: 'In Aura?', key: 'inaura', width: 12 });
          columns.push({ header: 'In BSA?', key: 'inbsa', width: 12 });
        }
        
        columns.push({ header: 'Status', key: 'status', width: 25 });
        
        // Add Visible Dates
        visibleDateColumns.forEach(d => columns.push({ header: d, key: d, width: 18 }));
        sheet.columns = columns;

        // Style the Header Row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        // 2. Add Data & Style Cells
        filteredTableData.forEach((row: any, idx: number) => {
          const rowData: any = { sr: idx + 1 };
          
          if (activeTab === 'bsa') {
            rowData.channel = row["TV Channel"];
            rowData.market = row.Market;
            rowData.status = row["Final Status"];
          } else {
            rowData.channel = row.Channel;
            rowData.market = row.Market;
            rowData.inaura = row["IN AURA"] === "YES" ? "YES" : "NO";
            rowData.inbsa = row["IN BSA"] === "YES" ? "YES" : "NO";
            rowData.status = row["Final Status"];
          }
          
          visibleDateColumns.forEach(d => {
            rowData[d] = (activeTab === 'rosco' && row[d] === "Not in BSA") ? "-" : (row[d] || "-");
          });

          const excelRow = sheet.addRow(rowData);
          
          // Apply strict alignment
          excelRow.alignment = { vertical: 'middle' };
          excelRow.getCell('sr').alignment = { horizontal: 'center' };
          if (activeTab === 'rosco') {
            excelRow.getCell('inaura').alignment = { horizontal: 'center' };
            excelRow.getCell('inbsa').alignment = { horizontal: 'center' };
          }

          // 3. Inject Brand Colors for the Status Column
          const statusCell = excelRow.getCell('status');
          statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          const s = String(row["Final Status"] || "").toUpperCase();
          if (s.includes("GAPS")) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE41C63' } }; 
            statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          } else if (s.includes("NO SCHEDULE")) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; 
            statusCell.font = { color: { argb: 'FF000000' }, bold: true };
          } else if (s.includes("PARTIAL")) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; 
            statusCell.fill.fgColor = { argb: 'FF0F39B1' }; 
            statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          } else if (s === "OK" || s.includes("SCHEDULED")) {
            statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22786A' } }; 
            statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          }
          
          // Center the dynamic date columns
          visibleDateColumns.forEach(d => excelRow.getCell(d).alignment = { horizontal: 'center' });
        });

        // 4. Generate the actual file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeTab === 'bsa' ? 'BSA_Analysis' : 'Rosco_Compare'}_${timestamp}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } catch (error) {
        console.error("Excel generation failed", error);
        alert("Failed to generate Excel file.");
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // --- FALLBACK CSV FOR SECONDARY TABS (Trends, Timeline, Mandatory) ---
    let exportData: any[] = [];
    let filename = `EW_Export_${timestamp}.csv`;
    
    if (activeTab === 'trends') { filename = `Trend_Tracker_${timestamp}.csv`; exportData = dynamicTrendStats; } 
    else if (activeTab === 'mandatory') { filename = `Mandatory_Audit_${timestamp}.csv`; exportData = data.mandatory_audit || []; } 
    else if (activeTab === 'timeline') { filename = `Timeline_Events_${timestamp}.csv`; exportData = (data as any).timeline_view || []; }
    
    if (exportData.length === 0) return;
    
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [headers.join(","), ...exportData.map(row => headers.map(f => `"${String(row[f] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; 
    link.setAttribute("download", filename);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };


  // --- RENDERING HELPERS ---
  const getBadgeStyle = (s: string | null) => {
    const defaultStyle = { backgroundColor: "#F1F5F9", color: "#64748B", borderColor: "transparent" };
    if (!s) return defaultStyle;
    const status = s.toUpperCase();
    if (status.includes("GAPS")) return { backgroundColor: COLORS.GAPS, color: "white", borderColor: "transparent" }; 
    if (status.includes("NO SCHEDULE")) return { backgroundColor: COLORS.NO_SCHEDULE, color: "black", borderColor: "transparent" }; 
    if (status.includes("PARTIAL")) return { backgroundColor: COLORS.PARTIAL, color: "white", borderColor: "transparent" };
    if (status === "OK" || status.includes("SCHEDULED")) return { backgroundColor: COLORS.OK, color: "white", borderColor: "transparent" };
    return defaultStyle;
  };

  // Colored Timeline Feature (From Code B, adopted to Code A render structure)
  const getTimelineColor = (comp: string) => {
    if(!comp) return { bg: 'bg-[#3498DB]', border: 'border-[#2980B9]', text: 'text-white' };
    const c = comp.toLowerCase();
    if (c.includes('practice 1')) return { bg: 'bg-[#5DADE2]', border: 'border-[#3498DB]', text: 'text-white' };
    if (c.includes('practice 2')) return { bg: 'bg-[#3498DB]', border: 'border-[#2980B9]', text: 'text-white' };
    if (c.includes('practice 3')) return { bg: 'bg-[#2ECC71]', border: 'border-[#27AE60]', text: 'text-white' };
    if (c.includes('qualifying')) return { bg: 'bg-[#F39C12]', border: 'border-[#D68910]', text: 'text-white' };
    if (c.includes('race') || c.includes('grand prix')) return { bg: 'bg-[#E74C3C]', border: 'border-[#C0392B]', text: 'text-white' };
    if (c.includes('training')) return { bg: 'bg-[#F9E79F]', border: 'border-[#F1C40F]', text: 'text-slate-800' };
    return { bg: 'bg-[#3498DB]', border: 'border-[#2980B9]', text: 'text-white' };
  };

  const formatHeaderDate = (dateStr: string) => {
    const match = dateStr.match(/^(\d+)(st|nd|rd|th|ST|ND|RD|TH)(.*)$/);
    if (match) {
      const [_, day, suffix, rest] = match;
      return (
        <span className="inline-flex items-center justify-center">
          <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{parseInt(day)}</span>
          <sup className="text-[0.55rem] uppercase font-bold text-slate-500 dark:text-slate-400 -top-[0.5em] ml-0.5">{suffix}</sup>
          <span className="ml-1.5 font-medium text-[10px] text-slate-500">{rest}</span>
        </span>
      );
    }
    return dateStr;
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] bg-[#F8FAFC] dark:bg-[#0B0C0E]">
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR --- */}
        {data && (
          <div className={`${showFilters ? 'w-72 border-r' : 'w-0'} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all flex flex-col z-20 overflow-hidden shrink-0`}>
            <div className={`flex flex-col h-full w-72 ${showFilters ? 'visible' : 'invisible'}`}>
              <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-xs uppercase tracking-tight text-slate-700 dark:text-slate-200 flex items-center gap-2"><Filter size={14} /> Data Filters</h2>
                <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={16}/></button>
              </div>
              <div className="p-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Monitoring Period</label>
                  <div className="flex flex-col gap-2">
                    <input type="date" className="w-full text-[10px] p-1.5 border rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <input type="date" className="w-full text-[10px] p-1.5 border rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer group hover:border-blue-300 dark:hover:border-blue-600 transition-colors" onClick={() => setIsCriticalOnly(!isCriticalOnly)}>
                   <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-2 select-none tracking-wider group-hover:text-rose-600"><ShieldCheck size={12}/> Critical Only</span>
                   <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isCriticalOnly ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <div className={`bg-white w-3 h-3 rounded-full transform transition-transform ${isCriticalOnly ? 'translate-x-4' : ''}`}></div>
                   </div>
                </div>

                <SearchableList label="Market" icon={<Globe size={12}/>} options={filterOptions.markets} selected={selectedMarkets} onChange={setSelectedMarkets} />
                <SearchableList label="Channel" icon={<Tv size={12}/>} options={filterOptions.channels} selected={selectedChannels} onChange={setSelectedChannels} />
                
                {/* Colored Status Filters */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 tracking-wider"><Activity size={12}/> Status</label>
                  <div className="space-y-1">
                    {filterOptions.statuses.map((s) => {
                      const statusColor = s.includes('GAPS') ? COLORS.GAPS : s.includes('PARTIAL') ? COLORS.PARTIAL : s.includes('NO') ? COLORS.NO_SCHEDULE : COLORS.OK;
                      return (
                        <label key={s} className="flex items-center gap-2 text-[10px] p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors group">
                          <input type="checkbox" className="rounded border-slate-300 dark:border-slate-600 text-blue-600 w-3 h-3 focus:ring-0 bg-white dark:bg-slate-700 cursor-pointer" checked={selectedStatus.includes(s)} onChange={(e) => e.target.checked ? setSelectedStatus([...selectedStatus, s]) : setSelectedStatus(selectedStatus.filter(x => x !== s))} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 text-slate-600 dark:text-slate-300 select-none">{s}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button onClick={() => { setSelectedMarkets([]); setSelectedChannels([]); setSelectedStatus([]); setIsCriticalOnly(true); setStartDate(""); setEndDate(""); setGlobalSearch(""); }} className="w-full py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:text-rose-500"><Eraser size={12}/> Reset Filters</button>
              </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 shrink-0">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {!showFilters && data && (
                  <button onClick={() => setShowFilters(true)} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:text-blue-600 transition-colors"><Filter size={16} className="text-slate-600 dark:text-slate-300" /></button>
                )}
                <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><Layers className="text-blue-600 dark:text-blue-500 shrink-0" size={20}/> Early Warning Dashboard</h1>
              </div>
              <div className="flex gap-2 items-center flex-wrap justify-end">
                <input type="file" id="bsa" className="hidden" onChange={(e) => setBsaFile(e.target.files?.[0] || null)} />
                <label htmlFor="bsa" className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 rounded-lg text-xs font-bold cursor-pointer transition-all min-w-[160px]">
                  <FileSpreadsheet size={14} className={bsaFile ? "text-emerald-500" : "text-slate-400"} />
                  <span className="truncate max-w-[200px]">{bsaFile ? bsaFile.name : '1. Upload BSA (Mandatory)'}</span>
                </label>
                
                <input type="file" id="rosco" className="hidden" onChange={(e) => setRoscoFile(e.target.files?.[0] || null)} />
                <label htmlFor="rosco" className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 rounded-lg text-xs font-bold cursor-pointer transition-all min-w-[160px]">
                  <Globe size={14} className={roscoFile ? "text-purple-500" : "text-slate-400"} />
                  <span className="truncate max-w-[200px]">{roscoFile ? roscoFile.name : '2. Upload ROSCO (Optional)'}</span>
                </label>
                
                <button onClick={handleUpload} disabled={!bsaFile || isApiLoading || isExporting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 shrink-0">
                  {(isApiLoading || isExporting) ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 
                  {(isApiLoading || isExporting) ? "Processing..." : "Run"}
                </button>
                
                {data && (
                  <button onClick={handleDownload} className="p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm shrink-0" title="Download Export">
                    <Download size={18}/>
                  </button>
                )}
              </div>
            </div>

            {/* SYNCED 5-CARD STATS GRID */}
            {stats && (
              <div className="grid grid-cols-5 gap-3">
                <MetricCard label="Total Channels" value={stats.total} color={COLORS.TOTAL} />
                <MetricCard label="Processing Gaps" value={stats.gaps} color={COLORS.GAPS} />
                <MetricCard label="Partial Schedule" value={stats.partial} color={COLORS.PARTIAL} />
                <MetricCard label="No Schedule" value={stats.noSchedule} color={COLORS.NO_SCHEDULE} />
                <MetricCard label="Scheduled OK" value={stats.ok} color={COLORS.OK} />
              </div>
            )}
          </div>

          {/* --- TABS NAVIGATION --- */}
          {data && (
             <div className="flex px-4 pt-3 bg-white dark:bg-slate-900 gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0 custom-scrollbar">
               {[
                 {id: "bsa", label: "BSA View", icon: FileSpreadsheet}, 
                 {id: "trends", label: "Trend Tracker", icon: Activity}, 
                 {id: "mandatory", label: "Mandatory Audit", icon: ShieldCheck}, 
                 {id: "rosco", label: "Rosco Compare", icon: Globe},
                //  {id: "timeline", label: "Broadcast Timeline", icon: Clock}
               ].map((t) => (
                 <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`pb-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === t.id ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                   <t.icon size={12}/> {t.label}
                 </button>
               ))}
             </div>
          )}

          {/* --- TAB CONTENT AREAS --- */}
          <div className="flex-1 overflow-hidden p-4 bg-[#F8FAFC] dark:bg-[#0B0C0E]">
            
            {/* 1. TAB: BSA VIEW */}
            {activeTab === "bsa" && data && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full w-full">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center gap-4 shrink-0">
                  <div className="relative w-full max-w-sm">
                    <Search size={14} className="absolute left-3 top-2 text-slate-400"/>
                    <input type="text" placeholder="Search..." className="w-full text-xs pl-8 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                    {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"><X size={12}/></button>}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Showing <span className="text-slate-900 dark:text-white">{filteredTableData.length}</span> rows</div>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar w-full">
                  <table className="w-full text-[10px] text-left border-collapse relative">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold sticky top-0 z-10 shadow-sm text-slate-500 dark:text-slate-400 uppercase">
                      <tr>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-12 text-center">SR.</th>
                        <SortableHeader label="TV CHANNEL" sortKey="TV Channel" currentSort={sortConfig} onSort={requestSort} />
                        <SortableHeader label="MARKET" sortKey="Market" currentSort={sortConfig} onSort={requestSort} />
                        <SortableHeader label="STATUS" sortKey="Final Status" currentSort={sortConfig} onSort={requestSort} />
                        {visibleDateColumns.map((d) => (
                          <th key={d} className="p-3 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group bg-slate-50 dark:bg-slate-800 min-w-[130px] whitespace-nowrap transition-colors" onClick={() => requestSort(d)}>
                            <div className="flex items-center justify-center gap-2 group-hover:text-blue-600 transition-colors">
                              <div className="flex-1 text-center">{formatHeaderDate(d)}</div>
                              <ArrowUpDown size={12} className={`shrink-0 ${sortConfig?.key === d ? 'text-blue-500 opacity-100' : 'opacity-0 group-hover:opacity-50'} transition-all`} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTableData.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group transition-colors">
                          <td className="p-2 text-center text-slate-400 dark:text-slate-500 w-12 border-b border-slate-50 dark:border-slate-800/50 font-medium">{idx + 1}</td>
                          <td className="p-2 pl-3 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap border-b border-slate-50 dark:border-slate-800/50 tracking-tight">{row["TV Channel"]}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400 whitespace-nowrap border-b border-slate-50 dark:border-slate-800/50">{row.Market}</td>
                          <td className="p-2 whitespace-nowrap border-b border-slate-50 dark:border-slate-800/50">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase leading-none inline-block shadow-sm" style={getBadgeStyle(row["Final Status"])}>
                              {row["Final Status"]}
                            </span>
                          </td>
                          {visibleDateColumns.map((d) => (
                            <td key={d} className="p-2 text-slate-400 dark:text-slate-500 border-l border-slate-50 dark:border-slate-800/50 border-b group-hover:border-slate-100 dark:group-hover:border-slate-700 text-center whitespace-nowrap font-medium">{row[d] || "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. TAB: TRENDS (Synchronized bars) */}
            {activeTab === "trends" && data && (
              <div className="h-full bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <h3 className="font-bold mb-4 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2"><Activity size={16} className="text-blue-500"/> Daily Status Distribution</h3>
                <div className="flex-1 min-h-0 relative text-slate-500 dark:text-slate-400">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicTrendStats} barSize={24}> 
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis dataKey="Date" tick={{fontSize: 10, fill: 'currentColor'}} axisLine={false} tickLine={false} dy={5} />
                      <YAxis tick={{fontSize: 10, fill: 'currentColor'}} axisLine={false} tickLine={false} width={25} />
                      <Tooltip cursor={{ fill: 'currentColor', opacity: 0.1 }} contentStyle={{ background: 'var(--tw-bg-opacity)', border: 'none' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} formatter={(value) => <span className="text-slate-600 dark:text-slate-300 font-semibold">{value}</span>}/>
                      
                      <Bar name="Scheduled OK" dataKey="Scheduled" stackId="a" fill={COLORS.OK} radius={[0, 0, 4, 4]} />
                      <Bar name="Processing Gaps" dataKey="Processing Gaps" stackId="a" fill={COLORS.GAPS} />
                      <Bar name="Partial Schedule" dataKey="Partial Schedule" stackId="a" fill={COLORS.PARTIAL} />
                      <Bar name="No Schedule" dataKey="No Schedule" stackId="a" fill={COLORS.NO_SCHEDULE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3. TAB: MANDATORY AUDIT */}
            {activeTab === "mandatory" && data && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full flex flex-col">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 text-xs shrink-0 tracking-wider">
                  <ShieldCheck size={14} className="text-purple-500"/> MANDATORY AUDIT RESULTS
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-[9px] text-slate-400 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 w-12 text-center">SR.</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold">CHANNEL NAME</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center font-bold">FOUND</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right font-bold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(data.mandatory_audit || []).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 text-center text-slate-400 dark:text-slate-500 w-12">{i + 1}</td>
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{row.Channel}</td>
                          <td className="p-3 text-center">{row.Found === "YES" ? <CheckCircle className="text-emerald-500 mx-auto" size={16} /> : <AlertTriangle className="text-rose-500 mx-auto" size={16} />}</td>
                          <td className="p-3 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm" style={getBadgeStyle(row.Status)}>
                              {row.Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. TAB: ROSCO COMPARE */}
            {activeTab === "rosco" && data && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full flex flex-col w-full">
                {data.rosco_view && data.rosco_view.length > 0 ? (
                  <>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center gap-4 shrink-0">
                      <div className="relative w-full max-w-sm">
                        <Search size={14} className="absolute left-3 top-2 text-slate-400"/>
                        <input type="text" placeholder="Search Rosco..." className="w-full text-xs pl-8 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                        {globalSearch && <button onClick={() => setGlobalSearch("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"><X size={12}/></button>}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Showing <span className="text-slate-900 dark:text-white">{filteredTableData.length}</span> rows</div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar w-full">
                      <table className="w-full text-[10px] text-left border-collapse relative">
                        <thead className="bg-slate-50 dark:bg-slate-800 font-bold sticky top-0 z-10 shadow-sm text-slate-500 dark:text-slate-400 uppercase">
                          <tr>
                            <th className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-12 text-center">SR.</th>
                            <SortableHeader label="CHANNEL" sortKey="Channel" currentSort={sortConfig} onSort={requestSort} />
                            <SortableHeader label="MARKET" sortKey="Market" currentSort={sortConfig} onSort={requestSort} />
                            <th className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[60px] text-center">AURA?</th>
                            <th className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[60px] text-center">BSA?</th>
                            <SortableHeader label="STATUS" sortKey="Final Status" currentSort={sortConfig} onSort={requestSort} />
                            {visibleDateColumns.map(d => <th key={d} className="p-3 border-b border-slate-200 dark:border-slate-700 min-w-[110px] text-center bg-slate-50 dark:bg-slate-800 font-normal">{formatHeaderDate(d)}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredTableData.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group">
                              <td className="p-2 text-center text-slate-400 dark:text-slate-500 w-12 border-b border-slate-50 dark:border-slate-800/50 font-medium">{idx + 1}</td>
                              <td className="p-2 pl-3 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-800/50 whitespace-nowrap">{row.Channel}</td>
                              <td className="p-2 text-slate-500 dark:text-slate-400 border-b border-slate-50 dark:border-slate-800/50 whitespace-nowrap">{row.Market}</td>
                              <td className="p-2 text-center border-b border-slate-50 dark:border-slate-800/50">{row["IN AURA"] === "YES" ? <span className="text-emerald-500 font-bold">YES</span> : <span className="text-rose-500 font-bold">NO</span>}</td>
                              <td className="p-2 text-center border-b border-slate-50 dark:border-slate-800/50">{row["IN BSA"] === "YES" ? <span className="text-emerald-500 font-bold">YES</span> : <span className="text-rose-500 font-bold">NO</span>}</td>
                              <td className="p-2 border-b border-slate-50 dark:border-slate-800/50 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase inline-block shadow-sm" style={getBadgeStyle(row["Final Status"])}>
                                  {row["Final Status"]}
                                </span>
                              </td>
                              {visibleDateColumns.map(d => <td key={d} className="p-2 text-center text-slate-400 dark:text-slate-500 border-l border-slate-50 dark:border-slate-800/50 border-b group-hover:border-slate-100 dark:group-hover:border-slate-700 whitespace-nowrap">{row[d] && row[d] !== "Not in BSA" ? row[d] : "-"}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-3">
                    <Globe size={32} className="opacity-20" />
                    <p className="text-xs">No Rosco data found. Please upload a file.</p>
                  </div>
                )}
              </div>
            )}

            {/* 5. TAB: BROADCAST TIMELINE */}
            {activeTab === "timeline" && data && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 text-sm shrink-0">
                  <span className="flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Live Broadcast Timeline</span>
                  {timelineData && <span className="text-[10px] font-medium text-slate-500 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">{timelineData.sortedKeys.length} Channels found</span>}
                </div>
                {timelineData ? (
                  <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#F8FAFC] dark:bg-[#0B0C0E]">
                    <div className="inline-flex flex-col min-w-full">
                      {/* X-Axis Header */}
                      <div className="sticky top-0 z-20 flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 h-8 shadow-sm">
                        <div className="w-48 shrink-0 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-30 flex items-center px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Market - Channel</div>
                        <div className="flex-1 relative min-w-[800px]">
                          {timelineData.ticks.map((tick: number) => {
                            const date = new Date(tick); const isNewDay = date.getHours() === 0;
                            const leftPct = ((tick - timelineData.minTs) / timelineData.totalSpan) * 100;
                            if (leftPct < 0 || leftPct > 100) return null;
                            return (
                              <div key={tick} className={`absolute top-0 bottom-0 border-l px-1.5 flex items-center ${isNewDay ? 'border-slate-300 dark:border-slate-500 bg-slate-100/50 dark:bg-slate-800/50' : 'border-slate-200 dark:border-slate-700'}`} style={{ left: `${leftPct}%` }}>
                                <span className={`text-[9px] font-bold ${isNewDay ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{isNewDay ? `${date.getDate()} ${date.toLocaleString('default', {month:'short'})}` : `${date.getHours().toString().padStart(2,'0')}:00`}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {/* Gantt Rows */}
                      <div className="flex flex-col relative min-w-full">
                        <div className="absolute inset-0 z-0 flex pl-48">
                          <div className="relative flex-1 min-w-[800px]">
                            {timelineData.ticks.map((tick: number) => {
                              const isNewDay = new Date(tick).getHours() === 0;
                              const leftPct = ((tick - timelineData.minTs) / timelineData.totalSpan) * 100;
                              if (leftPct < 0 || leftPct > 100) return null;
                              return <div key={tick} className={`absolute top-0 bottom-0 border-l ${isNewDay ? 'border-slate-300 dark:border-slate-600 z-10' : 'border-slate-200/50 dark:border-slate-800/50'}`} style={{ left: `${leftPct}%` }} />
                            })}
                          </div>
                        </div>
                        {timelineData.sortedKeys.map((channelLabel: string) => (
                          <div key={channelLabel} className="flex relative z-10 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 h-10 group transition-colors">
                            <div className="w-48 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 sticky left-0 z-20 flex items-center px-3 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 transition-colors">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title={channelLabel}>{channelLabel}</span>
                            </div>
                            <div className="flex-1 relative min-w-[800px]">
                              {timelineData.grouped[channelLabel].map((ev: any, idx: number) => {
                                const leftPct = ((ev.startTs - timelineData.minTs) / timelineData.totalSpan) * 100;
                                const widthPct = (ev.duration / timelineData.totalSpan) * 100;
                                const colors = getTimelineColor(ev.Competition || "");
                                
                                return (
                                  <div key={idx} className={`absolute top-1.5 bottom-1.5 rounded shadow-sm border ${colors.bg} ${colors.border} ${colors.text} flex items-center justify-center overflow-hidden cursor-pointer hover:brightness-110 transition-all px-1`} style={{ left: `${Math.max(0, leftPct)}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }} title={`${ev.Competition}\nType: ${ev["Type of program"]}\nStart: ${new Date(ev.startTs).toLocaleString()}\nEnd: ${new Date(ev.endTs).toLocaleString()}`}>
                                    {widthPct > 4 && <span className="text-[8px] font-bold truncate drop-shadow-md">{ev.Competition}</span>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-3">
                    <Clock size={32} className="opacity-20" />
                    <p className="text-xs">No Timeline data found. Ensure events are marked &apos;Live&apos;.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// --- SHARED COMPONENTS ---
const SearchableList = ({ label, icon, options, selected, onChange }: any) => {
  const [q, setQ] = useState("");
  const filtered = options.filter((o: string) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between items-center group">
        <span className="flex items-center gap-2">{icon} {label}</span>
        {selected.length > 0 && <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => onChange([])}>Clear ({selected.length})</span>}
      </label>
      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-inner">
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2 top-2 text-slate-400"/>
          <input type="text" placeholder={`Search ${label}...`} className="w-full text-[10px] pl-7 pr-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all placeholder:text-slate-400" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {filtered.length > 0 ? filtered.map((o: string) => (
            <label key={o} className="flex items-center gap-2 text-[10px] hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer p-1.5 group transition-colors">
              <input type="checkbox" className="rounded border-slate-300 dark:border-slate-500 text-blue-600 w-3 h-3 cursor-pointer focus:ring-0 bg-white dark:bg-slate-800" checked={selected.includes(o)} onChange={(e) => e.target.checked ? onChange([...selected, o]) : onChange(selected.filter((x: any) => x !== o))} />
              <span className="truncate text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 select-none" title={o}>{o}</span>
            </label>
          )) : <div className="text-[9px] text-slate-400 text-center py-2 italic">No matches found</div>}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color }: { label: string, value: number, color: string }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 border-l-4 shadow-sm`} style={{ borderLeftColor: color }}>
      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black mt-0.5" style={{ color: color }}>{value}</p>
    </div>
  );
};

const SortableHeader = ({ label, sortKey, currentSort, onSort }: any) => (
  <th className="p-3 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none group bg-slate-50 dark:bg-slate-800" onClick={() => onSort(sortKey)}>
    <div className="flex items-center gap-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">
      {label} <ArrowUpDown size={10} className={`text-slate-400 ${currentSort?.key === sortKey ? 'text-blue-500 opacity-100' : 'opacity-0 group-hover:opacity-50'} transition-all`} />
    </div>
  </th>
);

export default EarlyWarningPage;