import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/pacientes")({
  component: PacientesPage,
});

interface Paciente {
  id: string; nombre: string; apellido: string; dni: string | null;
  telefono: string | null; email: string | null; obra_social: string | null;
  numero_afiliado: string | null; fecha_nacimiento: string | null;
  alergias: string | null; medicacion_actual: string | null; observaciones: string | null;
}

const empty = {
  nombre: "", apellido: "", dni: "", telefono: "", email: "", obra_social: "",
  numero_afiliado: "", fecha_nacimiento: "", alergias: "", medicacion_actual: "", observaciones: "",
};

function PacientesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const PAGE = 20;

  const { data: pacientes = [], isLoading } = useQuery({
    queryKey: ["pacientes-list", search, page],
    queryFn: async () => {
      let q = supabase.from("pacientes").select("*").order("apellido");
      if (search) q = q.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,dni.ilike.%${search}%`);
      q = q.range(page * PAGE, page * PAGE + PAGE - 1);
      const { data, error } = await q;
      if (error) throw error;
      return data as Paciente[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | null> = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
      );
      const { error } = await supabase.from("pacientes").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente creado");
      qc.invalidateQueries({ queryKey: ["pacientes-list"] });
      setOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gestión de pacientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nuevo paciente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo paciente</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre *"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Field>
              <Field label="Apellido *"><Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required /></Field>
              <Field label="DNI"><Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} /></Field>
              <Field label="Fecha nacimiento"><Input type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} /></Field>
              <Field label="Teléfono *"><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="+5491..." required /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Obra social"><Input value={form.obra_social} onChange={(e) => setForm({ ...form, obra_social: e.target.value })} /></Field>
              <Field label="N° afiliado"><Input value={form.numero_afiliado} onChange={(e) => setForm({ ...form, numero_afiliado: e.target.value })} /></Field>
              <Field label="Alergias" full><Textarea rows={2} value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} /></Field>
              <Field label="Medicación actual" full><Textarea rows={2} value={form.medicacion_actual} onChange={(e) => setForm({ ...form, medicacion_actual: e.target.value })} /></Field>
              <Field label="Observaciones" full><Textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={save.isPending}>Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellido y Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Obra social</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : pacientes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin pacientes</TableCell></TableRow>
              ) : pacientes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.apellido}, {p.nombre}</TableCell>
                  <TableCell>{p.dni ?? "—"}</TableCell>
                  <TableCell>{p.telefono ?? "—"}</TableCell>
                  <TableCell>{p.obra_social ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/pacientes/$id" params={{ id: p.id }}>
                        <Eye className="mr-1 h-4 w-4" /> Ver
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={pacientes.length < PAGE} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
