import { tzLookup } from "@/lib/helpers/tz-lookup";
import { TZ_MAP } from "@/lib/maps";
import type { HosEvent, VehicleSimplified } from "@/lib/types";
import { DateTime } from "luxon";
import { Clock3, Route } from "lucide-react";
import { FaLock, FaPhone, FaTruckFront, FaUserClock } from "react-icons/fa6";
import { Badge } from "./ui/badge";
import { MdSignalWifi4Bar, MdSignalWifiBad } from "react-icons/md";
import { VerticalSeparator } from "./v-separator";
import { RiLockFill, RiLockStarFill } from "react-icons/ri";

type InfoBarProps = {
  totalMiles: number;
  location: HosEvent["location"];
  phone: string;
  isConnected: boolean;
  vehicles: VehicleSimplified[];
  lockedEvents: {
    server: HosEvent | undefined;
    user: HosEvent | undefined;
  };
  setSelectedDay: React.Dispatch<React.SetStateAction<DateTime>>;
};

export function InfoBar({
  totalMiles,
  location,
  phone,
  isConnected,
  vehicles,
  lockedEvents,
  setSelectedDay,
}: InfoBarProps) {
  const driverTZ = tzLookup({
    lat: location?.lat,
    lon: location?.lon,
  });
  const displayTZ =
    Object.entries(TZ_MAP).find(([, value]) => value === driverTZ)?.[0] ??
    driverTZ;
  const driverTime =
    driverTZ && DateTime.now().setZone(driverTZ).toFormat("hh:mm a");
  const { server, user } = lockedEvents;
  const serverLockedAt = server
    ? DateTime.fromMillis(server.eventTime.timestamp).toFormat(
        "MM/dd/yyyy hh:mm a",
      )
    : null;

  const userLockedAt = user
    ? DateTime.fromMillis(user.eventTime.timestamp).toFormat(
        "MM/dd/yyyy hh:mm a",
      )
    : null;
  return (
    <div className="bg-muted/40 flex items-center justify-between rounded-md border px-6 py-1.5 text-sm">
      <div className="flex items-center gap-4">
        <div>
          {isConnected ? (
            <Badge
              variant="success_filled"
              className="flex items-center gap-2 shadow-sm"
            >
              <MdSignalWifi4Bar size={24} /> Connected
            </Badge>
          ) : (
            <Badge variant="error_filled">
              <MdSignalWifiBad
                size={24}
                className="flex items-center gap-2 shadow-sm"
              />{" "}
              Disconnected
            </Badge>
          )}
        </div>
        <VerticalSeparator />
        <div className="flex flex-wrap gap-2">
          {vehicles.length ? (
            vehicles.map((vehicle) => (
              <Badge
                key={vehicle.id}
                variant="secondary"
                className="flex items-center gap-2 shadow-sm"
              >
                <FaTruckFront className="h-3 w-3" />
                {vehicle.name}
              </Badge>
            ))
          ) : (
            <Badge>
              <FaTruckFront className="mr-2 h-3 w-3" />
              None
            </Badge>
          )}
        </div>
        <VerticalSeparator />
        {location ? (
          <Badge
            variant="secondary"
            className="flex items-center gap-2 shadow-sm"
          >
            <FaUserClock />
            <span className="font-medium">{driverTime}</span>
            <span className="font-bold">{displayTZ}</span>
          </Badge>
        ) : (
          "No location"
        )}

        <VerticalSeparator />
        {phone && (
          <Badge variant="outline">
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 shadow-sm transition-colors"
            >
              <FaPhone />
              <span className="font-medium">{phone}</span>
            </a>
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        {serverLockedAt && server && (
          <Badge
            variant="error_filled"
            className="cursor-pointer"
            onClick={() =>
              setSelectedDay(DateTime.fromMillis(server.eventTime.timestamp))
            }
          >
            <RiLockStarFill />
            {serverLockedAt}
          </Badge>
        )}

        {userLockedAt && user && (
          <Badge
            variant="error_filled"
            className="cursor-pointer"
            onClick={() =>
              setSelectedDay(DateTime.fromMillis(user.eventTime.timestamp))
            }
          >
            <RiLockFill />
            {userLockedAt}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Route className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground">Distance</span>
        <span className="font-medium">{totalMiles.toLocaleString()} mi</span>
      </div>
    </div>
  );
}
