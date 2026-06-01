import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { getTokenPayload } from "@/lib/helpers";

type ControlBarProps = {
  selectedIds: Set<string>;
  reset: () => void;
  onApply: (deltaMs: number) => void;
};

export default function ControlBar({
  selectedIds,
  reset,
  onApply,
  selectDuration,
  transactionStatus,
}: ControlBarProps) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const count = selectedIds.size;

  const { commit } = useTransactionContext();

  const handleSubmit = () => {
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const s = parseInt(seconds || "0", 10);
    const deltaMs = (h * 3600 + m * 60 + s) * 1000;
    if (deltaMs === 0) return;
    onApply(deltaMs);
    setHours("");
    setMinutes("");
    setSeconds("");
    reset();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hours, minutes, seconds]);

  return (
    <div className="bg-background border-border flex items-center gap-3 rounded-md border px-4 py-2 shadow-sm">
      <Clock className="text-muted-foreground h-4 w-4 shrink-0" />

      <span className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">{count}</span>{" "}
        {count === 1 ? "event" : "events"} selected
      </span>

      <div className="bg-border h-4 w-px" />

      <span className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">Duration:</span>{" "}
        {selectDuration ? msToHoursMinutes(selectDuration) : "No selection"}
      </span>

      <div className="bg-border h-4 w-px" />

      {/* time inputs */}
      <div className="flex items-center gap-1">
        <TimeInput
          value={hours}
          onChange={setHours}
          placeholder="hh"
          allowNegative
        />
        <span className="text-muted-foreground">:</span>
        <TimeInput
          value={minutes}
          onChange={setMinutes}
          placeholder="mm"
          max={59}
          allowNegative
        />
        <span className="text-muted-foreground">:</span>
        <TimeInput
          value={seconds}
          onChange={setSeconds}
          placeholder="ss"
          max={59}
          allowNegative
        />
      </div>

      <Button size="sm" onClick={handleSubmit}>
        Apply
      </Button>

      <Button disabled={status === "idle"} onClick={commit}>
        {status === "saving" ? "Saving..." : "Finish"}
      </Button>

      <Button variant="outline" disabled={status === "idle"}>
        Discard
      </Button>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  placeholder,
  max,
  allowNegative,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  max?: number;
  allowNegative?: boolean;
}) {
  return (
    <Input
      className="w-14 text-center font-mono text-sm"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        // allow minus sign at start if negative allowed
        if (allowNegative && raw === "-") {
          onChange("-");
          return;
        }
        const val = allowNegative
          ? raw.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "")
          : raw.replace(/\D/g, "");
        const num = parseInt(val, 10);
        if (val === "" || val === "-" || !max || Math.abs(num) <= max) {
          onChange(val);
        }
      }}
    />
  );
}
