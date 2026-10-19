/** Bangkok has a fixed UTC+07:00 offset and no daylight-saving transitions. */
export function appointmentInstant(input: string): string | null {
  if (!input) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error("Enter a valid Bangkok date and time.");
  const date = new Date(`${input}:00+07:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    appointmentInput(date.toISOString()) !== input
  )
    throw new Error("Enter a valid Bangkok date and time.");
  return date.toISOString();
}
export function appointmentInput(instant: string | null): string {
  if (!instant) return "";
  return new Date(new Date(instant).getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function formatAppointment(instant: string): string {
  return `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(instant))} (Bangkok)`;
}
