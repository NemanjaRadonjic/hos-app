import { useQuery } from "@tanstack/react-query";
import api from "../axios";
import { getTokenPayload } from "../helpers";
import type { Company } from "../types";

export const useCompany = () => {
  const payload = getTokenPayload();

  return useQuery<Company>({
    queryKey: ["company", payload?.user.cid],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${payload?.user.cid}`);

      return data;
    },
    enabled: !!payload?.user.cid,
    staleTime: Infinity,
  });
};
