import { MdError } from "react-icons/md";
import { Badge } from "./ui/badge";
import type { LogDiagnosticsState, LogIssue } from "@/lib/log-check";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { BsFillClipboardCheckFill } from "react-icons/bs";

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

  const errorIssues = issues.filter((issue) => issue.severity === "error");
  const warningIssues = issues.filter((issue) => issue.severity === "warning");

  if (!issues.length) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed">
        <BsFillClipboardCheckFill className="text-success mb-3 h-10 w-10" />

        <h3 className="text-sm font-medium">No issues found</h3>

        <p className="text-muted-foreground mt-1 max-w-xs text-center text-xs">
          This log passed all validation checks. No errors or warnings were
          detected.
        </p>
      </div>
    );
  }

  const renderIssues = (items: LogIssue[]) => {
    const groupedIssues = Object.entries(
      items.reduce(
        (acc, issue) => {
          acc[issue.logDate] ??= [];
          acc[issue.logDate].push(issue);
          return acc;
        },
        {} as Record<string, LogIssue[]>,
      ),
    )
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, issues]) => issues);

    if (items.length === 0) {
      return (
        <div className="text-muted-foreground text-sm">No issues found.</div>
      );
    }

    return (
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
                  className="hover:bg-background flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition"
                >
                  <Badge
                    variant={`${issue.severity}_filled`}
                    className="flex items-center"
                  >
                    <MdError />
                    {issue.group}
                  </Badge>

                  <span className={`flex-1 text-xs text-${issue.severity}-fg`}>
                    {issue.message}
                  </span>

                  <span className="text-muted-foreground text-[10px]">
                    {issue.eventId ? "Event" : "Log"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

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

      <Tabs defaultValue="error">
        <TabsList className="mb-3 grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger
            value="error"
            className="data-[state=active]:bg-error-fg data-[state=active]:text-error-bg cursor-pointer rounded-xl text-xs"
          >
            <MdError />
            Errors ({errorIssues.length})
          </TabsTrigger>
          <TabsTrigger
            value="warning"
            className="data-[state=active]:bg-warning-bg data-[state=active]:text-warning-fg cursor-pointer rounded-xl text-xs"
          >
            <MdError />
            Warnings ({warningIssues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="error">{renderIssues(errorIssues)}</TabsContent>

        <TabsContent value="warning">{renderIssues(warningIssues)}</TabsContent>
      </Tabs>
    </div>
  );
}
