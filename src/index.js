const express = require("express");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");

const app = express();
const PORT = 3000;

// Datos iniciales
let reservas = [
  { id: 1, estudiante: "Ana", email: "ana@mail.com", sala: "Sala Norte", fecha: "2026-09-22", turno: "Mañana", personas: 2 },
  { id: 2, estudiante: "Luis", email: "luis@mail.com", sala: "Sala Sur", fecha: "2026-09-23", turno: "Tarde", personas: 4 },
  { id: 3, estudiante: "María", email: "maria@mail.com", sala: "Sala Multimedia", fecha: "2026-09-24", turno: "Noche", personas: 3 },
  { id: 4, estudiante: "Pedro", email: "pedro@mail.com", sala: "Sala Norte", fecha: "2026-09-25", turno: "Mañana", personas: 1 }
];

// Middleware global
app.use(morgan("dev"));

let contador = 1;
function identificarSolicitud(req, res, next) {
  res.locals.solicitudId = `BIB-${String(contador).padStart(4, "0")}`;
  contador++;
  next();
}
app.use(identificarSolicitud);

function medirDuracion(req, res, next) {
  const inicio = Date.now();
  res.on("finish", () => {
    const duracion = Date.now() - inicio;
    console.log(`${res.locals.solicitudId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duracion}ms`);
  });
  next();
}
app.use(medirDuracion);

app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de vistas
app.set("view engine", "ejs");
app.set("views", "./views");
app.set("layout", "./layouts/main");

// Rutas principales
app.get("/", (req, res) => {
  res.render("inicio", { titulo: "Inicio" });
});

app.get("/estado", (req, res) => {
  res.json({
    servicio: "activo",
    cantidad: reservas.length,
    solicitudId: res.locals.solicitudId
  });
});

// Router de reservas
const reservasRouter = express.Router();

reservasRouter.use((req, res, next) => {
  res.locals.seccion = "Reservas de salas";
  next();
});

reservasRouter.get("/", (req, res) => {
  res.render("reservas/lista", { titulo: "Listado", reservas });
});

reservasRouter.get("/nueva", (req, res) => {
  res.render("reservas/nueva", {
    titulo: "Nueva reserva",
    error: null,
    valores: {}
  });
});

reservasRouter.get("/:id", (req, res) => {
  const reserva = reservas.find(r => r.id == req.params.id);
  if (!reserva) return res.status(404).render("no_encontrados", { titulo: "No encontrado" });
  res.render("reservas/detalle", { titulo: "Detalle", reserva });
});

// Validación
function validarReserva(req, res, next) {
  const body = req.body || {};
  const normalizar = valor => typeof valor === "string" ? valor.trim() : "";
  const estudiante = normalizar(body.estudiante);
  const email = normalizar(body.email);
  const sala = normalizar(body.sala);
  const fecha = normalizar(body.fecha);
  const turno = normalizar(body.turno);
  const personasTexto = normalizar(body.personas);
  const personas = Number(personasTexto);

  const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
  const turnosPermitidos = ["Mañana", "Tarde", "Noche"];
  const valores = { estudiante, email, sala, fecha, turno, personas: personasTexto };
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(fecha)) &&
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;

  if (!estudiante || !email.includes("@") || !salasPermitidas.includes(sala) ||
      !fechaValida || !turnosPermitidos.includes(turno) ||
      !Number.isInteger(personas) || personas < 1 || personas > 6) {
    return res.status(400).render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: "Datos inválidos",
      valores
    });
  }

  req.reservaValidada = { estudiante, email, sala, fecha, turno, personas };
  next();
}

function crearReserva(req, res) {
  const nueva = { id: reservas.length + 1, ...req.reservaValidada };
  reservas.push(nueva);
  res.redirect("/reservas");
}

reservasRouter.post("/", validarReserva, crearReserva);

app.use("/reservas", reservasRouter);

// Middleware final 404
app.use((req, res) => {
  res.status(404).render("no_encontrados", { titulo: "No encontrado" });
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
