import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MessageCircle, RefreshCw } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/leads")({
  component: LeadsPage,
});

type Lead = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  fuente: string;
  canal: string | null;
  mensaje: string | null;
  interes: string | null;
  estado: string;
  paciente_id: string | null;
  created_at: string;
};

const ESTADOS = ["nuevo", "contactado", "agendado", "descartado", "paciente"] as const;

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

function LeadsPage() {
  const qc = useQueryClient();
  const { session } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const setEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ estado, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-list"] });
      toast.success("Estado actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertir = useMutation({
    mutationFn: async (id: string) => {
      const token = session?.access_token;
      if (!token) throw new Error("Sin sesión");
      const res = await fetch(`${backendUrl}/leads/${id}/convert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al convertir");
      return json;
    },
    onSuccess: (json) => {
      qc.invalidateQueries({ queryKey: ["leads-list"] });
      toast.success("Lead convertido a paciente");
      if (json.paciente?.id) {
        // soft hint — user can open pacientes
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reenviar = useMutation({
    mutationFn: async (id: string) => {
      const token = session?.access_token;
      if (!token) throw new Error("Sin sesión");
      const res = await fetch(`${backendUrl}/leads/${id}/reenviar-whatsapp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al reenviar");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-list"] });
      toast.success("WhatsApp reenviado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          Capturas de ManyChat, Google Form y web. Convertí a paciente cuando agenden un servicio.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay leads</p>
      ) : (
        <div className="grid gap-3">
          {leads.map((l) => (
            <Card key={l.id} className={l.estado === "nuevo" ? "border-primary/40" : ""}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{l.nombre || "Sin nombre"}</p>
                      <Badge variant="secondary">{l.fuente}</Badge>
                      {l.canal && <Badge variant="outline">{l.canal}</Badge>}
                      <Badge>{l.estado}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {l.telefono}
                      {l.email ? ` · ${l.email}` : ""} · {fmtDateTime(l.created_at)}
                    </p>
                    {(l.mensaje || l.interes) && (
                      <p className="text-sm pt-1">{l.mensaje || l.interes}</p>
                    )}
                    {l.paciente_id && (
                      <Button asChild variant="link" className="h-auto p-0 text-sm">
                        <Link to="/pacientes/$id" params={{ id: l.paciente_id }}>
                          Ver paciente
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={l.estado}
                      onValueChange={(estado) => setEstado.mutate({ id: l.id, estado })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {l.telefono && (
                      <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#25D366]/90">
                        <a
                          href={`https://wa.me/${l.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${l.nombre || ""}, te contactamos desde Sonrisa`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Chat
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reenviar.isPending}
                      onClick={() => reenviar.mutate(l.id)}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reenviar WA
                    </Button>

                    {l.estado !== "paciente" && (
                      <Button
                        size="sm"
                        disabled={convertir.isPending}
                        onClick={() => convertir.mutate(l.id)}
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" /> A paciente
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
