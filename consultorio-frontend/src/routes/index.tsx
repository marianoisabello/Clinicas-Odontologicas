import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/DynamicIcon";
import { waLink, OBRAS_SOCIALES } from "@/lib/config";
import {
  ArrowRight, MessageCircle, Stethoscope, Clock, CreditCard, ShieldCheck,
  Star, Sparkles, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sonrisa — Consultorio Odontológico en CABA" },
      { name: "description", content: "Atención odontológica profesional en Buenos Aires. Sacá tu turno por WhatsApp en minutos." },
      { property: "og:title", content: "Sonrisa — Consultorio Odontológico" },
      { property: "og:description", content: "Tu sonrisa, en las mejores manos. Turnos rápidos por WhatsApp." },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: Stethoscope, title: "Profesionales matriculados", desc: "Equipo con amplia experiencia y formación continua." },
  { icon: Clock, title: "Turnos rápidos por WhatsApp", desc: "Sin llamadas ni esperas. Reservá en minutos." },
  { icon: CreditCard, title: "Principales obras sociales", desc: "Trabajamos con la mayoría de las prepagas." },
  { icon: ShieldCheck, title: "Equipamiento moderno", desc: "Tecnología de última generación y máxima higiene." },
];

const testimonios = [
  { nombre: "María G.", texto: "Excelente atención, super profesionales. Ya soy paciente hace 3 años." },
  { nombre: "Juan P.", texto: "Sacar turno por WhatsApp es comodísimo. Te responden al toque." },
  { nombre: "Sofía M.", texto: "Me hicieron blanqueamiento y quedé encantada con el resultado." },
];

function HomePage() {
  const { data: tratamientos = [] } = useQuery({
    queryKey: ["tratamientos-public-preview"],
    queryFn: async () => {
      const { data } = await supabase.from("tratamientos").select("*").eq("activo", true).limit(6);
      return data ?? [];
    },
  });

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/40">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Atención odontológica integral
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Tu sonrisa,<br />
              <span className="text-primary">en las mejores manos</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Consultorio odontológico en CABA. Atención profesional, tecnología moderna y trato humano.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#25D366] text-white hover:bg-[#25D366]/90">
                <a href={waLink()} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Sacar turno por WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/servicios">
                  Ver servicios <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border bg-card shadow-xl">
              <img
                src="https://placehold.co/600x450/0F4C5C/ffffff?text=Consultorio+Sonrisa"
                alt="Consultorio odontológico moderno"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">¿Por qué elegirnos?</h2>
            <p className="mt-2 text-muted-foreground">Lo que nos diferencia</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="border-0 bg-background">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Nuestros servicios</h2>
              <p className="mt-2 text-muted-foreground">Tratamientos para toda la familia</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/servicios">Ver todos <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tratamientos.map((t) => (
              <Card key={t.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <DynamicIcon name={t.icono} className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{t.nombre}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.descripcion}</p>
                  <p className="mt-3 text-xs text-muted-foreground">⏱ {t.duracion_minutos} min</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO SACAR TURNO */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Cómo sacar tu turno</h2>
            <p className="mt-2 text-primary-foreground/70">En 3 pasos simples</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Escribinos por WhatsApp", d: "Hacé clic en el botón y abrí el chat" },
              { n: "2", t: "Conversá con nuestro asistente", d: "Te ayuda a elegir horario y tratamiento" },
              { n: "3", t: "Confirmá tu turno", d: "Recibís confirmación y recordatorio el día previo" },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-primary-foreground/5 p-6 backdrop-blur-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground text-primary font-bold">
                  {s.n}
                </div>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-primary-foreground/80">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" className="bg-[#25D366] text-white hover:bg-[#25D366]/90">
              <a href={waLink()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Empezar ahora
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* OBRAS SOCIALES */}
      <section className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Obras sociales</h2>
            <p className="mt-2 text-muted-foreground">Consultanos por tu obra social, trabajamos con la mayoría</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {OBRAS_SOCIALES.map((o) => (
              <div key={o} className="flex items-center justify-center gap-2 rounded-lg border bg-background p-4 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-[#06A77D]" />
                {o}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Lo que dicen nuestros pacientes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonios.map((t) => (
              <Card key={t.nombre}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex gap-0.5 text-[#F4A261]">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-sm italic">"{t.texto}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary" />
                    <p className="text-sm font-medium">{t.nombre}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
