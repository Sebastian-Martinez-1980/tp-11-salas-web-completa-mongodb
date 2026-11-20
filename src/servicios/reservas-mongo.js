const mongoose = require("mongoose");
const { Reserva } = require("../modelos/reserva");

function representarReserva(documento) {
  return {
    id: documento._id.toString(),
    estudiante: documento.estudiante,
    email: documento.email,
    sala: documento.sala,
    fecha:
      documento.fecha instanceof Date
        ? documento.fecha.toISOString().slice(0, 10)
        : String(documento.fecha).slice(0, 10),
    turno: documento.turno,
    personas: documento.personas,
    estado: documento.estado,
  };
}

function comprobarId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    const error = new Error("Identificador inválido");
    error.codigo = "ID_INVALIDO";
    throw error;
  }
}

function crearServicioReservasMongo() {
  async function listar(sala) {
    const filtro = {};

    if (sala !== undefined) {
      if (typeof sala !== "string" || !sala.trim()) {
        const error = new Error("Filtro sala inválido");
        error.codigo = "FILTRO_INVALIDO";
        throw error;
      }
      filtro.sala = sala.trim();
    }

    const documentos = await Reserva.find(filtro).lean();
    return documentos.map(representarReserva);
  }

  async function obtenerPorId(id) {
    comprobarId(id);
    const documento = await Reserva.findById(id).lean();
    return documento ? representarReserva(documento) : null;
  }

  async function crear(datos) {
    const documento = await Reserva.create({
      estudiante: datos.estudiante,
      email: datos.email,
      sala: datos.sala,
      fecha: datos.fecha,
      turno: datos.turno,
      personas: datos.personas,
      estado: datos.estado,
    });
    return representarReserva(documento);
  }

  async function reemplazar(id, datos) {
    comprobarId(id);
    const reemplazo = {
      estudiante: datos.estudiante,
      email: datos.email,
      sala: datos.sala,
      fecha: datos.fecha,
      turno: datos.turno,
      personas: datos.personas,
      estado: datos.estado,
    };
    const documento = await Reserva.findOneAndUpdate(
      { _id: id },
      { $set: reemplazo },
      { runValidators: true, returnDocument: "after", upsert: false },
    );
    return documento ? representarReserva(documento) : null;
  }

  async function actualizar(id, datos) {
    comprobarId(id);
    const cambios = {};
    for (const campo of ["personas"]) {
      if (Object.hasOwn(datos, campo)) cambios[campo] = datos[campo];
    }
    if (Object.keys(cambios).length === 0) {
      const error = new Error("Actualización vacía");
      error.codigo = "ENTRADA_INVALIDA";
      throw error;
    }
    const documento = await Reserva.findOneAndUpdate(
      { _id: id },
      { $set: cambios },
      { runValidators: true, returnDocument: "after", upsert: false },
    );
    return documento ? representarReserva(documento) : null;
  }

  async function eliminar(id) {
    comprobarId(id);
    const resultado = await Reserva.deleteOne({ _id: id });
    return resultado.deletedCount === 1;
  }

  async function consultar(sala, orden = "estudiante") {
    const filtro = {};
    if (sala !== undefined) {
      filtro.sala = sala.trim();
    }

    let ordenMongo = { estudiante: 1, _id: 1 };
    if (orden === "personas-asc") {
      ordenMongo = { personas: 1, _id: 1 };
    }
    if (orden === "personas-desc") {
      ordenMongo = { personas: -1, _id: 1 };
    }

    const documentos = await Reserva.find(filtro).sort(ordenMongo).lean();
    return documentos.map(representarReserva);
  }

  return {
    listar,
    obtenerPorId,
    crear,
    reemplazar,
    actualizar,
    eliminar,
    consultar,
  };
}
module.exports = { crearServicioReservasMongo };
