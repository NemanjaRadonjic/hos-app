import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";
import { FaTruckFront } from "react-icons/fa6";

export default function VehicleSelect({ vehicles, value, onChange }) {
  const [open, setOpen] = useState(false);

  const selected = vehicles.find((v: Vehicle) => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <Label className="flex w-28 items-center gap-2">Vehicle</Label>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-40 justify-start">
            {selected?.name ?? "Select vehicle"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0">
          <Command className="overflow-y-auto">
            <CommandInput placeholder="Search vehicle..." />
            <CommandList onWheel={(e) => e.stopPropagation()}>
              <CommandEmpty>No vehicle found</CommandEmpty>

              <CommandGroup>
                {vehicles.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={v.name}
                    onSelect={() => {
                      onChange(v.id);
                      setOpen(false);
                    }}
                  >
                    <FaTruckFront />
                    {v.name}
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === v.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}
