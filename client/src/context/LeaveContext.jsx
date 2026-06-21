import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getLeaves, createLeave, reviewLeave } from "../api/leave";

const LeaveContext = createContext(null);

const POLL_MS = 30000;

function toPageLeave(r) {
  const status = (r.status || "PENDING").toUpperCase();
  return {
    id:         r.id,
    empId:      r.emp_id,
    name:       r.name || `${r.first_name || ""} ${r.surname || ""}`.trim(),
    leaveType:  r.pay_type || "",
    subtype:    r.type ? r.type.toLowerCase() : "",
    dateFrom:   r.date_from,
    dateTo:     r.date_to,
    remarks:    r.reason || "",
    status:     status.toLowerCase(),
  };
}

export function LeaveProvider({ children }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLeaves = useCallback(async () => {
    try {
      const res = await getLeaves();
      setSubmissions((res.data || []).map(toPageLeave));
      setError(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Could not load leave requests.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
    const id = setInterval(loadLeaves, POLL_MS);
    return () => clearInterval(id);
  }, [loadLeaves]);

  const submitLeave = async (data) => {
    const payload = {
      emp_id:    data.empId,
      type:      data.subtype.toUpperCase(),
      pay_type:  data.leaveType,
      date_from: data.dateFrom,
      date_to:   data.dateTo,
      reason:    data.remarks || null,
    };
    await createLeave(payload);
    await loadLeaves();
  };

  const approveLeave = async (id) => {
    await reviewLeave(id, "APPROVED");
    await loadLeaves();
  };

  const rejectLeave = async (id) => {
    await reviewLeave(id, "REJECTED");
    await loadLeaves();
  };

  return (
    <LeaveContext.Provider value={{
      submissions, loading, error, loadLeaves,
      submitLeave, approveLeave, rejectLeave,
    }}>
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
