import DriverSelect from "./driver-select";
import { useParams } from "@tanstack/react-router";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { Label } from "../ui/label";
import { FormInput } from "../ui/form-input";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { MdClear } from "react-icons/md";
import { findNearestSignature } from "@/lib/hooks/helpers/find-nearest-signature";
import { toast } from "sonner";
import { FaFileSignature } from "react-icons/fa";

export const ShippingForm = ({ selectedDay, closeDialog }) => {
  const { driverId } = useParams({
    from: "/drivers/$driverId",
  });
  const { drivers } = useDriversData();

  const { updateDailyLog, getDailyLog, dailyLogs } = useTransactionContext();

  const dailyLog = getDailyLog(selectedDay.toFormat("yyyy/MM/dd"));

  const [trailers, setTrailers] = useState<string[]>(
    dailyLog?.form.trailers || [],
  );
  const [shippingDocs, setShippingDocs] = useState<string[]>(
    dailyLog?.form.shippingDocuments || [],
  );
  const [signature, setSignature] = useState<string | undefined>(
    dailyLog?.form.signature || undefined,
  );
  const [pendingCoDriverId, setPendingCoDriverId] = useState(
    dailyLog?.form.coDriver?.id,
  );
  const [pendingCoDriver, setPendingCoDriver] = useState(
    dailyLog?.form.coDriver ?? undefined,
  );

  const dailyLogID =
    dailyLog?._id || `DailyLog:${driverId}:${selectedDay.toFormat("yyyyMMdd")}`;

  const onSubmit = () => {
    updateDailyLog(dailyLogID, {
      trailers,
      shippingDocuments: shippingDocs,
      ...(signature && { signature }),
      ...(pendingCoDriver && { coDriver: pendingCoDriver }),
    });
    closeDialog();
  };
  const handleGetLatestSignature = () => {
    const latestSignature = findNearestSignature(
      dailyLogs,
      selectedDay.toFormat("yyyy/MM/dd"),
    );

    if (!latestSignature) {
      toast.error("No signature found.");
      return;
    }

    setSignature(latestSignature);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">Driver Log Details</h2>

        <p className="text-muted-foreground text-sm">
          {selectedDay.toFormat("EEEE, MMMM d, yyyy")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Co driver:</Label>
        <DriverSelect
          driverId={pendingCoDriverId ?? null}
          co={true}
          onSelect={(id) => {
            const selectedDriver = drivers.find((d) => d.id === id);

            setPendingCoDriverId(id);
            setPendingCoDriver(selectedDriver?.dataAsCoDriver);
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Trailers</Label>
        <FormInput
          value={trailers}
          onChange={setTrailers}
          placeholder="Add trailers..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Shipping Documents</Label>
        <FormInput
          value={shippingDocs}
          onChange={setShippingDocs}
          placeholder="Add shipping documents..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Signature</Label>

        <div className="relative">
          <Input
            onKeyDown={(e) => e.stopPropagation()}
            value={signature ?? ""}
            onChange={(e) => setSignature(e.target.value)}
            className="pr-10"
          />

          {signature && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSignature(undefined)}
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            >
              <MdClear className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleGetLatestSignature}
      >
        <FaFileSignature /> Get signature
      </Button>

      <Button className="cursor-pointer" onClick={onSubmit}>
        Save
      </Button>
    </div>
  );
};
