const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
const path = require('path');

const app = express();

// Configuración de sesión
app.use(session({
  secret: 'mi_secreto_super_seguro', // Cámbialo por uno más seguro en producción
  resave: false,
  saveUninitialized: false
}));

// Mensajes flash
app.use(flash());

// Middleware global para pasar mensajes flash a las vistas
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Middleware para hacer visible el usuario en todas las vistas EJS FECHA: 11-07-25
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

// Motor de plantillas EJS
app.set('view engine', 'ejs');

// Formularios
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/', require('./router'));

// Levantar servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
