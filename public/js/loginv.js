document.addEventListener('DOMContentLoaded', () => {
    const mensaje = document.getElementById('mensaje-error-login');
    if (mensaje) {
        console.log('Mensaje detectado, iniciando temporizador');
        setTimeout(() => {
            mensaje.style.transition = 'opacity 0.5s ease';
            mensaje.style.opacity = '0';
            setTimeout(() => {
                console.log('Mensaje ocultado');
                mensaje.remove();
            }, 500);
        }, 2000);
    } else {
        console.log('No se encontró el mensaje');
    }
});