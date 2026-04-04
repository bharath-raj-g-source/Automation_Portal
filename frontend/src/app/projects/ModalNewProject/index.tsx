// import Modal from "@/components/Modal";
// import { useCreateProjectMutation } from "@/state/api";
// import React, { useState } from "react";
// import { formatISO } from "date-fns";

// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
// };

// const ModalNewProject = ({ isOpen, onClose }: Props) => {
//   const [createProject, { isLoading }] = useCreateProjectMutation();
//   const [projectName, setProjectName] = useState("");
//   const [description, setDescription] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   const handleSubmit = async () => {
//     if (!projectName || !startDate || !endDate) return;

//     const formattedStartDate = formatISO(new Date(startDate), {
//       representation: "complete",
//     });
//     const formattedEndDate = formatISO(new Date(endDate), {
//       representation: "complete",
//     });

//     await createProject({
//       name: projectName,
//       description,
//       startDate: formattedStartDate,
//       endDate: formattedEndDate,
//     });
//   };

//   const isFormValid = () => {
//     return projectName && description && startDate && endDate;
//   };

//   const inputStyles =
//     "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

//   return (
//     <Modal isOpen={isOpen} onClose={onClose} name="New Config">
//       <form
//         className="mt-4 space-y-6"
//         onSubmit={(e) => {
//           e.preventDefault();
//           handleSubmit();
//         }}
//       >
//         <input
//           type="text"
//           className={inputStyles}
//           placeholder="Project Name"
//           value={projectName}
//           onChange={(e) => setProjectName(e.target.value)}
//         />
//         <textarea
//           className={inputStyles}
//           placeholder="Description"
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//         />
//         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
//           <input
//             type="date"
//             className={inputStyles}
//             value={startDate}
//             onChange={(e) => setStartDate(e.target.value)}
//           />
//           <input
//             type="date"
//             className={inputStyles}
//             value={endDate}
//             onChange={(e) => setEndDate(e.target.value)}
//           />
//         </div>
//         <button
//           type="submit"
//           className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
//             !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
//           }`}
//           disabled={!isFormValid() || isLoading}
//         >
//           {isLoading ? "Creating..." : "Create Project"}
//         </button>
//       </form>
//     </Modal>
//   );
// };

// export default ModalNewProject;


"use client";

import Modal from "@/components/Modal";
import { useCreateProjectMutation } from "@/state/api";
import React, { useState } from "react";
import { formatISO } from "date-fns";
import { Settings2, Clock, ShieldCheck } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// Default QC Configurations
const DEFAULT_QC_CONFIG = {
  overlap_threshold_min: 60,
  short_program_threshold_min: 5,
  daybreak_hour: 0,
};

const ModalNewProject = ({ isOpen, onClose }: Props) => {
  const [createProject, { isLoading }] = useCreateProjectMutation();
  
  // Basic Info State
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 💡 QC Config State
  const [qcConfig, setQcConfig] = useState(DEFAULT_QC_CONFIG);

  const handleConfigChange = (param: string, value: number) => {
    setQcConfig((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!projectName || !startDate || !endDate) return;

    const formattedStartDate = formatISO(new Date(startDate), {
      representation: "complete",
    });
    const formattedEndDate = formatISO(new Date(endDate), {
      representation: "complete",
    });

    await createProject({
      name: projectName,
      description,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      // 💡 Pass the config as a stringified JSON or structured object 
      // depending on your backend schema
      // qcConfig: JSON.stringify(qcConfig), 
    });
    
    onClose();
  };

  const isFormValid = () => {
    return projectName && description && startDate && endDate;
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Project Config">
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* --- BASIC DETAILS --- */}
        <div className="space-y-3">
          <input
            type="text"
            className={inputStyles}
            placeholder="Project Name (e.g. EPL Season 2026)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <textarea
            className={inputStyles}
            placeholder="Project Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelStyles}>Start Date</label>
              <input
                type="date"
                className={inputStyles}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyles}>End Date</label>
              <input
                type="date"
                className={inputStyles}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* --- QC CONFIGURATION SECTION --- */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
          <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
            <Settings2 size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider">QC Logic Overrides</h3>
          </div>

          <div className="space-y-5">
            {/* Overlap Threshold */}
            <div>
              <div className="flex justify-between mb-1">
                <label className={labelStyles}>Max Overlap Allowed (Mins)</label>
                <span className="text-xs font-bold text-blue-600">{qcConfig.overlap_threshold_min} min</span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="5"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                value={qcConfig.overlap_threshold_min}
                onChange={(e) => handleConfigChange("overlap_threshold_min", parseInt(e.target.value))}
              />
              <p className="text-[10px] text-gray-500 mt-1 italic">Programs overlapping more than this will be flagged.</p>
            </div>

            {/* Short Program Threshold */}
            <div>
              <div className="flex justify-between mb-1">
                <label className={labelStyles}>Short Program Limit (Mins)</label>
                <span className="text-xs font-bold text-blue-600">{qcConfig.short_program_threshold_min} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                value={qcConfig.short_program_threshold_min}
                onChange={(e) => handleConfigChange("short_program_threshold_min", parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`mt-6 flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : "active:scale-95"
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
               <Clock className="animate-spin" size={18} /> Initializing Project...
            </span>
          ) : (
            "Create Project & Save Config"
          )}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewProject;