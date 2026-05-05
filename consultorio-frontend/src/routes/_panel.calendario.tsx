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

const HORAS = Array.from({ length: 12 }, (_, i) => i + 9); // 9 a 20

interface Turno {
  id: string; paciente_id: string; profesional_id: string | null;
  fecha_hora_inicio: string; fecha_hora_fin: string;
  tratamiento: string | null; estado: string; notas: string | null;
  pacientes?: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
  profesionales?: { nombre: string; color_calendario?: string } | null;
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

  const filtered = profFilter.length === 0 ? turnos : turnos.filter((t) => t.profesional_id && profFilter.includes(t.profesional_id));

  const save = useMutation({
    mutationFn: async () => {
      const inicio = new Date(form.fecha_hora_inicio);
      const fin = new Date(inicio.getTime() + form.duracion_min * 60000);
      const payload = {
        paciente_id: form.paciente_id,
        profesional_id: form.profesional_id || null,
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
        tratamiento: form.tratamiento || null,
        notas: form.notas || null,
        origen: "manual" as const,
      };
      const { error } = await supabase.from("turnos").insert(payload);
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

  const openCreate = (date: Date) => {
    setCreating(date);
    const local = format(date, "yyyy-MM-dd'T'HH:mm");
    setForm({ paciente_id: "", profesional_id: "", fecha_hora_inicio: local, duracion_min: 45, tratamiento: "", notas: "" });
  };

  const getOne = <T,>(v: T | T[] | null | undefined): T | null =>
    !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

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

      <Card className="overflow-x-auto p-2">
        <div className="grid min-w-[900px] grid-cols-[60px_repeat(6,minmax(0,1fr))]">
          <div />
          {dias.map((d) => (
            <div key={d.toISOString()} className={`p-2 text-center text-sm font-medium ${isToday(d) ? "text-primary" : ""}`}>
              <div className="capitalize">{format(d, "EEE", { locale: es })}</div>
              <div className="text-xl font-bold">{format(d, "d")}</div>
            </div>
          ))}
          {HORAS.map((h) => (
            <Row key={h} hora={h} dias={dias} turnos={filtered} onClickEmpty={openCreate} onClickTurno={(t) => setEditing(t)} getOne={getOne} />
          ))}
        </div>
      </Card>

      {/* CREATE */}
      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo turno</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Select value={form.paciente_id} onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => <SelectItem key={p.id} value={p.id}>{p.apellido}, {p.nombre}</SelectItem>)}
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
                <Input type="datetime-local" value={form.fecha_hora_inicio} onChange={(e) => setForm({ ...form, fecha_hora_inicio: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input type="number" value={form.duracion_min} onChange={(e) => setForm({ ...form, duracion_min: parseInt(e.target.value) || 45 })} />
              </div>
            </div>
            <div className="space-y-2"><Label>Tratamiento</Label><Input value={form.tratamiento} onChange={(e) => setForm({ ...form, tratamiento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(null)}>Cancelar</Button>
              <Button type="submit" disabled={!form.paciente_id || save.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Turno</DialogTitle></DialogHeader>
          {editing && (() => {
            const p = getOne(editing.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
            return (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{p ? `${p.apellido}, ${p.nombre}` : "—"}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(editing.fecha_hora_inicio), "PPP HH:mm 'hs'", { locale: es })}</p>
                  {editing.tratamiento && <p className="mt-1 text-sm">{editing.tratamiento}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editing.estado} onValueChange={(v) => updateEstado.mutate({ id: editing.id, estado: v })}>
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
                  <Button variant="destructive" onClick={() => { if (confirm("¿Eliminar?")) remove.mutate(editing.id); }}>
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

function Row({
  hora, dias, turnos, onClickEmpty, onClickTurno, getOne,
}: {
  hora: number;
  dias: Date[];
  turnos: Turno[];
  onClickEmpty: (d: Date) => void;
  onClickTurno: (t: Turno) => void;
  getOne: <T,>(v: T | T[] | null | undefined) => T | null;
}) {
  return (
    <>
      <div className="border-t border-r p-2 text-xs text-muted-foreground">{String(hora).padStart(2, "0")}:00</div>
      {dias.map((d) => {
        const slot = setMinutes(setHours(d, hora), 0);
        const slotTurnos = turnos.filter((t) => {
          const ti = new Date(t.fecha_hora_inicio);
          return isSameDay(ti, d) && ti.getHours() === hora;
        });
        return (
          <div
            key={d.toISOString()}
            className="relative min-h-[60px] border-t border-r p-1 hover:bg-muted/30 cursor-pointer"
            onClick={() => slotTurnos.length === 0 && onClickEmpty(slot)}
          >
            {slotTurnos.map((t) => {
              const p = getOne(t.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
              const color = t.profesionales?.color_calendario || "#0F4C5C";
              return (
                <button
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); onClickTurno(t); }}
                  className="mb-1 block w-full rounded px-1.5 py-1 text-left text-xs text-white"
                  style={{ backgroundColor: color }}
                >
                  <div className="font-semibold">{fmtTime(t.fecha_hora_inicio)}</div>
                  <div className="truncate">{p ? `${p.apellido}` : "—"}</div>
                  {t.tratamiento && <div className="truncate text-[10px] opacity-80">{t.tratamiento}</div>}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
