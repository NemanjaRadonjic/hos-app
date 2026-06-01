import { createFileRoute } from "@tanstack/react-router";
import { DateTime } from "luxon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TZ_MAP } from "@/lib/maps";
import ELDGraph from "@/components/Graph";

import { useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import LogHead from "@/components/LogHead";
import LogEvent from "@/components/log-event";
import type { HosEvent } from "@/lib/types";
import ControlBar from "@/components/control-bar";
import { checkViolations } from "@/lib/hos/calculations";
import { getHosTimers } from "@/lib/hos/calculations";
import { useDriverData } from "@/lib/hooks/useDriverData";
import { isDutyEvent } from "@/lib/hos/helpers";
import { useTransaction } from "@/lib/hooks/useTransaction";
import { TransactionContext } from "@/lib/hooks/TransactionContext";

export const Route = createFileRoute("/drivers/$driverId")({
  component: DriverPage,
});

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function DriverPage() {
  const tz = TZ_MAP["CT"];
  const { driverId } = Route.useParams();

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sliderSelection, setSliderSelection] = useState({ start: 0, end: 0 });
  const [sliderActive, setSliderActive] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DateTime.now());

  const transaction = useTransaction(driverId, selectedDay);

  const { status, events, lastKnownEvent, setEvents } = transaction;

  console.log({ events });

  const { driver } = useDriverData(driverId);

  const hosTimers = getHosTimers(events); // ← after events is defined

  const toggleSelectedId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lastClickedId = useRef<string | null>(null);

  const handleEventClick = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedId.current) {
      const clickedIdx = eventList.findIndex((ev) => ev._id === id);
      const lastIdx = eventList.findIndex(
        (ev) => ev._id === lastClickedId.current,
      );
      const start = Math.min(clickedIdx, lastIdx);
      const end = Math.max(clickedIdx, lastIdx);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        eventList.slice(start, end + 1).forEach((ev) => next.add(ev._id));
        return next;
      });
    } else {
      toggleSelectedId(id);
      lastClickedId.current = id;
    }
  };

  const currentDayEvents = events.filter((event) => {
    const eventDay = DateTime.fromMillis(event.eventTime.timestamp).setZone(tz);
    return eventDay.hasSame(selectedDay, "day");
  });

  const firstOdometer = currentDayEvents[0]?.totalVehicleMiles;
  const lastOdometer =
    currentDayEvents[currentDayEvents.length - 1]?.totalVehicleMiles;
  const totalMiles =
    firstOdometer != null && lastOdometer != null
      ? lastOdometer - firstOdometer
      : 0;
  console.log({ transaction });
  const lastStatusBeforeSelected =
    [...events]
      .filter((event) => {
        const eventDay = DateTime.fromMillis(event.eventTime.timestamp).setZone(
          tz,
        );
        return (
          eventDay < selectedDay.startOf("day") &&
          ["DS_ON", "DS_OFF", "DS_D", "DS_SB"].includes(event.eventCode.id)
        );
      })
      .at(-1) ?? lastKnownEvent;

  const eventList = [lastStatusBeforeSelected, ...currentDayEvents].filter(
    (e): e is HosEvent => Boolean(e),
  );

  const vehicles = [
    ...new Map(
      eventList.filter((e) => e.vehicle).map((e) => [e.vehicle.id, e.vehicle]),
    ).values(),
  ];

  console.log({ eventList });

  useEffect(() => {
    if (!sliderActive) return;
    const start = Math.min(sliderSelection.start, sliderSelection.end);
    const end = Math.max(sliderSelection.start, sliderSelection.end);
    const startTs = selectedDay.startOf("day").toMillis() + start * 60000;
    const endTs = selectedDay.startOf("day").toMillis() + end * 60000;
    const ids = new Set(
      currentDayEvents
        .filter(
          (e) =>
            e.eventTime.timestamp >= startTs && e.eventTime.timestamp <= endTs,
        )
        .map((e) => e._id),
    );
    setSelectedIds(ids);
  }, [sliderSelection, sliderActive]);

  const applyTimeDelta = (deltaMs: number) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (!selectedIds.has(e._id)) return e;

        const newTimestamp = e.eventTime.timestamp + deltaMs;

        const newDate = DateTime.fromMillis(newTimestamp, {
          zone: "America/Chicago", // or derive from e.eventTime.logDate.timeZone.id
        }).toFormat("yyyy/MM/dd");

        return {
          ...e,
          eventTime: {
            ...e.eventTime,
            timestamp: newTimestamp,
            logDate: {
              ...e.eventTime.logDate,
              date: newDate,
            },
          },
        };
      }),
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedDay((prev) => prev.minus({ days: 1 }));
      } else if (e.key === "ArrowRight") {
        setSelectedDay((prev) => {
          const next = prev.plus({ days: 1 });
          return next > DateTime.now().setZone(tz) ? prev : next;
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tz]);

  const selectDuration = useMemo(() => {
    const selected = eventList.filter((e) => selectedIds.has(e._id));
    const sorted = [...selected].sort(
      (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
    );
    const mainEvents = sorted.filter((e) => isDutyEvent(e));
    const firstMs = mainEvents[0]?.eventTime.timestamp;
    const lastMs = mainEvents[mainEvents.length - 1]?.eventTime.timestamp;
    return lastMs - firstMs;
  }, [selectedIds, events]);

  const violations = checkViolations(events);

  const enrichedEventList = useMemo(() => {
    return eventList.map((event, i) => {
      const isDutyStatus = ["DS_ON", "DS_OFF", "DS_D", "DS_SB"].includes(
        event.eventCode.id,
      );

      // find next duty status event, skipping intermediates
      const nextDutyEvent = isDutyStatus
        ? eventList
            .slice(i + 1)
            .find((e) =>
              ["DS_ON", "DS_OFF", "DS_D", "DS_SB"].includes(e.eventCode.id),
            )
        : null;

      const duration =
        isDutyStatus && nextDutyEvent
          ? nextDutyEvent.eventTime.timestamp - event.eventTime.timestamp
          : null;

      const prev = eventList[i - 1];

      const odoDelta =
        event.totalVehicleMiles != null && prev?.totalVehicleMiles != null
          ? event.totalVehicleMiles - prev.totalVehicleMiles
          : null;

      const engHoursDelta =
        event.totalEngineHours != null && prev?.totalEngineHours != null
          ? event.totalEngineHours - prev.totalEngineHours
          : null;

      return { ...event, duration, odoDelta, engHoursDelta };
    });
  }, [eventList]);

  if (!driver) return <div>Loading</div>;

  return (
    <div className="flex h-full flex-col gap-4">
      <TransactionContext.Provider value={transaction}>
        <LogHead
          value={selectedDay}
          onChange={setSelectedDay}
          hosTimers={hosTimers}
          selectedDay={selectedDay}
          totalMiles={totalMiles}
          vehicles={vehicles}
        />
        <ELDGraph
          selectedDay={selectedDay}
          events={eventList}
          sliderSelection={sliderSelection}
          setSliderSelection={setSliderSelection}
          sliderActive={sliderActive}
          setSliderActive={setSliderActive}
          setSelectedIds={setSelectedIds}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          violations={violations}
        />
        <div className="flex min-h-0 flex-1 flex-col rounded-md border">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === currentDayEvents.length
                      }
                      onCheckedChange={(checked) =>
                        setSelectedIds(
                          checked
                            ? new Set(currentDayEvents.map((e) => e._id))
                            : new Set(),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-36">Time</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                  <TableHead className="w-80">Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-20">Origin</TableHead>
                  <TableHead className="w-40 text-center">Odometer</TableHead>
                  <TableHead className="w-40 text-center">Eng. Hours</TableHead>
                  <TableHead className="w-52">Note</TableHead>
                  <TableHead className="w-16">Vehicle</TableHead>
                  <TableHead className="w-16">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedEventList.map((event) => (
                  <LogEvent
                    key={event._id}
                    event={event}
                    checked={selectedIds.has(event._id)}
                    onCheckboxClick={(e) => handleEventClick(event._id, e)}
                    focused={focusedId === event._id}
                    setFocusedId={setFocusedId}
                  />
                ))}
                {enrichedEventList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No events found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <ControlBar
            selectedIds={selectedIds}
            reset={() => {
              setSelectedIds(new Set());
              setSliderActive(false);
            }}
            onApply={applyTimeDelta}
            selectDuration={selectDuration}
            transactionStatus={status}
          />
        </div>
      </TransactionContext.Provider>
    </div>
  );
}
