import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserPlus, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth } from "date-fns";
import { fmtTime, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_panel/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const we = endOfWeek(today, { weekStartsOn: 1 });
      const ms = startOfMonth(today);
      const [hoy, semana, nuevos, wapp, consultas] = await Promise.all([
        supabase.from("turnos").select("*", { count: "exact", head: true })
          .gte("fecha_hora_inicio", startOfDay(today).toISOString())
          .lte("fecha_hora_inicio", endOfDay(today).toISOString()),
        supabase.from("turnos").select("*", { count: "exact", head: true })
          .gte("fecha_hora_inicio", ws.toISOString()).lte("fecha_hora_inicio", we.toISOString()),
        supabase.from("pacientes").select("*", { count: "exact", head: true }).gte("created_at", ms.toISOString()),
        supabase.from("conversaciones_whatsapp").select("*", { count: "exact", head: true }).eq("estado", "esperando_humano"),
        supabase.from("consultas_web").select("*", { count: "exact", head: true }).eq("leida", false),
      ]);
      return {
        hoy: hoy.count ?? 0, semana: semana.count ?? 0, nuevos: nuevos.count ?? 0,
        wapp: wapp.count ?? 0, consultas: consultas.count ?? 0,
      };
    },
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ["dashboard-turnos-hoy"],
    queryFn: async () => {
      const today = new Date();
      const { data } = await supabase
        .from("turnos")
        .select("id, fecha_hora_inicio, tratamiento, estado, pacientes(nombre, apellido)")
        .gte("fecha_hora_inicio", new Date().toISOString())
        .lte("fecha_hora_inicio", endOfDay(today).toISOString())
        .order("fecha_hora_inicio").limit(5);
      return data ?? [];
    },
  });

  const { data: convos = [] } = useQuery({
    queryKey: ["dashboard-convos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversaciones_whatsapp")
        .select("id, telefono, ultimo_mensaje, ultima_actividad, estado, pacientes(nombre, apellido)")
        .order("ultima_actividad", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const { data: consultas = [] } = useQuery({
    queryKey: ["dashboard-consultas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultas_web").select("*").eq("leida", false)
        .order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Turnos hoy", value: stats?.hoy, icon: Calendar, to: "/calendario" },
    { label: "Turnos esta semana", value: stats?.semana, icon: Calendar, to: "/calendario" },
    { label: "Pacientes nuevos del mes", value: stats?.nuevos, icon: UserPlus, to: "/pacientes" },
    { label: "WhatsApp pendientes", value: stats?.wapp, icon: MessageCircle, to: "/whatsapp" },
    { label: "Consultas sin leer", value: stats?.consultas, icon: Mail, to: "/consultas" },
  ] as const;

  const hora = new Date().getHours();
  const saludo = hora < 13 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  const getOne = <T,>(v: T | T[] | null | undefined): T | null =>
    !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{saludo}, {profile?.nombre ?? "Doctor/a"}</h1>
        <p className="text-muted-foreground">Resumen de actividad</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value ?? "—"}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximos turnos hoy</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/calendario">Ver todos <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent>
            {turnos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos próximos hoy</p>
            ) : (
              <div className="space-y-3">
                {turnos.map((t) => {
                  const p = getOne(t.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
                  return (
                    <div key={t.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{p ? `${p.apellido}, ${p.nombre}` : "—"}</p>
                        <p className="text-xs text-muted-foreground">{t.tratamiento}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmtTime(t.fecha_hora_inicio)} hs</p>
                        <Badge variant="secondary" className="mt-1 capitalize">{t.estado}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conversaciones recientes</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/whatsapp">Ver <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent>
            {convos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin conversaciones</p>
            ) : (
              <div className="space-y-3">
                {convos.map((c) => {
                  const p = getOne(c.pacientes as { nombre: string; apellido: string }[] | { nombre: string; apellido: string } | null);
                  return (
                    <div key={c.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p ? `${p.apellido}, ${p.nombre}` : c.telefono}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.ultimo_mensaje}</p>
                      </div>
                      {c.estado === "esperando_humano" && <Badge className="bg-[#F4A261]">⚠️</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Consultas desde la web</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/consultas">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </CardHeader>
          <CardContent>
            {consultas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas pendientes</p>
            ) : (
              <div className="space-y-3">
                {consultas.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">{c.telefono} · {fmtDate(c.created_at)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{c.mensaje}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
