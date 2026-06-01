import { useUser } from "@/lib/hooks/useUser";
import { useParams } from "@tanstack/react-router";

type GaugeProps = {
  value: number;
  max: number;
  label?: string;
  color?: string;
  large?: boolean;
};

export const msToHoursMinutes = (ms: number) => {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export function msToHHMM(ms: number) {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;
}

export function HosGauge({
  value,
  max,
  label,
  color,
  large = false,
}: GaugeProps) {
  const remaining = Math.max(max - value, 0);

  const percentage = Math.min(Math.max(remaining / max, 0), 1);

  const size = large ? 64 : 40;
  const viewBox = 100;

  const strokeWidth = large ? 6 : 7;

  const center = 50;

  const radius = center - strokeWidth / 2 - 2;

  const circumference = 2 * Math.PI * radius;

  const dashOffset = circumference - percentage * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          shapeRendering="geometricPrecision"
        >
          <g transform="rotate(-90 50 50)">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="rgb(247, 247, 247)"
              strokeWidth={strokeWidth}
              fill="none"
            />

            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 300ms ease",
              }}
            />
          </g>
        </svg>

        {large && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[13px] font-medium">
            <div style={{ color }}>{label}</div>
            <div style={{ color }} className="text-[14px] font-bold">
              {msToHHMM(remaining)}
            </div>
          </div>
        )}
      </div>

      {!large && (
        <div className="text-muted-foreground mt-1 text-sm">
          {msToHoursMinutes(remaining)}
        </div>
      )}
    </div>
  );
}
