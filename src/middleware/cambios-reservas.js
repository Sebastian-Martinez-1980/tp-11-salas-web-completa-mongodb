
const CAMPOS_REEMPLAZO = [
  "estudiante",
  "email",
  "sala",
  "fecha",
  "turno",
  "personas",
  "estado",
];

const SALAS_PERMITIDAS = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const TURNOS_PERMITIDOS = ["Mañana", "Tarde", "Noche"];
const ESTADOS_PERMITIDOS = ["Pendiente", "Confirmada", "Rechazada"];

function validarReemplazoReserva(req, res, next) {
  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({
      error: "El cuerpo de la solicitud debe ser un objeto JSON.",
    });
  }

  const faltantes = CAMPOS_REEMPLAZO.filter(
    (campo) => !Object.hasOwn(datos, campo),
  );
  const adicionales = Object.keys(datos).filter(
    (campo) => !CAMPOS_REEMPLAZO.includes(campo),
  );

  if (faltantes.length > 0 || adicionales.length > 0) {
    return res.status(400).json({
      error: "PUT requiere exactamente los siete campos editables.",
      faltantes,
      adicionales,
    });
  }

  const { estudiante, email, sala, fecha, turno, personas, estado } = datos;
  const fechaParseada =
    typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
      ? new Date(`${fecha}T00:00:00.000Z`)
      : null;
  const fechaValida =
    fechaParseada &&
    !Number.isNaN(fechaParseada.getTime()) &&
    fechaParseada.toISOString().slice(0, 10) === fecha;
  const emailValido =
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (
    typeof estudiante !== "string" ||
    !estudiante.trim() ||
    !emailValido ||
    typeof sala !== "string" ||
    !SALAS_PERMITIDAS.includes(sala) ||
    !fechaValida ||
    typeof turno !== "string" ||
    !TURNOS_PERMITIDOS.includes(turno) ||
    typeof personas !== "number" ||
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6 ||
    typeof estado !== "string" ||
    !ESTADOS_PERMITIDOS.includes(estado)
  ) {
    return res.status(400).json({
      error: "Uno o más campos de la reserva no son válidos.",
    });
  }

  req.cambiosValidos = {
    estudiante: estudiante.trim(),
    email: email.trim(),
    sala,
    fecha,
    turno,
    personas,
    estado,
  };

  return next();
}

function validarActualizacionReserva(req, res, next) {
  const datos = req.body;

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return res.status(400).json({ error: "Enviá un objeto JSON." });
  }

  const campos = Object.keys(datos);
  if (campos.length === 0 || campos.some((campo) => campo !== "personas")) {
    return res.status(400).json({
      error: "Solo se puede actualizar el campo personas.",
    });
  }

  if (
    typeof datos.personas !== "number" ||
    !Number.isInteger(datos.personas) ||
    datos.personas < 1 ||
    datos.personas > 6
  ) {
    return res.status(400).json({
      error: "Personas debe ser un número entero entre 1 y 6.",
    });
  }

  req.cambiosValidos = { personas: datos.personas };
  next();
}

module.exports = { validarReemplazoReserva, validarActualizacionReserva };
