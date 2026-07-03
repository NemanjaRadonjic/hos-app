import type { HosEvent } from "@/lib/types";
import type {
  AuthHosEvent,
  BasicHosEvent,
  CertHosEvent,
  DiagHosEvent,
  Draft,
} from "../helpers/types";
import { validateDraft } from "./validate-form";

type BuildPayloadArgs = {
  original: HosEvent;
  draft: Draft;
};

export function buildPayload({ original, draft }: BuildPayloadArgs) {
  const errors = validateDraft(draft);

  if (Object.values(errors).some(Boolean)) {
    return null;
  }

  switch (draft.family) {
    case "CERT": {
      if (!draft.event.certifiedRecordLogDate) return null;

      return {
        _id: original._id,
        _rev: original._rev,
        companyId: original.companyId,
        userId: original.userId,

        createdBy: original.createdBy,
        createdAt: original.createdAt,
        updatedBy: original.updatedBy,
        updatedAt: original.updatedAt,

        seqId: Number(draft.event.seqId).toString(16),
        isLive: draft.event.locationSource,
        eventCode: { id: draft.event.eventCode },
        eventTime: draft.event.eventTime,
        vehicle: draft.event.vehicle,

        suggestedEditEventIds: original.suggestedEditEventIds,

        av: original.av,
        pd: original.pd,
        at: original.at,

        type: original.type,
        dSTime: original.dSTime,
        dId: original.dId,
        stime: original.stime,

        certifiedRecordLogDate: draft.event.certifiedRecordLogDate,
      } satisfies CertHosEvent;
    }
    case "BASIC": {
      if (
        !draft.event.vehicle ||
        !draft.event.eld ||
        !draft.event.origin ||
        !draft.event.status ||
        draft.event.odometer == null ||
        draft.event.engineHours == null
      ) {
        return null;
      }

      const isLive = draft.event.locationSource;
      const manualLocation = draft.event.positioning === "MANUAL";
      const autoLocation = draft.event.positioning === "AUTO";

      return {
        _id: original._id,
        _rev: original._rev,
        companyId: original.companyId,
        userId: original.userId,

        createdBy: original.createdBy,
        createdAt: original.createdAt,
        updatedBy: original.updatedBy,
        updatedAt: original.updatedAt,

        seqId: Number(draft.event.seqId).toString(16),

        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,

        ...(manualLocation && {
          driverLocationDescription: draft.event.driverLocationDescription,
        }),
        // copy from original
        ...(original.accumulatedVehicleMiles && {
          accumulatedVehicleMiles: original.accumulatedVehicleMiles,
        }),
        ...(original.elapsedEngineHours && {
          elapsedEngineHours: original.elapsedEngineHours,
        }),
        ...(original.distSinceLastValidCoords && {
          distSinceLastValidCoords: original.distSinceLastValidCoords,
        }),

        isLive: isLive,

        recordStatus: { id: draft.event.status },
        recordOrigin: { id: draft.event.origin },

        eventCode: { id: draft.event.eventCode },
        eventTime: draft.event.eventTime,

        vehicle: draft.event.vehicle,
        ...(autoLocation && {
          location: draft.event.location,
        }),
        eld: draft.event.eld,

        suggestedEditEventIds: original.suggestedEditEventIds,

        ...(original.av && { av: original.av }),
        pd: original.pd,
        at: original.at,

        type: original.type,
        dSTime: original.dSTime,
        dId: original.dId,
        stime: original.stime,

        ...(draft.event.note && { eventComment: draft.event.note }),
      } satisfies BasicHosEvent;
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
        _id: original._id,
        _rev: original._rev,
        companyId: original.companyId,
        userId: original.userId,

        createdBy: original.createdBy,
        createdAt: original.createdAt,
        updatedBy: original.updatedBy,
        updatedAt: original.updatedAt,

        seqId: Number(draft.event.seqId).toString(16),

        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,

        isLive: draft.event.locationSource,

        recordOrigin: { id: draft.event.origin },

        eventCode: { id: draft.event.eventCode },
        eventTime: draft.event.eventTime,

        vehicle: draft.event.vehicle,
        eld: draft.event.eld,

        suggestedEditEventIds: original.suggestedEditEventIds,

        ...(original.av && { av: original.av }),
        pd: original.pd,
        at: original.at,

        type: original.type,
        dSTime: original.dSTime,
        dId: original.dId,
        stime: original.stime,
      } satisfies AuthHosEvent;
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
        _id: original._id,
        _rev: original._rev,
        companyId: original.companyId,
        userId: original.userId,

        createdBy: original.createdBy,
        createdAt: original.createdAt,
        updatedBy: original.updatedBy,
        updatedAt: original.updatedAt,

        seqId: Number(draft.event.seqId).toString(16),

        totalVehicleMiles: draft.event.odometer,
        totalEngineHours: Math.round(draft.event.engineHours * 10) / 10,

        // copy from original
        ...(original.accumulatedVehicleMiles && {
          accumulatedVehicleMiles: original.accumulatedVehicleMiles,
        }),
        ...(original.elapsedEngineHours && {
          elapsedEngineHours: original.elapsedEngineHours,
        }),
        ...(original.distSinceLastValidCoords && {
          distSinceLastValidCoords: original.distSinceLastValidCoords,
        }),

        isLive: draft.event.locationSource,

        recordOrigin: { id: draft.event.origin },

        eventCode: { id: draft.event.eventCode },

        fc: {
          id: "D_POWER",
        },

        eventTime: draft.event.eventTime,

        vehicle: draft.event.vehicle,
        location: draft.event.location,
        eld: draft.event.eld,

        suggestedEditEventIds: original.suggestedEditEventIds,

        ...(original.av && { av: original.av }),
        pd: original.pd,
        at: original.at,

        type: original.type,
        dSTime: original.dSTime,
        dId: original.dId,

        dg: {
          cm: "pw:eeo",
        },

        stime: original.stime,
      } satisfies DiagHosEvent;
    }
  }
}

// EXAMPLES
// BASIC
// {
//             "_id": "HosEvent:wwTDeO3A_1",
//             "_rev": "4-b381bd0ecbff704fe37faed40781ee12",
//             "companyId": "Company:jAHAjaEwXen",
//             "userId": "User:udYss2mOuU",
//             "createdBy": "User:udYss2mOuU",
//             "createdAt": 1780608741650,
//             "updatedBy": "User:xE1UGbROw",
//             "updatedAt": 1781219271571,
//             "seqId": "d57",
//             "totalVehicleMiles": 210514,
//             "totalEngineHours": 6074.6,
//             "accumulatedVehicleMiles": 5,
//             "elapsedEngineHours": 1.3,
//             "distSinceLastValidCoords": 0,
//             "isLive": true,
//             "recordStatus": {
//                 "id": "ACTIVE"
//             },
//             "recordOrigin": {
//                 "id": "DRIVER"
//             },
//             "eventCode": {
//                 "id": "DS_ON"
//             },
//             "eventTime": {
//                 "timestamp": 1780608141646,
//                 "logDate": {
//                     "date": "2026/06/04",
//                     "timeZone": {
//                         "id": "CT"
//                     },
//                     "logStartOffset": 0
//                 }
//             },
//             "vehicle": {
//                 "id": "Vehicle:PX_bWaOxz3",
//                 "name": "244",
//                 "vin": "4V4NB9EH7SN686339"
//             },
//             "location": {
//                 "lat": 36.735823,
//                 "lon": -87.479352,
//                 "calculatedLocation": "5mi NNW from Oak grove, KY",
//                 "source": "E",
//                 "state": "Kentucky",
//                 "timestamp": 1780608731000
//             },
//             "eld": {
//                 "id": "Eld:lwvR436-dNx",
//                 "serialNumber": "E7:FC:80:16:CA:84",
//                 "sn": "3B5000234335"
//             },
//             "suggestedEditEventIds": [],
//             "av": "2.200.109",
//             "pd": false,
//             "at": true,
//             "type": {
//                 "id": "HosEvent"
//             },
//             "dSTime": -1,
//             "dId": "b6c696e27f22e14f",
//             "stime": 1781219271571,
//             "eventComment": "Delivery"
//         },
// CERT
// {
//             "_id": "HosEvent:TTLRTEkHK0",
//             "_rev": "3-50356574d5789366bc0b5fa802b1bd68",
//             "companyId": "Company:jAHAjaEwXen",
//             "userId": "User:udYss2mOuU",
//             "createdBy": "User:fDGiAf4Hh1",
//             "createdAt": 1780810013947,
//             "updatedBy": "User:xE1UGbROw",
//             "updatedAt": 1781219273236,
//             "seqId": "d70",
//             "isLive": true,
//             "eventCode": {
//                 "id": "DR_CERT_1"
//             },
//             "eventTime": {
//                 "timestamp": 1780685637288,
//                 "logDate": {
//                     "date": "2026/06/05",
//                     "timeZone": {
//                         "id": "CT"
//                     },
//                     "logStartOffset": 0
//                 }
//             },
//             "vehicle": {
//                 "id": "Vehicle:PX_bWaOxz3",
//                 "name": "244",
//                 "vin": "4V4NB9EH7SN686339"
//             },
//             "suggestedEditEventIds": [],
//             "av": "2.200.109",
//             "pd": false,
//             "at": true,
//             "type": {
//                 "id": "HosEvent"
//             },
//             "dSTime": -1,
//             "dId": "b6c696e27f22e14f",
//             "stime": 1781219273236,
//             "certifiedRecordLogDate": {
//                 "date": "2026/06/04",
//                 "timeZone": {
//                     "id": "CT"
//                 },
//                 "logStartOffset": 0
//             }
//         },
// AUTH
// {
//             "_id": "HosEvent:aydrH4GaTHMt",
//             "_rev": "3-2409f5043c0485d5666c143783fff064",
//             "companyId": "Company:jAHAjaEwXen",
//             "userId": "User:udYss2mOuU",
//             "createdBy": "User:udYss2mOuU",
//             "createdAt": 1780338810499,
//             "updatedBy": "User:xE1UGbROw",
//             "updatedAt": 1780873505156,
//             "seqId": "cfb",
//             "totalVehicleMiles": 209326,
//             "totalEngineHours": 6047.2,
//             "isLive": true,
//             "recordOrigin": {
//                 "id": "ELD"
//             },
//             "eventCode": {
//                 "id": "DR_LOGIN"
//             },
//             "eventTime": {
//                 "timestamp": 1780338210497,
//                 "logDate": {
//                     "date": "2026/06/01",
//                     "timeZone": {
//                         "id": "CT"
//                     },
//                     "logStartOffset": 0
//                 }
//             },
//             "vehicle": {
//                 "id": "Vehicle:PX_bWaOxz3",
//                 "name": "244",
//                 "vin": "4V4NB9EH7SN686339"
//             },
//             "eld": {
//                 "id": "Eld:lwvR436-dNx",
//                 "serialNumber": "E7:FC:80:16:CA:84",
//                 "sn": "3B5000234335"
//             },
//             "suggestedEditEventIds": [],
//             "av": "2.200.109",
//             "pd": false,
//             "at": true,
//             "type": {
//                 "id": "HosEvent"
//             },
//             "dSTime": -1,
//             "dId": "b6c696e27f22e14f",
//             "stime": 1780873505156
//         },
// DIAG/MALF
// {
//             "_id": "HosEvent:4ath7G6ucB",
//             "_rev": "1-4f91b70194d6f2008970d75d8334e065",
//             "companyId": "Company:jAHAjaEwXen",
//             "userId": "User:udYss2mOuU",
//             "createdBy": "User:udYss2mOuU",
//             "createdAt": 1781536546547,
//             "updatedBy": "User:udYss2mOuU",
//             "updatedAt": 1781536546641,
//             "seqId": "e62",
//             "totalVehicleMiles": 213641,
//             "totalEngineHours": 6174.5,
//             "isLive": true,
//             "recordOrigin": {
//                 "id": "ELD"
//             },
//             "eventCode": {
//                 "id": "DIAG_CLEARED"
//             },
//             "fc": {
//                 "id": "D_POWER"
//             },
//             "eventTime": {
//                 "timestamp": 1781534434000,
//                 "logDate": {
//                     "date": "2026/06/15",
//                     "timeZone": {
//                         "id": "CT"
//                     },
//                     "logStartOffset": 0
//                 }
//             },
//             "vehicle": {
//                 "id": "Vehicle:PX_bWaOxz3",
//                 "name": "244",
//                 "vin": "4V4NB9EH7SN686339"
//             },
//             "location": {
//                 "calculatedLocation": "Justice, IL",
//                 "lat": 41.746794,
//                 "lon": -87.840815,
//                 "source": "E",
//                 "state": "Illinois",
//                 "timestamp": 1781534432000
//             },
//             "eld": {
//                 "id": "Eld:lwvR436-dNx",
//                 "serialNumber": "E7:FC:80:16:CA:84",
//                 "sn": "3B5000234335"
//             },
//             "suggestedEditEventIds": [],
//             "av": "2.200.109",
//             "pd": false,
//             "at": true,
//             "type": {
//                 "id": "HosEvent"
//             },
//             "dSTime": -1,
//             "dId": "b6c696e27f22e14f",
//             "dg": {
//                 "cm": "pw:eeo"
//             },
//             "stime": 1781536547153
//         },
