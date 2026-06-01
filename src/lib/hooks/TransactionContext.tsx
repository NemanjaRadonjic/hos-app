import { createContext, useContext } from "react";
import type { useTransaction } from "@/lib/hooks/useTransaction";

export type TransactionContextType = ReturnType<typeof useTransaction>;

export const TransactionContext = createContext<TransactionContextType | null>(
  null,
);

export const useTransactionContext = () => {
  const context = useContext(TransactionContext);

  if (!context) {
    throw new Error(
      "useTransactionContext must be used within TransactionProvider",
    );
  }

  return context;
};
