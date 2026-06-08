import { IoPeopleSharp } from "react-icons/io5";
import { Button } from "../ui/button";
import { STATUS_MAP } from "@/lib/maps";
import { Badge } from "../ui/badge";
import { FaTruckFront } from "react-icons/fa6";
import { useDriverData } from "@/lib/hooks/useDriverData";
import { Edit } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type CoDriverProps = {
  coDriverId: string;
};

const CoDriver = ({ coDriverId }: CoDriverProps) => {
  const { driver, isLoading } = useDriverData(coDriverId);
  const navigate = useNavigate();
  // if (!driver) return null;
  if (!driver) {
    return (
      <Button variant="outline" className="w-84 cursor-pointer justify-start">
        <div className="flex flex-1">
          <div className="flex flex-1 gap-2">
            <IoPeopleSharp />
            <div>No codriver</div>
          </div>
        </div>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      className="w-84 cursor-pointer justify-start"
      onClick={() =>
        navigate({
          to: "/drivers/$driverId",
          params: { driverId: driver.id },
        })
      }
    >
      <div className="flex flex-1">
        <div className="flex flex-1 gap-2">
          <IoPeopleSharp />
          {driver?.name}
        </div>
        <div className="flex items-center gap-2">
          {driver?.vehicle.name}
          <FaTruckFront />
        </div>
      </div>
      <Badge
        className="ml-auto w-16"
        style={{
          background: `var(--hos-${driver?.status}-bg)`,
        }}
      >
        {driver && STATUS_MAP[driver?.status]}
      </Badge>
    </Button>
  );
};

export default CoDriver;
