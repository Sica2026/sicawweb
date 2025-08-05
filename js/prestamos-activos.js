// ✅ SISTEMA DE GESTIÓN DE PRÉSTAMOS ACTIVOS
// Archivo: js/prestamos-activos.js

class PrestamosActivos {
    constructor() {
        this.prestamos = [];
        this.modalElement = null;
        this.initialized = false;
    }

    // ✅ INICIALIZAR EL SISTEMA
    init() {
        if (this.initialized) return;

        try {
            this.setupEventListeners();
            this.modalElement = document.getElementById('modalPrestamosActivos');
            this.initialized = true;
            
            console.log('📋 Sistema de préstamos activos inicializado');
        } catch (error) {
            console.error('Error inicializando préstamos activos:', error);
        }
    }

    // ✅ CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Botón para ver préstamos activos
        const btnVerActivos = document.getElementById('btn-ver-activos');
        if (btnVerActivos) {
            btnVerActivos.addEventListener('click', () => {
                this.mostrarModal();
            });
        }

        // Botón de actualizar en el modal
        document.addEventListener('click', (e) => {
            if (e.target.id === 'actualizar-activos') {
                this.cargarPrestamosActivos();
            }
        });

        // Botones de acción en la lista
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-salida-rapida')) {
                const prestamoId = e.target.dataset.prestamoId;
                this.procesarSalidaRapida(prestamoId);
            }
        });

        // Botón modo solo entrada
        const btnModoEntrada = document.getElementById('btn-modo-entrada');
        if (btnModoEntrada) {
            btnModoEntrada.addEventListener('click', () => {
                this.activarModoSoloEntrada();
            });
        }

        // Botón limpiar cuenta
        const btnLimpiarCuenta = document.getElementById('limpiar-cuenta');
        const numeroCuentaInput = document.getElementById('numeroCuenta');
        
        if (btnLimpiarCuenta && numeroCuentaInput) {
            btnLimpiarCuenta.addEventListener('click', () => {
                numeroCuentaInput.value = '';
                btnLimpiarCuenta.style.display = 'none';
                if (window.SICARegistro && window.SICARegistro.resetFormularioModo) {
                    window.SICARegistro.resetFormularioModo();
                }
                numeroCuentaInput.focus();
            });

            // Mostrar/ocultar botón limpiar
            numeroCuentaInput.addEventListener('input', (e) => {
                btnLimpiarCuenta.style.display = e.target.value.trim() ? 'block' : 'none';
            });
        }
    }

    // ✅ MOSTRAR MODAL DE PRÉSTAMOS ACTIVOS
    async mostrarModal() {
        if (!this.modalElement) return;

        // Actualizar nombre del SICA en el modal
        const modalSicaName = document.getElementById('modal-sica-name');
        if (modalSicaName && window.SICARegistro) {
            modalSicaName.textContent = window.SICARegistro.getCurrentSICAConfig().displayName;
        }

        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(this.modalElement);
        bootstrapModal.show();

        // Cargar datos
        await this.cargarPrestamosActivos();
    }

    // ✅ CARGAR PRÉSTAMOS ACTIVOS DESDE FIRESTORE
    async cargarPrestamosActivos() {
        const listaContainer = document.getElementById('lista-prestamos-activos');
        const totalBadge = document.getElementById('total-activos');

        if (!listaContainer) return;

        // Mostrar loading
        listaContainer.innerHTML = this.generarHTMLLoading();

        try {
            if (!window.firebaseDB || !window.SICARegistro) {
                throw new Error('Firebase o SICARegistro no disponible');
            }

            const query = await window.firebaseDB.collection("registros")
                .where("sica", "==", window.SICARegistro.getCurrentSICAConfig().shortName)
                .where("estado", "==", "activo")
                .orderBy("fechaEntrada", "desc")
                .get();

            this.prestamos = [];
            query.forEach(doc => {
                this.prestamos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Actualizar interfaz
            this.actualizarListaPrestamos();
            
            if (totalBadge) {
                totalBadge.textContent = `${this.prestamos.length} activos`;
                totalBadge.className = this.prestamos.length > 0 ? 'badge bg-primary' : 'badge bg-secondary';
            }

            console.log(`📊 ${this.prestamos.length} préstamos activos cargados`);

        } catch (error) {
            console.error('Error cargando préstamos activos:', error);
            listaContainer.innerHTML = this.generarHTMLError();
        }
    }

    // ✅ ACTUALIZAR LISTA DE PRÉSTAMOS EN LA INTERFAZ
    actualizarListaPrestamos() {
        const listaContainer = document.getElementById('lista-prestamos-activos');
        if (!listaContainer) return;

        if (this.prestamos.length === 0) {
            listaContainer.innerHTML = this.generarHTMLVacio();
            return;
        }

        let html = '';
        this.prestamos.forEach(prestamo => {
            html += this.generarHTMLPrestamo(prestamo);
        });

        listaContainer.innerHTML = html;
    }

    // ✅ GENERAR HTML PARA UN PRÉSTAMO
    generarHTMLPrestamo(prestamo) {
        const tiempoTranscurrido = this.calcularTiempoTranscurrido(prestamo.fechaEntrada);
        const tiempoFormateado = this.formatearTiempo(tiempoTranscurrido);
        const esAlerta = tiempoTranscurrido > 120; // Más de 2 horas
        
        const currentTipo = window.SICARegistro.getCurrentTipo();
        const tipoIcono = currentTipo === 'computadora' ? 'bi-laptop' : 'bi-table';
        const tipoTexto = currentTipo === 'computadora' ? 'Equipo' : 'Mesa';

        return `
            <div class="prestamo-card ${esAlerta ? 'alerta' : ''}" data-prestamo-id="${prestamo.id}">
                <div class="prestamo-info">
                    <div class="prestamo-principal">
                        <div class="d-flex align-items-center mb-2">
                            <i class="${tipoIcono} me-2 text-primary"></i>
                            <strong>${prestamo.nombreElemento}</strong>
                            ${esAlerta ? '<span class="badge bg-warning ms-2">⚠ +2h</span>' : ''}
                        </div>
                        <div class="prestamo-detalles">
                            <div class="row">
                                <div class="col-md-4">
                                    <i class="bi bi-person me-1"></i>
                                    <span class="cuenta-numero">${prestamo.numeroCuenta}</span>
                                </div>
                                <div class="col-md-4">
                                    <i class="bi bi-clock me-1"></i>
                                    <span class="tiempo-transcurrido">${tiempoFormateado}</span>
                                </div>
                                <div class="col-md-4">
                                    <i class="bi bi-calendar me-1"></i>
                                    <small>${this.formatearFecha(prestamo.fechaEntrada)}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="prestamo-acciones">
                        <button class="btn btn-warning btn-sm btn-salida-rapida" 
                                data-prestamo-id="${prestamo.id}"
                                title="Registrar salida">
                            <i class="bi bi-box-arrow-right me-1"></i>
                            Salida
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ GENERAR HTML DE LOADING
    generarHTMLLoading() {
        return `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-muted">Cargando préstamos activos...</p>
            </div>
        `;
    }

    // ✅ GENERAR HTML CUANDO NO HAY PRÉSTAMOS
    generarHTMLVacio() {
        const currentTipo = window.SICARegistro.getCurrentTipo();
        const tipoTexto = currentTipo === 'computadora' ? 'equipos' : 'mesas';
        
        return `
            <div class="text-center py-5">
                <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
                <h5 class="mt-3 text-muted">¡Excelente!</h5>
                <p class="text-muted">No hay ${tipoTexto} prestados en este momento.<br>
                Todos los ${tipoTexto} están disponibles.</p>
            </div>
        `;
    }

    // ✅ GENERAR HTML DE ERROR
    generarHTMLError() {
        return `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                <h6 class="mt-2">Error al cargar los datos</h6>
                <p class="text-muted">No se pudieron cargar los préstamos activos.</p>
                <button class="btn btn-outline-primary btn-sm" id="reintentar-carga">
                    <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
                </button>
            </div>
        `;
    }

    // ✅ PROCESAR SALIDA RÁPIDA DESDE LA LISTA
    async procesarSalidaRapida(prestamoId) {
        const prestamo = this.prestamos.find(p => p.id === prestamoId);
        if (!prestamo) return;

        const confirmacion = await this.mostrarConfirmacionSalida(prestamo);
        if (!confirmacion) return;

        try {
            // Usar las funciones del sistema principal
            if (window.SICARegistro && window.SICARegistro.procesarSalida) {
                await window.SICARegistro.procesarSalida(prestamo.id, prestamo);
                
                // Recargar lista
                await this.cargarPrestamosActivos();
                
                // Actualizar mapa visual si existe
                if (window.SICAMapaVisual && window.SICAMapaVisual.cargarRegistrosActivos) {
                    await window.SICAMapaVisual.cargarRegistrosActivos();
                }
                
                // Mostrar notificación
                if (window.SICAComponents && window.SICAComponents.notify) {
                    window.SICAComponents.notify(
                        "✅ Salida Registrada",
                        `Salida registrada para ${prestamo.nombreElemento}`,
                        "success",
                        "bi-check-circle-fill"
                    );
                }
            }
            
        } catch (error) {
            console.error('Error en salida rápida:', error);
            if (window.SICAComponents && window.SICAComponents.notify) {
                window.SICAComponents.notify(
                    "❌ Error",
                    "Error al registrar la salida",
                    "error",
                    "bi-exclamation-triangle-fill"
                );
            }
        }
    }

    // ✅ MOSTRAR CONFIRMACIÓN DE SALIDA
    async mostrarConfirmacionSalida(prestamo) {
        const tiempoTranscurrido = this.calcularTiempoTranscurrido(prestamo.fechaEntrada);
        const tiempoFormateado = this.formatearTiempo(tiempoTranscurrido);
        
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-box-arrow-right me-2"></i>
                                Confirmar Salida
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>¿Confirmas el registro de salida?</strong></p>
                            <ul class="list-unstyled">
                                <li><i class="bi bi-pc-display me-2"></i><strong>Equipo:</strong> ${prestamo.nombreElemento}</li>
                                <li><i class="bi bi-person me-2"></i><strong>Cuenta:</strong> ${prestamo.numeroCuenta}</li>
                                <li><i class="bi bi-clock me-2"></i><strong>Tiempo de uso:</strong> ${tiempoFormateado}</li>
                            </ul>
                            ${tiempoTranscurrido > 120 ? '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Este préstamo lleva más de 2 horas activo.</div>' : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-warning" id="confirmar-salida-lista">
                                <i class="bi bi-box-arrow-right me-2"></i>Registrar Salida
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();

            // Event listeners
            modal.querySelector('#confirmar-salida-lista').addEventListener('click', () => {
                resolve(true);
                bootstrapModal.hide();
            });

            modal.addEventListener('hidden.bs.modal', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
        });
    }

    // ✅ ACTIVAR MODO SOLO ENTRADA
    activarModoSoloEntrada() {
        const numeroCuentaInput = document.getElementById('numeroCuenta');
        const equipoContainer = document.getElementById('equipo-container');
        const btnModoEntrada = document.getElementById('btn-modo-entrada');
        
        if (numeroCuentaInput) {
            numeroCuentaInput.value = '';
            numeroCuentaInput.focus();
        }
        
        if (equipoContainer) {
            equipoContainer.style.display = 'block';
        }
        
        // Cambiar texto del botón temporalmente
        if (btnModoEntrada) {
            const originalText = btnModoEntrada.innerHTML;
            btnModoEntrada.innerHTML = '<i class="bi bi-check me-1"></i>Modo Activado';
            btnModoEntrada.classList.remove('btn-outline-success');
            btnModoEntrada.classList.add('btn-success');
            
            setTimeout(() => {
                btnModoEntrada.innerHTML = originalText;
                btnModoEntrada.classList.remove('btn-success');
                btnModoEntrada.classList.add('btn-outline-success');
            }, 2000);
        }
        
        // Resetear modo del formulario
        if (window.SICARegistro && window.SICARegistro.resetFormularioModo) {
            window.SICARegistro.resetFormularioModo();
        }
        
        // Mostrar notificación
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(
                "🔄 Modo Solo Entrada",
                "Formulario configurado para solo registrar entradas",
                "info",
                "bi-plus-circle-fill"
            );
        }
    }

    // ✅ CALCULAR TIEMPO TRANSCURRIDO EN MINUTOS
    calcularTiempoTranscurrido(fechaEntrada) {
        if (!fechaEntrada) return 0;
        
        const entrada = fechaEntrada.seconds ? new Date(fechaEntrada.seconds * 1000) : new Date(fechaEntrada);
        const ahora = new Date();
        return Math.floor((ahora - entrada) / (1000 * 60));
    }

    // ✅ FORMATEAR TIEMPO PARA MOSTRAR
    formatearTiempo(minutos) {
        if (minutos < 60) {
            return `${minutos} min`;
        }
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}m`;
    }

    // ✅ FORMATEAR FECHA PARA MOSTRAR
    formatearFecha(fecha) {
        if (!fecha) return 'N/A';
        
        const fechaObj = fecha.seconds ? new Date(fecha.seconds * 1000) : new Date(fecha);
        const opciones = { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
        };
        
        return fechaObj.toLocaleString('es-MX', opciones);
    }

    // ✅ OBTENER ESTADÍSTICAS DE PRÉSTAMOS
    getEstadisticas() {
        const total = this.prestamos.length;
        const alertas = this.prestamos.filter(p => 
            this.calcularTiempoTranscurrido(p.fechaEntrada) > 120
        ).length;
        
        const tiempoPromedio = total > 0 ? 
            this.prestamos.reduce((sum, p) => 
                sum + this.calcularTiempoTranscurrido(p.fechaEntrada), 0
            ) / total : 0;

        return {
            total,
            alertas,
            tiempoPromedio: Math.round(tiempoPromedio),
            disponibles: window.SICARegistro ? 
                window.SICARegistro.getCurrentSICAConfig().maxElementos - total : 0
        };
    }

    // ✅ BUSCAR PRÉSTAMO POR CUENTA
    buscarPorCuenta(numeroCuenta) {
        return this.prestamos.find(p => p.numeroCuenta === numeroCuenta);
    }

    // ✅ FILTRAR PRÉSTAMOS
    filtrarPrestamos(filtro) {
        switch (filtro) {
            case 'alertas':
                return this.prestamos.filter(p => 
                    this.calcularTiempoTranscurrido(p.fechaEntrada) > 120
                );
            case 'recientes':
                return this.prestamos.filter(p => 
                    this.calcularTiempoTranscurrido(p.fechaEntrada) < 60
                );
            default:
                return this.prestamos;
        }
    }
}

// ✅ FUNCIONES ADICIONALES PARA MEJORAR LA UX

// Función para mostrar estadísticas rápidas
function mostrarEstadisticasRapidas() {
    if (!window.SICAPrestamosActivos) return;
    
    const stats = window.SICAPrestamosActivos.getEstadisticas();
    const mensaje = `📊 Estado actual:
• ${stats.total} préstamos activos
• ${stats.disponibles} equipos disponibles
• ${stats.alertas} con más de 2 horas
• Promedio: ${stats.tiempoPromedio} minutos`;

    if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(
            "📊 Estadísticas",
            mensaje,
            "info",
            "bi-graph-up"
        );
    }
}

// Función para exportar lista de préstamos activos
function exportarPrestamosActivos() {
    if (!window.SICAPrestamosActivos) return;
    
    const prestamos = window.SICAPrestamosActivos.prestamos;
    if (prestamos.length === 0) {
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(
                "ℹ️ Sin datos",
                "No hay préstamos activos para exportar",
                "info",
                "bi-info-circle"
            );
        }
        return;
    }

    const csv = generarCSVPrestamos(prestamos);
    descargarArchivo(csv, `prestamos_activos_${new Date().toISOString().slice(0,10)}.csv`);
}

// Generar CSV de préstamos
function generarCSVPrestamos(prestamos) {
    const headers = ['Cuenta', 'Elemento', 'Tipo', 'SICA', 'Fecha Entrada', 'Tiempo Transcurrido (min)'];
    const rows = prestamos.map(p => [
        p.numeroCuenta,
        p.nombreElemento,
        p.tipoEquipo,
        p.sica,
        new Date(p.fechaEntrada.seconds * 1000).toLocaleString(),
        window.SICAPrestamosActivos.calcularTiempoTranscurrido(p.fechaEntrada)
    ]);

    return [headers, ...rows].map(row => 
        row.map(field => `"${field}"`).join(',')
    ).join('\n');
}

// Descargar archivo
function descargarArchivo(contenido, nombreArchivo) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ✅ AUTO-ACTUALIZACIÓN DE PRÉSTAMOS ACTIVOS
class AutoActualizador {
    constructor(intervalMinutos = 2) {
        this.intervalo = intervalMinutos * 60 * 1000; // Convertir a milisegundos
        this.intervalId = null;
        this.activo = false;
    }

    iniciar() {
        if (this.activo) return;
        
        this.intervalId = setInterval(() => {
            if (window.SICAPrestamosActivos && window.SICAPrestamosActivos.initialized) {
                // Solo actualizar si el modal está visible
                const modal = document.getElementById('modalPrestamosActivos');
                if (modal && modal.classList.contains('show')) {
                    console.log('🔄 Auto-actualizando préstamos activos...');
                    window.SICAPrestamosActivos.cargarPrestamosActivos();
                }
                
                // Actualizar mapa visual si está visible
                if (window.SICAMapaVisual && window.SICAMapaVisual.initialized) {
                    const mapaContainer = document.getElementById('mapa-visual-container');
                    if (mapaContainer && mapaContainer.style.display !== 'none') {
                        window.SICAMapaVisual.cargarRegistrosActivos();
                    }
                }
            }
        }, this.intervalo);
        
        this.activo = true;
        console.log(`⏰ Auto-actualización iniciada (cada ${this.intervalo / 60000} minutos)`);
    }

    detener() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.activo = false;
        console.log('⏸️ Auto-actualización detenida');
    }
}

// ✅ INICIALIZAR SISTEMA CUANDO EL DOM ESTÉ LISTO
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que el sistema principal esté cargado
    setTimeout(() => {
        if (window.SICARegistro) {
            const prestamosActivos = new PrestamosActivos();
            const autoActualizador = new AutoActualizador(2); // Cada 2 minutos
            
            window.SICAPrestamosActivos = prestamosActivos;
            window.SICAAutoActualizador = autoActualizador;
            
            prestamosActivos.init();
            autoActualizador.iniciar();
            
            // Funciones globales para usar desde consola o botones adicionales
            window.mostrarEstadisticasRapidas = mostrarEstadisticasRapidas;
            window.exportarPrestamosActivos = exportarPrestamosActivos;
        }
    }, 1500);
});

// ✅ LIMPIAR AL SALIR DE LA PÁGINA
window.addEventListener('beforeunload', () => {
    if (window.SICAAutoActualizador) {
        window.SICAAutoActualizador.detener();
    }
});

// ✅ EXPORTAR CLASE PARA USO GLOBAL
window.PrestamosActivos = PrestamosActivos;