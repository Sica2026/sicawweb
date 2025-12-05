// =====================================================================
// ACCESO GLOBAL A MODO TÉCNICO - Alt + T desde cualquier página
// =====================================================================

// Detector global de Alt + T que funciona en TODAS las páginas
document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        console.log('🔑 Alt + T detectado - Redirigiendo a login técnico');

        // Redirigir a login.html con parámetro para modo técnico
        // El parámetro no es necesario si implementamos el localStorage

        // Opción 1: Redirigir y esperar que login.html cambie a modo técnico
        window.location.href = './view/login.html#tecnico';
    }
});

console.log('🌍 Acceso global Alt + T activado (disponible en todas las páginas)');
