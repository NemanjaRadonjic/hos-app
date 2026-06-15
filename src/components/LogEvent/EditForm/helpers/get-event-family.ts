import type { EventFamily } from "../../helpers/types";

export function getEventFamily(status: string): EventFamily {
  if (
    status.startsWith("DS_") ||
    status.startsWith("ENG_") ||
    status.startsWith("DR_IND_")
  )
    return "BASIC";
  if (status.startsWith("DR_CERT_")) return "CERT";
  if (status.startsWith("DR_LOGIN") || status.startsWith("DR_LOGOUT"))
    return "AUTH";
  if (status.startsWith("DIAG_") || status.startsWith("MALF_")) return "DIAG";
  return "BASIC";
}
