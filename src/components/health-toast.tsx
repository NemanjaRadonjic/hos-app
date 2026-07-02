import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useHealth } from "@/lib/helpers/health-check";

export function HealthToast() {
  const health = useHealth();
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    const serverDown = health.status === "unhealthy" || health.reconnecting;

    if (serverDown && toastId.current === null) {
      toastId.current = toast.error(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Server is not responding. Reconnecting...</span>
        </div>,
        {
          duration: Infinity,
        },
      );
    }

    if (!serverDown && toastId.current !== null) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
  }, [health.status, health.reconnecting]);

  return null;
}
