import { format as fmt } from "date-fns";
import { es } from "date-fns/locale";

export const fmtDate = (d: Date | string) => fmt(typeof d === "string" ? new Date(d) : d, "dd/MM/yyyy", { locale: es });
export const fmtDateTime = (d: Date | string) => fmt(typeof d === "string" ? new Date(d) : d, "dd/MM/yyyy HH:mm", { locale: es });
export const fmtTime = (d: Date | string) => fmt(typeof d === "string" ? new Date(d) : d, "HH:mm", { locale: es });
export const fmtLong = (d: Date | string) => fmt(typeof d === "string" ? new Date(d) : d, "PPP", { locale: es });

export const fmtARS = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
