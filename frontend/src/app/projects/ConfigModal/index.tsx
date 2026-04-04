// import Modal from "@/components/Modal"; // Adjust path based on your project structure
// import { Settings2, Save } from "lucide-react";
// import React, { useState, useEffect } from "react";

// // ✅ Updated to control Program Category tolerance instead of Overlap
// export type QcConfig = {
//   live_tolerance_min: number;
// };

// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
//   currentConfig: QcConfig;
//   onSave: (newConfig: QcConfig) => void;
// };

// const ConfigModal = ({ isOpen, onClose, currentConfig, onSave }: Props) => {
//   // Local state for the modal form
//   const [localConfig, setLocalConfig] = useState<QcConfig>(currentConfig);

//   // Reset local state when modal opens to ensure it matches parent
//   useEffect(() => {
//     if (isOpen) setLocalConfig(currentConfig);
//   }, [isOpen, currentConfig]);

//   const handleSave = () => {
//     onSave(localConfig);
//     onClose();
//   };

//   const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

//   return (
//     <Modal isOpen={isOpen} onClose={onClose} name="Run Configuration">
//       <div className="mt-4 space-y-6">
//         {/* Header inside Modal */}
//         <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 pb-2 border-b border-gray-100 dark:border-gray-700">
//            <Settings2 size={18} />
//            <h3 className="font-bold text-sm uppercase tracking-wider">QC Logic Overrides</h3>
//         </div>

//         {/* --- LIVE TOLERANCE SETTING --- */}
//         <div>
//            <div className="flex justify-between mb-2">
//              <label className={labelStyles}>Live Match Tolerance</label>
//              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
//                {localConfig.live_tolerance_min} min
//              </span>
//            </div>
           
//            <input
//              type="range"
//              min="5"
//              max="120"
//              step="5"
//              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
//              value={localConfig.live_tolerance_min}
//              onChange={(e) => setLocalConfig({ ...localConfig, live_tolerance_min: parseInt(e.target.value) })}
//            />
           
//            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
//              <span>Strict (5m)</span>
//              <span>Lenient (120m)</span>
//            </div>
           
//            <p className="text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
//              ℹ️ Defines the allowed time difference between the <strong>BSR Start Time</strong> and the <strong>Fixture Kick-off</strong>. 
//              <br/>
//              <br/>
//              If the difference is within <strong>{localConfig.live_tolerance_min} minutes</strong>, it is classified as <span className="font-bold text-green-600">LIVE</span>. Otherwise, it may be flagged as Delayed or Repeat.
//            </p>
//         </div>

//         {/* Footer Actions */}
//         <div className="pt-4 flex gap-3">
//           <button
//             onClick={onClose}
//             className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSave}
//             className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-md transition-all active:scale-95"
//           >
//             <Save size={16} /> Save Configuration
//           </button>
//         </div>
//       </div>
//     </Modal>
//   );
// };

// export default ConfigModal;

import Modal from "@/components/Modal";
import { Settings2, Save } from "lucide-react";
import React, { useState, useEffect } from "react";

// ✅ FINAL CONFIG TYPE
export type QcConfig = {
  live_tolerance_min?: number;
  highlight_tolerance_min?: number; // NOW ACTIVE
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: QcConfig;
  onSave: (newConfig: QcConfig) => void;
};

const ConfigModal = ({ isOpen, onClose, currentConfig, onSave }: Props) => {
  const [localConfig, setLocalConfig] = useState<QcConfig>(currentConfig);

  useEffect(() => {
    if (isOpen) setLocalConfig(currentConfig);
  }, [isOpen, currentConfig]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const labelStyles =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Run Configuration">
      <div className="mt-4 space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 pb-2 border-b border-gray-100 dark:border-gray-700">
          <Settings2 size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">
            QC Logic Overrides
          </h3>
        </div>

        {/* ================= LIVE TOLERANCE ================= */}
        <div>
          <div className="flex justify-between mb-2">
            <label className={labelStyles}>Live Match Tolerance</label>
            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
              {localConfig.live_tolerance_min} min
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="120"
            step="5"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
            value={localConfig.live_tolerance_min || 60}
            onChange={(e) =>
              setLocalConfig({
                ...localConfig,
                live_tolerance_min: parseInt(e.target.value),
              })
            }
          />

          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
            <span>Strict (5m)</span>
            <span>Lenient (120m)</span>
          </div>

          <p className="text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
            ℹ️ Defines allowed difference between BSR Start and Fixture Kick-off.
            <br />
            Within <strong>{localConfig.live_tolerance_min} mins</strong> = LIVE.
          </p>
        </div>

        {/* ================= HIGHLIGHT TOLERANCE ================= */}
        <div>
          <div className="flex justify-between mb-2">
            <label className={labelStyles}>
              Highlight Duration Tolerance
            </label>

            <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
  {localConfig.highlight_tolerance_min
    ? '${localConfig.highlight_tolerance_min} min'
    : "OFF"}
</span>
          </div>

          <input
            type="range"
            min="5"
            max="120"
            step="5"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-600"
            value={localConfig.highlight_tolerance_min || 0}
            onChange={(e) =>
              setLocalConfig({
                ...localConfig,
                highlight_tolerance_min:
                  parseInt(e.target.value) === 0
                    ? undefined
                    : parseInt(e.target.value),
              })
            }
          />

          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
            <span>Strict (5m)</span>
            <span>Lenient (120m)</span>
          </div>

          <p className="text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
            ℹ️ Maximum allowed duration for Highlights.
            <br />
            {localConfig.highlight_tolerance_min ? (
              <>
                Programs ≤{" "}
                <strong>{localConfig.highlight_tolerance_min} mins</strong> → Valid
              </>
            ) : (
              <>No validation applied (OFF)</>
            )}
          </p>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-md transition-all active:scale-95"
          >
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfigModal;
