import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { DateTime } from "luxon";
import { useState } from "react";

type TransactionDatePickerProps = {
  value: DateTime;
  setSelectedDay: (day: DateTime) => void;
  minDate: DateTime;
  maxDate: DateTime;
};

export function TransactionDatePicker({
  value,
  setSelectedDay,
  minDate,
  maxDate,
}: TransactionDatePickerProps) {
  const [open, setOpen] = useState(false);

  const prev = value.minus({ days: 1 });
  const next = value.plus({ days: 1 });

  const canGoPrev = prev >= minDate.startOf("day");
  const canGoNext = next <= maxDate.startOf("day");

  return (
    <div className="flex items-center justify-start">
      <Button
        variant="ghost"
        size="sm"
        disabled={!canGoPrev}
        onClick={() => setSelectedDay(prev)}
        className="text-muted-foreground text-sm"
      >
        {prev.toFormat("MMM d")}
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="px-3 text-sm font-semibold uppercase"
          >
            {value.toFormat("MMM d")}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={value.toJSDate()}
            onSelect={(date) => {
              if (!date) return;

              const selected = DateTime.fromObject({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
              }).startOf("day");

              setSelectedDay(selected);
              setOpen(false);
            }}
            disabled={(date) => {
              const day = DateTime.fromObject({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
              }).startOf("day");

              return (
                day < minDate.startOf("day") || day > maxDate.startOf("day")
              );
            }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        disabled={!canGoNext}
        onClick={() => setSelectedDay(next)}
        className="text-muted-foreground text-sm"
      >
        {next.toFormat("MMM d")}
      </Button>
    </div>
  );
}
