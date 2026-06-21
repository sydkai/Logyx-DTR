import { useState } from "react";
import { useLeave } from "../context/LeaveContext";

// ── Design tokens — LOGYX theme ───────────────────────────────────────────────
const C = {
  bg:      "var(--bg, #07100a)",
  surface: "var(--surface, #0d160f)",
  border:  "var(--border, #1a3020)",
  accent:  "var(--accent, #00e5a0)",
  text:    "var(--text, #ddeedd)",
  muted:   "var(--muted, #567858)",
  dim:     "#1f3825",
  warn:    "var(--warn, #f59e0b)",
  red:     "#ef4444",
  inputBg: "#070b07",
};

const syne = "'Syne', sans-serif";
const mono = "'Courier New', monospace";

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }) {
  const map = {
    pending:  { bg: "rgba(245,158,11,0.1)",  bd: "rgba(245,158,11,0.3)",  fg: C.warn   },
    approved: { bg: "rgba(0,229,160,0.08)",  bd: "rgba(0,229,160,0.3)",   fg: C.accent },
    rejected: { bg: "rgba(239,68,68,0.08)",  bd: "rgba(239,68,68,0.3)",   fg: C.red    },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg,
      padding: "3px 10px", borderRadius: "20px",
      fontFamily: syne, fontSize: "0.6rem", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
    }}>{status}</span>
  );
}

// ── Remarks modal ─────────────────────────────────────────────────────────────

function RemarksModal({ request, onClose }) {
  if (!request) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(7,16,10,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "28px 32px", maxWidth: 480, width: "90%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: syne, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>Remarks from</div>
            <div style={{ fontFamily: syne, fontSize: "1rem", fontWeight: 800, color: C.text }}>{request.name}</div>
            <div style={{ fontFamily: mono, fontSize: "0.72rem", color: C.accent, marginTop: 2 }}>{request.empId}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, padding: 0, lineHeight: 1, fontFamily: mono }} aria-label="Close">✕</button>
        </div>
        <div style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "14px 16px", fontFamily: mono, fontSize: "0.78rem", color: C.text, lineHeight: 1.7, minHeight: 80 }}>
          {request.remarks || <span style={{ color: C.muted }}>— No remarks provided —</span>}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 14, fontFamily: mono, fontSize: "0.68rem", color: C.muted }}>
          <span><span style={{ color: C.muted }}>FROM </span><span style={{ color: C.text }}>{request.dateFrom}</span></span>
          <span><span style={{ color: C.muted }}>TO </span><span style={{ color: C.text }}>{request.dateTo}</span></span>
          <span><span style={{ color: C.muted }}>TYPE </span><span style={{ color: C.accent }}>{request.subtype || request.leaveType}</span></span>
        </div>
        <button onClick={onClose} style={{ marginTop: 20, width: "100%", padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "8px", fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ action, request, onConfirm, onCancel }) {
  if (!request || !action) return null;
  const isApprove = action === "approve";
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(7,16,10,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${isApprove ? "rgba(0,229,160,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "12px", padding: "28px 32px", maxWidth: 400, width: "90%", boxSizing: "border-box", textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontSize: "2rem", marginBottom: 12, color: isApprove ? C.accent : C.red }}>{isApprove ? "✓" : "✗"}</div>
        <div style={{ fontFamily: syne, fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: 8 }}>{isApprove ? "Approve request?" : "Reject request?"}</div>
        <div style={{ fontFamily: mono, fontSize: "0.72rem", color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
          {isApprove
            ? `${request.name}'s leave will be approved.`
            : `${request.name}'s request will be rejected.`}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "8px", fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", background: isApprove ? "rgba(0,229,160,0.12)" : "rgba(239,68,68,0.1)", border: `1px solid ${isApprove ? "rgba(0,229,160,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "8px", fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isApprove ? C.accent : C.red, cursor: "pointer" }}>{isApprove ? "✓ Approve" : "✗ Reject"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Table helpers ─────────────────────────────────────────────────────────────

const TH = ({ children }) => (
  <th style={{ padding: "10px 14px", fontFamily: syne, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, textAlign: "left", whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{children}</th>
);

const TD = ({ children, color }) => (
  <td style={{ padding: "10px 14px", fontFamily: mono, fontSize: "0.72rem", color: color || C.text, whiteSpace: "nowrap" }}>{children}</td>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaveEvaluationPage() {
  const { submissions, approveLeave, rejectLeave, error: loadError, loadLeaves } = useLeave();

  const [filter, setFilter]         = useState("pending");
  const [remarksReq, setRemarksReq] = useState(null);
  const [confirm, setConfirm]       = useState(null);
  const [actionError, setActionError] = useState(null);
  const [acting, setActing]         = useState(false);
  const [sortCol, setSortCol]       = useState(null);
  const [sortDir, setSortDir]       = useState("asc");

  const counts = {
    all:      submissions.length,
    pending:  submissions.filter(s => s.status === "pending").length,
    approved: submissions.filter(s => s.status === "approved").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  };

  const filtered = filter === "all" ? submissions : submissions.filter(s => s.status === filter);

  const SORTABLE = ["empId", "name", "leaveType", "subtype", "dateFrom", "dateTo"];
  const handleSort = (col) => {
    if (!SORTABLE.includes(col)) return;
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const cmp = String(a[sortCol] || "").localeCompare(String(b[sortCol] || ""), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const typeLabel    = { "with-pay": "w/ Pay", "without-pay": "w/o Pay" };
  const subtypeLabel = { vacation: "Vacation", sick: "Sick", emergency: "Emergency" };
  const SortIcon = ({ col }) => sortCol === col
    ? <span style={{ color: C.accent, fontSize: "0.55rem", marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
    : null;

  return (
    <>
      <style>{`button:hover{opacity:0.82}`}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
        <div style={{ padding: "28px 40px", maxWidth: "1200px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: syne, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, background: C.warn, borderRadius: "50%", display: "inline-block" }} />
              Admin Panel
            </div>
            <div style={{ fontFamily: syne, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.05em", color: C.text }}>Leave Approval</div>
          </div>

          {(loadError || actionError) && (
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px", padding: "12px 16px", marginBottom: "18px",
              color: C.red, fontFamily: mono, fontSize: "0.78rem",
            }}>
              ✗ {actionError || loadError}
              {loadError && (
                <button onClick={loadLeaves} style={{
                  marginLeft: 12, background: "none", border: "none", color: C.accent,
                  cursor: "pointer", fontFamily: mono, fontSize: "0.72rem", textDecoration: "underline",
                }}>Retry</button>
              )}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {[
              { key: "pending",  dot: C.warn   },
              { key: "approved", dot: C.accent },
              { key: "rejected", dot: C.red    },
              { key: "all",      dot: C.muted  },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ background: filter === f.key ? "rgba(0,229,160,0.08)" : "transparent", border: `1px solid ${filter === f.key ? "rgba(0,229,160,0.3)" : C.border}`, color: filter === f.key ? C.accent : C.muted, fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", padding: "6px 14px", borderRadius: "20px", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: filter === f.key ? f.dot : C.dim, display: "inline-block" }} />
                {f.key}
                {counts[f.key] > 0 && <span style={{ background: filter === f.key ? "rgba(0,229,160,0.15)" : C.dim, color: filter === f.key ? C.accent : C.muted, borderRadius: "20px", fontSize: "0.58rem", padding: "1px 8px" }}>{counts[f.key]}</span>}
              </button>
            ))}
          </div>

          {/* Table or empty state */}
          {sorted.length === 0 ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "56px", textAlign: "center" }}>
              <div style={{ fontFamily: mono, fontSize: "1.6rem", color: C.dim, marginBottom: 12 }}>[ ]</div>
              <div style={{ fontFamily: mono, fontSize: "0.78rem", color: C.muted }}>No {filter === "all" ? "" : filter} leave requests to display.</div>
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    {[
                      { key: "empId",     label: "Employee #" },
                      { key: "name",      label: "Name"       },
                      { key: "leaveType", label: "Type"       },
                      { key: "subtype",   label: "Subtype"    },
                      { key: "dateFrom",  label: "From"       },
                      { key: "dateTo",    label: "To"         },
                      { key: "remarks",   label: "Remarks"    },
                      { key: "status",    label: "Status"     },
                      { key: "actions",   label: "Actions"    },
                    ].map(col => (
                      <TH key={col.key}>
                        <span onClick={() => handleSort(col.key)} style={{ cursor: SORTABLE.includes(col.key) ? "pointer" : "default", userSelect: "none" }}>
                          {col.label}<SortIcon col={col.key} />
                        </span>
                      </TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                      <TD color={C.accent}>{r.empId}</TD>
                      <TD>{r.name}</TD>
                      <TD color={C.muted}>{typeLabel[r.leaveType] || r.leaveType}</TD>
                      <TD color={C.muted}>{subtypeLabel[r.subtype] || r.subtype}</TD>
                      <TD>{r.dateFrom}</TD>
                      <TD>{r.dateTo}</TD>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => setRemarksReq(r)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: mono, fontSize: "0.7rem", color: C.accent, textDecoration: "underline", textUnderlineOffset: 3, padding: 0, maxWidth: 140, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                          {r.remarks ? r.remarks.slice(0, 22) + "…" : <span style={{ color: C.dim }}>— view —</span>}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px" }}><StatusPill status={r.status} /></td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        {r.status === "pending" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setConfirm({ action: "approve", request: r })} style={{ background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.3)", color: C.accent, fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, padding: "4px 12px", cursor: "pointer", borderRadius: "6px" }}>✓ Approve</button>
                            <button onClick={() => setConfirm({ action: "reject",  request: r })} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",  color: C.red,   fontFamily: syne, fontSize: "0.62rem", fontWeight: 700, padding: "4px 12px", cursor: "pointer", borderRadius: "6px" }}>✗ Reject</button>
                          </div>
                        ) : (
                          <span style={{ color: C.dim, fontFamily: mono, fontSize: "0.7rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: "0.65rem", color: C.muted }}>
                <span>{sorted.length} record{sorted.length !== 1 ? "s" : ""}</span>
                <span>{counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <RemarksModal request={remarksReq} onClose={() => setRemarksReq(null)} />
      <ConfirmModal
        action={confirm?.action}
        request={confirm?.request}
        onConfirm={async () => {
          setActing(true);
          setActionError(null);
          try {
            if (confirm.action === "approve") {
              await approveLeave(confirm.request.id);
            } else {
              await rejectLeave(confirm.request.id);
            }
            setConfirm(null);
          } catch (err) {
            setActionError(
              err.response?.data?.error || err.message || "Could not update leave request. Check your login and network connection."
            );
            setConfirm(null);
          } finally {
            setActing(false);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
