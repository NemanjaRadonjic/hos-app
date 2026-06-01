import { DateTime } from "luxon";
import { useParams } from "@tanstack/react-router";
import type { HosTimers } from "@/lib/hos/calculations";

import CycleList from "./cycles-list";

import { useDriverData } from "@/lib/hooks/useDriverData";
import HosClocks from "./hos-clocks";

import DriverSelect from "./driver-select";
import DriverForm from "./driver-form";
import { DatePicker } from "./date-picker";
import { useDailyLogsData } from "@/lib/hooks/useDailyLogData";
import { MdSignalWifi4Bar, MdSignalWifiBad } from "react-icons/md";
import { Badge } from "../ui/badge";
import { FaRoad } from "react-icons/fa";
import { useState } from "react";
import { useTransaction } from "@/lib/hooks/useTransaction";
import { useDriversData } from "@/lib/hooks/useDriversData";
import CoDriver from "./co-driver";

interface LogHeadProps {
  value: DateTime<true> | DateTime<false>;
  onChange: React.Dispatch<
    React.SetStateAction<DateTime<true> | DateTime<false>>
  >;
  hosTimers: HosTimers;
  selectedDay: DateTime<true>;
  totalMiles: number;
  vehicles: string[];
}

const LogHead = ({
  value,
  onChange,
  hosTimers,
  selectedDay,
  totalMiles,
  vehicles,
}: LogHeadProps) => {
  const { driverId } = useParams({
    from: "/drivers/$driverId",
  });
  const { driver, isLoading } = useDriverData(driverId);
  const { drivers } = useDriversData();
  const { getDailyLog, updateDailyLog, getSummary } = useTransaction(
    driverId,
    selectedDay,
  );
  const currentDailyLog = getDailyLog(selectedDay.toFormat("yyyy/MM/dd"));

  const form = currentDailyLog?.form;

  const { driver: coDriver, isCoDriverLoading } = useDriverData(
    form?.coDriver?.id || null,
  );
  const selectedDaySummary = getSummary(selectedDay.toFormat("yyyy/MM/dd"));

  console.log({ form });

  return (
    <section className="flex w-full items-center gap-4 px-6 py-2 shadow-sm">
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
      />
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
