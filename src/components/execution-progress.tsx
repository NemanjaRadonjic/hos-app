import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { BsCheckCircleFill } from "react-icons/bs";
import { BiSolidError } from "react-icons/bi";
import type { CommitProgress } from "@/lib/hooks/useTransaction";

type ExecutionPhase =
  | "confirm"
  | "creating"
  | "saving"
  | "finalizing"
  | "success"
  | "error";

type ExecutionProgressProps = {
  phase: ExecutionPhase;
  progress: CommitProgress;
  creatingLabel: string;
  savingLabel: string;
};

export function ExecutionProgress({
  phase,
  progress,
  creatingLabel,
  savingLabel,
}: ExecutionProgressProps) {
  const percent =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  return (
    <div className="space-y-4 py-3">
      <ExecutionStep
        label={creatingLabel}
        state={phase === "creating" ? "loading" : "success"}
      />

      <ExecutionStep
        label={savingLabel}
        state={
          phase === "creating"
            ? "pending"
            : phase === "saving"
              ? "loading"
              : phase === "finalizing" || phase === "success"
                ? "success"
                : "error"
        }
      />

      {(phase === "saving" ||
        phase === "finalizing" ||
        phase === "success") && (
        <div className="ml-9 space-y-2">
          <Progress value={percent} />

          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              {progress.done}/{progress.total} done · {progress.success} success
              · {progress.failed} failed
            </span>

            <span>{percent}%</span>
          </div>

          {progress.waiting && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
              <div className="text-xs">{progress.waiting.label}</div>

              <div className="mt-1 flex items-center gap-2 text-xs">
                <Spinner />
                Server unresponsive — waiting for response
              </div>
            </div>
          )}
        </div>
      )}

      <ExecutionStep
        label={phase === "success" ? "Complete" : "Finalizing"}
        state={
          phase === "creating" || phase === "saving"
            ? "pending"
            : phase === "finalizing"
              ? "loading"
              : phase === "success"
                ? "success"
                : "error"
        }
      />
    </div>
  );
}

type ExecutionStepState = "pending" | "loading" | "success" | "error";

function ExecutionStep({
  label,
  state,
}: {
  label: string;
  state: ExecutionStepState;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center">
        {state === "loading" && <Spinner />}

        {state === "success" && (
          <BsCheckCircleFill className="text-success size-5" />
        )}

        {state === "error" && <BiSolidError className="text-error-fg size-5" />}

        {state === "pending" && (
          <div className="border-muted-foreground/30 size-3 rounded-full border" />
        )}
      </div>

      <span
        className={
          state === "pending"
            ? "text-muted-foreground text-sm"
            : "text-sm font-medium"
        }
      >
        {label}
      </span>
    </div>
  );
}
