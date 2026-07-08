import { IoPeopleSharp, IoPersonSharp } from "react-icons/io5";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Portal as PopoverPortal } from "@radix-ui/react-popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "../ui/badge";
import { EVENT_CODE_MAP } from "@/lib/maps";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { useDriverData } from "@/lib/hooks/useDriverData";
import { FaTruckFront } from "react-icons/fa6";
import { useState } from "react";
import { MdClear } from "react-icons/md";
import { toast } from "sonner";

type DriverSelectProps = {
  driverId: string;
  co?: boolean;
  onSelect?: (id: string) => void;
};

const DriverSelect = ({
  driverId,
  co = false,
  onSelect,
}: DriverSelectProps) => {
  const { drivers, isLoading: isDriversLoading } = useDriversData();
  const { driver, isLoading } = useDriverData(driverId);

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-84 cursor-pointer items-center justify-start"
            onContextMenu={(e) => {
              e.preventDefault();

              if (driver?.name) {
                navigator.clipboard.writeText(driver.name);
              }
              toast.success("Driver name copied.");
            }}
          >
            <div className="flex flex-1 items-center">
              <div className="flex flex-1 items-center gap-2">
                {co ? <IoPeopleSharp /> : <IoPersonSharp />}
                {driver?.name ?? (co ? "Select co driver" : "Select driver")}
              </div>
              {driverId && (
                <div className="flex items-center gap-2">
                  {driver?.vehicle.name || "None"}
                  <FaTruckFront />
                </div>
              )}
            </div>
            <Badge
              className="ml-auto w-16"
              style={{
                background: `var(--hos-${driver?.status}-bg)`,
                color: `var(--hos-${driver?.status}-fg)`,
              }}
            >
              {EVENT_CODE_MAP[driver?.status]}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent className="w-96 p-0">
            <Command className="overflow-y-auto">
              <CommandInput placeholder="Search drivers..." />

              <CommandList onWheel={(e) => e.stopPropagation()}>
                <CommandEmpty>No drivers found.</CommandEmpty>

                <CommandGroup>
                  {drivers
                    .filter((d) => d.id !== driverId)
                    .map((driverOption) => (
                      <CommandItem
                        className="flex cursor-pointer justify-between [&_svg.lucide-check]:hidden"
                        key={driverOption.id}
                        value={`${driverOption.name} ${driverOption.vehicle.name}`}
                        onSelect={() => {
                          if (onSelect) {
                            onSelect(driverOption.id);
                          } else {
                            navigate({
                              to: "/drivers/$driverId",
                              params: { driverId: driverOption.id },
                            });
                          }
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-1">
                          <div className="flex flex-1 gap-2">
                            <IoPersonSharp />
                            {driverOption.name}
                          </div>
                          <div className="flex items-center gap-2">
                            {driverOption.vehicle.name}
                            <FaTruckFront />
                          </div>
                        </div>

                        <Badge
                          className="ml-auto w-16"
                          style={{
                            background: `var(--hos-${driverOption.status}-bg)`,
                            color: `var(--hos-${driverOption.status}-fg)`,
                          }}
                        >
                          {EVENT_CODE_MAP[driverOption.status]}
                        </Badge>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </PopoverPortal>
      </Popover>
      {co && driverId && (
        <Button variant="ghost" size="icon" onClick={() => onSelect?.(null)}>
          <MdClear className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default DriverSelect;
