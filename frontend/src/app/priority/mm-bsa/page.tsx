"use client";

import { useState } from "react";
import "./mm-bsa.css";
// 1. Import both hooks from your API slice
import { 
  useRunMmBsaQcMutation, 
  useLazyDownloadFixtureTemplateQuery 
} from "@/state/api";

const QC_CHECKS = [
  { id: "duplicate_aid_final", title: "Duplicate AID Check" },
  { id: "audience_spotprice_check", title: "Audience & Spot Price Check" },
  { id: "program_category_check_mm", title: "Program Category Check" },
  { id: "channel_country_mapping_check", title: "Channel & Country Mapping" },
  { id: "apt_bt_check", title: "APT / BT Check" },
  { id: "season_monitoring_check", title: "Season Monitoring Check" },
  { id: "fixture_validation_check", title: "Event / Matchday Validation Check" },
  { id: "stadium_consistency_check", title: "Stadium Consistency Check" },
  { id: "event_quality_check", title: "Event Quality Check" },
  { id: "home_market_check", title: "Home Market Check" },
  { id: "ps_market_channel_check", title: "PS Market & Channel Check" },
  { id: "ps_content_check", title: "PS Content Check" },
  { id: "mm_bsr_consistency_check", title: "MM vs BSR Consistency Check" },
  { id: "audience_spot_range_clean_view", title: "Audience & Spot Price Range Check" },
  { id: "ea_creation_check", title: "EA Creation Check" },
  { id: "previous_delivery_check", title: "Previous Delivery Consistency Check" },
];

export default function Page() {
  const [adaptFile, setAdaptFile] = useState<File | null>(null);
  const [roscoFile, setRoscoFile] = useState<File | null>(null);
  const [fixtureFile, setFixtureFile] = useState<File | null>(null);
  const [previous_delivery_file, setPreviousDeliveryFile] = useState<File | null>(null);
  const [bsr_file, setBsrFile] = useState<File | null>(null);
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [btThreshold, setBtThreshold] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // 2. Initialize the RTK Query hooks
  const [runMmBsaQc, { isLoading: loading }] = useRunMmBsaQcMutation();
  const [triggerDownloadTemplate, { isFetching: downloadingTemplate }] = useLazyDownloadFixtureTemplateQuery();

  const allSelected = selectedChecks.length === QC_CHECKS.length;

  const toggleCheck = (id: string) => {
    setSelectedChecks((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedChecks(allSelected ? [] : QC_CHECKS.map((c) => c.id));
  };

  // 3. New function to handle the template download via Redux
  const handleDownloadTemplate = async () => {
    try {
      const blob = await triggerDownloadTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fixture_template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url); // Clean up memory
    } catch (error: any) {
      console.error(error);
      alert(error?.data?.detail || JSON.stringify(error));
    }
  };

  const runChecks = async () => {
    if (!adaptFile) {
      alert("Upload Adapt Export file");
      return;
    }

    if (selectedChecks.length === 0) {
      alert("Select at least one check");
      return;
    }
    if (
      selectedChecks.includes("fixture_validation_check") &&
      !fixtureFile
    ) {
      alert("Please upload fixture file");
      return;
    }

    if (selectedChecks.includes("ps_market_channel_check") || selectedChecks.includes("ps_content_check")) {
      if (!roscoFile) {
        alert("Please upload ROSCO file");
        return;
      }
    }

    if (selectedChecks.includes("mm_bsr_consistency_check") || selectedChecks.includes("mm_bsr_consistency_check")){
      if (!bsr_file) {
        alert("Please upload BSR file");
        return;
      }
    }

    if (selectedChecks.includes("previous_delivery_check")){
      if (!previous_delivery_file) {
        alert("Please upload Previous Delivery file");
        return;
      }   
    }

    const formData = new FormData();
    formData.append("adapt_file", adaptFile);
    formData.append("selected_checks", JSON.stringify(selectedChecks));

    if (fixtureFile) formData.append("fixture_file", fixtureFile);
    if (roscoFile) formData.append("rosco_file", roscoFile);
    if (btThreshold) formData.append("bt_threshold", btThreshold);
    if (startDate) formData.append("start_date", startDate);
    if (endDate) formData.append("end_date", endDate);
    if (bsr_file) formData.append("bsr_file", bsr_file);
    if (previous_delivery_file) formData.append("previous_delivery_file", previous_delivery_file);

    try {
      const blob = await runMmBsaQc(formData).unwrap();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error:any) {
      // RTK Query errors usually look like: { status: 500, data: { detail: "..." } }
      const errorMessage = error.data?.detail || "An unknown error occurred";
      console.error("Backend Error:", error);
      alert(`Error: ${errorMessage}`);
    }
  };

  const ready = adaptFile && roscoFile;

  return (
    <div className="mm-wrapper">
      <div className="mm-container">

        {/* HEADER */}
        <div className="mm-header-row">
          <h1 className="mm-title">📊 MM Checks</h1>

          <button
            className="mm-btn small"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
          >
            📥 {downloadingTemplate ? "Downloading..." : "Fixture Template"}
          </button>
        </div>

        {/* UPLOAD */}
        <div className="mm-row">
          <div className="mm-upload small">
            <input type="file" onChange={(e) => setAdaptFile(e.target.files?.[0] || null)} />
            <p>📂 Upload Adapt Export</p>
          </div>

          <div className="mm-upload small">
            <input type="file" onChange={(e) => setRoscoFile(e.target.files?.[0] || null)} />
            <p>📑 Upload Rosco Summary</p>
          </div>

          <div className="mm-upload small">
            <input type="file" onChange={(e) => setFixtureFile(e.target.files?.[0] || null)} />
            <p>📋 Upload Fixture File</p>
          </div>

          <div className="mm-upload small">
            <input type="file" onChange={(e) => setPreviousDeliveryFile(e.target.files?.[0] || null)} />
            <p>📋 Upload Previous Delivery File</p>
          </div>

          <div className="mm-upload small">
            <input type="file" onChange={(e) => setBsrFile(e.target.files?.[0] || null)} />
            <p>📋 Upload BSR File</p>
          </div>


        </div>

        {/* CHECKS */}
        <div className="mm-card">
          <h3 className="mm-section-title">⚙️ Validation Rules</h3>

          <div className="mm-check-item">
            <label>
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              <strong> Select All Checks</strong>
            </label>
          </div>

          {QC_CHECKS.map((c) => (
            <div key={c.id} className="mm-check-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedChecks.includes(c.id)}
                  onChange={() => toggleCheck(c.id)}
                />
                {c.title}
              </label>
            </div>
          ))}
        </div>

        {/* DATE + BT */}
        <div className="mm-card">
          <h3 className="mm-section-title">📅 Monitoring Period</h3>

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mm-input" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mm-input" />
          </div>

          <h3 className="mm-section-title">⏱️ Highest BT Threshold</h3>

          <input
            type="number"
            value={btThreshold}
            onChange={(e) => setBtThreshold(e.target.value)}
            className="mm-input"
          />
        </div>

        {/* BUTTONS */}
        <div className="mm-actions">
          <button
            onClick={runChecks}
            disabled={!ready || selectedChecks.length === 0 || loading}
            className="mm-btn"
          >
            🚀 {loading ? "Running..." : "Run Checks"}
          </button>

          {downloadUrl && (
            <button
              className="mm-btn success"
              onClick={() => {
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = "MM_BSA_QC_Output.xlsx";
                a.click();
              }}
            >
              📥 Download
            </button>
          )}
        </div>

      </div>
    </div>
  );
}