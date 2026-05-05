import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/configuracion")({
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracion").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) setConfig(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.toString() ?? ""])));
  }, [data]);

  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = { ...config }; delete payload.id; delete payload.updated_at;
      const { error } = await supabase.from("configuracion").update(payload as never).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configuración guardada"); qc.invalidateQueries({ queryKey: ["configuracion"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("nombre");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Consultorio</TabsTrigger>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Card><CardContent className="pt-6 space-y-4">
            {[
              ["nombre_consultorio", "Nombre"], ["telefono", "Teléfono"], ["whatsapp", "WhatsApp (sin +)"],
              ["email", "Email"], ["direccion", "Dirección"], ["horario", "Horario"],
              ["instagram", "Instagram URL"], ["facebook", "Facebook URL"],
            ].map(([k, l]) => (
              <div key={k} className="space-y-2">
                <Label>{l}</Label>
                <Input value={config[k] ?? ""} onChange={(e) => setConfig({ ...config, [k]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Acerca de</Label>
              <Textarea value={config.about ?? ""} onChange={(e) => setConfig({ ...config, about: e.target.value })} rows={4} />
            </div>
            <div className="flex justify-end"><Button onClick={() => saveConfig.mutate()}>Guardar</Button></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="equipo">
          <div className="space-y-3">
            {profiles.map((p) => <ProfileCard key={p.id} profile={p} onUpdated={() => qc.invalidateQueries({ queryKey: ["profiles-all"] })} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileCard({ profile, onUpdated }: { profile: Record<string, unknown>; onUpdated: () => void }) {
  const [form, setForm] = useState({
    nombre: (profile.nombre as string) ?? "",
    rol: (profile.rol as string) ?? "odontologo",
    especialidad: (profile.especialidad as string) ?? "",
    bio: (profile.bio as string) ?? "",
    foto_url: (profile.foto_url as string) ?? "",
    color_calendario: (profile.color_calendario as string) ?? "#0F4C5C",
    activo: (profile.activo as boolean) ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", profile.id as string);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil actualizado"); onUpdated(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card><CardContent className="pt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="odontologo">Odontólogo/a</SelectItem>
              <SelectItem value="asistente">Asistente</SelectItem>
              <SelectItem value="recepcion">Recepción</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Especialidad</Label><Input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} /></div>
        <div className="space-y-2"><Label>Color en calendario</Label><Input type="color" value={form.color_calendario} onChange={(e) => setForm({ ...form, color_calendario: e.target.value })} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Foto URL</Label><Input value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Bio (visible en /nosotros)</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <div className="flex items-center justify-between sm:col-span-2">
          <Label>Activo</Label>
          <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={() => save.mutate()}>Guardar</Button></div>
    </CardContent></Card>
  );
}
