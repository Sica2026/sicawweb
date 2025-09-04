// bitacora-filters.js - Módulo de Filtros para Bitácora
// Manejo de filtros en tiempo real, búsquedas y paginación

class BitacoraFilters {
    constructor() {
        this.foliosOriginales = [];
        this.foliosFiltrados = [];
        this.filtrosActivos = {
            busqueda: '',
            fechaDesde: '',
            fechaHasta: '',
            importancia: ''
        };
        
        this.debounceTimeout = null;
        this.debounceDelay = 300; // ms
        
        this.inicializar();
    }

    inicializar() {
        console.log('🔍 Inicializando BitacoraFilters...');
        
        this.configurarEventListeners();
        this.configurarBusquedaEnTiempoReal();
        
        console.log('✅ BitacoraFilters inicializado');
    }

    configurarEventListeners() {
        // Campo de búsqueda en tiempo real
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.manejarBusqueda(e.target.value);
            });
            
            searchInput.addEventListener('focus', () => {
                this.mostrarContadorResultados();
            });
            
            searchInput.addEventListener('blur', () => {
                setTimeout(() => this.ocultarContadorResultados(), 200);
            });
        }

        // Filtros de fecha
        document.getElementById('fechaDesde')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });

        document.getElementById('fechaHasta')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });

        // Filtro de importancia
        document.getElementById('filtroImportancia')?.addEventListener('change', () => {
            this.aplicarFiltros();
        });
    }

    configurarBusquedaEnTiempoReal() {
        // Configurar placeholder animado
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const placeholders = [
                'Buscar por folio...',
                'Buscar por nombre...',
                'Buscar por comentarios...',
                'Buscar por carrera...'
            ];
            
            let placeholderIndex = 0;
            setInterval(() => {
                placeholderIndex = (placeholderIndex + 1) % placeholders.length;
                searchInput.placeholder = placeholders[placeholderIndex];
            }, 3000);
        }
    }

    // ==========================================
    // GESTIÓN DE FILTROS PRINCIPALES
    // ==========================================

    establecerFolios(folios) {
        this.foliosOriginales = [...folios];
        this.foliosFiltrados = [...folios];
        console.log(`📊 Establecidos ${folios.length} folios para filtrar`);
    }

    manejarBusqueda(termino) {
        // Limpiar timeout anterior
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Establecer nuevo timeout
        this.debounceTimeout = setTimeout(() => {
            this.filtrosActivos.busqueda = termino.trim();
            this.aplicarFiltros();
            this.actualizarContadorResultados();
        }, this.debounceDelay);

        // Mostrar indicador de búsqueda inmediatamente
        if (termino.length > 0) {
            this.mostrarIndicadorBusqueda();
        } else {
            this.ocultarIndicadorBusqueda();
        }
    }

    aplicarFiltros() {
        console.log('🔍 Aplicando filtros...', this.filtrosActivos);

        // Obtener valores actuales de los filtros
        this.actualizarFiltrosDesdeDOM();

        // Aplicar todos los filtros
        this.foliosFiltrados = this.aplicarTodosFiltros(this.foliosOriginales);

        console.log(`📊 Filtrados: ${this.foliosFiltrados.length} de ${this.foliosOriginales.length} folios`);

        // Notificar resultado a la UI
        if (window.bitacoraUI) {
            window.bitacoraUI.mostrarFolios(this.foliosFiltrados, 1);
        }

        // Actualizar contador de resultados
        this.actualizarContadorResultados();

        // Actualizar estadísticas locales
        this.actualizarEstadisticasFiltradas();
    }

    actualizarFiltrosDesdeDOM() {
        this.filtrosActivos = {
            busqueda: document.getElementById('searchInput')?.value.trim() || '',
            fechaDesde: document.getElementById('fechaDesde')?.value || '',
            fechaHasta: document.getElementById('fechaHasta')?.value || '',
            importancia: document.getElementById('filtroImportancia')?.value || ''
        };
    }

    aplicarTodosFiltros(folios) {
        let resultado = [...folios];

        // Filtro de búsqueda
        if (this.filtrosActivos.busqueda) {
            resultado = this.aplicarFiltroBusqueda(resultado, this.filtrosActivos.busqueda);
        }

        // Filtro de fecha desde
        if (this.filtrosActivos.fechaDesde) {
            resultado = this.aplicarFiltroFechaDesde(resultado, this.filtrosActivos.fechaDesde);
        }

        // Filtro de fecha hasta
        if (this.filtrosActivos.fechaHasta) {
            resultado = this.aplicarFiltroFechaHasta(resultado, this.filtrosActivos.fechaHasta);
        }

        // Filtro de importancia
        if (this.filtrosActivos.importancia) {
            resultado = this.aplicarFiltroImportancia(resultado, this.filtrosActivos.importancia);
        }

        return resultado;
    }

    // ==========================================
    // FILTROS ESPECÍFICOS
    // ==========================================

    aplicarFiltroBusqueda(folios, termino) {
        const terminoLower = termino.toLowerCase();
        const palabras = terminoLower.split(/\s+/).filter(p => p.length > 0);

        return folios.filter(folio => {
            const textoCompleto = [
                folio.folio,
                folio.nombre,
                folio.comentarios,
                folio.carrera,
                folio.tipoAutorizacion,
                folio.numeroCuenta
            ].join(' ').toLowerCase();

            // Búsqueda por palabras (todas deben estar presentes)
            return palabras.every(palabra => textoCompleto.includes(palabra));
        });
    }

    aplicarFiltroFechaDesde(folios, fechaDesde) {
        const fechaLimite = new Date(fechaDesde);
        fechaLimite.setHours(0, 0, 0, 0);

        return folios.filter(folio => {
            const fechaFolio = new Date(folio.fecha);
            fechaFolio.setHours(0, 0, 0, 0);
            return fechaFolio >= fechaLimite;
        });
    }

    aplicarFiltroFechaHasta(folios, fechaHasta) {
        const fechaLimite = new Date(fechaHasta);
        fechaLimite.setHours(23, 59, 59, 999);

        return folios.filter(folio => {
            const fechaFolio = new Date(folio.fecha);
            return fechaFolio <= fechaLimite;
        });
    }

    aplicarFiltroImportancia(folios, importancia) {
        return folios.filter(folio => folio.importancia === importancia);
    }

    // ==========================================
    // INTERFAZ DE BÚSQUEDA
    // ==========================================

    mostrarContadorResultados() {
        const contador = document.getElementById('searchCount');
        if (contador) {
            contador.classList.add('visible');
        }
    }

    ocultarContadorResultados() {
        const contador = document.getElementById('searchCount');
        if (contador) {
            contador.classList.remove('visible');
        }
    }

    actualizarContadorResultados() {
        const contador = document.getElementById('searchCount');
        if (contador) {
            const cantidad = this.foliosFiltrados.length;
            const texto = cantidad === 1 ? 'resultado' : 'resultados';
            contador.textContent = `${cantidad} ${texto}`;
            
            // Mostrar solo si hay búsqueda activa
            if (this.filtrosActivos.busqueda) {
                contador.classList.add('visible');
            } else {
                contador.classList.remove('visible');
            }
        }
    }

    mostrarIndicadorBusqueda() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.classList.add('searching');
        }
    }

    ocultarIndicadorBusqueda() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.classList.remove('searching');
        }
    }

    // ==========================================
    // FILTROS AVANZADOS
    // ==========================================

    aplicarFiltroAvanzado(config) {
        console.log('🔧 Aplicando filtro avanzado:', config);

        let resultado = [...this.foliosOriginales];

        // Filtros personalizados
        if (config.tipo) {
            resultado = resultado.filter(folio => folio.tipo === config.tipo);
        }

        if (config.rango === 'hoy') {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            resultado = resultado.filter(folio => {
                const fechaFolio = new Date(folio.fecha);
                fechaFolio.setHours(0, 0, 0, 0);
                return fechaFolio.getTime() === hoy.getTime();
            });
        }

        if (config.rango === 'semana') {
            const hoy = new Date();
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - hoy.getDay());
            inicioSemana.setHours(0, 0, 0, 0);

            resultado = resultado.filter(folio => {
                const fechaFolio = new Date(folio.fecha);
                return fechaFolio >= inicioSemana;
            });
        }

        if (config.rango === 'mes') {
            const hoy = new Date();
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

            resultado = resultado.filter(folio => {
                const fechaFolio = new Date(folio.fecha);
                return fechaFolio >= inicioMes;
            });
        }

        this.foliosFiltrados = resultado;

        if (window.bitacoraUI) {
            window.bitacoraUI.mostrarFolios(this.foliosFiltrados, 1);
        }

        return resultado;
    }

    // ==========================================
    // ORDENAMIENTO
    // ==========================================

    ordenarFolios(criterio, direccion = 'desc') {
        console.log(`📊 Ordenando por ${criterio} (${direccion})`);

        this.foliosFiltrados.sort((a, b) => {
            let valorA, valorB;

            switch (criterio) {
                case 'fecha':
                    valorA = new Date(a.fecha);
                    valorB = new Date(b.fecha);
                    break;
                case 'folio':
                    // Extraer número del folio para ordenamiento correcto
                    const numA = parseInt(a.folio.match(/CI\/(\d+)\/\d{4}/)?.[1] || '0');
                    const numB = parseInt(b.folio.match(/CI\/(\d+)\/\d{4}/)?.[1] || '0');
                    valorA = numA;
                    valorB = numB;
                    break;
                case 'nombre':
                    valorA = (a.nombre || '').toLowerCase();
                    valorB = (b.nombre || '').toLowerCase();
                    break;
                case 'importancia':
                    const orden = { 'alta': 3, 'media': 2, 'baja': 1 };
                    valorA = orden[a.importancia] || 0;
                    valorB = orden[b.importancia] || 0;
                    break;
                default:
                    return 0;
            }

            if (direccion === 'asc') {
                return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
            } else {
                return valorA < valorB ? 1 : valorA > valorB ? -1 : 0;
            }
        });

        if (window.bitacoraUI) {
            window.bitacoraUI.mostrarFolios(this.foliosFiltrados, 1);
        }
    }

    // ==========================================
    // ESTADÍSTICAS FILTRADAS
    // ==========================================

    actualizarEstadisticasFiltradas() {
        const stats = this.calcularEstadisticasFiltradas();
        
        // Actualizar elementos de estadísticas si existen
        const elementos = {
            filtradoTotal: document.getElementById('filtradoTotal'),
            filtradoAlta: document.getElementById('filtradoAlta'),
            filtradoMedia: document.getElementById('filtradoMedia'),
            filtradoBaja: document.getElementById('filtradoBaja')
        };

        Object.keys(elementos).forEach(key => {
            if (elementos[key]) {
                elementos[key].textContent = stats[key] || 0;
            }
        });
    }

    calcularEstadisticasFiltradas() {
        const folios = this.foliosFiltrados;
        
        return {
            filtradoTotal: folios.length,
            filtradoAlta: folios.filter(f => f.importancia === 'alta').length,
            filtradoMedia: folios.filter(f => f.importancia === 'media').length,
            filtradoBaja: folios.filter(f => f.importancia === 'baja').length,
            filtradoSica: folios.filter(f => f.tipo === 'sica').length,
            filtradoManual: folios.filter(f => f.tipo === 'manual').length
        };
    }

    // ==========================================
    // FILTROS PREDEFINIDOS
    // ==========================================

    aplicarFiltroRapido(tipo) {
        console.log(`⚡ Aplicando filtro rápido: ${tipo}`);

        // Limpiar filtros actuales
        this.limpiarFiltros(false);

        switch (tipo) {
            case 'hoy':
                const hoy = new Date().toISOString().split('T')[0];
                document.getElementById('fechaDesde').value = hoy;
                document.getElementById('fechaHasta').value = hoy;
                break;

            case 'semana':
                const inicioSemana = new Date();
                inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
                document.getElementById('fechaDesde').value = inicioSemana.toISOString().split('T')[0];
                break;

            case 'alta-prioridad':
                document.getElementById('filtroImportancia').value = 'alta';
                break;

            case 'sica':
                // Filtrar folios tipo SICA
                this.aplicarFiltroAvanzado({ tipo: 'sica' });
                return; // Salir temprano porque aplicarFiltroAvanzado ya actualiza la vista

            case 'pendientes':
                // Aquí podrías agregar lógica para mostrar solo pendientes
                break;
        }

        // Aplicar filtros normalmente
        this.aplicarFiltros();
    }

    limpiarFiltros(actualizarVista = true) {
        // Limpiar campos del DOM
        document.getElementById('searchInput').value = '';
        document.getElementById('fechaDesde').value = '';
        document.getElementById('fechaHasta').value = '';
        document.getElementById('filtroImportancia').value = '';

        // Limpiar filtros internos
        this.filtrosActivos = {
            busqueda: '',
            fechaDesde: '',
            fechaHasta: '',
            importancia: ''
        };

        // Ocultar contador de resultados
        this.ocultarContadorResultados();
        this.ocultarIndicadorBusqueda();

        if (actualizarVista) {
            this.aplicarFiltros();
        }
    }

    // ==========================================
    // EXPORTACIÓN DE DATOS FILTRADOS
    // ==========================================

    obtenerDatosFiltrados() {
        return {
            folios: [...this.foliosFiltrados],
            filtros: { ...this.filtrosActivos },
            estadisticas: this.calcularEstadisticasFiltradas(),
            total: this.foliosOriginales.length,
            filtrados: this.foliosFiltrados.length
        };
    }

    exportarFiltrados(formato = 'json') {
        const datos = this.obtenerDatosFiltrados();
        
        switch (formato) {
            case 'json':
                this.descargarJSON(datos, 'folios_filtrados.json');
                break;
            case 'csv':
                this.descargarCSV(datos.folios, 'folios_filtrados.csv');
                break;
            default:
                console.warn('Formato de exportación no soportado:', formato);
        }
    }

    descargarJSON(datos, nombreArchivo) {
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        this.descargarArchivo(blob, nombreArchivo);
    }

    descargarCSV(folios, nombreArchivo) {
        const headers = ['Folio', 'Nombre', 'Fecha', 'Importancia', 'Comentarios', 'Tipo', 'Carrera'];
        const rows = folios.map(folio => [
            folio.folio || '',
            folio.nombre || '',
            folio.fecha ? new Date(folio.fecha).toLocaleDateString('es-ES') : '',
            folio.importancia || '',
            (folio.comentarios || '').replace(/"/g, '""'),
            folio.tipo || '',
            folio.carrera || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this.descargarArchivo(blob, nombreArchivo);
    }

    descargarArchivo(blob, nombreArchivo) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    obtenerResumenFiltros() {
        const activos = Object.keys(this.filtrosActivos).filter(
            key => this.filtrosActivos[key] !== ''
        );

        return {
            tieneActivos: activos.length > 0,
            filtrosActivos: activos,
            totalResultados: this.foliosFiltrados.length,
            totalOriginal: this.foliosOriginales.length
        };
    }

    reiniciarPaginacion() {
        if (window.bitacoraUI) {
            window.bitacoraUI.paginaActual = 1;
        }
    }
}

// Instancia global
window.bitacoraFilters = new BitacoraFilters();

console.log('✅ Módulo BitacoraFilters cargado correctamente');