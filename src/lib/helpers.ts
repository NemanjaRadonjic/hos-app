import { DateTime } from "luxon";
import { ICON_SIZES, NOTES_MAP } from "./maps";
import { TiDownload, TiUpload } from "react-icons/ti";
import { BsFuelPumpFill } from "react-icons/bs";
import type { IconType } from "react-icons";

export const minutesToHours = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m}min`;

  return `${h}h ${m}min`;
};

export const timestampToMinutes = (ts: number): number => {
  const dt = DateTime.fromMillis(ts);

  return dt.hour * 60 + dt.minute;
};

type NoteIcon = { Icon: IconType; color: string; size?: number };
type NoteTypeResult = { icons: NoteIcon[] } | null;

export function getNoteIcons(
  comment: string | undefined | null,
): NoteTypeResult {
  if (!comment) return null;
  const text = comment.toLowerCase();

  const isDel = NOTES_MAP.del.some((keyword) => text.includes(keyword));
  const isPu = NOTES_MAP.pu.some((keyword) => text.includes(keyword));
  const isFuel = NOTES_MAP.fuel.some((keyword) => text.includes(keyword));

  if (isDel && isPu)
    return {
      icons: [
        { Icon: TiDownload, color: "red", size: ICON_SIZES.default },
        { Icon: TiUpload, color: "green", size: ICON_SIZES.default },
      ],
    };
  if (isDel)
    return {
      icons: [{ Icon: TiDownload, color: "red", size: ICON_SIZES.default }],
    };
  if (isPu)
    return {
      icons: [{ Icon: TiUpload, color: "green", size: ICON_SIZES.default }],
    };
  if (isFuel)
    return {
      icons: [{ Icon: BsFuelPumpFill, color: "blue", size: ICON_SIZES.fuel }],
    };

  return null;
}

export const msToHHMMSS = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const msToDecimalHours = (ms: number) => {
  return (ms / (1000 * 60 * 60)).toFixed(2);
};

export const getTokenPayload = () => {
  const token = localStorage.getItem("apex_token");

  if (!token) return null;

  try {
    const payload = token.split(".")[1];

    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};
