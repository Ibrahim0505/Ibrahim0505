import dayjs from "dayjs";
import "dayjs/locale/id";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("id");

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return dayjs(iso).format("D MMM YYYY, HH:mm");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return dayjs(iso).format("D MMM YYYY");
}

export function fromNow(iso: string | null): string {
  if (!iso) return "-";
  return dayjs(iso).fromNow();
}

// Human readable countdown to next harvest.
export function harvestCountdown(nextIso: string | null): string {
  if (!nextIso) return "Siap panen";
  const next = dayjs(nextIso);
  const now = dayjs();
  if (next.isBefore(now)) return "Siap panen";
  const days = next.diff(now, "day");
  if (days >= 1) return `${days} hari lagi`;
  const hours = next.diff(now, "hour");
  if (hours >= 1) return `${hours} jam lagi`;
  const mins = Math.max(1, next.diff(now, "minute"));
  return `${mins} menit lagi`;
}

export function formatKg(kg: number): string {
  if (!kg) return "0 kg";
  return `${Number(kg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
}

export function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
