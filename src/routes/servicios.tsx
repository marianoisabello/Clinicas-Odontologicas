import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/DynamicIcon";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/config";

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios — Sonrisa Consultorio Odontológico" },
      { name: "description", content: "Conocé todos nuestros tratamientos odontológicos: limpieza, blanqueamiento, ortodoncia, implantes y más." },
      { property: "og:title", content: "Servicios — Sonrisa" },
      { property: "og:description", content: "Tratamientos odontológicos integrales para toda la familia." },
    ],
  }),
  component: ServiciosPage,
});

function ServiciosPage() {
  const { data: tratamientos = [], isLoading } = useQuery({
    queryKey: ["tratamientos-public"],
    queryFn: async () => {
      const { data } = await supabase.from("tratamientos").select("*").eq("activo", true).order("nombre");
      return data ?? [];
    },
  });

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/5 to-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h1 className="text-4xl font-bold md:text-5xl">Nuestros servicios</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Tratamientos odontológicos integrales con la mejor tecnología y atención personalizada
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Cargando...</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tratamientos.map((t) => (
                <Card key={t.id} className="transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DynamicIcon name={t.icono} className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{t.nombre}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t.descripcion}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-3 py-1">⏱ {t.duracion_minutos} min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">¿Listo para tu cita?</h2>
          <p className="mt-3 text-primary-foreground/80">Sacá tu turno en minutos por WhatsApp</p>
          <Button asChild size="lg" className="mt-6 bg-[#25D366] text-white hover:bg-[#25D366]/90">
            <a href={waLink()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              Sacar turno por WhatsApp
            </a>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
