const conexion = require('../database/db');

exports.save = (req, res) => {
  const codigo = req.body.COD_CLIENTE;
  const alias = req.body.CLIENTE_ALIAS;
  const nombre = req.body.NOMBRES;
  const habilidad = req.body.SKILL;
  const descripcion = req.body.SKILL_DES;
  const plataforma = req.body.PLATAFORMA;

  if (!/^\d+$/.test(codigo)) {
    req.flash('error_msg', 'El código de cliente debe contener solo números.');
    return res.render('create', { cliente: req.body });
  }

  const insertQuery = `
    INSERT INTO t_monitoreo 
    (COD_CLIENTE, CLIENTE_ALIAS, NOMBRES, SKILL, SKILL_DES, PLATAFORMA)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [codigo, alias, nombre, habilidad, descripcion, plataforma];

  conexion.query(insertQuery, values, (error, results) => {
    if (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.render('create', {
          cliente: req.body,
          success_msg: [],
          error_msg: ['Ya existe un cliente con ese código.']
        });
      } else {
        console.error('Error al insertar:', error);
        return res.render('create', {
          cliente: req.body,
          success_msg: [],
          error_msg: ['Error al crear el cliente.']
        });
      }
    }
    // Si no hay error
    req.flash('success_msg', 'Cliente creado correctamente.');
    res.redirect('/');  
  });
};
