import { FaTrailer, FaTruckFront } from "react-icons/fa6";
import { IoDocumentText } from "react-icons/io5";
import { Badge } from "../ui/badge";
import { MdEdit } from "react-icons/md";
import { BiSolidCertification, BiSolidError } from "react-icons/bi";
import { TbClipboardCheckFilled, TbClipboardXFilled } from "react-icons/tb";

import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { ShippingForm } from "./shipping-form";
import { useState } from "react";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import type { LogIssue } from "@/lib/log-check";

type DriverFormProps = {};

export default function DriverForm({
  vehicles,
  currentDailySummary,
  selectedDay,
  diagnostics,
}: DriverFormProps) {
  const [open, setOpen] = useState(false);
  const { updateDailyLog, getDailyLog } = useTransactionContext();
  const dailyLog = getDailyLog(selectedDay.toFormat("yyyy/MM/dd"));
  const form = dailyLog?.form;
  const dayDiagnostics = diagnostics.byDate[selectedDay.toFormat("yyyy/MM/dd")];

  const certIssue = dayDiagnostics?.issues.find(
    (issue: LogIssue) => issue.group === "Certification",
  );

  const certError = certIssue?.message ?? null;
  const hasCert = dayDiagnostics?.derived.isCertified ?? false;
  return (
    <div className="flex flex-1 gap-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-col space-y-2">
          <Badge className="flex items-center gap-2">
            <FaTruckFront />
            {vehicles.length ? vehicles?.map((v) => v.name) : "None"}
          </Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Badge className="cursor-pointer">
                <MdEdit />
                Form
              </Badge>
            </DialogTrigger>
            <DialogContent className="w-lg overflow-visible">
              <ShippingForm
                selectedDay={selectedDay}
                dailyLog={dailyLog}
                updateDailyLog={updateDailyLog}
                closeDialog={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-1">
              {form?.trailers?.length ? (
                form?.trailers?.map((trailer, i) => (
                  <Badge
                    key={`${trailer}-${i}`}
                    className="flex items-center text-[14px]"
                    variant="secondary"
                  >
                    <FaTrailer className="shrink-0" />
                    {trailer}
                  </Badge>
                ))
              ) : (
                <Badge
                  className="flex items-center bg-red-200/20 text-[14px] text-red-500"
                  variant="secondary"
                >
                  <BiSolidError className="shrink-0" />
                  Missing trailer
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-1">
              {form?.shippingDocuments?.length ? (
                form?.shippingDocuments?.map((doc, i) => (
                  <Badge
                    key={`${doc}-${i}`}
                    className="flex items-center text-[14px]"
                    variant="outline"
                  >
                    <IoDocumentText className="shrink-0" />
                    {doc}
                  </Badge>
                ))
              ) : (
                <Badge
                  className="flex items-center bg-red-200/20 text-[14px] text-red-500"
                  variant="secondary"
                >
                  <BiSolidError className="shrink-0" />
                  Missing documents
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 justify-center gap-4">
        <div className="flex flex-col items-center justify-center gap-3">
          <div>
            {form ? (
              <Badge variant="success">
                <TbClipboardCheckFilled /> Forms
              </Badge>
            ) : (
              <Badge variant="error">
                <TbClipboardXFilled /> No forms
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3">
          {certError ? (
            <Badge variant="error">
              <BiSolidCertification /> {certError}
            </Badge>
          ) : hasCert ? (
            <Badge variant="success">
              <BiSolidCertification /> Certified
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
