import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/ui/status-badge";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { EVENT_CODE_MAP } from "@/lib/maps";
import { useEffect, useState } from "react";
import type { Draft, DraftEventErrors, EventFamily } from "../helpers/types";
import type { HosEvent } from "@/lib/types";
import { getCalculatedLocationData } from "@/lib/helpers/get-calculated-location";
import { buildDraft } from "./build-draft";
import { validateDraft } from "./validate-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/ui/date-picker";
import { DateTime } from "luxon";
import VehicleSelect from "./fields/vehicle-select";
import EldSelect from "./fields/eld-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DateAndTimePicker from "@/components/ui/date-time-picker";
import { FieldError } from "./field-error";
import { buildPayload } from "./build-payload";
import { FaMapLocationDot } from "react-icons/fa6";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    "positioning",
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
  label: EVENT_CODE_MAP[key],
}));
const otherStatusOptions = Object.keys(EVENT_CODE_MAP)
  .filter((key) => !mainStatusSet.has(key))
  .map((key) => ({
    value: key,
    label: EVENT_CODE_MAP[key],
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

const NOTE_CHIPS = [
  "PTI",
  "Fuel",
  "Pickup",
  "Delivery",
  "Hook",
  "Drop",
  "Drop & Hook",
  "swap",
  "test",
  "Inspection",
];

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

  const [draft, setDraft] = useState<Draft | null>(null);

  const [formState, setFormState] = useState<FormState>({
    lat: "",
    lon: "",
  });

  const [errors, setErrors] = useState<DraftEventErrors | null>(null);

  const lat = parseCoord(formState.lat);
  const lon = parseCoord(formState.lon);

  const isValid = lat !== null && lon !== null;
  const calculatedLocation = isValid
    ? getCalculatedLocationData(lat, lon).calculatedLocation
    : "None";
  useEffect(() => {
    if (!event) {
      setDraft(null);
      return;
    }

    const nextDraft = buildDraft({
      event,
      eventCode: event.eventCode.id,
      draft,
    });

    setFormState({
      lat: event.location?.lat != null ? String(event.location.lat) : "",
      lon: event.location?.lon != null ? String(event.location.lon) : "",
    });

    setDraft(nextDraft);
    setErrors(validateDraft(nextDraft));
  }, [event]);

  if (!draft) return null;

  const updateEventCode = (eventCode: string) => {
    setDraft((prev) => {
      if (!prev || !event) return prev;

      const nextDraft = buildDraft({
        event,
        eventCode,
        draft: prev,
      });

      setErrors(validateDraft(nextDraft));
      return nextDraft;
    });
  };

  const updateLocation = (
    patch: NonNullable<Partial<HosEvent["location"]>>,
  ) => {
    const lat = patch.lat ?? draft.event.location?.lat;
    const lon = patch.lon ?? draft.event.location?.lon;

    if (lat == null || lon == null) return;

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

    const { calculatedLocation, state } = getCalculatedLocationData(lat, lon);

    updateDraft({
      location: {
        lat,
        lon,
        calculatedLocation,
        state,
        source: "E",
        timestamp:
          draft.event.location?.timestamp ?? draft.event.eventTime.timestamp,
      },
    });
  };

  const parseCoordinates = (text: string) => {
    const normalized = text.trim().replace(/[()]/g, "");

    const parts = normalized
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length !== 2) return null;

    const lat = Number(parts[0]);
    const lon = Number(parts[1]);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return null;
    }

    return { lat, lon };
  };

  const handleCoordinatesPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const parsed = parseCoordinates(e.clipboardData.getData("text"));

    if (!parsed) return;

    e.preventDefault();

    setFormState({
      lat: String(parsed.lat),
      lon: String(parsed.lon),
    });

    updateLocation(parsed);
  };

  const updateDraft = (
    changes: Partial<Draft["event"]>,
    family?: EventFamily,
  ) =>
    setDraft((prev) => {
      if (!prev) return null;

      const nextDraft: Draft = {
        family: family ?? prev.family,
        event: {
          ...prev.event,
          ...changes,
        },
      };

      setErrors(validateDraft(nextDraft));

      return nextDraft;
    });

  const save = () => {
    const nextErrors = validateDraft(draft);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!event) return null;

    const payload = buildPayload({ original: event, draft: draft });
    console.log({ payload });
    if (payload) {
      updateEvent(event._id, () => payload);
    }
    onOpenChange(false);
  };
  const canEdit = (field: string) =>
    FAMILY_EDITABLE_FIELDS[draft.family]?.includes(field);

  function toggleNoteChip(currentNote: string | undefined, chip: string) {
    const parts = (currentNote ?? "")
      .split(", ")
      .map((p) => p.trim())
      .filter(Boolean);

    const exists = parts.includes(chip);

    const next = exists ? parts.filter((p) => p !== chip) : [...parts, chip];

    return next.join(", ");
  }
  function hasNoteChip(note: string | undefined, chip: string) {
    return (note ?? "")
      .split(", ")
      .map((p) => p.trim())
      .includes(chip);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-lg flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Label className="w-28">ID:</Label>
          <div className="relative flex-1">
            <Input
              onKeyDown={(e) => e.stopPropagation()}
              className={cn("w-full", errors?.seqId && "border-red-500")}
              value={draft.event.seqId}
              onChange={(e) => updateDraft({ seqId: e.target.value })}
            />
            <FieldError error={errors?.seqId} />
          </div>
        </div>

        <div className="relative flex gap-2">
          <Label className="w-28">Date and time</Label>
          <div>
            <DateAndTimePicker
              className={cn("w-fit", errors?.eventTime && "border-red-500")}
              value={{
                date: DateTime.fromMillis(draft.event.eventTime.timestamp),
                time: DateTime.fromMillis(
                  draft.event.eventTime.timestamp,
                ).toFormat("HH:mm:ss"),
              }}
              onChange={({ date, time }) => {
                const [h, m, s] = time.split(":").map(Number);

                const updated = date.set({
                  hour: h,
                  minute: m,
                  second: s ?? 0,
                  millisecond: 0,
                });

                updateDraft({
                  eventTime: {
                    timestamp: updated.toMillis(),
                    logDate: {
                      ...draft.event.eventTime.logDate,
                      date: updated.toFormat("yyyy/MM/dd"),
                    },
                  },
                });
              }}
            />
            <FieldError error={errors?.eventTime} />
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Event type</Label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-start border-none">
                <StatusBadge status={draft.event.eventCode} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
              {mainStatusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  className="hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted cursor-pointer"
                  onClick={() => updateEventCode(opt.value)}
                >
                  <StatusBadge status={opt.value} />
                </DropdownMenuItem>
              ))}

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Other</DropdownMenuSubTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="max-h-80 w-72 overflow-y-auto">
                    {otherStatusOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        className="hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted cursor-pointer"
                        onClick={() => updateEventCode(opt.value)}
                      >
                        <StatusBadge status={opt.value} />
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {draft.family === "CERT" && (
          <div className="relative flex gap-2">
            <Label className="w-28">Date to certify</Label>
            <div>
              <DatePicker
                className={cn(
                  errors?.certifiedRecordLogDate && "border-red-500",
                )}
                maxDate={draft.event.eventTime.logDate.date}
                value={DateTime.fromFormat(
                  draft.event.certifiedRecordLogDate!.date,
                  "yyyy/MM/dd",
                )}
                onChange={(dt) => {
                  updateDraft({
                    certifiedRecordLogDate: {
                      date: dt.toFormat("yyyy/MM/dd"),
                      timeZone: { id: "CT" },
                      logStartOffset: 0,
                    },
                  });
                }}
              />
              <FieldError error={errors?.certifiedRecordLogDate} />
            </div>
          </div>
        )}
        <div>
          <VehicleSelect
            vehicles={vehicles}
            value={draft.event.vehicle?.id}
            error={errors?.vehicle}
            onChange={(value: string) => {
              const vehicle = vehicles.find((v) => v.id === value);
              updateDraft({ vehicle });
            }}
          />
        </div>
        <EldSelect
          disabled={!canEdit("eld")}
          elds={elds}
          error={errors?.eld}
          value={draft.event.eld?.id || null}
          onChange={(value: string) => {
            const eld = elds.find((e) => e.id === value);
            updateDraft({ eld });
          }}
        />
        <div className="flex gap-2">
          <Label className="w-28">Status:</Label>
          <div className="relative flex-1">
            <Select
              disabled={!canEdit("recordStatus")}
              value={draft.event.status ?? "NONE"}
              onValueChange={(value) => updateDraft({ status: value })}
            >
              <SelectTrigger
                className={cn("w-full", errors?.status && "border-red-500")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-2" position="popper">
                <SelectItem value="NONE">None</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE_CHANGED">
                  Inactive Changed
                </SelectItem>
                <SelectItem value="INACTIVE_CHANGED_REQUESTED">
                  Inactive Change Requested
                </SelectItem>
                <SelectItem value="INACTIVE_CHANGED_REJECTED">
                  Inactive Change Rejected
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldError error={errors?.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Origin:</Label>
          <div className="relative flex-1">
            <Select
              disabled={!canEdit("recordOrigin")}
              value={draft.event.origin ?? "WITHOUT_ORIGIN"}
              onValueChange={(value) => {
                updateDraft({ origin: value });
              }}
            >
              <SelectTrigger
                className={cn("w-full", errors?.origin && "border-red-500")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-2" position="popper">
                <SelectItem value="DRIVER">Driver</SelectItem>
                <SelectItem value="ELD">Auto</SelectItem>
                <SelectItem value="OTHER_USER">Other User</SelectItem>
                <SelectItem value="WITHOUT_ORIGIN">Without Origin</SelectItem>
                <SelectItem value="UNIDENTIFIED_DRIVER">
                  Unidentified Driver
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldError error={errors?.origin} />
          </div>
        </div>

        <div className="flex gap-2">
          <Label className="w-28">Odometer:</Label>
          <div className="relative flex-1">
            <Input
              onKeyDown={(e) => e.stopPropagation()}
              disabled={!canEdit("totalVehicleMiles")}
              type="number"
              value={
                draft.family === "CERT" ? "" : (draft.event.odometer ?? "")
              }
              onChange={(e) => {
                const value = e.target.value;

                updateDraft({
                  odometer: value === "" ? undefined : Number(value),
                });
              }}
            />
            <FieldError error={errors?.odometer} />
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Engine hours:</Label>
          <div className="relative flex-1">
            <Input
              onKeyDown={(e) => e.stopPropagation()}
              disabled={!canEdit("totalEngineHours")}
              type="number"
              step="0.1"
              value={
                draft.family === "CERT" ? "" : (draft.event.engineHours ?? "")
              }
              onChange={(e) => {
                const value = e.target.value;

                updateDraft({
                  engineHours: value === "" ? undefined : Number(value),
                });
              }}
            />
            <FieldError error={errors?.engineHours} />
          </div>
        </div>

        {/* isLive prop */}
        <div className="flex gap-2">
          <Label className="w-28">Location source</Label>
          <div className="relative flex-1">
            <Select
              value={String(draft.event.locationSource)}
              onValueChange={(value) =>
                updateDraft({ locationSource: value === "true" })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="p-2" position="popper" align="start">
                <SelectItem value="true">
                  Location generated when connected to ECM
                </SelectItem>

                <SelectItem value="false">
                  Location when not connected to ECM
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldError error={errors?.locationSource} />
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Positioning</Label>
          <div className="relative flex-1">
            <Select
              disabled={!canEdit("positioning")}
              value={draft.event.positioning}
              onValueChange={(value) => updateDraft({ positioning: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="p-2" position="popper" align="start">
                <SelectItem value="WITHOUT_LOCATION">
                  Without Location
                </SelectItem>
                <SelectItem value="AUTO">Automatic</SelectItem>

                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Latitude: </Label>
          <div className="relative flex-1">
            <Input
              disabled={
                !canEdit("location") || draft.event.positioning !== "AUTO"
              }
              onKeyDown={(e) => e.stopPropagation()}
              value={draft.event.location ? formState.lat : ""}
              onPaste={handleCoordinatesPaste}
              onChange={(e) => {
                const value = e.target.value;
                setFormState((state) => ({ ...state, lat: value }));

                if (value.trim() === "") return;

                const lat = Number(value);

                if (!Number.isFinite(lat) || lat < -90 || lat > 90) return;

                updateLocation({ lat });
              }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Label className="w-28">Longitude: </Label>
          <div className="relative flex-1">
            <Input
              disabled={
                !canEdit("location") || draft.event.positioning !== "AUTO"
              }
              onKeyDown={(e) => e.stopPropagation()}
              value={draft.event.location ? formState.lon : ""}
              onPaste={handleCoordinatesPaste}
              onChange={(e) => {
                const value = e.target.value;
                setFormState((state) => ({ ...state, lon: value }));

                if (value.trim() === "") return;

                const lon = Number(value);

                if (!Number.isFinite(lon) || lon < -180 || lon > 180) return;

                updateLocation({ lon });
              }}
            />
          </div>
        </div>

        {draft.event.positioning !== "MANUAL" ? (
          <div className="flex gap-2">
            <Label className="w-28">Location</Label>
            {draft.event.location && (
              <div className="ml-4 flex items-center gap-2">
                <FaMapLocationDot className="fill-muted-foreground" size={18} />{" "}
                {calculatedLocation}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Label className="w-28">Location:</Label>
            <div className="relative">
              <Input
                onKeyDown={(e) => e.stopPropagation()}
                className="w-fit"
                value={draft.event.driverLocationDescription}
                onChange={(e) => {
                  updateDraft({ driverLocationDescription: e.target.value });
                }}
              />
              <FieldError error={errors?.driverLocationDescription} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Label className="w-28">Note</Label>

            <Input
              className="ml-7"
              onKeyDown={(e) => e.stopPropagation()}
              disabled={!canEdit("eventComment")}
              value={draft.event.note ?? ""}
              onChange={(e) => updateDraft({ note: e.target.value })}
            />
          </div>

          <div className="ml-30 flex flex-wrap gap-1">
            {NOTE_CHIPS.map((note) => (
              <Badge
                key={note}
                className="cursor-pointer shadow-sm"
                variant={
                  hasNoteChip(draft.event.note, note) ? "default" : "secondary"
                }
                size="sm"
                onClick={() => {
                  if (canEdit("eventComment")) {
                    updateDraft({
                      note: toggleNoteChip(draft.event.note, note),
                    });
                  }
                }}
              >
                {note}
              </Badge>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={Object.values(errors || {}).some(Boolean)}
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
