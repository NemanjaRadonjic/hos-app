import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api";
import type { User } from "../types";

export const useUsers = () => {
  const query = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
    retry: false,
    staleTime: Infinity,
  });

  return query;
};
