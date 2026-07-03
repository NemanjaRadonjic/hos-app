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
import type { LogIssue } from "@/lib/log-check";
import { LogCheckList } from "./log-check-list";
import { BsFillClipboardCheckFill } from "react-icons/bs";
import { Badge } from "./ui/badge";
import { MdError } from "react-icons/md";

type LogCheckProps = {
  diagnostics: LogDiagnosticsState;
  handleIssueClick: (issue: LogIssue) => void;
};
export const LogCheck = ({ diagnostics, handleIssueClick }: LogCheckProps) => {
  const [open, setOpen] = useState(false);

  const issues = diagnostics.issues;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const hasIssues = issues.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          {hasIssues ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}

          <span>Log Check</span>

          {hasIssues && (
            <span className="ml-1 flex items-center gap-1">
              {errorCount > 0 && (
                <Badge variant="error_filled">
                  <MdError />
                  {errorCount}
                </Badge>
              )}

              {warningCount > 0 && (
                <Badge variant="warning_filled">
                  <MdError />
                  {warningCount}
                </Badge>
              )}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasIssues ? (
              <AlertTriangle className="text-error h-5 w-5" />
            ) : (
              <BsFillClipboardCheckFill className="text-success h-5 w-5" />
            )}
            Log diagnostics
          </DialogTitle>
        </DialogHeader>

        <LogCheckList
          diagnostics={diagnostics}
          handleIssueClick={handleIssueClick}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  );
};
