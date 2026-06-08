"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
// ✅ IMPORT SHEETJS NATIVELY FOR TOTAL CLIENT-SIDE Spreadsheet EXPORTS
import * as XLSX from "xlsx";
import { 
  XCircle,      
  CheckCircle2,   
  FileSpreadsheet, 
  RefreshCw, 
  Activity, 
  Layers, 
  AlertCircle,
  FolderGit2,
  Target,
  Clock,
  Filter,
  RotateCcw,
  Calendar as CalendarIcon,
  Check,
  Search,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  UploadCloud
} from "lucide-react";

// --- STRUCTURAL INTERFACES ---
interface FileMetadata {
  bsa_view: any[];
  rosco_view: any[];
  mandatory_audit: { Channel: string; Found: string; Status: string }[];
  aura_audit: { Channel: string; Found: string; Status: string }[];
  date_columns: string[];
}

interface DashboardState {
  status: "LOADING" | "ONLINE" | "ERROR" | "LIMIT_EXCEEDED";
  fileName: string;
  extractedFileDate: string;
  driveId: string;
  dateRange: string;
  errorMessage: string;
  responseTimeMs: number;
  rawBsaRows: any[];
  rawDateColumns: string[];
  rawMandatoryAudit: any[];
  rawAuraAudit: any[];
}

interface MetaStatusItem {
  id: string;
  label: string;
}

interface RoscoMeta {
  projectTitle: string;
  startDate: string;
  endDate: string;
  sportsBlocks: string[];
}

// =========================================================================
// ⚡️ PERFORMANCE ISOLATION COMPONENTS (Eliminates Re-render Lag)
// =========================================================================

// 1. Isolated Calendar Component
const ModernCalendar = ({ selectedValue, onSelect, initialDate }: { selectedValue: Date | undefined, onSelect: (d: Date) => void, initialDate: Date }) => {
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); 
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = Array.from({ length: firstDayIndex }, () => null);
  for (let day = 1; day <= totalDaysInMonth; day++) calendarDays.push(day);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } 
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } 
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="p-4 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="font-sans font-black text-sm text-slate-800 dark:text-slate-100">{monthNames[viewMonth]} {viewYear}</span>
        <div className="flex space-x-1">
          <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 active:scale-95"><ChevronLeft size={16} /></button>
          <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 active:scale-95"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-black text-slate-400 uppercase mb-2">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.map((dayNum, cellIdx) => {
          if (dayNum === null) return <div key={`empty-${cellIdx}`} className="w-8 h-8" />;
          const isSelected = selectedValue?.getDate() === dayNum && selectedValue?.getMonth() === viewMonth && selectedValue?.getFullYear() === viewYear;
          return (
            <button
              key={`day-${dayNum}`} type="button" onClick={(e) => { e.stopPropagation(); onSelect(new Date(viewYear, viewMonth, dayNum)); }}
              className={`w-8 h-8 text-xs rounded-xl font-bold flex items-center justify-center transition-all duration-300 active:scale-90 ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 2. Isolated Timeline Slicer (Upgraded with Default Latest Day HUD)
const TimelineSlicer = ({ data, title, icon, colorTheme }: { data: any[], title: string, icon: React.ReactNode, colorTheme: string }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  if (!data || data.length === 0) return (
    <div className="w-full bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 space-y-4 shadow-sm">
      <p className="text-center py-4 font-mono text-slate-400 dark:text-slate-500 italic">Timeline columns must be active to model charts onto landscape rails</p>
    </div>
  );

  // ✅ FIX: Reverse data once for efficiency, and default to the latest date (index 0) if nothing is hovered
  const reversedData = [...data].reverse();
  const activeDay = hoveredIdx !== null ? reversedData[hoveredIdx] : reversedData[0];

  return (
    <div className="w-full bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 space-y-4 shadow-sm animate-in fade-in duration-500 ease-out">
      <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className={`text-${colorTheme}-500`}>{icon}</div>
        <h2 className="text-xs font-black uppercase tracking-wider font-mono">{title}</h2>
      </div>
      
      <div className="space-y-4 font-sans text-xs select-none">
        <div className="w-full pt-2 pb-2 flex gap-1.5 overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {reversedData.map((day, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div 
                key={idx} 
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex flex-col items-center shrink-0 w-[60px] bg-slate-50/50 dark:bg-slate-900/20 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/40 relative cursor-pointer transition-all duration-300 ease-out hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm will-change-transform"
                style={{ transform: isHovered ? "translateY(-4px)" : "translateY(0px)" }}
              >
                <div className="w-4 h-36 rounded-md overflow-hidden flex flex-col-reverse bg-slate-200 dark:bg-slate-800 border border-slate-300/30 transition-all duration-300">
                  <div style={{ height: `${day.okPct}%` }} className={`bg-emerald-500 w-full transition-opacity duration-300 ${hoveredIdx !== null && !isHovered ? "opacity-60" : "opacity-100"}`} />
                  <div style={{ height: `${day.noSchedPct}%` }} className={`bg-amber-500 w-full transition-opacity duration-300 ${hoveredIdx !== null && !isHovered ? "opacity-60" : "opacity-100"}`} />
                  <div style={{ height: `${day.gapsPct}%` }} className={`bg-rose-500 w-full transition-opacity duration-300 ${hoveredIdx !== null && !isHovered ? "opacity-60" : "opacity-100"}`} />
                </div>

                <span className={`text-[9px] font-mono font-black mt-2 tracking-tight text-center leading-tight whitespace-nowrap transition-colors duration-300 ${isHovered ? `text-${colorTheme}-500 dark:text-${colorTheme}-400` : "text-slate-500 dark:text-slate-400"}`}>
                  {(() => {
                    const parts = day.dateLabel.split("-");
                    if (parts.length !== 3) return day.dateLabel;
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return `${parts[0]} ${months[parseInt(parts[1]) - 1] || parts[1]}`;
                  })()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="w-full flex items-center justify-center gap-x-6 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px] min-h-[44px] flex-wrap gap-y-2 select-none">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm shrink-0 transition-transform duration-300" style={{ transform: hoveredIdx !== null ? "scale(1.15)" : "scale(1)" }} />
            <span className="font-sans font-bold text-slate-500 dark:text-slate-400">Scheduled OK</span>
            <span className="font-sans font-bold text-slate-800 dark:text-slate-200">
              : {activeDay ? activeDay.rawCounts.ok : 0} ({activeDay ? Math.round(activeDay.okPct) : 0}%)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-sm shrink-0 transition-transform duration-300" style={{ transform: hoveredIdx !== null ? "scale(1.15)" : "scale(1)" }} />
            <span className="font-sans font-bold text-slate-500 dark:text-slate-400">No Schedule</span>
            <span className="font-sans font-bold text-slate-800 dark:text-slate-200 min-w-[60px] transition-all duration-200">
              : {activeDay ? activeDay.rawCounts.noSched : 0} ({activeDay ? Math.round(activeDay.noSchedPct) : 0}%)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-rose-500 rounded-sm shrink-0 transition-transform duration-300" style={{ transform: hoveredIdx !== null ? "scale(1.15)" : "scale(1)" }} />
            <span className="font-sans font-bold text-slate-500 dark:text-slate-400">Processing Gaps</span>
            <span className="font-sans font-bold text-slate-800 dark:text-slate-200 min-w-[60px] transition-all duration-200">
              : {activeDay ? activeDay.rawCounts.gaps : 0} ({activeDay ? Math.round(activeDay.gapsPct) : 0}%)
            </span>
          </div>

          <div className="hidden sm:block h-4 w-[2px] bg-slate-200 dark:bg-slate-800 mx-2 self-center shrink-0 transition-colors duration-300" />

          <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 justify-center">
            <span>Selected Date Stats:</span>
            <span className={`text-${colorTheme}-500 dark:text-${colorTheme}-400 font-sans font-black tracking-wide inline-block transition-all duration-300 transform min-w-[95px]`}>
              {(() => {
                if (!activeDay) return "—";
                const parts = activeDay.dateLabel.split("-");
                if (parts.length !== 3) return activeDay.dateLabel;
                const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                const dayNum = parts[0];
                const mIdx = parseInt(parts[1]) - 1;
                const mName = months[mIdx] || parts[1];
                const fullYear = parts[2];
                return `${dayNum} ${mName}, ${fullYear}`;
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 🚀 DATA COMPLIANCE & SANITIZATION UTILITIES
// =========================================================================
const sanitizeExportContent = (val: any) => {
  if (typeof val !== 'string') return val;
  // Rule 10: Automated Character Purging for Malicious Formula Injection Defense
  return val.replace(/^=/, ''); 
};

// =========================================================================
// 🚀 MAIN DASHBOARD COMPONENT
// =========================================================================

export default function EarlyWarningStatusPage() {
  const [dataState, setDataState] = useState<DashboardState>({
    status: "LOADING", fileName: "", extractedFileDate: "Pending Sync", driveId: "", dateRange: "", errorMessage: "", responseTimeMs: 0, rawBsaRows: [], rawDateColumns: [], rawMandatoryAudit: [], rawAuraAudit: []
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingRosco, setIsExportingRosco] = useState(false);
  const [isExportingMandatory, setIsExportingMandatory] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(true);
  
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const [marketSearch, setMarketSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [statusSearch, setStatusSearch] = useState("");

  const [sortColumn, setSortColumn] = useState<string>("tvChannel"); 
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("ASC");
  const [auditSortColumn, setAuditSortColumn] = useState<"channel" | "found" | "status">("channel");
  const [auditSortDirection, setAuditSortDirection] = useState<"ASC" | "DESC">("ASC");
  const [auraSortColumn, setAuraSortColumn] = useState<"channel" | "found" | "status">("channel");
  const [auraSortDirection, setAuraSortDirection] = useState<"ASC" | "DESC">("ASC");
  const [roscoSortColumn, setRoscoSortColumn] = useState<string>("index");
  const [roscoSortDirection, setRoscoSortDirection] = useState<"ASC" | "DESC">("ASC");
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [mandatoryCurrentPage, setMandatoryCurrentPage] = useState<number>(1);
  const [roscoCurrentPage, setRoscoCurrentPage] = useState<number>(1);
  const rowsPerPage = 10;

  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");
  const [auraSearchQuery, setAuraSearchQuery] = useState<string>("");
  
  const [roscoMetadata, setRoscoMetadata] = useState<RoscoMeta | null>(null);
  const [dateDisclaimer, setDateDisclaimer] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconciledRoscoRows, setReconciledRoscoRows] = useState<any[]>([]);
  const [roscoSearchQuery, setRoscoSearchQuery] = useState<string>("");

  const startCalRef = useRef<HTMLDivElement>(null);
  const endCalRef = useRef<HTMLDivElement>(null);
  const marketRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // --- Targeted Filter States for ROSCO Workspace Matrix ---
  const [roscoSelectedMarkets, setRoscoSelectedMarkets] = useState<string[]>([]);
  const [roscoSelectedChannels, setRoscoSelectedChannels] = useState<string[]>([]);
  const [roscoSelectedStatuses, setRoscoSelectedStatuses] = useState<string[]>([]);
  
  const [roscoStartDate, setRoscoStartDate] = useState<Date | undefined>(undefined);
  const [roscoEndDate, setRoscoEndDate] = useState<Date | undefined>(undefined);

  const [roscoMarketOpen, setRoscoMarketOpen] = useState(false);
  const [roscoChannelOpen, setRoscoChannelOpen] = useState(false);
  const [roscoStatusOpen, setRoscoStatusOpen] = useState(false);
  const [roscoStartCalOpen, setRoscoStartCalOpen] = useState(false);
  const [roscoEndCalOpen, setRoscoEndCalOpen] = useState(false);
  
  const [roscoChannelSearch, setRoscoChannelSearch] = useState("");
  
  const roscoMarketRef = useRef<HTMLDivElement>(null);
  const roscoChannelRef = useRef<HTMLDivElement>(null);
  const roscoStatusRef = useRef<HTMLDivElement>(null);
  const roscoStartCalRef = useRef<HTMLDivElement>(null);
  const roscoEndCalRef = useRef<HTMLDivElement>(null);

  // Sync dates when global dates update after a file upload
  useEffect(() => {
    if (startDate && !roscoStartDate) setRoscoStartDate(startDate);
    if (endDate && !roscoEndDate) setRoscoEndDate(endDate);
  }, [startDate, endDate]);

  const handleResetFilters = useCallback(() => {
    if (dataState.rawDateColumns.length > 0) {
      const parseRawParts = (dStr: string) => {
        const p = dStr.split("-");
        return p.length === 3 ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])) : new Date();
      };
      const initialEnd = parseRawParts(dataState.rawDateColumns[dataState.rawDateColumns.length - 1]);
      // Rule 4: Critical Operational Rule - Re-apply 30-Day Lookback Filter Base
      const initialStart = new Date(initialEnd);
      initialStart.setDate(initialEnd.getDate() - 30); 

      setStartDate(initialStart);
      setEndDate(initialEnd);
    }
    setFilterCriticalOnly(true); 
    setSelectedMarkets([]); setSelectedChannels([]); setSelectedStatuses([]);
    setMarketSearch(""); setChannelSearch(""); setStatusSearch("");
    setSortColumn("tvChannel"); setSortDirection("ASC");
    setCurrentPage(1);
  }, [dataState.rawDateColumns]);

  const formattedLabelDate = (dateObj: Date | undefined) => dateObj ? dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Select Date";

  const handleToggleSelection = useCallback((item: string, state: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(state.includes(item) ? state.filter(x => x !== item) : [...state, item]);
    setCurrentPage(1);
  }, []);

  const handleSortTrigger = (columnKey: string) => {
    setSortDirection(prev => sortColumn === columnKey && prev === "ASC" ? "DESC" : "ASC");
    if (sortColumn !== columnKey) setSortColumn(columnKey);
    setCurrentPage(1);
  };

  const handleAuditSortTrigger = (columnKey: "channel" | "found" | "status") => {
    setAuditSortDirection(prev => auditSortColumn === columnKey && prev === "ASC" ? "DESC" : "ASC");
    if (auditSortColumn !== columnKey) setAuditSortColumn(columnKey);
    setMandatoryCurrentPage(1);
  };

  const handleAuraSortTrigger = (columnKey: "channel" | "found" | "status") => {
    setAuraSortDirection(prev => auraSortColumn === columnKey && prev === "ASC" ? "DESC" : "ASC");
    if (auraSortColumn !== columnKey) setAuraSortColumn(columnKey);
  };

  const handleRoscoSortTrigger = (columnKey: string) => {
    setRoscoSortDirection(prev => roscoSortColumn === columnKey && prev === "ASC" ? "DESC" : "ASC");
    if (roscoSortColumn !== columnKey) setRoscoSortColumn(columnKey);
    setRoscoCurrentPage(1);
  };

  const renderSortIndicatorIcons = (activeCol: string, targetCol: string, dir: "ASC" | "DESC") => {
    if (activeCol !== targetCol) return <ArrowUpDown size={12} className="text-slate-300 dark:text-slate-600 opacity-50 ml-1.5 shrink-0" />;
    return dir === "ASC" ? <ArrowUp size={12} className="text-indigo-500 ml-1.5 shrink-0 font-black animate-in slide-in-from-bottom-1" /> : <ArrowDown size={12} className="text-indigo-500 ml-1.5 shrink-0 font-black animate-in slide-in-from-top-1" />;
  };

  const handleExportToGoogleSheets = () => {
    if (!processedDataDeck?.tableRows?.length) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        const exportRows = processedDataDeck.tableRows.map((row: any, index: number) => {
          const baseCells: Record<string, any> = { 
            "SR NO": String(index + 1).padStart(2, "0"), 
            "TV Channel": sanitizeExportContent(row.tvChannel || "—"), 
            "Market": sanitizeExportContent(row.market || "—"), 
            "Pay/Free": sanitizeExportContent(row.payType || "—"), 
            "Status": sanitizeExportContent(row.status || "—") 
          };
          processedDataDeck.activeSortedDates.forEach((dateKey: string) => { 
            baseCells[dateKey] = sanitizeExportContent(row.rawRowData?.[dateKey] || row.rawRowData?.[dateKey.toLowerCase()] || "—"); 
          });
          return baseCells;
        });
        const workSheet = XLSX.utils.json_to_sheet(exportRows);
        
        // Rule 9: Default Structural Configuration Auto-filters
        if (workSheet['!ref']) workSheet['!autofilter'] = { ref: workSheet['!ref'] };

        const workBook = XLSX.utils.book_new();
        // Rule 9: Target sheet identification name labeled 'Matched'
        XLSX.utils.book_append_sheet(workBook, workSheet, "Matched");
        XLSX.writeFile(workBook, `Master_Feed_Audit_Metrics_${new Date().toISOString().split('T')[0]}.xlsx`);
      } finally { setIsExporting(false); }
    }, 300);
  };

  const handleExportMandatoryChecklist = () => {
    if (!processedAuditTableDeckRows.length) return;
    setIsExportingMandatory(true);
    setTimeout(() => {
      try {
        const exportRows = processedAuditTableDeckRows.map((row: any, idx: number) => ({ 
          "INDEX": idx + 1, 
          "MANDATORY TV CHANNEL": sanitizeExportContent(row.channelLabelName || "—"), 
          "FOUND IN BSA": sanitizeExportContent(row.foundInBsaFlag || "—"), 
          "Status": sanitizeExportContent(row.handshakeStatusLabel || "—") 
        }));
        const workSheet = XLSX.utils.json_to_sheet(exportRows);
        if (workSheet['!ref']) workSheet['!autofilter'] = { ref: workSheet['!ref'] };

        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Matched");
        XLSX.writeFile(workBook, `Mandatory_Checklist_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      } finally { setIsExportingMandatory(false); }
    }, 300);
  };

  const handleExportRoscoWorkspaceSummary = () => {
    if (!sortedRoscoGridMatrix.length) return;
    setIsExportingRosco(true);
    setTimeout(() => {
      try {
        const exportRows = sortedRoscoGridMatrix.map((row: any) => {
          const matchedBsaRow = dataState.rawBsaRows.find(b => String(b["TV Channel"] || b["tv channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
          const isFoundInBsa = matchedBsaRow !== undefined;
          const isFoundInAura = row.is_in_aura === "YES";
          let finalStatusLabel = isFoundInBsa && !isFoundInAura ? "Partial Schedule" : (!isFoundInBsa && isFoundInAura ? "Found in AURA" : (!isFoundInBsa && !isFoundInAura ? "Missing in Both" : "Scheduled OK"));
          if (matchedBsaRow) {
            const matchedStatusKey = matchedBsaRow["Final Status"] || matchedBsaRow["final status"] || "OK";
            if (String(matchedStatusKey).toUpperCase().includes("GAPS")) finalStatusLabel = "Processing Gaps";
            else if (String(matchedStatusKey).toUpperCase().includes("NO SCHEDULE")) finalStatusLabel = "No Schedule";
            else if (String(matchedStatusKey).toUpperCase().includes("PARTIAL")) finalStatusLabel = "Partial Schedule";
          }
          const baseCells: Record<string, any> = { 
            "INDEX": row.index, 
            "ROSCO TV CHANNEL": sanitizeExportContent(row.rosco_name || "—"), 
            "CHANNEL COUNTRY": sanitizeExportContent(row.country || "—"), 
            "FOUND IN BSA FILE": isFoundInBsa ? "YES" : "NO", 
            "FOUND IN AURA MASTER": isFoundInAura ? "YES" : "NO", 
            "FINAL ALIGNMENT STATUS": sanitizeExportContent(finalStatusLabel) 
          };
          [...dataState.rawDateColumns].reverse().forEach((dateKey: string) => { 
            baseCells[dateKey] = sanitizeExportContent((!isFoundInBsa && !isFoundInAura) ? "-" : (matchedBsaRow ? (matchedBsaRow[dateKey] || "-") : "No Schedule")); 
          });
          return baseCells;
        });
        const workSheet = XLSX.utils.json_to_sheet(exportRows);
        if (workSheet['!ref']) workSheet['!autofilter'] = { ref: workSheet['!ref'] };

        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Matched");
        XLSX.writeFile(workBook, `Project_Scope_Reconciliation_${new Date().toISOString().split('T')[0]}.xlsx`);
      } finally { setIsExportingRosco(false); }
    }, 300);
  };

  const handleTriggerEmailComposition = () => {
    if (!processedDataDeck?.tableRows?.length) return;
    const emailTo = "sportsautomation-ops@nielsen.com";
    const emailCc = "localadmin@nielsen.com";
    const subjectStamp = `BSA Early Warning Audit Report - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const emailBodyLines = [
      `Hi Team,\n\nThe filtered Early Warning Broadcast Schedule Audit (BSA) data grid matrix has been compiled and is ready for downstream manual enrichment processing.\n`,
      `--- AUDIT STATE SNAPSHOT ---`,
      `• Extracted Baseline File: ${dataState.fileName}`,
      `• Selected Target Window: ${startDate ? startDate.toISOString().split('T')[0] : "—"} to ${endDate ? endDate.toISOString().split('T')[0] : "—"}`,
      `• Total Filtered Channels Tracked: ${processedDataDeck.total}`,
      `  └─ Processing Gaps: ${processedDataDeck.gaps}\n  └─ Partial Schedules: ${processedDataDeck.partial}\n  └─ Scheduled OK: ${processedDataDeck.ok}\n-----------------------------\n`,
      `👉 ACTION REQUIRED: Please attach the downloaded report file before sending.\n\nBest Regards,\nBSA Automation Node Portal`
    ];
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emailTo}&cc=${encodeURIComponent(emailCc)}&su=${encodeURIComponent(subjectStamp)}&body=${encodeURIComponent(emailBodyLines.join("\n"))}`, "_blank");
  };
  
  const handleRoscoDocumentIngestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReconciling(true); 
    setDateDisclaimer(null); 
    setRoscoMetadata(null); 
    setReconciledRoscoRows([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        // Reverted to "binary" to ensure compatibility with your specific SheetJS version
        const workbook = XLSX.read(evt.target?.result, { type: "binary" });
        
        let generalSheetKey = "", monitoringSheetKey = "";
        workbook.SheetNames.forEach((sheetName) => {
          const csvText = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]).toLowerCase();
          if (csvText.includes("monitoring periods") || csvText.includes("monitored event data")) generalSheetKey = sheetName;
          else if (csvText.includes("channelcountry") || csvText.includes("channelname")) monitoringSheetKey = sheetName;
        });

        if (!generalSheetKey || !monitoringSheetKey) { 
          alert("❌ Invalid ROSCO Format. Could not locate monitoring sheets."); 
          setIsReconciling(false); 
          return; 
        }

        const genJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[generalSheetKey], { header: 1 });
        let extractedStart: Date | null = null, extractedEnd: Date | null = null;
        let projectTitle = "Standard Project Operations";
        let capturedSports: string[] = [];

        genJson.forEach((row: any) => {
          const rowKey = String(row[0] || "").trim().toLowerCase(), rowVal = String(row[1] || "").trim();
          if (rowKey.includes("monitoring periods:")) {
            const rangeMatch = rowVal.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
            if (rangeMatch) { 
              extractedStart = new Date(rangeMatch[1]); 
              extractedEnd = new Date(rangeMatch[2]); 
            }
          }
          if (rowKey.includes("additional information")) projectTitle = rowVal;
          if (rowKey.includes("sports:") && !capturedSports.includes(rowVal)) capturedSports.push(rowVal);
        });

        if (extractedStart && extractedEnd) {
          setStartDate(extractedStart); 
          setEndDate(extractedEnd);
          setRoscoMetadata({ 
            projectTitle, 
            startDate: (extractedStart as Date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), 
            endDate: (extractedEnd as Date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), 
            sportsBlocks: capturedSports 
          });
          if ((extractedStart as Date) < new Date("2026-01-01")) {
            setDateDisclaimer(`⚠️ Partial Project Coverage Disclaimer: Historical monitoring period data is not contained within active archive tables.`);
          }
        }

        const preparedChannels = XLSX.utils.sheet_to_json(workbook.Sheets[monitoringSheetKey])
          .map((row: any) => ({ 
            name: String(row.ChannelName || "").trim(), 
            country: String(row.ChannelCountry || "").trim() 
          }))
          .filter(c => c.name !== "");
        
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const response = await fetch(`${API_BASE}/qc/early-warning/reconcile-rosco`, { 
          method: "POST", 
          headers: { 
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json"
          }, 
          body: JSON.stringify({ channels: preparedChannels }) 
        });

        // Enhanced error handling to expose backend issues (like 422 or CORS)
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned ${response.status}: ${response.statusText}`);
        }

        const outcome = await response.json();
        if (outcome.reconciled_matrix) {
          setReconciledRoscoRows(outcome.reconciled_matrix);
        }

      } catch (err: any) { 
        console.error("Ingest error:", err); 
        // This will now print the EXACT reason it failed in the alert box
        alert(`❌ Failed to process ROSCO file.\n\nReason: ${err.message}`);
      } finally { 
        setIsReconciling(false); 
        if (e.target) e.target.value = ''; // Resets input so you can re-upload the same file to test
      }
    };
    
    // Reverted back to BinaryString to match your original file setup
    reader.readAsBinaryString(file);
  };

  const handleClearRoscoWorkspace = () => { setRoscoMetadata(null); setDateDisclaimer(null); setReconciledRoscoRows([]); };

  const fetchCloudSyncStatus = async () => {
    setIsRefreshing(true);
    const startTime = performance.now();
    try {
      // Rule 3: Enforcing Standard AJAX Contextual Signatures
      // Rule 3: Enforcing Standard AJAX Contextual Signatures
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/qc/early-warning/status`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error code: ${response.status}`);
      }

      const payload = await response.json();
      const endTime = performance.now();
      const elapsedMs = Math.round(endTime - startTime);

      if (payload.status === "ONLINE" && payload.cached_analysis) {
        const analysis: FileMetadata = payload.cached_analysis;
        const bsaRows = analysis.bsa_view || [];

        // Rule 10: Hard Row Protection Boundary Checks
        if (bsaRows.length > 200000) {
          setDataState(prev => ({ ...prev, status: "LIMIT_EXCEEDED", errorMessage: "Data compilation constraint overridden. Stack extraction aborted (Exceeds 200,000 bounds)." }));
          setIsRefreshing(false);
          return;
        }

        const mandatoryAudit = analysis.mandatory_audit || [];
        const auraAudit = (analysis as any).aura_audit || [];

        const structuralBlacklist = ["channel id", "channel_id", "pay-free tv", "pay/free tv", "cmat_id", "critical channel", "final status", "tv channel", "market"];
        const validDates = (analysis.date_columns || []).filter(dateStr => !structuralBlacklist.includes(dateStr.toLowerCase().trim())).sort((a, b) => {
          const parseDate = (d: string) => { const p = d.split("-"); return p.length === 3 ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime() : new Date(d).getTime(); };
          return parseDate(a) - parseDate(b);
        });

        if (validDates.length > 0) {
          // Rule 4: Critical Default 30-Day Window Applied Here based on max date index
          const resolvedEnd = (() => { const p = validDates[validDates.length - 1].split("-"); return p.length === 3 ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])) : new Date(); })();
          const computedLookbackStart = new Date(resolvedEnd); computedLookbackStart.setDate(resolvedEnd.getDate() - 30);
          if (!startDate) setStartDate(computedLookbackStart);
          if (!endDate) setEndDate(resolvedEnd);
        }

        const formattedRange = validDates.length > 0 ? `${validDates[0]} to ${validDates[validDates.length - 1]}` : "No dates localized";

        setDataState({
          status: "ONLINE", fileName: payload.last_refreshed_file || "Consolidated_BSA_Report.xlsx", extractedFileDate: "01st Jun 2026", driveId: "1kXZ3J5OV97T9C5SJNCnU33J91vyepiux",
          dateRange: formattedRange, errorMessage: "", responseTimeMs: elapsedMs,
          rawBsaRows: bsaRows, rawDateColumns: validDates, rawMandatoryAudit: mandatoryAudit, rawAuraAudit: auraAudit
        });
      }
    } catch (error: any) { 
      setDataState(prev => ({ ...prev, status: "ERROR", errorMessage: error.message || "Internal Network Cluster Handshake Refused." })); 
    } finally { 
      setIsRefreshing(false); 
    }
  };

  useEffect(() => {
    fetchCloudSyncStatus();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (startCalOpen && startCalRef.current && !startCalRef.current.contains(target)) setStartCalOpen(false);
      if (endCalOpen && endCalRef.current && !endCalRef.current.contains(target)) setEndCalOpen(false);
      if (marketOpen && marketRef.current && !marketRef.current.contains(target)) setMarketOpen(false);
      if (channelOpen && channelRef.current && !channelRef.current.contains(target)) setChannelOpen(false);
      if (statusOpen && statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false);
      // ✅ ROSCO Listeners
      if (roscoStartCalOpen && roscoStartCalRef.current && !roscoStartCalRef.current.contains(target)) setRoscoStartCalOpen(false);
      if (roscoEndCalOpen && roscoEndCalRef.current && !roscoEndCalRef.current.contains(target)) setRoscoEndCalOpen(false);
      if (roscoMarketOpen && roscoMarketRef.current && !roscoMarketRef.current.contains(target)) setRoscoMarketOpen(false);
      if (roscoChannelOpen && roscoChannelRef.current && !roscoChannelRef.current.contains(target)) setRoscoChannelOpen(false);
      if (roscoStatusOpen && roscoStatusRef.current && !roscoStatusRef.current.contains(target)) setRoscoStatusOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [startCalOpen, endCalOpen, marketOpen, channelOpen, statusOpen, roscoMarketOpen, roscoChannelOpen, roscoStatusOpen, roscoStartCalOpen, roscoEndCalOpen]);

  // =========================================================================
  // 🧠 HIGH-PERFORMANCE MEMOIZED REDUCERS
  // =========================================================================

  const metaLists = useMemo(() => {
    const marketSet = new Set<string>(), channelSet = new Set<string>();
    dataState.rawBsaRows.forEach((row: any) => {
      const rowMarket = String(row["Market"] || row["market"] || "-").trim();
      const rowChannelName = String(row["TV Channel"] || row["tv channel"] || "").trim();
      if (rowMarket && rowMarket !== "-") marketSet.add(rowMarket);
      if (rowChannelName) channelSet.add(rowChannelName);
    });
    return { markets: Array.from(marketSet).sort(), channels: Array.from(channelSet).sort(), statuses: [{ id: "GAPS", label: "Processing Gaps" }, { id: "PARTIAL", label: "Partial Schedule" }, { id: "NOSCHED", label: "No Schedule" }, { id: "OK", label: "Scheduled OK" }] };
  }, [dataState.rawBsaRows]);

  const filteredMarketsList = useMemo(() => metaLists.markets.filter(m => m.toLowerCase().includes(marketSearch.toLowerCase())), [metaLists.markets, marketSearch]);
  const filteredChannelsList = useMemo(() => metaLists.channels.filter(c => c.toLowerCase().includes(channelSearch.toLowerCase())), [metaLists.channels, channelSearch]);
  const filteredStatusesList = useMemo(() => metaLists.statuses.filter(s => s.label.toLowerCase().includes(statusSearch.toLowerCase())), [metaLists.statuses, statusSearch]);

  const processedDataDeck = useMemo(() => {
    if (!dataState.rawBsaRows.length) return { total: 0, gaps: 0, partial: 0, noSched: 0, ok: 0, tableRows: [], activeSortedDates: [], activeRowChannelKeys: new Set<string>() };

    const selectedDateKeys = dataState.rawDateColumns.filter(dateStr => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return false;
      const targetTime = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      return targetTime >= (startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0) && targetTime <= (endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity);
    });

    const reverseChronologicalDates = [...selectedDateKeys].reverse();
    const strictMandatorySet = new Set(dataState.rawMandatoryAudit.map((m: any) => String(m.Channel || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "")));

    let gapsCount = 0, partialCount = 0, noSchedCount = 0, okCount = 0;
    const filteredMatrixRows = dataState.rawBsaRows.reduce((acc: any[], row: any) => {
      const rowMarket = String(row["Market"] || row["market"] || "-").trim();
      const rowChannelName = String(row["TV Channel"] || row["tv channel"] || "").trim();
      const isCritical = strictMandatorySet.has(rowChannelName.toLowerCase().replace(/[^a-z0-9]/g, "").trim());

      let hasScheduledDays = false, hasNoScheduleDays = false, hasProcessingGapDays = false, isFullyInactiveAcrossRange = true;
      selectedDateKeys.forEach(dateKey => {
        const cellVal = row[dateKey];
        if (cellVal === undefined || cellVal === null) return;
        const dayStatus = String(cellVal).trim().toLowerCase();
        if (!dayStatus.includes("inactive channel")) isFullyInactiveAcrossRange = false;
        if (dayStatus.includes("processing gaps") || dayStatus.includes("missing")) hasProcessingGapDays = true;
        else if (dayStatus.includes("no schedule") || dayStatus === "-" || dayStatus === "") hasNoScheduleDays = true;
        else if (dayStatus.includes("scheduled") || dayStatus.includes("ok")) hasScheduledDays = true;
      });

      if (!isFullyInactiveAcrossRange) {
        let assignedStatus = "OK", displayStatusLabel = "Scheduled OK";
        if (hasProcessingGapDays) { assignedStatus = "GAPS"; displayStatusLabel = "Processing Gaps"; } 
        else if (hasScheduledDays && hasNoScheduleDays) { assignedStatus = "PARTIAL"; displayStatusLabel = "Partial Schedule"; } 
        else if (hasNoScheduleDays) { assignedStatus = "NOSCHED"; displayStatusLabel = "No Schedule"; }

        if (filterCriticalOnly && !isCritical) return acc;
        if (selectedMarkets.length > 0 && !selectedMarkets.includes(rowMarket)) return acc;
        if (selectedChannels.length > 0 && !selectedChannels.includes(rowChannelName)) return acc;
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(assignedStatus)) return acc;

        if (assignedStatus === "GAPS") gapsCount++; else if (assignedStatus === "PARTIAL") partialCount++; else if (assignedStatus === "NOSCHED") noSchedCount++; else okCount++;
        acc.push({ tvChannel: rowChannelName, market: rowMarket, payType: String(row["Pay-Free TV"] || row["Pay/Free TV"] || row["payType"] || "-").trim() === "-" ? "FTA" : String(row["Pay-Free TV"] || row["Pay/Free TV"] || row["payType"] || "-").trim(), status: displayStatusLabel, statusKey: assignedStatus, rawRowData: row });
      }
      return acc;
    }, []);

    filteredMatrixRows.sort((alpha: any, beta: any) => {
      const valA = String(["tvChannel", "market", "payType", "status"].includes(sortColumn) ? alpha[sortColumn] : alpha.rawRowData[sortColumn] || "").toLowerCase();
      const valB = String(["tvChannel", "market", "payType", "status"].includes(sortColumn) ? beta[sortColumn] : beta.rawRowData[sortColumn] || "").toLowerCase();
      return sortDirection === "ASC" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return { total: filteredMatrixRows.length, gaps: gapsCount, partial: partialCount, noSched: noSchedCount, ok: okCount, tableRows: filteredMatrixRows, activeSortedDates: reverseChronologicalDates, activeRowChannelKeys: new Set(filteredMatrixRows.map((r:any) => r.tvChannel.toLowerCase().replace(/[^a-z0-9]/g, "").trim())) };
  }, [dataState.rawBsaRows, dataState.rawDateColumns, startDate, endDate, filterCriticalOnly, selectedMarkets, selectedChannels, selectedStatuses, sortColumn, sortDirection, dataState.rawMandatoryAudit]);

  const daywiseChronologicalMetricsDeck = useMemo(() => {
    return [...processedDataDeck.activeSortedDates].reverse().map(dateKey => {
      let gaps = 0, noSched = 0, ok = 0;
      processedDataDeck.tableRows.forEach((row: any) => {
        const statusText = String(row.rawRowData[dateKey]).trim().toLowerCase();
        if (statusText.includes("inactive channel") || statusText === "undefined") return;
        if (statusText.includes("processing gaps") || statusText.includes("missing")) gaps++;
        else if (statusText.includes("no schedule") || statusText === "-" || statusText === "") noSched++;
        else ok++;
      });
      const dayTotal = gaps + noSched + ok || 1;
      return { dateLabel: dateKey, gapsPct: (gaps / dayTotal) * 100, noSchedPct: (noSched / dayTotal) * 100, okPct: (ok / dayTotal) * 100, rawCounts: { gaps, noSched, ok } };
    });
  }, [processedDataDeck.activeSortedDates, processedDataDeck.tableRows]);
  
  // Rule 7: Preserved Architecture for Target Monitor
  const processedAuditTableDeckRows = useMemo(() => {
    return dataState.rawMandatoryAudit.map((auditRow: any) => {
      const isActiveNow = processedDataDeck.activeRowChannelKeys.has(String(auditRow.Channel || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim());
      return { channelLabelName: auditRow.Channel, foundInBsaFlag: isActiveNow ? "YES" : "NO", handshakeStatusLabel: isActiveNow ? "OK" : "INACTIVE" };
    }).filter(item => item.channelLabelName.toLowerCase().includes(auditSearchQuery.toLowerCase())).sort((alpha, beta) => {
      const comp = auditSortColumn === "channel" ? alpha.channelLabelName.localeCompare(beta.channelLabelName) : (auditSortColumn === "found" ? alpha.foundInBsaFlag.localeCompare(beta.foundInBsaFlag) : alpha.handshakeStatusLabel.localeCompare(beta.handshakeStatusLabel));
      return auditSortDirection === "ASC" ? comp : -comp;
    });
  }, [dataState.rawMandatoryAudit, processedDataDeck.activeRowChannelKeys, auditSearchQuery, auditSortColumn, auditSortDirection]);

  // AURA TABLE REDUCER
  const processedAuraTableDeckRows = useMemo(() => {
    return dataState.rawAuraAudit.map((auditRow: any) => {
      const isActiveNow = processedDataDeck.activeRowChannelKeys.has(String(auditRow.Channel || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim());
      return { channelLabelName: auditRow.Channel, foundInBsaFlag: auditRow.Found || (isActiveNow ? "YES" : "NO"), handshakeStatusLabel: auditRow.Status || (isActiveNow ? "OK" : "MISSING") };
    }).filter(item => item.channelLabelName.toLowerCase().includes(auraSearchQuery.toLowerCase())).sort((alpha, beta) => {
      const comp = auraSortColumn === "channel" ? alpha.channelLabelName.localeCompare(beta.channelLabelName) : (auraSortColumn === "found" ? alpha.foundInBsaFlag.localeCompare(beta.foundInBsaFlag) : alpha.handshakeStatusLabel.localeCompare(beta.handshakeStatusLabel));
      return auraSortDirection === "ASC" ? comp : -comp;
    });
  }, [dataState.rawAuraAudit, processedDataDeck.activeRowChannelKeys, auraSearchQuery, auraSortColumn, auraSortDirection]);

  // 1. Independent Date Slicer for ROSCO
  const roscoActiveSortedDates = useMemo(() => {
    const startLimit = roscoStartDate ? new Date(roscoStartDate).setHours(0, 0, 0, 0) : 0;
    const endLimit = roscoEndDate ? new Date(roscoEndDate).setHours(23, 59, 59, 999) : Infinity;
    const filtered = dataState.rawDateColumns.filter(dateStr => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return false;
      const targetTime = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      return targetTime >= startLimit && targetTime <= endLimit;
    });
    return [...filtered].reverse();
  }, [dataState.rawDateColumns, roscoStartDate, roscoEndDate]);

  // 2. Updated Rosco Matrix Reducer
  const sortedRoscoGridMatrix = useMemo(() => {
    let baseList = [...reconciledRoscoRows];
    
    if (roscoSearchQuery.trim() !== "") {
      baseList = baseList.filter(row => String(row.rosco_name || "").toLowerCase().includes(roscoSearchQuery.toLowerCase()) || String(row.country || "").toLowerCase().includes(roscoSearchQuery.toLowerCase()));
    }

    if (roscoSelectedMarkets.length > 0) {
      baseList = baseList.filter(row => roscoSelectedMarkets.includes(String(row.country || "")));
    }

    if (roscoSelectedChannels.length > 0) {
      baseList = baseList.filter(row => roscoSelectedChannels.includes(String(row.rosco_name || "")));
    }

    if (roscoSelectedStatuses.length > 0) {
      baseList = baseList.filter(row => {
        const matched = dataState.rawBsaRows.find(b => String(b["TV Channel"] || b["tv channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
        let code = "MISSING"; 
        if (matched) {
          const statusKey = String(matched["Final Status"] || matched["final status"] || "OK").toUpperCase();
          if (statusKey.includes("GAPS")) code = "GAPS";
          else if (statusKey.includes("NO SCHEDULE")) code = "NOSCHED";
          else if (statusKey.includes("PARTIAL")) code = "PARTIAL";
          else code = "OK";
        }
        return roscoSelectedStatuses.includes(code);
      });
    }

    return baseList.sort((alpha, beta) => {
      if (roscoSortColumn === "index") return roscoSortDirection === "ASC" ? alpha.index - beta.index : beta.index - alpha.index;
      const getVal = (row: any) => {
        if (roscoSortColumn === "rosco_name" || roscoSortColumn === "country" || roscoSortColumn === "is_in_aura") return String(row[roscoSortColumn] || "");
        const matched = dataState.rawBsaRows.find(b => String(b["TV Channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
        if (roscoSortColumn === "found_bsa") return matched ? "YES" : "NO";
        if (roscoSortColumn === "badge_code") return matched ? "Partial Schedule" : "Missing in Both"; 
        return String(matched ? matched[roscoSortColumn] : "-").toLowerCase();
      };
      const valA = getVal(alpha), valB = getVal(beta);
      return roscoSortDirection === "ASC" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [reconciledRoscoRows, roscoSearchQuery, roscoSortColumn, roscoSortDirection, dataState.rawBsaRows, roscoSelectedMarkets, roscoSelectedChannels, roscoSelectedStatuses]);

  // 3. Mini Quick-Stats Reducer
  const roscoKpis = useMemo(() => {
    let ok = 0, gaps = 0, partial = 0, noSched = 0, missing = 0;

    sortedRoscoGridMatrix.forEach((row: any) => {
      const matched = dataState.rawBsaRows.find(b => String(b["TV Channel"] || b["tv channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
      if (matched) {
        const statusKey = String(matched["Final Status"] || matched["final status"] || "OK").toUpperCase();
        if (statusKey.includes("GAPS")) gaps++;
        else if (statusKey.includes("NO SCHEDULE")) noSched++;
        else if (statusKey.includes("PARTIAL")) partial++;
        else ok++;
      } else {
        missing++; // Found in AURA or Missing in Both
      }
    });

    return { total: sortedRoscoGridMatrix.length, ok, gaps, partial, noSched, missing };
  }, [sortedRoscoGridMatrix, dataState.rawBsaRows]);

  // 4. Rosco Graph Reducer
  const roscoChronologicalMetricsDeck = useMemo(() => {
    if (sortedRoscoGridMatrix.length === 0) return [];
    const chronologicalDateKeys = [...roscoActiveSortedDates].reverse();

    return chronologicalDateKeys.map(dateKey => {
      let gaps = 0, noSched = 0, ok = 0;
      sortedRoscoGridMatrix.forEach((row: any) => {
        const matchedBsaRow = dataState.rawBsaRows.find(b => String(b["TV Channel"] || b["tv channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
        if (!matchedBsaRow) { noSched++; return; }
        const dayMetricValue = matchedBsaRow[dateKey] || "-";
        const lowDay = String(dayMetricValue).toLowerCase();

        if (lowDay.includes("gaps") || lowDay.includes("missing")) gaps++;
        else if (lowDay.includes("no schedule") || dayMetricValue === "-" || dayMetricValue === "") noSched++;
        else if (lowDay.includes("scheduled") || lowDay.includes("ok") || lowDay.includes("active")) ok++;
        else noSched++;
      });
      const dayTotal = gaps + noSched + ok || 1;
      return { 
        dateLabel: dateKey, 
        gapsPct: (gaps / dayTotal) * 100, 
        noSchedPct: (noSched / dayTotal) * 100, 
        okPct: (ok / dayTotal) * 100, 
        rawCounts: { gaps, noSched, ok } 
      };
    });
  }, [roscoActiveSortedDates, sortedRoscoGridMatrix, dataState.rawBsaRows]);
  // 👆 END PASTE 👆
  // PAGINATION MEMOIZATION - Strict Rule 5 applies 10 records per active view logic
  const paginatedRows = useMemo(() => processedDataDeck.tableRows.slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage), [processedDataDeck.tableRows, currentPage]);
  const totalPages = Math.ceil(processedDataDeck.tableRows.length / rowsPerPage) || 1;

  const paginatedMandatoryRows = useMemo(() => processedAuditTableDeckRows.slice((mandatoryCurrentPage - 1) * rowsPerPage, (mandatoryCurrentPage - 1) * rowsPerPage + rowsPerPage), [processedAuditTableDeckRows, mandatoryCurrentPage]);
  const mandatoryTotalPages = Math.ceil(processedAuditTableDeckRows.length / rowsPerPage) || 1;

  const paginatedRoscoRows = useMemo(() => sortedRoscoGridMatrix.slice((roscoCurrentPage - 1) * rowsPerPage, (roscoCurrentPage - 1) * rowsPerPage + rowsPerPage), [sortedRoscoGridMatrix, roscoCurrentPage]);
  const roscoTotalPages = Math.ceil(sortedRoscoGridMatrix.length / rowsPerPage) || 1;

  // =========================================================================
  // 🎨 RENDER LAYER (Tailwind + CSS Animations + Glassmorphism)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] p-4 lg:p-8 text-slate-900 dark:text-slate-100 transition-colors duration-500 flex flex-col justify-start items-center overflow-x-hidden font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-[1440px] flex flex-col space-y-6">
        
        {/* HEADER BLOCK */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 pb-2">
          <div className="flex items-center space-x-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-indigo-600 shadow-sm border border-slate-200/50 dark:border-slate-800"><Layers size={24} className="animate-pulse" style={{ animationDuration: '3s' }} /></div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">BSA EARLY WARNING DASHBOARD</h1>
              <p className="text-xs text-slate-500 font-mono font-semibold uppercase tracking-widest mt-1">BSA CHANNELS SCHEDULE TRACKER</p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-5 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 duration-500 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center space-x-3">
              <div className={`flex h-6 w-6 rounded-full items-center justify-center shrink-0 transition-colors duration-500 ${dataState.status === "ONLINE" ? "bg-emerald-500/10 text-emerald-600" : (dataState.status === "LIMIT_EXCEEDED" ? "bg-rose-500/10 text-rose-600" : "bg-slate-500/10 text-slate-600")}`}>
                {dataState.status === "ONLINE" ? <CheckCircle2 size={14} /> : (dataState.status === "LIMIT_EXCEEDED" ? <XCircle size={14} /> : <Activity size={14} />)}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">GSHEETS FEED NODE</span>
                  {dataState.status === "ONLINE" && <span className="bg-slate-100 dark:bg-slate-800 font-mono text-[9px] px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">{dataState.responseTimeMs}ms</span>}
                </div>
                <div className="text-sm font-black tracking-tight leading-none text-slate-800 dark:text-slate-200">
                  {dataState.status === "ONLINE" ? <p>Database Connected <span className="text-slate-400 dark:text-slate-500 font-medium font-sans ml-1 text-xs">Refreshed: {dataState.extractedFileDate}</span></p> : (dataState.status === "LIMIT_EXCEEDED" ? <p className="text-rose-600 dark:text-rose-400">Stack Bounds Overridden</p> : <p className="text-slate-500 dark:text-slate-400">Database Offline</p>)}
                </div>
              </div>
            </div>
            <button onClick={fetchCloudSyncStatus} disabled={isRefreshing} className="p-2 bg-slate-50 hover:bg-slate-100 active:scale-90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-xl border border-slate-200/60 dark:border-slate-700 transition-all duration-300 shadow-sm"><RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-500" : ""} /></button>
          </div>
        </div>

        {/* METRIC CARD BAR SYSTEM */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          {[
            { title: "Total Channels", value: processedDataDeck.total, bg: "bg-white dark:bg-slate-900", iconColor: "text-indigo-500", badgeBg: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300", icon: <Layers size={14} /> },
            { title: "Processing Gaps", value: processedDataDeck.gaps, bg: "bg-white dark:bg-slate-900", iconColor: "text-rose-500", badgeBg: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: <AlertCircle size={14} /> },
            { title: "Partial Schedule", value: processedDataDeck.partial, bg: "bg-white dark:bg-slate-900", iconColor: "text-blue-500", badgeBg: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300", icon: <Activity size={14} /> },
            { title: "No Schedule", value: processedDataDeck.noSched, bg: "bg-white dark:bg-slate-900", iconColor: "text-amber-500", badgeBg: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: <XCircle size={14} /> },
            { title: "Scheduled OK", value: processedDataDeck.ok, bg: "bg-white dark:bg-slate-900", iconColor: "text-emerald-500", badgeBg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: <CheckCircle2 size={14} /> },
          ].map((kpi, idx) => (
            <div key={idx} className={`group ${kpi.bg} border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-500 hover:shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8`} style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}>
              <div className={`absolute -right-4 -bottom-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-150 group-hover:rotate-12 ${kpi.iconColor}`}>
                {React.cloneElement(kpi.icon, { size: 80 } as any)}
              </div>
              <div className="space-y-3 relative z-10">
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg flex w-max items-center gap-1.5 ${kpi.badgeBg}`}>{kpi.icon} {kpi.title}</span>
                <div className="text-4xl font-black text-slate-800 dark:text-slate-100 font-mono tracking-tight pt-1">{dataState.status === "ONLINE" ? kpi.value : "—"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* --- UI MASTER: SEARCHABLE POP-OVER FILTER PANELS --- */}
        <div className="w-full bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800/60 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5 text-slate-800 dark:text-slate-200">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-500"><Filter size={16} /></div>
              <h3 className="text-sm font-black uppercase tracking-wider font-mono">FILTER PANE</h3>
            </div>
            <button type="button" onClick={handleResetFilters} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300"><RotateCcw size={13} /> Reset Filters</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 items-end text-xs">
            {/* Start Date */}
            <div className="space-y-2 relative" ref={startCalRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><CalendarIcon size={12} className="text-indigo-400"/> Start Date</label>
              <div onClick={() => { setStartCalOpen(!startCalOpen); setEndCalOpen(false); }} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer select-none transition-colors border-l-4 border-l-indigo-400">
                <span className="truncate">{formattedLabelDate(startDate)}</span><ChevronDown size={14} className="text-slate-400" />
              </div>
              {startCalOpen && <div className="absolute top-[110%] left-0 z-50"><ModernCalendar initialDate={startDate || new Date()} selectedValue={startDate} onSelect={(date) => { setStartDate(date); setStartCalOpen(false); }} /></div>}
            </div>

            {/* End Date */}
            <div className="space-y-2 relative" ref={endCalRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><CalendarIcon size={12} className="text-rose-400"/> End Date</label>
              <div onClick={() => { setEndCalOpen(!endCalOpen); setStartCalOpen(false); }} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer select-none transition-colors border-l-4 border-l-rose-400">
                <span className="truncate">{formattedLabelDate(endDate)}</span><ChevronDown size={14} className="text-slate-400" />
              </div>
              {endCalOpen && <div className="absolute top-[110%] left-0 z-50"><ModernCalendar initialDate={endDate || new Date()} selectedValue={endDate} onSelect={(date) => { setEndDate(date); setEndCalOpen(false); }} /></div>}
            </div>

            {/* Market */}
            <div className="space-y-2 relative" ref={marketRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Market</label>
              <div onClick={() => setMarketOpen(!marketOpen)} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer select-none transition-colors"><span className="truncate">{selectedMarkets.length === 0 ? "All Markets" : `${selectedMarkets.length} Selected`}</span><ChevronDown size={14} className="text-slate-400" /></div>
              {marketOpen && (
                <div className="absolute top-[110%] left-0 w-full min-w-[200px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-3 py-2 shrink-0"><Search size={14} className="text-slate-400 mr-2" /><input type="text" placeholder="Search..." value={marketSearch} onChange={(e) => setMarketSearch(e.target.value)} className="bg-transparent w-full text-xs font-medium outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400" /></div>
                  <div className="overflow-y-auto flex-1 space-y-1 p-1 scrollbar-hide">{filteredMarketsList.map((m: string) => (
                    <div key={m} onClick={() => handleToggleSelection(m, selectedMarkets, setSelectedMarkets)} className="flex items-center space-x-3 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ${selectedMarkets.includes(m) ? "bg-indigo-500 border-indigo-500 text-white scale-110 shadow-sm shadow-indigo-500/30" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"}`}>{selectedMarkets.includes(m) && <Check size={12} strokeWidth={4} />}</div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{m}</span>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>

            {/* TV Channel */}
            <div className="space-y-2 relative" ref={channelRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">TV Channel</label>
              <div onClick={() => setChannelOpen(!channelOpen)} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer select-none transition-colors"><span className="truncate">{selectedChannels.length === 0 ? "All Channels" : `${selectedChannels.length} Selected`}</span><ChevronDown size={14} className="text-slate-400" /></div>
              {channelOpen && (
                <div className="absolute top-[110%] left-0 w-full min-w-[200px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-3 py-2 shrink-0"><Search size={14} className="text-slate-400 mr-2" /><input type="text" placeholder="Search..." value={channelSearch} onChange={(e) => setChannelSearch(e.target.value)} className="bg-transparent w-full text-xs font-medium outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400" /></div>
                  <div className="overflow-y-auto flex-1 space-y-1 p-1 scrollbar-hide">{filteredChannelsList.map((c: string) => (
                    <div key={c} onClick={() => handleToggleSelection(c, selectedChannels, setSelectedChannels)} className="flex items-center space-x-3 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ${selectedChannels.includes(c) ? "bg-indigo-500 border-indigo-500 text-white scale-110 shadow-sm shadow-indigo-500/30" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"}`}>{selectedChannels.includes(c) && <Check size={12} strokeWidth={4} />}</div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{c}</span>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2 relative" ref={statusRef}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</label>
              <div onClick={() => setStatusOpen(!statusOpen)} className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer select-none transition-colors"><span className="truncate">{selectedStatuses.length === 0 ? "All Statuses" : `${selectedStatuses.length} Selected`}</span><ChevronDown size={14} className="text-slate-400" /></div>
              {statusOpen && (
                <div className="absolute top-[110%] left-0 w-full min-w-[200px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-64 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-3 py-2 shrink-0"><Search size={14} className="text-slate-400 mr-2" /><input type="text" placeholder="Search..." value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)} className="bg-transparent w-full text-xs font-medium outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400" /></div>
                  <div className="overflow-y-auto flex-1 space-y-1 p-1 scrollbar-hide">{filteredStatusesList.map((s: MetaStatusItem) => (
                    <div key={s.id} onClick={() => handleToggleSelection(s.id, selectedStatuses, setSelectedStatuses)} className="flex items-center space-x-3 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-300 ${selectedStatuses.includes(s.id) ? "bg-indigo-500 border-indigo-500 text-white scale-110 shadow-sm shadow-indigo-500/30" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"}`}>{selectedStatuses.includes(s.id) && <Check size={12} strokeWidth={4} />}</div>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{s.label}</span>
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center">
            <button type="button" onClick={() => setFilterCriticalOnly(!filterCriticalOnly)} className="flex items-center space-x-2.5 group cursor-pointer focus:outline-none select-none text-sm transition-all active:scale-95 w-max">
              <div className={`w-5 h-5 rounded-lg border transition-all duration-300 flex items-center justify-center ${filterCriticalOnly ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-110" : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 group-hover:border-indigo-400"}`}>{filterCriticalOnly && <Check size={14} strokeWidth={3} />}</div>
              <span className="font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Filter Critical Channels Only</span>
            </button>
          </div>
        </div>

        {/* --- UI MASTER: MATRIX DATA GRID CONTAINER --- */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-sm flex flex-col animate-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600"><FileSpreadsheet size={16} /></div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono">Consolidated BSA Table</h2>
            </div>
            
            <div className="flex items-center space-x-4 w-full sm:w-auto justify-end">
              <span className="font-mono text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                Filtered: <span className="text-indigo-600 dark:text-indigo-400">{processedDataDeck.total}</span> Rows
              </span>
              <button type="button" onClick={handleExportToGoogleSheets} disabled={isExporting || !processedDataDeck.tableRows.length} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed select-none">
                <FileSpreadsheet size={14} className={isExporting ? "animate-pulse" : ""} /> {isExporting ? "Compiling..." : "Download Excel"}
              </button>
            </div>
          </div>
              
          <div className="w-full overflow-x-auto overflow-y-auto max-h-[500px] relative select-none scrollbar-hide">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                  <th className="sticky top-0 left-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[70px] z-40 shadow-sm text-center">SR NO</th>
                  <th onClick={() => handleSortTrigger("tvChannel")} className="sticky top-0 left-[70px] bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[220px] z-40 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                    <div className="flex items-center justify-between"><span>TV Channel</span>{renderSortIndicatorIcons(sortColumn, "tvChannel", sortDirection)}</div>
                  </th>
                  <th onClick={() => handleSortTrigger("market")} className="sticky top-0 left-[290px] bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[160px] z-40 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                    <div className="flex items-center justify-between"><span>Market</span>{renderSortIndicatorIcons(sortColumn, "market", sortDirection)}</div>
                  </th>
                  <th onClick={() => handleSortTrigger("payType")} className="sticky top-0 left-[450px] bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[120px] z-40 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                    <div className="flex items-center justify-between"><span>Pay/Free</span>{renderSortIndicatorIcons(sortColumn, "payType", sortDirection)}</div>
                  </th>
                  <th onClick={() => handleSortTrigger("status")} className="sticky top-0 left-[570px] bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[160px] z-40 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center justify-between"><span>Status</span>{renderSortIndicatorIcons(sortColumn, "status", sortDirection)}</div>
                  </th>
                  {processedDataDeck.activeSortedDates.map(dateKey => (
                    <th key={dateKey} className="sticky top-0 bg-slate-50 dark:bg-slate-950 p-4 border-b border-r border-slate-200/60 dark:border-slate-800/80 text-center font-bold text-slate-600 dark:text-slate-300 w-[140px] whitespace-nowrap z-20 shadow-sm">{dateKey}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-semibold">
                {paginatedRows.map((row: any, index: number) => {
                  const globalRowIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  let badgeColorClasses = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
                  if (row.statusKey === "GAPS") badgeColorClasses = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 font-black";
                  else if (row.statusKey === "PARTIAL") badgeColorClasses = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20";
                  else if (row.statusKey === "NOSCHED") badgeColorClasses = "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";

                  return (
                    <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}>
                      <td className="sticky left-0 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/60 p-4 font-mono text-slate-400 font-bold z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors text-center">
                        {String(globalRowIndex).padStart(2, "0")}
                      </td>
                      <td className="sticky left-[70px] bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/60 p-4 font-black text-slate-800 dark:text-white z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors truncate whitespace-nowrap overflow-hidden" title={row.tvChannel}>
                        {row.tvChannel}
                      </td>
                      <td className="sticky left-[290px] bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/60 p-4 text-slate-600 dark:text-slate-300 z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors truncate whitespace-nowrap overflow-hidden">
                        {row.market}
                      </td>
                      <td className="sticky left-[450px] bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/60 p-4 font-mono font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors text-center">{row.payType}</td>
                      <td className="sticky left-[570px] bg-white dark:bg-slate-900 border-r border-b border-slate-200/60 dark:border-slate-800/80 p-4 z-30 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] text-center">
                        <span className={`px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider rounded-lg border ${badgeColorClasses}`}>{row.status}</span>
                      </td>

                      {processedDataDeck.activeSortedDates.map((dateKey: string) => {
                          const cellVal = row.rawRowData[dateKey] || row.rawRowData[dateKey.toLowerCase()] || "-";
                        const lowCell = String(cellVal).toLowerCase();
                        
                        let cellTextColor = "text-slate-500 dark:text-slate-400";
                        if (lowCell.includes("processing gaps") || lowCell.includes("missing")) cellTextColor = "text-rose-600 dark:text-rose-400 font-black";
                        else if (lowCell.includes("no schedule")) cellTextColor = "text-amber-600 dark:text-amber-500 font-bold";
                        else if (lowCell.includes("scheduled")) cellTextColor = "text-emerald-600 dark:text-emerald-400 font-bold";
                        else if (lowCell.includes("inactive")) cellTextColor = "text-slate-300 dark:text-slate-600 line-through font-normal";

                        return (
                          <td key={dateKey} className={`p-4 border-r border-b border-slate-100 dark:border-slate-800/40 text-center truncate whitespace-nowrap max-w-[140px] overflow-hidden transition-all ${cellTextColor}`} title={String(cellVal)}>
                            {String(cellVal)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            <span>Showing {processedDataDeck.total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, processedDataDeck.tableRows.length)} of {processedDataDeck.tableRows.length}</span>
            <div className="flex items-center space-x-1.5">
              <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-50 active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"><ChevronFirst size={14} /></button>
              <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-50 active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"><ChevronLeft size={14} /></button>
              <span className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-50 active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"><ChevronRight size={14} /></button>
              <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-50 active:scale-90 disabled:opacity-50 disabled:scale-100 transition-all"><ChevronLast size={14} /></button>
            </div>
          </div>
        </div>

        {/* --- 📊 ISOLATED DAY-WISE CHRONOLOGICAL MATRIX STACKED TIMELINE MONITOR --- */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
          <TimelineSlicer data={daywiseChronologicalMetricsDeck} title="DAY WISE BSA STATUS GRAPH" icon={<BarChart3 size={16} />} colorTheme="indigo" />
        </div>

        {/* --- 🛡️ MANDATORY TARGETS CHECKLIST MATRIX GRID --- */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-sm overflow-hidden p-6 lg:p-8 space-y-6 animate-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: "700ms", animationFillMode: "both" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl"><FolderGit2 size={18} /></div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono">MANDATORY CHANNELS<span className="text-slate-400 font-medium tracking-normal ml-2">({processedAuditTableDeckRows.length} Channels)</span></h2>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input type="text" placeholder="Search checklist..." value={auditSearchQuery} onChange={(e) => { setAuditSearchQuery(e.target.value); setMandatoryCurrentPage(1); }} className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
              </div>
              <button type="button" onClick={handleExportMandatoryChecklist} disabled={isExportingMandatory || !processedAuditTableDeckRows.length} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0">
                <FileSpreadsheet size={14} /> Download
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800/80 max-h-[300px] scrollbar-hide">
            <table className="w-full text-sm text-left border-separate border-spacing-0 select-none">
              <thead className="bg-slate-50 dark:bg-slate-950 font-mono text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 z-20 border-b">
                <tr>
                  <th className="p-4 border-r border-b border-slate-200/60 dark:border-slate-800/80 w-20 text-center bg-slate-50 dark:bg-slate-950">SR NO</th>
                  <th onClick={() => handleAuditSortTrigger("channel")} className="p-4 border-r border-b border-slate-200/60 dark:border-slate-800/80 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-50 dark:bg-slate-950"><div className="flex items-center justify-between"><span>Channel</span>{renderSortIndicatorIcons(auditSortColumn, "channel", auditSortDirection)}</div></th>
                  <th onClick={() => handleAuditSortTrigger("status")} className="p-4 border-b border-slate-200/60 dark:border-slate-800/80 text-center w-56 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-slate-50 dark:bg-slate-950"><div className="flex items-center justify-center"><span>Channel Status</span>{renderSortIndicatorIcons(auditSortColumn, "status", auditSortDirection)}</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-xs">
                {paginatedMandatoryRows.map((auditRow: any, auditIdx: number) => {
                  const isFoundActive = auditRow.foundInBsaFlag === "YES";
                  const globalIdx = (mandatoryCurrentPage - 1) * rowsPerPage + auditIdx + 1;
                  return (
                    <tr key={auditIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors animate-in fade-in" style={{ animationDelay: `${auditIdx * 20}ms`, animationFillMode: "both" }}>
                      <td className="p-3 border-r border-b border-slate-100 dark:border-slate-800/40 text-center font-mono text-slate-400">{String(globalIdx).padStart(3, "0")}</td>
                      <td className="p-3 border-r border-b border-slate-100 dark:border-slate-800/40 text-slate-800 dark:text-slate-200 font-bold px-6">{auditRow.channelLabelName}</td>
                      <td className="p-3 border-b border-slate-100 dark:border-slate-800/40 text-center">
                        <span className={`px-3 py-1 rounded-md text-[10px] font-mono font-black border ${isFoundActive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-500/20"}`}>
                          {auditRow.handshakeStatusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Table 2 Pagination */}
          <div className="p-2 flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            <span>Showing {processedAuditTableDeckRows.length === 0 ? 0 : (mandatoryCurrentPage - 1) * rowsPerPage + 1}–{Math.min(mandatoryCurrentPage * rowsPerPage, processedAuditTableDeckRows.length)} of {processedAuditTableDeckRows.length}</span>
            <div className="flex items-center space-x-1.5">
              <button type="button" onClick={() => setMandatoryCurrentPage(1)} disabled={mandatoryCurrentPage === 1} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronFirst size={14} /></button>
              <button type="button" onClick={() => setMandatoryCurrentPage(prev => Math.max(prev - 1, 1))} disabled={mandatoryCurrentPage === 1} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronLeft size={14} /></button>
              <span className="px-3">Page {mandatoryCurrentPage} of {mandatoryTotalPages}</span>
              <button type="button" onClick={() => setMandatoryCurrentPage(prev => Math.min(prev + 1, mandatoryTotalPages))} disabled={mandatoryCurrentPage === mandatoryTotalPages} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronRight size={14} /></button>
              <button type="button" onClick={() => setMandatoryCurrentPage(mandatoryTotalPages)} disabled={mandatoryCurrentPage === mandatoryTotalPages} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronLast size={14} /></button>
            </div>
          </div>
        </div>

        
        {/* ========================================================================= */}
        {/* ✅ REPOSITIONED WORKSPACE: INJECTED PERSISTENTLY BELOW CHARTS (NO TABS)  */}
        {/* ========================================================================= */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl shadow-sm p-6 lg:p-8 space-y-6 animate-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: "900ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3 text-slate-800 dark:text-slate-200">
              <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600"><FolderGit2 size={18} /></div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono">ROSCO Scope Workspace</h2>
            </div>
            {reconciledRoscoRows.length > 0 && (
              <button type="button" onClick={handleClearRoscoWorkspace} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20 text-[10px] font-black uppercase rounded-xl font-mono tracking-wider hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all"><X size={14} /> Clear Mask</button>
            )}
          </div>

          {reconciledRoscoRows.length === 0 ? (
            /* 📥 PERSISTENT UPLOAD DROPZONE AREA */
            <div className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl py-16 text-center relative hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all duration-300 group">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleRoscoDocumentIngestion} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
              <div className="flex flex-col items-center space-y-3 pointer-events-none relative z-10">
                <div className={`p-4 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 transition-all duration-500 group-hover:scale-110 group-hover:shadow-purple-500/20 ${isReconciling ? "animate-bounce" : ""}`}>
                  <UploadCloud size={36} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{isReconciling ? "Reconciling Assets..." : "Upload Project ROSCO Template File Here"}</p>
                <p className="text-xs text-slate-500 max-w-sm font-sans">Upload ROSCO Here</p>
              </div>
            </div>
          ) : (
            /* 📊 RECONCILED PROJECT CONTENT MODULES */
            <div className="w-full space-y-6 animate-in fade-in duration-500">
              
              {dateDisclaimer && (
                <div className="w-full bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 p-4 rounded-r-2xl text-xs text-blue-700 dark:text-blue-300 font-sans font-bold shadow-sm animate-in slide-in-from-left-4">
                  {dateDisclaimer}
                </div>
              )}

              {roscoMetadata && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
                  <div className="space-y-1.5"><span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Ingested Context</span><p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{roscoMetadata.projectTitle}</p></div>
                  <div className="space-y-1.5"><span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">ROSCO Timeline</span><p className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 w-max px-2 py-0.5 rounded-md">{roscoMetadata.startDate} — {roscoMetadata.endDate}</p></div>
                  <div className="space-y-1.5"><span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Operational Track</span><p className="text-sm font-black text-purple-600 uppercase font-mono truncate">{roscoMetadata.sportsBlocks.join(", ")}</p></div>
                </div>
              )}
              {/* ✅ ENLARGED KPI & FULL FILTER DASHBOARD */}
              <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between bg-white dark:bg-[#111623] border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
                
                {/* Left: Quick Stats Mini-Cards */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Channels</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{roscoKpis.total}</span>
                  </div>
                  <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Scheduled OK</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{roscoKpis.ok}</span>
                  </div>
                  <div className="px-3 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Processing Gaps</span>
                    <span className="text-sm font-black text-rose-700 dark:text-rose-400">{roscoKpis.gaps}</span>
                  </div>
                  <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Partial Schedule</span>
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">{roscoKpis.partial}</span>
                  </div>
                  <div className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">No Schedule</span>
                    <span className="text-sm font-black text-amber-800 dark:text-amber-400">{roscoKpis.noSched}</span>
                  </div>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-center min-w-[110px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Missing Track</span>
                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">{roscoKpis.missing}</span>
                  </div>
                </div>

                {/* Right: Inline Target Filters */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-4 w-full lg:w-auto shrink-0 z-30">
                  <span className="font-mono font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"><Filter size={11} /> Slice:</span>
                  
                  {/* Start Date */}
                  <div className="relative" ref={roscoStartCalRef}>
                    <div onClick={() => { setRoscoStartCalOpen(!roscoStartCalOpen); setRoscoEndCalOpen(false); setRoscoMarketOpen(false); setRoscoChannelOpen(false); setRoscoStatusOpen(false); }} className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                      <CalendarIcon size={10} className="text-purple-400"/> <span>{formattedLabelDate(roscoStartDate)}</span>
                    </div>
                    {roscoStartCalOpen && <div className="absolute top-[110%] right-0 z-50"><ModernCalendar initialDate={roscoStartDate || new Date()} selectedValue={roscoStartDate} onSelect={(date) => { setRoscoStartDate(date); setRoscoStartCalOpen(false); }} /></div>}
                  </div>

                  {/* End Date */}
                  <div className="relative" ref={roscoEndCalRef}>
                    <div onClick={() => { setRoscoEndCalOpen(!roscoEndCalOpen); setRoscoStartCalOpen(false); setRoscoMarketOpen(false); setRoscoChannelOpen(false); setRoscoStatusOpen(false); }} className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                      <CalendarIcon size={10} className="text-purple-400"/> <span>{formattedLabelDate(roscoEndDate)}</span>
                    </div>
                    {roscoEndCalOpen && <div className="absolute top-[110%] right-0 z-50"><ModernCalendar initialDate={roscoEndDate || new Date()} selectedValue={roscoEndDate} onSelect={(date) => { setRoscoEndDate(date); setRoscoEndCalOpen(false); }} /></div>}
                  </div>

                  {/* Market Filter */}
                  <div className="relative" ref={roscoMarketRef}>
                    <div onClick={() => { setRoscoMarketOpen(!roscoMarketOpen); setRoscoStatusOpen(false); setRoscoChannelOpen(false); setRoscoStartCalOpen(false); setRoscoEndCalOpen(false); }} className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                      <span>{roscoSelectedMarkets.length === 0 ? "Markets" : `${roscoSelectedMarkets.length} Selected`}</span><ChevronDown size={10} className="text-slate-400" />
                    </div>
                    {roscoMarketOpen && (
                      <div className="absolute top-[110%] right-0 w-48 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-1 z-50">
                        <div className="overflow-y-auto max-h-40 space-y-0.5 scrollbar-hide">
                          {Array.from(new Set(reconciledRoscoRows.map(r => String(r.country || "")))).filter(Boolean).map(country => (
                            <div key={country} onClick={() => handleToggleSelection(country, roscoSelectedMarkets, setRoscoSelectedMarkets)} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer">
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${roscoSelectedMarkets.includes(country) ? "bg-purple-500 border-purple-500 text-white" : "border-slate-300"}`}>{roscoSelectedMarkets.includes(country) && <Check size={8} strokeWidth={4}/>}</div>
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{country}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel Filter */}
                  <div className="relative" ref={roscoChannelRef}>
                    <div onClick={() => { setRoscoChannelOpen(!roscoChannelOpen); setRoscoMarketOpen(false); setRoscoStatusOpen(false); setRoscoStartCalOpen(false); setRoscoEndCalOpen(false); }} className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                      <span>{roscoSelectedChannels.length === 0 ? "Channels" : `${roscoSelectedChannels.length} Selected`}</span><ChevronDown size={10} className="text-slate-400" />
                    </div>
                    {roscoChannelOpen && (
                      <div className="absolute top-[110%] right-0 w-52 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-1 z-50">
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 mb-1"><Search size={10} className="text-slate-400 mr-1.5" /><input type="text" placeholder="Search..." value={roscoChannelSearch} onChange={(e) => setRoscoChannelSearch(e.target.value)} className="bg-transparent w-full outline-none text-slate-700 dark:text-slate-300" /></div>
                        <div className="overflow-y-auto max-h-40 space-y-0.5 scrollbar-hide">
                          {Array.from(new Set(reconciledRoscoRows.map(r => String(r.rosco_name || "")))).filter(c => c.toLowerCase().includes(roscoChannelSearch.toLowerCase())).map(channel => (
                            <div key={channel} onClick={() => handleToggleSelection(channel, roscoSelectedChannels, setRoscoSelectedChannels)} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer">
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${roscoSelectedChannels.includes(channel) ? "bg-purple-500 border-purple-500 text-white" : "border-slate-300"}`}>{roscoSelectedChannels.includes(channel) && <Check size={8} strokeWidth={4}/>}</div>
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{channel}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="relative" ref={roscoStatusRef}>
                    <div onClick={() => { setRoscoStatusOpen(!roscoStatusOpen); setRoscoMarketOpen(false); setRoscoChannelOpen(false); setRoscoStartCalOpen(false); setRoscoEndCalOpen(false); }} className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                      <span>{roscoSelectedStatuses.length === 0 ? "Statuses" : `${roscoSelectedStatuses.length} Selected`}</span><ChevronDown size={10} className="text-slate-400" />
                    </div>
                    {roscoStatusOpen && (
                      <div className="absolute top-[110%] right-0 w-44 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-0.5 z-50">
                        {[
                          { id: "OK", label: "Scheduled OK" },
                          { id: "PARTIAL", label: "Partial Schedule" },
                          { id: "NOSCHED", label: "No Schedule" },
                          { id: "GAPS", label: "Processing Gaps" },
                          { id: "MISSING", label: "Missing Track" }
                        ].map(statusItem => (
                          <div key={statusItem.id} onClick={() => handleToggleSelection(statusItem.id, roscoSelectedStatuses, setRoscoSelectedStatuses)} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer">
                            <div className={`w-3 h-3 rounded border flex items-center justify-center ${roscoSelectedStatuses.includes(statusItem.id) ? "bg-purple-500 border-purple-500 text-white" : "border-slate-300"}`}>{roscoSelectedStatuses.includes(statusItem.id) && <Check size={8} strokeWidth={4}/>}</div>
                            <span>{statusItem.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ✅ FIX: Added Start/End dates to the clear condition and onClick handler */}
                  {(roscoSelectedMarkets.length > 0 || roscoSelectedStatuses.length > 0 || roscoSelectedChannels.length > 0 || roscoStartDate || roscoEndDate) && (
                    <button 
                      onClick={() => { 
                        setRoscoSelectedMarkets([]); 
                        setRoscoSelectedStatuses([]); 
                        setRoscoSelectedChannels([]); 
                        setRoscoStartDate(undefined); 
                        setRoscoEndDate(undefined); 
                      }} 
                      className="p-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors" 
                      title="Clear All Filters"
                    >
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>

              {/* TRANSLATED SCOPE GRID */}
              <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shadow-sm">ROSCO CONSOLIDATED TABLE</span>
                  
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input type="text" placeholder="Search project track..." value={roscoSearchQuery} onChange={(e) => { setRoscoSearchQuery(e.target.value); setRoscoCurrentPage(1); }} className="w-full text-xs pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                    </div>
                    <button type="button" onClick={handleExportRoscoWorkspaceSummary} disabled={isExportingRosco || !sortedRoscoGridMatrix.length} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/20 active:scale-95 transition-all shrink-0">
                      <FileSpreadsheet size={14} className={isExportingRosco ? "animate-pulse" : ""} /> Download
                    </button>
                  </div>
                </div>
                <div className="w-full overflow-x-auto overflow-y-auto max-h-[500px] relative select-none scrollbar-hide">
                  <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 font-mono text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 z-20">
                      <tr>
                        <th onClick={() => handleRoscoSortTrigger("index")} className="sticky top-0 left-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[70px] z-40 cursor-pointer select-none hover:bg-slate-100 transition-colors shadow-sm">
                          <div className="flex items-center justify-center"><span>IDX</span>{renderSortIndicatorIcons(roscoSortColumn, "index", roscoSortDirection)}</div>
                        </th>
                        <th onClick={() => handleRoscoSortTrigger("rosco_name")} className="sticky top-0 left-[70px] bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-[240px] z-40 cursor-pointer select-none hover:bg-slate-100 transition-colors shadow-sm"><div className="flex items-center justify-between"><span>ROSCO TV Channel</span>{renderSortIndicatorIcons(roscoSortColumn, "rosco_name", roscoSortDirection)}</div></th>
                        <th onClick={() => handleRoscoSortTrigger("country")} className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-40 cursor-pointer select-none hover:bg-slate-100 transition-colors"><div className="flex items-center justify-between"><span>Country</span>{renderSortIndicatorIcons(roscoSortColumn, "country", roscoSortDirection)}</div></th>
                        <th onClick={() => handleRoscoSortTrigger("found_bsa")} className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-40 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors"><div className="flex items-center justify-between"><span>Found in BSA</span>{renderSortIndicatorIcons(roscoSortColumn, "found_bsa", roscoSortDirection)}</div></th>
                        <th onClick={() => handleRoscoSortTrigger("found_aura")} className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-40 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors"><div className="flex items-center justify-between"><span>Found in AURA</span>{renderSortIndicatorIcons(roscoSortColumn, "found_aura", roscoSortDirection)}</div></th>
                        <th onClick={() => handleRoscoSortTrigger("badge_code")} className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-r border-slate-200/60 dark:border-slate-800/80 p-4 w-52 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"><div className="flex items-center justify-between"><span>Final Status</span>{renderSortIndicatorIcons(roscoSortColumn, "badge_code", roscoSortDirection)}</div></th>
                        
                        {roscoActiveSortedDates.map(dateKey => (
                           <th key={dateKey} onClick={() => handleRoscoSortTrigger(dateKey)} className="sticky top-0 bg-slate-50 dark:bg-slate-950 p-4 border-b border-r border-slate-200/60 dark:border-slate-800/80 text-center font-bold font-sans text-slate-600 dark:text-slate-300 w-36 whitespace-nowrap z-20 shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">
                            <div className="flex items-center justify-between"><span>{dateKey}</span>{renderSortIndicatorIcons(roscoSortColumn, dateKey, roscoSortDirection)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-semibold">
                      {paginatedRoscoRows.map((row: any, rIdx: number) => {
                        const matchedBsaRow = dataState.rawBsaRows.find(b => String(b["TV Channel"] || b["tv channel"] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "") === String(row.rosco_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
                        const isFoundInBsa = matchedBsaRow !== undefined;
                        const isFoundInAura = row.is_in_aura === "YES";

                        let bsaBadgeColor = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20";
                        let auraBadgeColor = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20";
                        let finalStatusClasses = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 border border-emerald-200 dark:border-emerald-500/20";
                        let finalStatusLabel = "Scheduled OK";

                        if (isFoundInBsa && !isFoundInAura) {
                          auraBadgeColor = "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20 font-bold";
                          finalStatusClasses = "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-200 dark:border-indigo-500/20";
                          finalStatusLabel = "Partial Schedule";
                        } else if (!isFoundInBsa && isFoundInAura) {
                          bsaBadgeColor = "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20 font-bold";
                          finalStatusClasses = "bg-blue-50 dark:bg-blue-500/10 text-blue-700 border border-blue-200 dark:border-blue-500/20 font-black shadow-sm";
                          finalStatusLabel = "Found in AURA";
                        } else if (!isFoundInBsa && !isFoundInAura) {
                          bsaBadgeColor = "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20 font-bold";
                          auraBadgeColor = "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/20 font-bold";
                          finalStatusClasses = "bg-rose-50 dark:bg-rose-500/10 text-rose-700 border border-rose-200 dark:border-rose-500/20 font-black";
                          finalStatusLabel = "Missing in Both";
                        }

                        if (matchedBsaRow) {
                          const matchedStatusKey = matchedBsaRow["Final Status"] || matchedBsaRow["final status"] || "OK";
                          if (String(matchedStatusKey).toUpperCase().includes("GAPS")) {
                            finalStatusClasses = "bg-rose-50 dark:bg-rose-500/10 text-rose-700 border border-rose-200 dark:border-rose-500/20 font-bold";
                            finalStatusLabel = "Processing Gaps";
                          } else if (String(matchedStatusKey).toUpperCase().includes("NO SCHEDULE")) {
                            finalStatusClasses = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 border border-amber-200 dark:border-amber-500/20 font-bold";
                            finalStatusLabel = "No Schedule";
                          } else if (String(matchedStatusKey).toUpperCase().includes("PARTIAL")) {
                            finalStatusClasses = "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 border border-indigo-200 dark:border-indigo-500/20 font-bold";
                            finalStatusLabel = "Partial Schedule";
                          }
                        }

                        const globalRoscoIdx = (roscoCurrentPage - 1) * rowsPerPage + rIdx + 1;

                        return (
                          <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group animate-in fade-in" style={{ animationDelay: `${rIdx * 30}ms`, animationFillMode: "both" }}>
                            <td className="sticky left-0 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/40 p-4 font-mono text-slate-400 font-bold group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 text-center">{String(globalRoscoIdx).padStart(2, "0")}</td>
                            <td className="sticky left-[70px] bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800/40 p-4 font-black text-slate-800 dark:text-white group-hover:bg-slate-50 dark:group-hover:bg-slate-800 truncate z-10" title={row.rosco_name}>{row.rosco_name}</td>
                            <td className="p-4 border-b border-r border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-300 font-sans">{row.country}</td>
                            <td className="p-4 border-b border-r border-slate-100 dark:border-slate-800/40 text-center"><span className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded-lg ${bsaBadgeColor}`}>{isFoundInBsa ? "YES" : "NO"}</span></td>
                            <td className="p-4 border-b border-r border-slate-100 dark:border-slate-800/40 text-center"><span className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded-lg ${auraBadgeColor}`}>{isFoundInAura ? "YES" : "NO"}</span></td>
                            <td className="p-4 border-b border-r border-slate-100 dark:border-slate-800/40 text-center shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"><span className={`px-3 py-1.5 text-[9px] uppercase font-mono tracking-wider font-black rounded-xl ${finalStatusClasses}`}>{finalStatusLabel}</span></td>
                            
                            {roscoActiveSortedDates.map((dateKey: string) => {
                              // Rule 6: The Lost Channel Dash (-) Rule 
                              // Rule 6: The Lost Channel Dash (-) Rule
                              if (!isFoundInBsa && !isFoundInAura) return <td key={dateKey} className="p-4 border-r border-b border-slate-100 dark:border-slate-800/40 text-center font-medium text-slate-400 dark:text-slate-500 font-mono">-</td>;
                              if (!isFoundInBsa) return <td key={dateKey} className="p-4 border-r border-b border-slate-100 dark:border-slate-800/40 text-center font-medium text-slate-300 dark:text-slate-600 font-mono">-</td>;

                              const dayMetricValue = matchedBsaRow ? (matchedBsaRow[dateKey] || "-") : "No Schedule";
                              const lowDay = String(dayMetricValue).toLowerCase();
                              
                              let statusTextClassModifiers = "text-slate-500 dark:text-slate-400";
                              if (lowDay.includes("gaps") || lowDay.includes("missing")) statusTextClassModifiers = "text-rose-600 font-black";
                              else if (lowDay.includes("no schedule") || dayMetricValue === "-" || dayMetricValue === "") statusTextClassModifiers = "text-slate-300 dark:text-slate-600 line-through font-normal";
                              else if (lowDay.includes("scheduled") || lowDay.includes("ok") || lowDay.includes("active")) statusTextClassModifiers = "text-emerald-600 font-bold";

                              return (
                                <td key={dateKey} className={`p-4 border-r border-b border-slate-100 dark:border-slate-800/40 text-center font-medium whitespace-nowrap truncate max-w-[140px] overflow-hidden transition-colors ${statusTextClassModifiers}`} title={String(dayMetricValue)}>
                                  {dayMetricValue}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 3 Pagination controls */}
              <div className="p-2 flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-white dark:bg-slate-900 px-4 shadow-sm">
                <span>Showing {sortedRoscoGridMatrix.length === 0 ? 0 : (roscoCurrentPage - 1) * rowsPerPage + 1}–{Math.min(roscoCurrentPage * rowsPerPage, sortedRoscoGridMatrix.length)} of {sortedRoscoGridMatrix.length}</span>
                <div className="flex items-center space-x-1.5 py-2">
                  <button type="button" onClick={() => setRoscoCurrentPage(1)} disabled={roscoCurrentPage === 1} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronFirst size={14} /></button>
                  <button type="button" onClick={() => setRoscoCurrentPage(prev => Math.max(prev - 1, 1))} disabled={roscoCurrentPage === 1} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronLeft size={14} /></button>
                  <span className="px-3">Page {roscoCurrentPage} of {roscoTotalPages}</span>
                  <button type="button" onClick={() => setRoscoCurrentPage(prev => Math.min(prev + 1, roscoTotalPages))} disabled={roscoCurrentPage === roscoTotalPages} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronRight size={14} /></button>
                  <button type="button" onClick={() => setRoscoCurrentPage(roscoTotalPages)} disabled={roscoCurrentPage === roscoTotalPages} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl hover:bg-slate-100 active:scale-90 disabled:opacity-50 transition-all"><ChevronLast size={14} /></button>
                </div>
              </div>

              {/* ✅ MIRROR EQUAL GRAPH HEIGHT (Isolated to prevent lag) */}
<TimelineSlicer data={roscoChronologicalMetricsDeck} title="DAY WISE ROSCO STATUS GRAPH " icon={<BarChart3 size={16} />} colorTheme="purple" />

            </div>
          )}
        </div>

      </div>
    </div>
  );
}