import { useMemo } from "react";
import { useLatestDriverStatuses } from "./useLatestDriverStatuses";
import { useUsers } from "./useUsers";
import { useVehicles } from "./useVehicles";
import type { DriverInfo, HosEvent, Vehicle } from "../types";

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
  dId: string;
  name: string;
  status: string;
  isConnected: boolean;
  location: HosEvent["location"];
  phone: string;
  updatedAt: number;
  vehicle: { id: string; name: string; vin: string };

  breakTime: TimeRule;
  driveTime: TimeRule;
  shiftTime: TimeRule;
  cycleTime: TimeRule;

  dataAsDriver: DriverData;
  dataAsCoDriver: DriverData;
};
type UseDriversDataResult = {
  drivers: DriverSimplified[];
  vehicles: Vehicle[];
  elds: any[];
  isLoading: boolean;
};
export const useDriversData = (): UseDriversDataResult => {
  const usersQuery = useUsers();
  const vehiclesQuery = useVehicles();
  const statusesQuery = useLatestDriverStatuses();

  const users = usersQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  // for now elds from vehicles, if needed we make request hehe
  const elds = vehicles.flatMap((v: Vehicle) => (v.eld ? [v.eld] : []));

  const vehicleSimplified = vehicles.flatMap((v: Vehicle) => ({
    id: v._id,
    name: v.name,
    vin: v.vin,
  }));

  const drivers: DriverSimplified[] = useMemo(() => {
    return statuses
      .filter((status) => {
        const driver = users.find((u) => u._id === status.userId);
        return driver?.active === true;
      })
      .map((status) => {
        const driver = users.find((u) => u._id === status.userId)!;

        const vehicle = vehicles.find(
          (v: Vehicle) => v._id === status.vehicle.id,
        );

        return {
          id: status.userId,
          dId: driver.dId,
          name: driver
            ? `${driver.firstName?.trim() || ""} ${driver.lastName?.trim() || ""}`.trim() ||
              "Unknown Driver"
            : "Unknown Driver",
          vehicle: { ...status.vehicle, name: vehicle?.name },
          status: status.hosEvent.eventCode.id,
          location: status.location,
          phone: driver.phoneNum,
          updatedAt: status.updatedAt,
          driveTime: status.driveTime,
          shiftTime: status.shiftTime,
          breakTime: status.breakTime,
          cycleTime: status.cycleTime,
          totalMiles: status.hosEvent.totalVehicleMiles,
          isConnected: status.ec,
          dataAsCoDriver: {
            email: driver?.email ?? "",
            firstName: driver?.firstName ?? "",
            lastName: driver?.lastName ?? "",
            driverInfo: driver?.driverInfo as DriverInfo,
            id: driver?._id ?? "",
          },
          dataAsDriver: {
            email: driver?.email ?? "",
            firstName: driver?.firstName ?? "",
            lastName: driver?.lastName ?? "",
            driverInfo: driver?.driverInfo as DriverInfo,
            avu: driver?.avu,
            id: driver?._id ?? "",
          },
        };
      });
  }, [users, vehicles, statuses]);

  return {
    drivers,
    vehicles: vehicleSimplified,
    elds,
    isLoading:
      usersQuery.isLoading ||
      vehiclesQuery.isLoading ||
      statusesQuery.isLoading,
  };
};
