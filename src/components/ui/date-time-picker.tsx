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
import { cn } from "@/lib/utils";
import { TimeInput } from "./time-input";
import { FaCalendar } from "react-icons/fa6";

type Value = {
  date: DateTime;
  time: string;
};
const fromCalendarDate = (date: Date) =>
  DateTime.fromObject({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }).startOf("day");

const toCalendarDate = (dt: DateTime) =>
  new Date(dt.year, dt.month - 1, dt.day);

const DateAndTimePicker = ({
  value,
  onChange,
  className,
}: {
  value: Value;
  onChange: (value: Value) => void;
  className: string;
}) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => toCalendarDate(value.date));

  return (
    <div className="flex gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between font-normal",
              className && className,
            )}
          >
            <FaCalendar className="!h-3 !w-3" />
            {value.date.toFormat("MM/dd/yyyy")}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={toCalendarDate(value.date)}
            month={month}
            onMonthChange={setMonth}
            disabled={(date) => {
              const day = fromCalendarDate(date);

              const ctToday = DateTime.now().startOf("day");

              return day > ctToday;
            }}
            onSelect={(d) => {
              if (!d) return;

              const dt = DateTime.fromObject({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
              });

              onChange({
                ...value,
                date: dt,
              });

              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <TimeInput
        value={value.time}
        onChange={(nextTime) => {
          onChange({
            ...value,
            time: nextTime,
          });
        }}
        className={className}
      />
    </div>
  );
};

export default DateAndTimePicker;
