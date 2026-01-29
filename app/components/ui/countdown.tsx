"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  targetDate: Date;
  onComplete?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total: diff,
  };
}

export function Countdown({
  targetDate,
  onComplete,
  className = "",
  size = "md",
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(targetDate),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.total <= 0) {
    return <span className={`text-rose-400 ${className}`}>Ended</span>;
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Show different formats based on time remaining
  if (timeLeft.days > 0) {
    return (
      <span className={`font-mono ${sizeClasses[size]} ${className}`}>
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    );
  }

  if (timeLeft.hours > 0) {
    return (
      <span className={`font-mono ${sizeClasses[size]} ${className}`}>
        {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    );
  }

  // Less than 1 hour - show with urgency
  return (
    <span
      className={`font-mono ${sizeClasses[size]} text-amber-400 ${className}`}
    >
      {timeLeft.minutes}m {timeLeft.seconds}s
    </span>
  );
}

export function CountdownBadge({
  targetDate,
  label,
}: {
  targetDate: Date;
  label?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(targetDate),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2 border border-rose-500/20 bg-rose-500/10 px-3 py-1.5">
        <div className="h-1.5 w-1.5 bg-rose-400" />
        <span className="text-xs text-rose-400">Ended</span>
      </div>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 1;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 ${isUrgent ? "border border-amber-500/20 bg-amber-500/10" : "bg-muted border-border border"}`}
    >
      <div
        className={`h-1.5 w-1.5 ${isUrgent ? "bg-amber-400" : "bg-emerald-400"}`}
      />
      <span
        className={`font-mono text-xs ${isUrgent ? "text-amber-400" : "text-muted-foreground"}`}
      >
        {label && <span className="text-muted-foreground mr-1">{label}</span>}
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours > 0 && `${timeLeft.hours}h `}
        {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}
