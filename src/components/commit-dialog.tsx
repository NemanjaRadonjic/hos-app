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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<void>;
  phase: CommitPhase;
  progress: CommitProgress;
  stats: SaveStats;
  diagnostics: LogDiagnosticsState;
}) {
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  const saving = phase === "saving";

  const issues = diagnostics.issues;

  const groupedIssues = Object.values(
    issues.reduce(
      (acc, issue) => {
        acc[issue.logDate] ??= [];
        acc[issue.logDate].push(issue);
        return acc;
      },
      {} as Record<string, typeof issues>,
    ),
  );
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

            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  {issues.length > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  Log diagnostics
                </div>

                <span className="text-muted-foreground text-xs">
                  {issues.length} {issues.length === 1 ? "issue" : "issues"}
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  No log issues found.
                </div>
              ) : (
                <div className="max-h-48 space-y-3 overflow-auto pr-1">
                  {groupedIssues.map((dayIssues) => (
                    <div
                      key={dayIssues[0].logDate}
                      className="bg-muted/40 rounded-md p-2"
                    >
                      <div className="mb-1 text-xs font-semibold">
                        {dayIssues[0].logDate}
                      </div>

                      <div className="space-y-1">
                        {dayIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="flex items-start gap-2 text-sm text-red-600"
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

            {progress.retrying && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                <div className="font-medium">Retrying request</div>
                <div className="text-xs">{progress.retrying.label}</div>
                <div className="mt-1 text-xs">
                  Attempt {progress.retrying.attempt} · retrying in{" "}
                  {Math.round(progress.retrying.delayMs / 1000)}s
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
              <Button onClick={onConfirm}>Commit changes</Button>
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
