import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DynamicIcon } from "@/components/DynamicIcon";
import {
  Plus, Pencil, Trash2, Check, ChevronsUpDown, MoreHorizontal, Mail, MessageCircle,
} from "lucide-react";
import { fmtARS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/tratamientos")({
  component: TratamientosPage,
});

// ─── Tipos ───────────────────────────────────────────────────────────────────

const ICONOS = ["Stethoscope","Sparkles","Sun","Syringe","Scissors","Smile","Anchor","AlertCircle","Heart","Star","Activity"];

interface Tratamiento {
  id: string; nombre: string; duracion_minutos: number;
  precio: number | null; descripcion: string | null; icono: string | null; activo: boolean;
}

interface Asignacion {
  id: string;
  paciente_id: string;
  tratamiento_id: string;
  profesional_id: string | null;
  fecha: string;
  precio_final: number;
  estado: string;
  notas: string | null;
  factura_id: string | null;
  pacientes?: { nombre: string; apellido: string };
  tratamientos?: { nombre: string };
  profiles?: { nombre: string } | null;
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente:  "bg-yellow-100 text-yellow-800",
  en_curso:   "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  cancelado:  "bg-gray-100 text-gray-600",
};

const hoy = () => new Date().toISOString().slice(0, 10);

// ─── Página principal ─────────────────────────────────────────────────────────

function TratamientosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tratamientos</h1>
        <p className="text-sm text-muted-foreground">Catálogo y asignaciones a pacientes.</p>
      </div>
      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogo" className="mt-4"><Catalogo /></TabsContent>
        <TabsContent value="asignaciones" className="mt-4"><Asignaciones /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab 1: Catálogo ──────────────────────────────────────────────────────────

function Catalogo() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tratamiento | null>(null);
  const [form, setForm] = useState({ nombre: "", duracion_minutos: 30, precio: 0, descripcion: "", icono: "Sparkles", activo: true });

  const { data: tratamientos = [] } = useQuery({
    queryKey: ["tratamientos-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("tratamientos").select("*").order("nombre");
      return (data ?? []) as Tratamiento[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("tratamientos").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tratamientos").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Actualizado" : "Creado");
      qc.invalidateQueries({ queryKey: ["tratamientos-admin"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tratamientos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tratamientos-admin"] }); toast.success("Eliminado"); },
  });

  const openEdit = (t: Tratamiento) => {
    setEditing(t);
    setForm({ nombre: t.nombre, duracion_minutos: t.duracion_minutos, precio: t.precio ?? 0, descripcion: t.descripcion ?? "", icono: t.icono ?? "Sparkles", activo: t.activo });
    setOpen(true);
  };
  const openNew = () => { setEditing(null); setForm({ nombre: "", duracion_minutos: 30, precio: 0, descripcion: "", icono: "Sparkles", activo: true }); setOpen(true); };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo tratamiento</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tratamientos.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-6">
              <div className="mb-3 flex items-start justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DynamicIcon name={t.icono} className="h-5 w-5" />
                </div>
                {!t.activo && <Badge variant="secondary">Inactivo</Badge>}
              </div>
              <h3 className="font-semibold">{t.nombre}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{t.descripcion}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>{t.duracion_minutos} min</span>
                <span className="font-semibold">{fmtARS(t.precio)}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm("¿Eliminar?")) remove.mutate(t.id); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} tratamiento</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Duración (min)</Label><Input type="number" value={form.duracion_minutos} onChange={(e) => setForm({ ...form, duracion_minutos: parseInt(e.target.value) || 30 })} /></div>
              <div className="space-y-2"><Label>Precio (ARS)</Label><Input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="grid max-h-32 grid-cols-6 gap-2 overflow-y-auto rounded border p-2">
                {ICONOS.map((i) => (
                  <button key={i} type="button" onClick={() => setForm({ ...form, icono: i })}
                    className={`flex aspect-square items-center justify-center rounded border ${form.icono === i ? "border-primary bg-primary/10" : ""}`}>
                    <DynamicIcon name={i} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Activo (visible en web)</Label>
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
            </div>
            <DialogFooter><Button type="submit" disabled={save.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Tab 2: Asignaciones ──────────────────────────────────────────────────────

function Asignaciones() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: asignaciones = [], isLoading } = useQuery<Asignacion[]>({
    queryKey: ["paciente-tratamientos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paciente_tratamientos")
        .select("*, pacientes(nombre,apellido), tratamientos(nombre), profiles(nombre)")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as Asignacion[];
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("paciente_tratamientos").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paciente-tratamientos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("paciente_tratamientos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Asignación eliminada"); qc.invalidateQueries({ queryKey: ["paciente-tratamientos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva asignación
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Tratamiento</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Profesional</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : asignaciones.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin asignaciones</TableCell></TableRow>
            ) : asignaciones.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.pacientes ? `${a.pacientes.apellido}, ${a.pacientes.nombre}` : "—"}
                </TableCell>
                <TableCell>{a.tratamientos?.nombre ?? "—"}</TableCell>
                <TableCell>{a.fecha}</TableCell>
                <TableCell className="text-right font-medium">{fmtARS(a.precio_final)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_COLORS[a.estado] ?? ""}`}>
                    {a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.profiles?.nombre ?? "—"}</TableCell>
                <TableCell>
                  {a.factura_id ? (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">Generada</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {["pendiente","en_curso","completado","cancelado"].filter(e => e !== a.estado).map(e => (
                        <DropdownMenuItem key={e} onClick={() => cambiarEstado.mutate({ id: a.id, estado: e })}>
                          Marcar como {e}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem className="text-destructive"
                        onClick={() => { if (confirm("¿Eliminar asignación?")) eliminar.mutate(a.id); }}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {dialogOpen && <AsignacionDialog onClose={() => { setDialogOpen(false); qc.invalidateQueries({ queryKey: ["paciente-tratamientos"] }); }} />}
    </div>
  );
}

// ─── Dialog nueva asignación ──────────────────────────────────────────────────

const emptyForm = {
  paciente_id: "", paciente_nombre: "",
  tratamiento_id: "", tratamiento_nombre: "",
  profesional_id: "",
  fecha: hoy(), precio_final: "", estado: "completado", notas: "",
};

function AsignacionDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ ...emptyForm });

  // Catálogo de tratamientos
  const { data: tratamientos = [] } = useQuery<Tratamiento[]>({
    queryKey: ["tratamientos-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("tratamientos").select("*").order("nombre");
      return (data ?? []) as Tratamiento[];
    },
  });

  // Profesionales activos
  const { data: profesionales = [] } = useQuery({
    queryKey: ["profiles-activos"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nombre").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  // Config del consultorio (para templates)
  const { data: config } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracion").select("*").maybeSingle();
      return data as Record<string, string> | null;
    },
  });

  function onTratamientoSelect(id: string) {
    const t = tratamientos.find(t => t.id === id);
    setForm(f => ({ ...f, tratamiento_id: id, tratamiento_nombre: t?.nombre ?? "", precio_final: t?.precio?.toString() ?? "" }));
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form.paciente_id || !form.tratamiento_id || !form.precio_final) {
        throw new Error("Completá paciente, tratamiento y precio");
      }

      // Datos del paciente para el mail
      const { data: paciente } = await supabase
        .from("pacientes")
        .select("nombre, apellido, email, telefono")
        .eq("id", form.paciente_id)
        .single();

      const pacienteNombre = paciente ? `${paciente.apellido}, ${paciente.nombre}` : form.paciente_nombre;

      // Crear factura_cliente
      const { data: factura, error: fError } = await supabase
        .from("facturas_cliente")
        .insert({
          paciente_id: form.paciente_id,
          paciente_nombre: pacienteNombre,
          concepto: `${form.tratamiento_nombre} — ${form.fecha}`,
          tipo_factura: "B",
          fecha: form.fecha,
          monto: parseFloat(form.precio_final),
          moneda: "ARS",
          estado: "pendiente",
          notas: form.notas || null,
        })
        .select()
        .single();

      if (fError) throw fError;

      // Crear asignación
      const { error: aError } = await supabase
        .from("paciente_tratamientos")
        .insert({
          paciente_id: form.paciente_id,
          tratamiento_id: form.tratamiento_id,
          profesional_id: form.profesional_id || null,
          fecha: form.fecha,
          precio_final: parseFloat(form.precio_final),
          estado: form.estado,
          notas: form.notas || null,
          factura_id: factura.id,
        });

      if (aError) throw aError;

      return { paciente, factura, pacienteNombre };
    },

    onSuccess: ({ paciente, factura, pacienteNombre }) => {
      const consultorio = config?.nombre_consultorio ?? "Consultorio Odontológico";
      const telConsult  = config?.telefono ?? "";
      const comprobante = `B ${factura.numero_comprobante ?? ""}`.trim();
      const monto       = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(factura.monto));

      const asunto = `Comprobante de atención — ${consultorio}`;
      const cuerpo = `Estimado/a ${pacienteNombre}:

Le hacemos llegar el comprobante de su atención en ${consultorio}.

──────────────────────────────
DETALLE
──────────────────────────────
Tratamiento : ${form.tratamiento_nombre}
Fecha       : ${form.fecha}
Total       : ${monto} ARS
──────────────────────────────
${form.notas ? `\nObservaciones: ${form.notas}\n` : ""}
Ante cualquier consulta no dude en comunicarse${telConsult ? ` al ${telConsult}` : ""}.

Muchas gracias por elegirnos.
${consultorio}`;

      const mensajeWsp = `Hola ${paciente?.nombre ?? pacienteNombre} 👋

Le enviamos desde *${consultorio}* el resumen de su atención:

🦷 *${form.tratamiento_nombre}*
📅 Fecha: ${form.fecha}
💰 *Total: ${monto} ARS*
${form.notas ? `\n📌 ${form.notas}` : ""}
Ante cualquier consulta estamos a disposición${telConsult ? ` — ${telConsult}` : ""}.
¡Gracias por elegirnos! 😊`;

      // Abrir Gmail automáticamente si tiene email
      if (paciente?.email) {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1` +
          `&to=${encodeURIComponent(paciente.email)}` +
          `&su=${encodeURIComponent(asunto)}` +
          `&body=${encodeURIComponent(cuerpo)}`;
        window.open(gmailUrl, "_blank");
      }

      toast.success("Tratamiento asignado y factura generada", {
        description: paciente?.email ? "Se abrió Gmail con el comprobante." : "El paciente no tiene email registrado.",
        duration: 8000,
        action: paciente?.telefono ? {
          label: "Enviar por WhatsApp",
          onClick: () => {
            const numero = paciente.telefono!.replace(/\D/g, "");
            window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensajeWsp)}`, "_blank");
          },
        } : undefined,
      });

      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar tratamiento a paciente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">

          <div className="space-y-2">
            <Label>Paciente *</Label>
            <PacienteCombobox
              pacienteId={form.paciente_id}
              pacienteNombre={form.paciente_nombre}
              onSelect={(id, nombre) => setForm(f => ({ ...f, paciente_id: id, paciente_nombre: nombre }))}
              onClear={() => setForm(f => ({ ...f, paciente_id: "", paciente_nombre: "" }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tratamiento *</Label>
            <Select value={form.tratamiento_id} onValueChange={onTratamientoSelect}>
              <SelectTrigger><SelectValue placeholder="Seleccioná un tratamiento" /></SelectTrigger>
              <SelectContent>
                {tratamientos.filter(t => t.activo).map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre} — {fmtARS(t.precio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Precio final (ARS) *</Label>
              <Input type="number" min="0" step="0.01" value={form.precio_final}
                onChange={e => setForm(f => ({ ...f, precio_final: e.target.value }))}
                placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Profesional</Label>
              <Select value={form.profesional_id} onValueChange={v => setForm(f => ({ ...f, profesional_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {profesionales.map((p: { id: string; nombre: string }) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>

          <div className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Se abrirá Gmail automáticamente si el paciente tiene email.</p>
            <p className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Botón WhatsApp disponible en la notificación si tiene teléfono.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => guardar.mutate()} disabled={guardar.isPending || !form.paciente_id || !form.tratamiento_id || !form.precio_final}>
            {guardar.isPending ? "Generando..." : "Generar tratamiento y factura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Combobox paciente ────────────────────────────────────────────────────────

function PacienteCombobox({ pacienteId, pacienteNombre, onSelect, onClear }: {
  pacienteId: string; pacienteNombre: string;
  onSelect: (id: string, nombre: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: resultados = [] } = useQuery({
    queryKey: ["pacientes-search", busqueda],
    enabled: busqueda.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("pacientes")
        .select("id, nombre, apellido")
        .or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%`)
        .order("apellido")
        .limit(15);
      return data ?? [];
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{pacienteId && pacienteNombre ? pacienteNombre : "Buscar paciente..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nombre o apellido (mín. 2 letras)..." value={busqueda} onValueChange={setBusqueda} />
          <CommandList>
            {busqueda.length < 2 ? (
              <CommandEmpty>Escribí al menos 2 caracteres</CommandEmpty>
            ) : resultados.length === 0 ? (
              <CommandEmpty>Sin resultados</CommandEmpty>
            ) : (
              <CommandGroup>
                {pacienteId && (
                  <CommandItem value="__clear__" onSelect={() => { onClear(); setBusqueda(""); setOpen(false); }}>
                    <span className="text-muted-foreground text-sm">✕ Limpiar selección</span>
                  </CommandItem>
                )}
                {resultados.map((p: { id: string; nombre: string; apellido: string }) => (
                  <CommandItem key={p.id} value={p.id}
                    onSelect={() => { onSelect(p.id, `${p.apellido}, ${p.nombre}`); setBusqueda(""); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", pacienteId === p.id ? "opacity-100" : "opacity-0")} />
                    {p.apellido}, {p.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
