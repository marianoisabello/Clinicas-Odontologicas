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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fmtARS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/tratamientos")({
  component: TratamientosPage,
});

const ICONOS = ["Stethoscope","Sparkles","Sun","Syringe","Scissors","Smile","Anchor","AlertCircle","Heart","Star","Activity"];

interface T { id: string; nombre: string; duracion_minutos: number; precio: number | null; descripcion: string | null; icono: string | null; activo: boolean; }

function TratamientosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState({ nombre: "", duracion_minutos: 30, precio: 0, descripcion: "", icono: "Sparkles", activo: true });

  const { data: tratamientos = [] } = useQuery({
    queryKey: ["tratamientos-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("tratamientos").select("*").order("nombre");
      return (data ?? []) as T[];
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

  const openEdit = (t: T) => {
    setEditing(t);
    setForm({ nombre: t.nombre, duracion_minutos: t.duracion_minutos, precio: t.precio ?? 0, descripcion: t.descripcion ?? "", icono: t.icono ?? "Sparkles", activo: t.activo });
    setOpen(true);
  };
  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", duracion_minutos: 30, precio: 0, descripcion: "", icono: "Sparkles", activo: true });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tratamientos</h1>
          <p className="text-sm text-muted-foreground">Los tratamientos activos se muestran en la web pública.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
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
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, icono: i })}
                    className={`flex aspect-square items-center justify-center rounded border ${form.icono === i ? "border-primary bg-primary/10" : ""}`}
                  >
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
    </div>
  );
}
