import { useEffect, useState } from "react";
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

type Props = {
  value: DateTime;
  onChange: (dt: DateTime) => void;
  maxDate?: string;
  className: string;
};

export default function DatePicker({
  value,
  onChange,
  maxDate,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  const [month, setMonth] = useState(value.toJSDate());

  useEffect(() => {
    if (!open) return;

    setMonth(
      maxDate
        ? DateTime.fromFormat(maxDate, "yyyy/MM/dd").toJSDate()
        : value.toJSDate(),
    );
  }, [open, maxDate, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between font-normal", className && className)}
        >
          {value.toFormat("MM/dd/yyyy")}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          month={month}
          selected={value.toJSDate()}
          onMonthChange={(d) => setMonth(d)}
          disabled={(date) => {
            if (!maxDate) return false;

            const max = DateTime.fromFormat(maxDate, "yyyy/MM/dd").startOf(
              "day",
            );

            const day = DateTime.fromObject({
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            }).startOf("day");

            const today = DateTime.now().startOf("day");

            if (max.hasSame(today, "day")) {
              return day >= max;
            }

            return day > max;
          }}
          onSelect={(date) => {
            if (!date) return;

            const dt = DateTime.fromObject({
              year: date.getFullYear(),
              month: date.getMonth() + 1,
              day: date.getDate(),
            });

            onChange(dt);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
