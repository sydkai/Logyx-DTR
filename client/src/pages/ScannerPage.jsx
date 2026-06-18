import { useState, useEffect, useRef, useCallback } from 'react';
import { getEmployees, lookupScannedEmployee } from '../api/employees';
import { createRecord, getTodayRecords } from '../api/records';
import { getLeaves } from '../api/leave';
import LiveClock from '../components/LiveClock';
import {
  getLocalDateString,
  getScanTimestamp,
} from '../lib/localTime';
import { useLeave } from '../context/LeaveContext';
import LeaveCalendar from '../components/LeaveCalendar';
import { extractEmployeeId } from '../lib/scanUtils';

const LATE_CUTOFF_MINS   = 8 * 60 + 5;
const ABSENT_CUTOFF_MINS = 17 * 60;

function getNowMins() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function getMode(otForced) {
  if (otForced) return 'OT';
  const h = new Date().getHours();
  if (h >= 1  && h < 12) return 'IN';
  if (h >= 12 && h < 13) return 'LUNCH-OUT';
  if (h >= 13 && h < 17) return 'LUNCH-IN';
  if (h >= 17)           return 'OUT';
  return 'IN';
}

function getShiftLabel(mode) {
  if (mode === 'OT')        return 'Overtime';
  if (mode === 'IN')        return 'Morning shift (1:00 AM – 11:59 AM)';
  if (mode === 'LUNCH-OUT') return 'Lunch break starts (12:00 NN)';
  if (mode === 'LUNCH-IN')  return 'Time In after lunch (1:00 PM – 4:59 PM)';
  if (mode === 'OUT')       return 'End of day (5:00 PM onwards)';
  return 'Time In';
}

function getAttendanceStatus() {
  const mins = getNowMins();
  if (mins < LATE_CUTOFF_MINS)   return 'ontime';
  if (mins < ABSENT_CUTOFF_MINS) return 'late';
  return 'absent-window';
}

export default function ScannerPage() {
  const [employees, setEmployees]           = useState([]);
  const [todayRecs, setTodayRecs]           = useState([]);
  const [leavesToday, setLeavesToday]       = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [scannerOn, setScannerOn]           = useState(false);
  const [buffer, setBuffer]                 = useState('');
  const [feedback, setFeedback]             = useState(null);
  const [lastScan, setLastScan]             = useState(null);
  const [otForced, setOtForced]             = useState(false);
  const [mode, setMode]                     = useState(getMode(false));
  const [flash, setFlash]                   = useState(false);
  const [absentFired, setAbsentFired]       = useState(false);
  const { submissions } = useLeave();

  const fbTimer   = useRef(null);
  const hiddenRef = useRef(null);
  const processIdRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const today = getLocalDateString();
      const [empRes, todayRecords] = await Promise.all([
        getEmployees(),
        getTodayRecords(today),
      ]);

      setEmployees(empRes.data || []);
      setTodayRecs(todayRecords);

      try {
        const leaveRes = await getLeaves();
        const allLeaves = leaveRes.data || [];

        const todayLeaves = allLeaves.filter((l) =>
          String(l.status).toLowerCase() === 'approved'
          && l.date_from <= today && l.date_to >= today,
        );
        setLeavesToday(todayLeaves);

        const allApproved = allLeaves.filter((l) =>
          String(l.status).toLowerCase() === 'approved',
        );
        setApprovedLeaves(allApproved);
      } catch {
        setLeavesToday([]);
        setApprovedLeaves([]);
      }
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', msg: 'Could not load employees. Please log in and refresh.' });
    }
  }, []);

  const contextApproved = submissions
    .filter(s => s.status === 'approved')
    .map(s => ({
      id:         s.id,
      emp_name:   s.name,
      emp_id:     s.empId,
      date_from:  s.dateFrom,
      date_to:    s.dateTo,
      leave_type: s.leaveType,
      subtype:    s.subtype,
    }));

  const allApprovedLeaves = [
    ...approvedLeaves,
    ...contextApproved.filter(c => !approvedLeaves.some(a => a.id === c.id)),
  ];

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const id = setInterval(() => setMode(getMode(otForced)), 1000);
    return () => clearInterval(id);
  }, [otForced]);

  const clearScanInput = () => {
    if (hiddenRef.current) hiddenRef.current.value = '';
    setBuffer('');
  };

  const handleScanSubmit = () => {
    const raw = hiddenRef.current?.value ?? '';
    clearScanInput();
    if (!String(raw).trim()) return;
    processIdRef.current?.(raw);
  };

  useEffect(() => {
    if (scannerOn) {
      const t = setTimeout(() => hiddenRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    clearScanInput();
  }, [scannerOn]);

  useEffect(() => {
    if (absentFired) return;
    const id = setInterval(async () => {
      if (getNowMins() >= ABSENT_CUTOFF_MINS) {
        setAbsentFired(true);
        clearInterval(id);
        const scannedIds = new Set(todayRecs.map(r => r.employee_id));
        // Day off
    const todayDow = new Date().getDay();
    const absentEmps = employees.filter(e =>
      e.emp_status === 'ACTIVE' &&
      !scannedIds.has(e.emp_id) &&
      !(e.rest_day === 'saturday' && todayDow === 6) &&
      !(e.rest_day === 'sunday'   && todayDow === 0)
    );
        const stamp = getScanTimestamp();
        for (const emp of absentEmps) {
          try {
            await createRecord({
              emp_id: emp.emp_id,
              type: 'ABSENT',
              status: 'absent',
              note: 'Auto-tagged absent at 5:00 PM',
              ...stamp,
            });
          } catch (e) { console.error(e); }
        }
        await loadData();
      }
    }, 10000);
    return () => clearInterval(id);
  }, [absentFired, employees, todayRecs, loadData]);

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => setFeedback(null), 5000);
  };

  const triggerFlash = (type) => {
    setFlash(type);
    setTimeout(() => setFlash(false), 400);
  };

  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value =
        type === 'IN'        ? 880  :
        type === 'OUT'       ? 660  :
        type === 'LUNCH-OUT' ? 750  :
        type === 'LUNCH-IN'  ? 820  : 1040;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch {}
  };

  const processId = useCallback(async (rawScan) => {
    const parsed = extractEmployeeId(rawScan);
    let emp = employees.find((e) => extractEmployeeId(e.emp_id) === parsed);

    if (!emp) {
      try {
        emp = await lookupScannedEmployee(rawScan);
        if (emp) {
          setEmployees((prev) => (
            prev.some((e) => e.emp_id === emp.emp_id) ? prev : [...prev, emp]
          ));
        }
      } catch {
        // fall through to not-found message
      }
    }

    if (!emp) {
      showFeedback(
        'error',
        `Employee not found (scanned: "${String(rawScan).trim().slice(0, 48)}"). Check Barcodes page for your ID.`,
      );
      return;
    }

    const empRecs = todayRecs.filter((r) => r.employee_id === emp.emp_id);
    const hasMorningIn = empRecs.some(r => r.type === 'IN');
    const hasLunchOut = empRecs.some(r => r.type === 'LUNCH-OUT');
    let type;

    if (otForced) {
      const otRecs = empRecs.filter(r => r.type === 'OT-IN' || r.type === 'OT-OUT');
      type = (!otRecs.length || otRecs[otRecs.length - 1].type === 'OT-OUT') ? 'OT-IN' : 'OT-OUT';
    } else {
      type = getMode(false);
    }

    const attStatus = type === 'IN' && !hasMorningIn ? getAttendanceStatus() : null;
    const stamp = getScanTimestamp();

    try {
      await createRecord({
        emp_id: emp.emp_id,
        type,
        status: attStatus,
        note: attStatus === 'late' ? 'Marked late' : null,
        ...stamp,
      });
      await loadData();

      const typeLabel = {
        IN: 'Time In', OUT: 'Time Out',
        'OT-IN': 'OT In', 'OT-OUT': 'OT Out',
        'LUNCH-OUT': 'Lunch Out', 'LUNCH-IN': 'Time In',
      }[type];
      const lateTag = attStatus === 'late' ? ' ⚠️ LATE' : attStatus === 'ontime' ? ' ✅ On Time' : '';

      showFeedback(
        type.startsWith('OT')                           ? 'ot'      :
        type === 'IN' || type === 'LUNCH-IN'            ? 'success' :
        type === 'LUNCH-OUT'                            ? 'lunch'   : 'out',
        `✓ ${typeLabel} — ${emp.first_name} ${emp.surname}${lateTag}`
      );
      setLastScan({ emp, type, attStatus, time: stamp.time });
      triggerFlash(type);
      playBeep(type);
    } catch (e) {
      showFeedback('error', e.response?.data?.error || e.message || 'Failed to record scan.');
    }
  }, [employees, todayRecs, otForced, loadData]);

  useEffect(() => {
    processIdRef.current = processId;
  }, [processId]);

  const sortedScans = [...todayRecs]
    .filter(r => r.type !== 'ABSENT')
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const stats = {
    in:      todayRecs.filter(r => r.type === 'IN').length,
    out:     todayRecs.filter(r => r.type === 'OUT').length,
    ot:      todayRecs.filter(r => r.type === 'OT-IN' || r.type === 'OT-OUT').length,
    present: new Set(todayRecs.filter(r => r.type === 'IN').map(r => r.employee_id)).size,
    late:    todayRecs.filter(r => r.status === 'late').length,
    absent:  todayRecs.filter(r => r.type === 'ABSENT').length,
  };

  const isOTHours = (() => { const h = new Date().getHours(); return h >= 17 || h < 1; })();

  const flashBg =
    flash === 'IN'        ? 'rgba(0,229,160,0.15)'   :
    flash === 'OUT'       ? 'rgba(255,107,53,0.15)'  :
    flash === 'LUNCH-OUT' ? 'rgba(251,191,36,0.15)'  :
    flash === 'LUNCH-IN'  ? 'rgba(0,229,160,0.15)'   :
    flash                 ? 'rgba(167,139,250,0.15)' :
    'var(--surface)';

  const modePillStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 16px', borderRadius: 20,
    fontFamily: 'Syne,sans-serif', fontWeight: 700,
    fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    ...(mode === 'OT'
      ? { background: 'rgba(167,139,250,0.12)', color: 'var(--ot-color)',  border: '1px solid rgba(167,139,250,0.3)' }
      : mode === 'IN'
      ? { background: 'rgba(0,229,160,0.12)',   color: 'var(--accent)',    border: '1px solid rgba(0,229,160,0.3)' }
      : mode === 'LUNCH-IN'
      ? { background: 'rgba(0,229,160,0.12)',   color: 'var(--accent)',    border: '1px solid rgba(0,229,160,0.3)' }
      : mode === 'LUNCH-OUT'
      ? { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24',          border: '1px solid rgba(251,191,36,0.3)' }
      : { background: 'rgba(255,107,53,0.12)',  color: 'var(--out-color)', border: '1px solid rgba(255,107,53,0.3)' })
  };

  // ── Reusable scan table renderer ──
  const renderScanList = (maxH = 320) => (
    <div style={{ maxHeight:maxH, overflowY:'auto', overflowX:'hidden' }}>
      {sortedScans.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--muted)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12, opacity:0.4 }}>📋</div>
          <p style={{ fontSize:'0.85rem' }}>No scans today yet.</p>
        </div>
      ) : (
        <table className="records-table" style={{ width:'100%', tableLayout:'fixed' }}>
          <thead>
            <tr>
              <th style={{ width:110 }}>Employee ID</th>
              <th style={{ paddingLeft:32 }}>Name</th>
              <th style={{ width:100 }}>Date</th>
              <th style={{ width:80 }}>Time</th>
              <th style={{ width:100 }}>Type</th>
              <th style={{ width:60 }}>Day</th>
            </tr>
          </thead>
          <tbody>
            {sortedScans.map((scan, idx) => (
              <tr key={scan.id}>
                <td className="col-id">{scan.employee_id}</td>
                <td className="col-name" style={{ paddingLeft:32 }}>{scan.name}</td>
                <td>{scan.date}</td>
                <td>{scan.time}</td>
                <td>
                  <span className={`badge ${scan.record_type === 'TIME IN' ? 'time-in' : scan.record_type === 'TIME OUT' ? 'time-out' : scan.record_type === 'LUNCH OUT' ? 'lunch' : 'overtime'}`}>
                    <span className="dot" />
                    {scan.record_type}
                  </span>
                </td>
                <td>{scan.day}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <LiveClock />

      {/* Hidden input — USB barcode scanners type into the focused field */}
      <input
        ref={hiddenRef}
        type="text"
        inputMode="none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Barcode scanner input"
        tabIndex={scannerOn ? 0 : -1}
        style={{ position:'fixed', left:-9999, top:0, opacity:0, width:1, height:1 }}
        onKeyDown={(e) => {
          if (!scannerOn) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            handleScanSubmit();
          }
        }}
      />

      {/* Mode Banner */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 18px', borderRadius:10, marginBottom:20,
        border:'1px solid var(--border)', background:'var(--surface)', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={modePillStyle}>
            ●{' '}
            {mode === 'OT'        ? 'Overtime'  :
             mode === 'IN'        ? 'Time In'   :
             mode === 'LUNCH-OUT' ? 'Lunch Out' :
             mode === 'LUNCH-IN'  ? 'Time In'   :
                                    'Time Out'}
          </span>
          <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{getShiftLabel(mode)}</span>
        </div>
        <button onClick={() => { if (isOTHours) setOtForced(p => !p); }}
          style={{ padding:'8px 16px', borderRadius:8,
            border:'1px solid rgba(167,139,250,0.3)',
            background: otForced ? 'rgba(167,139,250,0.3)' : 'rgba(167,139,250,0.15)',
            color:'var(--ot-color)', fontFamily:'Syne,sans-serif', fontWeight:700,
            fontSize:'0.78rem', letterSpacing:'0.08em', textTransform:'uppercase',
            opacity: isOTHours ? 1 : 0.35, cursor: isOTHours ? 'pointer' : 'not-allowed' }}>
          ⏱ {otForced ? 'Overtime ON' : 'Overtime'}
        </button>
      </div>

      {/* Main Grid — 3 columns: Scanner | Attendance | Leaves */}
      <div style={{ display:'grid', gridTemplateColumns:'360px 1.6fr 1fr', gap:20, alignItems:'start' }}>

        {/* ── Column 1: Scanner + Stats + Calendar ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Scanner Card */}
          <div style={{ background: flashBg,
            border:`1px solid ${scannerOn ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius:12, padding:24, transition:'all 0.3s' }}>

            <div style={{ fontFamily:'Syne,sans-serif', fontSize:'0.75rem', fontWeight:700,
              letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--muted)',
              marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', display:'inline-block',
                background: scannerOn ? 'var(--accent)' : 'var(--muted)',
                boxShadow: scannerOn ? '0 0 8px var(--accent)' : 'none',
                transition:'all 0.3s',
                animation: scannerOn ? 'blink 1.5s ease-in-out infinite' : 'none' }}/>
              Barcode / ID Scanner
            </div>

            {/* ON/OFF Toggle Button */}
            <button onClick={() => {
                setScannerOn((p) => {
                  const next = !p;
                  if (next) setTimeout(() => hiddenRef.current?.focus(), 0);
                  return next;
                });
              }}
              style={{ width:'100%', padding:'28px 0', borderRadius:12,
                background: scannerOn
                  ? 'linear-gradient(135deg, rgba(0,229,160,0.2), rgba(0,229,160,0.08))'
                  : 'var(--surface2)',
                border: `2px solid ${scannerOn ? 'var(--accent)' : 'var(--border)'}`,
                cursor:'pointer', transition:'all 0.25s',
                display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="24"
                  stroke={scannerOn ? 'var(--accent)' : 'var(--muted)'}
                  strokeWidth="2.5" fill="none"/>
                <path d="M26 14 L26 26"
                  stroke={scannerOn ? 'var(--accent)' : 'var(--muted)'}
                  strokeWidth="3" strokeLinecap="round"/>
                <path d="M18 18.5 A12 12 0 1 0 34 18.5"
                  stroke={scannerOn ? 'var(--accent)' : 'var(--muted)'}
                  strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
              <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem',
                letterSpacing:'0.15em', textTransform:'uppercase',
                color: scannerOn ? 'var(--accent)' : 'var(--muted)', transition:'all 0.3s' }}>
                {scannerOn ? 'SCANNER ON' : 'SCANNER OFF'}
              </div>
            </button>

            {/* Feedback */}
            {feedback && (
              <div style={{ padding:'12px 16px', borderRadius:8, fontSize:'0.82rem', marginTop:16,
                ...(feedback.type === 'success' ? { background:'rgba(0,229,160,0.12)',   border:'1px solid rgba(0,229,160,0.3)',   color:'var(--accent)' }    :
                    feedback.type === 'out'     ? { background:'rgba(255,107,53,0.12)',  border:'1px solid rgba(255,107,53,0.3)',  color:'var(--out-color)' } :
                    feedback.type === 'lunch'   ? { background:'rgba(251,191,36,0.12)',  border:'1px solid rgba(251,191,36,0.3)',  color:'#fbbf24' }          :
                    feedback.type === 'ot'      ? { background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.3)', color:'var(--ot-color)' }  :
                                                  { background:'rgba(255,107,53,0.12)',  border:'1px solid rgba(255,107,53,0.3)',  color:'var(--warn)' }) }}>
                {feedback.msg}
              </div>
            )}

            {/* Last Scan */}
            {lastScan && (
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'14px 16px', marginTop:12, fontSize:'0.8rem', color:'var(--muted)' }}>
                Last: <span style={{ color:'var(--accent)' }}>{lastScan.emp.emp_id}</span>
                {' · '}<strong style={{ color:'var(--text)' }}>{lastScan.emp.first_name} {lastScan.emp.surname}</strong>
                {' — '}
                {{
                  IN: 'Time In', OUT: 'Time Out',
                  'OT-IN': 'OT In', 'OT-OUT': 'OT Out',
                  'LUNCH-OUT': 'Lunch Out', 'LUNCH-IN': 'Time In',
                }[lastScan.type]}
                {' at '}<strong>{lastScan.time}</strong>
                {lastScan.attStatus === 'late'   && <span style={{ color:'var(--late-color)', marginLeft:8 }}>⚠️ LATE</span>}
                {lastScan.attStatus === 'ontime' && <span style={{ color:'var(--accent)',     marginLeft:8 }}>✅ On Time</span>}
              </div>
            )}
          </div>

          {/* Stats Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { val:stats.in,      lbl:'Time Ins',  color:'var(--in-color)' },
              { val:stats.out,     lbl:'Time Outs', color:'var(--out-color)' },
              { val:stats.present, lbl:'Present',   color:'var(--accent2)' },
            ].map(s => (
              <div key={s.lbl} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:'1.4rem', fontWeight:800,
                  color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:'0.62rem', color:'var(--muted)', textTransform:'uppercase',
                  letterSpacing:'0.1em', marginTop:4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[
              { val:stats.late,   lbl:'Late',     color:'var(--late-color)' },
              { val:stats.absent, lbl:'Absent',   color:'var(--absent-color)' },
              { val:stats.ot,     lbl:'Overtime', color:'var(--ot-color)' },
            ].map(s => (
              <div key={s.lbl} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:8, padding:'12px 14px' }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:'1.4rem', fontWeight:800,
                  color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:'0.62rem', color:'var(--muted)', textTransform:'uppercase',
                  letterSpacing:'0.1em', marginTop:4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* Leave Calendar */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:12, padding:20 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:'0.75rem', fontWeight:700,
              letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--muted)',
              marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:6, height:6, background:'var(--accent2)', borderRadius:'50%', display:'inline-block' }}/>
              Leave Calendar
            </div>
            <LeaveCalendar submissions={submissions} />
          </div>

        </div>
        {/* ── End Column 1 ── */}

        {/* ── Column 2: Today's Attendance ── */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:12, padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:'0.75rem', fontWeight:700,
              letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--muted)',
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:6, height:6, background:'var(--accent)', borderRadius:'50%', display:'inline-block' }}/>
              Attendance Log
            </div>
            <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>
              Present: <span style={{ color:'var(--accent)' }}>{stats.present}</span>
            </span>
          </div>
          {renderScanList(520)}
        </div>
        {/* ── End Column 2 ── */}

        {/* ── Column 3: Leaves ── */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:12, padding:24 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:'0.75rem', fontWeight:700,
            letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--muted)',
            marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:6, height:6, background:'var(--warn)', borderRadius:'50%', display:'inline-block' }}/>
            Leaves — Today
          </div>

          {/* On Leave — today only */}
          <div>
            <div style={{ fontSize:'0.7rem', color:'var(--accent2)', fontFamily:'Syne,sans-serif',
              fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
              🗓 On Leave ({leavesToday.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {leavesToday.length === 0 ? (
                <div style={{ fontSize:'0.78rem', color:'var(--muted)', padding:'10px 14px',
                  background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                  No approved leaves today.
                </div>
              ) : leavesToday.map(l => (
                <div key={l.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'rgba(0,153,255,0.05)', border:'1px solid rgba(0,153,255,0.25)',
                  borderRadius:8, padding:'10px 14px' }}>
                  <div>
                    <div style={{ color:'var(--text)', fontSize:'0.8rem', fontWeight:500 }}>{l.emp_name}</div>
                    <div style={{ color:'var(--accent)', fontSize:'0.7rem' }}>{l.emp_id}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'var(--accent2)', fontSize:'0.78rem', fontWeight:700 }}>{l.leave_type || 'LEAVE'}</div>
                    <div style={{ color:'var(--muted)', fontSize:'0.7rem' }}>{l.date_from} – {l.date_to}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop:'1px solid var(--border)', margin:'20px 0' }} />

          {/* ── Approved Leaves (all approved, any date) ── */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ fontSize:'0.7rem', color:'var(--accent)', fontFamily:'Syne,sans-serif',
                fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
                display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:5, height:5, background:'var(--accent)', borderRadius:'50%', display:'inline-block' }}/>
                Approved Leaves
              </div>
              <span style={{
                background:'rgba(0,229,160,0.1)', color:'var(--accent)',
                border:'1px solid rgba(0,229,160,0.2)',
                borderRadius:20, fontSize:'0.58rem',
                fontFamily:'Syne,sans-serif', fontWeight:700,
                letterSpacing:'0.1em', padding:'2px 10px',
              }}>
                {allApprovedLeaves.length} total
              </span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
              {allApprovedLeaves.length === 0 ? (
                <div style={{ fontSize:'0.78rem', color:'var(--muted)', padding:'10px 14px',
                  background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                  No approved leaves yet.
                </div>
              ) : allApprovedLeaves.map(l => (
                <div key={l.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'rgba(0,229,160,0.04)', border:'1px solid rgba(0,229,160,0.18)',
                  borderRadius:8, padding:'10px 14px',
                }}>
                  <div>
                    <div style={{ color:'var(--text)', fontSize:'0.8rem', fontWeight:500 }}>{l.emp_name}</div>
                    <div style={{ color:'var(--accent)', fontSize:'0.7rem' }}>{l.emp_id}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ color:'var(--accent)', fontSize:'0.72rem', fontWeight:700 }}>
                      {l.leave_type === 'with-pay' ? 'w/ Pay' : l.leave_type === 'without-pay' ? 'w/o Pay' : l.leave_type || 'LEAVE'}
                      {l.subtype ? ` · ${l.subtype.charAt(0).toUpperCase() + l.subtype.slice(1)}` : ''}
                    </div>
                    <div style={{ color:'var(--muted)', fontSize:'0.68rem', marginTop:2 }}>
                      {l.date_from} – {l.date_to}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* ── End Approved Leaves ── */}

        </div>
        {/* ── End Column 3 ── */}

      </div>{/* end main grid */}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}