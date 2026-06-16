import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LogDiagnosticsState } from "@/lib/hos/build-log-diagnostics";
import { DateTime } from "luxon";
import type { LogIssue } from "@/lib/log-check";

type LogCheckProps = {
  diagnostics: LogDiagnosticsState;
  setSelectedDay: (day: DateTime) => void;
  setFocusedId: (id: string) => void;
};
export const LogCheck = ({
  diagnostics,
  setSelectedDay,
  setFocusedId,
}: LogCheckProps) => {
  const [open, setOpen] = useState(false);

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

  function handleIssueClick(issue: LogIssue) {
    setSelectedDay(DateTime.fromFormat(issue.logDate, "yyyy/MM/dd"));

    if (issue.eventId) {
      setFocusedId(issue.eventId);
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={issues.length ? "destructive" : "outline"}>
          {issues.length ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
          Log Check
          {issues.length > 0 && ` (${issues.length})`}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {issues.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            Log diagnostics
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Detected issues</span>

            <span className="text-muted-foreground text-xs">
              {issues.length} {issues.length === 1 ? "issue" : "issues"}
            </span>
          </div>

          {issues.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No log issues found.
            </div>
          ) : (
            <div className="max-h-80 space-y-3 overflow-auto pr-1">
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
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleIssueClick(issue)}
                        className="hover:bg-background flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 transition"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                        <span className="flex-1">{issue.message}</span>

                        {issue.eventId ? (
                          <span className="text-muted-foreground text-[10px]">
                            Event
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">
                            Log
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
