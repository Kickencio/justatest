const mysql = require('mysql');

   const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sys',
});

/* const conexion = mysql.createConnection({
    host: '200.73.20.23',
    user: 'migracion',
    password: 'Admin123',
    database: 'migracion',
}); */

conexion.connect((error)=>{
    if(error){
        console.error('El error de conexión es: '+error);
        return
    }
    console.log('¡Te has conextado a la BASE DE DATOS!');
})

module.exports = conexion;