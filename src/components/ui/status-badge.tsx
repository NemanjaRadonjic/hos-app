import { EVENT_BADGE_COLORS, mainEventCodes, STATUS_MAP } from "@/lib/maps";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn(EVENT_BADGE_COLORS[status])}>
      {mainEventCodes.includes(status) && (
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: `var(--hos-${status}-fg)`,
            color: `var(--hos-${status}-bg)`,
          }}
        />
      )}
      {STATUS_MAP[status]}
    </Badge>
  );
}
