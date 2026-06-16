import { DateTime } from "luxon";
import { useParams } from "@tanstack/react-router";
import type { HosTimers, Violation } from "@/lib/hos/calculations";

import CycleList from "./cycles-list";

import { useDriverData } from "@/lib/hooks/useDriverData";
import HosClocks from "./hos-clocks";

import DriverSelect from "./driver-select";
import DriverForm from "./driver-form";
import { DatePicker } from "./date-picker";
import { MdSignalWifi4Bar, MdSignalWifiBad } from "react-icons/md";
import { Badge } from "../ui/badge";
import { FaRoad } from "react-icons/fa";
import { useTransaction } from "@/lib/hooks/useTransaction";
import { useDriversData } from "@/lib/hooks/useDriversData";
import CoDriver from "./co-driver";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { TbAlertTriangle, TbAlertTriangleFilled } from "react-icons/tb";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "../ui/popover";
import { Button } from "../ui/button";
import { SpaceIcon } from "lucide-react";
import type { ProviderViolation } from "@/lib/types";
import type { LogDiagnosticsState } from "@/lib/hos/build-log-diagnostics";

interface LogHeadProps {
  value: DateTime<true> | DateTime<false>;
  onChange: React.Dispatch<
    React.SetStateAction<DateTime<true> | DateTime<false>>
  >;
  hosTimers: HosTimers;
  selectedDay: DateTime<true>;
  totalMiles: number;
  vehicles: string[];
  violations: Violation[];
  diagnostics: LogDiagnosticsState;
}

const LogHead = ({
  value,
  onChange,
  hosTimers,
  selectedDay,
  totalMiles,
  vehicles,
  violations,
  diagnostics,
}: LogHeadProps) => {
  const { driverId } = useParams({
    from: "/drivers/$driverId",
  });
  const { driver, isLoading } = useDriverData(driverId);
  const { drivers } = useDriversData();
  const { getDailyLog, updateDailyLog, getSummary } = useTransactionContext();
  const currentDailyLog = getDailyLog(selectedDay.toFormat("yyyy/MM/dd"));
  const dailyLogSummary = getSummary(selectedDay.toFormat("yyyy/MM/dd"));
  const form = currentDailyLog?.form;

  const { driver: coDriver, isCoDriverLoading } = useDriverData(
    form?.coDriver?.id || null,
  );
  const provider_violations = dailyLogSummary?.violations ?? [];
  const totalViolations = violations.length + provider_violations.length;
  const selectedDaySummary = getSummary(selectedDay.toFormat("yyyy/MM/dd"));

  return (
    <section className="run dev flex w-full items-center gap-4 px-6 py-2 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <div>
            {driver?.isConnected ? (
              <Badge className="flex items-center bg-green-200/20 text-[14px] text-green-600">
                <MdSignalWifi4Bar size={24} /> Connected
              </Badge>
            ) : (
              <Badge>
                <MdSignalWifiBad
                  size={24}
                  className="flex items-center bg-red-200/20 text-[14px] text-red-500"
                />{" "}
                Disconnected
              </Badge>
            )}
          </div>
          <Badge>
            <FaRoad />
            {totalMiles} mi
          </Badge>
        </div>
        <DatePicker onChange={onChange} value={value} />
      </div>
      <div className="flex flex-col justify-start gap-2">
        {coDriver && <CoDriver coDriverId={coDriver.id} />}

        <div className="flex items-center gap-2">
          <DriverSelect driverId={driverId} />
        </div>
      </div>
      <DriverForm
        vehicles={vehicles}
        currentDailySummary={selectedDaySummary}
        selectedDay={selectedDay}
        diagnostics={diagnostics}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="relative text-red-500 hover:text-red-600"
          >
            <TbAlertTriangle className="h-4 w-4" />
            {totalViolations > 0 && (
              <span className="ring-background absolute -top-2 -right-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2">
                {totalViolations}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-fit text-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="font-medium text-red-500">Violation details</div>
              {violations.length ? (
                violations.map((v) => (
                  <div
                    key={`${v.rule}-${v.startTs}`}
                    className="w-fit rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-500"
                  >
                    ⚠ {v.rule} violation at{" "}
                    {DateTime.fromMillis(v.startTs).toFormat(
                      "MM/dd hh:mm:ss a",
                    )}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No violations</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <PopoverHeader>Provider: </PopoverHeader>
              {provider_violations.length ? (
                provider_violations.map((v) => (
                  <div
                    key={`${v.regulation.id}-${v.startTime.timestamp}`}
                    className="w-fit rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-500"
                  >
                    ⚠ {v.regulation.id} violation at{" "}
                    {DateTime.fromMillis(v.startTime.timestamp).toFormat(
                      "MM/dd hh:mm:ss a",
                    )}
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground">No violations</span>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex justify-end gap-2">
        <HosClocks hosTimers={hosTimers} driver={driver} />
        <CycleList
          hosTimers={hosTimers}
          selectedDay={selectedDay}
          setSelectedDay={onChange}
        />
      </div>
    </section>
  );
};

export default LogHead;
