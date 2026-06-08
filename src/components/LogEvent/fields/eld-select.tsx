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
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useState } from "react";
import { FaTruckFront } from "react-icons/fa6";

export default function EldSelect({ elds, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const selected = elds.find((e) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <Label className="flex w-28 items-center gap-2">ELD</Label>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled}
            variant="outline"
            className="w-40 justify-start"
          >
            {selected?.sn ?? "None"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0">
          <Command className="overflow-y-auto">
            <CommandInput placeholder="Search elds..." />
            <CommandList onWheel={(e) => e.stopPropagation()}>
              <CommandEmpty>No elds found</CommandEmpty>

              <CommandGroup>
                {elds.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.sn}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                    }}
                  >
                    {e.sn}
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === e.id ? "opacity-100" : "opacity-0",
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
