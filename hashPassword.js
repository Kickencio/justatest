// hashPassword.js
// CLI para crear, actualizar, eliminar, listar usuarios y repetir flujo
// FECHA: 15-07-25

const inquirer = require('inquirer');      // inquirer@8, CommonJS
const bcrypt   = require('bcrypt');
const mysql    = require('mysql');
const util     = require('util');

// Configuración de la conexión
const conexion = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'sys',
});

/* const conexion = mysql.createConnection({
    host: '200.73.20.23',
    user: 'migracion',
    password: 'Admin123',
    database: 'migracion',
}); */


// Promisify para usar async/await
const query   = util.promisify(conexion.query).bind(conexion);
const connect = util.promisify(conexion.connect).bind(conexion);
const end     = util.promisify(conexion.end).bind(conexion);

// Menú principal
async function preguntarOperacion() {
  const { operacion } = await inquirer.prompt([{
    type:    'list',
    name:    'operacion',
    message: '¿Qué deseas hacer?',
    choices: [
      { name: 'Crear usuario nuevo',         value: 'crear'      },
      { name: 'Actualizar datos de usuario', value: 'actualizar' },
      { name: 'Eliminar usuario',            value: 'eliminar'   },
      { name: 'Ver usuarios registrados',    value: 'listar'     }
    ]
  }]);
  return operacion;
}

// Datos para crear
async function datosCrear() {
  return inquirer.prompt([
    { type: 'input',    name: 'USUARIO',    message: 'Usuario (único):',           validate: v => !!v || 'Requerido' },
    { type: 'password', name: 'CONTRASENA', message: 'Contraseña:'                               },
    { type: 'input',    name: 'NOMBRE',     message: 'Nombre real:'                             },
    { type: 'input',    name: 'APELLIDO1',  message: 'Apellido paterno:'                        },
    { type: 'input',    name: 'APELLIDO2',  message: 'Apellido materno:'                         },
    { type: 'input',    name: 'CARGO',      message: 'Cargo:'                                   }
  ]);
}

// Datos para actualizar (pregunta uno a uno)
async function datosActualizar() {
  const { USUARIO } = await inquirer.prompt({
    type: 'input',
    name: 'USUARIO',
    message: 'Usuario a modificar:',
    validate: v => !!v || 'Requerido'
  });

  console.log('\nPara cada campo, responde si quieres actualizarlo o no.\n');

  const camposDisponibles = [
    { label: 'Contraseña',       key: 'CONTRASENA', type: 'password' },
    { label: 'Nombre real',      key: 'NOMBRE',     type: 'input'    },
    { label: 'Apellido paterno', key: 'APELLIDO1',  type: 'input'    },
    { label: 'Apellido materno', key: 'APELLIDO2',  type: 'input'    },
    { label: 'Cargo',            key: 'CARGO',      type: 'input'    },
  ];

  const nuevos = { USUARIO };

  for (let campo of camposDisponibles) {
    const { actualizar } = await inquirer.prompt({
      type:    'confirm',
      name:    'actualizar',
      message: `¿Deseas actualizar "${campo.label}"?`,
      default: false
    });
    if (actualizar) {
      const { valor } = await inquirer.prompt({
        type:    campo.type,
        name:    'valor',
        message: `Nuevo valor para ${campo.label}:`
      });
      nuevos[campo.key] = valor;
    }
  }

  return nuevos;
}

// Datos para eliminar
async function datosEliminar() {
  const { USUARIO } = await inquirer.prompt({
    type     : 'input',
    name     : 'USUARIO',
    message  : 'Usuario a eliminar:',
    validate : v => !!v || 'Requerido'
  });
  const { confirmar } = await inquirer.prompt({
    type    : 'confirm',
    name    : 'confirmar',
    message : `¿Eliminar al usuario "${USUARIO}"?`,
    default : false
  });
  return confirmar ? USUARIO : null;
}

// Operaciones sobre la BD
async function crearUsuario(datos) {
  try {
    const hash = await bcrypt.hash(datos.CONTRASENA, 10);
    await query(
      `INSERT INTO t_usuarios (USUARIO, CONTRASENA, NOMBRE, APELLIDO1, APELLIDO2, CARGO)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [datos.USUARIO, hash, datos.NOMBRE, datos.APELLIDO1, datos.APELLIDO2, datos.CARGO]
    );
    console.log('✅ Usuario creado:', datos.USUARIO);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log(`⚠️ El usuario "${datos.USUARIO}" ya existe.`);
      const { update } = await inquirer.prompt({
        type    : 'confirm',
        name    : 'update',
        message : '¿Quieres pasar al flujo de actualización?',
        default : true
      });
      if (update) {
        const nuevos = await datosActualizar();
        await actualizarUsuario(nuevos);
      }
    } else {
      throw e;
    }
  }
}

async function actualizarUsuario(datos) {
  const sets = [], vals = [];
  for (let [k, v] of Object.entries(datos)) {
    if (k === 'USUARIO') continue;
    if (k === 'CONTRASENA') {
      const h = await bcrypt.hash(v, 10);
      sets.push(`${k} = ?`);
      vals.push(h);
    } else {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (sets.length === 0) {
    console.log('ℹ️ No se seleccionó ningún campo para actualizar.');
    return;
  }
  vals.push(datos.USUARIO);
  const res = await query(
    `UPDATE t_usuarios SET ${sets.join(', ')} WHERE USUARIO = ?`,
    vals
  );
  console.log(
    res.affectedRows
      ? `🔄 Usuario "${datos.USUARIO}" actualizado.`
      : `⚠️ Usuario "${datos.USUARIO}" no encontrado.`
  );
}

async function eliminarUsuario(USUARIO) {
  const res = await query(`DELETE FROM t_usuarios WHERE USUARIO = ?`, [USUARIO]);
  console.log(
    res.affectedRows
      ? `🗑️ Usuario "${USUARIO}" eliminado.`
      : `⚠️ Usuario "${USUARIO}" no encontrado.`
  );
}

async function listarUsuarios() {
  const rows = await query(`SELECT USUARIO, NOMBRE, APELLIDO1, APELLIDO2, CARGO FROM t_usuarios`);
  console.log('\n=== Usuarios registrados ===\n');
  console.table(rows);
}

// Flujo principal
;(async () => {
  await connect();
  console.log('\n--- Gestor de usuarios t_usuarios ---\n');
  let continuar = true;

  while (continuar) {
    const op = await preguntarOperacion();

    if (op === 'crear') {
      const d = await datosCrear();
      await crearUsuario(d);
    } 
    else if (op === 'actualizar') {
      const d = await datosActualizar();
      await actualizarUsuario(d);
    } 
    else if (op === 'eliminar') {
      const u = await datosEliminar();
      if (u) await eliminarUsuario(u);
    } 
    else if (op === 'listar') {
      await listarUsuarios();
    }

    const { continuar: resp } = await inquirer.prompt({
      type    : 'confirm',
      name    : 'continuar',
      message : '¿Deseas realizar otra operación?',
      default : true
    });
    continuar = resp;
    console.log();
  }

  await end();
  console.log('🔚 Proceso finalizado. ¡Hasta luego!');
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
