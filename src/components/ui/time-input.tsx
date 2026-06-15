import { cn } from "@/lib/utils";
import { MdAccessTimeFilled } from "react-icons/md";

type TimeInputProps = {
  value: string;
  onChange: (time: string) => void;
  className: string;
};

type Part = "h" | "m" | "s" | "ampm";

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [rawH = 0, rawM = 0, rawS = 0] = value.split(":").map(Number);

  const hour24 = Number.isFinite(rawH) ? rawH : 0;
  const minute = Number.isFinite(rawM) ? rawM : 0;
  const second = Number.isFinite(rawS) ? rawS : 0;

  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const pad = (n: number) => String(n).padStart(2, "0");

  const emit24 = (h: number, m: number, s: number) => {
    onChange(`${pad(h)}:${pad(m)}:${pad(s)}`);
  };

  const emit12 = (h12: number, m: number, s: number, pm: boolean) => {
    let h24 = h12 % 12;
    if (pm) h24 += 12;

    emit24(h24, m, s);
  };

  const clamp = (n: number, min: number, max: number) =>
    Math.min(Math.max(n, min), max);

  const change = (part: Part, delta: number) => {
    if (part === "h") {
      emit24((hour24 + delta + 24) % 24, minute, second);
      return;
    }

    if (part === "m") {
      emit24(hour24, (minute + delta + 60) % 60, second);
      return;
    }

    if (part === "s") {
      emit24(hour24, minute, (second + delta + 60) % 60);
      return;
    }

    if (part === "ampm") {
      emit24((hour24 + 12) % 24, minute, second);
    }
  };

  const onWheel =
    (part: Part) =>
    (e: React.WheelEvent<HTMLInputElement | HTMLButtonElement>) => {
      e.preventDefault();

      const amount = e.shiftKey ? 10 : 1;
      const delta = e.deltaY > 0 ? -amount : amount;

      change(part, delta);
    };

  const onKeyDown =
    (part: Part) =>
    (e: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
      e.stopPropagation();

      if (e.key === "ArrowUp") {
        e.preventDefault();
        change(part, e.shiftKey ? 10 : 1);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        change(part, e.shiftKey ? -10 : -1);
      }
    };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border px-2 py-1",
        className && className,
      )}
    >
      <MdAccessTimeFilled size={16} />
      <div>
        <input
          value={pad(hour12)}
          onWheel={onWheel("h")}
          onKeyDown={onKeyDown("h")}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const next = clamp(Number(e.target.value || 1), 1, 12);
            emit12(next, minute, second, isPM);
          }}
          className="hover:bg-muted w-6 rounded bg-transparent text-center outline-none"
        />

        <span>:</span>

        <input
          value={pad(minute)}
          onWheel={onWheel("m")}
          onKeyDown={onKeyDown("m")}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const next = clamp(Number(e.target.value || 0), 0, 59);
            emit24(hour24, next, second);
          }}
          className="hover:bg-muted w-6 rounded bg-transparent text-center outline-none"
        />

        <span>:</span>

        <input
          value={pad(second)}
          onWheel={onWheel("s")}
          onKeyDown={onKeyDown("s")}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const next = clamp(Number(e.target.value || 0), 0, 59);
            emit24(hour24, minute, next);
          }}
          className="hover:bg-muted w-6 rounded bg-transparent text-center outline-none"
        />
      </div>
      <button
        type="button"
        onWheel={onWheel("ampm")}
        onKeyDown={onKeyDown("ampm")}
        onClick={() => change("ampm", 1)}
        className="hover:bg-muted focus:bg-muted rounded px-1 outline-none"
      >
        {isPM ? "PM" : "AM"}
      </button>
    </div>
  );
}
