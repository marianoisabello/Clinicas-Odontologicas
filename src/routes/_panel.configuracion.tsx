import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  validateSearch: (search: Record<string, unknown>) => ({
    google: (search.google as string) ?? undefined,
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [config, setConfig] = useState<Record<string, string>>({});
  const { google: googleParam } = useSearch({ from: "/_panel/configuracion" });

  // Mostrar toast según el resultado del flujo OAuth de Google
  useEffect(() => {
    if (googleParam === "conectado") {
      toast.success("Google Calendar conectado correctamente");
      qc.invalidateQueries({ queryKey: ["google-cal-creds"] });
    } else if (googleParam === "error") {
      toast.error("No se pudo conectar Google Calendar. Intentá de nuevo.");
    }
  }, [googleParam, qc]);

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
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
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

        <TabsContent value="integraciones">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conectá tu Google Calendar para sincronizar turnos automáticamente.
              Los eventos del calendario también bloquean la disponibilidad para el agente de WhatsApp.
            </p>
            {profiles.filter((p) => p.id === user?.id).map((p) => (
              <GoogleCalendarCard key={p.id as string} profile={p} />
            ))}
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

function GoogleCalendarCard({ profile }: { profile: Record<string, unknown> }) {
  const qc = useQueryClient();
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
  const profesionalId = profile.id as string;

  // Consultar si el profesional tiene Google Calendar conectado
  const { data: gcCreds, isLoading } = useQuery({
    queryKey: ["google-cal-creds", profesionalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("google_calendar_credentials")
        .select("google_email, connected_at")
        .eq("profesional_id", profesionalId)
        .maybeSingle();
      return data;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${backendUrl}/auth/google/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profesional_id: profesionalId }),
      });
      if (!res.ok) throw new Error("Error al desconectar");
    },
    onSuccess: () => {
      toast.success("Google Calendar desconectado");
      qc.invalidateQueries({ queryKey: ["google-cal-creds", profesionalId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleConnect = () => {
    window.open(`${backendUrl}/api/auth-google?profesional_id=${profesionalId}`, "_blank");
    // Refresh optimista: si el usuario completa el flujo OAuth rápido, actualizamos el estado
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["google-cal-creds", profesionalId] });
    }, 5000);
  };

  const conectadoEn = gcCreds?.connected_at
    ? new Date(gcCreds.connected_at).toLocaleDateString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium">{profile.nombre as string}</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Verificando...</p>
            ) : gcCreds ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm text-muted-foreground">
                  Conectado como <span className="font-medium">{gcCreds.google_email}</span>
                  {conectadoEn && ` · desde ${conectadoEn}`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                <p className="text-sm text-muted-foreground">No conectado</p>
              </div>
            )}
          </div>

          <div>
            {gcCreds ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
