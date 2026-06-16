import type { DailyLog } from "@/lib/types";

export const findNearestSignature = (
  dailyLogs: DailyLog[],
  selectedLogDate: string,
) => {
  const sortedLogs = [...dailyLogs].sort((a, b) =>
    a.logDate.date.localeCompare(b.logDate.date),
  );

  const selectedIndex = sortedLogs.findIndex(
    (log) => log.logDate.date === selectedLogDate,
  );

  if (selectedIndex === -1) return undefined;

  // search backwards first
  for (let i = selectedIndex; i >= 0; i--) {
    const signature = sortedLogs[i]?.form.signature;
    if (signature) return signature;
  }

  // fallback: search forwards
  for (let i = selectedIndex + 1; i < sortedLogs.length; i++) {
    const signature = sortedLogs[i]?.form.signature;
    if (signature) return signature;
  }

  return undefined;
};
