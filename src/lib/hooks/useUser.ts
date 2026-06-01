import { useQuery } from "@tanstack/react-query";
import { getUser } from "../api";
import type { User } from "../types";

export const useUser = (userId: string) => {
  const { data, isFetching } = useQuery<User>({
    queryKey: ["driver_user", userId],
    queryFn: () => getUser(userId),
    staleTime: Infinity,
  });

  return { user: data, isUserFetching: isFetching };
};
