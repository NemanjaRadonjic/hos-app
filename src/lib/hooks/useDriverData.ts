import { useMemo } from "react";
import { useDriversData } from "./useDriversData";

export const useDriverData = (driverId: string) => {
  const { drivers, isLoading } = useDriversData();

  const driver = useMemo(() => {
    return drivers.find((d) => d.id === driverId)!;
  }, [drivers, driverId]);

  return {
    driver,
    isLoading,
  };
};
