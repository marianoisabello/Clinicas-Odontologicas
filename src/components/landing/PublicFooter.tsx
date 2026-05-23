import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, MapPin, Phone, Mail, Clock } from "lucide-react";
import { CONSULTORIO } from "@/lib/config";

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Consultorio</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {CONSULTORIO.direccion}</li>
              <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /> {CONSULTORIO.telefono}</li>
              <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-primary" /> {CONSULTORIO.email}</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Horarios</h3>
            <p className="flex items-start gap-2 text-sm">
              <Clock className="mt-0.5 h-4 w-4 text-primary" />
              <span>{CONSULTORIO.horario}</span>
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Seguinos</h3>
            <div className="flex gap-3">
              <a href={CONSULTORIO.instagram} target="_blank" rel="noopener noreferrer" className="rounded-md border p-2 hover:bg-muted">
                <Instagram className="h-4 w-4" />
              </a>
              <a href={CONSULTORIO.facebook} target="_blank" rel="noopener noreferrer" className="rounded-md border p-2 hover:bg-muted">
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {CONSULTORIO.nombre}. Todos los derechos reservados.</p>
          <Link to="/login" className="hover:text-primary">Acceso profesionales</Link>
        </div>
      </div>
    </footer>
  );
}
