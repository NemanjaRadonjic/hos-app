import { DateTime } from "luxon";
import type { HosEvent } from "../types";

type CheckCertResult = {
  hasCert: boolean;
  error: string | null;
};

export default function checkCert(
  events: HosEvent[],
  selectedDate: string,
  signature: boolean,
): CheckCertResult {
  const today = DateTime.now()
    .setZone("America/Chicago")
    .toFormat("yyyy/MM/dd");

  const certEvent = events.find(
    (e) =>
      e.eventCode.id === "DR_CERT_1" &&
      e.certifiedRecordLogDate?.date === selectedDate,
  );

  if (!certEvent) return { hasCert: false, error: "No certification" };

  if (!signature) return { hasCert: true, error: "No signature" };

  const certifiedDate = certEvent.certifiedRecordLogDate!.date;
  const certifiedAtTs = certEvent.eventTime.timestamp;
  const certifiedAtDate = DateTime.fromMillis(certifiedAtTs)
    .setZone("America/Chicago")
    .toFormat("yyyy/MM/dd");

  if (certifiedDate > certifiedAtDate) {
    return { hasCert: true, error: "Invalid certification" };
  }

  if (certifiedDate < today) {
    return { hasCert: true, error: null };
  }

  return { hasCert: true, error: null };
}
