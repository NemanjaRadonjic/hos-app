import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { getTokenPayload } from "@/lib/helpers";
import { TransactionDialog } from "./transaction-dialog";
import { BiCertification, BiSolidTrashAlt } from "react-icons/bi";
import { FaCertificate } from "react-icons/fa6";
import type { LogDiagnosticsState } from "@/lib/hos/build-log-diagnostics";
import type { CommitProgress } from "@/lib/hooks/useTransaction";
import { LogCheck } from "./log-check-dialog";
import { supabase } from "@/lib/supabase";
import { TbRoute2 } from "react-icons/tb";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { DateTime } from "luxon";
import type { LogIssue } from "@/lib/log-check";
import { RiSortNumberDesc } from "react-icons/ri";

type ControlBarProps = {
  selectedIds: Set<string>;
  resetSelection: () => void;
  diagnostics: LogDiagnosticsState;
};

type CommitPhase = "confirm" | "creating" | "saving" | "success" | "error";

export default function ControlBar({
  updateEventsTimestamp,
  selectDuration,
  transactionStatus,
  selectedDay,
  setSelectedDay,
  setFocusedId,
  diagnostics,
}: ControlBarProps) {
  const {
    events,
    commit,
    reset,
    status,
    deleteEvents,
    transactionDetails,
    fixCert,
    fixInt,
    fixSeqIds,
    fixEngineHours,
  } = useTransactionContext();
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const resetSelection = useSelectionStore((s) => s.resetSelection);

  const [commitOpen, setCommitOpen] = useState(false);
  const [commitPhase, setCommitPhase] = useState<CommitPhase>("confirm");
  const [commitProgress, setCommitProgress] = useState<CommitProgress>({
    done: 0,
    total: 0,
    success: 0,
    failed: 0,
    waiting: null,
  });

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");

  const count = selectedIds.size;

  const selectedId = count === 1 ? [...selectedIds][0] : undefined;

  const selectedEvent = selectedId
    ? events.find((event) => event._id === selectedId)
    : undefined;

  const canFixInt = count === 1 && selectedEvent?.eventCode.id === "DS_D";

  const hasSelection = count > 0;

  const handleSubmit = () => {
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const s = parseInt(seconds || "0", 10);
    const deltaMs = (h * 3600 + m * 60 + s) * 1000;
    if (deltaMs === 0) return;
    updateEventsTimestamp({ selectedIds, deltaMs });
    setHours("");
    setMinutes("");
    setSeconds("");
    resetSelection();
  };

  function handleIssueClick(issue: LogIssue) {
    setSelectedDay(DateTime.fromFormat(issue.logDate, "yyyy/MM/dd"));

    if (issue.eventId) {
      setFocusedId(issue.eventId);
    }
  }

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
      <span className="text-muted-foreground w-32 text-sm">
        <span className="text-foreground font-medium">{count}</span>{" "}
        {count === 1 ? "event" : "events"} selected
      </span>
      <div className="bg-border h-4 w-px" />
      <span className="text-muted-foreground w-36 text-sm">
        <span className="text-foreground font-medium">Duration:</span>{" "}
        {selectDuration ? msToHoursMinutes(selectDuration) : "No selection"}
      </span>
      <div className="bg-border h-4 w-px" />
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
        <Button disabled={!hasSelection} onClick={handleSubmit}>
          Apply
        </Button>
      </div>
      <div className="bg-border h-4 w-px" />
      <div>
        <Button
          disabled={!hasSelection}
          onClick={() => {
            deleteEvents(selectedIds);
            resetSelection();
          }}
        >
          <BiSolidTrashAlt className="size-3" />
          Delete
        </Button>
      </div>
      <div>
        <Button
          disabled={!canFixInt}
          onClick={() => {
            if (!selectedId || !canFixInt) return;
            fixInt(selectedId);
            resetSelection();
          }}
        >
          <TbRoute2 className="size-3" />
          Fix Int
        </Button>
      </div>
      <div>
        <Button onClick={() => fixCert(selectedDay)}>
          <FaCertificate className="size-3" />
          Cert
        </Button>
      </div>
      <div>
        <Button onClick={() => fixSeqIds()}>
          <RiSortNumberDesc className="size-3" />
          Fix Ids
        </Button>
      </div>
      <div>
        <Button onClick={() => fixEngineHours()}>
          <RiSortNumberDesc className="size-3" />
          Fix Engine Hours
        </Button>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LogCheck
          handleIssueClick={handleIssueClick}
          diagnostics={diagnostics}
        />

        <Button variant="outline" disabled={status === "idle"} onClick={reset}>
          Reset
        </Button>
        <Button
          disabled={status === "idle"}
          onClick={() => {
            setCommitPhase("confirm");
            setCommitOpen(true);
          }}
        >
          Finish
        </Button>
      </div>
      <TransactionDialog
        action="commit"
        open={commitOpen}
        onOpenChange={setCommitOpen}
        phase={commitPhase}
        transactionDetails={transactionDetails}
        progress={commitProgress}
        onConfirm={async () => {
          setCommitProgress({
            done: 0,
            total: transactionDetails.totalRequests,
            success: 0,
            failed: 0,
            waiting: null,
          });

          try {
            const result = await commit({
              onPhaseChange: setCommitPhase,
              onProgress: setCommitProgress,
            });

            setCommitPhase(result.failed.length > 0 ? "error" : "success");
          } catch {
            setCommitPhase("error");
          }
        }}
        diagnostics={diagnostics}
        handleIssueClick={handleIssueClick}
      />
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
      onWheel={(e) => {
        e.preventDefault();

        const current = value === "" || value === "-" ? 0 : parseInt(value, 10);

        let next = current + (e.deltaY < 0 ? 1 : -1);

        if (!allowNegative) {
          next = Math.max(0, next);
        }

        if (max !== undefined) {
          next = Math.min(max, next);
        }

        onChange(next.toString());
      }}
      onChange={(e) => {
        const raw = e.target.value;

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
