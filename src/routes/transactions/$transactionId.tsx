import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  deleteHosEvent,
  getHosEvents,
  getLastKnownStatus,
  getTransaction,
  updateTransaction,
  upsertHosEvent,
} from "@/lib/api";
import { DateTime } from "luxon";
import { TransactionGraph } from "@/components/TransactionGraph";
import type { HosEvent } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { PiClockCounterClockwise } from "react-icons/pi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TransactionLogEvent from "@/components/transaction-log-events";
import { TransactionDatePicker } from "@/components/transaction/date-picker";
import { Badge } from "@/components/ui/badge";
import { formatShift, TRANSACTION_STATUS_CLASSES } from ".";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildTransactionEvents,
  type CommitProgress,
  type DailyLogChange,
  type EventChange,
  type ExecutionCallbacks,
  type TransactionEvent,
} from "@/lib/hooks/useTransaction";
import { runQueue, type QueueItem } from "@/lib/helpers/api-helpers";
import {
  TransactionDialog,
  type ExecutionPhase,
} from "@/components/transaction-dialog";
import { enrichEvents } from "../drivers/helpers/enrich-events";
import { buildLogCheck } from "@/lib/log-check";
import { cn } from "@/lib/utils";
import { TransactionSkeleton } from "@/components/skeletons/transaction";

export const Route = createFileRoute("/transactions/$transactionId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { transactionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"before" | "after" | "rollback">("after");
  const [selectedDay, setSelectedDay] = useState<DateTime | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  useEffect(() => {
    setFocusedId(null);
  }, [selectedDay, view]);
  const focusEvent = (eventId: string) => {
    setFocusedId(eventId);

    requestAnimationFrame(() => {
      const row = document.getElementById(eventId);
      if (!row) return;

      const container = row.closest(".overflow-auto");
      if (!(container instanceof HTMLElement)) return;

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
  };
  const [rollbackOpen, setRollbackOpen] = useState(false);

  const [rollbackPhase, setRollbackPhase] = useState<ExecutionPhase>("confirm");

  const [rollbackProgress, setRollbackProgress] = useState<CommitProgress>({
    done: 0,
    total: 0,
    success: 0,
    failed: 0,
    waiting: null,
  });

  const { data: transaction, isLoading } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => getTransaction(transactionId),
  });

  const { drivers } = useDriversData();

  const fromLogDate = transaction?.from_date.replaceAll("-", "/");

  const { data: lastKnownStatus } = useQuery({
    queryKey: ["transaction-last-known-status", transactionId],
    queryFn: () => getLastKnownStatus(transaction!.driver_id, fromLogDate!),
    enabled: !!transaction && !!fromLogDate,

    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: currentEvents = [], isLoading: isRollbackPreviewLoading } =
    useQuery({
      queryKey: [
        "rollback-preview-events",
        transaction?.driver_id,
        transaction?.from_date,
        transaction?.to_date,
      ],
      queryFn: () =>
        getHosEvents(
          transaction!.driver_id,
          transaction!.from_date.replaceAll("-", "/"),
          transaction!.to_date.replaceAll("-", "/"),
        ),

      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });

  useEffect(() => {
    if (!transaction) return;

    setSelectedDay(DateTime.fromISO(transaction.from_date));
  }, [transaction]);

  if (isLoading) {
    return <TransactionSkeleton />;
  }

  if (!transaction || !selectedDay) {
    return <div>Transaction not found.</div>;
  }

  const driver = drivers.find((driver) => driver.id === transaction.driver_id);

  const driverName = driver?.name ?? transaction.driver_id;

  const fromDate = DateTime.fromISO(transaction.from_date);
  const toDate = DateTime.fromISO(transaction.to_date);

  const logDate = selectedDay.toFormat("yyyy/MM/dd");
  const isFirstTransactionDay = selectedDay.hasSame(fromDate, "day");
  const rollbackPreviewEvents =
    view === "rollback"
      ? buildRollbackPreview({
          currentEvents,
          transactionEvents: transaction.transaction_events,
        }).sort((a, b) => a.eventTime.timestamp - b.eventTime.timestamp)
      : [];

  const events =
    view === "rollback"
      ? rollbackPreviewEvents
          .filter((event) => event.eventTime.logDate.date === logDate)
          .map((event) => {
            const transactionEvent = transaction.transaction_events.find(
              (item) => item.eventId === event._id,
            );

            return {
              event,
              operation: transactionEvent?.operation ?? null,
            };
          })
      : transaction.transaction_events
          .filter(
            (item) =>
              item.before?.eventTime.logDate.date === logDate ||
              item.after?.eventTime.logDate.date === logDate,
          )
          .map((item) => {
            const event =
              view === "before"
                ? item.before
                : item.operation === "delete"
                  ? null
                  : (item.after ?? item.before);

            if (!event) return null;

            return {
              event,
              operation: item.operation,
            };
          })
          .filter(
            (
              item,
            ): item is {
              event: HosEvent;
              operation: "create" | "update" | "delete" | null;
            } => item !== null,
          );

  const rawLogEvents = events.map(({ event }) => event);

  const displayEvents =
    isFirstTransactionDay &&
    lastKnownStatus &&
    !rawLogEvents.some((event) => event._id === lastKnownStatus._id)
      ? [lastKnownStatus, ...rawLogEvents].sort(
          (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
        )
      : rawLogEvents;

  const diagnostics = buildLogCheck({
    events: displayEvents,
    dailyLogs: [],
  });

  const operationById = new Map(
    events.map(({ event, operation }) => [event._id, operation]),
  );

  const enrichedLogEvents = enrichEvents(displayEvents, diagnostics.issues).map(
    ({ event, info }) => ({
      event,
      info,
      operation: operationById.get(event._id) ?? null,
      isPreviousStatus: event._id === lastKnownStatus?._id,
    }),
  );

  const graphEvents = displayEvents;

  const rollback = async ({
    onPhaseChange,
    onProgress,
  }: ExecutionCallbacks) => {
    onPhaseChange?.("creating");

    const eventChanges = reverseEventChanges(transaction.transaction_events);

    const logChanges = reverseLogChanges(transaction.log_changes);

    const transactionEvents = buildTransactionEvents({
      originalEvents: currentEvents,
      eventChanges,
      fromDate: transaction.from_date.replaceAll("-", "/"),
      toDate: transaction.to_date.replaceAll("-", "/"),
    });

    const rollbackTransaction = await createTransaction({
      driverId: transaction.driver_id,
      fromDate: transaction.from_date.replaceAll("-", "/"),
      toDate: transaction.to_date.replaceAll("-", "/"),
      eventChanges,
      logChanges,
      transactionEvents,
      maxTimeShiftMs: transaction.max_time_shift_ms,
    });

    onPhaseChange?.("saving");

    const items: QueueItem[] = [];

    for (const item of transaction.transaction_events) {
      switch (item.operation) {
        case "create":
          items.push({
            id: item.eventId,
            label: `Delete ${item.eventId}`,
            run: () => deleteHosEvent(item.eventId),
          });
          break;

        case "update":
        case "delete":
          if (!item.before) break;

          items.push({
            id: item.eventId,
            label: `Restore ${item.eventId}`,
            run: () => upsertHosEvent(item.eventId, item.before),
          });

          break;
      }
    }

    await runQueue({
      items,
      batchSize: 2,
      launchEveryMs: 100,
      onProgress,
    });

    onPhaseChange?.("finalizing");

    await updateTransaction(rollbackTransaction.id, {
      status: "success",
    });

    await queryClient.refetchQueries({
      queryKey: [
        "rollback-preview-events",
        transaction.driver_id,
        transaction.from_date,
        transaction.to_date,
      ],
    });

    return {
      failed: [],
    };
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-y-2 overflow-hidden">
      <div className="bg-background/95 flex shrink-0 items-center gap-3 border-b px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0">
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Driver
            </div>
            <div className="truncate text-sm font-semibold">{driverName}</div>
          </div>

          <div className="bg-border h-7 w-px" />

          <div>
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Range
            </div>
            <div className="text-sm font-medium">
              {transaction.from_date === transaction.to_date
                ? transaction.from_date
                : `${transaction.from_date} – ${transaction.to_date}`}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              Range
            </div>
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                TRANSACTION_STATUS_CLASSES[transaction.status],
              )}
            >
              {transaction.status}
            </Badge>
          </div>
          <div className="bg-border h-7 w-px" />

          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Updated </span>
              <span className="text-center font-semibold">
                {transaction.updated_event_count}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground">Added </span>
              <span className="text-center font-semibold">
                {transaction.added_event_count}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground">Deleted </span>
              <span className="text-center font-semibold">
                {transaction.deleted_event_count}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground">Logs </span>
              <span className="text-center font-semibold">
                {transaction.log_change_count}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-muted-foreground">Max shift </span>
              <span className="text-center font-semibold">
                {transaction.max_time_shift_ms
                  ? formatShift(transaction.max_time_shift_ms)
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-muted-foreground mr-2 hidden text-xs xl:block">
            {DateTime.fromISO(transaction.created_at).toFormat(
              "MMM dd, yyyy · hh:mm a",
            )}
          </div>

          <TransactionDatePicker
            value={selectedDay}
            setSelectedDay={setSelectedDay}
            minDate={fromDate}
            maxDate={toDate}
          />

          <div className="inline-flex rounded-md border p-1">
            {[
              { value: "before", label: "Before" },
              { value: "after", label: "After" },
              { value: "rollback", label: "Rollback" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={view === option.value ? "default" : "ghost"}
                size="sm"
                className="h-7 px-4 text-xs"
                onClick={() =>
                  setView(option.value as "before" | "after" | "rollback")
                }
              >
                {option.label}
              </Button>
            ))}
          </div>

          <Button
            size="sm"
            disabled={view !== "rollback"}
            className="bg-error-fg"
            onClick={() => {
              setRollbackPhase("confirm");

              setRollbackProgress({
                done: 0,
                total: transaction.event_change_count,
                success: 0,
                failed: 0,
                waiting: null,
              });

              setRollbackOpen(true);
            }}
          >
            <PiClockCounterClockwise />
            Rollback
          </Button>
        </div>
      </div>

      <div className="shrink-0">
        <TransactionGraph
          selectedDay={selectedDay}
          events={graphEvents}
          focusedId={focusedId}
          focusEvent={focusEvent}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-34">Time</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="w-52">Event</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-18 text-center">Status</TableHead>
              <TableHead className="w-18 text-center">Origin</TableHead>
              <TableHead className="w-30">Odometer</TableHead>
              <TableHead className="w-30">Eng. Hours</TableHead>
              <TableHead className="w-52">Note</TableHead>
              <TableHead className="w-14">ELD</TableHead>
              <TableHead className="w-14">Vehicle</TableHead>
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-24">Operation</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {enrichedLogEvents.map(({ event, info, operation }) => (
              <TransactionLogEvent
                key={event._id}
                event={event}
                info={info}
                operation={operation}
                focused={focusedId === event._id}
                focusEvent={focusEvent}
              />
            ))}

            {enrichedLogEvents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="text-muted-foreground h-24 text-center"
                >
                  No events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TransactionDialog
        action="rollback"
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        phase={rollbackPhase}
        progress={rollbackProgress}
        transactionDetails={{
          from: transaction.from_date,
          to: transaction.to_date,
          updatedEvents: transaction.updated_event_count,
          addedEvents: transaction.added_event_count,
          deletedEvents: transaction.deleted_event_count,
          changedLogs: transaction.log_change_count,
          totalRequests: transaction.event_change_count,
        }}
        onConfirm={async () => {
          try {
            const result = await rollback({
              onPhaseChange: (phase) => setRollbackPhase(phase),
              onProgress: setRollbackProgress,
            });

            setRollbackPhase(result.failed.length > 0 ? "error" : "success");
          } catch (error) {
            console.error(error);
            setRollbackPhase("error");
          }
        }}
      />
    </div>
  );
}

const buildRollbackPreview = ({
  currentEvents,
  transactionEvents,
}: {
  currentEvents: HosEvent[];
  transactionEvents: TransactionEvent[];
}) => {
  const eventsById = new Map(currentEvents.map((event) => [event._id, event]));

  for (const item of transactionEvents) {
    switch (item.operation) {
      case "create":
        eventsById.delete(item.eventId);
        break;

      case "update":
      case "delete":
        if (item.before) {
          eventsById.set(item.eventId, item.before);
        }
        break;

      case null:
        break;
    }
  }

  return [...eventsById.values()];
};

export const reverseEventChanges = (
  transactionEvents: TransactionEvent[],
): EventChange[] =>
  transactionEvents.flatMap((item): EventChange[] => {
    switch (item.operation) {
      case "create":
        return [
          {
            eventId: item.eventId,
            operation: "delete",
            before: item.after,
            after: null,
          },
        ];

      case "update":
        return [
          {
            eventId: item.eventId,
            operation: "update",
            before: item.after,
            after: item.before,
          },
        ];

      case "delete":
        return [
          {
            eventId: item.eventId,
            operation: "create",
            before: null,
            after: item.before,
          },
        ];

      case null:
        return [];
    }
  });

export const reverseLogChanges = (
  logChanges: DailyLogChange[],
): DailyLogChange[] =>
  logChanges.flatMap((change): DailyLogChange[] => {
    switch (change.operation) {
      case "create":
        return [];

      case "update":
        return [
          {
            logId: change.logId,
            logDate: change.logDate,
            operation: "update",
            before: change.after,
            after: change.before,
          },
        ];
    }
  });
