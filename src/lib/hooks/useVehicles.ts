import { useQuery } from "@tanstack/react-query";
import { getVehicles } from "../api";

export const useVehicles = () => {
  const query = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
    retry: false,
    staleTime: Infinity,
  });
  return query;
};
