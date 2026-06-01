import { useQuery } from "@tanstack/react-query";
import { getLatestDriverStatuses } from "../api";
import type { LatestDriverStatus } from "../types";

export const useLatestDriverStatuses = () => {
  const query = useQuery<LatestDriverStatus[]>({
    queryKey: ["latest_driver_statuses"],
    queryFn: getLatestDriverStatuses,
    retry: false,
    staleTime: Infinity,
  });

  return query;
};
