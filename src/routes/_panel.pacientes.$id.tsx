import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, MessageCircle } from "lucide-react";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { waLink } from "@/lib/config";

export const Route = createFileRoute("/_panel/pacientes/$id")({
  component: PacienteDetalle,
});

function PacienteDetalle() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [openHC, setOpenHC] = useState(false);
  const [hcForm, setHcForm] = useState({ pieza_dental: "", diagnostico: "", tratamiento_realizado: "", observaciones: "" });

  const { data: paciente } = useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const { data } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
      if (data) setEditForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.toString() ?? ""])));
      return data;
    },
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ["paciente-turnos", id],
    queryFn: async () => {
      const { data } = await supabase.from("turnos").select("*").eq("paciente_id", id).order("fecha_hora_inicio", { ascending: false });
      return data ?? [];
    },
  });

  const { data: historia = [] } = useQuery({
    queryKey: ["paciente-historia", id],
    queryFn: async () => {
      const { data } = await supabase.from("historia_clinica").select("*, profiles(nombre)").eq("paciente_id", id).order("fecha", { ascending: false });
      return data ?? [];
    },
  });

  const updatePaciente = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | null> = Object.fromEntries(
        Object.entries(editForm).filter(([k]) => k !== "id" && k !== "created_at" && k !== "updated_at")
          .map(([k, v]) => [k, v === "" ? null : v])
      );
      const { error } = await supabase.from("pacientes").update(payload as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Datos actualizados"); qc.invalidateQueries({ queryKey: ["paciente", id] }); setEditing(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addHC = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("historia_clinica").insert({
        paciente_id: id,
        pieza_dental: hcForm.pieza_dental || null,
        diagnostico: hcForm.diagnostico || null,
        tratamiento_realizado: hcForm.tratamiento_realizado || null,
        observaciones: hcForm.observaciones || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada agregada");
      qc.invalidateQueries({ queryKey: ["paciente-historia", id] });
      setOpenHC(false);
      setHcForm({ pieza_dental: "", diagnostico: "", tratamiento_realizado: "", observaciones: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!paciente) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/pacientes"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold">{paciente.apellido}, {paciente.nombre}</h1>
            <p className="text-sm text-muted-foreground">DNI {paciente.dni ?? "—"} · {paciente.obra_social ?? "Sin obra social"}</p>
          </div>
        </div>
        {paciente.telefono && (
          <Button asChild className="bg-[#25D366] text-white hover:bg-[#25D366]/90">
            <a href={waLink(`Hola ${paciente.nombre}`).replace("5491100000000", paciente.telefono.replace(/\D/g, ""))} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="historia">Historia clínica</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card><CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              {editing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button onClick={() => updatePaciente.mutate()}>Guardar</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["nombre", "Nombre"], ["apellido", "Apellido"], ["dni", "DNI"], ["fecha_nacimiento", "Fecha nacimiento"],
                ["telefono", "Teléfono"], ["email", "Email"], ["obra_social", "Obra social"], ["numero_afiliado", "N° afiliado"],
              ].map(([k, l]) => (
                <div key={k} className="space-y-2">
                  <Label>{l}</Label>
                  <Input
                    type={k === "fecha_nacimiento" ? "date" : "text"}
                    value={editForm[k] ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                    disabled={!editing}
                  />
                </div>
              ))}
              {["alergias", "medicacion_actual", "observaciones"].map((k) => (
                <div key={k} className="space-y-2 sm:col-span-2">
                  <Label className="capitalize">{k.replace("_", " ")}</Label>
                  <Textarea value={editForm[k] ?? ""} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })} disabled={!editing} />
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historia">
          <div className="mb-4 flex justify-end">
            <Dialog open={openHC} onOpenChange={setOpenHC}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nueva entrada</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva entrada de historia clínica</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); addHC.mutate(); }} className="space-y-3">
                  <div className="space-y-2"><Label>Pieza dental</Label><Input value={hcForm.pieza_dental} onChange={(e) => setHcForm({ ...hcForm, pieza_dental: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Diagnóstico</Label><Textarea value={hcForm.diagnostico} onChange={(e) => setHcForm({ ...hcForm, diagnostico: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Tratamiento realizado</Label><Textarea value={hcForm.tratamiento_realizado} onChange={(e) => setHcForm({ ...hcForm, tratamiento_realizado: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Observaciones</Label><Textarea value={hcForm.observaciones} onChange={(e) => setHcForm({ ...hcForm, observaciones: e.target.value })} /></div>
                  <DialogFooter><Button type="submit" disabled={addHC.isPending}>Guardar</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {historia.length === 0 ? <p className="text-sm text-muted-foreground">Sin entradas</p> : historia.map((h) => {
              const prof = (h.profiles as { nombre: string } | { nombre: string }[] | null);
              const profName = prof ? (Array.isArray(prof) ? prof[0]?.nombre : prof.nombre) : null;
              return (
                <Card key={h.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{fmtDate(h.fecha)}</p>
                      {profName && <p className="text-xs text-muted-foreground">{profName}</p>}
                    </div>
                    {h.pieza_dental && <p className="mt-2 text-sm"><strong>Pieza:</strong> {h.pieza_dental}</p>}
                    {h.diagnostico && <p className="text-sm"><strong>Diagnóstico:</strong> {h.diagnostico}</p>}
                    {h.tratamiento_realizado && <p className="text-sm"><strong>Tratamiento:</strong> {h.tratamiento_realizado}</p>}
                    {h.observaciones && <p className="text-sm text-muted-foreground">{h.observaciones}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="turnos">
          <div className="space-y-2">
            {turnos.length === 0 ? <p className="text-sm text-muted-foreground">Sin turnos</p> : turnos.map((t) => (
              <Card key={t.id}><CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium">{fmtDateTime(t.fecha_hora_inicio)}</p>
                  <p className="text-sm text-muted-foreground">{t.tratamiento ?? "—"}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{t.estado}</Badge>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
