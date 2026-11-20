const { salasPermitidas, turnosPermitidos, estadosPermitidos } = require("../modelos/reserva");

function crearControladorReservas(servicio) {
  async function listar(req, res) {
    const reservas = await servicio.listar();
    res.render("reservas/lista", {
      titulo: "Reservas de Salas",
      reservas,
    });
  }

  function mostrarFormulario(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      errores: [],
      valores: {},
      salasPermitidas,
      turnosPermitidos,
      estadosPermitidos,
    });
  }

  async function mostrarDetalle(req, res) {
    const reserva = await servicio.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe una reserva con ese identificador.",
      });
    }
    res.render("reservas/detalle", {
      titulo: `Reserva ${reserva.id}`,
      reserva,
    });
  }

  async function crear(req, res) {
    await servicio.crear(req.reservaValidada);
    res.redirect("/reservas");
  }

  async function mostrarEdicion(req, res) {
    const reserva = await servicio.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "No existe la reserva que querés editar.",
      });
    }

    return res.render("reservas/editar", {
      titulo: "Editar reserva",
      error: null,
      id: reserva.id,
      valores: { ...reserva, fecha: reserva.fecha },
    });
  }

  async function guardarEdicion(req, res) {
    const reserva = await servicio.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "La reserva ya no existe. No se guardaron cambios.",
      });
    }

    const datos = req.body ?? {};
    const permitidos = [
      "estudiante",
      "email",
      "fecha",
      "sala",
      "turno",
      "personas",
      "estado",
    ];
    const valores = Object.fromEntries(
      permitidos.map((campo) => [
        campo,
        typeof datos[campo] === "string" ? datos[campo].trim() : "",
      ]),
    );
    const personas = valores.personas === "" ? NaN : Number(valores.personas);
    const fechaValida =
      /^\d{4}-\d{2}-\d{2}$/.test(valores.fecha) &&
      !Number.isNaN(new Date(`${valores.fecha}T00:00:00.000Z`).getTime()) &&
      new Date(`${valores.fecha}T00:00:00.000Z`).toISOString().slice(0, 10) ===
        valores.fecha;
    const camposExtra = Object.keys(datos).some(
      (campo) => !permitidos.includes(campo),
    );
    const emailValido = /^[^\s@]+@[^\s@]+$/.test(valores.email);
    const datosValidos =
      !camposExtra &&
      Boolean(valores.estudiante) &&
      emailValido &&
      fechaValida &&
      salasPermitidas.includes(valores.sala) &&
      turnosPermitidos.includes(valores.turno) &&
      Number.isInteger(personas) &&
      personas >= 1 &&
      personas <= 6 &&
      estadosPermitidos.includes(valores.estado);

    if (!datosValidos) {
      return res.status(400).render("reservas/editar", {
        titulo: "Editar reserva",
        error:
          "Revisá los datos: completá los campos, ingresá un email válido, una fecha válida y entre 1 y 6 personas.",
        id: reserva.id,
        valores,
        salasPermitidas,
        turnosPermitidos,
        estadosPermitidos,
      });
    }

    const datosEdicion = {
      estudiante: valores.estudiante,
      email: valores.email,
      fecha: valores.fecha,
      sala: valores.sala,
      turno: valores.turno,
      personas,
      estado: valores.estado,
    };

    // Se conserva el ID y el formulario antes de escribir en MongoDB.
    // El manejador de errores puede volver a mostrar exactamente estos datos.
    res.locals.formularioEdicion = {
      id: reserva.id,
      valores: { ...datosEdicion, fecha: valores.fecha },
    };

    const actualizado = await servicio.reemplazar(reserva.id, datosEdicion);

    if (!actualizado) {
      return res.status(404).render("no-encontrado", {
        titulo: "Reserva no encontrada",
        mensaje: "La reserva ya no existe. No se guardaron cambios.",
      });
    }

    return res.redirect(303, `/reservas/${actualizado.id}`);
  }

  async function listarApi(req, res) {
    const reservas = await servicio.listar();
    return res.json(reservas);
  }

  async function consultarApi(req, res) {
    const permitidos = ["sala", "orden"];
    for (const campo of Object.keys(req.query)) {
      if (!permitidos.includes(campo)) {
        return res.status(400).json({ error: "Parámetro no permitido." });
      }
    }

    const sala = req.query.sala;
    if (sala !== undefined && (typeof sala !== "string" || !sala.trim())) {
      return res
        .status(400)
        .json({ error: "El texto de sala debe tener contenido." });
    }

    const orden = req.query.orden ?? "estudiante";
    const ordenesPermitidos = ["estudiante", "personas-asc", "personas-desc"];
    if (typeof orden !== "string" || !ordenesPermitidos.includes(orden)) {
      return res.status(400).json({ error: "Orden no permitido." });
    }

    const resultado = await servicio.consultar(
      sala === undefined ? undefined : sala.trim(),
      orden,
    );
    return res.json(resultado);
  }

  async function obtenerApi(req, res) {
    const reserva = await servicio.obtenerPorId(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada." });
    }
    return res.json(reserva);
  }

  async function crearApi(req, res) {
    const reserva = await servicio.crear(req.reservaValidada);
    return res
      .location(`/api/reservas/${reserva.id}`)
      .status(201)
      .json(reserva);
  }

  async function eliminarApi(req, res) {
    const eliminado = await servicio.eliminar(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.status(204).end();
  }

  async function reemplazarApi(req, res) {
    const reserva = await servicio.reemplazar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  async function actualizarApi(req, res) {
    const reserva = await servicio.actualizar(
      req.params.id,
      req.cambiosValidos,
    );
    if (!reserva) {
      return res.status(404).json({ error: "Recurso no encontrado." });
    }
    res.json(reserva);
  }

  return {
    listar,
    mostrarFormulario,
    mostrarDetalle,
    crear,
    mostrarEdicion,
    guardarEdicion,
    listarApi,
    consultarApi,
    obtenerApi,
    crearApi,
    eliminarApi,
    reemplazarApi,
    actualizarApi,
  };
}

module.exports = { crearControladorReservas };
