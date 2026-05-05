#!/bin/bash
# =====================================================
# Casos de prueba del agente de IA del consultorio
# =====================================================
# Uso: chmod +x test-agente.sh && ./test-agente.sh
# Requiere: el back-end corriendo en localhost:3000
# =====================================================

BASE="http://localhost:3000/test"
TEL="+5491198765432"

VERDE='\033[0;32m'
AZUL='\033[0;34m'
GRIS='\033[0;90m'
NC='\033[0m'

separador() {
  echo ""
  echo -e "${AZUL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

mandar() {
  local mensaje="$1"
  separador
  echo -e "${GRIS}👤 Paciente:${NC} $mensaje"

  local respuesta=$(curl -s -X POST "$BASE/mensaje" \
    -H "Content-Type: application/json" \
    -d "{\"telefono\":\"$TEL\",\"mensaje\":\"$mensaje\"}")

  local texto=$(echo "$respuesta" | jq -r '.respuesta // .error')
  local duracion=$(echo "$respuesta" | jq -r '.duracion_ms // "?"')

  echo -e "${VERDE}🤖 Agente${NC} ${GRIS}(${duracion}ms):${NC}"
  echo "$texto"

  sleep 1
}

echo -e "${GRIS}Reseteando conversación de prueba...${NC}"
curl -s -X POST "$BASE/reset" \
  -H "Content-Type: application/json" \
  -d "{\"telefono\":\"$TEL\"}" > /dev/null

echo ""
echo "═══════════════════════════════════════"
echo "  ESCENARIO 1: Paciente nuevo + turno"
echo "═══════════════════════════════════════"

mandar "Hola, buen día"
mandar "Quería sacar un turno para una limpieza"
mandar "Soy Carlos Méndez"
mandar "Tengo OSDE"
mandar "¿Qué horarios hay esta semana?"
mandar "El primero que tengas disponible está bien"
mandar "Sí, confirmo"

separador
echo ""
echo "═══════════════════════════════════════"
echo "  ESCENARIO 2: Consultar turnos propios"
echo "═══════════════════════════════════════"

mandar "Che, ¿cuándo tenía mi turno?"

separador
echo ""
echo "═══════════════════════════════════════"
echo "  ESCENARIO 3: Urgencia → deriva humano"
echo "═══════════════════════════════════════"

TEL2="+5491198765433"
curl -s -X POST "$BASE/reset" \
  -H "Content-Type: application/json" \
  -d "{\"telefono\":\"$TEL2\"}" > /dev/null

separador
echo -e "${GRIS}👤 Paciente:${NC} Hola, tengo un dolor de muelas tremendo y la cara hinchada"
respuesta=$(curl -s -X POST "$BASE/mensaje" \
  -H "Content-Type: application/json" \
  -d "{\"telefono\":\"$TEL2\",\"mensaje\":\"Hola, tengo un dolor de muelas tremendo y la cara hinchada\"}")
echo -e "${VERDE}🤖 Agente:${NC}"
echo "$respuesta" | jq -r '.respuesta'

separador
echo ""
echo -e "${VERDE}✅ Pruebas terminadas${NC}"
echo ""
echo "Para ver el historial completo de la conversación:"
echo "  curl $BASE/conversacion/$TEL | jq"
