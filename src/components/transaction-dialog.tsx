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
import { ExecutionProgress } from "./execution-progress";
import { cn } from "@/lib/utils";

export type ExecutionPhase =
  | "confirm"
  | "creating"
  | "saving"
  | "finalizing"
  | "success"
  | "error";
type TransactionAction = "commit" | "rollback";
type TransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;

  action: TransactionAction;
  phase: ExecutionPhase;

  progress: CommitProgress;
  transactionDetails: TransactionDetails;

  diagnostics?: LogDiagnosticsState;
  handleIssueClick?: (issue: LogIssue) => void;
};

export function TransactionDialog({
  open,
  onOpenChange,
  onConfirm,
  action,
  phase,
  progress,
  transactionDetails,
  diagnostics,
  handleIssueClick,
}: TransactionDialogProps) {
  const isRollback = action === "rollback";

  const copy = isRollback
    ? {
        confirmTitle: "Rollback transaction?",
        confirmDescription:
          "This will reverse the changes made by this transaction.",
        confirmButton: "Rollback",
        creating: "Creating rollback transaction",
        saving: "Applying rollback",
        successTitle: "Rollback complete",
      }
    : {
        confirmTitle: "Commit changes?",
        confirmDescription: "This will save all pending changes.",
        confirmButton: "Commit changes",
        creating: "Creating transaction",
        saving: "Applying changes",
        successTitle: "Changes saved",
      };
  const health = useHealth();

  const executing = phase === "creating" || phase === "saving";

  const issues = diagnostics?.issues ?? [];
  // commit dialog will cutoff issues for now
  const cutoffDate = DateTime.now().minus({ days: 7 }).toFormat("yyyy/MM/dd");
  const recentDiagnostics = diagnostics
    ? {
        ...diagnostics,
        issues: diagnostics.issues.filter(
          (issue) => issue.logDate >= cutoffDate,
        ),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={executing ? undefined : onOpenChange}>
      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle>
            {phase === "confirm" && copy.confirmTitle}
            {phase === "creating" && copy.creating}
            {phase === "saving" && copy.saving}
            {phase === "success" && copy.successTitle}
            {phase === "error" && "Some changes failed"}
          </DialogTitle>
        </DialogHeader>

        {phase === "confirm" && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{copy.confirmDescription}</p>

            <TransactionStats details={transactionDetails} />

            {!isRollback && recentDiagnostics && handleIssueClick && (
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
            )}
          </div>
        )}

        {phase !== "confirm" && (
          <ExecutionProgress
            phase={phase}
            progress={progress}
            creatingLabel={copy.creating}
            savingLabel={copy.saving}
          />
        )}

        <DialogFooter>
          {phase === "confirm" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button
                disabled={health.status !== "healthy"}
                className={cn(isRollback && "bg-error-fg text-error-bg")}
                onClick={onConfirm}
              >
                {copy.confirmButton}
              </Button>
            </>
          )}

          {(phase === "creating" || phase === "saving") && (
            <Button disabled>
              {phase === "creating" ? copy.creating : copy.saving}
            </Button>
          )}

          {(phase === "success" || phase === "error") && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionStats({ details }: { details: TransactionDetails }) {
  return (
    <div className="bg-muted/30 rounded-lg border p-4">
      <div className="mb-3 border-b pb-3">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Modified range
        </div>

        <div className="mt-1 font-semibold">
          {details.from === details.to
            ? details.from
            : `${details.from} – ${details.to}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Modified events</div>
          <div className="font-semibold">{details.updatedEvents}</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Modified logs</div>
          <div className="font-semibold">{details.changedLogs}</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Deleted events</div>
          <div className="font-semibold">{details.deletedEvents}</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Total requests</div>
          <div className="font-semibold">{details.totalRequests}</div>
        </div>
      </div>
    </div>
  );
}
