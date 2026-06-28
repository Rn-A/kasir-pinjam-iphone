import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';

export function LateTimerDisplay({ endDate }: { endDate: Date }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, differenceInSeconds(new Date(), endDate)));

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = differenceInSeconds(new Date(), endDate);
      setElapsed(Math.max(0, seconds));
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  const days = Math.floor(elapsed / (3600 * 24));
  const remainingHours = Math.floor((elapsed % (3600 * 24)) / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="font-mono bg-red-50 text-red-600 px-2 py-1 rounded text-[11px] inline-block border border-red-100 font-bold animate-pulse">
      Terlambat: {days > 0 && <span className="mr-1">{days}hr</span>}
      {String(remainingHours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
