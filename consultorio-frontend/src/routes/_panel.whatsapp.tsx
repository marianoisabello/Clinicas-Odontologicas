import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, AlertTriangle } from "lucide-react";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/whatsapp")({
  component: WhatsAppPage,
});

interface Conv {
  id: string; telefono: string; ultimo_mensaje: string | null;
  ultima_actividad: string; estado: string; paciente_id: string | null;
  pacientes?: { nombre: string; apellido: string } | { nombre: string; apellido: string }[] | null;
}
interface Msg { id: string; direccion: string; contenido: string; timestamp: string; procesado_por_ia: boolean; }

function WhatsAppPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: convos = [] } = useQuery({
    queryKey: ["wapp-convos"],
    queryFn: async () => {
      const { data } = await supabase.from("conversaciones_whatsapp")
        .select("*, pacientes(nombre, apellido)").order("ultima_actividad", { ascending: false });
      return (data ?? []) as Conv[];
    },
  });

  const { data: msgs = [] } = useQuery({
    queryKey: ["wapp-msgs", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase.from("mensajes_whatsapp").select("*").eq("conversacion_id", selected!).order("timestamp");
      return (data ?? []) as Msg[];
    },
  });

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("wapp-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mensajes_whatsapp" }, () => {
        qc.invalidateQueries({ queryKey: ["wapp-msgs"] });
        qc.invalidateQueries({ queryKey: ["wapp-convos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversaciones_whatsapp" }, () => {
        qc.invalidateQueries({ queryKey: ["wapp-convos"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const send = useMutation({
    mutationFn: async () => {
      if (!selected || !reply.trim()) return;
      const { error: e1 } = await supabase.from("mensajes_whatsapp").insert({
        conversacion_id: selected, direccion: "saliente", contenido: reply, procesado_por_ia: false,
      });
      if (e1) throw e1;
      await supabase.from("conversaciones_whatsapp").update({
        ultimo_mensaje: reply, ultima_actividad: new Date().toISOString(), estado: "esperando_humano",
      }).eq("id", selected);
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["wapp-msgs", selected] });
      qc.invalidateQueries({ queryKey: ["wapp-convos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sel = convos.find((c) => c.id === selected);
  const getOne = <T,>(v: T | T[] | null | undefined): T | null => !v ? null : Array.isArray(v) ? v[0] ?? null : v;

  return (
    <div className="grid h-[calc(100vh-10rem)] grid-cols-[300px_1fr] gap-4">
      <Card className="overflow-y-auto">
        <div className="sticky top-0 border-b bg-card p-3">
          <h2 className="font-semibold">Conversaciones</h2>
        </div>
        <div className="divide-y">
          {convos.map((c) => {
            const p = getOne(c.pacientes);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn("w-full p-3 text-left hover:bg-muted/50", selected === c.id && "bg-muted")}
              >
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium">{p ? `${p.apellido}, ${p.nombre}` : c.telefono}</p>
                  {c.estado === "esperando_humano" && <Badge className="bg-[#F4A261]">!</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.ultimo_mensaje}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{fmtTime(c.ultima_actividad)}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden">
        {!sel ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Seleccioná una conversación</div>
        ) : (
          <>
            <div className="border-b bg-card p-4">
              <p className="font-semibold">{getOne(sel.pacientes) ? `${getOne(sel.pacientes)!.apellido}, ${getOne(sel.pacientes)!.nombre}` : sel.telefono}</p>
              <p className="text-xs text-muted-foreground">{sel.telefono}</p>
            </div>
            {sel.estado === "esperando_humano" && (
              <div className="flex items-center gap-2 border-b bg-[#F4A261]/10 p-3 text-sm text-[#9a5e1a]">
                <AlertTriangle className="h-4 w-4" />
                Esta conversación está esperando una respuesta humana.
              </div>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
              {msgs.map((m) => (
                <div key={m.id} className={cn("flex", m.direccion === "saliente" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[70%] rounded-lg px-3 py-2 text-sm",
                    m.direccion === "saliente" ? "bg-primary text-primary-foreground" : "bg-card")}>
                    {m.procesado_por_ia && (
                      <Badge variant="secondary" className="mb-1 gap-1 text-[10px]"><Bot className="h-3 w-3" /> IA</Badge>
                    )}
                    <p>{m.contenido}</p>
                    <p className="mt-1 text-[10px] opacity-70">{fmtTime(m.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send.mutate(); }} className="flex gap-2 border-t bg-card p-3">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribir mensaje..." />
              <Button type="submit" disabled={!reply.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
