export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toTimeString(hour: number, minute: number) {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${pad2(h)}:${pad2(m)}`;
}

export function parseFlexibleTime(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Accept HH:MM, H:MM, HH.MM
  const m1 = /^(\d{1,2})[:.](\d{2})$/.exec(s);
  if (m1) {
    const h = Number(m1[1]);
    const m = Number(m1[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return toTimeString(h, m);
    return null;
  }

  // Accept 0830 / 830 / 930 etc.
  const digits = s.replace(/\D/g, "");
  if (digits.length === 4) {
    const h = Number(digits.slice(0, 2));
    const m = Number(digits.slice(2, 4));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return toTimeString(h, m);
    return null;
  }
  if (digits.length === 3) {
    const h = Number(digits.slice(0, 1));
    const m = Number(digits.slice(1, 3));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return toTimeString(h, m);
    return null;
  }
  if (digits.length === 2) {
    const h = Number(digits);
    if (h >= 0 && h <= 23) return toTimeString(h, 0);
    return null;
  }

  return null;
}

export function addMinutesToTime(time: string, deltaMinutes: number): string {
  const parsed = parseFlexibleTime(time);
  const base = parsed ?? "00:00";
  const [hh, mm] = base.split(":").map(Number);
  let total = hh * 60 + mm + deltaMinutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return toTimeString(h, m);
}

export function generateTimesBetween(start: string, end: string, everyMinutes: number): string[] {
  const s = parseFlexibleTime(start);
  const e = parseFlexibleTime(end);
  if (!s || !e) return [];
  const step = Math.max(1, Math.floor(everyMinutes));
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  const out: string[] = [];
  if (endMin < startMin) return out; // keep simple: same-day range only

  for (let t = startMin; t <= endMin; t += step) {
    out.push(toTimeString(Math.floor(t / 60), t % 60));
  }
  return out;
}

export function addHoursToTime(time: string, deltaHours: number): string {
  return addMinutesToTime(time, deltaHours * 60);
}

