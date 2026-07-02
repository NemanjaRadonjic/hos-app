import { createFileRoute } from "@tanstack/react-router";
import { DriverTable } from "@/components/driver-table";
import { useDriversData } from "@/lib/hooks/useDriversData";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { drivers, isLoading } = useDriversData();

  return <DriverTable data={drivers} />;
}
