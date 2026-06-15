import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CommitPhase = "confirm" | "saving" | "success" | "error";

type CommitProgress = {
  done: number;
  total: number;
  success: number;
  failed: number;
};

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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => Promise<void>;
  phase: CommitPhase;
  progress: CommitProgress;
  stats: SaveStats;
}) {
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  const saving = phase === "saving";

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
