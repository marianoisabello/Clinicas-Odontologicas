/**
 * Sync Facturas → Supabase
 * ========================
 * Copia filas nuevas del Sheet de facturas a la tabla facturas_proveedor en Supabase.
 * Usa upsert por id_externo para evitar duplicados si se corre varias veces.
 *
 * SETUP:
 *   1. En Apps Script: Proyecto → Configuración → Variables de script
 *      Agregar:
 *        SUPABASE_URL  = https://dfnlcmuobvphevyshzqm.supabase.co
 *        SUPABASE_KEY  = <service_role key>  ← del .env del backend
 *
 *   2. Cambiar SHEET_NAME y SYNCED_COL si corresponde.
 *
 *   3. Ejecutar syncFacturas() manualmente o configurar un trigger:
 *      Triggers → Agregar → syncFacturas → "Basado en tiempo" → cada hora / cada día
 */

// ── Configuración ─────────────────────────────────────────────────────────────

const SHEET_NAME = "Facturas";     // nombre de la hoja dentro del Spreadsheet
const SYNCED_COL = 15;             // columna O (1-based) donde se marca "Sincronizado"
const HEADER_ROW = 1;              // fila de encabezados (se saltea)

// Columnas del Sheet (1-based, ajustar si el orden es distinto)
const COL = {
  INDICE:           1,   // A — Indice
  FECHA_RECEPCION:  2,   // B — Fecha Recepcion
  MAIL_PARA:        3,   // C — Para (mail)
  MAIL_DE:          4,   // D — De (mail)
  ASUNTO:           5,   // E — Asunto
  ID:               6,   // F — ID
  FECHA_FC:         7,   // G — Fecha Fc
  FECHA_VTO:        8,   // H — Fecha Vto
  RAZON_SOCIAL:     9,   // I — Razon Social
  MONEDA:          10,   // J — Moneda
  IMPORTE_NETO:    11,   // K — Importe Neto
  IMPUESTO:        12,   // L — Impuesto
  TOTAL:           13,   // M — Total
  ENLACE:          14,   // N — Enlace al Archivo
};

// ── Función principal ─────────────────────────────────────────────────────────

function syncFacturas() {
  const props       = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("❌ Faltan SUPABASE_URL o SUPABASE_KEY en las variables de script.");
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log(`❌ No se encontró la hoja "${SHEET_NAME}".`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) {
    Logger.log("ℹ️  No hay filas de datos.");
    return;
  }

  const rows = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, SYNCED_COL).getValues();

  let insertadas = 0;
  let omitidas   = 0;
  let errores    = 0;

  rows.forEach((row, i) => {
    const rowNum = HEADER_ROW + 1 + i;

    // Si ya está sincronizada, saltear
    if (row[SYNCED_COL - 1]) {
      omitidas++;
      return;
    }

    const idExterno   = String(row[COL.ID - 1] || "").trim();
    const razonSocial = String(row[COL.RAZON_SOCIAL - 1] || "").trim();

    // Saltear filas vacías o sin datos mínimos
    if (!idExterno && !razonSocial) {
      omitidas++;
      return;
    }

    const payload = {
      id_externo:       idExterno || null,
      fecha_recepcion:  formatDate(row[COL.FECHA_RECEPCION - 1]),
      mail_para:        String(row[COL.MAIL_PARA - 1] || "").trim() || null,
      mail_de:          String(row[COL.MAIL_DE - 1] || "").trim() || null,
      concepto:         String(row[COL.ASUNTO - 1] || "").trim() || null,
      fecha:            formatDate(row[COL.FECHA_FC - 1]) || formatDate(row[COL.FECHA_RECEPCION - 1]),
      fecha_vencimiento: formatDate(row[COL.FECHA_VTO - 1]),
      proveedor:        razonSocial || "Sin razón social",
      moneda:           String(row[COL.MONEDA - 1] || "ARS").trim().toUpperCase() || "ARS",
      importe_neto:     parseFloat(row[COL.IMPORTE_NETO - 1]) || null,
      impuesto:         parseFloat(row[COL.IMPUESTO - 1]) || null,
      monto:            parseFloat(row[COL.TOTAL - 1]) || 0,
      archivo_url:      String(row[COL.ENLACE - 1] || "").trim() || null,
      estado:           "pendiente",
      numero_comprobante: idExterno || null,
    };

    // Upsert por id_externo (si ya existe, actualiza)
    const endpoint = `${supabaseUrl}/rest/v1/facturas_proveedor`;
    const options  = {
      method:      "POST",
      contentType: "application/json",
      headers: {
        "apikey":        supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer":        "resolution=merge-duplicates,return=minimal",
      },
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const status   = response.getResponseCode();

    if (status === 200 || status === 201 || status === 204) {
      // Marcar fila como sincronizada con fecha y hora
      sheet.getRange(rowNum, SYNCED_COL).setValue(new Date().toLocaleString("es-AR"));
      insertadas++;
      Logger.log(`✅ Fila ${rowNum} sincronizada: ${razonSocial} — $${payload.monto}`);
    } else {
      errores++;
      Logger.log(`❌ Fila ${rowNum} falló (HTTP ${status}): ${response.getContentText()}`);
    }
  });

  Logger.log(`\n📊 Resultado: ${insertadas} insertadas, ${omitidas} omitidas, ${errores} errores`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convierte un valor de celda (Date, string, o número de serie de Excel)
 * a formato ISO "YYYY-MM-DD" aceptado por Supabase.
 * Devuelve null si no es parseable.
 */
function formatDate(value) {
  if (!value) return null;

  let date;
  if (value instanceof Date) {
    date = value;
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return null;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Función auxiliar: resincronizar UNA fila por número (útil para testear).
 * Borra la marca de sincronizado de esa fila y vuelve a correr syncFacturas().
 */
function resyncFila(rowNum) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.getRange(rowNum, SYNCED_COL).clearContent();
  syncFacturas();
}

/**
 * Función auxiliar: ver cuántas filas están pendientes de sync.
 */
function estadoSync() {
  const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) { Logger.log("Sin filas."); return; }
  const vals    = sheet.getRange(HEADER_ROW + 1, SYNCED_COL, lastRow - HEADER_ROW, 1).getValues();
  const total   = vals.length;
  const synced  = vals.filter(([v]) => !!v).length;
  Logger.log(`Sincronizadas: ${synced}/${total} | Pendientes: ${total - synced}`);
}
