import { useEffect, useState } from 'react';
import {
  getLocalDateLabel,
  getLocalTimeString,
  getTimezoneLabel,
} from '../lib/localTime';
import './LiveClock.css';

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="live-clock">
      <div className="live-clock-time">{getLocalTimeString(now)}</div>
      <div className="live-clock-date">{getLocalDateLabel(now)}</div>
      <div className="live-clock-tz">{getTimezoneLabel()}</div>
    </div>
  );
}
