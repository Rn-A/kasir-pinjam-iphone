import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

export function CountdownDisplay({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, differenceInSeconds(endDate, new Date())));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = differenceInSeconds(endDate, new Date());
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft <= 0) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">Terlambat</span>;
  }

  const days = Math.floor(timeLeft / (3600 * 24));
  const remainingHours = Math.floor((timeLeft % (3600 * 24)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="font-mono bg-slate-100 px-2 py-1 rounded text-[11px] text-slate-700 inline-block border border-slate-200 font-medium">
      {days > 0 && <span className="mr-1">{days}hr</span>}
      {String(remainingHours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
