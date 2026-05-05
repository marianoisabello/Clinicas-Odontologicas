import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/landing/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, MapPin, Phone, Mail, Clock, Zap } from "lucide-react";
import { CONSULTORIO, waLink } from "@/lib/config";
import { toast } from "sonner";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — Sonrisa Consultorio Odontológico" },
      { name: "description", content: "Contactanos por WhatsApp o dejanos tu consulta. Av. Corrientes 1234, CABA." },
      { property: "og:title", content: "Contacto — Sonrisa" },
      { property: "og:description", content: "Estamos para ayudarte. Sacá tu turno por WhatsApp." },
    ],
  }),
  component: ContactoPage,
});

const schema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(100),
  telefono: z.string().trim().min(8, "Teléfono inválido").max(30),
  mensaje: z.string().trim().min(5, "Mensaje muy corto").max(1000),
});

function ContactoPage() {
  const [form, setForm] = useState({ nombre: "", telefono: "", mensaje: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("consultas_web").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("No pudimos enviar tu consulta. Intentá por WhatsApp.");
    } else {
      toast.success("¡Consulta enviada! Te contactaremos pronto.");
      setForm({ nombre: "", telefono: "", mensaje: "" });
    }
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-primary/5 to-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
          <h1 className="text-4xl font-bold md:text-5xl">Contacto</h1>
          <p className="mt-4 text-muted-foreground">Estamos para ayudarte</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-2 md:px-6">
          {/* DATOS */}
          <div className="space-y-6">
            <Card className="border-[#25D366]/30 bg-[#25D366]/5">
              <CardContent className="pt-6">
                <p className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-[#25D366]" />
                  Para sacar turno, escribinos directamente por WhatsApp
                </p>
                <Button asChild size="lg" className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90">
                  <a href={waLink()} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Sacar turno por WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Dirección</p>
                  <p className="text-sm text-muted-foreground">{CONSULTORIO.direccion}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Teléfono</p>
                  <a href={`tel:${CONSULTORIO.telefono}`} className="text-sm text-muted-foreground hover:text-primary">
                    {CONSULTORIO.telefono}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href={`mailto:${CONSULTORIO.email}`} className="text-sm text-muted-foreground hover:text-primary">
                    {CONSULTORIO.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Horarios</p>
                  <p className="text-sm text-muted-foreground">{CONSULTORIO.horario}</p>
                </div>
              </div>
            </div>

            <div className="aspect-video overflow-hidden rounded-lg border">
              <iframe
                title="Mapa"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.0033596946!2d-58.38375892424!3d-34.60368017294!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bccac630121623%3A0x71ef8e7e2c53797b!2sObelisco!5e0!3m2!1ses!2sar!4v1700000000000"
                className="h-full w-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          {/* FORMULARIO */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold">Dejanos tu consulta</h2>
              <p className="mt-1 text-sm text-muted-foreground">Te respondemos a la brevedad</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={100} required />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} maxLength={30} placeholder="+54 9 11 ..." required />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje *</Label>
                  <Textarea value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} maxLength={1000} rows={5} required />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar consulta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
