const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const conexion = require('./database/db');
const crud = require('./controllers/crud');
const loginController = require('./controllers/login');

// FUNCIÓN PARA VERIFICAR SI EL USUARIO ESTÁ AUTENTICADO FECHA: 11-07-25
function verificarSesion(req, res, next) {
    if (req.session.usuario) {
        return next();
    }
    return res.redirect('/login');
}

// RUTA PRINCIPAL ("/") - REDIRECCIONA A INDEX SI ESTÁ AUTENTICADO FECHA: 11-07-25
router.get('/', verificarSesion, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 1000;
    const offset = (page - 1) * limit;

    conexion.query('SELECT COUNT(*) AS total FROM t_monitoreo', (err, countResult) => {
        if (err) throw err;

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        conexion.query('SELECT * FROM t_monitoreo LIMIT ? OFFSET ?', [limit, offset], (err, results) => {
            if (err) throw err;

            res.render('index', {
                results: results,
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});

// RUTA LOGIN (GET) - FORMULARIO DE INICIO DE SESIÓN FECHA: 11-07-25
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// RUTA LOGIN (POST) - VALIDAR USUARIO Y CONTRASEÑA FECHA: 11-07-25
router.post('/login', loginController.autenticar);

// RUTA LOGOUT - CERRAR SESIÓN FECHA: 11-07-25
router.post('/logout', loginController.logout);

// =====================================
// CRUD DE t_monitoreo (PROTEGIDO)
// =====================================

function buscarClientes(codigo) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM t_monitoreo WHERE 
            COD_CLIENTE LIKE ? OR 
            CLIENTE_ALIAS LIKE ? OR 
            NOMBRES LIKE ? OR 
            SKILL LIKE ? OR 
            SKILL_DES LIKE ? OR 
            PLATAFORMA LIKE ?`;
        const busqueda = `%${codigo}%`;
        conexion.query(sql, [busqueda, busqueda, busqueda, busqueda, busqueda, busqueda], (error, results) => {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

router.get('/search', verificarSesion, async (req, res) => {
    const { codigo } = req.query;
    try {
        const results = await buscarClientes(codigo);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json(results);
        }
        res.render('index', { results, success_msg: [], error_msg: [] });
    } catch (error) {
        console.error(error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'Error al buscar datos' });
        }
        req.flash('error_msg', 'Error buscando clientes');
        res.redirect('/');
    }
});

router.get('/crear', verificarSesion, (req, res) => {
    res.render('create', { cliente: {} });
});

router.post('/save', verificarSesion, crud.save);

router.get('/editar/:COD_CLIENTE', verificarSesion, (req, res) => {
    const COD_CLIENTE = req.params.COD_CLIENTE;
    conexion.query('SELECT * FROM t_monitoreo WHERE COD_CLIENTE=?', [COD_CLIENTE], (error, results) => {
        if (error) throw error;
        res.render('edit', { t_monitoreo: results[0] });
    });
});

router.post('/actualizar/:COD_CLIENTE', verificarSesion, (req, res) => {
    const COD_CLIENTE_OLD = req.params.COD_CLIENTE;
    const { CLIENTE_ALIAS, NOMBRES, SKILL, SKILL_DES, PLATAFORMA } = req.body;
    const datos = { CLIENTE_ALIAS, NOMBRES, SKILL, SKILL_DES, PLATAFORMA };

    conexion.query('UPDATE t_monitoreo SET ? WHERE COD_CLIENTE = ?', [datos, COD_CLIENTE_OLD], () => {
        req.flash('success_msg', 'Cliente actualizado correctamente');
        res.redirect('/');
    });
});

router.get('/eliminar/:COD_CLIENTE', verificarSesion, (req, res) => {
    const COD_CLIENTE = req.params.COD_CLIENTE;
    conexion.query('SELECT * FROM t_monitoreo WHERE COD_CLIENTE = ?', [COD_CLIENTE], (error, results) => {
        if (error) throw error;

        if (results.length === 0) {
            req.flash('success_msg', 'Cliente no encontrado');
            return res.redirect('/');
        }
        res.render('confirmDelete', { cliente: results[0] });
    });
});

router.post('/delete/:COD_CLIENTE', verificarSesion, (req, res) => {
    const COD_CLIENTE = req.params.COD_CLIENTE;
    conexion.query('DELETE FROM t_monitoreo WHERE COD_CLIENTE = ?', [COD_CLIENTE], (error) => {
        if (error) {
            console.error('Error al eliminar:', error);
            req.flash('error_msg', 'Error al eliminar el cliente');
        } else {
            req.flash('success_msg', 'Cliente eliminado correctamente');
        }
        res.redirect('/');
    });
});

router.post('/confirmar-multiples', verificarSesion, (req, res) => {
    const seleccionados = req.body.clientesSeleccionados;
    const ids = Array.isArray(seleccionados) ? seleccionados : [seleccionados];

    if (!ids || ids.length === 0) {
        req.flash('error_msg', 'No se seleccionaron clientes para eliminar.');
        return res.redirect('/');
    }

    const sql = 'SELECT * FROM t_monitoreo WHERE COD_CLIENTE IN (?)';
    conexion.query(sql, [ids], (err, results) => {
        if (err) {
            console.error('Error al obtener datos para confirmación:', err);
            req.flash('error_msg', 'Error al cargar confirmación.');
            return res.redirect('/');
        }

        res.render('confirmDelete', { clientes: results });
    });
});

router.post('/delete-multiple', verificarSesion, (req, res) => {
    const seleccionados = req.body.clientesSeleccionados;
    const ids = Array.isArray(seleccionados) ? seleccionados : [seleccionados];

    if (!ids || ids.length === 0) {
        req.flash('error_msg', 'No se seleccionaron clientes para eliminar.');
        return res.redirect('/');
    }

    const sql = 'DELETE FROM t_monitoreo WHERE COD_CLIENTE IN (?)';
    conexion.query(sql, [ids], (err) => {
        if (err) {
            console.error('Error al eliminar clientes:', err);
            req.flash('error_msg', 'Error al eliminar los clientes seleccionados.');
        } else {
            req.flash('success_msg', 'Clientes eliminados correctamente.');
        }
        res.redirect('/');
    });
});

/* ==================== SUBIR EXCEL ==================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'archivo-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/subir', verificarSesion, (req, res) => {
    res.render('upload');
});

router.get('/upload', verificarSesion, (req, res) => {
    res.redirect('/subir');
});

router.post('/upload', verificarSesion, upload.single('excelFile'), async (req, res) => {
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        const camposRequeridos = ['COD_CLIENTE', 'CLIENTE_ALIAS', 'SKILL', 'SKILL_DES'];
        const filasInvalidas = data.filter(row =>
            camposRequeridos.some(campo => !row[campo] || String(row[campo]).trim() === '')
        );
        if (filasInvalidas.length > 0) {
            req.flash('error_msg', 'El archivo contiene filas con campos requeridos vacíos. No se agregó ningún cliente.');
            return res.redirect('/subir');
        }

        let duplicados = [];
        let insertados = 0;

        for (const row of data) {
            const { COD_CLIENTE, CLIENTE_ALIAS = '', NOMBRES = '', SKILL = '', SKILL_DES = '', PLATAFORMA = '' } = row;

            const checkSql = 'SELECT * FROM t_monitoreo WHERE COD_CLIENTE = ?';
            const result = await new Promise((resolve, reject) => {
                conexion.query(checkSql, [COD_CLIENTE], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            if (result.length === 0) {
                const insertSql = `INSERT INTO t_monitoreo (COD_CLIENTE, CLIENTE_ALIAS, NOMBRES, SKILL, SKILL_DES, PLATAFORMA)
                                   VALUES (?, ?, ?, ?, ?, ?)`;
                await new Promise((resolve, reject) => {
                    conexion.query(insertSql, [COD_CLIENTE, CLIENTE_ALIAS, NOMBRES, SKILL, SKILL_DES, PLATAFORMA], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
                insertados++;
            } else {
                duplicados.push(COD_CLIENTE);
            }
        }

        if (duplicados.length > 0) {
            req.flash('error_msg', `Algunos clientes no fueron cargados porque ya existen: ${duplicados.join(', ')}`);
            return res.redirect('/subir');
        } else {
            req.flash('success_msg', 'Archivo procesado correctamente. Todos los clientes fueron agregados.');
            return res.redirect('/');
        }
    } catch (err) {
        console.error('Error general al procesar el archivo:', err);
        req.flash('error_msg', 'Ocurrió un error al procesar el archivo.');
        res.redirect('/subir');
    }
});

module.exports = router;
