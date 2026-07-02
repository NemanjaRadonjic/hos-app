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

type LogCheckProps = {
  diagnostics: LogDiagnosticsState;
  handleIssueClick: (issue: LogIssue) => void;
};
export const LogCheck = ({ diagnostics, handleIssueClick }: LogCheckProps) => {
  const [open, setOpen] = useState(false);

  const issues = diagnostics.issues;

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
        <LogCheckList
          diagnostics={diagnostics}
          handleIssueClick={handleIssueClick}
          setOpen={setOpen}
        />
      </DialogContent>
    </Dialog>
  );
};
