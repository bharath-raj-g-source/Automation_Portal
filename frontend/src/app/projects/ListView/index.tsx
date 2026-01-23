// import React, { useState, useEffect } from "react";
// import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader, Download } from "lucide-react";
// // import { DataGrid, GridColDef, GridRowId } from "@mui/x-data-grid";
// import { useAppSelector } from "@/app/redux"; 
// import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils"; 
// // 💡 IMPORT THE NEW RTK QUERY HOOK AND INTERFACE
// import { useRunQcChecksMutation, QcSummaryResult, useRunMarketChecksMutation } from "@/state/api"; 


// // NOTE: QcRunResponse is now defined globally for consistency
// export interface QcRunResponse {
//     status: string;
//     message: string;
//     download_url: string;
//     summaries: QcSummaryResult[];
// }


// // --- MOCK DATA FOR AVAILABLE CHECKS (Must match backend market_check_map keys) ---
// const availableChecks = [
//     // --- Integrity / Review Checks ---
//     { key: "check_italy_mexico", name: "Channel/Market Duplication Check", type: "Review" },
//     { key: "check_f1_obligations", name: "F1 Broadcaster Obligation Check", type: "Review" },
//     { key: "duration_limits", name: "Duration Limits (5m-5h) Check", type: "Integrity" },
//     { key: "live_date_integrity", name: "Live Session Date Integrity", type: "Integrity" },
//     { key: "check_session_completeness", name: "Session Count Completeness", type: "Integrity" },
//     { key: "update_audience_from_overnight", name: "Update Audience from Overnight Max", type: "Modeling" },
//     { key: "apply_duplication_weights", name: "Apply Market Duplication Weights", type: "Modeling" },

//     // --- Removal Checks ---
//     { key: "remove_andorra", name: "Remove Andorra Data", type: "Removal" },
//     { key: "remove_serbia", name: "Remove Serbia Data", type: "Removal" },
//     { key: "remove_montenegro", name: "Remove Montenegro Data", type: "Removal" },
//     { key: "remove_brazil_espn_fox", name: "Remove Brazil ESPN/FOX Duplicates", type: "Removal" },
// ];

// type ListViewProps = {
//   id: string;
//   setIsModalNewTaskOpen: (isOpen: boolean) => void;
// };


// const ListView = ({ id, setIsModalNewTaskOpen }: ListViewProps) => {
//   // 💡 RTK QUERY: Initialize the mutation hook
//   // We MUST type the data return as QcRunResponse for correct property access
//   const [runQc, { 
//     isLoading, 
//     isSuccess, 
//     isError, 
//     error, 
//     data: summaryData 
// }] = useRunMarketChecksMutation();


//   // --- FILE STATE ---
//   const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
//   const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
//   const [selectedDataFile, setSelectedDataFile] = useState<File | null>(null); 
//   const [selectedMacroFile, setSelectedMacroFile] = useState<File | null>(null); 

//   // --- PROCESSING & UI STATE ---
//   const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
//   const [processStatus, setProcessStatus] = useState<'idle' | 'complete' | 'error'>('idle');
//   const [localError, setLocalError] = useState<string | null>(null);
//   // Stores the download URL and filename from the JSON response
//   const [qcResultMeta, setQcResultMeta] = useState<{url: string, name: string} | null>(null);
//   // Store the validation rows for the DataGrid
//   const [validationResults, setValidationResults] = useState<QcSummaryResult[] | null>(null);
  

//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

//   const isReadyToRun = selectedBSRFile && selectedRoscoFile && selectedChecks.length > 0;
//   const isProcessingComplete = processStatus === 'complete';

//   // 💡 COMBINED STATUS: Controls the UI flows (loading/complete/error)
//   const combinedStatus = isLoading ? 'loading' : isProcessingComplete ? 'complete' : localError ? 'error' : 'idle';
//   
  

//   // --- MOCK SUMMARY DATA (Fallback for table) ---
//   const mockSummary: QcSummaryResult[] = [
//     { id: 1, description: "Period Integrity Check", action: "Audit", status: "Completed", total_issues_flagged: 0 }, 
//     { id: 2, description: "Field Completeness Check", action: "Audit", status: "Issue Found", total_issues_flagged: 15 },
//   ];

//   // --- EFFECT TO HANDLE RTK QUERY RESPONSE (Success and Error) ---
//   useEffect(() => {
//     // 1. Check for success and ensure data exists
//     if (isSuccess && summaryData) {
//       // 🚨 CRUCIAL: Cast summaryData to the EXPECTED type (QcRunResponse)
//       // This is needed because the backend sends the entire object, not just the summaries array.
//       const response = summaryData as QcRunResponse; 

//       // 2. UPDATE STATUS & ERROR
//       setProcessStatus('complete');
//       setLocalError(null);
      
//       // 3. SET DOWNLOAD METADATA
//       const urlParams = new URLSearchParams(response.download_url.split('?')[1]);
//       // Use the filename provided by the backend, or a default
//       const filename = urlParams.get('filename') || `QC_Result_${new Date().toISOString()}.xlsx`;

//       setQcResultMeta({
//          url: response.download_url, 
//          name: filename
//       });
      
//       // 4. SET TABLE DATA
//       // Store the nested summaries array
//       setValidationResults(response.summaries); 

//     } else if (isError) {
//       // 1. UPDATE STATUS & ERROR
//       setProcessStatus('error');
//       // Use the RTK Query error payload for detailed messages
//       setLocalError(`❌ API Error: ${(error as any).data?.detail || 'Processing failed. Check console/network logs.'}`);
//       setQcResultMeta(null);
//       setValidationResults(null);
//     }
// }, [isSuccess, isError, summaryData, error]);
    
//   
//   // --- 1. RTK QUERY TRIGGER LOGIC ---
//   const handleRunChecks = async () => {
//     if (!isReadyToRun || isLoading) return;
//     
//     setProcessStatus('idle'); 
//     setLocalError(null);
//     setQcResultMeta(null); 
//     setValidationResults(null); // Clear previous table data

//     const formData = new FormData();
//     // 💡 REMINDER: We are mapping Rosco/Macro to the specific Market Check field names
//     formData.append('bsr_file', selectedBSRFile as File);
//     if (selectedRoscoFile) { formData.append('obligation_file', selectedRoscoFile); } // Rosco -> Obligation
//     if (selectedMacroFile) { formData.append('overnight_file', selectedMacroFile); } // Macro -> Overnight
//     // formData.append('data_file', selectedDataFile as File); // This field is not in the market_check API

//     // Ensure the checks list is sent as a JSON string
//     formData.append('checks', JSON.stringify(selectedChecks));

//     try {
//       await runQc(formData).unwrap();
//     } catch (err) {
//       // Error handled in the useEffect hook above
//       console.error("QC Check execution failed:", err);
//     }
//   };

//   // --- 2. DOWNLOAD HANDLER (Uses the URL Metadata) ---
//   const handleDownload = () => {
//     if (!qcResultMeta) return;

//     const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/';
    
//     // Construct the full URL for the GET request
//     const fullDownloadUrl = new URL(qcResultMeta.url, baseUrl).href;
    
//     // Trigger the browser download
//     window.location.href = fullDownloadUrl;
//   };
//   
//   // --- 3. FILE CHANGE HANDLER (No change) ---
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'bsr' | 'rosco' | 'data' | 'macro') => {
//     const file = event.target.files?.[0];
//     if (fileType === 'bsr') {
//       setSelectedBSRFile(file || null);
//     } else if (fileType === 'rosco') {
//       setSelectedRoscoFile(file || null);
//     } else if (fileType === 'data') {
//       setSelectedDataFile(file || null); 
//     } else if (fileType === 'macro') {
//       setSelectedMacroFile(file || null); 
//     }
//   };

//   // --- 4. CHECKBOX TOGGLE HANDLER (No change) ---
//   const handleCheckToggle = (key: string) => {
//     setSelectedChecks(prev => 
//       prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
//     );
//   };

//   return (
//     <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 w-full">
//       
//       {/* COLUMN 1: INPUTS (Takes 3/4 columns on XL screens) */}
//       <div className="col-span-1 xl:col-span-4 rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
//         
//         {/* 💡 START: HORIZONTAL CONTAINER FOR CHECKLIST & UPLOADS */}
//         <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
            
//             {/* 💡 LEFT SIDE: CHECKLIST */}
//             <div className="flex-1 space-y-4 pt-0">
//                 <h3 className="text-xl font-bold dark:text-white">Select Checks</h3>
//                 <div className="max-h-96 space-y-2 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded p-2">
//                   {availableChecks.map((check) => (
//                     <div key={check.key} className="flex items-center justify-between rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <label className="flex items-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedChecks.includes(check.key)}
//                           onChange={() => handleCheckToggle(check.key)}
//                           className="form-checkbox h-4 w-4 text-blue-600 rounded"
//                         />
//                         <span className="ml-3 text-sm dark:text-gray-200">{check.name}</span>
//                       </label>
//                       <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
//                         {check.type}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//             </div>

//             {/* 💡 RIGHT SIDE: FILE UPLOADS */}
//             <div className="flex-1 space-y-4 pt-0">
//                 <h3 className="text-xl font-bold dark:text-white">QC File Selection</h3>
                
//                 {/* --- FIRST HORIZONTAL ROW (BSR and ROSCO/Obligation) --- */}
//                 <div className="flex space-x-4">
//                     {/* BSR File (Mandatory) */}
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">BSR Data File (Mandatory)</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-4 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/50 h-full">
//                             <FileText className="h-8 w-8 text-blue-600" />
//                             <p className="mt-2 text-sm text-blue-600 dark:text-blue-300 text-center">{selectedBSRFile ? selectedBSRFile.name : "Upload BSR (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'bsr')} />
//                         </label>
//                     </div>

//                     {/* ROSCO/OBLIGATION File (Mandatory for ready, Mapped to 'obligation_file') */}
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Obligation File (Rosco) (Mandatory)</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-4 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/50 h-full">
//                             <FileText className="h-8 w-8 text-green-600" />
//                             <p  className="mt-2 text-sm text-green-600 dark:text-green-300 text-center">{selectedRoscoFile ? selectedRoscoFile.name : "Upload Obligation/Rosco (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'rosco')} />
//                         </label>
//                     </div>
//                 </div>

//                 {/* --- SECOND HORIZONTAL ROW (Data File and Macro/Overnight File) --- */}
//                 <div className="flex space-x-4 pt-4"> 
//                     {/* DATA File (Optional - UNUSED by current market_check API) */}
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Client Data File (Optional)</p>
//                         <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
//                                             ${selectedDataFile ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
//                             <FileText className={`h-8 w-8 ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'}`} />
//                             <p className={`mt-2 text-sm text-center ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedDataFile ? selectedDataFile.name : "Upload Client Data (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'data')} />
//                         </label>
//                     </div>

//                     {/* MACRO/OVERNIGHT File (Optional, Mapped to 'overnight_file') */}
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Overnight File (Optional)</p>
//                         <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
//                                             ${selectedMacroFile ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
//                             <FileText className={`h-8 w-8 ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'}`} />
//                             <p className={`mt-2 text-sm text-center ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedMacroFile ? selectedMacroFile.name : "Upload Overnight/Macro (.xlsm/.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsm,.xlsx" onChange={(e) => handleFileChange(e, 'macro')} />
//                         </label>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         {/* 💡 END: HORIZONTAL CONTAINER FOR CHECKLIST & UPLOADS */}

        
//         {/* RUN BUTTON (Spans full width below the horizontal section) */}
//         <button
//           onClick={handleRunChecks}
//           disabled={!isReadyToRun || combinedStatus === 'loading'}
//           className="w-full flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white font-semibold hover:bg-blue-600 disabled:bg-gray-400 mt-4"
//         >
//           {combinedStatus === 'loading' ? (
//             <>
//               <Loader className="mr-2 h-5 w-5 animate-spin" />
//               Running Checks...
//             </>
//           ) : combinedStatus === 'complete' ? ( // 💡 Display success message
//             <>
//               <CheckCircle className="mr-2 h-5 w-5" />
//               Checks Successful!
//             </>
//           ) : (
//             <>
//               <FileText className="mr-2 h-5 w-5" />
//               Run {selectedChecks.length} Checks
//             </>
//           )}
//         </button>
        
//         <div className="mt-4">
//           {localError && (
//             <div className="p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/50 text-red-700 dark:text-red-200">
//                 <AlertTriangle className="inline h-5 w-5 mr-2" />
//                 {localError}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* 💡 FIX 3: RESULTS COLUMN now takes 1 column (25%) */}
//       <div className="col-span-4 space-y-6">
//         <h3 className="text-xl font-bold dark:text-white">3. Validation Results Summary</h3>
        
//         {/* DOWNLOAD SUCCESS MESSAGE */}
//         {combinedStatus === 'complete' && qcResultMeta && (
//             <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg shadow border border-green-300">
//                 <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
//                     ✅ Processing Complete.
//                 </p>
//                 <button
//                     onClick={handleDownload}
//                     className="w-full flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-white text-sm font-semibold hover:bg-green-700"
//                 >
//                     <Download className="mr-2 h-4 w-4" />
//                     Download File ({qcResultMeta.name})
//                 </button>
//             </div>
//         )}

//         {/* --- DATA GRID TABLE VIEW (Uses RTK Query data) --- */}
//         {(combinedStatus !== 'idle' && !localError) && (
//           <div className={`h-[500px] w-full ${(!summaryData || summaryData.summaries?.length === 0) && combinedStatus === 'complete' ? 'hidden' : ''}`}>
//              {/* <DataGrid
//                 rows={summaryData?.summaries || mockSummary} // Use RTK Query data or mock
//                 columns={getSummaryColumns(isDarkMode)}
//                 // ... rest of DataGrid config
//              /> */}
//           </div>
//         )}
//         {/* --- END DATA GRID TABLE VIEW --- */}
        
//         {/* --- DOWNLOAD BUTTON (Final check, redundancy for visibility) --- */}
//         {combinedStatus === 'complete' && qcResultMeta && (
//             <button
//                 onClick={handleDownload}
//                 className="w-full flex items-center justify-center rounded-md bg-green-500 px-4 py-3 text-white font-semibold hover:bg-green-600 mt-4"
//             >
//                 <Download className="mr-2 h-5 w-5" />
//                 Download Processed QC File ({qcResultMeta.name})
//             </button>
//         )}
        
//         {/* "No issues detected" message */}
//         {combinedStatus === 'complete' && (summaryData?.summaries?.length === 0) && (
//             <div className="p-8 text-center bg-yellow-50 rounded-lg dark:bg-yellow-900/50 dark:text-yellow-200">
//                 No issues detected or no relevant checks were run.
//             </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ListView;

// ----------------------------------------------------------------------------------------------------------------------------------------------------

// import React, { useState, useEffect } from "react";
// import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader, Download } from "lucide-react";
// import { useAppSelector } from "@/app/redux"; 
// import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils"; 
// import { DataGrid, GridColDef } from "@mui/x-data-grid";

// // 💡 IMPORT useGetProjectsQuery to identify the current project
// import { 
//   useRunQcChecksMutation, 
//   useGetProjectsQuery, 
//   QcSummaryResult 
// } from "@/state/api"; 

// export interface QcRunResponse {
//     status: string;
//     message: string;
//     download_url: string;
//     summaries: QcSummaryResult[];
// }

// const getSummaryColumns = (isDarkMode: boolean): GridColDef[] => [
//   { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 250, sortable: false },
//   { field: 'action', headerName: 'Action Type', width: 120, sortable: false },
//   { 
//     field: 'status', headerName: 'Status', width: 120,
//     renderCell: (params) => {
//         const status = params.value as string;
//         const isSuccess = status === 'Completed' || status === 'Passed';
//         const color = isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
//         return (<span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${color}`}>{status}</span>);
//     }
//   },
//   { field: 'total_issues_flagged', headerName: 'Flag Count', width: 100 },
//   { field: 'id', headerName: 'ID', width: 50 },
// ];

// // --- 1. DEFINE DEFAULT CHECKS ---
// const defaultChecks = [
//   { key: "period_check", name: "Period Integrity Check ", type: "Audit" },
//   { key: "completeness_check", name: "Field Completeness Check", type: "Audit" },
//   { key: "overlap_duplicate_daybreak_check", name: "Overlap & Duplication Check", type: "Audit" },
//   { key: "program_category_check", name: "Program Category Consistency", type: "Audit" },
//   { key: "duration_check", name: "Start/End Duration Integrity", type: "Audit" },
//   { key: "rates_and_ratings_check", name: "Rates and Ratings Consistency", type: "Audit" },
//   { key: "duplicated_markets_check", name: "Market Duplicated Markets Cross-Check", type: "Audit" },
//   { key: "country_channel_id_check", name: "Country/Channel ID Consistency", type: "Audit" },
//   { key: "client_lstv_ott_check", name: "Client/LSTV/OTT Source Check", type: "Audit" },
//   { key: "check_event_matchday_competition", name: "Event Matchday Consistency", type: "Audit" },
// ];

// // --- 2. DEFINE FOOTBALL SPECIFIC CHECKS ---
// const footballChecks = [
//   { key: "ireland_uk_desc_copy", name: "Ireland to UK Desc Copy", type: "Football" },
//   { key: "lt_keyword_live_override", name: "L/T Keyword Live Override", type: "Football" },
//   { key: "gillette_soccer_consolidation", name: "Gillette Soccer Consolidation", type: "Football" },
//   { key: "cdt_ovn_check", name: "CDT/OVN Overnight Cross-Check", type: "Football" },
//   { key: "sky_showcase_repeat", name: "Sky Showcase (UK) Repeat Check", type: "Football" },
//   { key: "non_metered_audience_removal", name: "Non-Metered Audience Removal", type: "Football" },
//   { key: "soccer_sunday_consolidation", name: "Soccer Sunday Consolidation", type: "Football" },
//   { key: "uk_europe_region_correction", name: "UK/Europe Region Correction", type: "Football" },
//   { key: "vs_case_sensitivity", name: "VS Case Sensitivity (GMO vs UK)", type: "Football" },
//   { key: "pan_balkans_serbian_count", name: "Pan Balkans/Serbian Count", type: "Football" },
//   { key: "goal_rush_multimatch", name: "Goal Rush/Conference Multimatch", type: "Football" },
//   { key: "date_format_consistency", name: "Date Column Format Consistency", type: "Football" },
//   { key: "star_sports_live_check", name: "Star Sports 3 Live Logic", type: "Football" },
//   { key: "unique_live_match_constraint", name: "1 Market-Channel-Match Live Limit", type: "Football" },
//   { key: "channel_line_item_comparison", name: "Channel Line Item Count", type: "Football" },
//   { key: "archive_keyword_flag", name: "Archive Keyword Flagging", type: "Football" },
//   { key: "metered_audience_timeband", name: "Metered Audience Time Band", type: "Football" },
//   { key: "source_media_type_integrity", name: "Source/Media Type Integrity", type: "Football" },
//   { key: "uk_whistle_to_whistle", name: "UK Whistle to Whistle", type: "Football" },
//   { key: "naming_convention_bsa_aura", name: "Naming Convention (BSA/AURA)", type: "Football" },
//   { key: "delayed_current_matchdays", name: "Delayed Only for Current Matchdays", type: "Football" },
//   { key: "sa_nielsen_inclusion", name: "SA Nielsen Inclusion Check", type: "Football" },
//   { key: "duration_filter_5min", name: "<5 Minute Program Filter", type: "Football" },
//   { key: "live_vs_delay_validation", name: "EPL Live vs Delay Validation", type: "Football" },
//   { key: "custom_pl_program_type", name: "Custom PL Program Type", type: "Football" },
//   { key: "duration_alignment_check", name: "Dedicated Program Duration", type: "Football" },
//   { key: "uk_ireland_duplication", name: "UK-Ireland Duplication Check", type: "Football" },
//   { key: "ott_consolidation", name: "OTT Broadcast Consolidation", type: "Football" },
//   { key: "missing_live_games", name: "EPL Missing Live Games Check", type: "Football" },
// ];

// type ListViewProps = {
//   id: string; // This comes from the URL (e.g., "6")
//   setIsModalNewTaskOpen: (isOpen: boolean) => void;
// };

// const ListView = ({ id, setIsModalNewTaskOpen }: ListViewProps) => {
  
//   // --- 💡 RTK QUERY: Fetch Projects to identify if this is Football ---
//   const { data: projects } = useGetProjectsQuery();
  
//   // Find the current project based on the ID passed in props
//   // Note: projects IDs are numbers in your API, 'id' prop is string
//   const currentProject = projects?.find((p) => p.id === Number(id));
  
//   // Check if project is "Foot Ball" (ID 6 based on your dummy data)
//   const isFootballProject = currentProject?.id === 6 || currentProject?.name === "Foot Ball";

//   // Determine which checks to display
//   const availableChecks = isFootballProject ? footballChecks : defaultChecks;

//   // --- RTK QUERY: QC Mutation ---
//   const [runQc, { 
//     isLoading, 
//     isSuccess, 
//     isError, 
//     error, 
//     data: summaryData 
//   }] = useRunQcChecksMutation();

//   // --- FILE STATE ---
//   const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
//   const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
//   const [selectedDataFile, setSelectedDataFile] = useState<File | null>(null); 
//   const [selectedMacroFile, setSelectedMacroFile] = useState<File | null>(null); 

//   // --- PROCESSING & UI STATE ---
//   const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
//   const [processStatus, setProcessStatus] = useState<'idle' | 'complete' | 'error'>('idle');
//   const [localError, setLocalError] = useState<string | null>(null);
//   const [qcResultMeta, setQcResultMeta] = useState<{url: string, name: string} | null>(null);

//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

//   // Validate generic inputs
//   const isReadyToRun = selectedBSRFile && selectedRoscoFile && selectedChecks.length > 0;
//   const isProcessingComplete = processStatus === 'complete';
//   const combinedStatus = isLoading ? 'loading' : isProcessingComplete ? 'complete' : localError ? 'error' : 'idle';
  
//   // --- MOCK SUMMARY DATA (Fallback) ---
//   const mockSummary: QcSummaryResult[] = [
//     { id: 1, description: "Period Integrity Check", action: "Audit", status: "Completed", total_issues_flagged: 0 }, 
//     { id: 2, description: "Field Completeness Check", action: "Audit", status: "Issue Found", total_issues_flagged: 15 },
//   ];

//   // --- EFFECT: Handle Response ---
//   useEffect(() => {
//     if (isSuccess && summaryData) {
//       const response = summaryData as unknown as QcRunResponse;
//       setProcessStatus('complete');
//       setLocalError(null);
      
//       const urlParams = new URLSearchParams(response.download_url.split('?')[1]);
//       const filename = urlParams.get('filename') || "QC_Result.xlsx";

//       setQcResultMeta({
//          url: response.download_url,
//          name: filename
//       });

//     } else if (isError) {
//       setProcessStatus('error');
//       setLocalError(`❌ API Error: ${(error as any).data?.detail || 'Processing failed.'}`);
//       setQcResultMeta(null);
//     }
//   }, [isSuccess, isError, summaryData, error]);
    
//   // --- HANDLERS ---
//   const handleRunChecks = async () => {
//     if (!isReadyToRun || isLoading) return;
    
//     setProcessStatus('idle'); 
//     setLocalError(null);
//     setQcResultMeta(null); 

//     const formData = new FormData();
//     formData.append('rosco_file', selectedRoscoFile as File);
//     formData.append('bsr_file', selectedBSRFile as File);
//     if (selectedDataFile) { formData.append('data_file', selectedDataFile); }
//     if (selectedMacroFile) { formData.append('macro_file', selectedMacroFile); }
//     formData.append('selected_checks', JSON.stringify(selectedChecks));

//     try {
//       await runQc(formData).unwrap();
//     } catch (err) {
//       console.error("QC Check execution failed:", err);
//     }
//   };

//   const handleDownload = () => {
//     if (!qcResultMeta) return;
//     const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/';
//     const fullDownloadUrl = new URL(qcResultMeta.url, baseUrl).href;
//     window.location.href = fullDownloadUrl;
//   };
  
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'bsr' | 'rosco' | 'data' | 'macro') => {
//     const file = event.target.files?.[0];
//     if (fileType === 'bsr') setSelectedBSRFile(file || null);
//     else if (fileType === 'rosco') setSelectedRoscoFile(file || null);
//     else if (fileType === 'data') setSelectedDataFile(file || null); 
//     else if (fileType === 'macro') setSelectedMacroFile(file || null); 
//   };

//   const handleCheckToggle = (key: string) => {
//     setSelectedChecks(prev => 
//       prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
//     );
//   };

//   // 💡 HELPER: Select All Logic
//   const handleSelectAll = () => {
//     if (selectedChecks.length === availableChecks.length) {
//       setSelectedChecks([]);
//     } else {
//       setSelectedChecks(availableChecks.map(c => c.key));
//     }
//   };

//   return (
//     <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 w-full">
      
//       {/* COLUMN 1: INPUTS */}
//       <div className="col-span-1 xl:col-span-4 rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
        
//         {/* Dynamic Header for Context */}
//         <h2 className="mb-4 text-2xl font-bold dark:text-white">
//           {isFootballProject ? "⚽ Football QC Portal" : "Standard Audit QC Portal"}
//         </h2>

//         <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
            
//             {/* LEFT SIDE: CHECKLIST */}
//             <div className="flex-1 space-y-4 pt-0">
//                 <div className="flex justify-between items-center">
//                     <h3 className="text-xl font-bold dark:text-white">Select Checks</h3>
//                     <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:underline">
//                         {selectedChecks.length === availableChecks.length ? "Deselect All" : "Select All"}
//                     </button>
//                 </div>

//                 <div className="max-h-96 space-y-2 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded p-2">
//                   {/* 💡 MAP OVER THE CONDITIONALLY SELECTED LIST */}
//                   {availableChecks.map((check) => (
//                     <div key={check.key} className="flex items-center justify-between rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <label className="flex items-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedChecks.includes(check.key)}
//                           onChange={() => handleCheckToggle(check.key)}
//                           className="form-checkbox h-4 w-4 text-blue-600 rounded"
//                         />
//                         <span className="ml-3 text-sm dark:text-gray-200">{check.name}</span>
//                       </label>
//                       <span className={`text-xs px-2 py-0.5 rounded-full 
//                         ${check.type === 'Football' 
//                             ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
//                             : 'bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-300'}`}>
//                         {check.type}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//             </div>

//             {/* RIGHT SIDE: FILE UPLOADS */}
//             <div className="flex-1 space-y-4 pt-0">
//                 <h3 className="text-xl font-bold dark:text-white">QC File Selection</h3>
                
//                 {/* File Inputs Row 1 */}
//                 <div className="flex space-x-4">
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">BSR Data File (Mandatory)</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-4 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/50 h-full">
//                             <FileText className="h-8 w-8 text-blue-600" />
//                             <p className="mt-2 text-sm text-blue-600 dark:text-blue-300 text-center">{selectedBSRFile ? selectedBSRFile.name : "Upload BSR (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'bsr')} />
//                         </label>
//                     </div>
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Rosco File (Mandatory)</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-4 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/50 h-full">
//                             <FileText className="h-8 w-8 text-green-600" />
//                             <p  className="mt-2 text-sm text-green-600 dark:text-green-300 text-center">{selectedRoscoFile ? selectedRoscoFile.name : "Upload Rosco (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'rosco')} />
//                         </label>
//                     </div>
//                 </div>

//                 {/* File Inputs Row 2 */}
//                 <div className="flex space-x-4 pt-4"> 
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Client Data File (Optional)</p>
//                         <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
//                             ${selectedDataFile ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
//                             <FileText className={`h-8 w-8 ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'}`} />
//                             <p className={`mt-2 text-sm text-center ${selectedDataFile ? 'text-yellow-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedDataFile ? selectedDataFile.name : "Upload Client Data (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'data')} />
//                         </label>
//                     </div>
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">Macro File (Optional)</p>
//                         <label className={`flex flex-col items-center justify-center p-4 cursor-pointer rounded-lg border-2 border-dashed h-full
//                             ${selectedMacroFile ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
//                             <FileText className={`h-8 w-8 ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'}`} />
//                             <p className={`mt-2 text-sm text-center ${selectedMacroFile ? 'text-purple-700' : 'text-gray-500'} dark:text-gray-400`}>{selectedMacroFile ? selectedMacroFile.name : "Upload Macro (.xlsm)"}</p>
//                             <input type="file" className="hidden" accept=".xlsm" onChange={(e) => handleFileChange(e, 'macro')} />
//                         </label>
//                     </div>
//                 </div>
//             </div>
//         </div>

//         {/* RUN BUTTON */}
//         <button
//           onClick={handleRunChecks}
//           disabled={!isReadyToRun || combinedStatus === 'loading'}
//           className="w-full flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white font-semibold hover:bg-blue-600 disabled:bg-gray-400 mt-4"
//         >
//           {combinedStatus === 'loading' ? (
//             <>
//               <Loader className="mr-2 h-5 w-5 animate-spin" />
//               Running {isFootballProject ? 'Football' : 'Audit'} Checks...
//             </>
//           ) : combinedStatus === 'complete' ? (
//             <>
//               <CheckCircle className="mr-2 h-5 w-5" />
//               Checks Successful!
//             </>
//           ) : (
//             <>
//               <FileText className="mr-2 h-5 w-5" />
//               Run {selectedChecks.length} Checks
//             </>
//           )}
//         </button>
        
//         <div className="mt-4">
//           {localError && (
//             <div className="p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/50 text-red-700 dark:text-red-200">
//                 <AlertTriangle className="inline h-5 w-5 mr-2" />
//                 {localError}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* RESULTS COLUMN */}
//       <div className="col-span-4 space-y-6">
//         <h3 className="text-xl font-bold dark:text-white">3. Validation Results Summary</h3>
        
//         {combinedStatus === 'complete' && qcResultMeta && (
//             <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg shadow border border-green-300">
//                 <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
//                     ✅ Processing Complete.
//                 </p>
//                 <button
//                     onClick={handleDownload}
//                     className="w-full flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-white text-sm font-semibold hover:bg-green-700"
//                 >
//                     <Download className="mr-2 h-4 w-4" />
//                     Download File ({qcResultMeta.name})
//                 </button>
//             </div>
//         )}

//         {(combinedStatus !== 'idle' && !localError) && (
//           <div className={`h-[500px] w-full ${(!summaryData || summaryData.summaries?.length === 0) && combinedStatus === 'complete' ? 'hidden' : ''}`}>
//               <DataGrid
//                   rows={summaryData?.summaries || mockSummary} 
//                   columns={getSummaryColumns(isDarkMode)} 
//                   getRowId={(row) => row.id} 
//                   initialState={{
//                       pagination: { paginationModel: { pageSize: 7 } },
//                   }}
//                   pageSizeOptions={[5, 7, 10]}
//                   disableRowSelectionOnClick
//                   className={dataGridClassNames}
//                   sx={dataGridSxStyles(isDarkMode)} 
//               />
//           </div>
//         )}
        
//         {combinedStatus === 'complete' && qcResultMeta && (
//             <button
//                 onClick={handleDownload}
//                 className="w-full flex items-center justify-center rounded-md bg-green-500 px-4 py-3 text-white font-semibold hover:bg-green-600 mt-4"
//             >
//                 <Download className="mr-2 h-5 w-5" />
//                 Download Processed QC File ({qcResultMeta.name})
//             </button>
//         )}
        
//         {combinedStatus === 'complete' && (summaryData?.summaries?.length === 0) && (
//             <div className="p-8 text-center bg-yellow-50 rounded-lg dark:bg-yellow-900/50 dark:text-yellow-200">
//                 No issues detected or no relevant checks were run.
//             </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ListView;

import React, { useState, useEffect } from "react";
import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader, Download } from "lucide-react";
import { useAppSelector } from "@/app/redux"; 
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils"; 
import { DataGrid, GridColDef } from "@mui/x-data-grid";

import { 
  useRunQcChecksMutation, 
  useRunMarketChecksMutation, 
  useGetProjectsQuery, 
  QcRunResponse 
} from "@/state/api";

// ----------------------------------------------------------------------
// 1. DEFINE CHECK LISTS (Configuration)
// ----------------------------------------------------------------------

// --- ⚽ FOOTBALL (EPL) ---
const footballChecks = [
  // --- Original & Previous Keys ---
  { key: "impute_lt_live_status", name: "L/T Keyword Live Override", type: "EPL" },
  { key: "consolidate_gillete_soccer", name: "Gillette Soccer Consolidation", type: "EPL" },
  { key: "check_sky_showcase_live", name: "Sky Showcase (UK) Repeat Check", type: "EPL" },
  { key: "standardize_uk_ire_region", name: "UK/Europe Region Correction", type: "EPL" },
  { key: "check_fixture_vs_case", name: "VS Case Sensitivity", type: "EPL" },
  { key: "check_pan_balkans_serbia_parity", name: "Pan Balkans/Serbian Count", type: "EPL" },
  { key: "audit_multi_match_status", name: "Goal Rush/Conference Multimatch", type: "EPL" },
  { key: "check_date_time_format_integrity", name: "Date Format Consistency", type: "EPL" },
  { key: "check_live_broadcast_uniqueness", name: "1 Market-Channel-Match Live Limit", type: "EPL" },
  { key: "audit_channel_line_item_count", name: "Channel Line Item Count", type: "EPL" },
  { key: "check_combined_archive_status", name: "Archive Keyword Flagging", type: "EPL" },
  { key: "suppress_duplicated_audience", name: "Non-Metered Audience Removal", type: "EPL" },
  { key: "harmonize_uk_ire_program_descriptions_strict", name: "Ireland to UK Desc Copy", type: "EPL" },
  { key: "audit_ovn_whistle_to_whistle", name: "UK Whistle to Whistle", type: "EPL" },
  { key: "check_game_of_the_day_match", name: "Game of the Day Match Check", type: "EPL" },
  { key: "check_non_metered_primary_market_audience", name: "Non-Metered Primary Audience", type: "EPL" },
  { key: "check_legacy_mapping", name: "Legacy Mapping Check", type: "EPL" },
  { key: "check_premier_league_october_obligation", name: "Premier League Oct Obligation", type: "EPL" },
  { key: "filter_short_programs", name: "Short Program Filter", type: "EPL" },
  { key: "check_star_sports_3_consolidation", name: "Star Sports 3 Consolidation", type: "EPL" },
  { key: "check_bsa_nielsen_audience_presence", name: "BSA Nielsen Audience Check", type: "EPL" },
  { key: "audit_uk_ire_volume_consistency", name: "UK/IRE Volume Consistency", type: "EPL" },

  // --- NEWLY ADDED (From Python Dictionary) ---
  { key: "check_source_mediatype_validity", name: "Source/MediaType Validity", type: "EPL" },
  { key: "sa_nielsen_inclusion_check", name: "SA Nielsen Inclusion Check", type: "EPL" },
  { key: "epl_live_vs_delay_validation", name: "EPL Live vs Delay Validation", type: "EPL" },
  { key: "pl_magazine_highlights_classification", name: "PL Mag/Highlights Classification", type: "EPL" },
  { key: "audit_uk_ire_duplication_alignment", name: "UK/IRE Duplication Alignment", type: "EPL" },
  { key: "audit_ott_broadcast_consolidation", name: "OTT Broadcast Consolidation", type: "EPL" },
  { key: "check_missing_live_games", name: "Missing Live Games Check", type: "EPL" }
];

// --- 🏎️ FORMULA 1 ---
const f1Checks = [
  // --- Integrity / Review Checks ---
    { key: "check_italy_mexico", name: "Channel/Market Duplication Check", type: "F1" },
    { key: "check_f1_obligations", name: "F1 Broadcaster Obligation Check", type: "F1" },
    { key: "duration_limits", name: "Duration Limits (5m-5h) Check", type: "F1" },
    { key: "live_date_integrity", name: "Live Session Date Integrity", type: "F1" },
    { key: "check_session_completeness", name: "Session Count Completeness", type: "F1" },
    { key: "update_audience_from_overnight", name: "Update Audience from Overnight Max", type: "F1" },
    { key: "apply_duplication_weights", name: "Apply Market Duplication Weights", type: "F1" },

    // --- Removal Checks ---
    { key: "remove_andorra", name: "Remove Andorra Data", type: "F1" },
    { key: "remove_serbia", name: "Remove Serbia Data", type: "F1" },
    { key: "remove_montenegro", name: "Remove Montenegro Data", type: "F1" },
    { key: "remove_brazil_espn_fox", name: "Remove Brazil ESPN/FOX Duplicates", type: "F1" },
  ];

// --- 🎾 TENNIS ---
const tennisChecks = [
  { key: "check_set_scores", name: "Set Score Validation", type: "Tennis" },
  { key: "audit_tie_break_rules", name: "Tie-Break Rule Check", type: "Tennis" },
  { key: "check_player_seedings", name: "Player Seeding Integrity", type: "Tennis" },
  { key: "validate_grand_slam_points", name: "Grand Slam Points Check", type: "Tennis" },
];

// --- 📝 STANDARD / DEFAULT ---
const defaultChecks = [
  { key: "period_check", name: "Period Integrity Check", type: "Audit" },
  { key: "completeness_check", name: "Field Completeness Check", type: "Audit" },
  
  // Added based on your backend code
  { key: "overlap_duplicate_daybreak_check", name: "Overlap, Duplicate & Daybreak Analysis", type: "Laliga" },
  { key: "program_category_check", name: "Program Category & Duration Logic", type: "Laliga" },
  { key: "check_event_matchday_competition", name: "Event & Matchday Fixture Validation", type: "Laliga" },
  { key: "market_channel_consistency_check", name: "Market & Channel Consistency (ROSCO)", type: "Laliga" },
 ];

// ----------------------------------------------------------------------
// 2. COLUMN DEFINITIONS
// ----------------------------------------------------------------------
const getSummaryColumns = (isDarkMode: boolean): GridColDef[] => [
  { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 250, sortable: false },
  { 
    field: 'action', 
    headerName: 'Check Key', 
    width: 220, 
    valueGetter: (value: any, row: any) => row.action || row.check_key || 'Unknown Check'
  },
  { 
    field: 'status', 
    headerName: 'Status', 
    width: 140,
    renderCell: (params) => {
        const status = params.value as string;
        let color = 'bg-gray-100 text-gray-800';
        if (['Completed', 'Passed', 'OK', 'Success'].includes(status)) color = 'bg-green-100 text-green-800';
        else if (['Flagged', 'Issue Found', 'Failed', 'Error'].includes(status)) color = 'bg-red-100 text-red-800';
        else if (status === 'Skipped') color = 'bg-yellow-100 text-yellow-800';
        
        return (
            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${color}`}>
                {status}
            </span>
        );
    }
  },
  { 
    field: 'total_issues_flagged', 
    headerName: 'Flag Count', 
    width: 120,
    valueGetter: (value: any, row: any) => row.details?.rows_flagged ?? 0
  },
  { 
    field: 'market', 
    headerName: 'Market',
    width: 120,
    valueGetter: (value: any, row: any) => row.details?.market || '-'
  }
];

// ----------------------------------------------------------------------
// 3. MAIN COMPONENT
// ----------------------------------------------------------------------

type ListViewProps = {
  id: string; 
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const ListView = ({ id, setIsModalNewTaskOpen }: ListViewProps) => {
  
  // --- IDENTIFY PROJECT ---
  const { data: projects } = useGetProjectsQuery();
  const currentProject = projects?.find((p) => p.id === Number(id));
  const projectName = currentProject?.name || "";

  // ⭐️ LOGIC: Select Check List based on Project Name ⭐️
  let availableChecks = defaultChecks;
  let isMarketProject = false; // "Market" projects use the new Python BSR Validator logic

  if (projectName === "Foot Ball" || projectName === "EPL") {
      availableChecks = footballChecks;
      isMarketProject = true;
  } else if (projectName === "Formula 1") {
      availableChecks = f1Checks;
      isMarketProject = true;
  } else if (projectName === "Tennis") {
      availableChecks = tennisChecks;
      isMarketProject = true;
  } else {
      // Default / Standard Audit
      availableChecks = defaultChecks;
      isMarketProject = false;
  }

  // --- RTK QUERY MUTATIONS ---
  // 1. Standard QC (Old Logic)
  const [runStandardQc, { 
    isLoading: isStandardLoading, 
    data: standardData,
    error: standardError,
    isSuccess: isStandardSuccess 
  }] = useRunQcChecksMutation();

  // 2. Market QC (New Logic: Football, F1, Tennis)
  const [runMarketQc, { 
    isLoading: isMarketLoading, 
    data: marketData,
    error: marketError,
    isSuccess: isMarketSuccess
  }] = useRunMarketChecksMutation();

  // Unified State
  const isLoading = isStandardLoading || isMarketLoading;
  const isSuccess = isStandardSuccess || isMarketSuccess;
  const error = standardError || marketError;
  const summaryData = isMarketProject ? marketData : standardData;

  // --- UI STATE ---
  const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
  const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null);
  const [selectedDataFile, setSelectedDataFile] = useState<File | null>(null);
  const [selectedMacroFile, setSelectedMacroFile] = useState<File | null>(null); 

  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [processStatus, setProcessStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [qcResultMeta, setQcResultMeta] = useState<{url: string, name: string} | null>(null);

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // --- VALIDATION ---
  // For Market Projects (Football/F1/Tennis), only BSR & Checks are strictly mandatory
  const isReadyToRun = isMarketProject 
    ? (selectedBSRFile && selectedChecks.length > 0) 
    : (selectedBSRFile && selectedRoscoFile); // Standard usually needs Rosco

  const combinedStatus = isLoading ? 'loading' : processStatus === 'complete' ? 'complete' : localError ? 'error' : 'idle';

  // --- EFFECT: Handle Response ---
  useEffect(() => {
    if (isSuccess && summaryData) {
      const response = summaryData as unknown as QcRunResponse;
      setProcessStatus('complete');
      setLocalError(null);
      
      if (response.download_url) {
          // Fix URL parsing to be safe
          try {
             const urlPart = response.download_url.split('?')[1];
             const urlParams = new URLSearchParams(urlPart);
             const filename = urlParams.get('filename') || "Processed_Result.xlsx";
             setQcResultMeta({ url: response.download_url, name: filename });
          } catch (e) {
             setQcResultMeta({ url: response.download_url, name: "Processed_Result.xlsx" });
          }
      }

    } else if (error) {
      setProcessStatus('error');
      setLocalError(`❌ API Error: ${(error as any).data?.detail || 'Processing failed.'}`);
      setQcResultMeta(null);
    }
  }, [isSuccess, summaryData, error]);

  // --- EFFECT: Reset Selected Checks when Project Changes ---
  useEffect(() => {
      setSelectedChecks([]);
      setProcessStatus('idle');
      setLocalError(null);
      setQcResultMeta(null);
      // Optional: Auto-select all checks when switching projects
      // setSelectedChecks(availableChecks.map(c => c.key));
  }, [id, projectName]);

  // --- HANDLERS ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'bsr' | 'rosco' | 'data' | 'macro') => {
    const file = event.target.files?.[0];
    if (fileType === 'bsr') setSelectedBSRFile(file || null);
    else if (fileType === 'rosco') setSelectedRoscoFile(file || null);
    else if (fileType === 'data') setSelectedDataFile(file || null); 
    else if (fileType === 'macro') setSelectedMacroFile(file || null); 
  };

  const handleCheckToggle = (key: string) => {
    setSelectedChecks(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedChecks.length === availableChecks.length) {
      setSelectedChecks([]);
    } else {
      setSelectedChecks(availableChecks.map(c => c.key));
    }
  };

  const handleRunChecks = async () => {
    if (!isReadyToRun || isLoading) return;
    
    setProcessStatus('idle'); 
    setLocalError(null);
    setQcResultMeta(null); 

    const formData = new FormData();

    try {
        if (isMarketProject) {
            // --- SCENARIO A: MARKET QC (Football, F1, Tennis) ---
            formData.append('bsr_file', selectedBSRFile as File);
            if (selectedRoscoFile) formData.append('obligation_file', selectedRoscoFile);
            if (selectedDataFile) formData.append('overnight_file', selectedDataFile);
            if (selectedMacroFile) formData.append('macro_file', selectedMacroFile);

            selectedChecks.forEach(checkKey => formData.append('checks', checkKey));
            formData.append('check_configs', JSON.stringify({})); 

            await runMarketQc(formData).unwrap();

        } else {
            // --- SCENARIO B: STANDARD QC ---
            formData.append('bsr_file', selectedBSRFile as File);
            formData.append('rosco_file', selectedRoscoFile as File); 
            if (selectedDataFile) formData.append('data_file', selectedDataFile);

            await runStandardQc(formData).unwrap();
        }

    } catch (err) {
      console.error("Execution failed:", err);
    }
  };

  const handleDownload = () => {
    if (!qcResultMeta) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/';
    // Handle cases where download_url might already contain the base URL or not
    const finalUrl = qcResultMeta.url.startsWith('http') 
        ? qcResultMeta.url 
        : new URL(qcResultMeta.url, baseUrl).href;
    
    window.location.href = finalUrl;
  };

  // ----------------------------------------------------------------------
  // 4. RENDER
  // ----------------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 w-full">
      {/* COLUMN 1: INPUTS */}
      <div className="col-span-1 xl:col-span-4 rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
        
        <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
             {/* LEFT: CHECKS */}
             <div className="flex-1 space-y-4 pt-0">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-white">
                        {projectName} Checks
                    </h3>
                    <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:underline">
                        {selectedChecks.length === availableChecks.length ? "Deselect All" : "Select All"}
                    </button>
                </div>
                
                {/* Scrollable Check List */}
                <div className="max-h-96 space-y-2 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded p-2">
                  {availableChecks.length > 0 ? availableChecks.map((check) => (
                    <div key={check.key} className="flex items-center justify-between rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedChecks.includes(check.key)}
                          onChange={() => handleCheckToggle(check.key)}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 text-sm dark:text-gray-200">{check.name}</span>
                      </label>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isMarketProject ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-500'}`}>
                        {check.type}
                      </span>
                    </div>
                  )) : (
                      <p className="text-sm text-gray-500 p-4">No checks configured for this project type.</p>
                  )}
                </div>
            </div>

            {/* RIGHT: FILES */}
            <div className="flex-1 space-y-4 pt-0">
                <h3 className="text-xl font-bold dark:text-white">QC File Selection</h3>
                 <div className="flex space-x-4">
                    <div className="flex-1">
                        <p className="font-medium text-gray-700 dark:text-gray-300">BSR Data File (Mandatory)</p>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-4 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/50 h-full">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <p className="mt-2 text-sm text-blue-600 dark:text-blue-300 text-center">{selectedBSRFile ? selectedBSRFile.name : "Upload BSR (.xlsx)"}</p>
                            <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'bsr')} />
                        </label>
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-700 dark:text-gray-300">{isMarketProject ? "Obligation File" : "Rosco File"}</p>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-4 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/50 h-full">
                            <FileText className="h-8 w-8 text-green-600" />
                            <p  className="mt-2 text-sm text-green-600 dark:text-green-300 text-center">{selectedRoscoFile ? selectedRoscoFile.name : "Upload File"}</p>
                            <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'rosco')} />
                        </label>
                    </div>
                </div>
                {/* Row 2 */}
                <div className="flex space-x-4 pt-4">
                     <div className="flex-1">
                        <p className="font-medium text-gray-700 dark:text-gray-300">{isMarketProject ? "Overnight File (Opt)" : "Client Data (Opt)"}</p>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-yellow-300 p-4 cursor-pointer rounded-lg bg-yellow-50 dark:bg-yellow-950/50 h-full">
                            <FileText className="h-8 w-8 text-yellow-600" />
                            <p  className="mt-2 text-sm text-yellow-600 dark:text-yellow-300 text-center">{selectedDataFile ? selectedDataFile.name : "Upload File"}</p>
                            <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'data')} />
                        </label>
                    </div>
                    {isMarketProject && (
                         <div className="flex-1">
                            <p className="font-medium text-gray-700 dark:text-gray-300">Macro File (Opt)</p>
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 p-4 cursor-pointer rounded-lg bg-purple-50 dark:bg-purple-950/50 h-full">
                                <FileText className="h-8 w-8 text-purple-600" />
                                <p  className="mt-2 text-sm text-purple-600 dark:text-purple-300 text-center">{selectedMacroFile ? selectedMacroFile.name : "Upload Macro"}</p>
                                <input type="file" className="hidden" accept=".xlsm" onChange={(e) => handleFileChange(e, 'macro')} />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RUN BUTTON */}
        <button
          onClick={handleRunChecks}
          disabled={!isReadyToRun || combinedStatus === 'loading'}
          className="w-full flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white font-semibold hover:bg-blue-600 disabled:bg-gray-400 mt-4"
        >
          {combinedStatus === 'loading' ? (
            <>
              <Loader className="mr-2 h-5 w-5 animate-spin" />
              Running...
            </>
          ) : combinedStatus === 'complete' ? (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              {isMarketProject ? `Executed ${selectedChecks.length} Market Checks` : "Standard QC Complete"}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Run {projectName} Checks
            </>
          )}
        </button>
        
        {/* Error Display */}
        {localError && (
             <div className="mt-4 p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/50 text-red-700 dark:text-red-200">
                <AlertTriangle className="inline h-5 w-5 mr-2" />
                {localError}
            </div>
        )}
      </div>

      {/* RESULTS COLUMN */}
      <div className="col-span-4 space-y-6">
        <h3 className="text-xl font-bold dark:text-white">Validation Results Summary</h3>
        
        {/* Results DataGrid */}
        {(combinedStatus !== 'idle' && !localError) && (
          <div className={`h-[500px] w-full ${(!summaryData?.summaries || summaryData.summaries.length === 0) && combinedStatus === 'complete' ? 'hidden' : ''}`}>
              <DataGrid
                  rows={summaryData?.summaries || []} 
                  columns={getSummaryColumns(isDarkMode)} 
                  getRowId={(row) => row.id || Math.random()} 
                  initialState={{ pagination: { paginationModel: { pageSize: 7 } } }}
                  pageSizeOptions={[5, 7, 10]}
                  disableRowSelectionOnClick
                  className={dataGridClassNames}
                  sx={dataGridSxStyles(isDarkMode)} 
              />
          </div>
        )}

        {/* Download Button */}
        {combinedStatus === 'complete' && qcResultMeta && (
            <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center rounded-md bg-green-500 px-4 py-3 text-white font-semibold hover:bg-green-600 mt-4"
            >
                <Download className="mr-2 h-5 w-5" />
                Download Result ({qcResultMeta.name})
            </button>
        )}
      </div>
    </div>
  );
};

export default ListView;

// import React, { useState, useEffect } from "react";
// import { Upload, X, CheckCircle, AlertTriangle, FileText, Loader, Download } from "lucide-react";
// import { useAppSelector } from "@/app/redux"; 
// import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils"; 
// import { DataGrid, GridColDef } from "@mui/x-data-grid";

// // 💡 IMPORT BOTH MUTATIONS
// import { 
//   useRunQcChecksMutation, 
//   useRunMarketChecksMutation, // <-- NEW IMPORT
//   useGetProjectsQuery, 
//   QcSummaryResult,
//   QcRunResponse // Ensure this type matches your API response structure
// } from "@/state/api";



// const getSummaryColumns = (isDarkMode: boolean): GridColDef[] => [
//   { 
//     field: 'description', 
//     headerName: 'Description', 
//     flex: 1.5, 
//     minWidth: 250, 
//     sortable: false 
//   },
//   { 
//     field: 'action', 
//     headerName: 'Check Key', 
//     width: 220, 
//     sortable: false,
//     // 💡 FIX: Use (value, row) signature for MUI v6+
//     valueGetter: (value: any, row: any) => {
//         return row.action || row.check_key || 'Unknown Check';
//     }
//   },
//   { 
//     field: 'status', 
//     headerName: 'Status', 
//     width: 140,
//     renderCell: (params) => {
//         const status = params.value as string;
//         let color = 'bg-gray-100 text-gray-800';
        
//         // Match Python backend status strings
//         if (['Completed', 'Passed', 'OK', 'Success'].includes(status)) {
//             color = 'bg-green-100 text-green-800';
//         } else if (['Flagged', 'Issue Found', 'Failed', 'Error'].includes(status)) {
//             color = 'bg-red-100 text-red-800';
//         } else if (status === 'Skipped') {
//             color = 'bg-yellow-100 text-yellow-800';
//         }
        
//         return (
//             <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${color}`}>
//                 {status}
//             </span>
//         );
//     }
//   },
//   { 
//     field: 'total_issues_flagged', 
//     headerName: 'Flag Count', 
//     width: 120,
//     // 💡 FIX: Access nested details using 'row' (2nd argument)
//     valueGetter: (value: any, row: any) => {
//         // Backend sends: { details: { rows_flagged: 5 } }
//         return row.details?.rows_flagged ?? 0;
//     }
//   },
//   { 
//     field: 'market', 
//     headerName: 'Market',
//     width: 120,
//     // 💡 FIX: Access nested details using 'row'
//     valueGetter: (value: any, row: any) => {
//         return row.details?.market || '-';
//     }
//   }
// ];

// // --- 1. STANDARD CHECKS (Visual only, backend runs all) ---
// const defaultChecks = [
//   { key: "period_check", name: "Period Integrity Check ", type: "Audit" },
//   { key: "completeness_check", name: "Field Completeness Check", type: "Audit" },
//   // ... rest of your standard checks
// ];

// // --- 2. ⚽ FOOTBALL CHECKS (Sent to backend) ---
// // Keys must match backend EPL_CHECK_KEYS or BSR check keys exactly
// const footballChecks = [
//   // --- Original & Previous Keys ---
//   { key: "impute_lt_live_status", name: "L/T Keyword Live Override", type: "EPL" },
//   { key: "consolidate_gillete_soccer", name: "Gillette Soccer Consolidation", type: "EPL" },
//   { key: "check_sky_showcase_live", name: "Sky Showcase (UK) Repeat Check", type: "EPL" },
//   { key: "standardize_uk_ire_region", name: "UK/Europe Region Correction", type: "EPL" },
//   { key: "check_fixture_vs_case", name: "VS Case Sensitivity", type: "EPL" },
//   { key: "check_pan_balkans_serbia_parity", name: "Pan Balkans/Serbian Count", type: "EPL" },
//   { key: "audit_multi_match_status", name: "Goal Rush/Conference Multimatch", type: "EPL" },
//   { key: "check_date_time_format_integrity", name: "Date Format Consistency", type: "EPL" },
//   { key: "check_live_broadcast_uniqueness", name: "1 Market-Channel-Match Live Limit", type: "EPL" },
//   { key: "audit_channel_line_item_count", name: "Channel Line Item Count", type: "EPL" },
//   { key: "check_combined_archive_status", name: "Archive Keyword Flagging", type: "EPL" },
//   { key: "suppress_duplicated_audience", name: "Non-Metered Audience Removal", type: "EPL" },
//   { key: "harmonize_uk_ire_program_descriptions_strict", name: "Ireland to UK Desc Copy", type: "EPL" },
//   { key: "audit_ovn_whistle_to_whistle", name: "UK Whistle to Whistle", type: "EPL" },
//   { key: "check_game_of_the_day_match", name: "Game of the Day Match Check", type: "EPL" },
//   { key: "check_non_metered_primary_market_audience", name: "Non-Metered Primary Audience", type: "EPL" },
//   { key: "check_legacy_mapping", name: "Legacy Mapping Check", type: "EPL" },
//   { key: "check_premier_league_october_obligation", name: "Premier League Oct Obligation", type: "EPL" },
//   { key: "filter_short_programs", name: "Short Program Filter", type: "EPL" },
//   { key: "check_star_sports_3_consolidation", name: "Star Sports 3 Consolidation", type: "EPL" },
//   { key: "check_bsa_nielsen_audience_presence", name: "BSA Nielsen Audience Check", type: "EPL" },
//   { key: "audit_uk_ire_volume_consistency", name: "UK/IRE Volume Consistency", type: "EPL" },

//   // --- NEWLY ADDED (From Python Dictionary) ---
//   { key: "check_source_mediatype_validity", name: "Source/MediaType Validity", type: "EPL" },
//   { key: "sa_nielsen_inclusion_check", name: "SA Nielsen Inclusion Check", type: "EPL" },
//   { key: "epl_live_vs_delay_validation", name: "EPL Live vs Delay Validation", type: "EPL" },
//   { key: "pl_magazine_highlights_classification", name: "PL Mag/Highlights Classification", type: "EPL" },
//   { key: "audit_uk_ire_duplication_alignment", name: "UK/IRE Duplication Alignment", type: "EPL" },
//   { key: "audit_ott_broadcast_consolidation", name: "OTT Broadcast Consolidation", type: "EPL" },
//   { key: "check_missing_live_games", name: "Missing Live Games Check", type: "EPL" }
// ];

// type ListViewProps = {
//   id: string; 
//   setIsModalNewTaskOpen: (isOpen: boolean) => void;
// };

// const ListView = ({ id, setIsModalNewTaskOpen }: ListViewProps) => {
  
//   // --- IDENTIFY PROJECT ---
//   const { data: projects } = useGetProjectsQuery();
//   const currentProject = projects?.find((p) => p.id === Number(id));
  
//   // Logic to identify if this is the EPL project
//   const isFootballProject = currentProject?.id === 6 || currentProject?.name === "Foot Ball" || currentProject?.name === "Formula 1";

//   const availableChecks = isFootballProject ? footballChecks : defaultChecks;

//   // --- RTK QUERY MUTATIONS ---
//   // 1. Standard QC Mutation
//   const [runStandardQc, { 
//     isLoading: isStandardLoading, 
//     data: standardData,
//     error: standardError,
//     isSuccess: isStandardSuccess 
//   }] = useRunQcChecksMutation();

//   // 2. Market (Football) QC Mutation
//   const [runMarketQc, { 
//     isLoading: isMarketLoading, 
//     data: marketData,
//     error: marketError,
//     isSuccess: isMarketSuccess
//   }] = useRunMarketChecksMutation();

//   // Unified State
//   const isLoading = isStandardLoading || isMarketLoading;
//   const isSuccess = isStandardSuccess || isMarketSuccess;
//   const error = standardError || marketError;
//   const summaryData = isFootballProject ? marketData : standardData;

//   // --- UI STATE ---
//   const [selectedBSRFile, setSelectedBSRFile] = useState<File | null>(null);
//   const [selectedRoscoFile, setSelectedRoscoFile] = useState<File | null>(null); // Acts as 'Obligation' for Football
//   const [selectedDataFile, setSelectedDataFile] = useState<File | null>(null);   // Acts as 'Overnight' for Football
//   const [selectedMacroFile, setSelectedMacroFile] = useState<File | null>(null); 

//   const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
//   const [processStatus, setProcessStatus] = useState<'idle' | 'complete' | 'error'>('idle');
//   const [localError, setLocalError] = useState<string | null>(null);
//   const [qcResultMeta, setQcResultMeta] = useState<{url: string, name: string} | null>(null);

//   const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

//   // --- VALIDATION ---
//   // For Football, BSR is mandatory. For Standard, BSR & Rosco usually mandatory.
//   const isReadyToRun = isFootballProject 
//     ? (selectedBSRFile && selectedChecks.length > 0) 
//     : (selectedBSRFile && selectedRoscoFile);

//   const combinedStatus = isLoading ? 'loading' : processStatus === 'complete' ? 'complete' : localError ? 'error' : 'idle';
  
//   // --- RESPONSE HANDLING ---
//   useEffect(() => {
//     if (isSuccess && summaryData) {
//       const response = summaryData as unknown as QcRunResponse;
//       setProcessStatus('complete');
//       setLocalError(null);
      
//       // Handle download URL
//       if (response.download_url) {
//           const urlParams = new URLSearchParams(response.download_url.split('?')[1]);
//           const filename = urlParams.get('filename') || "Processed_Result.xlsx";
//           setQcResultMeta({ url: response.download_url, name: filename });
//       }

//     } else if (error) {
//       setProcessStatus('error');
//       setLocalError(`❌ API Error: ${(error as any).data?.detail || 'Processing failed.'}`);
//       setQcResultMeta(null);
//     }
//   }, [isSuccess, summaryData, error]);
    
//   // --- 🚀 MAIN EXECUTION HANDLER ---
//   const handleRunChecks = async () => {
//     if (!isReadyToRun || isLoading) return;
    
//     setProcessStatus('idle'); 
//     setLocalError(null);
//     setQcResultMeta(null); 

//     const formData = new FormData();

//     try {
//         if (isFootballProject) {
//             // --- SCENARIO A: FOOTBALL (Selected Checks Only) ---
            
//             // 1. Append Files (Mapped to backend expected names)
//             formData.append('bsr_file', selectedBSRFile as File);
//             if (selectedRoscoFile) formData.append('obligation_file', selectedRoscoFile);
//             if (selectedDataFile) formData.append('overnight_file', selectedDataFile);
//             if (selectedMacroFile) formData.append('macro_file', selectedMacroFile);

//             // 2. ⭐️ APPEND CHECKS INDIVIDUALLY for FastAPI List[str] = Form(...)
//             // DO NOT JSON.stringify here. Append same key multiple times.
//             selectedChecks.forEach(checkKey => {
//                 formData.append('checks', checkKey);
//             });

//             // 3. Optional Config
//             formData.append('check_configs', JSON.stringify({})); 

//             // 4. Call Market Mutation
//             await runMarketQc(formData).unwrap();

//         } else {
//             // --- SCENARIO B: STANDARD (All Checks) ---
            
//             // 1. Append Files
//             formData.append('bsr_file', selectedBSRFile as File);
//             formData.append('rosco_file', selectedRoscoFile as File); // Standard calls it 'rosco'
//             if (selectedDataFile) formData.append('data_file', selectedDataFile);

//             // 2. Call Standard Mutation
//             await runStandardQc(formData).unwrap();
//         }

//     } catch (err) {
//       console.error("Execution failed:", err);
//     }
//   };

//   const handleDownload = () => {
//     if (!qcResultMeta) return;
//     const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/';
//     const fullDownloadUrl = new URL(qcResultMeta.url, baseUrl).href;
//     window.location.href = fullDownloadUrl;
//   };
  
//   // ... File Change, Toggle, Select All Handlers (Same as before) ...
//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'bsr' | 'rosco' | 'data' | 'macro') => {
//     const file = event.target.files?.[0];
//     if (fileType === 'bsr') setSelectedBSRFile(file || null);
//     else if (fileType === 'rosco') setSelectedRoscoFile(file || null);
//     else if (fileType === 'data') setSelectedDataFile(file || null); 
//     else if (fileType === 'macro') setSelectedMacroFile(file || null); 
//   };

//   const handleCheckToggle = (key: string) => {
//     setSelectedChecks(prev => 
//       prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
//     );
//   };

//   const handleSelectAll = () => {
//     if (selectedChecks.length === availableChecks.length) {
//       setSelectedChecks([]);
//     } else {
//       setSelectedChecks(availableChecks.map(c => c.key));
//     }
//   };

//   return (
//     <div className="grid grid-cols-1 gap-8 xl:grid-cols-4 w-full">
//       {/* COLUMN 1: INPUTS */}
//       <div className="col-span-1 xl:col-span-4 rounded-lg bg-white p-6 shadow dark:bg-dark-secondary">
//         {/* <h2 className="mb-4 text-2xl font-bold dark:text-white">
//           {isFootballProject ? "⚽ Football EPL QC Portal" : "Standard Audit QC Portal"}
//         </h2> */}

//         {/* ... FILE UPLOAD UI (Same as previous) ... */}
//         {/* I'm keeping the structure concise here, insert your JSX from previous step */}
//         <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
//              {/* LEFT: CHECKS */}
//              <div className="flex-1 space-y-4 pt-0">
//                 <div className="flex justify-between items-center">
//                     <h3 className="text-xl font-bold dark:text-white">Select Checks</h3>
//                     <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:underline">
//                         {selectedChecks.length === availableChecks.length ? "Deselect All" : "Select All"}
//                     </button>
//                 </div>
//                 <div className="max-h-96 space-y-2 overflow-y-auto pr-2 border border-gray-200 dark:border-gray-700 rounded p-2">
//                   {availableChecks.map((check) => (
//                     <div key={check.key} className="flex items-center justify-between rounded-md p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
//                       <label className="flex items-center">
//                         <input
//                           type="checkbox"
//                           checked={selectedChecks.includes(check.key)}
//                           onChange={() => handleCheckToggle(check.key)}
//                           className="form-checkbox h-4 w-4 text-blue-600 rounded"
//                         />
//                         <span className="ml-3 text-sm dark:text-gray-200">{check.name}</span>
//                       </label>
//                       <span className={`text-xs px-2 py-0.5 rounded-full ${check.type === 'Football' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-500'}`}>
//                         {check.type}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//             </div>

//             {/* RIGHT: FILES */}
//             <div className="flex-1 space-y-4 pt-0">
//                 <h3 className="text-xl font-bold dark:text-white">QC File Selection</h3>
//                 {/* File inputs logic ... ensure naming context matches (Rosco -> Obligation for football) */}
//                  <div className="flex space-x-4">
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">BSR Data File (Mandatory)</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 p-4 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-950/50 h-full">
//                             <FileText className="h-8 w-8 text-blue-600" />
//                             <p className="mt-2 text-sm text-blue-600 dark:text-blue-300 text-center">{selectedBSRFile ? selectedBSRFile.name : "Upload BSR (.xlsx)"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'bsr')} />
//                         </label>
//                     </div>
//                     <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">{isFootballProject ? "Obligation File" : "Rosco File"}</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 p-4 cursor-pointer rounded-lg bg-green-50 dark:bg-green-950/50 h-full">
//                             <FileText className="h-8 w-8 text-green-600" />
//                             <p  className="mt-2 text-sm text-green-600 dark:text-green-300 text-center">{selectedRoscoFile ? selectedRoscoFile.name : "Upload File"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'rosco')} />
//                         </label>
//                     </div>
//                 </div>
//                 {/* Row 2 */}
//                 <div className="flex space-x-4 pt-4">
//                      <div className="flex-1">
//                         <p className="font-medium text-gray-700 dark:text-gray-300">{isFootballProject ? "Overnight File (Opt)" : "Client Data (Opt)"}</p>
//                         <label className="flex flex-col items-center justify-center border-2 border-dashed border-yellow-300 p-4 cursor-pointer rounded-lg bg-yellow-50 dark:bg-yellow-950/50 h-full">
//                             <FileText className="h-8 w-8 text-yellow-600" />
//                             <p  className="mt-2 text-sm text-yellow-600 dark:text-yellow-300 text-center">{selectedDataFile ? selectedDataFile.name : "Upload File"}</p>
//                             <input type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e, 'data')} />
//                         </label>
//                     </div>
//                     {isFootballProject && (
//                          <div className="flex-1">
//                             <p className="font-medium text-gray-700 dark:text-gray-300">Macro File (Opt)</p>
//                             <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 p-4 cursor-pointer rounded-lg bg-purple-50 dark:bg-purple-950/50 h-full">
//                                 <FileText className="h-8 w-8 text-purple-600" />
//                                 <p  className="mt-2 text-sm text-purple-600 dark:text-purple-300 text-center">{selectedMacroFile ? selectedMacroFile.name : "Upload Macro"}</p>
//                                 <input type="file" className="hidden" accept=".xlsm" onChange={(e) => handleFileChange(e, 'macro')} />
//                             </label>
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>

//         {/* RUN BUTTON */}
//         <button
//           onClick={handleRunChecks}
//           disabled={!isReadyToRun || combinedStatus === 'loading'}
//           className="w-full flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white font-semibold hover:bg-blue-600 disabled:bg-gray-400 mt-4"
//         >
//           {combinedStatus === 'loading' ? (
//             <>
//               <Loader className="mr-2 h-5 w-5 animate-spin" />
//               Running...
//             </>
//           ) : combinedStatus === 'complete' ? (
//             <>
//               <CheckCircle className="mr-2 h-5 w-5" />
//               {isFootballProject ? `Executed ${selectedChecks.length} Market Checks` : "Standard QC Complete"}
//             </>
//           ) : (
//             <>
//               <FileText className="mr-2 h-5 w-5" />
//               Run Selected Checks
//             </>
//           )}
//         </button>
        
//         {/* Error Display */}
//         {localError && (
//              <div className="mt-4 p-4 text-center bg-red-100 rounded-lg dark:bg-red-900/50 text-red-700 dark:text-red-200">
//                 <AlertTriangle className="inline h-5 w-5 mr-2" />
//                 {localError}
//             </div>
//         )}
//       </div>

//       {/* RESULTS COLUMN */}
//       <div className="col-span-4 space-y-6">
//         <h3 className="text-xl font-bold dark:text-white">3. Validation Results Summary</h3>
        
//         {/* Results DataGrid */}
//         {(combinedStatus !== 'idle' && !localError) && (
//           <div className={`h-[500px] w-full ${(!summaryData?.summaries || summaryData.summaries.length === 0) && combinedStatus === 'complete' ? 'hidden' : ''}`}>
//               <DataGrid
//                   rows={summaryData?.summaries || []} 
//                   columns={getSummaryColumns(isDarkMode)} 
//                   getRowId={(row) => row.id || Math.random()} 
//                   initialState={{ pagination: { paginationModel: { pageSize: 7 } } }}
//                   pageSizeOptions={[5, 7, 10]}
//                   disableRowSelectionOnClick
//                   className={dataGridClassNames}
//                   sx={dataGridSxStyles(isDarkMode)} 
//               />
//           </div>
//         )}

//         {/* Download Button */}
//         {combinedStatus === 'complete' && qcResultMeta && (
//             <button
//                 onClick={handleDownload}
//                 className="w-full flex items-center justify-center rounded-md bg-green-500 px-4 py-3 text-white font-semibold hover:bg-green-600 mt-4"
//             >
//                 <Download className="mr-2 h-5 w-5" />
//                 Download Result ({qcResultMeta.name})
//             </button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ListView;