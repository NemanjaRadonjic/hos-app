import { useTransaction } from "@/lib/hooks/useTransaction";
import DriverSelect from "./driver-select";
import { useParams } from "@tanstack/react-router";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { Label } from "../ui/label";
import { TagInput } from "../ui/tag-input";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";

export const ShippingForm = ({ selectedDay, closeDialog }) => {
  const { driverId } = useParams({
    from: "/drivers/$driverId",
  });
  const { drivers } = useDriversData();
  console.log({ driverId });
  const { updateDailyLog, getDailyLog } = useTransactionContext();

  const dailyLog = getDailyLog(selectedDay.toFormat("yyyy/MM/dd"));

  const [trailers, setTrailers] = useState<string[]>(
    dailyLog?.form.trailers || [],
  );
  const [shippingDocs, setShippingDocs] = useState<string[]>(
    dailyLog?.form.shippingDocuments || [],
  );
  const [signature, setSignature] = useState<string>(
    dailyLog?.form.signature || "",
  );
  const [pendingCoDriverId, setPendingCoDriverId] = useState(
    dailyLog?.form.coDriver?.id,
  );
  const [pendingCoDriver, setPendingCoDriver] = useState(
    dailyLog?.form.coDriver ?? null,
  );

  const dailyLogID =
    dailyLog?._id || `DailyLog:${driverId}:${selectedDay.toFormat("yyyyMMdd")}`;

  const onSubmit = () => {
    updateDailyLog(dailyLogID, {
      form: {
        ...dailyLog?.form,
        trailers,
        shippingDocuments: shippingDocs,
        ...(signature && { signature }),
        ...(pendingCoDriver && { coDriver: pendingCoDriver }),
      },
    });
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Co driver:</Label>
        <DriverSelect
          driverId={pendingCoDriverId ?? null}
          co={true}
          onSelect={(id) => {
            const selectedDriver = drivers.find((d) => d.id === id);
            setPendingCoDriverId(id);
            // store for save, don't call updateDailyLog yet
            setPendingCoDriver(selectedDriver?.dataAsCoDriver);
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Trailers</Label>
        <TagInput
          value={trailers}
          onChange={setTrailers}
          type="trailer"
          placeholder="Add trailers..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Trailers</Label>
        <TagInput
          value={shippingDocs}
          onChange={setShippingDocs}
          type="shipping-doc"
          placeholder="Add shipping documents..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Signature</Label>
        <Input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
      </div>

      <Button className="cursor-pointer" onClick={onSubmit}>
        Save
      </Button>
    </div>
  );
};
