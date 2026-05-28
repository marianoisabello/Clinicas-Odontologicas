import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MessageCircle } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/consultas")({
  component: ConsultasPage,
});

function ConsultasPage() {
  const qc = useQueryClient();

  const { data: consultas = [] } = useQuery({
    queryKey: ["consultas-list"],
    queryFn: async () => {
      const { data } = await supabase.from("consultas_web").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const marcar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("consultas_web").update({ leida: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["consultas-list"] }); toast.success("Marcada como leída"); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultas web</h1>
        <p className="text-muted-foreground">Mensajes desde el formulario público</p>
      </div>
      <div className="grid gap-3">
        {consultas.length === 0 ? <p className="text-sm text-muted-foreground">Sin consultas</p> : consultas.map((c) => (
          <Card key={c.id} className={c.leida ? "opacity-60" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.nombre}</p>
                    {!c.leida && <Badge>Nueva</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.telefono} · {fmtDateTime(c.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#25D366]/90">
                    <a
                      href={`https://wa.me/${c.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${c.nombre}, te contactamos desde Sonrisa`)}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-1 h-3.5 w-3.5" /> Responder
                    </a>
                  </Button>
                  {!c.leida && (
                    <Button size="sm" variant="outline" onClick={() => marcar.mutate(c.id)}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Leída
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm">{c.mensaje}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
