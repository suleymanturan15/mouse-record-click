import type { DayCode, ConflictPolicy } from "../../shared/models";

export function dayLabel(d: DayCode) {
  switch (d) {
    case "MON":
      return "Pzt";
    case "TUE":
      return "Sal";
    case "WED":
      return "Çar";
    case "THU":
      return "Per";
    case "FRI":
      return "Cum";
    case "SAT":
      return "Cmt";
    case "SUN":
      return "Paz";
  }
}

export function conflictLabel(p: ConflictPolicy) {
  switch (p) {
    case "SKIP":
      return "Atla";
    case "QUEUE":
      return "Sıraya al";
    case "RESTART":
      return "Durdur + yeniyi başlat";
  }
}

