import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, MoreHorizontal, TrendingUp, TrendingDown, Wallet, Mail, MessageCircle, FileText, Check, ChevronsUpDown, CreditCard, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/administracion")({
  component: AdministracionPage,
});

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FacturaProveedor {
  id: string;
  proveedor: string;
  concepto: string | null;
  numero_comprobante: string | null;
  tipo_factura: string;
  fecha: string;
  fecha_vencimiento: string | null;
  importe_neto: number | null;
  impuesto: number | null;
  monto: number;
  moneda: string;
  estado: "pendiente" | "pagada" | "vencida";
  notas: string | null;
}

interface FacturaCliente {
  id: string;
  paciente_id: string | null;
  paciente_nombre: string;
  concepto: string | null;
  numero_comprobante: string | null;
  tipo_factura: string;
  fecha: string;
  fecha_vencimiento: string | null;
  monto: number;
  moneda: string;
  estado: "pendiente" | "cobrada" | "vencida";
  notas: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const hoy = () => new Date().toISOString().slice(0, 10);

const ESTADO_PROV: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  pagada:    { label: "Pagada",    variant: "default" },
  vencida:   { label: "Vencida",   variant: "destructive" },
};

const ESTADO_CLI: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  cobrada:   { label: "Cobrada",   variant: "default" },
  vencida:   { label: "Vencida",   variant: "destructive" },
};

const TIPOS = ["A", "B", "C", "X", "Ticket", "Recibo", "Otro"];

// ─── Formulario vacío ─────────────────────────────────────────────────────────

const emptyProv = {
  proveedor: "", concepto: "", numero_comprobante: "", tipo_factura: "B",
  fecha: hoy(), fecha_vencimiento: "", importe_neto: "", impuesto: "", monto: "", moneda: "ARS",
  estado: "pendiente", notas: "",
};

const emptyCli = {
  paciente_id: "", paciente_nombre: "", concepto: "", numero_comprobante: "", tipo_factura: "B",
  fecha: hoy(), fecha_vencimiento: "", monto: "", moneda: "ARS",
  estado: "pendiente", notas: "",
};

// ─── Página principal ─────────────────────────────────────────────────────────

function AdministracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración</h1>
        <p className="text-sm text-muted-foreground mt-1">Cuentas a pagar y cuentas a cobrar</p>
      </div>
      <ResumenCards />
      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">Cuentas a Pagar</TabsTrigger>
          <TabsTrigger value="cobrar">Cuentas a Cobrar</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar" className="mt-4">
          <CuentasAPagar />
        </TabsContent>
        <TabsContent value="cobrar" className="mt-4">
          <CuentasACobrar />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Cards resumen ────────────────────────────────────────────────────────────

function ResumenCards() {
  const { data: proveedor = [] } = useQuery<FacturaProveedor[]>({
    queryKey: ["facturas-proveedor"],
    queryFn: async () => {
      const { data } = await supabase.from("facturas_proveedor").select("monto,estado");
      return (data ?? []) as FacturaProveedor[];
    },
  });

  const { data: cliente = [] } = useQuery<FacturaCliente[]>({
    queryKey: ["facturas-cliente"],
    queryFn: async () => {
      const { data } = await supabase.from("facturas_cliente").select("monto,estado");
      return (data ?? []) as FacturaCliente[];
    },
  });

  const totalPagar   = proveedor.filter((f) => f.estado === "pendiente").reduce((s, f) => s + Number(f.monto), 0);
  const totalCobrar  = cliente.filter((f) => f.estado === "pendiente").reduce((s, f) => s + Number(f.monto), 0);
  const balance      = totalCobrar - totalPagar;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de cobrar</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">{fmt(totalCobrar)}</p>
          <p className="text-xs text-muted-foreground mt-1">{cliente.filter((f) => f.estado === "pendiente").length} facturas pendientes</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente de pagar</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">{fmt(totalPagar)}</p>
          <p className="text-xs text-muted-foreground mt-1">{proveedor.filter((f) => f.estado === "pendiente").length} facturas pendientes</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Balance neto</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(balance)}</p>
          <p className="text-xs text-muted-foreground mt-1">cobrar − pagar</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Cuentas a Pagar ──────────────────────────────────────────────────────────

function CuentasAPagar() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<FacturaProveedor | null>(null);
  const [form, setForm] = useState<typeof emptyProv>({ ...emptyProv });

  const { data: facturas = [], isLoading } = useQuery<FacturaProveedor[]>({
    queryKey: ["facturas-proveedor-detalle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas_proveedor")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as FacturaProveedor[];
    },
  });

  const filtradas = filtro === "todos" ? facturas : facturas.filter((f) => f.estado === filtro);

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        proveedor: form.proveedor,
        concepto: form.concepto || null,
        numero_comprobante: form.numero_comprobante || null,
        tipo_factura: form.tipo_factura,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || null,
        importe_neto: form.importe_neto !== "" ? parseFloat(form.importe_neto as string) : null,
        impuesto: form.impuesto !== "" ? parseFloat(form.impuesto as string) : null,
        monto: parseFloat(form.monto as string),
        moneda: form.moneda,
        estado: form.estado,
        notas: form.notas || null,
      };
      if (editando) {
        const { error } = await supabase.from("facturas_proveedor").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("facturas_proveedor").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Factura actualizada" : "Factura cargada");
      qc.invalidateQueries({ queryKey: ["facturas-proveedor"] });
      qc.invalidateQueries({ queryKey: ["facturas-proveedor-detalle"] });
      setDialogOpen(false);
      setEditando(null);
      setForm({ ...emptyProv, fecha: hoy() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facturas_proveedor").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Factura eliminada");
      qc.invalidateQueries({ queryKey: ["facturas-proveedor"] });
      qc.invalidateQueries({ queryKey: ["facturas-proveedor-detalle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("facturas_proveedor").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturas-proveedor"] });
      qc.invalidateQueries({ queryKey: ["facturas-proveedor-detalle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNueva() {
    setEditando(null);
    setForm({ ...emptyProv, fecha: hoy() });
    setDialogOpen(true);
  }

  function abrirEditar(f: FacturaProveedor) {
    setEditando(f);
    setForm({
      proveedor: f.proveedor,
      concepto: f.concepto ?? "",
      numero_comprobante: f.numero_comprobante ?? "",
      tipo_factura: f.tipo_factura,
      fecha: f.fecha,
      fecha_vencimiento: f.fecha_vencimiento ?? "",
      importe_neto: f.importe_neto != null ? f.importe_neto.toString() : "",
      impuesto: f.impuesto != null ? f.impuesto.toString() : "",
      monto: f.monto.toString(),
      moneda: f.moneda,
      estado: f.estado,
      notas: f.notas ?? "",
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["todos", "pendiente", "pagada", "vencida"].map((e) => (
            <Button key={e} variant={filtro === e ? "default" : "outline"} size="sm" onClick={() => setFiltro(e)}>
              {e === "todos" ? "Todas" : ESTADO_PROV[e]?.label ?? e}
            </Button>
          ))}
        </div>
        <Button onClick={abrirNueva}>
          <Plus className="mr-2 h-4 w-4" /> Cargar factura
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">Impuesto</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtradas.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Sin facturas</TableCell></TableRow>
            ) : filtradas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.proveedor}</TableCell>
                <TableCell className="text-muted-foreground">{f.concepto ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.tipo_factura} {f.numero_comprobante ?? "—"}</TableCell>
                <TableCell>{f.fecha}</TableCell>
                <TableCell className={!f.fecha_vencimiento ? "text-muted-foreground" : f.estado === "vencida" ? "text-destructive font-medium" : ""}>
                  {f.fecha_vencimiento ?? "—"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{f.importe_neto != null ? fmt(Number(f.importe_neto)) : "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{f.impuesto != null ? fmt(Number(f.impuesto)) : "—"}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(f.monto))}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_PROV[f.estado]?.variant ?? "outline"}>{ESTADO_PROV[f.estado]?.label ?? f.estado}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {f.estado !== "pagada" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "pagada" })}>
                          Marcar como pagada
                        </DropdownMenuItem>
                      )}
                      {f.estado !== "pendiente" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "pendiente" })}>
                          Marcar como pendiente
                        </DropdownMenuItem>
                      )}
                      {f.estado !== "vencida" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "vencida" })}>
                          Marcar como vencida
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => abrirEditar(f)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm("¿Eliminar factura?")) eliminar.mutate(f.id); }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar factura de proveedor" : "Cargar factura de proveedor"}</DialogTitle>
          </DialogHeader>
          <FormProveedor form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending || !form.proveedor || !form.monto}>
              {guardar.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Cargar factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cuentas a Cobrar ─────────────────────────────────────────────────────────

function CuentasACobrar() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enviando, setEnviando] = useState<FacturaCliente | null>(null);
  const [editando, setEditando] = useState<FacturaCliente | null>(null);
  const [form, setForm] = useState<typeof emptyCli>({ ...emptyCli });

  const { data: facturas = [], isLoading } = useQuery<FacturaCliente[]>({
    queryKey: ["facturas-cliente-detalle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facturas_cliente")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as FacturaCliente[];
    },
  });

  const filtradas = filtro === "todos" ? facturas : facturas.filter((f) => f.estado === filtro);

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        paciente_id: form.paciente_id || null,
        paciente_nombre: form.paciente_nombre,
        concepto: form.concepto || null,
        numero_comprobante: form.numero_comprobante || null,
        tipo_factura: form.tipo_factura,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || null,
        monto: parseFloat(form.monto as string),
        moneda: form.moneda,
        estado: form.estado,
        notas: form.notas || null,
      };
      if (editando) {
        const { error } = await supabase.from("facturas_cliente").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("facturas_cliente").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editando ? "Factura actualizada" : "Factura generada");
      qc.invalidateQueries({ queryKey: ["facturas-cliente"] });
      qc.invalidateQueries({ queryKey: ["facturas-cliente-detalle"] });
      setDialogOpen(false);
      setEditando(null);
      setForm({ ...emptyCli, fecha: hoy() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facturas_cliente").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Factura eliminada");
      qc.invalidateQueries({ queryKey: ["facturas-cliente"] });
      qc.invalidateQueries({ queryKey: ["facturas-cliente-detalle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("facturas_cliente").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturas-cliente"] });
      qc.invalidateQueries({ queryKey: ["facturas-cliente-detalle"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function abrirNueva() {
    setEditando(null);
    setForm({ ...emptyCli, fecha: hoy() });
    setDialogOpen(true);
  }

  function abrirEditar(f: FacturaCliente) {
    setEditando(f);
    setForm({
      paciente_id: f.paciente_id ?? "",
      paciente_nombre: f.paciente_nombre,
      concepto: f.concepto ?? "",
      numero_comprobante: f.numero_comprobante ?? "",
      tipo_factura: f.tipo_factura,
      fecha: f.fecha,
      fecha_vencimiento: f.fecha_vencimiento ?? "",
      monto: f.monto.toString(),
      moneda: f.moneda,
      estado: f.estado,
      notas: f.notas ?? "",
    });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["todos", "pendiente", "cobrada", "vencida"].map((e) => (
            <Button key={e} variant={filtro === e ? "default" : "outline"} size="sm" onClick={() => setFiltro(e)}>
              {e === "todos" ? "Todas" : ESTADO_CLI[e]?.label ?? e}
            </Button>
          ))}
        </div>
        <Button onClick={abrirNueva}>
          <Plus className="mr-2 h-4 w-4" /> Generar factura
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente / Paciente</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtradas.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin facturas</TableCell></TableRow>
            ) : filtradas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.paciente_nombre}</TableCell>
                <TableCell className="text-muted-foreground">{f.concepto ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.tipo_factura} {f.numero_comprobante ?? "—"}</TableCell>
                <TableCell>{f.fecha}</TableCell>
                <TableCell className={!f.fecha_vencimiento ? "text-muted-foreground" : f.estado === "vencida" ? "text-destructive font-medium" : ""}>
                  {f.fecha_vencimiento ?? "—"}
                </TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(f.monto))}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_CLI[f.estado]?.variant ?? "outline"}>{ESTADO_CLI[f.estado]?.label ?? f.estado}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Enviar por email / WhatsApp" onClick={() => setEnviando(f)}>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEnviando(f)}>
                        <Mail className="mr-2 h-3.5 w-3.5" /> Enviar factura
                      </DropdownMenuItem>
                      {f.estado !== "cobrada" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "cobrada" })}>
                          Marcar como cobrada
                        </DropdownMenuItem>
                      )}
                      {f.estado !== "pendiente" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "pendiente" })}>
                          Marcar como pendiente
                        </DropdownMenuItem>
                      )}
                      {f.estado !== "vencida" && (
                        <DropdownMenuItem onClick={() => cambiarEstado.mutate({ id: f.id, estado: "vencida" })}>
                          Marcar como vencida
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => abrirEditar(f)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm("¿Eliminar factura?")) eliminar.mutate(f.id); }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar factura" : "Generar factura a cliente"}</DialogTitle>
          </DialogHeader>
          <FormCliente form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending || !form.paciente_nombre || !form.monto}>
              {guardar.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Generar factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {enviando && (
        <EnviarFacturaDialog factura={enviando} onClose={() => setEnviando(null)} />
      )}
    </div>
  );
}

// ─── Dialog Enviar Factura ────────────────────────────────────────────────────

function EnviarFacturaDialog({ factura, onClose }: { factura: FacturaCliente; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mpUrl, setMpUrl] = useState<string | null>(null);
  const [mpLoading, setMpLoading] = useState(false);

  // Config del consultorio para el PDF
  const { data: config } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracion").select("*").maybeSingle();
      return data as Record<string, string> | null;
    },
  });

  // Si hay paciente_id, buscar sus datos de contacto
  useQuery({
    queryKey: ["paciente-contacto", factura.paciente_id],
    enabled: !!factura.paciente_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pacientes")
        .select("email, telefono")
        .eq("id", factura.paciente_id!)
        .maybeSingle();
      if (data?.email)    setEmail(data.email);
      if (data?.telefono) setTelefono(data.telefono);
      return data;
    },
  });

  const comprobante  = [factura.tipo_factura, factura.numero_comprobante].filter(Boolean).join(" ");
  const consultorio  = config?.nombre_consultorio ?? "Consultorio Odontológico";
  const telConsult   = config?.telefono ?? "";

  const asunto = `Comprobante ${comprobante || "de pago"} — ${consultorio}`;

  const cuerpo = `Estimado/a ${factura.paciente_nombre}:

Nos comunicamos desde ${consultorio} para hacerle llegar el comprobante correspondiente a su atención.

──────────────────────────────
DETALLE DE FACTURA
──────────────────────────────
Comprobante : ${comprobante || "—"}
Concepto    : ${factura.concepto ?? "Servicios odontológicos"}
Fecha       : ${factura.fecha}${factura.fecha_vencimiento ? `\nVencimiento : ${factura.fecha_vencimiento}` : ""}
Total       : ${fmt(Number(factura.monto))} ${factura.moneda}
Estado      : ${factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
──────────────────────────────
${factura.notas ? `\nObservaciones: ${factura.notas}\n` : ""}
Ante cualquier consulta no dude en comunicarse${telConsult ? ` al ${telConsult}` : ""}.

Muchas gracias por elegirnos.
${consultorio}`;

  const mensajeWsp = `Hola ${factura.paciente_nombre} 👋

Le enviamos desde *${consultorio}* el detalle de su comprobante:

📄 *${comprobante || "Comprobante"}*
📝 ${factura.concepto ?? "Servicios odontológicos"}
📅 Fecha: ${factura.fecha}${factura.fecha_vencimiento ? `\n⏰ Vence: ${factura.fecha_vencimiento}` : ""}
💰 *Total: ${fmt(Number(factura.monto))} ${factura.moneda}*
${factura.notas ? `\n📌 ${factura.notas}` : ""}
Ante cualquier consulta estamos a disposición${telConsult ? ` — ${telConsult}` : ""}.
¡Gracias por confiar en nosotros! 🦷`;

  async function generarLinkMP() {
    setMpLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/pagos/crear-link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ factura_id: factura.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al generar link");
      setMpUrl(json.url);
      if (json.sandbox) toast.info("Modo sandbox activo — usá credenciales de prueba de MP");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al generar link de MP");
    } finally {
      setMpLoading(false);
    }
  }

  function copiarLink() {
    if (!mpUrl) return;
    navigator.clipboard.writeText(mpUrl);
    toast.success("Link copiado al portapapeles");
  }

  // Cuerpo del email con link MP si está disponible
  const cuerpoEmail = cuerpo + (mpUrl ? `\n\n──────────────────────────────\nPAGO EN LÍNEA\n──────────────────────────────\nPodés abonar de forma segura a través de Mercado Pago:\n${mpUrl}\n` : "");
  const mensajeWspFinal = mensajeWsp + (mpUrl ? `\n\n💳 *Pagá online con Mercado Pago:*\n${mpUrl}` : "");

  function abrirEmail() {
    if (!email) { toast.error("Ingresá un email"); return; }
    const url = `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(email)}` +
      `&su=${encodeURIComponent(asunto)}` +
      `&body=${encodeURIComponent(cuerpoEmail)}`;
    window.open(url, "_blank");
  }

  function abrirWhatsApp() {
    if (!telefono) { toast.error("Ingresá un teléfono"); return; }
    const numero = telefono.replace(/\D/g, "");
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeWspFinal)}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Enviar factura — {factura.paciente_nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-md bg-muted px-4 py-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Comprobante:</span> {comprobante || "—"}</p>
            <p><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{fmt(Number(factura.monto))} {factura.moneda}</span></p>
          </div>

          <div className="space-y-2">
            <Label>Email del cliente</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="cliente@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button variant="outline" onClick={abrirEmail} title="Abrir cliente de correo">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp (con código de país)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="+5491112345678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
              <Button variant="outline" onClick={abrirWhatsApp} title="Abrir WhatsApp">
                <MessageCircle className="h-4 w-4 text-green-600" />
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Link de pago — Mercado Pago</p>
            {!mpUrl ? (
              <Button
                variant="outline"
                className="w-full border-[#009ee3] text-[#009ee3] hover:bg-[#009ee3]/10"
                onClick={generarLinkMP}
                disabled={mpLoading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {mpLoading ? "Generando..." : "Generar link de pago"}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                  <span className="flex-1 truncate text-xs text-muted-foreground">{mpUrl}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copiarLink} title="Copiar link">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(mpUrl, "_blank")} title="Abrir en MP">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El link se incluye automáticamente en el email y WhatsApp.
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Generar PDF</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => verFacturaPDF(factura, config ?? undefined)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Ver / Imprimir factura como PDF
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Se abre una vista previa. Usá "Guardar como PDF" desde el diálogo de impresión.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            El email y WhatsApp abren Gmail/WhatsApp Web con el mensaje prellenado.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formularios ──────────────────────────────────────────────────────────────

type SetForm<T> = React.Dispatch<React.SetStateAction<T>>;

function FormProveedor({ form, setForm }: { form: typeof emptyProv; setForm: SetForm<typeof emptyProv> }) {
  const f = (k: keyof typeof emptyProv) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Proveedor *" full>
          <Input value={form.proveedor} onChange={f("proveedor")} placeholder="Nombre del proveedor" />
        </FormField>
        <FormField label="Concepto">
          <Input value={form.concepto} onChange={f("concepto")} placeholder="Descripción" />
        </FormField>
        <FormField label="Tipo">
          <Select value={form.tipo_factura} onValueChange={(v) => setForm((p) => ({ ...p, tipo_factura: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="N° comprobante">
          <Input value={form.numero_comprobante} onChange={f("numero_comprobante")} placeholder="0001-00001234" />
        </FormField>
        <FormField label="Fecha *">
          <Input type="date" value={form.fecha} onChange={f("fecha")} />
        </FormField>
        <FormField label="Vencimiento">
          <Input type="date" value={form.fecha_vencimiento} onChange={f("fecha_vencimiento")} />
        </FormField>
        <FormField label="Importe Neto">
          <Input type="number" min="0" step="0.01" value={form.importe_neto} onChange={f("importe_neto")} placeholder="0.00" />
        </FormField>
        <FormField label="Impuesto">
          <Input type="number" min="0" step="0.01" value={form.impuesto} onChange={f("impuesto")} placeholder="0.00" />
        </FormField>
        <FormField label="Total *">
          <Input type="number" min="0" step="0.01" value={form.monto} onChange={f("monto")} placeholder="0.00" />
        </FormField>
        <FormField label="Estado">
          <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="pagada">Pagada</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Notas" full>
          <Textarea rows={2} value={form.notas} onChange={f("notas")} />
        </FormField>
      </div>
    </div>
  );
}

function FormCliente({ form, setForm }: { form: typeof emptyCli; setForm: SetForm<typeof emptyCli> }) {
  const f = (k: keyof typeof emptyCli) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cliente / Paciente *" full>
          <PacienteCombobox
            pacienteId={form.paciente_id}
            pacienteNombre={form.paciente_nombre}
            onSelect={(id, nombre) => setForm((p) => ({ ...p, paciente_id: id, paciente_nombre: nombre }))}
            onClear={() => setForm((p) => ({ ...p, paciente_id: "", paciente_nombre: "" }))}
          />
          {/* Permite editar el nombre manualmente o escribir uno libre */}
          <Input
            className="mt-1"
            value={form.paciente_nombre}
            onChange={(e) => setForm((p) => ({ ...p, paciente_nombre: e.target.value, paciente_id: "" }))}
            placeholder="O escribí el nombre manualmente"
          />
        </FormField>
        <FormField label="Concepto">
          <Input value={form.concepto} onChange={f("concepto")} placeholder="Descripción del servicio" />
        </FormField>
        <FormField label="Tipo">
          <Select value={form.tipo_factura} onValueChange={(v) => setForm((p) => ({ ...p, tipo_factura: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField label="N° comprobante">
          <Input value={form.numero_comprobante} onChange={f("numero_comprobante")} placeholder="0001-00001234" />
        </FormField>
        <FormField label="Fecha *">
          <Input type="date" value={form.fecha} onChange={f("fecha")} />
        </FormField>
        <FormField label="Vencimiento">
          <Input type="date" value={form.fecha_vencimiento} onChange={f("fecha_vencimiento")} />
        </FormField>
        <FormField label="Monto *">
          <Input type="number" min="0" step="0.01" value={form.monto} onChange={f("monto")} placeholder="0.00" />
        </FormField>
        <FormField label="Estado">
          <Select value={form.estado} onValueChange={(v) => setForm((p) => ({ ...p, estado: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="cobrada">Cobrada</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Notas" full>
          <Textarea rows={2} value={form.notas} onChange={f("notas")} />
        </FormField>
      </div>
    </div>
  );
}

// ─── Combobox búsqueda de paciente ───────────────────────────────────────────

function PacienteCombobox({ pacienteId, pacienteNombre, onSelect, onClear }: {
  pacienteId: string;
  pacienteNombre: string;
  onSelect: (id: string, nombre: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: resultados = [] } = useQuery({
    queryKey: ["pacientes-search", busqueda],
    enabled: busqueda.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("pacientes")
        .select("id, nombre, apellido")
        .or(`nombre.ilike.%${busqueda}%,apellido.ilike.%${busqueda}%`)
        .order("apellido")
        .limit(15);
      return data ?? [];
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate text-left">
            {pacienteId && pacienteNombre ? pacienteNombre : "Buscar paciente del sistema..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribí nombre o apellido..."
            value={busqueda}
            onValueChange={setBusqueda}
          />
          <CommandList>
            {busqueda.length < 2 ? (
              <CommandEmpty>Escribí al menos 2 caracteres para buscar</CommandEmpty>
            ) : resultados.length === 0 ? (
              <CommandEmpty>Sin resultados</CommandEmpty>
            ) : (
              <CommandGroup>
                {pacienteId && (
                  <CommandItem value="__clear__" onSelect={() => { onClear(); setBusqueda(""); setOpen(false); }}>
                    <span className="text-muted-foreground text-sm">✕ Limpiar selección</span>
                  </CommandItem>
                )}
                {resultados.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onSelect(p.id, `${p.apellido}, ${p.nombre}`);
                      setBusqueda("");
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", pacienteId === p.id ? "opacity-100" : "opacity-0")} />
                    {p.apellido}, {p.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Generador de PDF (ventana de impresión) ──────────────────────────────────

function verFacturaPDF(
  factura: FacturaCliente,
  config?: { nombre_consultorio?: string; direccion?: string; telefono?: string; email?: string }
) {
  const comprobante = [factura.tipo_factura, factura.numero_comprobante].filter(Boolean).join(" ");
  const consultorio = config?.nombre_consultorio || "Consultorio Odontológico";
  const subtitulo   = [config?.direccion, config?.telefono, config?.email].filter(Boolean).join(" · ");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${comprobante} — ${factura.paciente_nombre}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;padding:48px;max-width:740px;margin:0 auto;font-size:14px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #0F4C5C}
    .brand{color:#0F4C5C}
    .brand h1{font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .brand p{font-size:11px;color:#666;margin-top:4px}
    .factura-box{text-align:right}
    .factura-box h2{font-size:20px;font-weight:700;color:#0F4C5C}
    .factura-box p{font-size:12px;color:#666;margin-top:3px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
    .section h3{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:6px}
    .section p{font-size:14px;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead th{background:#f5f7f9;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666;border-bottom:2px solid #e5e7eb}
    thead th.r{text-align:right}
    tbody td{padding:12px 14px;border-bottom:1px solid #f0f0f0;color:#1a1a1a}
    tbody td.r{text-align:right}
    .totals{margin-left:auto;width:280px;margin-bottom:32px}
    .totals table{width:100%}
    .totals td{padding:5px 0;font-size:13px;color:#555}
    .totals td:last-child{text-align:right}
    .totals tr.total td{font-size:16px;font-weight:700;color:#0F4C5C;border-top:2px solid #0F4C5C;padding-top:10px;margin-top:2px}
    .nota{background:#f9fafb;border-left:3px solid #0F4C5C;padding:12px 16px;margin-bottom:32px;font-size:13px;color:#555;border-radius:0 6px 6px 0}
    .footer{border-top:1px solid #e5e7eb;padding-top:16px;text-align:center;font-size:11px;color:#aaa}
    @media print{body{padding:24px}@page{margin:1cm}}
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>🦷 ${consultorio}</h1>
      ${subtitulo ? `<p>${subtitulo}</p>` : ""}
    </div>
    <div class="factura-box">
      <h2>FACTURA ${comprobante || ""}</h2>
      <p>Fecha: ${factura.fecha}</p>
      ${factura.fecha_vencimiento ? `<p>Vencimiento: ${factura.fecha_vencimiento}</p>` : ""}
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <h3>Facturado a</h3>
      <p><strong>${factura.paciente_nombre}</strong></p>
    </div>
    <div class="section" style="text-align:right">
      <h3>Estado</h3>
      <p style="font-weight:600;color:${factura.estado === "cobrada" ? "#16a34a" : factura.estado === "vencida" ? "#dc2626" : "#d97706"}">
        ${factura.estado.charAt(0).toUpperCase() + factura.estado.slice(1)}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th class="r">Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${factura.concepto || "Servicios odontológicos"}</td>
        <td class="r">${fmt(Number(factura.monto))} ${factura.moneda}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr class="total">
        <td>TOTAL</td>
        <td>${fmt(Number(factura.monto))} ${factura.moneda}</td>
      </tr>
    </table>
  </div>

  ${factura.notas ? `<div class="nota">${factura.notas}</div>` : ""}

  <div class="footer">
    <p>Gracias por elegirnos · ${consultorio}</p>
  </div>

  <script>window.onload=()=>window.print()</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=820,height=960");
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error("El navegador bloqueó la ventana emergente. Permitila para generar el PDF.");
}

// ─── Formularios ──────────────────────────────────────────────────────────────

function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
