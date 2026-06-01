import { createFileRoute } from "@tanstack/react-router";
import { DriverTable } from "@/components/driver-table";
import type { TimeBlock } from "@/lib/types";
import { useDriversData } from "@/lib/hooks/useDriversData";

export const Route = createFileRoute("/")({
  component: Index,
});

export type DriverTableData = {
  id: string;
  name: string;
  vehicle: string;
  status: string;
  location: string;
  breakTime: TimeBlock;
  driveTime: TimeBlock;
  shiftTime: TimeBlock;
  cycleTime: TimeBlock;
  currentActivity: string;
};

function Index() {
  const { drivers, isLoading } = useDriversData();

  return <DriverTable data={drivers} />;
}
