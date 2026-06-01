import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { DateTime } from "luxon";
import { useState } from "react";

type DatePickerProps = {
  value: DateTime<true> | DateTime<false>;
  onChange: React.Dispatch<
    React.SetStateAction<DateTime<true> | DateTime<false>>
  >;
};

export function DatePicker({ onChange, value }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const isToday = value.hasSame(DateTime.now(), "day");
  const prev = value.minus({ days: 1 });
  const next = value.plus({ days: 1 });
  return (
    <div className="flex items-center justify-start">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(prev)}
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
              if (date) {
                const nextDay = DateTime.fromObject({
                  year: date.getFullYear(),
                  month: date.getMonth() + 1,
                  day: date.getDate(),
                }).startOf("day");

                onChange(nextDay);
                setOpen(false);
              }
            }}
            disabled={(date) => {
              const calendarDay = DateTime.fromObject({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
              });

              const today = DateTime.now().startOf("day");

              return calendarDay > today;
            }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(next)}
        disabled={isToday}
        className="text-muted-foreground text-sm"
      >
        {next.toFormat("MMM d")}
      </Button>
    </div>
  );
}
