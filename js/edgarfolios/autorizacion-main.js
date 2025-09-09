// autorizacion-nuevo.js - Sistema de autorización usando plantillas JS

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

        // Campos del formulario (sin actividades)
        const campos = ['folioNumber', 'nombreAsesor', 'numeroCuenta', 'carrera', 
                       'fechaInicio', 'fechaTermino', 'clavePrograma'];
        
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
            const [asesorPart, numeroCuenta, tipoAutorizacion] = this.pendienteId.split('_');
            const servicioId = `${asesorPart}_${numeroCuenta}`;
            
            const doc = await firebase.firestore()
                .collection('serviciosocial')
                .doc(servicioId)
                .get();

            if (!doc.exists) {
                throw new Error('Documento de servicio social no encontrado');
            }

            const servicioData = doc.data();
            
            if (!servicioData.solicitudesAutorizacion || 
                !servicioData.solicitudesAutorizacion[tipoAutorizacion] ||
                servicioData.solicitudesAutorizacion[tipoAutorizacion].estado !== 'Pendiente') {
                throw new Error('Solicitud no encontrada o ya no está pendiente');
            }

            const solicitud = servicioData.solicitudesAutorizacion[tipoAutorizacion];
            this.tipoDocumento = tipoAutorizacion;

            await this.cargarDatosAsesor(numeroCuenta);

            // Poblar solo los campos editables
            this.poblarFormulario({
                tipoAutorizacion: tipoAutorizacion,
                fechaSolicitud: solicitud.fechaSolicitud,
                usuarioSolicita: solicitud.usuarioSolicita,
                fechaInicio: servicioData.fechaInicio,
                fechaTermino: servicioData.fechaTermino
            });

            this.actualizarTituloDocumento();
            this.actualizarFechaSolicitud(solicitud.fechaSolicitud);
            this.actualizarVistaPrevia();

        } catch (error) {
            throw new Error(`Error cargando pendiente: ${error.message}`);
        }
    }

    async cargarDatosAsesor(numeroCuenta) {
        try {
            const query = await firebase.firestore()
                .collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .get();

            if (!query.empty) {
                const asesor = query.docs[0].data();
                document.getElementById('nombreAsesor').value = asesor.nombreAsesor || '';
                document.getElementById('numeroCuenta').value = asesor.numeroCuenta || '';
                document.getElementById('carrera').value = asesor.carrera || '';
            } else {
                console.warn('Asesor no encontrado para número de cuenta:', numeroCuenta);
            }
        } catch (error) {
            console.warn('Error cargando asesor:', error);
        }
    }

    poblarFormulario(datos) {
        // Obtener siguiente número de folio
        this.obtenerSiguienteNumeroFolio();

        // Fechas del servicio social
        if (datos.fechaInicio) {
            document.getElementById('fechaInicio').value = datos.fechaInicio;
        }
        
        if (datos.fechaTermino) {
            document.getElementById('fechaTermino').value = datos.fechaTermino;
        }

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
        let titulo = '';
        switch (this.tipoDocumento) {
            case 'carta-aceptacion-fq':
                titulo = 'Carta de Aceptación - Facultad de Química';
                break;
            case 'carta-aceptacion-prepa':
                titulo = 'Carta de Aceptación - Preparatoria';
                break;
            case 'carta-termino-fq':
                titulo = 'Carta de Término - Facultad de Química';
                break;
            case 'carta-termino-prepa':
                titulo = 'Carta de Término - Preparatoria';
                break;
            default:
                titulo = 'Documento de Autorización';
        }
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

    async actualizarVistaPrevia() {
        const datos = this.obtenerDatosFormulario();
        
        if (!datos.nombreAsesor || !datos.folioCompleto) {
            this.mostrarCargandoDocumento();
            return;
        }

        let contenidoHTML = '';
        
        try {
            // Usar la clase JS correspondiente como plantilla
            switch (this.tipoDocumento) {
                case 'carta-aceptacion-fq':
                    contenidoHTML = await this.generarVistaDesdeJS('CartaAceptacionFQPDF', datos);
                    break;
                    
                case 'carta-aceptacion-prepa':
                    contenidoHTML = await this.generarVistaDesdeJS('CartaAceptacionPrepaPDF', datos);
                    break;
                    
                case 'carta-termino-fq':
                    contenidoHTML = await this.generarVistaDesdeJS('CartaTerminoFQPDF', datos);
                    break;
                    
                case 'carta-termino-prepa':
                    contenidoHTML = await this.generarVistaDesdeJS('CartaTerminoPrepaPDF', datos);
                    break;
                    
                default:
                    contenidoHTML = '<p>Tipo de documento no reconocido</p>';
            }
            
        } catch (error) {
            console.error('Error generando vista previa:', error);
            contenidoHTML = '<p>Error generando vista previa</p>';
        }

        this.elementos.documentPage.innerHTML = `
            <div class="document-content">
                ${contenidoHTML}
            </div>
        `;
    }

    async generarVistaDesdeJS(claseNombre, datos) {
        try {
            const ClaseJS = window[claseNombre];
            if (!ClaseJS) {
                throw new Error(`Clase ${claseNombre} no encontrada`);
            }
            
            const generador = new ClaseJS();
            
            // Usar la configuración del JS pero generar HTML para vista previa
            return this.convertirJSaHTML(generador, datos);
            
        } catch (error) {
            console.error(`Error usando clase ${claseNombre}:`, error);
            return `<p>Error cargando plantilla: ${error.message}</p>`;
        }
    }

convertirJSaHTML(generador, datos) {
    const config = generador.config;
    
    // Obtener actividades si existen
    let seccionActividades = '';
    if (config.actividades && config.actividades.length > 0) {
        const actividadesHTML = config.actividades.map(act => `<li>${act}</li>`).join('');
        const tituloActividades = this.tipoDocumento.includes('aceptacion') ? 
            'ACTIVIDADES A DESARROLLAR' : 'ACTIVIDADES DESARROLLADAS';
        
        seccionActividades = `
            <div class="activities-section">
                <p><strong>${tituloActividades}</strong></p>
                <ul class="activities-list">
                    ${actividadesHTML}
                </ul>
            </div>
        `;
    }

    // Usar el texto completo según el tipo específico
    let textoTrincipal = '';
    
    if (this.tipoDocumento === 'carta-aceptacion-fq') {
        const programa = datos.programa || config.programa || "Sala de informática y cómputo para alumnos (SICA)";
        const periodoMeses = config.periodoMeses || 6;
        const horasSemanales = config.horasSemanales || 20;
        const horasReglamentarias = config.horasReglamentarias || 480;
        
        textoTrincipal = `Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong>, con número de cuenta <strong>${datos.numeroCuenta}</strong>, inscrito en la <strong>${datos.carrera}</strong>, ha sido aceptado para poder realizar su servicio social, durante un periodo de <strong>${periodoMeses} meses</strong>, en el programa de trabajo "<strong>${programa}</strong>" con clave <strong>${datos.clavePrograma}</strong>. Su colaboración tendrá inicio a partir del <strong>${this.formatearFecha(datos.fechaInicio)}</strong> y concluirá el <strong>${this.formatearFecha(datos.fechaTermino)}</strong>, cubriendo un total de <strong>${horasSemanales} horas</strong> a la semana y <strong>${horasReglamentarias} horas</strong> totales.`;
        
    } else if (this.tipoDocumento === 'carta-aceptacion-prepa') {
        const programa = datos.programa || config.programa || "Sala de informática y cómputo para alumnos (SICA)";
        const periodoMeses = config.periodoMeses || 6;
        const horasReglamentarias = config.horasReglamentarias || 480;
        
        textoTrincipal = `Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong>, con número de cuenta, <strong>${datos.numeroCuenta}</strong> inscrito en la <strong>${datos.carrera || "xxxxxxxx"}</strong>, ha sido aceptado para poder concluir su servicio social, durante un periodo de <strong>${periodoMeses} meses</strong>, en el programa de trabajo "<strong>${programa}</strong>" con clave <strong>${datos.clavePrograma}</strong>, que se llevará a cabo en las salas SICA de la facultad de Química UNAM, su colaboración tendrá inicio a partir del <strong>${this.formatearFecha(datos.fechaInicio)}</strong> y concluirá el <strong>${this.formatearFecha(datos.fechaTermino)}</strong>, en un horario de 9:00 a 13:00, cubriendo <strong>${horasReglamentarias} horas</strong> totales.`;
        
    } else if (this.tipoDocumento === 'carta-termino-fq') {
        const programa = datos.programa || config.programa || "Sala de Informática y Cómputo para Alumnos (SICA)";
        const horasReglamentarias = config.horasReglamentarias || 480;
        
        textoTrincipal = `Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong>, con número de cuenta <strong>${datos.numeroCuenta}</strong>, de la Licenciatura en <strong>${datos.carrera}</strong> concluyó satisfactoriamente su Servicio Social, cumpliendo las <strong>${horasReglamentarias} horas reglamentarias</strong>, en el programa "<strong>${programa}</strong>" con clave <strong>${datos.clavePrograma}</strong>, en el periodo comprendido del <strong>${this.formatearFecha(datos.fechaInicio)}</strong> al <strong>${this.formatearFecha(datos.fechaTermino)}</strong>, cumpliendo las siguientes actividades:`;
        
    } else if (this.tipoDocumento === 'carta-termino-prepa') {
        const programa = datos.programa || config.programa || "Sala de informática y cómputo para alumnos (SICA)";
        const periodoMeses = config.periodoMeses || 6;
        const horasReglamentarias = config.horasReglamentarias || 480;
        
        textoTrincipal = `Por este conducto me permito informar a usted, que el alumno (a) <strong>${datos.nombreAsesor}</strong> con número de cuenta <strong>${datos.numeroCuenta}</strong>, inscrito en la <strong>${datos.carrera || "XXXXXX"}</strong>, ha concluido satisfactoriamente su servicio social, durante un periodo de <strong>${periodoMeses} meses</strong>, en el programa de trabajo "<strong>${programa}</strong>" con clave <strong>${datos.clavePrograma}</strong>, que se llevó a cabo en el área de SICA de la Facultad de Química UNAM, su colaboración en el periodo comprendido del <strong>${this.formatearFecha(datos.fechaInicio)}</strong> al <strong>${this.formatearFecha(datos.fechaTermino)}</strong>, en un horario de 9:00 a 13:00, cubriendo <strong>${horasReglamentarias} horas</strong> totales.`;
    }

    // Generar contenido según tipo de carta
    const asunto = this.tipoDocumento.includes('aceptacion') ? 
        'Carta de aceptación' : 'Carta de término';

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
            <strong>Asunto: ${asunto}</strong>
        </div>
        
        <div class="document-body">
            <p>${textoTrincipal}</p>
            
            ${seccionActividades}
            
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

obtenerDatosFormulario() {
    const folioNum = document.getElementById('folioNumber').value.padStart(3, '0');
    const year = new Date().getFullYear();
    
    return {
        folioCompleto: `CI/${folioNum}/${year}`,
        folioAceptacion: `CI/${folioNum}/${year}`, // Para compatibilidad
        folioTermino: `CI/${folioNum}/${year}`, // Para compatibilidad
        nombreAsesor: document.getElementById('nombreAsesor').value,
        numeroCuenta: document.getElementById('numeroCuenta').value,
        carrera: document.getElementById('carrera').value,
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaTermino: document.getElementById('fechaTermino').value,
        clavePrograma: document.getElementById('clavePrograma').value,
        programa: "Sala de informática y cómputo para alumnos (SICA)", // Valor por defecto
        fechaHoy: new Date().toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        }),
        tipoDocumento: this.tipoDocumento
    };
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
        return requeridos.every(id => {
            const elemento = document.getElementById(id);
            return elemento && elemento.value.trim();
        });
    }

    async guardarAutorizacion(datos) {
        const [asesorPart, numeroCuenta, tipoAutorizacion] = this.pendienteId.split('_');
        const servicioId = `${asesorPart}_${numeroCuenta}`;
        
        const batch = firebase.firestore().batch();

        // Actualizar estructura anidada del documento de servicio social
        const servicioRef = firebase.firestore().collection('serviciosocial').doc(servicioId);
        
        const campoEstado = `solicitudesAutorizacion.${tipoAutorizacion}.estado`;
        const campoFechaProcesamiento = `solicitudesAutorizacion.${tipoAutorizacion}.fechaProcesamiento`;
        const campoAutorizadoPor = `solicitudesAutorizacion.${tipoAutorizacion}.autorizadoPor`;
        const campoFolioAsignado = `solicitudesAutorizacion.${tipoAutorizacion}.folioAsignado`;
        
        const camposActualizacion = {};
        camposActualizacion[campoEstado] = 'Autorizado';
        camposActualizacion[campoFechaProcesamiento] = firebase.firestore.Timestamp.now();
        camposActualizacion[campoAutorizadoPor] = firebase.auth().currentUser?.email || 'admin';
        camposActualizacion[campoFolioAsignado] = datos.folioCompleto;
        
        batch.update(servicioRef, camposActualizacion);

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
            numeroCuenta: datos.numeroCuenta,
            asesorId: servicioId
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

async descargarDocumento() {
    try {
        const datos = this.obtenerDatosFormulario();
        
        // Usar la clase JS correspondiente para generar PDF
        switch (this.tipoDocumento) {
            case 'carta-aceptacion-fq':
                if (window.generarCartaAceptacionFQPDF) {
                    await window.generarCartaAceptacionFQPDF(datos);
                }
                break;
                
            case 'carta-aceptacion-prepa':
                if (window.generarCartaAceptacionPrepaPDF) {
                    await window.generarCartaAceptacionPrepaPDF(datos);
                }
                break;
                
            case 'carta-termino-fq':
                if (window.generarCartaTerminoFQPDF) {
                    await window.generarCartaTerminoFQPDF(datos);
                }
                break;
                
            case 'carta-termino-prepa':
                if (window.generarCartaTerminoPrepaPDF) {
                    await window.generarCartaTerminoPrepaPDF(datos);
                }
                break;
                
            default:
                throw new Error('Tipo de documento no soportado para PDF');
        }
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        this.mostrarError('Error generando PDF: ' + error.message);
    }
}

    mostrarError(mensaje) {
        document.getElementById('mensajeError').textContent = mensaje;
        const modal = new bootstrap.Modal(document.getElementById('modalError'));
        modal.show();
    }

formatearFecha(fechaString) {
    if (!fechaString) return '';
    
    // Crear fecha sin problemas de zona horaria
    const [year, month, day] = fechaString.split('-').map(Number);
    const fecha = new Date(year, month - 1, day); // Los meses van de 0-11
    
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `${dia} de ${mes} de ${año}`;
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

console.log('✅ Sistema de autorización cargado (usando plantillas JS)');