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

        // Detectar si es modo edición de folio autorizado
        const urlParams = new URLSearchParams(window.location.search);
        this.modoEdicion = urlParams.get('edit') === 'true';
        this.folioId = urlParams.get('folioId');
        
        console.log('📋 Modo detección:', { 
            modoEdicion: this.modoEdicion, 
            folioId: this.folioId, 
            pendienteId: this.pendienteId 
        });

        await this.verificarAutenticacion();
        this.configurarEventListeners();
        
        // Cargar datos según el modo
        if (this.modoEdicion && this.folioId) {
            console.log('📝 Modo edición: Cargando folio autorizado');
            await this.cargarDatosFolioAutorizado();
        } else {
            console.log('📋 Modo normal: Cargando pendiente');
            await this.cargarDatosPendiente();
        }
        
        this.configurarActualizacionTiempoReal();
        
        // Ocultar loading
        this.elementos.loadingScreen.style.display = 'none';
        
        console.log('✅ Sistema inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        this.mostrarError(error.message);
    }
}

async cargarDatosFolioAutorizado() {
    try {
        console.log('📄 Cargando folio autorizado para edición:', this.folioId);
        
        // Obtener datos del folio desde la colección Edgar
        const folio = await firebase.firestore()
            .collection('edgar')
            .doc(this.folioId)
            .get();
            
        if (!folio.exists) {
            throw new Error('Folio no encontrado');
        }
        
        const folioData = folio.data();
        console.log('📋 Datos del folio cargado:', folioData);
        
        // Guardar datos del folio para sincronización posterior
        this.folioAutorizado = folioData;
        
        // Extraer tipo de documento del folio
        this.tipoDocumento = folioData.tipoAutorizacion;
        
        // Cargar datos del asesor si existe numeroCuenta
        if (folioData.numeroCuenta) {
            await this.cargarDatosAsesor(folioData.numeroCuenta);
        }
        
        // Poblar formulario con datos del folio
        await this.poblarFormularioDesdeEdgar(folioData);
        
        this.actualizarTituloDocumento();
        
        // Mostrar información de que es modo edición
        if (this.elementos.fechaSolicitud) {
            const fechaCreacion = folioData.fechaCreacion?.toDate?.() || folioData.fecha?.toDate?.();
            this.elementos.fechaSolicitud.textContent = 
                `Autorizado: ${fechaCreacion ? fechaCreacion.toLocaleDateString('es-ES') : 'N/A'}`;
        }
        
        this.actualizarVistaPrevia();
        
        // Cambiar el botón de "Autorizar" a "Actualizar"
        if (this.elementos.btnAutorizar) {
            this.elementos.btnAutorizar.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar Documento';
            this.elementos.btnAutorizar.classList.remove('btn-success');
            this.elementos.btnAutorizar.classList.add('btn-warning');
        }
        
    } catch (error) {
        throw new Error(`Error cargando folio autorizado: ${error.message}`);
    }
}

async poblarFormularioDesdeEdgar(folioData) {
    try {
        // Extraer número de folio
        const folioMatch = folioData.folio.match(/CI\/(\d+)\/\d{4}/);
        if (folioMatch) {
            document.getElementById('folioNumber').value = folioMatch[1];
        }
        
        // Poblar campos básicos directamente desde el folio
        if (folioData.nombre) {
            document.getElementById('nombreAsesor').value = folioData.nombre;
        }
        if (folioData.numeroCuenta) {
            document.getElementById('numeroCuenta').value = folioData.numeroCuenta;
        }
        if (folioData.carrera) {
            document.getElementById('carrera').value = folioData.carrera;
        }
        
        // Para las fechas, necesitamos obtenerlas del documento de servicio social
        // ya que Edgar solo guarda los datos básicos
        if (folioData.asesorId) {
            try {
                const servicioDoc = await firebase.firestore()
                    .collection('serviciosocial')
                    .doc(folioData.asesorId)
                    .get();
                    
                if (servicioDoc.exists) {
                    const servicioData = servicioDoc.data();
                    if (servicioData.fechaInicio) {
                        document.getElementById('fechaInicio').value = servicioData.fechaInicio;
                    }
                    if (servicioData.fechaTermino) {
                        document.getElementById('fechaTermino').value = servicioData.fechaTermino;
                    }
                }
            } catch (error) {
                console.warn('No se pudieron cargar fechas del servicio social:', error);
                // Usar fechas por defecto si no se pueden obtener
                this.establecerFechasPorDefecto();
            }
        } else {
            this.establecerFechasPorDefecto();
        }
        
        // Generar clave de programa por defecto si no existe
        if (!document.getElementById('clavePrograma').value) {
            document.getElementById('clavePrograma').value = 'SICA-' + new Date().getFullYear();
        }
        
        this.calcularDuracion();
        
    } catch (error) {
        console.error('Error poblando formulario desde Edgar:', error);
        throw error;
    }
}

// Método auxiliar para establecer fechas por defecto
establecerFechasPorDefecto() {
    const hoy = new Date();
    const inicioDefecto = new Date(hoy.getFullYear(), 0, 1); // 1 enero del año actual
    const finDefecto = new Date(hoy.getFullYear(), 5, 30);   // 30 junio del año actual
    
    document.getElementById('fechaInicio').value = inicioDefecto.toISOString().split('T')[0];
    document.getElementById('fechaTermino').value = finDefecto.toISOString().split('T')[0];
}

// ===================================================
// SINCRONIZACIÓN CON SERVICIOSOCIAL
// ===================================================

async sincronizarConServicioSocial(datosActualizados, asesorId) {
    try {
        console.log('🔄 Sincronizando cambios con serviciosocial...');
        
        if (!asesorId) {
            console.warn('⚠️ No se proporcionó asesorId para sincronización');
            return;
        }
        
        // Buscar el documento en serviciosocial
        const servicioSocialRef = firebase.firestore()
            .collection('serviciosocial')
            .doc(asesorId);
        
        const doc = await servicioSocialRef.get();
        
        if (doc.exists) {
            // Campos que se pueden actualizar en serviciosocial
            const camposActualizables = {
                nombreAsesor: datosActualizados.nombreAsesor,
                numeroCuenta: datosActualizados.numeroCuenta,
                carrera: datosActualizados.carrera,
                fechaInicio: datosActualizados.fechaInicio,
                fechaTermino: datosActualizados.fechaTermino,
                clavePrograma: datosActualizados.clavePrograma,
                // Agregar timestamp de última actualización
                ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                actualizadoDesde: 'panel-autorizacion',
                actualizadoPor: firebase.auth().currentUser?.email || 'admin'
            };
            
            await servicioSocialRef.update(camposActualizables);
            console.log('✅ Datos sincronizados con serviciosocial');
            
        } else {
            console.warn('⚠️ No se encontró el documento original en serviciosocial:', asesorId);
        }
        
    } catch (error) {
        console.error('❌ Error sincronizando con serviciosocial:', error);
        // No lanzar error para no interrumpir el flujo principal
    }
}

async validarIntegridadDatos(datosNuevos, datosOriginales) {
    try {
        // Verificar que cambios críticos sean válidos
        if (datosNuevos.numeroCuenta !== datosOriginales.numeroCuenta) {
            console.warn('⚠️ Cambio de número de cuenta detectado:', {
                anterior: datosOriginales.numeroCuenta,
                nuevo: datosNuevos.numeroCuenta
            });
        }
        
        if (datosNuevos.nombreAsesor !== datosOriginales.nombre) {
            console.log('📝 Cambio de nombre detectado:', {
                anterior: datosOriginales.nombre,
                nuevo: datosNuevos.nombreAsesor
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error validando integridad:', error);
        return false;
    }
}

// ===================================================
// RESTO DEL CÓDIGO ORIGINAL
// ===================================================

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
            
            // Guardar datos del servicio social para sincronización posterior
            this.servicioSocial = servicioData;
            this.servicioSocial.asesorId = servicioId;
            
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
    
    // Determinar qué fecha usar según el tipo de documento
    let fechaParaDocumento;
    if (this.tipoDocumento === 'carta-termino-fq' || this.tipoDocumento === 'carta-termino-prepa') {
        // Para cartas de término: usar fecha actual
        fechaParaDocumento = new Date().toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } else {
        // Para cartas de aceptación: usar fecha de inicio
        fechaParaDocumento = this.formatearFecha(document.getElementById('fechaInicio').value);
    }
    
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
        fechaHoy: fechaParaDocumento, // Fecha condicional según tipo
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

        // Cambiar texto según el modo
        const textoBoton = this.modoEdicion ? 'Actualizando...' : 'Procesando...';
        this.elementos.btnAutorizar.innerHTML = `<i class="bi bi-hourglass-split me-2"></i>${textoBoton}`;
        this.elementos.btnAutorizar.disabled = true;

        const datos = this.obtenerDatosFormulario();
        
        if (this.modoEdicion && this.folioId) {
            await this.actualizarFolioAutorizado(datos);
            this.mostrarExitoActualizacion(datos.folioCompleto);
        } else {
            await this.guardarAutorizacion(datos);
            this.mostrarExito(datos.folioCompleto);
        }

    } catch (error) {
        this.mostrarError(error.message);
        const textoOriginal = this.modoEdicion ? 
            '<i class="bi bi-save me-2"></i>Actualizar Documento' : 
            '<i class="bi bi-check-circle me-2"></i>Autorizar';
        this.elementos.btnAutorizar.innerHTML = textoOriginal;
        this.elementos.btnAutorizar.disabled = false;
    }
}

// Método para actualizar folio autorizado con sincronización
async actualizarFolioAutorizado(datos) {
    try {
        // Obtener datos originales para validación
        const datosOriginales = this.folioAutorizado;
        
        // Validar integridad de datos
        await this.validarIntegridadDatos(datos, datosOriginales);
        
        // Actualizar el documento en la colección Edgar
        await firebase.firestore()
            .collection('edgar')
            .doc(this.folioId)
            .update({
                nombre: datos.nombreAsesor,
                carrera: datos.carrera,
                numeroCuenta: datos.numeroCuenta,
                folio: datos.folioCompleto,
                fechaModificacion: firebase.firestore.Timestamp.now(),
                modificadoPor: firebase.auth().currentUser?.email || 'admin',
                comentarios: `Autorización SICA: ${this.tipoDocumento} (Actualizado)`
            });
        
        console.log('✅ Folio autorizado actualizado en Edgar');
        
        // Sincronizar cambios con serviciosocial
        const asesorId = datosOriginales.asesorId;
        if (asesorId) {
            await this.sincronizarConServicioSocial(datos, asesorId);
        }
        
    } catch (error) {
        console.error('Error actualizando folio autorizado:', error);
        throw error;
    }
}

// Método para mostrar éxito de actualización
mostrarExitoActualizacion(folio) {
    document.getElementById('folioFinal').textContent = folio;
    
    // Cambiar el texto del modal para indicar que fue una actualización
    const modalTitle = document.querySelector('#modalExito .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Documento Actualizado';
    }
    
    // Cambiar el mensaje del modal
    const modalBody = document.querySelector('#modalExito .modal-body p');
    if (modalBody) {
        modalBody.textContent = 'El documento ha sido actualizado correctamente. Los cambios también se han sincronizado con el registro original.';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('modalExito'));
    modal.show();
    
    // Configurar descarga
    document.getElementById('btnDescargar').onclick = () => this.descargarDocumento();
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
        
        console.log('✅ Autorización guardada y registro creado en Edgar');
        
        // Sincronizar cambios con serviciosocial (datos actualizados del formulario)
        await this.sincronizarConServicioSocial(datos, servicioId);
    }

    mostrarExito(folio) {
        document.getElementById('folioFinal').textContent = folio;
        
        // Mensaje para nueva autorización
        const modalBody = document.querySelector('#modalExito .modal-body p');
        if (modalBody) {
            modalBody.textContent = 'El documento ha sido autorizado correctamente y los datos han sido sincronizados.';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalExito'));
        modal.show();

        // Configurar descarga
        document.getElementById('btnDescargar').onclick = () => this.descargarDocumento();
    }

async descargarDocumento() {
    console.log('🚨 DESCARGA - Método llamado');
    console.log('🚨 DESCARGA - Tipo:', this.tipoDocumento);
    try {
        const datos = this.obtenerDatosFormulario();
        console.log('🚨 DESCARGA - Datos:', datos);
        
        // Usar la clase JS correspondiente para generar PDF
        switch (this.tipoDocumento) {
            case 'carta-aceptacion-fq':
                console.log('🚨 DESCARGA - Entrando case FQ');
                if (window.generarCartaAceptacionFQPDF) {
                    console.log('🚨 DESCARGA - Función existe, llamando...');
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