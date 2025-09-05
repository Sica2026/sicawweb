// autorizacion-nuevo.js - Sistema de autorización completamente nuevo

class AutorizacionSICA {
    constructor() {
        this.pendienteId = this.obtenerParametroURL('id');
        this.datosFormulario = {};
        this.zoomLevel = 100;
        this.tipoDocumento = null;
        
        this.elementos = {
            loadingScreen: document.getElementById('loadingScreen'),
            tipoDocumento: document.getElementById('tipoDocumento'),
            fechaSolicitud: document.getElementById('fechaSolicitud'),
            btnAutorizar: document.getElementById('btnAutorizar'),
            documentContainer: document.getElementById('documentContainer'),
            documentPage: document.getElementById('documentPage'),
            zoomIndicator: document.getElementById('zoomIndicator'),
            duracionDisplay: document.getElementById('duracionDisplay')
        };
    }

    async inicializar() {
        try {
            console.log('🚀 Iniciando sistema de autorización...');
            
            if (!this.pendienteId) {
                throw new Error('No se especificó ID del pendiente');
            }

            await this.verificarAutenticacion();
            this.configurarEventListeners();
            await this.cargarDatosPendiente();
            this.configurarActualizacionTiempoReal();
            
            // Ocultar loading
            this.elementos.loadingScreen.style.display = 'none';
            
            console.log('✅ Sistema inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando:', error);
            this.mostrarError(error.message);
        }
    }

    obtenerParametroURL(nombre) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(nombre);
    }

    async verificarAutenticacion() {
        return new Promise((resolve, reject) => {
            firebase.auth().onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = '../login.html';
                    return;
                }
                resolve(user);
            });
        });
    }

    configurarEventListeners() {
        // Botón autorizar
        this.elementos.btnAutorizar.addEventListener('click', () => this.procesarAutorizacion());

        // Controles de zoom
        document.getElementById('btnZoomIn').addEventListener('click', () => this.zoom(125));
        document.getElementById('btnZoomOut').addEventListener('click', () => this.zoom(75));
        document.getElementById('btnRefresh').addEventListener('click', () => this.actualizarVistaPrevia());
        document.getElementById('btnFullscreen').addEventListener('click', () => this.toggleFullscreen());

        // Campos del formulario
        const campos = ['folioNumber', 'nombreAsesor', 'numeroCuenta', 'carrera', 
                       'fechaInicio', 'fechaTermino', 'actividadesDesarrolladas', 'clavePrograma'];
        
        campos.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.addEventListener('input', () => this.actualizarVistaPrevia());
                campo.addEventListener('change', () => this.calcularDuracion());
            }
        });
    }

    async cargarDatosPendiente() {
        try {
            // Obtener datos del pendiente
            const doc = await firebase.firestore()
                .collection('serviciosocial')
                .doc(this.pendienteId)
                .get();

            if (!doc.exists) {
                throw new Error('Pendiente no encontrado');
            }

            const pendiente = doc.data();
            this.tipoDocumento = pendiente.tipoAutorizacion;

            // Cargar datos del asesor
            await this.cargarDatosAsesor(pendiente.asesorId);

            // Poblar formulario
            this.poblarFormulario(pendiente);

            // Actualizar interfaz
            this.actualizarTituloDocumento();
            this.actualizarFechaSolicitud(pendiente.fechaSolicitud);
            this.actualizarVistaPrevia();

        } catch (error) {
            throw new Error(`Error cargando pendiente: ${error.message}`);
        }
    }

    async cargarDatosAsesor(asesorId) {
        try {
            const numeroCuenta = asesorId.replace('asesor_', '');
            const query = await firebase.firestore()
                .collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .get();

            if (!query.empty) {
                const asesor = query.docs[0].data();
                document.getElementById('nombreAsesor').value = asesor.nombreAsesor || '';
                document.getElementById('numeroCuenta').value = asesor.numeroCuenta || '';
                document.getElementById('carrera').value = asesor.carrera || '';
            }
        } catch (error) {
            console.warn('Error cargando asesor:', error);
        }
    }

    poblarFormulario(pendiente) {
        // Obtener siguiente número de folio
        this.obtenerSiguienteNumeroFolio();

        // Fechas del servicio
        if (pendiente.fechaInicio) {
            document.getElementById('fechaInicio').value = this.formatearFechaInput(pendiente.fechaInicio);
        }
        if (pendiente.fechaTermino) {
            document.getElementById('fechaTermino').value = this.formatearFechaInput(pendiente.fechaTermino);
        }

        // Actividades por defecto
        const actividades = [
            'Préstamo de equipos de cómputo a los alumnos',
            'Atención al servicio de impresiones',
            'Apoyo en departamentales',
            'Apoyo en cursos y clases en sala de cómputo',
            'Atención a usuarios con problemas en equipos'
        ].join('\n• ');
        
        document.getElementById('actividadesDesarrolladas').value = '• ' + actividades;
        
        this.calcularDuracion();
    }

    async obtenerSiguienteNumeroFolio() {
        try {
            const year = new Date().getFullYear();
            const query = await firebase.firestore()
                .collection('edgar')
                .where('folio', '>=', `CI/001/${year}`)
                .where('folio', '<=', `CI/999/${year}`)
                .orderBy('folio', 'desc')
                .limit(1)
                .get();

            let siguiente = 1;
            if (!query.empty) {
                const ultimo = query.docs[0].data().folio;
                const numero = parseInt(ultimo.match(/CI\/(\d+)\/\d{4}/)?.[1] || '0');
                siguiente = numero + 1;
            }

            document.getElementById('folioNumber').value = siguiente.toString().padStart(3, '0');
        } catch (error) {
            document.getElementById('folioNumber').value = '001';
        }
    }

    configurarActualizacionTiempoReal() {
        const observer = new MutationObserver(() => this.actualizarVistaPrevia());
        
        document.querySelectorAll('input, textarea').forEach(campo => {
            observer.observe(campo, { attributes: true, attributeFilter: ['value'] });
        });
    }

    actualizarTituloDocumento() {
        const titulo = this.tipoDocumento?.includes('aceptacion') ? 
            'Carta de Aceptación' : 'Carta de Término';
        this.elementos.tipoDocumento.textContent = titulo;
    }

    actualizarFechaSolicitud(timestamp) {
        if (timestamp) {
            const fecha = timestamp.toDate();
            this.elementos.fechaSolicitud.textContent = 
                `Solicitado: ${fecha.toLocaleDateString('es-ES')}`;
        }
    }

    calcularDuracion() {
        const inicio = document.getElementById('fechaInicio').value;
        const termino = document.getElementById('fechaTermino').value;
        
        if (inicio && termino) {
            const fechaInicio = new Date(inicio);
            const fechaTermino = new Date(termino);
            const diffTime = Math.abs(fechaTermino - fechaInicio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const meses = Math.round(diffDays / 30);
            
            this.elementos.duracionDisplay.innerHTML = 
                `<i class="bi bi-clock"></i> Duración: ${meses} meses (${diffDays} días)`;
        }
    }

    actualizarVistaPrevia() {
        const datos = this.obtenerDatosFormulario();
        
        if (!datos.nombreAsesor || !datos.folioCompleto) {
            this.mostrarCargandoDocumento();
            return;
        }

        const contenidoHTML = this.tipoDocumento?.includes('aceptacion') ? 
            this.generarCartaAceptacion(datos) : this.generarCartaTermino(datos);

        this.elementos.documentPage.innerHTML = `
            <div class="document-content">
                ${contenidoHTML}
            </div>
        `;
    }

    obtenerDatosFormulario() {
        const folioNum = document.getElementById('folioNumber').value.padStart(3, '0');
        const year = new Date().getFullYear();
        
        return {
            folioCompleto: `CI/${folioNum}/${year}`,
            nombreAsesor: document.getElementById('nombreAsesor').value,
            numeroCuenta: document.getElementById('numeroCuenta').value,
            carrera: document.getElementById('carrera').value,
            fechaInicio: document.getElementById('fechaInicio').value,
            fechaTermino: document.getElementById('fechaTermino').value,
            actividades: document.getElementById('actividadesDesarrolladas').value,
            clavePrograma: document.getElementById('clavePrograma').value,
            fechaHoy: new Date().toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long', year: 'numeric'
            })
        };
    }

    generarCartaAceptacion(datos) {
        return `
            <div class="document-header">
                <div class="logo-section">
                    <div class="logo-placeholder">LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h1>FACULTAD DE QUÍMICA UNAM</h1>
                    <h2>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</h2>
                    <h2>CENTRO DE INFORMÁTICA Y SICAS</h2>
                </div>
            </div>
            
            <div class="folio-info">
                <strong>FOLIO: ${datos.folioCompleto}</strong><br>
                <strong>Asunto: Carta de aceptación</strong>
            </div>
            
            <div class="document-body">
                <p>Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong>, con número de cuenta <strong>${datos.numeroCuenta}</strong>, de la Licenciatura en <strong>${datos.carrera}</strong> ha sido aceptado(a) para realizar su Servicio Social en este Centro, a partir del <strong>${this.formatearFecha(datos.fechaInicio)}</strong>.</p>
                
                <div class="activities-section">
                    <p><strong>ACTIVIDADES A DESARROLLAR</strong></p>
                    <ul class="activities-list">
                        ${this.formatearActividades(datos.actividades)}
                    </ul>
                </div>
                
                <div class="signature-section">
                    <p><strong>ATENTAMENTE</strong></p>
                    <p><em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em></p>
                    <p>Ciudad Universitaria, Cd. Mx., ${datos.fechaHoy}</p>
                    <div class="signature-line"></div>
                    <p><strong>RESPONSABLE DEL CENTRO DE INFORMÁTICA Y SICAS</strong></p>
                </div>
            </div>
        `;
    }

    generarCartaTermino(datos) {
        return `
            <div class="document-header">
                <div class="logo-section">
                    <div class="logo-placeholder">LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h1>FACULTAD DE QUÍMICA UNAM</h1>
                    <h2>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</h2>
                    <h2>CENTRO DE INFORMÁTICA Y SICAS</h2>
                </div>
            </div>
            
            <div class="folio-info">
                <strong>FOLIO: ${datos.folioCompleto}</strong><br>
                <strong>Asunto: Carta de término</strong>
            </div>
            
            <div class="document-body">
                <p>Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong>, con número de cuenta <strong>${datos.numeroCuenta}</strong>, de la Licenciatura en <strong>${datos.carrera}</strong> concluyó satisfactoriamente su Servicio Social, cumpliendo las <strong>480 horas reglamentarias</strong>.</p>
                
                <div class="activities-section">
                    <p><strong>ACTIVIDADES DESARROLLADAS</strong></p>
                    <ul class="activities-list">
                        ${this.formatearActividades(datos.actividades)}
                    </ul>
                </div>
                
                <div class="signature-section">
                    <p><strong>ATENTAMENTE</strong></p>
                    <p><em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em></p>
                    <p>Ciudad Universitaria, Cd. Mx., ${datos.fechaHoy}</p>
                    <div class="signature-line"></div>
                    <p><strong>RESPONSABLE DEL CENTRO DE INFORMÁTICA Y SICAS</strong></p>
                </div>
            </div>
        `;
    }

    formatearActividades(actividades) {
        return actividades.split('\n')
            .filter(linea => linea.trim())
            .map(linea => `<li>${linea.replace(/^[•\-\*]\s*/, '')}</li>`)
            .join('');
    }

    mostrarCargandoDocumento() {
        this.elementos.documentPage.innerHTML = `
            <div class="loading-document">
                <div class="spinner-border text-primary mb-3"></div>
                <p>Generando vista previa...</p>
                <small>Complete los datos para ver el documento</small>
            </div>
        `;
    }

    zoom(porcentaje) {
        if (porcentaje) {
            this.zoomLevel = porcentaje;
        }
        
        this.elementos.documentPage.className = `document-page zoom-${this.zoomLevel}`;
        this.elementos.zoomIndicator.textContent = `${this.zoomLevel}%`;
    }

    toggleFullscreen() {
        const container = this.elementos.documentContainer;
        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    async procesarAutorizacion() {
        try {
            if (!this.validarFormulario()) {
                this.mostrarError('Complete todos los campos requeridos');
                return;
            }

            // Mostrar loading en botón
            this.elementos.btnAutorizar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
            this.elementos.btnAutorizar.disabled = true;

            const datos = this.obtenerDatosFormulario();
            await this.guardarAutorizacion(datos);
            
            this.mostrarExito(datos.folioCompleto);

        } catch (error) {
            this.mostrarError(error.message);
            this.elementos.btnAutorizar.innerHTML = '<i class="bi bi-check-circle me-2"></i>Autorizar';
            this.elementos.btnAutorizar.disabled = false;
        }
    }

    validarFormulario() {
        const requeridos = ['folioNumber', 'nombreAsesor', 'numeroCuenta', 'carrera', 'fechaInicio', 'fechaTermino'];
        return requeridos.every(id => document.getElementById(id).value.trim());
    }

    async guardarAutorizacion(datos) {
        const batch = firebase.firestore().batch();

        // Actualizar pendiente
        const pendienteRef = firebase.firestore().collection('serviciosocial').doc(this.pendienteId);
        batch.update(pendienteRef, {
            porAutorizar: 'Autorizado',
            fechaAutorizacion: firebase.firestore.Timestamp.now(),
            autorizadoPor: firebase.auth().currentUser?.email || 'admin',
            folioAsignado: datos.folioCompleto
        });

        // Crear registro en Edgar
        const edgarRef = firebase.firestore().collection('edgar').doc();
        batch.set(edgarRef, {
            folio: datos.folioCompleto,
            nombre: datos.nombreAsesor,
            carrera: datos.carrera,
            tipoAutorizacion: this.tipoDocumento,
            fecha: firebase.firestore.Timestamp.now(),
            fechaCreacion: firebase.firestore.Timestamp.now(),
            creadoPor: firebase.auth().currentUser?.email || 'admin',
            tipo: 'sica',
            importancia: 'alta',
            comentarios: `Autorización SICA: ${this.tipoDocumento}`,
            numeroCuenta: datos.numeroCuenta
        });

        await batch.commit();
    }

    mostrarExito(folio) {
        document.getElementById('folioFinal').textContent = folio;
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();

        // Configurar descarga
        document.getElementById('btnDescargar').onclick = () => this.descargarDocumento();
    }

    descargarDocumento() {
        const contenido = this.elementos.documentPage.innerHTML;
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Documento</title></head><body>${contenido}</body></html>`;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.obtenerDatosFormulario().folioCompleto}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    mostrarError(mensaje) {
        document.getElementById('mensajeError').textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalError'));
        modal.show();
    }

    formatearFecha(fechaString) {
        if (!fechaString) return '';
        return new Date(fechaString).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    formatearFechaInput(timestamp) {
        const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return fecha.toISOString().split('T')[0];
    }
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.autorizacion = new AutorizacionSICA();
    window.autorizacion.inicializar();
});

console.log('✅ Sistema de autorización cargado');