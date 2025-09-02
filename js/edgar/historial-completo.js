// historial-completo.js - Módulo de gestión completa del historial de folios
class HistorialCompleto {
    constructor() {
        this.db = firebase.firestore();
        this.configDoc = 'qkLlvrqIPsI7HEPKIhyh';
        this.allRecords = [];
        this.filteredRecords = [];
        this.currentPage = 1;
        this.recordsPerPage = 100;
        this.currentView = 'table'; // 'table' o 'card'
        this.currentSort = { field: 'fecha', direction: 'desc' };
        this.filters = {
            search: '',
            tipo: '',
            year: '',
            month: '',
            limit: 100
        };
    }

    // ================================
    // INICIALIZACIÓN
    // ================================
    async init() {
        try {
            console.log('📊 Inicializando HistorialCompleto...');
            this.setupEventListeners();
            await this.loadAllRecords();
            this.setupFilters();
            console.log('✅ HistorialCompleto inicializado');
        } catch (error) {
            console.error('❌ Error inicializando HistorialCompleto:', error);
            this.showNotification('Error de inicialización', 'No se pudo cargar el historial completo', 'error');
        }
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('searchInput')?.addEventListener('input', (e) => this.handleSearchChange(e));
        document.getElementById('tipoFilter')?.addEventListener('change', (e) => this.handleFilterChange(e));
        document.getElementById('yearFilter')?.addEventListener('change', (e) => this.handleFilterChange(e));
        document.getElementById('monthFilter')?.addEventListener('change', (e) => this.handleFilterChange(e));
        document.getElementById('limitFilter')?.addEventListener('change', (e) => this.handleFilterChange(e));
        
        // Botones
        document.getElementById('btnClearFilters')?.addEventListener('click', () => this.clearAllFilters());
        document.getElementById('btnExportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('btnTableView')?.addEventListener('click', () => this.switchView('table'));
        document.getElementById('btnCardView')?.addEventListener('click', () => this.switchView('card'));
        
        // Modal de edición
        document.getElementById('btnConfirmEdit')?.addEventListener('click', () => this.confirmEdit());
    }

    // ================================
    // CARGA DE DATOS
    // ================================
    async loadAllRecords() {
        try {
            this.showLoading(true);
            
            // Cargar registros principales
            const configRef = this.db.collection('configuracion').doc(this.configDoc);
            const configSnap = await configRef.get();
            
            let mainRecords = [];
            if (configSnap.exists) {
                const data = configSnap.data();
                mainRecords = data.historialFolios || [];
            }
            
            // Cargar registros personalizados de la colección edgar
            const edgarSnapshot = await this.db.collection('edgar').get();
            const personalizedRecords = edgarSnapshot.docs.map(doc => ({
                id: doc.id,
                folio: doc.data().folio,
                tipo: 'Folio Personalizado',
                fecha: doc.data().fecha,
                asesor: doc.data().nombre,
                numeroCuenta: 'N/A',
                comentario: doc.data().comentario,
                esPersonalizado: true,
                ...doc.data()
            }));
            
            // Combinar todos los registros
            this.allRecords = [...mainRecords, ...personalizedRecords];
            
            // Aplicar filtros y ordenamiento inicial
            this.applyFiltersAndSort();
            
            // Actualizar estadísticas
            this.updateStats();
            
            // Renderizar vista inicial
            this.renderCurrentView();
            
        } catch (error) {
            console.error('❌ Error cargando registros:', error);
            this.showError('No se pudieron cargar los registros del historial');
        } finally {
            this.showLoading(false);
        }
    }

    // ================================
    // FILTROS Y BÚSQUEDA
    // ================================
    handleSearchChange(event) {
        const query = event.target.value.trim();
        this.filters.search = query;
        this.debounceFilter();
    }

    handleFilterChange(event) {
        const { id, value } = event.target;
        
        switch (id) {
            case 'tipoFilter':
                this.filters.tipo = value;
                break;
            case 'yearFilter':
                this.filters.year = value;
                break;
            case 'monthFilter':
                this.filters.month = value;
                break;
            case 'limitFilter':
                this.filters.limit = parseInt(value) || 0;
                this.recordsPerPage = this.filters.limit || this.allRecords.length;
                break;
        }
        
        this.currentPage = 1; // Reset página
        this.applyFiltersAndSort();
        this.renderCurrentView();
    }

    debounceFilter() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.applyFiltersAndSort();
            this.renderCurrentView();
        }, 300);
    }

    applyFiltersAndSort() {
        let filtered = [...this.allRecords];
        
        // Filtro de búsqueda
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(record => 
                (record.folio || '').toLowerCase().includes(searchLower) ||
                (record.asesor || '').toLowerCase().includes(searchLower) ||
                (record.numeroCuenta || '').toString().includes(searchLower) ||
                (record.tipo || '').toLowerCase().includes(searchLower)
            );
        }
        
        // Filtro por tipo
        if (this.filters.tipo) {
            if (this.filters.tipo === 'personalizado') {
                filtered = filtered.filter(record => record.esPersonalizado);
            } else if (this.filters.tipo === 'aceptacion') {
                filtered = filtered.filter(record => 
                    (record.tipo || '').toLowerCase().includes('aceptación') ||
                    (record.tipo || '').toLowerCase().includes('aceptacion')
                );
            } else if (this.filters.tipo === 'termino') {
                filtered = filtered.filter(record => 
                    (record.tipo || '').toLowerCase().includes('término') ||
                    (record.tipo || '').toLowerCase().includes('termino')
                );
            }
        }
        
        // Filtro por año
        if (this.filters.year) {
            filtered = filtered.filter(record => {
                const recordYear = new Date(record.fecha).getFullYear().toString();
                return recordYear === this.filters.year;
            });
        }
        
        // Filtro por mes
        if (this.filters.month !== '') {
            const targetMonth = parseInt(this.filters.month);
            filtered = filtered.filter(record => {
                const recordMonth = new Date(record.fecha).getMonth();
                return recordMonth === targetMonth;
            });
        }
        
        // Aplicar ordenamiento
        this.sortRecords(filtered);
        
        // Aplicar límite si está configurado
        if (this.filters.limit && this.filters.limit > 0) {
            this.filteredRecords = filtered.slice(0, this.filters.limit);
        } else {
            this.filteredRecords = filtered;
        }
        
        // Actualizar estadísticas
        this.updateStats();
    }

    sortRecords(records) {
        records.sort((a, b) => {
            const { field, direction } = this.currentSort;
            let aValue = a[field];
            let bValue = b[field];
            
            // Manejar fechas
            if (field === 'fecha') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            // Manejar strings
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            // Manejar valores nulos
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
            
            return direction === 'desc' ? comparison * -1 : comparison;
        });
    }

    clearAllFilters() {
        // Resetear filtros
        this.filters = {
            search: '',
            tipo: '',
            year: '',
            month: '',
            limit: 100
        };
        
        // Limpiar UI
        document.getElementById('searchInput').value = '';
        document.getElementById('tipoFilter').value = '';
        document.getElementById('yearFilter').value = '';
        document.getElementById('monthFilter').value = '';
        document.getElementById('limitFilter').value = '100';
        
        // Aplicar cambios
        this.recordsPerPage = 100;
        this.currentPage = 1;
        this.applyFiltersAndSort();
        this.renderCurrentView();
        
        this.showNotification('Filtros limpiados', 'Se han eliminado todos los filtros', 'info');
    }

    // ================================
    // CONFIGURACIÓN DE FILTROS
    // ================================
    setupFilters() {
        this.setupYearFilter();
    }

    setupYearFilter() {
        const yearSelect = document.getElementById('yearFilter');
        if (!yearSelect || this.allRecords.length === 0) return;
        
        // Obtener años únicos de los registros
        const years = new Set();
        this.allRecords.forEach(record => {
            if (record.fecha) {
                years.add(new Date(record.fecha).getFullYear());
            }
        });
        
        // Ordenar años descendente
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        
        // Limpiar y agregar opciones
        yearSelect.innerHTML = '<option value="">Todos</option>';
        sortedYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    // ================================
    // RENDERIZADO
    // ================================
    renderCurrentView() {
        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderCardView();
        }
        this.renderPagination();
    }

    renderTableView() {
        const tableBody = document.getElementById('historialTableBody');
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        const noResults = document.getElementById('noResults');
        
        // Mostrar/ocultar vistas
        tableView.style.display = 'block';
        cardView.style.display = 'none';
        
        if (this.filteredRecords.length === 0) {
            tableView.style.display = 'none';
            noResults.style.display = 'block';
            return;
        } else {
            noResults.style.display = 'none';
        }
        
        // Calcular registros de la página actual
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const pageRecords = this.filteredRecords.slice(startIndex, endIndex);
        
        // Generar filas
        tableBody.innerHTML = pageRecords.map(record => `
            <tr class="fade-in" data-record-id="${record.id || record.folio}">
                <td>
                    <strong class="text-primary">${record.folio}</strong>
                </td>
                <td>
                    <span class="tipo-badge tipo-${this.getTipoClass(record.tipo)}">
                        ${record.tipo}
                    </span>
                </td>
                <td>
                    <div class="asesor-info">
                        <div class="fw-bold">${record.asesor}</div>
                        ${record.comentario && record.esPersonalizado ? 
                            `<small class="text-muted">${record.comentario.substring(0, 50)}${record.comentario.length > 50 ? '...' : ''}</small>` 
                            : ''
                        }
                    </div>
                </td>
                <td>
                    <code class="bg-light px-2 py-1 rounded">${record.numeroCuenta}</code>
                </td>
                <td>
                    <div class="date-info">
                        <div>${this.formatDate(record.fecha)}</div>
                        <small class="text-muted">${this.getRelativeTime(record.fecha)}</small>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${!record.esPersonalizado ? `
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="window.historialCompleto.editRecord('${record.folio}', '${record.numeroCuenta}')"
                                    title="Editar registro">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline-secondary btn-sm" disabled title="Los registros personalizados no se pueden editar">
                                <i class="bi bi-lock"></i>
                            </button>
                        `}
                        <button class="btn btn-outline-info btn-sm" 
                                onclick="window.historialCompleto.viewDetails('${record.id || record.folio}')"
                                title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Configurar ordenamiento de columnas
        this.setupTableSorting();
    }

    renderCardView() {
        const cardContainer = document.getElementById('historialCardContainer');
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        const noResults = document.getElementById('noResults');
        
        // Mostrar/ocultar vistas
        tableView.style.display = 'none';
        cardView.style.display = 'block';
        
        if (this.filteredRecords.length === 0) {
            cardView.style.display = 'none';
            noResults.style.display = 'block';
            return;
        } else {
            noResults.style.display = 'none';
        }
        
        // Calcular registros de la página actual
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const pageRecords = this.filteredRecords.slice(startIndex, endIndex);
        
        // Generar tarjetas
        cardContainer.innerHTML = pageRecords.map(record => `
            <div class="col-lg-4 col-md-6 col-sm-12">
                <div class="historial-card ${this.getTipoClass(record.tipo)} fade-in" 
                     data-record-id="${record.id || record.folio}">
                    <div class="card-header">
                        <h4 class="card-folio">${record.folio}</h4>
                        <span class="card-date">${this.formatDate(record.fecha)}</span>
                    </div>
                    <div class="card-body">
                        <span class="card-tipo">${record.tipo}</span>
                        <div class="card-asesor">${record.asesor}</div>
                        <div class="card-cuenta">Cuenta: ${record.numeroCuenta}</div>
                        ${record.comentario && record.esPersonalizado ? `
                            <div class="card-comentario">
                                <i class="bi bi-chat-quote"></i>
                                ${record.comentario}
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-actions">
                        ${!record.esPersonalizado ? `
                            <button class="btn btn-outline-primary btn-sm" 
                                    onclick="window.historialCompleto.editRecord('${record.folio}', '${record.numeroCuenta}')"
                                    title="Editar registro">
                                <i class="bi bi-pencil-square"></i>
                                Editar
                            </button>
                        ` : `
                            <button class="btn btn-outline-secondary btn-sm" disabled>
                                <i class="bi bi-lock"></i>
                                Bloqueado
                            </button>
                        `}
                        <button class="btn btn-outline-info btn-sm" 
                                onclick="window.historialCompleto.viewDetails('${record.id || record.folio}')"
                                title="Ver detalles">
                            <i class="bi bi-eye"></i>
                            Detalles
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupTableSorting() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.sort;
                
                // Cambiar dirección si es el mismo campo
                if (this.currentSort.field === field) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.field = field;
                    this.currentSort.direction = 'asc';
                }
                
                // Actualizar UI de headers
                sortableHeaders.forEach(h => {
                    h.classList.remove('sorted', 'asc', 'desc');
                });
                header.classList.add('sorted', this.currentSort.direction);
                
                // Aplicar ordenamiento
                this.applyFiltersAndSort();
                this.renderCurrentView();
            });
        });
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        const totalRecords = this.filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / this.recordsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botón anterior
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="window.historialCompleto.goToPage(${this.currentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Páginas
        const showPages = this.calculatePagesToShow(totalPages);
        showPages.forEach(page => {
            if (page === '...') {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            } else {
                html += `
                    <li class="page-item ${this.currentPage === page ? 'active' : ''}">
                        <button class="page-link" onclick="window.historialCompleto.goToPage(${page})">${page}</button>
                    </li>
                `;
            }
        });
        
        // Botón siguiente
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="window.historialCompleto.goToPage(${this.currentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
        `;
        
        pagination.innerHTML = html;
    }

    calculatePagesToShow(totalPages) {
        const current = this.currentPage;
        const pages = [];
        
        if (totalPages <= 7) {
            // Mostrar todas las páginas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Lógica más compleja para muchas páginas
            pages.push(1);
            
            if (current > 4) {
                pages.push('...');
            }
            
            const start = Math.max(2, current - 1);
            const end = Math.min(totalPages - 1, current + 1);
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (current < totalPages - 3) {
                pages.push('...');
            }
            
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }
        
        return pages;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredRecords.length / this.recordsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderCurrentView();
        }
    }

    // ================================
    // CAMBIO DE VISTA
    // ================================
    switchView(view) {
        this.currentView = view;
        
        // Actualizar botones
        document.getElementById('btnTableView').classList.toggle('active', view === 'table');
        document.getElementById('btnCardView').classList.toggle('active', view === 'card');
        
        // Renderizar vista
        this.renderCurrentView();
    }

    // ================================
    // EDICIÓN Y DETALLES
    // ================================
    async editRecord(folio, numeroCuenta) {
        try {
            // Mostrar modal de confirmación
            const modal = new bootstrap.Modal(document.getElementById('editConfirmModal'));
            
            // Llenar información del registro
            const record = this.allRecords.find(r => r.folio === folio && r.numeroCuenta === numeroCuenta);
            if (!record) {
                throw new Error('Registro no encontrado');
            }
            
            document.getElementById('editRecordInfo').innerHTML = `
                <div class="border rounded p-3 bg-light">
                    <h6 class="text-primary mb-2">
                        <i class="bi bi-file-text"></i>
                        ${record.folio}
                    </h6>
                    <p class="mb-1"><strong>Tipo:</strong> ${record.tipo}</p>
                    <p class="mb-1"><strong>Asesor:</strong> ${record.asesor}</p>
                    <p class="mb-1"><strong>Cuenta:</strong> ${record.numeroCuenta}</p>
                    <p class="mb-0"><strong>Fecha:</strong> ${this.formatDate(record.fecha)}</p>
                </div>
            `;
            
            // Guardar datos para confirmación
            this.recordToEdit = record;
            
            modal.show();
            
        } catch (error) {
            console.error('Error preparando edición:', error);
            this.showNotification('Error', 'No se pudo preparar la edición del registro', 'error');
        }
    }

    async confirmEdit() {
        try {
            if (!this.recordToEdit) {
                throw new Error('No hay registro seleccionado para editar');
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editConfirmModal'));
            modal.hide();
            
            // Obtener datos del asesor
            const asesorQuery = await this.db.collection('asesores')
                .where('numeroCuenta', '==', this.recordToEdit.numeroCuenta)
                .where('servicioSocial', '==', true)
                .get();
            
            if (asesorQuery.empty) {
                throw new Error('No se encontró información del asesor');
            }
            
            const asesorData = { id: asesorQuery.docs[0].id, ...asesorQuery.docs[0].data() };
            
            // Determinar tipo de documento basado en el registro
            let docType = null;
            const tipo = this.recordToEdit.tipo.toLowerCase();
            
            if (tipo.includes('aceptación') || tipo.includes('aceptacion')) {
                if (asesorData.carrera && asesorData.carrera.toLowerCase().includes('química')) {
                    docType = { type: 'carta-aceptacion-fq', category: 'aceptacion', title: 'Carta de Aceptación FQ' };
                } else {
                    docType = { type: 'carta-aceptacion-prepa', category: 'aceptacion', title: 'Carta de Aceptación Prepa' };
                }
            } else if (tipo.includes('término') || tipo.includes('termino')) {
                if (asesorData.carrera && asesorData.carrera.toLowerCase().includes('química')) {
                    docType = { type: 'carta-termino-fq', category: 'termino', title: 'Carta de Término FQ' };
                } else {
                    docType = { type: 'carta-termino-prepa', category: 'termino', title: 'Carta de Término Prepa' };
                }
            }
            
            if (!docType) {
                throw new Error('No se pudo determinar el tipo de documento');
            }
            
            // Redirigir a admin-folios.html con parámetros para edición
            const params = new URLSearchParams({
                edit: 'true',
                folio: this.recordToEdit.folio,
                asesorId: asesorData.id,
                docType: docType.type,
                docCategory: docType.category,
                docTitle: docType.title
            });
            
            window.location.href = `../../view/folio-manager.html?${params.toString()}`;
            
        } catch (error) {
            console.error('Error iniciando edición:', error);
            this.showNotification('Error', 'No se pudo iniciar la edición: ' + error.message, 'error');
        }
    }

    viewDetails(recordId) {
        const record = this.allRecords.find(r => (r.id || r.folio) === recordId);
        if (!record) return;
        
        // Crear modal de detalles dinámicamente
        const modalHtml = `
            <div class="modal fade" id="detailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-info-circle"></i>
                                Detalles del Registro
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-primary">Información General</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Folio:</strong></td><td>${record.folio}</td></tr>
                                        <tr><td><strong>Tipo:</strong></td><td>${record.tipo}</td></tr>
                                        <tr><td><strong>Fecha:</strong></td><td>${this.formatDate(record.fecha)}</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-primary">Datos del Asesor</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Nombre:</strong></td><td>${record.asesor}</td></tr>
                                        <tr><td><strong>Cuenta:</strong></td><td>${record.numeroCuenta}</td></tr>
                                        <tr><td><strong>Personalizado:</strong></td><td>${record.esPersonalizado ? 'Sí' : 'No'}</td></tr>
                                    </table>
                                </div>
                            </div>
                            ${record.comentario ? `
                                <div class="mt-3">
                                    <h6 class="text-primary">Comentario</h6>
                                    <div class="alert alert-info">
                                        <i class="bi bi-chat-quote"></i>
                                        ${record.comentario}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente y agregar nuevo
        const existingModal = document.getElementById('detailsModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
        
        // Limpiar modal al cerrar
        document.getElementById('detailsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // ================================
    // EXPORTACIÓN
    // ================================
    async exportData() {
        try {
            const btn = document.getElementById('btnExportData');
            btn.classList.add('exporting');
            btn.disabled = true;
            
            // Preparar datos para exportar
            const dataToExport = this.filteredRecords.map(record => ({
                Folio: record.folio,
                Tipo: record.tipo,
                Asesor: record.asesor,
                'Número de Cuenta': record.numeroCuenta,
                Fecha: this.formatDate(record.fecha),
                'Es Personalizado': record.esPersonalizado ? 'Sí' : 'No',
                Comentario: record.comentario || 'N/A'
            }));
            
            // Crear CSV
            const csvContent = this.createCSV(dataToExport);
            
            // Descargar archivo
            this.downloadCSV(csvContent, `historial-folios-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.showNotification('Exportación exitosa', `Se exportaron ${dataToExport.length} registros`, 'success');
            
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showNotification('Error', 'No se pudieron exportar los datos', 'error');
        } finally {
            const btn = document.getElementById('btnExportData');
            btn.classList.remove('exporting');
            btn.disabled = false;
        }
    }

    createCSV(data) {
        if (data.length === 0) return '';
        
        // Headers
        const headers = Object.keys(data[0]);
        let csv = headers.join(',') + '\n';
        
        // Datos
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escapar comillas y agregar comillas si contiene comas
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : value;
            });
            csv += values.join(',') + '\n';
        });
        
        return csv;
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // ================================
    // ESTADÍSTICAS
    // ================================
    updateStats() {
        const stats = this.calculateStats();
        
        document.getElementById('totalRegistros').textContent = stats.total;
        document.getElementById('registrosAceptacion').textContent = stats.aceptacion;
        document.getElementById('registrosTermino').textContent = stats.termino;
        document.getElementById('registrosPersonalizados').textContent = stats.personalizados;
    }

    calculateStats() {
        return {
            total: this.filteredRecords.length,
            aceptacion: this.filteredRecords.filter(r => 
                (r.tipo || '').toLowerCase().includes('aceptación') || 
                (r.tipo || '').toLowerCase().includes('aceptacion')
            ).length,
            termino: this.filteredRecords.filter(r => 
                (r.tipo || '').toLowerCase().includes('término') || 
                (r.tipo || '').toLowerCase().includes('termino')
            ).length,
            personalizados: this.filteredRecords.filter(r => r.esPersonalizado).length
        };
    }

    // ================================
    // UTILIDADES
    // ================================
    getTipoClass(tipo) {
        const tipoLower = (tipo || '').toLowerCase();
        if (tipoLower.includes('aceptación') || tipoLower.includes('aceptacion')) {
            return 'aceptacion';
        } else if (tipoLower.includes('término') || tipoLower.includes('termino')) {
            return 'termino';
        } else if (tipoLower.includes('personalizado')) {
            return 'personalizado';
        }
        return 'personalizado';
    }

    formatDate(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    getRelativeTime(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Hoy';
            if (diffDays === 1) return 'Ayer';
            if (diffDays < 7) return `Hace ${diffDays} días`;
            if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
            if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
            return `Hace ${Math.floor(diffDays / 365)} años`;
        } catch (error) {
            return '';
        }
    }

    showLoading(show) {
        const loading = document.getElementById('tableLoading');
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        
        if (show) {
            loading.style.display = 'block';
            tableView.style.display = 'none';
            cardView.style.display = 'none';
        } else {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        const container = document.querySelector('.historial-table-panel');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
                <h4 class="text-danger mt-3">Error</h4>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise"></i>
                    Recargar página
                </button>
            </div>
        `;
    }

    showNotification(title, message, type = 'info', icon = null) {
        // Usar sistema de notificaciones del componente base si está disponible
        if (window.SICAComponents) {
            const iconMap = {
                success: 'bi-check-circle',
                error: 'bi-exclamation-triangle',
                warning: 'bi-exclamation-circle',
                info: 'bi-info-circle'
            };
            
            window.SICAComponents.notify(
                title, 
                message, 
                type, 
                icon || iconMap[type]
            );
        } else {
            // Fallback a console si no está disponible el sistema de notificaciones
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // ================================
    // MÉTODOS PÚBLICOS PARA DEBUG
    // ================================
    getStats() {
        return {
            allRecords: this.allRecords.length,
            filteredRecords: this.filteredRecords.length,
            currentPage: this.currentPage,
            recordsPerPage: this.recordsPerPage,
            currentView: this.currentView,
            filters: this.filters,
            sort: this.currentSort
        };
    }

    refreshData() {
        return this.loadAllRecords();
    }

    // ================================
    // MÉTODO DE LIMPIEZA
    // ================================
    destroy() {
        // Limpiar timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Limpiar referencias
        this.allRecords = [];
        this.filteredRecords = [];
        this.recordToEdit = null;
        
        console.log('🧹 HistorialCompleto destruido');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.historialCompleto = new HistorialCompleto();
});

// Exportar para uso global
window.HistorialCompleto = HistorialCompleto;