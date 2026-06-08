import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { DateTime } from "luxon";
import { Input } from "./input";

type Value = {
  date: DateTime;
  time: string;
};

const toCalendarDate = (dt: DateTime) =>
  new Date(dt.year, dt.month - 1, dt.day);

const fromCalendarDate = (d: Date) =>
  DateTime.fromObject({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  });

const DateAndTimePicker = ({
  value,
  onChange,
}: {
  value: Value;
  onChange: (value: Value) => void;
}) => {
  const [open, setOpen] = useState(false);

  // 👇 stable UI state (THIS is what Calendar controls)
  const [month, setMonth] = useState<Date>(
    new Date(value.date.year, value.date.month - 1),
  );

  const calendarDate = new Date(
    value.date.year,
    value.date.month - 1,
    value.date.day,
  );

  return (
    <div className="flex gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between font-normal">
            {value.date.toFormat("MM/dd/yyyy")}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={calendarDate}
            month={month}
            onMonthChange={setMonth}
            onSelect={(d) => {
              if (!d) return;

              const dt = DateTime.fromObject({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
              }).setZone("America/Chicago", { keepLocalTime: true });

              onChange({
                ...value,
                date: dt,
              });

              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        step="1"
        value={value.time}
        onChange={(e) =>
          onChange({
            ...value,
            time: e.target.value,
          })
        }
      />
    </div>
  );
};

export default DateAndTimePicker;
