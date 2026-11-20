function crearManejadorErrores({ vistaFormulario, tituloFormulario }) {
  return function manejarErrores(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    const esValidacion = error.name === "ValidationError";
    const esEntrada =
      esValidacion ||
      error.name === "CastError" ||
      error.codigo === "ENTRADA_INVALIDA" ||
      error.codigo === "ID_INVALIDO" ||
      error.type === "entity.parse.failed";

    const estado = esEntrada ? 400 : 500;
    let mensaje = esEntrada
      ? "Revisá los datos enviados."
      : "No se pudo completar la operación.";

    if (error.codigo === "ID_INVALIDO") {
      mensaje = "El identificador debe tener 24 caracteres hexadecimales.";
    }
    console.error("Solicitud fallida:", res.locals.solicitudId, error.name);
    if (req.path.startsWith("/api/")) {
      return res.status(estado).json({
        error: mensaje,
        campos: esValidacion ? Object.keys(error.errors) : [],
      });
    }

    if (req.method === "POST" && res.locals.formularioEdicion) {
      const formulario = res.locals.formularioEdicion;
      const mensajeEdicion = esEntrada
        ? "No se pudieron validar los cambios. Revisá los datos e intentá nuevamente."
        : "No se pudieron guardar los cambios en MongoDB. Tus datos siguen en el formulario para que puedas reintentarlo.";

      return res.status(estado).render("reservas/editar", {
        titulo: "Editar reserva",
        error: mensajeEdicion,
        id: formulario.id,
        valores: formulario.valores,
        salasPermitidas: res.locals.salasPermitidas ?? [],
        turnosPermitidos: res.locals.turnosPermitidos ?? [],
        estadosPermitidos: res.locals.estadosPermitidos ?? [],
      });
    }

    if (esValidacion && req.method === "POST") {
      return res.status(400).render(vistaFormulario, {
        titulo: tituloFormulario,
        errores: mensaje,
        valores: req.body ?? {},
        salasPermitidas: res.locals.salasPermitidas ?? [],
        turnosPermitidos: res.locals.turnosPermitidos ?? [],
        estadosPermitidos: res.locals.estadosPermitidos ?? [],
      });
    }

    return res.status(estado).render("no-encontrado", {
      titulo: esEntrada ? "Solicitud inválida" : "Error del servicio",
      mensaje,
    });
  };
}

module.exports = { crearManejadorErrores };
