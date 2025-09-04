// autorizacion-main.js - Módulo principal para página de autorización
// Maneja la autorización individual de pendientes SICA

class AutorizacionMain {
    constructor() {
        this.db = firebase.firestore();
        this.pendienteId = null;
        this.datosOriginales = null;
        this.previewInterval = null;
        this.ultimoFolioPreview = null;
        
        this.inicializar();
    }

    async inicializar() {
        try {
            console.log('🚀 Inicializando módulo de autorización...');
            
            // Verificar autenticación
            await this.verificarAutenticacion();
            
            // Obtener ID del pendiente desde URL
            this.pendienteId = this.obtenerIdDeUrl();
            
            if (!this.pendienteId) {
                throw new Error('ID de pendiente no proporcionado');
            }
            
            // Configurar componentes base
            this.configurarComponentes();
            
            // Configurar event listeners
            this.configurarEventos();
            
            // Cargar datos del pendiente
            await this.cargarDatosPendiente();
            
            // Configurar vista previa
            this.configurarVistaPrevia();
            
            console.log('✅ Módulo de autorización inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando autorización:', error);
            this.mostrarError(error.message);
        }
    }

    async verificarAutenticacion() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout verificando autenticación'));
            }, 5000);
            
            firebase.auth().onAuthStateChanged(user => {
                clearTimeout(timeout);
                
                if (!user) {
                    window.location.href = '../login.html';
                    return;
                }
                
                console.log('✅ Usuario autenticado:', user.email);
                resolve(user);
            });
        });
    }

    obtenerIdDeUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    configurarComponentes() {
        // Configurar título y breadcrumbs
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Autorización SICA - Admin');
            window.SICAComponents.addBreadcrumbs([
                { text: 'Dashboard', link: '../index.html' },
                { text: 'Bitácora', link: 'bitacora.html' },
                { text: 'Autorización', active: true }
            ]);
        }
    }

    configurarEventos() {
        // Botón guardar
        document.getElementById('btnGuardar')?.addEventListener('click', () => {
            this.procesarAutorizacion();
        });

        // Actualizar vista previa cuando cambie el folio
        document.getElementById('folioNumber')?.addEventListener('input', () => {
            this.actualizarVistaPrevia();
        });

        // Botón refrescar vista previa
        document.getElementById('btnRefreshPreview')?.addEventListener('click', () => {
            this.actualizarVistaPrevia(true);
        });

        // Botón pantalla completa
        document.getElementById('btnFullscreen')?.addEventListener('click', () => {
            this.togglePantallaCompleta();
        });
    }

    async cargarDatosPendiente() {
        try {
            console.log('📋 Cargando datos del pendiente:', this.pendienteId);
            
            // Obtener datos del servicio social
            const servicioSocialDoc = await this.db.collection('serviciosocial')
                .doc(this.pendienteId).get();
            
            if (!servicioSocialDoc.exists) {
                throw new Error('Pendiente no encontrado');
            }
            
            const datosServicio = servicioSocialDoc.data();
            
            // Obtener datos del asesor
            let datosAsesor = null;
            if (datosServicio.asesorId) {
                try {
                    const asesorId = datosServicio.asesorId.replace('asesor_', '');
                    const asesorQuery = await this.db.collection('asesores')
                        .where('numeroCuenta', '==', asesorId).get();
                    
                    if (!asesorQuery.empty) {
                        datosAsesor = asesorQuery.docs[0].data();
                    }
                } catch (error) {
                    console.warn('⚠️ Error obteniendo asesor:', error);
                }
            }
            
            // Combinar datos
            this.datosOriginales = {
                servicioSocial: datosServicio,
                asesor: datosAsesor,
                id: this.pendienteId
            };
            
            // Mostrar datos en la interfaz
            this.mostrarDatosEnFormulario();
            
            // Obtener siguiente número de folio
            await this.configurarSiguienteFolio();
            
            // Ocultar loading y mostrar contenido
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('authContent').style.display = 'block';
            
            console.log('✅ Datos cargados correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando pendiente:', error);
            this.mostrarError(error.message);
        }
    }

    mostrarDatosEnFormulario() {
        const { servicioSocial, asesor } = this.datosOriginales;
        
        // Actualizar título según tipo de autorización
        const tipoAutorizacion = servicioSocial.tipoAutorizacion || 'Autorización SICA';
        document.getElementById('tipoAutorizacionTitle').textContent = this.formatearTipoAutorizacion(tipoAutorizacion);
        
        // Mostrar fecha de solicitud
        const fechaSolicitud = servicioSocial.fechaSolicitud?.toDate() || new Date();
        document.getElementById('fechaSolicitud').textContent = 
            `Solicitado: ${this.formatearFecha(fechaSolicitud)}`;
        
        // Datos del asesor
        if (asesor) {
            document.getElementById('nombreAsesor').value = asesor.nombreAsesor || '';
            document.getElementById('numeroCuenta').value = asesor.numeroCuenta || '';
            document.getElementById('carrera').value = asesor.carrera || '';
        }
        
        // Fechas del servicio social
        if (servicioSocial.fechaInicio) {
            document.getElementById('fechaInicio').value = 
                this.formatearFechaInput(servicioSocial.fechaInicio.toDate());
        }
        
        if (servicioSocial.fechaTermino) {
            document.getElementById('fechaTermino').value = 
                this.formatearFechaInput(servicioSocial.fechaTermino.toDate());
        }
        
        // Clave del programa
        document.getElementById('clavePrograma').value = servicioSocial.clavePrograma || '';
        
        // Calcular duración
        this.calcularDuracion();
    }

    async configurarSiguienteFolio() {
        try {
            const siguienteNumero = await this.obtenerSiguienteNumeroFolio();
            document.getElementById('folioNumber').value = siguienteNumero.toString().padStart(3, '0');
        } catch (error) {
            console.error('Error obteniendo siguiente folio:', error);
            document.getElementById('folioNumber').value = '001';
        }
    }

    async obtenerSiguienteNumeroFolio() {
        const year = new Date().getFullYear();
        const query = await this.db.collection('edgar')
            .where('folio', '>=', `CI/001/${year}`)
            .where('folio', '<=', `CI/999/${year}`)
            .orderBy('folio', 'desc')
            .limit(1)
            .get();
        
        if (query.empty) {
            return 1;
        }
        
        const ultimoFolio = query.docs[0].data().folio;
        const numero = parseInt(ultimoFolio.match(/CI\/(\d+)\/\d{4}/)[1]);
        return numero + 1;
    }

    calcularDuracion() {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaTermino = document.getElementById('fechaTermino').value;
        
        if (fechaInicio && fechaTermino) {
            const inicio = new Date(fechaInicio);
            const termino = new Date(fechaTermino);
            const meses = Math.round((termino - inicio) / (1000 * 60 * 60 * 24 * 30));
            
            document.getElementById('duracionServicio').textContent = 
                `Duración: ${meses} meses`;
        }
    }

    // ==========================================
    // VISTA PREVIA
    // ==========================================

    configurarVistaPrevia() {
        // Actualizar vista previa inicial
        this.actualizarVistaPrevia();
        
        // Configurar actualización automática cada 2 segundos si hay cambios
        this.previewInterval = setInterval(() => {
            const folioActual = document.getElementById('folioNumber').value;
            if (this.ultimoFolioPreview !== folioActual) {
                this.actualizarVistaPrevia();
                this.ultimoFolioPreview = folioActual;
            }
        }, 2000);
    }

    async actualizarVistaPrevia(forzar = false) {
        const previewContainer = document.getElementById('documentPreview');
        
        if (!forzar && previewContainer.querySelector('.preview-content')) {
            // Solo actualizar si el folio cambió
            const folioActual = this.obtenerFolioCompleto();
            if (this.ultimoFolioPreview === folioActual) {
                return;
            }
        }
        
        // Mostrar loading
        previewContainer.innerHTML = `
            <div class="preview-loading text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <p class="text-muted">Generando vista previa...</p>
            </div>
        `;
        
        try {
            const htmlContent = await this.generarVistaPrevia();
            
            previewContainer.innerHTML = `
                <div class="preview-content">
                    ${htmlContent}
                </div>
            `;
            
            this.ultimoFolioPreview = this.obtenerFolioCompleto();
            
        } catch (error) {
            console.error('Error generando vista previa:', error);
            previewContainer.innerHTML = `
                <div class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle display-4 mb-3"></i>
                    <p>Error generando vista previa</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="autorizacionMain.actualizarVistaPrevia(true)">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    async generarVistaPrevia() {
        const datos = this.obtenerDatosParaDocumento();
        const tipoDoc = this.datosOriginales.servicioSocial.tipoAutorizacion;
        
        // Generar HTML según tipo de documento
        switch (tipoDoc) {
            case 'carta-aceptacion-FQ':
                return this.generarPreviewCartaAceptacionFQ(datos);
            case 'carta-aceptacion-prepa':
                return this.generarPreviewCartaAceptacionPrepa(datos);
            case 'carta-termino-FQ':
                return this.generarPreviewCartaTerminoFQ(datos);
            case 'carta-termino-prepa':
                return this.generarPreviewCartaTerminoPrepa(datos);
            default:
                return '<p class="text-center text-muted py-5">Tipo de documento no reconocido</p>';
        }
    }

    generarPreviewCartaAceptacionFQ(datos) {
        return `
            <div class="document-header">
                <div class="logo-placeholder">
                    <div>LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h2>FACULTAD DE QUÍMICA UNAM</h2>
                    <p><strong>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</strong></p>
                    <p><strong>CENTRO DE INFORMÁTICA Y SICAS</strong></p>
                </div>
            </div>
            
            <div class="text-end mb-3">
                <p><strong>FOLIO: ${datos.folio}</strong></p>
                <p><strong>Asunto: Carta de aceptación.</strong></p>
            </div>
            
            <div class="mb-4">
                <p><strong>MVZ GRISELL MORENO MORALES</strong><br>
                <strong>COORDINADORA</strong><br>
                <strong>FACULTAD DE QUÍMICA</strong><br>
                <strong>PRESENTE</strong></p>
            </div>
            
            <p class="text-justify">
                Por este conducto me permito informar a usted, que el alumno (a) 
                <strong>${datos.nombreAsesor}</strong>, con número de cuenta 
                <strong>${datos.numeroCuenta}</strong>, inscrito en la 
                <strong>${datos.carrera}</strong>, ha sido aceptado para poder realizar 
                su servicio social, durante un periodo de <strong>6</strong> meses, 
                en el programa de trabajo "<strong>Sala de informática y cómputo para alumnos (SICA)</strong>" 
                con clave <strong>${datos.clavePrograma}</strong>.
            </p>
            
            <p class="text-center mt-4">
                <strong>ATENTAMENTE</strong><br>
                <em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em>
            </p>
            
            <div class="text-center mt-5">
                <p>Cd. Universitaria, CDMX a ${this.formatearFecha(new Date())}.</p>
            </div>
        `;
    }

    generarPreviewCartaAceptacionPrepa(datos) {
        return `
            <div class="document-header">
                <div class="logo-placeholder">
                    <div>LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h2>FACULTAD DE QUÍMICA</h2>
                    <p><strong>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</strong></p>
                    <p><strong>CENTRO DE INFORMÁTICA</strong></p>
                </div>
            </div>
            
            <div class="text-end mb-3">
                <p><strong>FOLIO: ${datos.folio}</strong></p>
                <p>Ciudad de México a ${this.formatearFecha(new Date())}</p>
                <p><strong>Asunto: Carta de aceptación Servicio Social.</strong></p>
            </div>
            
            <div class="mb-4">
                <p><strong>MTRA. ADANELY PÉREZ RODRÍGUEZ</strong><br>
                <strong>COORDINADORA GENERAL DE LOS ESTUDIOS TÉCNICOS<br>
                ESPECIALIZADOS DE LA ESCUELA NACIONAL PREPARATORIA</strong><br>
                <strong>PRESENTE</strong></p>
            </div>
            
            <p class="text-justify">
                Por este conducto me permito informar a usted, que el alumno (a) 
                <strong>${datos.nombreAsesor}</strong>, con número de cuenta, 
                <strong>${datos.numeroCuenta}</strong> inscrito en la 
                <strong>${datos.carrera || 'xxxxxxxx'}</strong>, ha sido aceptado 
                para poder concluir su servicio social, durante un periodo de 
                <strong>6</strong> meses.
            </p>
            
            <p class="text-center mt-4">
                <strong>ATENTAMENTE</strong><br>
                <em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em>
            </p>
        `;
    }

    generarPreviewCartaTerminoFQ(datos) {
        return `
            <div class="document-header">
                <div class="logo-placeholder">
                    <div>LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h2>FACULTAD DE QUÍMICA UNAM</h2>
                    <p><strong>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</strong></p>
                    <p><strong>CENTRO DE INFORMÁTICA Y SICAS</strong></p>
                </div>
            </div>
            
            <div class="text-end mb-3">
                <p><strong>FOLIO: ${datos.folio}</strong></p>
                <p><strong>Asunto: Carta de término</strong></p>
            </div>
            
            <p class="text-justify">
                Por este conducto me permito informar a usted, que el alumno (a) 
                <strong>${datos.nombreAsesor}</strong>, con número de cuenta 
                <strong>${datos.numeroCuenta}</strong>, de la Licenciatura en 
                <strong>${datos.carrera}</strong> concluyó satisfactoriamente su 
                Servicio Social, cumpliendo las <strong>480</strong> horas reglamentarias.
            </p>
            
            <div class="mt-4">
                <h6><strong>ACTIVIDADES DESARROLLADAS</strong></h6>
                <ul>
                    <li>Préstamo de equipos de cómputo a los alumnos</li>
                    <li>Atención al servicio de impresiones</li>
                    <li>Apoyo en departamentales</li>
                    <li>Apoyo en cursos y clases en sala de cómputo</li>
                    <li>Atención a usuarios con problemas en equipos</li>
                </ul>
            </div>
            
            <p class="text-center mt-4">
                <strong>ATENTAMENTE</strong><br>
                <em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em>
            </p>
        `;
    }

    generarPreviewCartaTerminoPrepa(datos) {
        return `
            <div class="document-header">
                <div class="logo-placeholder">
                    <div>LOGO<br>FQ</div>
                </div>
                <div class="header-text">
                    <h2>FACULTAD DE QUÍMICA</h2>
                    <p><strong>SECRETARÍA DE PLANEACIÓN E INFORMÁTICA</strong></p>
                    <p><strong>CENTRO DE INFORMÁTICA</strong></p>
                </div>
            </div>
            
            <div class="text-end mb-3">
                <p><strong>FOLIO: ${datos.folio}</strong></p>
                <p>Ciudad de México a ${this.formatearFecha(new Date())}</p>
                <p><strong>Asunto: Carta de término de Servicio Social.</strong></p>
            </div>
            
            <div class="mb-4">
                <p><strong>MTRA. ADANELY PÉREZ RODRÍGUEZ</strong><br>
                <strong>COORDINADORA GENERAL DE LOS ESTUDIOS TÉCNICOS<br>
                ESPECIALIZADOS DE LA ESCUELA NACIONAL PREPARATORIA</strong><br>
                <strong>PRESENTE</strong></p>
            </div>
            
            <p class="text-justify">
                Por este conducto me permito informar a usted, que el alumno (a) 
                <strong>${datos.nombreAsesor}</strong> con número de cuenta 
                <strong>${datos.numeroCuenta}</strong>, inscrito en la 
                <strong>${datos.carrera || 'XXXXXX'}</strong>, ha concluido 
                satisfactoriamente su servicio social, cubriendo <strong>480</strong> 
                horas totales.
            </p>
            
            <p class="text-center mt-4">
                <strong>ATENTAMENTE</strong><br>
                <em>"POR MI RAZA HABLARÁ EL ESPÍRITU"</em>
            </p>
        `;
    }

    // ==========================================
    // PROCESAMIENTO DE AUTORIZACIÓN
    // ==========================================

    async procesarAutorizacion() {
        const btnGuardar = document.getElementById('btnGuardar');
        const textoOriginal = btnGuardar.innerHTML;
        
        try {
            // Mostrar loading
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Procesando...';
            btnGuardar.disabled = true;
            
            // Validar datos
            if (!this.validarDatos()) {
                return;
            }
            
            // Obtener datos para autorización
            const datosAutorizacion = this.obtenerDatosParaDocumento();
            
            // Generar PDF
            console.log('📄 Generando documento PDF...');
            await this.generarDocumentoPDF(datosAutorizacion);
            
            // Actualizar base de datos
            console.log('💾 Actualizando base de datos...');
            await this.actualizarBaseDatos(datosAutorizacion);
            
            // Mostrar éxito
            this.mostrarExito(datosAutorizacion.folio);
            
            console.log('✅ Autorización completada exitosamente');
            
        } catch (error) {
            console.error('❌ Error procesando autorización:', error);
            this.mostrarNotificacion(
                'Error en Autorización',
                error.message || 'No se pudo completar la autorización',
                'error'
            );
        } finally {
            // Restaurar botón
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    }

    validarDatos() {
        const folioNumber = document.getElementById('folioNumber').value;
        
        if (!folioNumber || parseInt(folioNumber) < 1 || parseInt(folioNumber) > 999) {
            this.mostrarNotificacion(
                'Folio inválido',
                'El número de folio debe estar entre 001 y 999',
                'warning'
            );
            return false;
        }
        
        if (!this.datosOriginales.asesor) {
            this.mostrarNotificacion(
                'Datos incompletos',
                'No se encontraron datos completos del asesor',
                'warning'
            );
            return false;
        }
        
        return true;
    }

    obtenerDatosParaDocumento() {
        const folioCompleto = this.obtenerFolioCompleto();
        const { servicioSocial, asesor } = this.datosOriginales;
        
        return {
            folio: folioCompleto,
            folioAceptacion: servicioSocial.tipoAutorizacion.includes('aceptacion') ? folioCompleto : null,
            folioTermino: servicioSocial.tipoAutorizacion.includes('termino') ? folioCompleto : null,
            nombreAsesor: asesor.nombreAsesor || '',
            numeroCuenta: asesor.numeroCuenta || '',
            carrera: asesor.carrera || '',
            fechaInicio: servicioSocial.fechaInicio?.toDate(),
            fechaTermino: servicioSocial.fechaTermino?.toDate(),
            clavePrograma: servicioSocial.clavePrograma || '',
            tipoAutorizacion: servicioSocial.tipoAutorizacion,
            programa: 'Sala de informática y cómputo para alumnos (SICA)',
            fechaAceptacion: new Date(),
            fechaCarta: new Date()
        };
    }

    async generarDocumentoPDF(datos) {
        const tipoDoc = datos.tipoAutorizacion;
        
        switch (tipoDoc) {
            case 'carta-aceptacion-FQ':
                if (window.generarCartaAceptacionFQPDF) {
                    await window.generarCartaAceptacionFQPDF(datos);
                } else {
                    throw new Error('Generador de carta FQ no disponible');
                }
                break;
                
            case 'carta-aceptacion-prepa':
                if (window.generarCartaAceptacionPrepaPDF) {
                    await window.generarCartaAceptacionPrepaPDF(datos);
                } else {
                    throw new Error('Generador de carta Prepa no disponible');
                }
                break;
                
            case 'carta-termino-FQ':
                if (window.generarCartaTerminoFQPDF) {
                    await window.generarCartaTerminoFQPDF(datos);
                } else {
                    throw new Error('Generador de carta término FQ no disponible');
                }
                break;
                
            case 'carta-termino-prepa':
                if (window.generarCartaTerminoPrepaPDF) {
                    await window.generarCartaTerminoPrepaPDF(datos);
                } else {
                    throw new Error('Generador de carta término Prepa no disponible');
                }
                break;
                
            default:
                throw new Error(`Tipo de documento no soportado: ${tipoDoc}`);
        }
    }

    async actualizarBaseDatos(datosAutorizacion) {
        const batch = this.db.batch();
        
        // 1. Actualizar servicio social
        const servicioSocialRef = this.db.collection('serviciosocial').doc(this.pendienteId);
        const updateData = {
            porAutorizar: 'Autorizado',
            fechaAutorizacion: firebase.firestore.Timestamp.now(),
            autorizadoPor: firebase.auth().currentUser?.email || 'admin'
        };
        
        // Agregar folio según tipo
        if (datosAutorizacion.tipoAutorizacion.includes('aceptacion')) {
            updateData.folioAceptacion = datosAutorizacion.folio;
        } else if (datosAutorizacion.tipoAutorizacion.includes('termino')) {
            updateData.folioTermino = datosAutorizacion.folio;
        }
        
        batch.update(servicioSocialRef, updateData);
        
        // 2. Crear registro en Edgar
        const edgarRef = this.db.collection('edgar').doc();
        batch.set(edgarRef, {
            folio: datosAutorizacion.folio,
            nombre: datosAutorizacion.nombreAsesor,
            carrera: datosAutorizacion.carrera,
            tipoAutorizacion: datosAutorizacion.tipoAutorizacion,
            fecha: firebase.firestore.Timestamp.now(),
            fechaCreacion: firebase.firestore.Timestamp.now(),
            creadoPor: firebase.auth().currentUser?.email || 'admin',
            tipo: 'sica',
            importancia: 'alta',
            comentarios: `Autorización SICA: ${this.formatearTipoAutorizacion(datosAutorizacion.tipoAutorizacion)}`,
            numeroCuenta: datosAutorizacion.numeroCuenta
        });
        
        await batch.commit();
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    obtenerFolioCompleto() {
        const numero = document.getElementById('folioNumber').value.padStart(3, '0');
        const año = new Date().getFullYear();
        return `CI/${numero}/${año}`;
    }

    formatearTipoAutorizacion(tipo) {
        const tipos = {
            'carta-aceptacion-FQ': 'Carta de Aceptación - Facultad de Química',
            'carta-aceptacion-prepa': 'Carta de Aceptación - Preparatoria',
            'carta-termino-FQ': 'Carta de Término - Facultad de Química',
            'carta-termino-prepa': 'Carta de Término - Preparatoria'
        };
        
        return tipos[tipo] || tipo;
    }

    formatearFecha(fecha) {
        if (!fecha) return '';
        
        const f = new Date(fecha);
        return f.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatearFechaInput(fecha) {
        if (!fecha) return '';
        
        const f = new Date(fecha);
        return f.toISOString().split('T')[0];
    }

    togglePantallaCompleta() {
        const previewCard = document.querySelector('.preview-card');
        const btn = document.getElementById('btnFullscreen');
        
        if (previewCard.classList.contains('fullscreen')) {
            previewCard.classList.remove('fullscreen');
            btn.innerHTML = '<i class="bi bi-fullscreen"></i>';
        } else {
            previewCard.classList.add('fullscreen');
            btn.innerHTML = '<i class="bi bi-fullscreen-exit"></i>';
        }
    }

    mostrarError(mensaje) {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authContent').style.display = 'none';
        document.getElementById('errorScreen').style.display = 'block';
        document.getElementById('errorMessage').textContent = mensaje;
    }

    mostrarExito(folio) {
        document.getElementById('folioAsignado').textContent = folio;
        const modal = new bootstrap.Modal(document.getElementById('successModal'));
        modal.show();
    }

    mostrarNotificacion(titulo, mensaje, tipo = 'info') {
        if (window.SICAComponents) {
            const iconos = {
                success: 'bi-check-circle-fill',
                error: 'bi-x-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };
            
            window.SICAComponents.notify(titulo, mensaje, tipo, iconos[tipo]);
        } else {
            alert(`${titulo}: ${mensaje}`);
        }
    }

    // Cleanup al salir
    destruir() {
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
    }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

// Instancia global
window.autorizacionMain = new AutorizacionMain();

// Cleanup al salir
window.addEventListener('beforeunload', () => {
    if (window.autorizacionMain) {
        window.autorizacionMain.destruir();
    }
});

// Verificar autenticación de Firebase
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        window.location.href = '../login.html';
        return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
});

console.log('✅ Módulo AutorizacionMain cargado correctamente');