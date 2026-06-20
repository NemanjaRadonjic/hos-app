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
import { type HosEvent } from "@/lib/types";
import ControlBar from "@/components/control-bar";
import { hosEngine } from "@/lib/hos/calculations";

import { useDriverData } from "@/lib/hooks/useDriverData";
import { isDutyEvent } from "@/lib/hos/helpers";
import { useTransaction } from "@/lib/hooks/useTransaction";
import {
  TransactionContext,
  useTransactionContext,
} from "@/lib/hooks/TransactionContext";
import { EditEventModal } from "@/components/LogEvent/EditForm";
import { buildLogCheck, type LogIssue } from "@/lib/log-check";
import { enrichEvents } from "./helpers/enrich-events";
import { useEventSelection } from "@/lib/hooks/useEventSelection";

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
  const [sliderSelection, setSliderSelection] = useState({ start: 0, end: 0 });
  const [sliderActive, setSliderActive] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DateTime.now());
  const [editingEvent, setEditingEvent] = useState<
    HosEvent | HosEventPayload | null
  >(null);
  const transaction = useTransaction(driverId, selectedDay);

  // health check
  // useEffect(() => {
  //   const res = fetch(
  //     "https://backend.apexhos.com/ping/baseUrl?rCode=extreme&agentType=portal",
  //   );
  //   console.log(res);
  // });

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

  useEffect(() => {
    setSelectedDay(DateTime.now());
  }, [driverId]);

  const lastClickedId = useRef<string | null>(null);

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

  const { selectedIds, setSelection, toggleSelectedId, resetSelection } =
    useEventSelection(rawEventList);

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
        const lastIdx = eventList.findIndex(
          (ev) => ev.event._id === lastClickedId.current,
        );
        const start = Math.min(clickedIdx, lastIdx);
        const end = Math.max(clickedIdx, lastIdx);
        setSelection((prev) => {
          const next = new Set(prev);
          rawEventList.slice(start, end + 1).forEach((ev) => next.add(ev._id));
          return next;
        });
      } else {
        toggleSelectedId(id);
        lastClickedId.current = id;
      }
    },
    [rawEventList],
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
    if (!sliderActive) return;
    const start = Math.min(sliderSelection.start, sliderSelection.end);
    const end = Math.max(sliderSelection.start, sliderSelection.end);
    const startTs = selectedDay.startOf("day").toMillis() + start * 60000;
    const endTs = selectedDay.startOf("day").toMillis() + end * 60000;
    const ids = new Set(
      currentDayEvents
        .filter(
          (e) =>
            e.event.eventTime.timestamp >= startTs &&
            e.event.eventTime.timestamp <= endTs,
        )
        .map((e) => e.event._id),
    );
    setSelection(ids);
  }, [sliderSelection, sliderActive]);

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

  if (!driver) return <div>Loading</div>;

  return (
    <div className="flex h-full flex-col gap-4">
      <TransactionContext.Provider value={transaction}>
        <LogHead
          value={selectedDay}
          onChange={setSelectedDay}
          hosTimers={clocks}
          selectedDay={selectedDay}
          totalMiles={totalMiles}
          vehicles={vehicles}
          violations={violations}
          diagnostics={diagnostics}
        />
        <ELDGraph
          selectedDay={selectedDay}
          events={rawEventList}
          sliderSelection={sliderSelection}
          setSliderSelection={setSliderSelection}
          sliderActive={sliderActive}
          setSliderActive={setSliderActive}
          setSelectedIds={setSelection}
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
                        setSelection(
                          checked
                            ? new Set(currentDayEvents.map((e) => e.event._id))
                            : new Set(),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="w-36">Time</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                  <TableHead className="w-80">Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-16 text-center">Status</TableHead>
                  <TableHead className="w-16 text-center">Origin</TableHead>
                  <TableHead className="w-30">Odometer</TableHead>
                  <TableHead className="w-30">Eng. Hours</TableHead>
                  <TableHead className="w-52">Note</TableHead>
                  <TableHead className="w-24 text-center">Actions</TableHead>
                  <TableHead className="w-16">ELD</TableHead>
                  <TableHead className="w-16">Vehicle</TableHead>
                  <TableHead className="w-16">ID</TableHead>
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
            selectedIds={selectedIds}
            resetSelection={resetSelection}
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
