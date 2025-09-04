// bitacora-main.js - Módulo Principal de Bitácora
// Coordinador de todos los módulos y gestor de estado principal

class BitacoraMain {
    constructor() {
        this.inicializado = false;
        this.listeners = []; // Para cleanup de listeners
        this.estadoActual = {
            folios: [],
            pendientesSICA: 0,
            estadisticas: {},
            ultimaActualizacion: null
        };
        
        this.configuracion = {
            autoRefresh: true,
            intervalRefresh: 30000, // 30 segundos
            maxFoliosPorPagina: 15
        };
    }

    async inicializar() {
        try {
            console.log('🚀 Iniciando sistema de bitácora...');
            
            // Esperar a que todos los módulos estén cargados
            await this.esperarModulos();
            
            // Verificar autenticación
            await this.verificarAutenticacion();
            
            // Configurar componentes base
            this.configurarComponentesBase();
            
            // Configurar listeners globales
            this.configurarListeners();
            
            // Cargar datos iniciales
            await this.cargarDatosIniciales();
            
            // Configurar auto-refresh si está habilitado
            if (this.configuracion.autoRefresh) {
                this.configurarAutoRefresh();
            }
            
            this.inicializado = true;
            console.log('✅ Sistema de bitácora inicializado correctamente');
            
            // Mostrar notificación de bienvenida
            this.mostrarBienvenida();
            
        } catch (error) {
            console.error('❌ Error inicializando bitácora:', error);
            this.manejarErrorInicializacion(error);
        }
    }

    async esperarModulos() {
        const modulosRequeridos = [
            'bitacoraFirebase',
            'bitacoraUI', 
            'bitacoraFilters'
        ];
        
        let intentos = 0;
        const maxIntentos = 50;
        
        while (intentos < maxIntentos) {
            const modulosCargados = modulosRequeridos.every(modulo => window[modulo]);
            
            if (modulosCargados) {
                console.log('✅ Todos los módulos están cargados');
                return;
            }
            
            await this.esperar(100);
            intentos++;
        }
        
        throw new Error('Timeout esperando módulos requeridos');
    }

async verificarAutenticacion() {
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                window.location.href = '../login.html';
                return;
            }
            // Verificar que sea admin (agregar lógica adicional si necesaria)
            resolve(user);
        });
    });
}

    configurarComponentesBase() {
        // Configurar título y breadcrumbs
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Bitácora - SICA Admin');
            window.SICAComponents.addBreadcrumbs([
                { text: 'Dashboard', link: '../index.html' },
                { text: 'Bitácora', active: true }
            ]);
        }
        
        // Configurar navegación moderna si está disponible
        if (window.SICAModern) {
            // Configurar opciones específicas de bitácora si es necesario
        }
    }

    configurarListeners() {
        // Listener para cambios en pendientes SICA en tiempo real
        const unsubscribePendientes = window.bitacoraFirebase.escucharPendientesSICA((cantidad) => {
            this.actualizarBadgeSICA(cantidad);
        });
        this.listeners.push(unsubscribePendientes);
        
        // Listener para cambios en folios en tiempo real
        const unsubscribeFolios = window.bitacoraFirebase.escucharFolios((folios) => {
            this.manejarActualizacionFolios(folios);
        });
        this.listeners.push(unsubscribeFolios);
        
        // Event listeners de filtros
        this.configurarListenersFiltros();
        
        // Event listener para visibilidad de página (pausar/reanudar actualizaciones)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pausarActualizaciones();
            } else {
                this.reanudarActualizaciones();
            }
        });
        
        // Event listener para errores no capturados
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Error no capturado:', event.reason);
            this.manejarErrorGlobal(event.reason);
        });
    }

    configurarListenersFiltros() {
        // Conectar filtros con la interfaz
        const inputBusqueda = document.getElementById('searchInput');
        const fechaDesde = document.getElementById('fechaDesde');
        const fechaHasta = document.getElementById('fechaHasta');
        const filtroImportancia = document.getElementById('filtroImportancia');
        
        const aplicarFiltros = () => {
            this.aplicarFiltrosYMostrar();
        };
        
        // Búsqueda en tiempo real ya está manejada en BitacoraFilters
        // Los demás filtros disparan aplicarFiltros directamente
        if (fechaDesde) fechaDesde.addEventListener('change', aplicarFiltros);
        if (fechaHasta) fechaHasta.addEventListener('change', aplicarFiltros);
        if (filtroImportancia) filtroImportancia.addEventListener('change', aplicarFiltros);
    }

    async cargarDatosIniciales() {
        console.log('📊 Cargando datos iniciales...');
        
        // Mostrar estado de carga
        window.bitacoraUI.mostrarLoading();
        
        try {
            // Cargar folios y estadísticas en paralelo
            const [folios, estadisticas] = await Promise.all([
                window.bitacoraFirebase.obtenerFolios(),
                window.bitacoraFirebase.obtenerEstadisticas()
            ]);
            
            // Actualizar estado
            this.estadoActual.folios = folios;
            this.estadoActual.estadisticas = estadisticas;
            this.estadoActual.ultimaActualizacion = new Date();
            
            // Configurar datos en módulos
            window.bitacoraFilters.establecerFolios(folios);
            
            // Mostrar datos en la interfaz
            window.bitacoraUI.mostrarFolios(folios);
            this.actualizarEstadisticas(estadisticas);
            
            console.log(`✅ Cargados ${folios.length} folios`);
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.manejarErrorCarga(error);
        }
    }

    async cargarDatos() {
        // Método público para recargar datos
        await this.cargarDatosIniciales();
    }

    aplicarFiltrosYMostrar() {
        // Obtener datos filtrados
        window.bitacoraFilters.aplicarFiltros();
        
        // Los datos filtrados se muestran automáticamente desde BitacoraFilters
        // Este método existe para compatibilidad y coordinación
    }

    manejarActualizacionFolios(folios) {
        console.log('🔄 Actualización en tiempo real de folios');
        
        // Actualizar estado
        this.estadoActual.folios = folios;
        this.estadoActual.ultimaActualizacion = new Date();
        
        // Actualizar filtros con nuevos datos
        window.bitacoraFilters.establecerFolios(folios);
        
        // Re-aplicar filtros actuales
        window.bitacoraFilters.aplicarFiltros();
        
        // Actualizar estadísticas
        this.actualizarEstadisticasLocales();
    }

    actualizarBadgeSICA(cantidad) {
        const badge = document.getElementById('sicaBadge');
        if (badge) {
            badge.textContent = cantidad;
            badge.style.display = cantidad > 0 ? 'inline' : 'none';
        }
        
        // Actualizar estadística local
        this.estadoActual.pendientesSICA = cantidad;
        
        const pendientesSicaElement = document.getElementById('pendientesSica');
        if (pendientesSicaElement) {
            pendientesSicaElement.textContent = cantidad;
        }
    }

    actualizarEstadisticas(estadisticas) {
        // Actualizar cards de estadísticas
        const elementos = {
            totalFolios: document.getElementById('totalFolios'),
            pendientesSica: document.getElementById('pendientesSica'),
            autorizadosHoy: document.getElementById('autorizadosHoy'),
            estaSemana: document.getElementById('estaSemana')
        };
        
        Object.keys(elementos).forEach(key => {
            const elemento = elementos[key];
            if (elemento && estadisticas[key] !== undefined) {
                // Animación del número
                this.animarNumero(elemento, estadisticas[key]);
            }
        });
        
        this.estadoActual.estadisticas = estadisticas;
    }

    async actualizarEstadisticasLocales() {
        try {
            const estadisticas = await window.bitacoraFirebase.obtenerEstadisticas();
            this.actualizarEstadisticas(estadisticas);
        } catch (error) {
            console.warn('⚠️ Error actualizando estadísticas locales:', error);
        }
    }

    animarNumero(elemento, valorFinal) {
        const valorActual = parseInt(elemento.textContent) || 0;
        const diferencia = valorFinal - valorActual;
        
        if (diferencia === 0) return;
        
        const duracion = 1000; // 1 segundo
        const pasos = 30;
        const incremento = diferencia / pasos;
        const tiempoPaso = duracion / pasos;
        
        let paso = 0;
        const interval = setInterval(() => {
            paso++;
            const valor = Math.round(valorActual + (incremento * paso));
            elemento.textContent = valor;
            
            if (paso >= pasos) {
                clearInterval(interval);
                elemento.textContent = valorFinal;
            }
        }, tiempoPaso);
    }

    // ==========================================
    // AUTO-REFRESH Y ACTUALIZACIONES
    // ==========================================

    configurarAutoRefresh() {
        console.log(`🔄 Configurando auto-refresh cada ${this.configuracion.intervalRefresh}ms`);
        
        this.intervalRefresh = setInterval(() => {
            if (!document.hidden && this.inicializado) {
                this.refrescarDatosSilencioso();
            }
        }, this.configuracion.intervalRefresh);
    }

    async refrescarDatosSilencioso() {
        try {
            // Solo actualizar estadísticas en refresh silencioso
            const estadisticas = await window.bitacoraFirebase.obtenerEstadisticas();
            this.actualizarEstadisticas(estadisticas);
            
        } catch (error) {
            console.warn('⚠️ Error en refresh silencioso:', error);
        }
    }

    pausarActualizaciones() {
        console.log('⏸️ Pausando actualizaciones (página oculta)');
        if (this.intervalRefresh) {
            clearInterval(this.intervalRefresh);
            this.intervalRefresh = null;
        }
    }

    reanudarActualizaciones() {
        console.log('▶️ Reanudando actualizaciones (página visible)');
        if (this.configuracion.autoRefresh && !this.intervalRefresh) {
            this.configurarAutoRefresh();
            
            // Hacer un refresh inmediato
            this.refrescarDatosSilencioso();
        }
    }

    // ==========================================
    // MANEJO DE ERRORES
    // ==========================================

    manejarErrorInicializacion(error) {
        console.error('💥 Error crítico en inicialización:', error);
        
        // Mostrar mensaje de error en la interfaz
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Error de Inicialización</h4>
                        <p>No se pudo inicializar el sistema de bitácora.</p>
                        <hr>
                        <p class="mb-0">
                            <strong>Detalles:</strong> ${error.message}
                        </p>
                        <button class="btn btn-outline-danger mt-3" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }

    manejarErrorCarga(error) {
        console.error('❌ Error cargando datos:', error);
        
        // Ocultar loading
        window.bitacoraUI.ocultarLoading();
        
        // Mostrar mensaje de error
        const mensaje = error.message.includes('permission') ? 
            'No tienes permisos para acceder a estos datos' :
            'Error conectando con la base de datos';
            
        if (window.bitacoraUI) {
            window.bitacoraUI.mostrarNotificacion(
                'Error de Carga',
                mensaje,
                'error'
            );
        }
        
        // Mostrar opción de reintento
        this.mostrarOpcionReintento();
    }

    manejarErrorGlobal(error) {
        console.error('🚨 Error global:', error);
        
        // Solo mostrar notificación para errores críticos
        if (error.message && !error.message.includes('timeout')) {
            if (window.bitacoraUI) {
                window.bitacoraUI.mostrarNotificacion(
                    'Error del Sistema',
                    'Se produjo un error inesperado',
                    'error'
                );
            }
        }
    }

    mostrarOpcionReintento() {
        const container = document.getElementById('main-content');
        const reintentoDiv = document.createElement('div');
        reintentoDiv.className = 'text-center py-5';
        reintentoDiv.innerHTML = `
            <div class="card-modern p-4" style="max-width: 400px; margin: 0 auto;">
                <i class="bi bi-exclamation-triangle display-1 text-warning mb-3"></i>
                <h5>Error de Conexión</h5>
                <p class="text-muted">No se pudieron cargar los datos</p>
                <button class="btn btn-sica" onclick="bitacoraMain.reintentar()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                </button>
            </div>
        `;
        
        container.appendChild(reintentoDiv);
    }

    async reintentar() {
        console.log('🔄 Reintentando carga de datos...');
        
        // Limpiar mensajes de error
        const errorElements = document.querySelectorAll('.alert-danger, .card-modern');
        errorElements.forEach(el => el.remove());
        
        // Intentar cargar datos nuevamente
        await this.cargarDatosIniciales();
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    async esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    mostrarBienvenida() {
        if (window.bitacoraUI) {
            const usuario = firebase.auth().currentUser;
            const nombreUsuario = usuario?.email?.split('@')[0] || 'Admin';
            
            window.bitacoraUI.mostrarNotificacion(
                `¡Bienvenido, ${nombreUsuario}!`,
                'Sistema de bitácora listo para usar',
                'success'
            );
        }
    }

    // ==========================================
    // API PÚBLICA
    // ==========================================

    obtenerEstado() {
        return {
            ...this.estadoActual,
            inicializado: this.inicializado,
            configuracion: { ...this.configuracion }
        };
    }

    actualizarConfiguracion(nuevaConfig) {
        this.configuracion = {
            ...this.configuracion,
            ...nuevaConfig
        };
        
        console.log('⚙️ Configuración actualizada:', this.configuracion);
        
        // Re-configurar auto-refresh si cambió el intervalo
        if (nuevaConfig.intervalRefresh || nuevaConfig.autoRefresh !== undefined) {
            if (this.intervalRefresh) {
                clearInterval(this.intervalRefresh);
                this.intervalRefresh = null;
            }
            
            if (this.configuracion.autoRefresh) {
                this.configurarAutoRefresh();
            }
        }
    }

    // Método para forzar actualización completa
    async forzarActualizacion() {
        console.log('🔄 Forzando actualización completa...');
        
        window.bitacoraUI.mostrarLoading();
        
        try {
            await this.cargarDatosIniciales();
            
            if (window.bitacoraUI) {
                window.bitacoraUI.mostrarNotificacion(
                    'Datos actualizados',
                    'La información se ha actualizado correctamente',
                    'success'
                );
            }
            
        } catch (error) {
            console.error('Error en actualización forzada:', error);
            this.manejarErrorCarga(error);
        }
    }

    // Método para limpiar recursos al salir
    destruir() {
        console.log('🧹 Limpiando recursos de bitácora...');
        
        // Limpiar listeners
        this.listeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners = [];
        
        // Limpiar intervalos
        if (this.intervalRefresh) {
            clearInterval(this.intervalRefresh);
            this.intervalRefresh = null;
        }
        
        this.inicializado = false;
        console.log('✅ Recursos limpiados');
    }

    // ==========================================
    // NAVEGACIÓN Y ROUTING
    // ==========================================

    navegarAAutorizacion(pendienteId) {
        console.log('🔗 Navegando a autorización:', pendienteId);
        window.location.href = `autorizacion.html?id=${pendienteId}`;
    }

    navegarADashboard() {
        window.location.href = '../index.html';
    }

    // ==========================================
    // EXPORTACIÓN Y REPORTES
    // ==========================================

    async generarReporte(tipo = 'completo') {
        try {
            console.log(`📊 Generando reporte: ${tipo}`);
            
            const datos = window.bitacoraFilters.obtenerDatosFiltrados();
            const estadisticas = this.estadoActual.estadisticas;
            
            const reporte = {
                tipo: tipo,
                fechaGeneracion: new Date().toISOString(),
                usuario: firebase.auth().currentUser?.email,
                datos: datos,
                estadisticas: estadisticas,
                filtrosAplicados: datos.filtros,
                resumen: {
                    totalFolios: datos.total,
                    foliosFiltrados: datos.filtrados,
                    porcentajeFiltrado: ((datos.filtrados / datos.total) * 100).toFixed(1)
                }
            };
            
            // Descargar reporte
            const blob = new Blob([JSON.stringify(reporte, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_bitacora_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            if (window.bitacoraUI) {
                window.bitacoraUI.mostrarNotificacion(
                    'Reporte generado',
                    'El reporte se ha descargado correctamente',
                    'success'
                );
            }
            
        } catch (error) {
            console.error('Error generando reporte:', error);
            if (window.bitacoraUI) {
                window.bitacoraUI.mostrarNotificacion(
                    'Error',
                    'No se pudo generar el reporte',
                    'error'
                );
            }
        }
    }

    // ==========================================
    // MÉTODOS DE DEBUG
    // ==========================================

    debug() {
        console.log('🐛 Estado de BitacoraMain:', {
            inicializado: this.inicializado,
            folios: this.estadoActual.folios.length,
            pendientes: this.estadoActual.pendientesSICA,
            ultimaActualizacion: this.estadoActual.ultimaActualizacion,
            configuracion: this.configuracion,
            listenersActivos: this.listeners.length
        });
        
        return this.obtenerEstado();
    }

    // Método para simular datos de prueba (solo desarrollo)
    async cargarDatosPrueba() {
        if (window.location.hostname !== 'localhost') {
            console.warn('Datos de prueba solo disponibles en desarrollo');
            return;
        }
        
        console.log('🧪 Cargando datos de prueba...');
        
        const foliosPrueba = [
            {
                id: 'test-1',
                folio: 'CI/001/2025',
                nombre: 'Juan Pérez García',
                fecha: new Date(),
                importancia: 'alta',
                comentarios: 'Solicitud de servicio social urgente',
                tipo: 'sica',
                carrera: 'Ingeniería Química'
            },
            {
                id: 'test-2',
                folio: 'CI/002/2025',
                nombre: 'María López Hernández',
                fecha: new Date(Date.now() - 86400000),
                importancia: 'media',
                comentarios: 'Trámite de carta de aceptación',
                tipo: 'manual'
            }
        ];
        
        window.bitacoraFilters.establecerFolios(foliosPrueba);
        window.bitacoraUI.mostrarFolios(foliosPrueba);
        
        this.actualizarEstadisticas({
            totalFolios: 2,
            pendientesSica: 1,
            autorizadosHoy: 0,
            estaSemana: 2
        });
    }
}

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================

// Crear instancia global
window.bitacoraMain = new BitacoraMain();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📄 DOM cargado, inicializando bitácora...');
        await window.bitacoraMain.inicializar();
        
    } catch (error) {
        console.error('Error en inicialización:', error);
    }
});

// Limpiar recursos al salir de la página
window.addEventListener('beforeunload', () => {
    if (window.bitacoraMain) {
        window.bitacoraMain.destruir();
    }
});

// Manejo global de errores de Firebase
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('firestore/')) {
        console.error('Error de Firestore:', event.reason);
        event.preventDefault(); // Evitar que aparezca en consola
        
        if (window.bitacoraMain && window.bitacoraUI) {
            window.bitacoraUI.mostrarNotificacion(
                'Error de Base de Datos',
                'Problema de conectividad. Reintentando...',
                'warning'
            );
        }
    }
});

// Exportar para debugging global
window.debugBitacora = () => {
    if (window.bitacoraMain) {
        return window.bitacoraMain.debug();
    }
};

console.log('✅ Módulo BitacoraMain cargado correctamente');