import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  startOfWeek, addDays, format, addWeeks, subWeeks, isSameDay, isToday,
  setHours, setMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { fmtTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/calendario")({
  component: CalendarioPage,
});

const START_HOUR = 9;
const END_HOUR = 21;        // exclusive — muestra hasta las 20:xx
const HOUR_PX = 64;         // px por hora
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;
const HORAS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

interface Turno {
  id: string; paciente_id: string; profesional_id: string | null;
  fecha_hora_inicio: string; fecha_hora_fin: string;
  tratamiento: string | null; estado: string; notas: string | null;
  pacientes?: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
  profiles?: { nombre: string; color_calendario?: string } | { nombre: string; color_calendario?: string }[] | null;
}

function turnoLayout(turno: Turno): { top: number; height: number } {
  const start = new Date(turno.fecha_hora_inicio);
  const end = new Date(turno.fecha_hora_fin);
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_PX;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 22);
  return { top, height };
}

function getOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function CalendarioPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [profFilter, setProfFilter] = useState<string[]>([]);
  const [editing, setEditing] = useState<Turno | null>(null);
  const [creating, setCreating] = useState<Date | null>(null);
  const [form, setForm] = useState({
    paciente_id: "", profesional_id: "", fecha_hora_inicio: "", duracion_min: 45, tratamiento: "", notas: "",
  });

  const dias = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data: turnos = [] } = useQuery({
    queryKey: ["turnos-week", weekStart.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("turnos")
        .select("*, pacientes(nombre, apellido), profiles!turnos_profesional_id_fkey(nombre, color_calendario)")
        .gte("fecha_hora_inicio", weekStart.toISOString())
        .lte("fecha_hora_inicio", addDays(weekStart, 6).toISOString());
      return (data ?? []) as Turno[];
    },
  });

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("pacientes").select("id, nombre, apellido").order("apellido");
      return data ?? [];
    },
  });

  const { data: profs = [] } = useQuery({
    queryKey: ["profs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nombre, color_calendario").eq("activo", true);
      return data ?? [];
    },
  });

  const filtered = profFilter.length === 0 ? turnos : turnos.filter(
    (t) => t.profesional_id && profFilter.includes(t.profesional_id),
  );

  const save = useMutation({
    mutationFn: async () => {
      const inicio = new Date(form.fecha_hora_inicio);
      const fin = new Date(inicio.getTime() + form.duracion_min * 60000);
      const { error } = await supabase.from("turnos").insert({
        paciente_id: form.paciente_id,
        profesional_id: form.profesional_id || null,
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
        tratamiento: form.tratamiento || null,
        notas: form.notas || null,
        origen: "manual" as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Turno creado");
      qc.invalidateQueries({ queryKey: ["turnos-week"] });
      setCreating(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("turnos").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnos-week"] });
      setEditing(null);
      toast.success("Turno actualizado");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("turnos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnos-week"] });
      setEditing(null);
      toast.success("Turno eliminado");
    },
  });

  const assignProfesional = useMutation({
    mutationFn: async ({ id, profesional_id }: { id: string; profesional_id: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/admin/turnos/${id}/profesional`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ profesional_id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al asignar profesional");
      }
      return res.json();
    },
    onSuccess: (_, { profesional_id }) => {
      qc.invalidateQueries({ queryKey: ["turnos-week"] });
      setEditing((prev) => prev ? { ...prev, profesional_id } : prev);
      toast.success("Profesional asignado ✅");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = (date: Date) => {
    setCreating(date);
    setForm({
      paciente_id: "", profesional_id: "",
      fecha_hora_inicio: format(date, "yyyy-MM-dd'T'HH:mm"),
      duracion_min: 45, tratamiento: "", notas: "",
    });
  };

  // Click en una celda vacía: calcular hora a partir del offset Y
  const handleDayClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = START_HOUR * 60 + Math.floor((y / HOUR_PX) * 60);
    const snapped = Math.round(totalMinutes / 15) * 15; // snap a 15 min
    const h = Math.min(Math.floor(snapped / 60), END_HOUR - 1);
    const m = snapped % 60;
    openCreate(setMinutes(setHours(day, h), m));
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Filtro profesionales */}
      {profs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profs.map((p) => {
            const active = profFilter.includes(p.id);
            return (
              <Badge
                key={p.id}
                variant={active ? "default" : "outline"}
                className="cursor-pointer"
                style={active ? { backgroundColor: p.color_calendario ?? undefined } : undefined}
                onClick={() => setProfFilter(active ? profFilter.filter((x) => x !== p.id) : [...profFilter, p.id])}
              >
                {p.nombre}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Grilla */}
      <Card className="overflow-auto p-0">
        <div className="min-w-[800px]">
          {/* Cabecera días */}
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b bg-background sticky top-0 z-10">
            <div />
            {dias.map((d) => (
              <div
                key={d.toISOString()}
                className={`py-2 text-center text-sm font-medium border-l ${isToday(d) ? "text-primary" : "text-muted-foreground"}`}
              >
                <div className="capitalize text-xs">{format(d, "EEE", { locale: es })}</div>
                <div className={`text-xl font-bold ${isToday(d) ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                  {format(d, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Cuerpo: etiquetas de hora + columnas de días */}
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))]">
            {/* Columna de horas */}
            <div className="relative" style={{ height: TOTAL_PX }}>
              {HORAS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[11px] text-muted-foreground leading-none"
                  style={{ top: (h - START_HOUR) * HOUR_PX - 6 }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {dias.map((day) => {
              const dayTurnos = filtered.filter((t) => isSameDay(new Date(t.fecha_hora_inicio), day));
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-l cursor-pointer"
                  style={{ height: TOTAL_PX }}
                  onClick={(e) => handleDayClick(day, e)}
                >
                  {/* Líneas horizontales por hora */}
                  {HORAS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: (h - START_HOUR) * HOUR_PX }}
                    />
                  ))}

                  {/* Turnos */}
                  {dayTurnos.map((t) => {
                    const { top, height } = turnoLayout(t);
                    const p = getOne(t.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
                    const color = (getOne(t.profiles as { nombre: string; color_calendario?: string }[] | { nombre: string; color_calendario?: string } | null))?.color_calendario ?? "#0F4C5C";
                    return (
                      <button
                        key={t.id}
                        onClick={(e) => { e.stopPropagation(); setEditing(t); }}
                        className="absolute left-0.5 right-0.5 rounded text-left text-white overflow-hidden px-1.5 py-0.5 text-xs hover:brightness-90 transition-all"
                        style={{ top, height, backgroundColor: color }}
                      >
                        <div className="font-semibold leading-tight">{fmtTime(t.fecha_hora_inicio)}</div>
                        <div className="truncate leading-tight">{p ? `${p.apellido}, ${p.nombre}` : "—"}</div>
                        {height >= 50 && t.tratamiento && (
                          <div className="truncate text-[10px] opacity-80">{t.tratamiento}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Dialog: crear turno */}
      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo turno</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={form.paciente_id} onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.apellido}, {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profesional</Label>
              <Select value={form.profesional_id} onValueChange={(v) => setForm({ ...form, profesional_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {profs.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input
                  type="datetime-local"
                  value={form.fecha_hora_inicio}
                  onChange={(e) => setForm({ ...form, fecha_hora_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={form.duracion_min}
                  onChange={(e) => setForm({ ...form, duracion_min: parseInt(e.target.value) || 45 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tratamiento</Label>
              <Input value={form.tratamiento} onChange={(e) => setForm({ ...form, tratamiento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(null)}>Cancelar</Button>
              <Button type="submit" disabled={!form.paciente_id || save.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar / eliminar turno */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Turno</DialogTitle></DialogHeader>
          {editing && (() => {
            const p = getOne(editing.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
            return (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{p ? `${p.apellido}, ${p.nombre}` : "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(editing.fecha_hora_inicio), "PPP HH:mm", { locale: es })} hs
                    {" → "}
                    {fmtTime(editing.fecha_hora_fin)} hs
                  </p>
                  {editing.tratamiento && <p className="mt-1 text-sm">{editing.tratamiento}</p>}
                  {editing.notas && <p className="text-sm text-muted-foreground">{editing.notas}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Odontólogo</Label>
                  <Select
                    value={editing.profesional_id ?? "__none__"}
                    onValueChange={(v) => {
                      const profId = v === "__none__" ? "" : v;
                      if (profId) assignProfesional.mutate({ id: editing.id, profesional_id: profId });
                    }}
                    disabled={assignProfesional.isPending}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {profs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignProfesional.isPending && (
                    <p className="text-xs text-muted-foreground">Sincronizando calendario...</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={editing.estado}
                    onValueChange={(v) => updateEstado.mutate({ id: editing.id, estado: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="asistio">Asistió</SelectItem>
                      <SelectItem value="no_asistio">No asistió</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => { if (confirm("¿Eliminar este turno?")) remove.mutate(editing.id); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
