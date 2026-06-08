import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, memo } from "react";
import type { HosEvent } from "@/lib/types";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { STATUS_MAP } from "@/lib/maps";
import { Badge } from "../ui/badge";
import StatusBadge from "../ui/status-badge";
import { Label } from "../ui/label";
import DateAndTimePicker from "../ui/date-time-picker";
import { DateTime } from "luxon";
import { getFamily, type Family } from "./build-event";
import {
  buildAuthEventType,
  buildBasicEventType,
  buildCertEventType,
  buildDiagEventType,
} from "./event-type-bodies";
import DatePicker from "../ui/date-picker";
import { useDriversData } from "@/lib/hooks/useDriversData";
import VehicleSelect from "./fields/vehicle-select";
import EldSelect from "./fields/eld-select";
import { getCalculatedLocation } from "@/lib/helpers/get-calculated-location";

const mainStatusSet = new Set([
  "DS_OFF",
  "DS_SB",
  "DS_ON",
  "DS_D",
  "ENG_UP_NORMAL",
  "ENG_DOWN_NORMAL",
  "DR_LOGIN",
  "DR_LOGOUT",
  "DR_CERT_1",
]);

const FAMILY_EDITABLE_FIELDS = {
  BASIC: [
    "eventTime",
    "vehicle",
    "eld",
    "recordStatus",
    "recordOrigin",
    "totalVehicleMiles",
    "totalEngineHours",
    "locationSource",
    "location",
    "eventComment",
    "note",
  ],

  CERT: ["certifiedRecordLogDate", "vehicle", "isLive"],

  AUTH: ["totalVehicleMiles", "totalEngineHours", "recordOrigin", "eld"],

  DIAG: [],
} as const;

const parseCoord = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mainStatusOptions = Array.from(mainStatusSet).map((key) => ({
  value: key,
  label: STATUS_MAP[key],
}));
const otherStatusOptions = Object.keys(STATUS_MAP)
  .filter((key) => !mainStatusSet.has(key))
  .map((key) => ({
    value: key,
    label: STATUS_MAP[key],
  }));
export const STATUS_SELECT_GROUPS = [
  {
    label: "Main",
    options: mainStatusOptions,
  },
  {
    label: "Other",
    options: otherStatusOptions,
  },
];

const statusOptions = STATUS_SELECT_GROUPS.map((group) => (
  <SelectGroup key={group.label}>
    <SelectLabel>{group.label}</SelectLabel>

    {group.options.map((opt) => (
      <SelectItem
        key={opt.value}
        value={opt.value}
        className="data-[highlighted]:bg-muted"
      >
        <span className="text-inherit">
          <StatusBadge status={opt.value} />
        </span>
      </SelectItem>
    ))}
  </SelectGroup>
));

type Draft = {
  family: Family;
  event: HosEvent;
};

type FormState = {
  lat: string;
  lon: string;
};

export function EditEventModal({
  event,
  open,
  onOpenChange,
}: {
  event: HosEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateEvent } = useTransactionContext();
  const { vehicles, elds } = useDriversData();
  console.log({ vehicles });
  const [draft, setDraft] = useState<Draft | null>(null);
  console.log({ draft });
  const [formState, setFormState] = useState<FormState>({
    lat: "",
    lon: "",
  });

  const lat = parseCoord(formState.lat);
  const lon = parseCoord(formState.lon);

  const isValid = lat !== null && lon !== null;
  const calculatedLocation = isValid ? getCalculatedLocation(lat, lon) : "None";
  useEffect(() => {
    if (!open || !event) return;

    setDraft({
      family: getFamily(event.eventCode.id),
      event,
    });

    setFormState({
      lat: String(event.location?.lat ?? ""),
      lon: String(event.location?.lon ?? ""),
    });
  }, [open, event]);

  if (!draft) return null;

  // const updateDraft = (patch: Partial<HosEvent>) => {
  //   setDraft((prev) => {
  //     if (!prev) return prev;

  //     return {
  //       ...prev,
  //       event: {
  //         ...prev.event,
  //         ...patch,
  //       },
  //     };
  //   });
  // };

  const updateLocation = (patch: Partial<HosEvent["location"]>) => {
    setDraft((prev) => {
      if (!prev?.event.location) return prev;

      const location = {
        ...prev.event.location,
        ...patch,
      };

      return {
        ...prev,
        event: {
          ...prev.event,
          location: {
            ...location,
            calculatedLocation: getCalculatedLocation(
              location.lat,
              location.lon,
            ),
          },
        },
      };
    });
  };

  const save = () => {
    console.log({ edited: draft.event });
    updateEvent(draft.event._id, () => draft.event);
    onOpenChange(false);
    console.log({ draft });
  };
  const canEdit = (field: string) =>
    FAMILY_EDITABLE_FIELDS[draft.family]?.includes(field);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-xl">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Label className="w-28">ID:</Label>
          <Input
            onKeyDown={(e) => e.stopPropagation()}
            className="w-fit"
            value={draft.event.seqId}
          />
        </div>

        <div className="flex gap-2">
          <Label className="w-28">Date and time</Label>
          <DateAndTimePicker
            value={{
              date: DateTime.fromMillis(draft.event.eventTime.timestamp),
              time: DateTime.fromMillis(
                draft.event.eventTime.timestamp,
              ).toFormat("HH:mm:ss"),
            }}
            onChange={({ date, time }) => {
              setDraft((prev) => {
                if (!prev) return prev;

                const [h, m, s] = time.split(":").map(Number);

                const updated = date.set({
                  hour: h,
                  minute: m,
                  second: s ?? 0,
                  millisecond: 0,
                });

                const timestamp = updated.toMillis();

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    eventTime: {
                      ...prev.event.eventTime,
                      timestamp,
                      logDate: {
                        ...prev.event.eventTime.logDate,
                        date: updated.toFormat("yyyy/MM/dd"),
                      },
                    },
                  },
                };
              });
            }}
          />
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Event type</Label>
          <Select
            value={draft.event.eventCode.id}
            onValueChange={(value) => {
              setDraft((prev) => {
                if (!prev) return prev;

                const newFamily = getFamily(value);

                // same family → simple patch
                if (newFamily === prev.family) {
                  return {
                    ...prev,
                    event: {
                      ...prev.event,
                      eventCode: { id: value },
                    },
                  };
                }
                const rebuilt =
                  newFamily === "CERT"
                    ? buildCertEventType(event, value)
                    : newFamily === "AUTH"
                      ? buildAuthEventType(event, value)
                      : newFamily === "DIAG"
                        ? buildDiagEventType(event, value)
                        : buildBasicEventType(event, value);

                return {
                  family: newFamily,
                  event: rebuilt,
                };
              });
            }}
          >
            <SelectTrigger className="border-none">
              <SelectValue />
            </SelectTrigger>

            <SelectContent position="popper" align="start">
              {statusOptions}
            </SelectContent>
          </Select>
        </div>
        {draft.family === "CERT" && (
          <div className="flex gap-2">
            <Label className="w-28">Date to certify</Label>
            <DatePicker
              value={DateTime.fromFormat(
                draft.event.certifiedRecordLogDate!.date,
                "yyyy/MM/dd",
              )}
              onChange={(dt) => {
                setDraft((prev) => {
                  if (!prev || prev.family !== "CERT") return prev;

                  return {
                    ...prev,
                    event: {
                      ...prev.event,
                      certifiedRecordLogDate: {
                        ...prev.event.certifiedRecordLogDate,
                        date: dt.toFormat("yyyy/MM/dd"),
                      },
                    },
                  };
                });
              }}
            />
          </div>
        )}
        <VehicleSelect
          vehicles={vehicles}
          value={draft.event.vehicle.id}
          onChange={(value: string) =>
            setDraft((prev) => {
              if (!prev) return prev;
              const newVehicle = vehicles.find((v) => v.id === value);
              return {
                ...prev,
                event: {
                  ...prev.event,
                  vehicle: newVehicle,
                },
              };
            })
          }
        />

        <EldSelect
          disabled={!canEdit("eld")}
          elds={elds}
          value={draft.event.eld?.id || null}
          onChange={(value: string) =>
            setDraft((prev) => {
              if (!prev) return prev;
              const eld = elds.find((e) => e.id === value);
              console.log({ eld });
              return {
                ...prev,
                event: {
                  ...prev.event,
                  eld,
                },
              };
            })
          }
        />
        <div className="flex gap-2">
          <Label className="w-28">Status:</Label>
          <Select
            disabled={!canEdit("recordStatus")}
            value={draft.event.recordStatus?.id ?? "NONE"}
            onValueChange={(value) =>
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    recordStatus: { id: value },
                  },
                };
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE_CHANGED">Inactive Changed</SelectItem>
              {/* <SelectItem>
                Inactive Change Requested
              </SelectItem>
              <SelectItem>
                Inactive Change Rejected
              </SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Origin:</Label>
          <Select
            disabled={!canEdit("recordOrigin")}
            value={draft.event.recordOrigin?.id ?? "WITHOUT_ORIGIN"}
            onValueChange={(value) =>
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    recordOrigin: { id: value },
                  },
                };
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRIVER">Driver</SelectItem>
              <SelectItem value="ELD">Auto</SelectItem>
              <SelectItem value="OTHER_USER">Driver</SelectItem>
              <SelectItem value="WITHOUT_ORIGIN">Without Origin</SelectItem>
              <SelectItem value="UNIDENTIFIED_DRIVER">
                Unidentified Driver
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Odometer:</Label>
          <Input
            onKeyDown={(e) => e.stopPropagation()}
            disabled={!canEdit("totalVehicleMiles")}
            className="w-fit"
            type="number"
            value={draft.event.totalVehicleMiles ?? ""}
            onChange={(e) =>
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    totalVehicleMiles: Number(e.target.value),
                  },
                };
              })
            }
          />
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Engine hours:</Label>
          <Input
            onKeyDown={(e) => e.stopPropagation()}
            disabled={!canEdit("totalEngineHours")}
            className="w-fit"
            type="number"
            step="0.1"
            value={draft.event.totalEngineHours ?? ""}
            onChange={(e) =>
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    totalEngineHours: Number(
                      parseFloat(e.target.value).toFixed(1),
                    ),
                  },
                };
              })
            }
          />
        </div>

        <div className="flex gap-2">
          <Label className="w-28"></Label>
        </div>

        {/* isLive prop */}
        <div className="flex gap-2">
          <Label className="w-28">Location source</Label>
          <Select
            value={String(draft.event.isLive)}
            onValueChange={(value) =>
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    isLive: value === "true",
                  },
                };
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent position="popper" align="start">
              <SelectItem value="true">
                Location generated when connected to ECM
              </SelectItem>

              <SelectItem value="false">
                Location when not connected to ECM
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Latitude: </Label>
          <Input
            disabled={!canEdit("location")}
            onKeyDown={(e) => e.stopPropagation()}
            value={draft.event.location ? formState.lat : ""}
            className="w-fit"
            onChange={(e) => {
              const value = e.target.value;

              setFormState((s) => ({
                ...s,
                lat: value,
              }));

              const lat = Number(value);

              if (!Number.isFinite(lat)) return;

              updateLocation({ lat });
            }}
          />
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Longitude: </Label>
          <Input
            disabled={!canEdit("location")}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-fit"
            value={draft.event.location ? formState.lon : ""}
            onChange={(e) => {
              const value = e.target.value;

              setFormState((s) => ({
                ...s,
                lon: value,
              }));

              const lon = Number(value);

              if (!Number.isFinite(lon)) return;

              updateLocation({ lon });
            }}
          />
        </div>

        <div className="flex gap-2">
          <Label className="w-28">Location</Label>
          <div>{draft.event.location ? calculatedLocation : "None"}</div>
        </div>

        <div className="flex gap-2">
          <Label className="w-28">Note</Label>
          <Input
            onKeyDown={(e) => e.stopPropagation()}
            disabled={!canEdit("eventComment")}
            className="w-fit"
            value={draft.event.eventComment}
            onChange={(e) => {
              setDraft((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  event: {
                    ...prev.event,
                    eventComment: e.target.value,
                  },
                };
              });
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
