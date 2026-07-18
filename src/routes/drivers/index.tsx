import { DriverTable } from "@/components/driver-table";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/drivers/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { drivers, isLoading } = useDriversData();

  return <DriverTable data={drivers} />;
}
