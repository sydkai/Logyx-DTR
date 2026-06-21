import { useState } from "react";
import { useLeave } from "../context/LeaveContext"; // ← shared state

// ── Design tokens — LOGYX theme ───────────────────────────────────────────────
const C = {
  bg:       "var(--bg, #07100a)",
  surface:  "var(--surface, #0d160f)",
  border:   "var(--border, #1a3020)",
  accent:   "var(--accent, #00e5a0)",
  text:     "var(--text, #ddeedd)",
  muted:    "var(--muted, #567858)",
  red:      "#ef4444",
  inputBg:  "#070b07",
};

const syne = "'Syne', sans-serif";
const mono = "'Courier New', monospace";

const inputBase = {
  backgroundColor: C.inputBg,
  border: `1px solid ${C.border}`,
  borderRadius: "6px",
  color: C.text,
  fontFamily: mono,
  fontSize: "12px",
  padding: "9px 12px",
  width: "100%",
  outline: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2300e5a0' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

// ── Primitives ────────────────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return (
    <div style={{
      fontFamily: syne, fontSize: "0.62rem", fontWeight: 700,
      letterSpacing: "0.15em", textTransform: "uppercase",
      color: C.muted, marginBottom: "6px",
    }}>{text}</div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <SectionLabel text={label} />
      {children}
    </div>
  );
}

function Divider({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: C.accent, flexShrink: 0 }} />
      <span style={{ fontFamily: syne, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ── Leave Request Form ────────────────────────────────────────────────────────

export default function LeavePage() {
  // ↓ Pull submitLeave from shared context — submissions go to LeaveEvaluation
  const { submitLeave } = useLeave();

  const blank = { empId: "", name: "", dateFrom: "", dateTo: "", leaveType: "", subtype: "", remarks: "" };
  const [form, setForm]       = useState(blank);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: false }));
  };

  const validate = () => {
    const req = ["empId", "name", "dateFrom", "dateTo", "leaveType", "subtype"];
    const newErr = {};
    req.forEach(k => { if (!form[k]) newErr[k] = true; });
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitLeave({ ...form });
      setSuccess(true);
      setForm(blank);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || err.message || "Could not submit leave request. Check your connection to the office server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const err = (k) => errors[k] ? { borderColor: C.red } : {};
 

  return (
    <>
      <style>{`
        input::placeholder, textarea::placeholder { color: #1f3825; }
        input:focus, select:focus, textarea:focus {
          border-color: var(--accent, #00e5a0) !important;
          box-shadow: 0 0 0 2px rgba(0,229,160,0.08) !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.4) sepia(1) saturate(3) hue-rotate(100deg); cursor: pointer;
        }
        select option { background-color: #070b07; color: #ddeedd; }
        button:hover { opacity: 0.88; }
      `}</style>

      <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
        <div style={{ padding: "28px 40px", maxWidth: "860px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

          {/* Page header */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: syne, fontSize: "0.65rem", fontWeight: 700,
              letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: "6px",
            }}>
              <span style={{ width: 6, height: 6, background: C.accent, borderRadius: "50%", display: "inline-block" }} />
              Leave Request
            </div>
            <div style={{ fontFamily: syne, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.05em", color: C.text }}>
              File a Leave
            </div>
          </div>

          {/* Error banner */}
          {submitError && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px", padding: "12px 16px", marginBottom: "18px",
              color: C.red, fontFamily: mono, fontSize: "0.78rem", letterSpacing: "0.04em",
            }}>
              ✗ {submitError}
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div style={{
              background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.3)",
              borderRadius: "8px", padding: "12px 16px", marginBottom: "18px",
              color: C.accent, fontFamily: mono, fontSize: "0.78rem", letterSpacing: "0.04em",
            }}>
              ✓ Leave request submitted — awaiting admin approval.
            </div>
          )}

          {/* Employee Information */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px 22px", marginBottom: "14px" }}>
            <Divider title="Employee Information" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Employee #">
                <input style={{ ...inputBase, ...err("empId") }} placeholder="e.g. RAIF-RDU-02-02-24" value={form.empId} onChange={set("empId")} />
              </Field>
              <Field label="Full Name">
                <input style={{ ...inputBase, ...err("name") }} placeholder="Enter full name" value={form.name} onChange={set("name")} />
              </Field>
            </div>
          </div>

          {/* Leave Details */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px 22px", marginBottom: "14px" }}>
            <Divider title="Leave Details" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <Field label="Type of Leave">
                <select
                  style={{ ...inputBase, backgroundImage: chevronSvg, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px", cursor: "pointer", ...err("leaveType") }}
                  value={form.leaveType} onChange={set("leaveType")}
                >
                  <option value="">— Select —</option>
                  <option value="with-pay">Leave w/ Pay</option>
                  <option value="without-pay">Leave w/o Pay</option>
                </select>
              </Field>
              <Field label="Leave Subtype">
                <select
                  style={{ ...inputBase, backgroundImage: chevronSvg, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "28px", cursor: "pointer", ...err("subtype") }}
                  value={form.subtype} onChange={set("subtype")}
                >
                  <option value="">— Select —</option>
                  <option value="vacation">Vacation Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Date From">
                <input type="date" style={{ ...inputBase, colorScheme: "dark", ...err("dateFrom") }} value={form.dateFrom} onChange={set("dateFrom")} />
              </Field>
              <Field label="Date To">
                <input type="date" style={{ ...inputBase, colorScheme: "dark", ...err("dateTo") }} value={form.dateTo} onChange={set("dateTo")} />
              </Field>
            </div>
          </div>

          {/* Remarks */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px 22px", marginBottom: "20px" }}>
            <Divider title="Remarks" />
            <textarea
              style={{ ...inputBase, minHeight: "90px", resize: "vertical", lineHeight: "1.7" }}
              placeholder="State your reason for filing this leave request..."
              value={form.remarks} onChange={set("remarks")}
            />
          </div>

          <button onClick={handleSubmit} disabled={submitting} style={{
            display: "block", width: "100%", cursor: submitting ? "wait" : "pointer",
            background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.3)",
            color: C.accent, fontFamily: syne, fontSize: "0.78rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", padding: "14px",
            borderRadius: "10px", transition: "background 0.2s",
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "Submitting…" : "► Submit Leave Request"}
          </button>
        </div>
      </div>
    </>
  );
}
