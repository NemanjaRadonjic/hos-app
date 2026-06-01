import { useQuery } from "@tanstack/react-query";
import { getLatestDriverStatuses } from "../api";
import type { LatestDriverStatus } from "../types";
import { useMemo } from "react";
import { useLatestDriverStatuses } from "./useLatestDriverStatuses";

export const useLatestDriverStatus = (driverId) => {
  const { latestDriverStatuses, isLoading } = useLatestDriverStatuses();

  const latestDriverStatus = useMemo(() => {
    return latestDriverStatuses.find((d) => d.id === driverId);
  }, [latestDriverStatuses, driverId]);

  return {
    latestDriverStatus,
    isLoading,
  };
};
