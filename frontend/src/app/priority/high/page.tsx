// "use client";

// import { useAppSelector } from "@/app/redux";
// import { useRunUsaRateCalculationMutation } from "@/state/api";
// import { 
//   CheckCircle, 
//   Download, 
//   FileText, 
//   Loader, 
//   FileCheck,
//   AlertTriangle,
//   Globe,
//   NotebookPen
// } from "lucide-react";
// import React, { useState, useEffect } from "react";

// const UsaRateCalculator = () => {
//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
//   const [calculateRates] = useRunUsaRateCalculationMutation();

//   // --- FILE STATE ---
//   const [usaData, setUsaData] = useState<File | null>(null);
//   const [exportFile, setExportFile] = useState<File | null>(null);
//   const [cpmFile, setCpmFile] = useState<File | null>(null);

//   // --- UI STATE ---
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
//   const [error, setError] = useState<string | null>(null);
//   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

//   // Only three files are now mandatory
//   const isReady = usaData && exportFile && cpmFile;

//   useEffect(() => {
//     return () => {
//       if (downloadUrl) URL.revokeObjectURL(downloadUrl);
//     };
//   }, [downloadUrl]);

//   const handleRunCalculation = async () => {
//     if (!isReady || loading) return;
    
//     setLoading(true);
//     setStatus('idle');
//     setError(null);
//     if (downloadUrl) URL.revokeObjectURL(downloadUrl);

//     const formData = new FormData();
//     formData.append('usa_data', usaData as File);
//     formData.append('export_file', exportFile as File);
//     formData.append('cpm_file', cpmFile as File);

//     try {
//       const response = await calculateRates(formData).unwrap();
      
//       let blob: Blob;
//       if (response instanceof Blob) {
//           blob = response;
//       } else {
//           blob = new Blob([response as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
//       }

//       const url = URL.createObjectURL(blob);
//       setDownloadUrl(url);
//       setStatus('complete');
//       setError(null);
//     } catch (err: any) {
//       console.error("USA Rate calculation failed:", err);
      
//       let errorMessage = "Calculation failed. Please verify file formats and data quality.";
      
//       if (err?.data instanceof Blob) {
//           const reader = new FileReader();
//           reader.onload = () => {
//               try {
//                   const json = JSON.parse(reader.result as string);
//                   setError(`❌ Error: ${json.detail || errorMessage}`);
//               } catch {
//                   setError(`❌ Error: ${errorMessage}`);
//               }
//           };
//           reader.readAsText(err.data);
//       } else {
//           const detail = typeof err === 'string' ? err : (err?.data?.detail || err?.message || errorMessage);
//           setError(`❌ Error: ${detail}`);
//       }
      
//       setStatus('error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDownload = () => {
//     if (!downloadUrl) return;
//     const link = document.createElement('a');
//     link.href = downloadUrl;
//     link.setAttribute('download', `USA_Rates_Export_${new Date().getTime()}.xlsx`);
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
//     const file = e.target.files?.[0] || null;
//     if (type === 'usa') setUsaData(file);
//     if (type === 'exp') setExportFile(file);
//     if (type === 'cpm') setCpmFile(file);
//   };

//   return (
//     <div className="m-5 p-4">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
//           <NotebookPen className="h-6 w-6 text-blue-500" />
//           USA Rate & Rating Calculator
//         </h1>
//         <p className="text-gray-500 dark:text-gray-400">
//           Upload your files to calculate USA Nielsen rates using Audience/CPM lookup logic.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 rounded-lg shadow dark:bg-dark-secondary">
//         {/* USA DATA */}
//         <div className="space-y-2">
//           <p className="font-semibold text-gray-700 dark:text-gray-300">USA Data File (BSR)</p>
//           <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-6 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 transition-all h-40">
//             <FileCheck className="h-10 w-10 text-blue-600" />
//             <p className="mt-2 text-xs text-center font-medium overflow-hidden text-ellipsis w-full text-gray-700 dark:text-gray-200">
//               {usaData ? usaData.name : "Upload USA BSR"}
//             </p>
//             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'usa')} />
//           </label>
//         </div>

//         {/* EXPORT FILE */}
//         <div className="space-y-2">
//           <p className="font-semibold text-gray-700 dark:text-gray-300">Export Template</p>
//           <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-6 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/20 hover:bg-green-100 transition-all h-40">
//             <FileCheck className="h-10 w-10 text-green-600" />
//             <p className="mt-2 text-xs text-center font-medium overflow-hidden text-ellipsis w-full text-gray-700 dark:text-gray-200">
//               {exportFile ? exportFile.name : "Upload Export Sheet"}
//             </p>
//             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'exp')} />
//           </label>
//         </div>

//         {/* CPM FILE */}
//         <div className="space-y-2">
//           <p className="font-semibold text-gray-700 dark:text-gray-300">CPM Reference Table</p>
//           <label className="flex flex-col items-center justify-center border-2 border-dashed border-yellow-300 p-6 cursor-pointer rounded-lg bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 transition-all h-40">
//             <FileText className="h-10 w-10 text-yellow-600" />
//             <p className="mt-2 text-xs text-center font-medium overflow-hidden text-ellipsis w-full text-gray-700 dark:text-gray-200">
//               {cpmFile ? cpmFile.name : "Upload CPM Table"}
//             </p>
//             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'cpm')} />
//           </label>
//         </div>

//         {/* ACTION BUTTON */}
//         <div className="md:col-span-3 pt-4">
//           <button
//             onClick={handleRunCalculation}
//             disabled={!isReady || loading}
//             className={`w-full flex items-center justify-center rounded-lg px-6 py-3 text-white font-bold text-lg shadow-md transition-all ${
//               status === 'complete' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
//             }`}
//           >
//             {loading ? (
//               <><Loader className="mr-2 h-6 w-6 animate-spin" /> Processing...</>
//             ) : status === 'complete' ? (
//               <><CheckCircle className="mr-2 h-6 w-6" /> Calculation Complete!</>
//             ) : (
//               <><Download className="mr-2 h-6 w-6" /> Calculate Rates & Ratings</>
//             )}
//           </button>
//         </div>

//         {/* RESULTS AREA */}
//         {status === 'complete' && downloadUrl && (
//           <div className="md:col-span-3 mt-4 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
//             <p className="text-green-800 dark:text-green-200 font-medium mb-4">Rates successfully calculated and matched via serial date keys!</p>
//             <button
//               onClick={handleDownload}
//               className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-md font-bold hover:bg-green-700 shadow-sm"
//             >
//               <Download className="mr-2 h-5 w-5" /> Download Exported Results
//             </button>
//           </div>
//         )}

//         {/* ERROR DISPLAY */}
//         {status === 'error' && error && (
//           <div className="md:col-span-3 mt-4 p-4 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-lg flex items-center gap-3">
//             <AlertTriangle className="h-6 w-6 flex-shrink-0" />
//             <p className="font-medium">{error}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default UsaRateCalculator;
"use client";

import { 
  CheckCircle, 
  Download, 
  FileText, 
  Loader, 
  FileCheck,
  AlertCircle,
  NotebookPen,
  UploadCloud,
  FileSpreadsheet,
  Terminal
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

const UsaRateCalculator = () => {
  const [files, setFiles] = useState<{
    usa: File | null;
    exp: File | null;
    cpm: File | null;
  }>({ usa: null, exp: null, cpm: null });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["System ready. Awaiting file upload..."]);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = !!(files.usa && files.exp && files.cpm);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); };
  }, [downloadUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files) => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [key]: file }));
    setStatus('idle');
    if (file) setLogs(prev => [...prev, `Uploaded ${key.toUpperCase()}: ${file.name}`]);
  };

  /**
   * Helper function to process chunks of text from the stream.
   * Handles both log messages and the final Base64 file string.
   */
  const processChunks = (combinedText: string) => {
    const lines = combinedText.split("\n\n");
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (trimmedLine.startsWith("data: ")) {
        const msg = trimmedLine.replace("data: ", "");
        setLogs(prev => [...prev, msg]);
      } 
      else if (trimmedLine.startsWith("file: ")) {
        // Remove 'file: ' prefix and all whitespace/newlines
        const base64Data = trimmedLine.substring(6).replace(/\s/g, ""); 
        
        try {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          
          setDownloadUrl(URL.createObjectURL(blob));
          setTimestamp(new Date().toLocaleTimeString());
          setStatus('complete');
          setLogs(prev => [...prev, "SYSTEM: File decoded. Export button enabled."]);
        } catch (decodingError) {
          console.error("Base64 error:", decodingError);
          setLogs(prev => [...prev, "ERROR: Decoding failed. Base64 structure invalid."]);
          setStatus('error');
        }
      }
    });
  };

  const handleRunCalculation = async () => {
    if (!isReady || loading) return;
    
    setLoading(true);
    setStatus('idle');
    setError(null);
    setLogs(["Connecting to USA Rate Engine...", "Establishing stream..."]);

    const formData = new FormData();
    formData.append('usa_data', files.usa!);
    formData.append('export_file', files.exp!);
    formData.append('cpm_file', files.cpm!);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, ""); 
      const response = await fetch(`${baseUrl}/qc/calculate_usa_final_audit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error("No response body from server.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = ""; 

      while (true) {
        const { done, value } = await reader.read();
        
        // When the stream ends, process the absolute last bits in the buffer
        if (done) {
          if (streamBuffer.trim()) processChunks(streamBuffer);
          break;
        }

        streamBuffer += decoder.decode(value, { stream: true });

        // If we have a full line, process it
        if (streamBuffer.includes("\n\n")) {
          const parts = streamBuffer.split("\n\n");
          // Keep the last part (it might be an incomplete Base64 chunk)
          streamBuffer = parts.pop() || "";
          processChunks(parts.join("\n\n"));
        }
      }
    } catch (err: any) {
      setError("Calculation failed.");
      setLogs(prev => [...prev, `ERROR: ${err.message || "Engine timeout"}`]);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-[#FDFDFD] dark:bg-[#08090A] overflow-hidden text-slate-900 dark:text-slate-100">
      <header className="w-full px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F1A] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded-lg shadow-md shrink-0">
            <NotebookPen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">USA Rate Engine</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase">Nielsen BSR Processor</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 min-h-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-4 shrink-0">
          {[
            { id: 'usa', label: 'USA BSR Data', icon: FileSpreadsheet, color: 'text-blue-500' },
            { id: 'exp', label: 'Export Template', icon: FileCheck, color: 'text-emerald-500' },
            { id: 'cpm', label: 'CPM Reference', icon: FileText, color: 'text-amber-500' }
          ].map((item) => (
            <label 
              key={item.id}
              htmlFor={item.id}
              className={`flex items-center gap-3 px-4 h-16 border rounded-xl cursor-pointer transition-all
                ${files[item.id as keyof typeof files] 
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-500/5' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-400'}`}
            >
              <input type="file" id={item.id} className="hidden" onChange={(e) => handleFileChange(e, item.id as keyof typeof files)} />
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${item.color} shrink-0`}>
                <item.icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold truncate">
                  {files[item.id as keyof typeof files]?.name || item.label}
                </p>
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight">
                  {files[item.id as keyof typeof files] ? 'Verified' : 'Select File'}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-4 shrink-0 h-64">
          <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
             <div className="text-center mb-4">
              <h2 className="text-sm font-bold">Process Engine</h2>
              <p className="text-[10px] text-slate-400">Memory optimized logic</p>
            </div>
            
            <button
              onClick={handleRunCalculation}
              disabled={!isReady || loading}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all flex flex-col items-center justify-center gap-2
                ${status === 'complete' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-900 dark:bg-blue-600 text-white hover:opacity-90 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400'}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  <span>WORKING...</span>
                </>
              ) : status === 'complete' ? (
                <>
                  <CheckCircle size={18} />
                  <span>SUCCESS</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>RUN CALC</span>
                </>
              )}
            </button>
            
            {!isReady && !loading && (
              <p className="mt-3 text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1">
                <AlertCircle size={10} /> Requirements not met
              </p>
            )}
          </div>

          <div className="col-span-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Console</span>
              </div>
              <div className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 p-3 font-mono text-[10px] overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  <span className={log.includes('ERROR') ? 'text-rose-400' : log.includes('COMPLETED') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="shrink-0 flex items-center justify-between px-2 pt-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-4">
            {status === 'complete' && downloadUrl && (
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = downloadUrl;
                  link.download = `USA_Audit_${Date.now()}.xlsx`;
                  link.click();
                }}
                className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-black animate-in fade-in slide-in-from-left-2"
              >
                <Download size={10} /> SAVE FILE
              </button>
            )}
            <span>Status: <span className={loading ? "text-amber-500" : "text-emerald-500"}>{loading ? "Active" : "Idle"}</span></span>
          </div>
          <span>Ref: v2.4.0-Stable</span>
        </footer>
      </main>
    </div>
  );
};

export default UsaRateCalculator;