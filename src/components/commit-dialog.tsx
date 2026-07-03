import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LogDiagnosticsState } from "@/lib/hos/build-log-diagnostics";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CommitProgress } from "@/lib/hooks/useTransaction";
import { Spinner } from "./ui/spinner";
import { useHealth } from "@/lib/helpers/health-check";
import { LogCheckList } from "./log-check-list";
import { DateTime } from "luxon";
import { BsCheckCircleFill } from "react-icons/bs";
import { BiSolidError } from "react-icons/bi";

type CommitPhase = "confirm" | "saving" | "success" | "error";

type SaveStats = {
  changedEvents: number;
  changedLogs: number;
  deletedEvents: number;
  totalRequests: number;
};

export function CommitDialog({
  open,
  onOpenChange,
  onConfirm,
  phase,
  progress,
  stats,
  diagnostics,
  handleIssueClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<void>;
  phase: CommitPhase;
  progress: CommitProgress;
  stats: SaveStats;
  diagnostics: LogDiagnosticsState;
  handleIssueClick: (issue: LogIssue) => void;
}) {
  const health = useHealth();
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  const saving = phase === "saving";

  const issues = diagnostics.issues;

  // commit dialog will cutoff issues for now
  const cutoffDate = DateTime.now().minus({ days: 7 }).toFormat("yyyy/MM/dd");

  const recentDiagnostics = {
    ...diagnostics,
    issues: diagnostics.issues.filter((issue) => issue.logDate >= cutoffDate),
  };

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle>
            {phase === "confirm" && "Commit changes?"}
            {phase === "saving" && "Saving changes..."}
            {phase === "success" && "Changes saved"}
            {phase === "error" && "Some changes failed"}
          </DialogTitle>
        </DialogHeader>

        {phase === "confirm" && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              This will save all pending changes.
            </p>

            <div className="rounded-md border p-3">
              <div>Modified events: {stats.changedEvents}</div>
              <div>Modified logs: {stats.changedLogs}</div>
              <div>Deleted events: {stats.deletedEvents}</div>
              <div>Total requests: {stats.totalRequests}</div>
            </div>

            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  {issues.length > 0 ? (
                    <BiSolidError className="text-error-fg h-4 w-4" />
                  ) : (
                    <BsCheckCircleFill className="text-success h-4 w-4" />
                  )}
                  Log diagnostics
                </div>
              </div>

              <LogCheckList
                diagnostics={recentDiagnostics}
                handleIssueClick={handleIssueClick}
                setOpen={onOpenChange}
              />
            </div>
          </div>
        )}

        {phase === "saving" && (
          <div className="space-y-3">
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="text-muted-foreground text-sm">
              {progress.done}/{progress.total} done · {progress.success} success
              · {progress.failed} failed
            </div>

            {progress.waiting && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                <div className="text-xs">{progress.waiting.label}</div>
                <div className="mt-1 flex gap-2 text-xs">
                  <Spinner /> Server unresponsive - waiting for response
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "success" && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Saved successfully. {progress.success} requests completed.
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Finished with {progress.failed} failed requests.
          </div>
        )}

        <DialogFooter>
          {phase === "confirm" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={health.status !== "healthy"}
                onClick={onConfirm}
              >
                Commit changes
              </Button>
            </>
          )}

          {phase === "saving" && <Button disabled>Saving...</Button>}

          {(phase === "success" || phase === "error") && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
