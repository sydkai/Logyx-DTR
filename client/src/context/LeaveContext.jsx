import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getLeaves, createLeave, reviewLeave } from "../api/leave";

const LeaveContext = createContext(null);

function toPageLeave(r) {
  return {
    id:         r.id,
    empId:      r.emp_id,
    name:       `${r.first_name || ""} ${r.surname || ""}`.trim(),
    leaveType:  r.pay_type || "",
    subtype:    r.type ? r.type.toLowerCase() : "",
    dateFrom:   r.date_from,
    dateTo:     r.date_to,
    remarks:    r.reason || "",
    status:     (r.status || "pending").toLowerCase(),
  };
}

export function LeaveProvider({ children }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLeaves = useCallback(async () => {
    try {
      const res = await getLeaves();
      setSubmissions((res.data || []).map(toPageLeave));
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

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
    <LeaveContext.Provider value={{ submissions, loading, submitLeave, approveLeave, rejectLeave }}>
      {children}
    </LeaveContext.Provider>
  );
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) throw new Error("useLeave must be used inside <LeaveProvider>");
  return ctx;
}
