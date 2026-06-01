/**
 * Exporta la lista de pacientes a un nuevo Google Sheet.
 * Usa las credenciales de Google del profesional dado.
 *
 * @param {string} profesionalId - UUID del profesional (debe tener Google conectado)
 * @returns {Promise<{ url: string, total: number }>}
 */

import { google } from 'googleapis';
import { getValidAccessToken } from './oauth.js';
import { supabase } from '../../lib/supabase.js';

export async function exportarPacientesASheet(profesionalId) {
  const { accessToken } = await getValidAccessToken(profesionalId);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  // Traer todos los pacientes ordenados por apellido
  const { data: pacientes, error } = await supabase
    .from('pacientes')
    .select('apellido, nombre, dni, telefono, email, obra_social, numero_afiliado, fecha_nacimiento, alergias, medicacion_actual, observaciones')
    .order('apellido');

  if (error) throw new Error(`Error leyendo pacientes: ${error.message}`);

  const HEADERS = [
    'Apellido', 'Nombre', 'DNI', 'Teléfono', 'Email',
    'Obra Social', 'N° Afiliado', 'Fecha Nacimiento',
    'Alergias', 'Medicación actual', 'Observaciones',
  ];

  const toCell = (v) => ({ userEnteredValue: { stringValue: v ?? '' } });
  const headerCells = HEADERS.map((h) => ({
    userEnteredValue: { stringValue: h },
    userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.95, blue: 1 } },
  }));

  const dataRows = pacientes.map((p) => ({
    values: [
      p.apellido, p.nombre, p.dni, p.telefono, p.email,
      p.obra_social, p.numero_afiliado, p.fecha_nacimiento,
      p.alergias, p.medicacion_actual, p.observaciones,
    ].map(toCell),
  }));

  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const { data: spreadsheet } = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `Pacientes — ${fecha}` },
      sheets: [{
        properties: { title: 'Pacientes', gridProperties: { frozenRowCount: 1 } },
        data: [{ startRow: 0, startColumn: 0, rowData: [{ values: headerCells }, ...dataRows] }],
      }],
    },
  });

  console.log(`📊 Sheet de pacientes creado: ${spreadsheet.spreadsheetId} (${pacientes.length} filas)`);

  return {
    url: `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}`,
    total: pacientes.length,
  };
}
