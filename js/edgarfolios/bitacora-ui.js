// bitacora-ui.js - Módulo de Interfaz de Usuario para Bitácora
// Manejo de la interfaz, modales, tablas y vistas

class BitacoraUI {
    constructor() {
        this.vistaActual = 'tabla'; // 'tabla' o 'cards'
        this.foliosActuales = [];
        this.paginaActual = 1;
        this.foliosPorPagina = 15;
        this.modalFolio = null;
        this.modalSICA = null;
        
        this.inicializar();
    }

    inicializar() {
        console.log('🎨 Inicializando BitacoraUI...');
        
        // Configurar modales
        this.modalFolio = new bootstrap.Modal(document.getElementById('modalFolio'));
        this.modalSICA = new bootstrap.Modal(document.getElementById('modalSICA'));
        
        // Event listeners
        this.configurarEventos();
        
        // Configurar componentes base
        this.configurarComponentesBase();
        
        console.log('✅ BitacoraUI inicializada');
    }

    configurarEventos() {
        // Botón nuevo folio
        document.getElementById('btnNuevoFolio')?.addEventListener('click', () => {
            this.mostrarModalFolio();
        });

        // Botón SICA
        document.getElementById('btnSICA')?.addEventListener('click', () => {
            this.mostrarModalSICA();
        });

        // Botón guardar folio
        document.getElementById('btnGuardarFolio')?.addEventListener('click', () => {
            this.guardarFolio();
        });

        // Controles de vista
        document.getElementById('btnVistaTabla')?.addEventListener('click', () => {
            this.cambiarVista('tabla');
        });

        document.getElementById('btnVistaCards')?.addEventListener('click', () => {
            this.cambiarVista('cards');
        });

        // Limpiar filtros
        document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
            this.limpiarFiltros();
        });

        // Exportar datos
        document.getElementById('btnExportar')?.addEventListener('click', () => {
            this.exportarDatos();
        });

        // Modal cerrado - limpiar formulario
        document.getElementById('modalFolio').addEventListener('hidden.bs.modal', () => {
            this.limpiarFormularioFolio();
        });
    }

    configurarComponentesBase() {
        // Configurar título de página
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Bitácora - SICA Admin');
        }

        // Configurar fecha por defecto en campos de fecha
        const hoy = new Date().toISOString().split('T')[0];
        const fechaFolio = document.getElementById('fechaFolio');
        if (fechaFolio) {
            fechaFolio.value = hoy;
        }
    }

    // ==========================================
    // GESTIÓN DE FOLIOS - INTERFAZ
    // ==========================================

    mostrarFolios(folios, pagina = 1) {
        this.foliosActuales = folios;
        this.paginaActual = pagina;
        
        // Ocultar loading
        this.ocultarLoading();
        
        // Mostrar vista según configuración
        if (this.vistaActual === 'tabla') {
            this.mostrarTablaFolios(folios, pagina);
        } else {
            this.mostrarCardsFolios(folios, pagina);
        }
        
        // Actualizar paginación
        this.actualizarPaginacion(folios.length);
        
        // Mostrar mensaje si no hay datos
        if (folios.length === 0) {
            this.mostrarMensajeSinDatos();
        }
    }

    mostrarTablaFolios(folios, pagina) {
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        const tbody = document.getElementById('foliosTableBody');
        
        // Mostrar vista de tabla
        tableView.style.display = 'block';
        cardsView.style.display = 'none';
        
        // Calcular paginación
        const inicio = (pagina - 1) * this.foliosPorPagina;
        const fin = inicio + this.foliosPorPagina;
        const foliosPagina = folios.slice(inicio, fin);
        
        // Limpiar tabla
        tbody.innerHTML = '';
        
        foliosPagina.forEach(folio => {
            const fila = this.crearFilaTabla(folio);
            tbody.appendChild(fila);
        });
        
        // Actualizar botones de vista
        this.actualizarBotonesVista('tabla');
    }

    mostrarCardsFolios(folios, pagina) {
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        const container = document.getElementById('foliosCardsContainer');
        
        // Mostrar vista de cards
        tableView.style.display = 'none';
        cardsView.style.display = 'block';
        
        // Calcular paginación
        const inicio = (pagina - 1) * this.foliosPorPagina;
        const fin = inicio + this.foliosPorPagina;
        const foliosPagina = folios.slice(inicio, fin);
        
        // Limpiar container
        container.innerHTML = '';
        
        foliosPagina.forEach(folio => {
            const card = this.crearCardFolio(folio);
            container.appendChild(card);
        });
        
        // Actualizar botones de vista
        this.actualizarBotonesVista('cards');
    }

    crearFilaTabla(folio) {
        const tr = document.createElement('tr');
        tr.className = 'fade-in-up';
        
        const fechaFormateada = this.formatearFecha(folio.fecha);
        const importanciaBadge = this.crearBadgeImportancia(folio.importancia);
        const comentariosCortos = this.truncarTexto(folio.comentarios || '', 50);
        const acciones = this.crearBotonesAccion(folio);
        
        tr.innerHTML = `
            <td>
                <strong class="text-primary">${folio.folio}</strong>
                ${folio.tipo === 'sica' ? '<span class="badge bg-warning ms-1">SICA</span>' : ''}
            </td>
            <td>
                <div class="fw-bold">${folio.nombre}</div>
                ${folio.carrera ? `<small class="text-muted">${folio.carrera}</small>` : ''}
            </td>
            <td>
                <div>${fechaFormateada}</div>
                <small class="text-muted">${this.calcularTiempoTranscurrido(folio.fecha)}</small>
            </td>
            <td>${importanciaBadge}</td>
            <td>
                <div class="comentarios-cell" title="${folio.comentarios || ''}">${comentariosCortos}</div>
                ${folio.documento ? this.crearEnlaceDocumento(folio.documento) : ''}
            </td>
            <td>${acciones}</td>
        `;
        
        return tr;
    }

    crearCardFolio(folio) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const fechaFormateada = this.formatearFecha(folio.fecha);
        const importanciaBadge = this.crearBadgeImportancia(folio.importancia);
        const comentariosCortos = this.truncarTexto(folio.comentarios || '', 100);
        const acciones = this.crearBotonesAccion(folio, true);
        
        col.innerHTML = `
            <div class="folio-card hover-lift fade-in-up">
                <div class="folio-card-header">
                    <div>
                        <div class="folio-number">${folio.folio}</div>
                        ${folio.tipo === 'sica' ? '<span class="badge bg-warning mt-1">SICA</span>' : ''}
                    </div>
                    <div class="folio-date">${fechaFormateada}</div>
                </div>
                <div class="folio-nombre">${folio.nombre}</div>
                ${folio.carrera ? `<div class="text-muted mb-2">${folio.carrera}</div>` : ''}
                <div class="folio-comentarios">${comentariosCortos}</div>
                <div class="d-flex justify-content-between align-items-center">
                    ${importanciaBadge}
                    <div class="btn-group">
                        ${acciones}
                    </div>
                </div>
                ${folio.documento ? `<div class="mt-2">${this.crearEnlaceDocumento(folio.documento)}</div>` : ''}
            </div>
        `;
        
        return col;
    }

    crearBadgeImportancia(importancia) {
        const clases = {
            alta: 'importancia-alta',
            media: 'importancia-media',
            baja: 'importancia-baja'
        };
        
        const iconos = {
            alta: 'bi-exclamation-triangle-fill',
            media: 'bi-info-circle-fill',
            baja: 'bi-check-circle-fill'
        };
        
        const clase = clases[importancia] || clases.baja;
        const icono = iconos[importancia] || iconos.baja;
        
        return `<span class="importancia-badge ${clase}">
            <i class="${icono} me-1"></i>${importancia || 'baja'}
        </span>`;
    }

    crearBotonesAccion(folio, esCard = false) {
        const btnClass = esCard ? 'btn btn-sm' : 'action-btn';
        
        let botones = `
            <button class="${btnClass} btn-edit" onclick="bitacoraUI.editarFolio('${folio.id}')" 
                    title="Editar folio">
                <i class="bi bi-pencil"></i>
            </button>
        `;
        
        if (folio.documento) {
            botones += `
                <button class="${btnClass} btn-view" onclick="window.open('${folio.documento.url}', '_blank')" 
                        title="Ver documento">
                    <i class="bi bi-eye"></i>
                </button>
            `;
        }
        
        botones += `
            <button class="${btnClass} btn-delete" onclick="bitacoraUI.eliminarFolio('${folio.id}', '${folio.folio}')" 
                    title="Eliminar folio">
                <i class="bi bi-trash"></i>
            </button>
        `;
        
        return botones;
    }

    crearEnlaceDocumento(documento) {
        const extension = documento.nombre.split('.').pop().toLowerCase();
        let icono = 'bi-file-earmark';
        
        switch (extension) {
            case 'pdf':
                icono = 'bi-file-earmark-pdf';
                break;
            case 'doc':
            case 'docx':
                icono = 'bi-file-earmark-word';
                break;
            case 'xls':
            case 'xlsx':
                icono = 'bi-file-earmark-excel';
                break;
        }
        
        return `
            <a href="${documento.url}" target="_blank" class="documento-link">
                <i class="${icono} me-1"></i>${documento.nombre}
            </a>
        `;
    }

    // ==========================================
    // MODALES Y FORMULARIOS
    // ==========================================

    mostrarModalFolio(folio = null) {
        const modal = document.getElementById('modalFolio');
        const titulo = document.getElementById('modalFolioTitle');
        const btnGuardar = document.getElementById('btnGuardarFolio');
        
        if (folio) {
            // Modo edición
            titulo.textContent = 'Editar Folio';
            btnGuardar.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar Folio';
            this.cargarDatosFolioEnFormulario(folio);
        } else {
            // Modo creación
            titulo.textContent = 'Nuevo Folio';
            btnGuardar.innerHTML = '<i class="bi bi-save me-2"></i>Crear Folio';
            this.prepararNuevoFolio();
        }
        
        this.modalFolio.show();
    }

    async prepararNuevoFolio() {
        try {
            const siguienteNumero = await window.bitacoraFirebase.obtenerSiguienteNumeroFolio();
            const folioNumber = document.getElementById('folioNumber');
            if (folioNumber) {
                folioNumber.value = siguienteNumero.toString().padStart(3, '0');
            }
        } catch (error) {
            console.error('Error obteniendo siguiente folio:', error);
        }
    }

    cargarDatosFolioEnFormulario(folio) {
        // Extraer número del folio
        const numeroMatch = folio.folio.match(/CI\/(\d+)\/\d{4}/);
        if (numeroMatch) {
            document.getElementById('folioNumber').value = numeroMatch[1];
        }
        
        document.getElementById('fechaFolio').value = this.formatearFechaInput(folio.fecha);
        document.getElementById('nombreFolio').value = folio.nombre || '';
        document.getElementById('importanciaFolio').value = folio.importancia || '';
        document.getElementById('comentariosFolio').value = folio.comentarios || '';
        
        // Marcar que estamos editando
        document.getElementById('modalFolio').setAttribute('data-editing-id', folio.id);
    }

    limpiarFormularioFolio() {
        const form = document.getElementById('formFolio');
        form.reset();
        
        // Limpiar atributos de edición
        document.getElementById('modalFolio').removeAttribute('data-editing-id');
        
        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaFolio').value = hoy;
    }

    async guardarFolio() {
        try {
            const btnGuardar = document.getElementById('btnGuardarFolio');
            const textoOriginal = btnGuardar.innerHTML;
            
            // Mostrar loading
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';
            btnGuardar.disabled = true;
            
            // Obtener datos del formulario
            const datos = this.obtenerDatosFormularioFolio();
            const archivo = document.getElementById('documentoFolio').files[0];
            
            // Validar formulario
            if (!this.validarFormularioFolio(datos)) {
                return;
            }
            
            const editingId = document.getElementById('modalFolio').getAttribute('data-editing-id');
            
            if (editingId) {
                // Actualizar folio existente
                await window.bitacoraFirebase.actualizarFolio(editingId, datos, archivo);
                this.mostrarNotificacion('Folio actualizado', 'El folio se actualizó correctamente', 'success');
            } else {
                // Crear nuevo folio
                await window.bitacoraFirebase.crearFolio(datos, archivo);
                this.mostrarNotificacion('Folio creado', 'El folio se creó correctamente', 'success');
            }
            
            // Cerrar modal
            this.modalFolio.hide();
            
            // Recargar datos
            if (window.bitacoraMain) {
                window.bitacoraMain.cargarDatos();
            }
            
        } catch (error) {
            console.error('Error guardando folio:', error);
            this.mostrarNotificacion('Error', error.message, 'error');
            
        } finally {
            // Restaurar botón
            const btnGuardar = document.getElementById('btnGuardarFolio');
            btnGuardar.innerHTML = btnGuardar.getAttribute('data-editing-id') ? 
                '<i class="bi bi-save me-2"></i>Actualizar Folio' : 
                '<i class="bi bi-save me-2"></i>Crear Folio';
            btnGuardar.disabled = false;
        }
    }

    obtenerDatosFormularioFolio() {
        const folioNumber = document.getElementById('folioNumber').value.padStart(3, '0');
        const año = new Date().getFullYear();
        
        return {
            folio: `CI/${folioNumber}/${año}`,
            nombre: document.getElementById('nombreFolio').value.trim(),
            fecha: document.getElementById('fechaFolio').value,
            importancia: document.getElementById('importanciaFolio').value,
            comentarios: document.getElementById('comentariosFolio').value.trim()
        };
    }

    validarFormularioFolio(datos) {
        if (!datos.folio || !datos.nombre || !datos.fecha || !datos.importancia || !datos.comentarios) {
            this.mostrarNotificacion('Datos incompletos', 'Por favor completa todos los campos obligatorios', 'warning');
            return false;
        }
        
        // Validar número de folio
        const numero = parseInt(datos.folio.match(/CI\/(\d+)\/\d{4}/)[1]);
        if (numero < 1 || numero > 999) {
            this.mostrarNotificacion('Folio inválido', 'El número de folio debe estar entre 001 y 999', 'warning');
            return false;
        }
        
        return true;
    }

    // ==========================================
    // MODAL SICA
    // ==========================================

    async mostrarModalSICA() {
        this.modalSICA.show();
        
        // Mostrar loading
        this.mostrarLoadingSICA();
        
        try {
            const pendientes = await window.bitacoraFirebase.obtenerPendientesSICA();
            this.mostrarPendientesSICA(pendientes);
            
        } catch (error) {
            console.error('Error cargando pendientes SICA:', error);
            this.mostrarErrorSICA(error.message);
        }
    }

    mostrarLoadingSICA() {
        document.getElementById('loadingSICA').style.display = 'block';
        document.getElementById('sicaTableContainer').style.display = 'none';
        document.getElementById('noPendientes').style.display = 'none';
    }

    mostrarPendientesSICA(pendientes) {
        document.getElementById('loadingSICA').style.display = 'none';
        
        if (pendientes.length === 0) {
            document.getElementById('noPendientes').style.display = 'block';
            document.getElementById('sicaTableContainer').style.display = 'none';
            return;
        }
        
        document.getElementById('sicaTableContainer').style.display = 'block';
        document.getElementById('noPendientes').style.display = 'none';
        
        const tbody = document.getElementById('sicaTableBody');
        tbody.innerHTML = '';
        
        pendientes.forEach(pendiente => {
            const fila = this.crearFilaPendiente(pendiente);
            tbody.appendChild(fila);
        });
    }

    crearFilaPendiente(pendiente) {
        const tr = document.createElement('tr');
        
        const nombreAsesor = pendiente.asesor?.nombreAsesor || 'No encontrado';
        const numeroCuenta = pendiente.asesor?.numeroCuenta || 'N/A';
        const carrera = pendiente.asesor?.carrera || 'No especificada';
        const tipoAutorizacion = pendiente.tipoAutorizacion || 'No especificado';
        const fechaSolicitud = this.formatearFecha(pendiente.fechaSolicitud);
        
        tr.innerHTML = `
            <td>
                <div class="fw-bold">${nombreAsesor}</div>
                <small class="text-muted">ID: ${pendiente.asesorId}</small>
            </td>
            <td>${numeroCuenta}</td>
            <td>
                <div class="text-truncate" style="max-width: 200px;" title="${carrera}">
                    ${carrera}
                </div>
            </td>
            <td>
                <span class="badge bg-primary">${tipoAutorizacion}</span>
            </td>
            <td>
                <div>${fechaSolicitud}</div>
                <small class="text-muted">${this.calcularTiempoTranscurrido(pendiente.fechaSolicitud)}</small>
            </td>
            <td>
                <button class="btn btn-sm btn-success" 
                        onclick="window.location.href='autorizacion.html?id=${pendiente.id}'"
                        title="Autorizar">
                    <i class="bi bi-check-circle me-1"></i>Autorizar
                </button>
            </td>
        `;
        
        return tr;
    }

    mostrarErrorSICA(mensaje) {
        document.getElementById('loadingSICA').style.display = 'none';
        document.getElementById('sicaTableContainer').style.display = 'none';
        document.getElementById('noPendientes').innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-exclamation-triangle display-1 text-danger"></i>
                <h5 class="mt-3 text-danger">Error cargando pendientes</h5>
                <p class="text-muted">${mensaje}</p>
                <button class="btn btn-primary" onclick="bitacoraUI.mostrarModalSICA()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                </button>
            </div>
        `;
        document.getElementById('noPendientes').style.display = 'block';
    }

    // ==========================================
    // ACCIONES DE FOLIOS
    // ==========================================

    async editarFolio(id) {
        try {
            const folio = await window.bitacoraFirebase.obtenerFolioPorId(id);
            this.mostrarModalFolio(folio);
            
        } catch (error) {
            console.error('Error obteniendo folio:', error);
            this.mostrarNotificacion('Error', 'No se pudo cargar el folio', 'error');
        }
    }

    async eliminarFolio(id, folioNumero) {
        const confirmacion = await this.mostrarConfirmacion(
            'Eliminar Folio',
            `¿Estás seguro de eliminar el folio ${folioNumero}? Esta acción no se puede deshacer.`,
            'danger'
        );
        
        if (!confirmacion) return;
        
        try {
            await window.bitacoraFirebase.eliminarFolio(id);
            this.mostrarNotificacion('Folio eliminado', 'El folio se eliminó correctamente', 'success');
            
            // Recargar datos
            if (window.bitacoraMain) {
                window.bitacoraMain.cargarDatos();
            }
            
        } catch (error) {
            console.error('Error eliminando folio:', error);
            this.mostrarNotificacion('Error', 'No se pudo eliminar el folio', 'error');
        }
    }

    // ==========================================
    // UTILIDADES DE INTERFAZ
    // ==========================================

    cambiarVista(vista) {
        this.vistaActual = vista;
        this.mostrarFolios(this.foliosActuales, this.paginaActual);
    }

    actualizarBotonesVista(vistaActiva) {
        const btnTabla = document.getElementById('btnVistaTabla');
        const btnCards = document.getElementById('btnVistaCards');
        
        btnTabla.classList.toggle('active', vistaActiva === 'tabla');
        btnCards.classList.toggle('active', vistaActiva === 'cards');
    }

    limpiarFiltros() {
        document.getElementById('searchInput').value = '';
        document.getElementById('fechaDesde').value = '';
        document.getElementById('fechaHasta').value = '';
        document.getElementById('filtroImportancia').value = '';
        
        // Disparar evento de filtro
        if (window.bitacoraFilters) {
            window.bitacoraFilters.aplicarFiltros();
        }
    }

    mostrarLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('cardsView').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'none';
    }

    ocultarLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    mostrarMensajeSinDatos() {
        document.getElementById('tableView').style.display = 'none';
        document.getElementById('cardsView').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'block';
    }

    actualizarPaginacion(totalFolios) {
        const totalPaginas = Math.ceil(totalFolios / this.foliosPorPagina);
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        
        // Actualizar información
        const inicio = (this.paginaActual - 1) * this.foliosPorPagina + 1;
        const fin = Math.min(inicio + this.foliosPorPagina - 1, totalFolios);
        paginationInfo.textContent = `${inicio}-${fin} de ${totalFolios}`;
        
        // Generar paginación
        paginationContainer.innerHTML = '';
        
        if (totalPaginas <= 1) return;
        
        // Botón anterior
        if (this.paginaActual > 1) {
            const btnAnterior = this.crearBotonPaginacion('Anterior', this.paginaActual - 1);
            paginationContainer.appendChild(btnAnterior);
        }
        
        // Números de página
        const inicioRango = Math.max(1, this.paginaActual - 2);
        const finRango = Math.min(totalPaginas, this.paginaActual + 2);
        
        for (let i = inicioRango; i <= finRango; i++) {
            const btnPagina = this.crearBotonPaginacion(i.toString(), i, i === this.paginaActual);
            paginationContainer.appendChild(btnPagina);
        }
        
        // Botón siguiente
        if (this.paginaActual < totalPaginas) {
            const btnSiguiente = this.crearBotonPaginacion('Siguiente', this.paginaActual + 1);
            paginationContainer.appendChild(btnSiguiente);
        }
    }

    crearBotonPaginacion(texto, pagina, activo = false) {
        const li = document.createElement('li');
        li.className = `page-item ${activo ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = texto;
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!activo && window.bitacoraMain) {
                this.paginaActual = pagina;
                window.bitacoraMain.aplicarFiltrosYMostrar();
            }
        });
        
        li.appendChild(a);
        return li;
    }

    // ==========================================
    // UTILIDADES GENERALES
    // ==========================================

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

    calcularTiempoTranscurrido(fecha) {
        const ahora = new Date();
        const fechaObj = new Date(fecha);
        const diff = ahora - fechaObj;
        
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (dias === 0) return 'Hoy';
        if (dias === 1) return 'Ayer';
        if (dias < 7) return `Hace ${dias} días`;
        if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
        if (dias < 365) return `Hace ${Math.floor(dias / 30)} meses`;
        
        return `Hace ${Math.floor(dias / 365)} años`;
    }

    truncarTexto(texto, maxLength) {
        if (texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength) + '...';
    }

    async exportarDatos() {
        try {
            // Implementar exportación (CSV o Excel)
            this.mostrarNotificacion('Función en desarrollo', 'La exportación estará disponible próximamente', 'info');
        } catch (error) {
            console.error('Error exportando:', error);
        }
    }

    mostrarNotificacion(titulo, mensaje, tipo = 'info', icono = null) {
        const iconos = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        
        const iconoFinal = icono || iconos[tipo] || iconos.info;
        
        if (window.SICAComponents) {
            window.SICAComponents.notify(titulo, mensaje, tipo, iconoFinal);
        } else {
            alert(`${titulo}: ${mensaje}`);
        }
    }

    async mostrarConfirmacion(titulo, mensaje, tipo = 'primary') {
        return new Promise((resolve) => {
            // Implementación simple con confirm por ahora
            // En producción se podría usar un modal más elegante
            const resultado = confirm(`${titulo}\n\n${mensaje}`);
            resolve(resultado);
        });
    }
}

// Instancia global
window.bitacoraUI = new BitacoraUI();

console.log('✅ Módulo BitacoraUI cargado correctamente');