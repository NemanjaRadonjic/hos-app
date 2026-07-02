import { MdError } from "react-icons/md";
import { Badge } from "./ui/badge";
import type { LogDiagnosticsState, LogIssue } from "@/lib/log-check";

type LogCheckListProps = {
  diagnostics: LogDiagnosticsState;
  handleIssueClick: (issue: LogIssue) => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export function LogCheckList({
  diagnostics,
  handleIssueClick,
  setOpen,
}: LogCheckListProps) {
  const issues = diagnostics.issues;

  const groupedIssues = Object.entries(
    issues.reduce(
      (acc, issue) => {
        acc[issue.logDate] ??= [];
        acc[issue.logDate].push(issue);
        return acc;
      },
      {} as Record<string, typeof issues>,
    ),
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, issues]) => issues);

  const handleClick = (issue: LogIssue) => {
    handleIssueClick(issue);
    setOpen(false);
  };

  return (
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
                    onClick={() => handleClick(issue)}
                    className="hover:bg-background flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 transition"
                  >
                    <Badge
                      variant={`${issue.severity}_filled`}
                      className="flex items-center"
                    >
                      <MdError />
                      {issue.group}
                    </Badge>
                    <span
                      className={`flex-1 text-xs text-${issue.severity}-fg`}
                    >
                      {issue.message}
                    </span>

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
  );
}
