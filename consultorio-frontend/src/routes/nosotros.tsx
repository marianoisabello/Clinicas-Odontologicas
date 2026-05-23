import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Award, Users } from "lucide-react";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros — Sonrisa Consultorio Odontológico" },
      { name: "description", content: "Conocé nuestro equipo de odontólogos y nuestra filosofía de atención." },
      { property: "og:title", content: "Nosotros — Sonrisa" },
      { property: "og:description", content: "Profesionales comprometidos con tu salud bucal." },
    ],
  }),
  component: NosotrosPage,
});

const valores = [
  { icon: Heart, t: "Trato humano", d: "Cada paciente es único. Te escuchamos y te acompañamos." },
  { icon: Award, t: "Excelencia clínica", d: "Formación continua y técnicas de vanguardia." },
  { icon: Users, t: "Equipo integral", d: "Trabajamos coordinadamente para tu mejor resultado." },
];

function NosotrosPage() {
  const { data: profesionales = [] } = useQuery({
    queryKey: ["profesionales-publicos"],
    queryFn: async () => {
      const { data } = await supabase.from("profesionales_publicos").select("*");
      return data ?? [];
    },
  });

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/5 to-secondary/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h1 className="text-4xl font-bold md:text-5xl">Sobre nosotros</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Más de 10 años cuidando sonrisas con dedicación y profesionalismo
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:px-6">
          <div>
            <h2 className="text-3xl font-bold">Quiénes somos</h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              <p>
                En Sonrisa creemos que cuidar tu sonrisa es cuidar tu calidad de vida. Somos un consultorio
                odontológico moderno en el corazón de Buenos Aires, con un equipo apasionado por la salud bucal.
              </p>
              <p>
                Combinamos tecnología de última generación con un trato cercano y personalizado. Cada paciente
                recibe un plan de tratamiento adaptado a sus necesidades, prioridades y ritmo.
              </p>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border bg-card shadow-lg">
            <img
              src="/images/consultorio-nosotros.jpg"
              alt="Equipo del consultorio"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-card py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold">Nuestro equipo</h2>
          {profesionales.length === 0 ? (
            <p className="text-center text-muted-foreground">Próximamente conocé a nuestro equipo</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {profesionales.map((p) => (
                <Card key={p.id}>
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-secondary">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                          {p.nombre?.[0] ?? "?"}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold">{p.nombre}</h3>
                    {p.especialidad && <p className="text-sm text-primary">{p.especialidad}</p>}
                    {p.bio && <p className="mt-3 text-sm text-muted-foreground">{p.bio}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold">Filosofía de atención</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {valores.map((v) => (
              <Card key={v.t}>
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{v.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
