// Datos públicos de contacto (también editables desde /configuracion en DB)
export const CONSULTORIO = {
  nombre: "Sonrisa",
  whatsapp: "5491100000000", // sin + ni espacios para wa.me
  telefono: "+54 11 0000-0000",
  email: "contacto@sonrisa.com.ar",
  direccion: "Av. Corrientes 1234, CABA",
  horario: "Lunes a Viernes 9 a 20hs · Sábados 9 a 13hs",
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
};

export const waLink = (mensaje = "Hola, quiero sacar un turno") =>
  `https://wa.me/${CONSULTORIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;

export const OBRAS_SOCIALES = [
  "OSDE", "Swiss Medical", "Galeno", "IOMA", "PAMI", "OSDEPYM", "Medicus", "Sancor Salud",
];
