import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type {
  CommitProgress,
  TransactionDetails,
} from "@/lib/hooks/useTransaction";
import { Spinner } from "./ui/spinner";
import { useHealth } from "@/lib/helpers/health-check";
import { LogCheckList } from "./log-check-list";
import { DateTime } from "luxon";
import { BsCheckCircleFill } from "react-icons/bs";
import { BiSolidError } from "react-icons/bi";
import type { LogDiagnosticsState, LogIssue } from "@/lib/log-check";

type CommitPhase = "confirm" | "saving" | "success" | "error";

export function CommitDialog({
  open,
  onOpenChange,
  onConfirm,
  phase,
  progress,
  transactionDetails,
  diagnostics,
  handleIssueClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<void>;
  phase: CommitPhase;
  progress: CommitProgress;
  transactionDetails: TransactionDetails;
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

            <div className="bg-muted/30 rounded-lg border p-4">
              <div className="mb-3 border-b pb-3">
                <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Modified range
                </div>

                <div className="mt-1 font-semibold">
                  {transactionDetails.from === transactionDetails.to
                    ? transactionDetails.from
                    : `${transactionDetails.from} – ${transactionDetails.to}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">
                    Modified events
                  </div>
                  <div className="font-semibold">
                    {transactionDetails.changedEvents}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs">
                    Modified logs
                  </div>
                  <div className="font-semibold">
                    {transactionDetails.changedLogs}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs">
                    Deleted events
                  </div>
                  <div className="font-semibold">
                    {transactionDetails.deletedEvents}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground text-xs">
                    Total requests
                  </div>
                  <div className="font-semibold">
                    {transactionDetails.totalRequests}
                  </div>
                </div>
              </div>
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
