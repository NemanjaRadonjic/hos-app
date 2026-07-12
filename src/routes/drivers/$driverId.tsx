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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import LogHead from "@/components/LogHead";
import LogEvent from "@/components/LogEvent";
import { type HosEvent, type HosEventPayload } from "@/lib/types";
import ControlBar from "@/components/control-bar";
import { hosEngine } from "@/lib/hos/calculations";

import { useDriverData } from "@/lib/hooks/useDriverData";
import { isDutyEvent } from "@/lib/hos/helpers";
import {
  isServerLockedEvent,
  isUserLockedEvent,
  useTransaction,
} from "@/lib/hooks/useTransaction";
import { TransactionContext } from "@/lib/hooks/TransactionContext";
import { EditEventModal } from "@/components/LogEvent/EditForm";
import { buildLogCheck, type LogIssue } from "@/lib/log-check";
import { enrichEvents } from "./helpers/enrich-events";
import { useSelectionStore } from "@/lib/store/useSelectionStore";
import { InfoBar } from "@/components/infobar";

export type EventInfo = {
  duration: number | null;
  odoDelta: number | null;
  engHoursDelta: number | null;
  issues: LogIssue[];
  hasError: boolean;
};

type EnrichedEvent = {
  event: HosEvent;
  info: EventInfo;
};

export const Route = createFileRoute("/drivers/$driverId")({
  component: DriverPage,
});

function DriverPage() {
  const tz = TZ_MAP["CT"];
  const { driverId } = Route.useParams();

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DateTime>(DateTime.now());
  const [editingEvent, setEditingEvent] = useState<
    HosEvent | HosEventPayload | null
  >(null);
  const transaction = useTransaction(driverId, selectedDay);

  const { status, events, lastKnownEvent, updateEventsTimestamp } = transaction;

  const { driver } = useDriverData(driverId);

  const { clocks, violations } = hosEngine(events);

  const diagnostics = useMemo(
    () =>
      buildLogCheck({
        events,
        dailyLogs: transaction.dailyLogs ?? [],
      }),
    [events, transaction.dailyLogs],
  );

  const enrichedEventList = useMemo(
    () => enrichEvents(events, diagnostics.issues),
    [events, diagnostics.issues],
  );

  const currentDayEvents = useMemo(
    () =>
      enrichedEventList.filter(({ event }) => {
        const eventDay = DateTime.fromMillis(event.eventTime.timestamp).setZone(
          tz,
        );
        return eventDay.hasSame(selectedDay, "day");
      }),
    [enrichedEventList, selectedDay, tz],
  );

  const lastStatusBeforeSelected = useMemo(() => {
    return (
      [...enrichedEventList]
        .filter(({ event }) => {
          const eventDay = DateTime.fromMillis(
            event.eventTime.timestamp,
          ).setZone(tz);

          return (
            eventDay < selectedDay.startOf("day") &&
            ["DS_ON", "DS_OFF", "DS_D", "DS_SB"].includes(event.eventCode.id)
          );
        })
        .at(-1) ??
      (lastKnownEvent
        ? {
            event: lastKnownEvent,
            info: {
              duration: null,
              odoDelta: null,
              engHoursDelta: null,
              issues: [],
              hasError: false,
            },
          }
        : null)
    );
  }, [enrichedEventList, selectedDay, tz, lastKnownEvent]);

  const eventList = useMemo(
    () =>
      [lastStatusBeforeSelected, ...currentDayEvents].filter(
        (e): e is EnrichedEvent => Boolean(e),
      ),
    [lastStatusBeforeSelected, currentDayEvents],
  );

  const rawEventList = useMemo(
    () => eventList.map(({ event }) => event),
    [eventList],
  );

  const {
    selectedIds,
    setSelection,
    toggleSelectedId,
    resetSelection,
    sliderActive,
    setSliderActive,
    sliderSelection,
    setSliderSelection,
  } = useSelectionStore((s) => s);

  useEffect(() => {
    setSelectedDay(DateTime.now());
  }, [driverId]);

  useEffect(() => {
    resetSelection();
  }, [selectedDay]);

  const lastClickedId = useRef<string | null>(null);

  const firstOdometer = currentDayEvents.find(
    ({ event }) => event.totalVehicleMiles != null,
  )?.event.totalVehicleMiles;

  const lastOdometer = currentDayEvents.findLast(
    ({ event }) => event.totalVehicleMiles != null,
  )?.event.totalVehicleMiles;

  const totalMiles =
    firstOdometer != null && lastOdometer != null
      ? lastOdometer - firstOdometer
      : 0;

  const handleEventClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedId.current) {
        const clickedIdx = rawEventList.findIndex((ev) => ev._id === id);
        const lastIdx = rawEventList.findIndex(
          (ev) => ev._id === lastClickedId.current,
        );

        if (clickedIdx === -1 || lastIdx === -1) return;

        const start = Math.min(clickedIdx, lastIdx);
        const end = Math.max(clickedIdx, lastIdx);

        const next = new Set(selectedIds);

        rawEventList.slice(start, end + 1).forEach((ev) => {
          next.add(ev._id);
        });

        setSelection(next, rawEventList);
        return;
      }

      toggleSelectedId(id, rawEventList);
      lastClickedId.current = id;
    },
    [rawEventList, selectedIds, setSelection, toggleSelectedId],
  );
  const vehicles = useMemo(() => {
    return [
      ...new Map(
        rawEventList
          .filter((e) => e.vehicle)
          .map((e) => [e.vehicle.id, e.vehicle]),
      ).values(),
    ];
  }, [rawEventList]);

  useEffect(() => {
    if (!focusedId) return;

    requestAnimationFrame(() => {
      const row = document.getElementById(`row-${focusedId}`);
      if (!row) return;

      const container = row.closest(".overflow-auto");
      if (!container) return;

      const rowRect = row.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const fullyVisible =
        rowRect.top >= containerRect.top &&
        rowRect.bottom <= containerRect.bottom;

      if (!fullyVisible) {
        row.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }, [focusedId]);

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
    const selected = rawEventList.filter((e) => selectedIds.has(e._id));
    const mainEvents = selected.filter((e) => isDutyEvent(e));
    const firstMs = mainEvents[0]?.eventTime.timestamp;
    const lastMs = mainEvents[mainEvents.length - 1]?.eventTime.timestamp;
    return lastMs - firstMs;
  }, [selectedIds, events]);

  const lastEventWithLocation = events.findLast(
    (event) => event.location?.lat != null && event.location?.lon != null,
  );

  const lockedEvents = useMemo(
    () => ({
      server: [...events].reverse().find(isServerLockedEvent),
      user: [...events].reverse().find(isUserLockedEvent),
    }),
    [events],
  );

  if (!driver) return <div>Loading</div>;

  return (
    <div className="flex h-full flex-col">
      <TransactionContext.Provider value={transaction}>
        <LogHead
          value={selectedDay}
          setSelectedDay={setSelectedDay}
          hosTimers={clocks}
          selectedDay={selectedDay}
          violations={violations}
          diagnostics={diagnostics}
        />
        <InfoBar
          totalMiles={totalMiles}
          location={lastEventWithLocation?.location}
          phone={driver.phone}
          isConnected={driver.isConnected}
          vehicles={vehicles}
          lockedEvents={lockedEvents}
          setSelectedDay={setSelectedDay}
        />
        <ELDGraph
          selectedDay={selectedDay}
          events={rawEventList}
          sliderSelection={sliderSelection}
          setSliderSelection={setSliderSelection}
          sliderActive={sliderActive}
          setSliderActive={setSliderActive}
          focusedId={focusedId}
          setFocusedId={setFocusedId}
          violations={violations}
        />
        <div className="flex min-h-0 flex-1 flex-col rounded-md border">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === currentDayEvents.length
                      }
                      onCheckedChange={(checked) =>
                        setSelection(
                          checked
                            ? currentDayEvents.map(({ event }) => event._id)
                            : [],
                          rawEventList,
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-34">Time</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                  <TableHead className="w-52">Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-18 text-center">Status</TableHead>
                  <TableHead className="w-18 text-center">Origin</TableHead>
                  <TableHead className="w-30">Odometer</TableHead>
                  <TableHead className="w-30">Eng. Hours</TableHead>
                  <TableHead className="w-52">Note</TableHead>
                  <TableHead className="w-14">ELD</TableHead>
                  <TableHead className="w-14">Vehicle</TableHead>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-26 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventList.map(({ event, info }) => (
                  <LogEvent
                    key={event._id}
                    event={event}
                    eventInfo={info}
                    checked={selectedIds.has(event._id)}
                    onCheckboxClick={(e) => handleEventClick(event._id, e)}
                    focused={focusedId === event._id}
                    setFocusedId={setFocusedId}
                    setEditingEvent={setEditingEvent}
                  />
                ))}
                {eventList.length === 0 && (
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
            updateEventsTimestamp={updateEventsTimestamp}
            selectDuration={selectDuration}
            transactionStatus={status}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            setFocusedId={setFocusedId}
            diagnostics={diagnostics}
          />
        </div>
        <EditEventModal
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => {
            if (!open) setEditingEvent(null);
          }}
        />
      </TransactionContext.Provider>
    </div>
  );
}
