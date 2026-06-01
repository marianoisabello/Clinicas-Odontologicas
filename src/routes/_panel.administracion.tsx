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
import { Plus, Pencil, Trash2, MoreHorizontal, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_panel/administracion")({
  component: AdministracionPage,
});

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
  paciente_nombre: "", concepto: "", numero_comprobante: "", tipo_factura: "B",
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
    </div>
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
          <Input value={form.paciente_nombre} onChange={f("paciente_nombre")} placeholder="Nombre del cliente" />
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

function FormField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
