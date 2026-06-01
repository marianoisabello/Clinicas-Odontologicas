import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, UserX, UserCheck, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/profesionales")({
  component: ProfesionalesPage,
});

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const ROL_LABELS: Record<string, string> = {
  admin: "Admin",
  odontologo: "Odontólogo/a",
  asistente: "Asistente",
  recepcion: "Recepción",
};

type Profesional = {
  id: string;
  nombre: string;
  email: string | null;
  rol: string;
  especialidad: string | null;
  color_calendario: string | null;
  bio: string | null;
  foto_url: string | null;
  activo: boolean;
};

const FORM_VACIO = {
  nombre: "",
  email: "",
  password: "",
  rol: "odontologo",
  especialidad: "",
  color_calendario: "#0F4C5C",
};

function ProfesionalesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);
  const [form, setForm] = useState(FORM_VACIO);

  const { data: myProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("rol").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (!loadingProfile && myProfile && myProfile.rol !== "admin") {
    navigate({ to: "/dashboard" });
    return null;
  }

  const { data: profesionales = [], isLoading } = useQuery<Profesional[]>({
    queryKey: ["admin-profesionales"],
    enabled: myProfile?.rol === "admin",
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar profesionales");
      return res.json();
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear");
      return json;
    },
    onSuccess: () => {
      toast.success("Profesional creado correctamente");
      qc.invalidateQueries({ queryKey: ["admin-profesionales"] });
      setDialogOpen(false);
      setForm(FORM_VACIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizar = useMutation({
    mutationFn: async () => {
      if (!editando) return;
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales/${editando.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          rol: form.rol,
          especialidad: form.especialidad,
          color_calendario: form.color_calendario,
          activo: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar");
      return json;
    },
    onSuccess: () => {
      toast.success("Profesional actualizado");
      qc.invalidateQueries({ queryKey: ["admin-profesionales"] });
      setDialogOpen(false);
      setEditando(null);
      setForm(FORM_VACIO);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const desactivar = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al desactivar");
    },
    onSuccess: () => {
      toast.success("Profesional desactivado");
      qc.invalidateQueries({ queryKey: ["admin-profesionales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activar = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ activo: true }),
      });
      if (!res.ok) throw new Error("Error al activar");
    },
    onSuccess: () => {
      toast.success("Profesional activado");
      qc.invalidateQueries({ queryKey: ["admin-profesionales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invitar = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/admin/profesionales/${id}/invitar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al generar invitación");
      return json as { nombre: string; email: string; link: string };
    },
    onSuccess: ({ nombre, email, link }) => {
      const asunto = `Acceso al sistema de gestión — Consultorio Odontológico`;
      const cuerpo = `Hola ${nombre},

Te damos la bienvenida al sistema de gestión del Consultorio Odontológico.

Para acceder al sistema hacé clic en el siguiente enlace — te va a llevar directamente a la plataforma ya con tu sesión iniciada:

${link}

Una vez adentro vas a ver el menú principal con todas las secciones disponibles para tu rol.

──────────────────────────────
PRINCIPALES FUNCIONES DEL SISTEMA
──────────────────────────────
• Gestión de turnos y calendario: agendá y organizá citas de pacientes con vista diaria, semanal y mensual.
• Historial y tratamientos: accedé a la ficha de cada paciente, sus tratamientos realizados y la facturación asociada.
• Administración financiera: registrá cuentas a pagar, generá facturas a clientes y enviálas por email o WhatsApp con link de pago.

Si tenés alguna duda, respondé este correo o consultá con el administrador.

¡Bienvenido/a al equipo!
Consultorio Odontológico`;

      const url = `https://mail.google.com/mail/?view=cm&fs=1` +
        `&to=${encodeURIComponent(email)}` +
        `&su=${encodeURIComponent(asunto)}` +
        `&body=${encodeURIComponent(cuerpo)}`;
      window.open(url, "_blank");
      toast.success(`Invitación generada para ${nombre}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setDialogOpen(true);
  }

  function abrirEditar(p: Profesional) {
    setEditando(p);
    setForm({
      nombre: p.nombre ?? "",
      email: "",
      password: "",
      rol: p.rol ?? "odontologo",
      especialidad: p.especialidad ?? "",
      color_calendario: p.color_calendario ?? "#0F4C5C",
    });
    setDialogOpen(true);
  }

  const isPending = crear.isPending || actualizar.isPending;

  if (loadingProfile) {
    return <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profesionales</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestioná los usuarios del sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirCrear}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo profesional
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar profesional" : "Nuevo profesional"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>

              {!editando && (
                <>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña inicial *</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="odontologo">Odontólogo/a</SelectItem>
                    <SelectItem value="asistente">Asistente</SelectItem>
                    <SelectItem value="recepcion">Recepción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Color en calendario</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.color_calendario}
                    onChange={(e) => setForm({ ...form, color_calendario: e.target.value })}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <span className="text-sm text-muted-foreground">{form.color_calendario}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => editando ? actualizar.mutate() : crear.mutate()} disabled={isPending}>
                  {isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear profesional"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {profesionales.length} profesional{profesionales.length !== 1 ? "es" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">Cargando...</div>
          ) : profesionales.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              No hay profesionales registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profesionales.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.color_calendario && (
                          <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color_calendario }} />
                        )}
                        {p.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROL_LABELS[p.rol] ?? p.rol}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.especialidad ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? "default" : "secondary"}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enviar invitación por email"
                          onClick={() => invitar.mutate(p.id)}
                          disabled={invitar.isPending || !p.email}
                        >
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.activo ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => desactivar.mutate(p.id)}
                            disabled={desactivar.isPending}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => activar.mutate(p.id)}
                            disabled={activar.isPending}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
