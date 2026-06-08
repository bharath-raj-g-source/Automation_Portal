"use client";

import React, { useState } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Layers, Radio, HelpCircle, Play } from "lucide-react";

const TelecastDashboardMaster = () => {
  const [activeTab, setActiveTab] = useState<"standard" | "file_upload">("file_upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setProcessingError("");
      setIsComplete(false);
    }
  };

  const handleUploadWorkbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingError("");
    setIsComplete(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // 🧠 DYNAMIC ROUTE EXTRACTION
      // Safely reads your AWS environment base path, falling back to local if undefined
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
      const cleanBaseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      
      // Execute direct binary stream fetch to bypass Redux state serialization overhead
      const response = await fetch(`${cleanBaseUrl}/public/process-excel-ledger`, {
        method: "POST",
        body: formData,
        // Public endpoint bypasses explicit token structures
      });

      if (!response.ok) {
        throw new Error("Trino processing operation error occurred during workbook loop calculation.");
      }

      // Intercept file blob payload byte buffers cleanly
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement("a");
      tempLink.href = downloadUrl;
      tempLink.setAttribute("download", `Calculated_Audience_Metrics_${Date.now()}.xlsx`);
      document.body.appendChild(tempLink);
      tempLink.click();
      
      // Clean up memory allocations
      tempLink.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setIsComplete(true);
    } catch (err: any) {
      setProcessingError(err.message || "Failed to process ledger records stream.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#08090A] p-4 lg:p-8 text-slate-900 dark:text-slate-100 flex flex-col gap-6 select-text relative z-10">
      
      {/* 🧭 NAVIGATION CONTROL HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs gap-3">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-500" size={18} />
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Analysis Mode:</span>
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-1">
            <button onClick={() => setActiveTab("file_upload")} className="px-4 py-1.5 rounded-lg text-xs font-black bg-blue-600 text-white shadow-xs cursor-pointer">
              Automated File Processing Engine
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
          <Radio size={12} className="animate-pulse" /><span>Trino Cluster Storage Link Safe</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🚀 AUTOMATED EXCEL FILE STREAM INGESTION WORKSPACE PANEL  */}
      {/* ========================================================= */}
      {activeTab === "file_upload" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          
          {/* UPLOAD SELECTION DASHBOARD CONSOLE */}
          <div className="xl:col-span-2 bg-white dark:bg-[#111623] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                <FileSpreadsheet className="text-emerald-500" size={20}/> Batch Workbook Processing Matrix Hub
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Upload your raw telemetry workbook file. The automation driver will compute audience sizes via Trino and write outputs starting at column **AA**.
              </p>
            </div>

            <form onSubmit={handleUploadWorkbook} className="flex flex-col gap-5 mt-2">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors bg-slate-50/50 dark:bg-slate-900/30 relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileChange} 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                  disabled={isProcessing}
                />
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                  <Upload className="text-blue-500" size={24}/>
                </div>
                <div className="text-center flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {selectedFile ? selectedFile.name : "Select or Drop Master Ledger Workbook"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Supports complete horizontal .xlsx tracking models</span>
                </div>
              </div>

              {processingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle size={14}/> {processingError}
                </div>
              )}

              {isComplete && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={14}/> Workbook metrics computed! Check your system browser downloads file folder.
                </div>
              )}

              <button 
                type="submit" 
                disabled={!selectedFile || isProcessing}
                className="w-full py-3 rounded-xl bg-blue-600 border border-blue-500 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing Database Shards & Writing Column AA...</span>
                  </>
                ) : (
                  <>
                    <Play size={11} fill="#fff"/>
                    <span>Process & Download Complete Spreadsheet</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SIDE DATA FLOW DOCUMENTATION MODULE */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-800 flex flex-col gap-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <HelpCircle size={14}/> Operational Data Structure Map
            </h2>
            <div className="text-xs text-slate-300 space-y-3 font-medium mt-1">
              <p>The calculation pipeline processes the uploaded worksheet systematically:</p>
              <div className="border-l-2 border-blue-500 pl-3 space-y-2 py-0.5">
                <div>
                  <span className="text-white font-black block">1. Parameter Parsing:</span>
                  <span className="text-[11px] text-slate-400">Extracts columns for channel, date, start time, and duration automatically.</span>
                </div>
                <div>
                  <span className="text-white font-black block">2. Quarter Scaling:</span>
                  <span className="text-[11px] text-slate-400">Calculates duration run times to scale quarter-hour denominators.</span>
                </div>
                <div>
                  <span className="text-white font-black block">3. Column AA Alignment:</span>
                  <span className="text-[11px] text-slate-400">Appends 12 dynamic demographic columns starting explicitly at column cell location AA.</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default TelecastDashboardMaster;