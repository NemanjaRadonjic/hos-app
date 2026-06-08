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

type Props = {
  value: DateTime;
  onChange: (dt: DateTime) => void;
};

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value.toJSDate());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal">
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
