// ✅ VERSION SIMPLIFICADA PARA TU CASO
class AutoCierre9PM {
    constructor() {
        this.ejecutadoHoy = localStorage.getItem('cierre9PM_' + new Date().toDateString()) === 'true';
        this.iniciar();
    }

    iniciar() {
        // Verificar cada minuto
        setInterval(() => {
            const ahora = new Date();
            const hora = ahora.getHours();
            const minuto = ahora.getMinutes();

            // Si es las 9:00 PM y no se ha ejecutado hoy
            if (hora === 21 && minuto === 0 && !this.ejecutadoHoy) {
                this.ejecutarCierre();
            }

            // Reset a medianoche
            if (hora === 0 && minuto === 0) {
                localStorage.removeItem('cierre9PM_' + new Date().toDateString());
                this.ejecutadoHoy = false;
            }
        }, 60000); // Cada minuto
    }

    async ejecutarCierre() {
        try {
            // Marcar como ejecutado para evitar duplicados
            localStorage.setItem('cierre9PM_' + new Date().toDateString(), 'true');
            this.ejecutadoHoy = true;

            // Obtener registros activos
            const query = await window.firebaseDB.collection("registros")
                .where("estado", "==", "activo")
                .get();

            if (query.empty) {
                console.log('✅ No hay registros para cerrar a las 9 PM');
                return;
            }

            let cerrados = 0;
            const batch = window.firebaseDB.batch();

            // Procesar cada registro
            query.forEach(doc => {
                const data = doc.data();
                const duracion = Math.floor((Date.now() - data.fechaEntrada.toDate()) / 60000);

                // Crear registro completado
                const registroCompleto = {
                    ...data,
                    fechaSalida: firebase.firestore.FieldValue.serverTimestamp(),
                    duracionMinutos: duracion,
                    estado: "completado_automatico",
                    tipoSalida: "automatica_9pm",
                    fechaCompletado: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Mover a completados y eliminar de activos
                batch.set(window.firebaseDB.collection("registros_completos").doc(), registroCompleto);
                batch.delete(doc.ref);
                cerrados++;
            });

            await batch.commit();
            console.log(`✅ ${cerrados} registros cerrados automáticamente a las 9 PM`);

        } catch (error) {
            console.error('❌ Error en cierre automático:', error);
        }
    }
}

// Inicializar automáticamente
document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseDB) {
        new AutoCierre9PM();
        console.log('🕘 Sistema de cierre automático 9 PM activado');
    }
});