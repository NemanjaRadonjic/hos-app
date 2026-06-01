import { useMemo } from "react";
import { useLatestDriverStatuses } from "./useLatestDriverStatuses";
import { useUsers } from "./useUsers";
import { useVehicles } from "./useVehicles";
import type { DriverInfo, User, Vehicle } from "../types";

type TimeRule = {
  accumulatedRestartTime: number;
  accumulatedTime: number;
  limitTime: number;
  regulation: { id: string };
  restartTime: number;
};
type DriverData = {
  avu?: number;
  driverInfo: DriverInfo;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
};
export type DriverSimplified = {
  id: string;
  name: string;
  status: string;
  isConnected: boolean;
  location: string;
  vehicle: string;
  totalMiles?: number;

  breakTime: TimeRule;
  driveTime: TimeRule;
  shiftTime: TimeRule;
  cycleTime: TimeRule;

  dataAsDriver: DriverData;
  dataAsCoDriver: DriverData;
};
type UseDriversDataResult = {
  drivers: DriverSimplified[];
  isLoading: boolean;
};
export const useDriversData = (): UseDriversDataResult => {
  const usersQuery = useUsers();
  const vehiclesQuery = useVehicles();
  const statusesQuery = useLatestDriverStatuses();

  const users = usersQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  const drivers = useMemo<DriverSimplified[]>(() => {
    return statuses.map((status) => {
      const driver = users.find((u: User) => u._id === status.userId)!;
      const vehicle = vehicles.find(
        (v: Vehicle) => v._id === status.vehicle.id,
      );
      return {
        id: status.userId,
        name: driver
          ? `${driver.firstName?.trim() || ""} ${driver.lastName?.trim() || ""}`.trim() ||
            "Unknown Driver"
          : "Unknown Driver",
        vehicle: vehicle?.name || "No Vehicle",
        status: status.hosEvent.eventCode.id,
        location: status.location?.calculatedLocation || "Unknown Location",
        driveTime: status.driveTime,
        shiftTime: status.shiftTime,
        breakTime: status.breakTime,
        cycleTime: status.cycleTime,
        totalMiles: status.hosEvent.totalVehicleMiles,
        isConnected: status.ec,
        dataAsCoDriver: {
          driverInfo: driver?.driverInfo as DriverInfo,
          id: driver?._id ?? "",
          firstName: driver?.firstName ?? "",
          lastName: driver?.lastName ?? "",
          email: driver?.email ?? "",
        },
        dataAsDriver: {
          avu: driver?.avu,
          driverInfo: driver?.driverInfo as DriverInfo,
          id: driver?._id ?? "",
          firstName: driver?.firstName ?? "",
          lastName: driver?.lastName ?? "",
          email: driver?.email ?? "",
        },
      };
    });
  }, [users, vehicles, statuses]);
  console.log({ drivers });

  return {
    drivers,

    isLoading:
      usersQuery.isLoading ||
      vehiclesQuery.isLoading ||
      statusesQuery.isLoading,
  };
};
