import type { HosEvent } from "@/lib/types";
import type {
  AppHosEvent,
  AuthHosEventStrict,
  BasicHosEventStrict,
  CertHosEvent,
  ClientHosEventBase,
  DiagHosEventStrict,
  Draft,
} from "../helpers/types";
import { validateDraft } from "./validate-form";

type BuildPayloadArgs = {
  original: HosEvent;
  draft: Draft;
};

const buildBasePayload = (
  original: HosEvent,
  draft: Draft,
): ClientHosEventBase => ({
  _id: original._id,
  companyId: original.companyId,
  userId: original.userId,
  suggestedEditEventIds: original.suggestedEditEventIds,
  type: original.type,
  dSTime: original.dSTime,
  dId: original.dId,
  ...(original.pd ? { pd: original.pd } : { pd: false }),
  ...(original.at ? { at: original.at } : { at: true }),
  ...(original.av && { av: original.av }),

  seqId: Number(draft.event.seqId).toString(16),
  eventCode: { id: draft.event.eventCode },
  eventTime: draft.event.eventTime,
  vehicle: draft.event.vehicle,
  isLive: draft.event.locationSource,

  ...(draft.event.note !== undefined && {
    eventComment: draft.event.note,
  }),
});

export function buildPayload({
  original,
  draft,
}: BuildPayloadArgs): AppHosEvent | null {
  const errors = validateDraft(draft);

  if (Object.values(errors).some(Boolean)) {
    return null;
  }

  const base = buildBasePayload(original, draft);

  switch (draft.family) {
    case "CERT": {
      if (!draft.event.certifiedRecordLogDate) return null;

      return {
        ...base,
        certifiedRecordLogDate: draft.event.certifiedRecordLogDate,
      } satisfies CertHosEvent;
    }

    case "BASIC": {
      if (
        !draft.event.vehicle ||
        !draft.event.eld ||
        !draft.event.location ||
        !draft.event.origin ||
        !draft.event.status ||
        draft.event.odometer == null ||
        draft.event.engineHours == null
      ) {
        return null;
      }

      return {
        ...base,

        vehicle: draft.event.vehicle,
        eld: draft.event.eld,
        location: draft.event.location,

        recordOrigin: { id: draft.event.origin },
        recordStatus: { id: draft.event.status },

        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,
      } satisfies BasicHosEventStrict;
    }

    case "AUTH": {
      if (
        !draft.event.origin ||
        !draft.event.eld ||
        draft.event.odometer == null ||
        draft.event.engineHours == null
      ) {
        return null;
      }
      return {
        ...base,

        recordOrigin: { id: draft.event.origin },

        eld: draft.event.eld,
        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,
      } satisfies AuthHosEventStrict;
    }

    case "DIAG": {
      if (
        !draft.event.location ||
        !draft.event.eld ||
        !draft.event.vehicle ||
        !draft.event.origin ||
        draft.event.odometer == null ||
        draft.event.engineHours == null
      ) {
        return null;
      }
      return {
        ...base,
        vehicle: draft.event.vehicle,
        eld: draft.event.eld,
        location: draft.event.location,
        recordOrigin: { id: draft.event.origin },
        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,
        fc: {
          id: "D_POWER",
        },
        dg: { cm: "pw:eeo" },
      } satisfies DiagHosEventStrict;
    }
  }
}
