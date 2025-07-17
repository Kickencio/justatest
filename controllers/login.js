const bcrypt = require('bcrypt'); // Para validar contraseña encriptada FECHA: 11-07-25
const conexion = require('../database/db'); // Conexión a la base de datos FECHA: 11-07-25

// AUTENTICAR USUARIO FECHA: 11-07-25
exports.autenticar = (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    // Consultar usuario por nombre FECHA: 11-07-25
    conexion.query('SELECT * FROM t_usuarios WHERE USUARIO = ?', [nombre_usuario], async (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err); // Log de error FECHA: 11-07-25
            return res.render('login', { error: 'Error en la base de datos' });
        }

        if (results.length === 0) {
            // Siempre mostrar el mismo mensaje genérico
            return res.render('login', { error: 'Usuario o contraseña incorrecta' });
        }

        const usuario = results[0];

        // Comparar contraseña con el hash almacenado FECHA: 11-07-25
        const esValida = await bcrypt.compare(contrasena, usuario.CONTRASENA);

        if (esValida) {
            req.session.usuario = {
                ID: usuario.ID,
                NOMBRE: usuario.NOMBRE,
                CARGO: usuario.CARGO,
                USUARIO: usuario.USUARIO
            }; // Guardar datos del usuario en sesión FECHA: 11-07-25
            res.redirect('/');
        } else {
            // Mismo mensaje genérico
            res.render('login', { error: 'Usuario o contraseña incorrecta' });
        }
    });
};





// CERRAR SESIÓN FECHA: 11-07-25
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.redirect('/');
        }
        res.clearCookie('connect.sid'); // Limpia cookie de sesión (buena práctica)
        res.redirect('/login');
    });
};