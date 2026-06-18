import { useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const PH_HOLIDAYS = {
  '01-01': { name: "New Year's Day",                  type: 'regular' },
  '04-09': { name: 'Araw ng Kagitingan',               type: 'regular' },
  '05-01': { name: 'Labor Day',                        type: 'regular' },
  '06-12': { name: 'Independence Day',                 type: 'regular' },
  '08-25': { name: 'National Heroes Day',              type: 'regular' },
  '11-30': { name: 'Bonifacio Day',                    type: 'regular' },
  '12-25': { name: 'Christmas Day',                    type: 'regular' },
  '12-30': { name: 'Rizal Day',                        type: 'regular' },
  '02-25': { name: 'EDSA Revolution',                  type: 'special' },
  '08-21': { name: 'Ninoy Aquino Day',                 type: 'special' },
  '11-01': { name: "All Saints' Day",                  type: 'special' },
  '11-02': { name: "All Souls' Day",                   type: 'special' },
  '12-08': { name: 'Feast of Immaculate Conception',   type: 'special' },
  '12-24': { name: 'Christmas Eve',                    type: 'special' },
  '12-31': { name: "New Year's Eve",                   type: 'special' },
};

const PH_MOVEABLE = {
  '2025-04-17': { name: 'Maundy Thursday',  type: 'regular' },
  '2025-04-18': { name: 'Good Friday',      type: 'regular' },
  '2025-04-19': { name: 'Black Saturday',   type: 'special' },
  '2025-03-31': { name: "Eid'l Fitr",       type: 'regular' },
  '2025-06-07': { name: "Eid'l Adha",       type: 'regular' },
  '2026-04-02': { name: 'Maundy Thursday',  type: 'regular' },
  '2026-04-03': { name: 'Good Friday',      type: 'regular' },
  '2026-04-04': { name: 'Black Saturday',   type: 'special' },
  '2026-03-20': { name: "Eid'l Fitr",       type: 'regular' },
  '2026-05-27': { name: "Eid'l Adha",       type: 'regular' },
  '2027-03-25': { name: 'Maundy Thursday',  type: 'regular' },
  '2027-03-26': { name: 'Good Friday',      type: 'regular' },
  '2027-03-27': { name: 'Black Saturday',   type: 'special' },
};

function getApprovedDates(submissions) {
  const map = {};
  submissions
    .filter(s => s.status === 'approved')
    .forEach(s => {
      const from = new Date(s.dateFrom);
      const to   = new Date(s.dateTo);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(s);
      }
    });
  return map;
}

function getHoliday(year, month, day) {
  const mm       = String(month + 1).padStart(2, '0');
  const dd       = String(day).padStart(2, '0');
  const fullKey  = `${year}-${mm}-${dd}`;
  const shortKey = `${mm}-${dd}`;
  return PH_MOVEABLE[fullKey] || PH_HOLIDAYS[shortKey] || null;
}

const navBtn = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  borderRadius: 6,
  width: 26,
  height: 26,
  cursor: 'pointer',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Syne', sans-serif",
};

export default function LeaveCalendar({ submissions }) {
  const today   = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [year,    setYear]   = useState(today.getFullYear());
  const [month,   setMonth]  = useState(today.getMonth());
  const [tooltip, setTooltip] = useState(null);

  const approvedDates = getApprovedDates(submissions);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700,
          fontSize: '0.75rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text)',
        }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.6rem',
            color: 'var(--muted)', fontFamily: "'Syne', sans-serif",
            fontWeight: 700, letterSpacing: '0.08em', padding: '2px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const mm       = String(month + 1).padStart(2, '0');
          const dd       = String(day).padStart(2, '0');
          const key      = `${year}-${mm}-${dd}`;
          const isToday  = key === todayStr;
          const holiday  = getHoliday(year, month, day);
          const leaves   = approvedDates[key] || [];
          const hasLeave = leaves.length > 0;
          const isRegular = holiday?.type === 'regular';
          const isSpecial = holiday?.type === 'special';

          const cellColor =
            isToday   ? 'var(--bg)'     :
            isRegular ? '#f87171'       :
            isSpecial ? '#fb923c'       :
            hasLeave  ? 'var(--accent)' :
            'var(--text)';

          const cellBg =
            isToday   ? 'var(--accent)'              :
            isRegular ? 'rgba(248,113,113,0.08)'     :
            isSpecial ? 'rgba(251,146,60,0.08)'      :
            hasLeave  ? 'rgba(0,229,160,0.08)'       :
            'transparent';

          const cellBorder =
            isToday   ? '1px solid transparent'          :
            isRegular ? '1px solid rgba(248,113,113,0.25)' :
            isSpecial ? '1px solid rgba(251,146,60,0.25)'  :
            hasLeave  ? '1px solid rgba(0,229,160,0.25)'   :
            '1px solid transparent';

          return (
            <div
              key={key}
              onMouseEnter={(hasLeave || holiday) ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ key, x: rect.left, y: rect.bottom + 6, leaves, holiday });
              } : undefined}
              onMouseLeave={(hasLeave || holiday) ? () => setTooltip(null) : undefined}
              style={{
                position: 'relative',
                textAlign: 'center',
                padding: '5px 2px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontFamily: "'Syne', sans-serif",
                fontWeight: isToday ? 800 : 400,
                cursor: (hasLeave || holiday) ? 'pointer' : 'default',
                color: cellColor,
                background: cellBg,
                border: cellBorder,
                transition: 'all 0.15s',
              }}
            >
              {day}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                {holiday && (
                  <div style={{
                    width: 3, height: 3, borderRadius: '50%',
                    background: isRegular ? '#f87171' : '#fb923c',
                  }} />
                )}
                {hasLeave && (
                  <div style={{
                    width: 3, height: 3, borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--accent)', label: 'On Leave' },
          { color: '#f87171',       label: 'Regular Holiday' },
          { color: '#fb923c',       label: 'Special Holiday' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--muted)',
              fontFamily: "'Syne', sans-serif", letterSpacing: '0.06em' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          top: tooltip.y,
          left: tooltip.x,
          zIndex: 9999,
          background: 'var(--surface)',
          border: '1px solid rgba(0,229,160,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '0.65rem', color: 'var(--muted)',
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {tooltip.key}
          </div>

          {tooltip.holiday && (
            <div style={{
              marginBottom: tooltip.leaves.length ? 8 : 0,
              paddingBottom: tooltip.leaves.length ? 8 : 0,
              borderBottom: tooltip.leaves.length ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: tooltip.holiday.type === 'regular' ? '#f87171' : '#fb923c',
              }}>
                {tooltip.holiday.type === 'regular' ? '🇵🇭 Regular Holiday' : '📅 Special Holiday'}
              </div>
              <div style={{ color: 'var(--text)', fontSize: '0.78rem', marginTop: 2 }}>
                {tooltip.holiday.name}
              </div>
            </div>
          )}

          {tooltip.leaves.map((l, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ color: 'var(--text)', fontSize: '0.78rem', fontWeight: 500 }}>
                {l.name}
              </div>
              <div style={{ color: 'var(--accent)', fontSize: '0.68rem' }}>
                {l.leaveType === 'with-pay' ? 'w/ Pay' : 'w/o Pay'}
                {l.subtype
                  ? ` · ${l.subtype.charAt(0).toUpperCase() + l.subtype.slice(1)}`
                  : ''}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}