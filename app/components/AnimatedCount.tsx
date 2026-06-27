'use client';
import { useEffect, useRef, useState } from 'react';

// Replays the project's `pop` keyframe whenever `value` changes — so a like /
// dislike makes the relevant number pulse instead of teleporting. Stays mounted
// across RSC refreshes (refs persist); only the keyed inner span remounts to
// retrigger the CSS animation. No pop on first mount.
export function AnimatedCount({
  value,
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [pops, setPops] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPops((p) => p + 1);
    }
  }, [value]);

  return (
    <span className={className}>
      <span
        key={pops}
        className={`inline-block ${pops ? 'animate-pop' : ''}`}
      >
        {value}
        {suffix}
      </span>
    </span>
  );
}
