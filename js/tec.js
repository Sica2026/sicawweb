/**
 * TECHNICAL MANAGEMENT SYSTEM
 * Sistema de Gestión Técnica SICA
 */

class TechnicalManager {
    constructor() {
        this.currentView = 'reports'; // 'reports' or 'services'
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {
            room: 'all',
            status: 'all',
            urgency: 'all'
        };
        
        // Colecciones de Firebase
        this.reportsCollection = [];
        this.servicesCollection = [];
        this.db = null;
        
        this.rooms = [
            'SICA 1',
            'SICA 2', 
            'SICA 3',
            'SICA 4',
            'Salón Inteligente 1',
            'Salón Inteligente 2'
        ];
        
        this.init();
    }

    init() {
        this.setupComponents();
        this.initializeFirebase();
        this.setupEventListeners();
        
        // Configurar título (sin breadcrumbs)
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.setPageTitle('Gestión Técnica - SICA');
        }
    }

    setupComponents() {
        console.log('Inicializando componentes del sistema técnico...');
    }

    async initializeFirebase() {
        try {
            // Esperar a que Firebase esté disponible
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                this.db = firebase.firestore();
                console.log('Firebase conectado correctamente para gestión técnica');
                
                // Cargar datos reales
                await this.loadReportsFromFirebase();
                await this.loadServicesFromFirebase();
                
                this.updateStats();
                this.renderRoomCards();
                this.renderTable();
            } else {
                throw new Error('Firebase no está disponible');
            }
        } catch (error) {
            console.error('Error inicializando Firebase:', error);
            this.showNotification('Error', 'No se pudo conectar con la base de datos', 'error');
            
            // Mostrar interfaz vacía para desarrollo
            this.updateStats();
            this.renderRoomCards();
            this.renderTable();
        }
    }

    async loadReportsFromFirebase() {
        try {
            const snapshot = await this.db.collection('reportes_tecnicos')
                .orderBy('fechaCreacion', 'desc')
                .get();

            this.reportsCollection = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                this.reportsCollection.push({
                    id: doc.id,
                    numeroReporte: data.numeroReporte,
                    sala: data.sala,
                    tipoServicio: data.tipoServicio,
                    descripcion: data.descripcion,
                    responsable: data.responsable,
                    estado: data.estado,
                    urgencia: data.urgencia,
                    fechaInicio: data.fechaInicio,
                    fechaTermino: data.fechaTermino,
                    fechaCreacion: data.fechaCreacion,
                    fechaActualizacion: data.fechaActualizacion
                });
            });

            console.log(`Cargados ${this.reportsCollection.length} reportes desde Firebase`);
        } catch (error) {
            console.error('Error cargando reportes:', error);
            this.reportsCollection = [];
        }
    }

    async loadServicesFromFirebase() {
        try {
            const snapshot = await this.db.collection('servicios_tecnicos')
                .orderBy('fechaInicio', 'desc')
                .get();

            this.servicesCollection = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                this.servicesCollection.push({
                    id: doc.id,
                    ...data
                });
            });

            console.log(`Cargados ${this.servicesCollection.length} servicios desde Firebase`);
        } catch (error) {
            console.error('Error cargando servicios:', error);
            this.servicesCollection = [];
        }
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('roomFilter').addEventListener('change', (e) => {
            this.currentFilters.room = e.target.value;
            this.applyFilters();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.applyFilters();
        });

        document.getElementById('urgencyFilter').addEventListener('change', (e) => {
            this.currentFilters.urgency = e.target.value;
            this.applyFilters();
        });

        // Cambio de vista
        document.getElementById('reportsView').addEventListener('click', () => {
            this.switchView('reports');
        });

        document.getElementById('servicesView').addEventListener('click', () => {
            this.switchView('services');
        });

        // Botón principal
        document.getElementById('newReportBtn').addEventListener('click', () => {
            this.showNewReportModal();
        });

        // Actualizar reporte
        document.getElementById('updateReportBtn').addEventListener('click', () => {
            this.updateReport();
        });

        // Guardar reporte
        document.getElementById('saveReportBtn').addEventListener('click', () => {
            this.saveReport();
        });

        // Búsqueda
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.search(e.target.value);
        });
    }

    updateStats() {
        const reports = this.getFilteredReports();
        
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.estado === 'pendiente').length;
        const progressReports = reports.filter(r => r.estado === 'en_proceso').length;
        const resolvedReports = reports.filter(r => r.estado === 'resuelto').length;

        document.getElementById('totalReports').textContent = totalReports;
        document.getElementById('pendingReports').textContent = pendingReports;
        document.getElementById('progressReports').textContent = progressReports;
        document.getElementById('resolvedReports').textContent = resolvedReports;
    }

    renderRoomCards() {
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';

        this.rooms.forEach(room => {
            const roomReports = this.reportsCollection.filter(r => r.sala === room);
            const roomServices = this.servicesCollection.filter(s => s.sala === room);
            
            const pendingReports = roomReports.filter(r => r.estado === 'pendiente').length;
            const resolvedReports = roomReports.filter(r => r.estado === 'resuelto').length;
            const urgentReports = roomReports.filter(r => r.urgencia === 'urgente').length;
            const activeServices = roomServices.filter(s => s.estado !== 'completado').length;

            // Determinar estado de la sala
            let roomStatus = 'operational';
            if (urgentReports > 0) {
                roomStatus = 'issues';
            } else if (pendingReports > 0 || activeServices > 0) {
                roomStatus = 'maintenance';
            }

            const statusLabels = {
                operational: 'Operativa',
                maintenance: 'Mantenimiento',
                issues: 'Con Problemas'
            };

            const roomIcon = room.includes('SICA') ? 'bi-display' : 'bi-laptop';

            const card = document.createElement('div');
            card.className = 'col-lg-4 col-md-6';
            card.innerHTML = `
                <div class="room-card fade-in">
                    <div class="room-header">
                        <h3 class="room-title">
                            <i class="bi ${roomIcon}"></i>
                            ${room}
                        </h3>
                        <span class="room-status status-${roomStatus}">
                            ${statusLabels[roomStatus]}
                        </span>
                    </div>
                    <div class="room-stats">
                        <div class="room-stat">
                            <p class="room-stat-value stat-urgent">${urgentReports}</p>
                            <p class="room-stat-label">Urgentes</p>
                        </div>
                        <div class="room-stat">
                            <p class="room-stat-value stat-moderate">${pendingReports}</p>
                            <p class="room-stat-label">Pendientes</p>
                        </div>
                        <div class="room-stat">
                            <p class="room-stat-value stat-resolved">${resolvedReports}</p>
                            <p class="room-stat-label">Resueltos</p>
                        </div>
                        <div class="room-stat">
                            <p class="room-stat-value stat-low">${activeServices}</p>
                            <p class="room-stat-label">Servicios</p>
                        </div>
                    </div>
                </div>
            `;

            // Agregar evento click para filtrar por sala
            card.addEventListener('click', () => {
                document.getElementById('roomFilter').value = room;
                this.currentFilters.room = room;
                this.applyFilters();
                // Scroll a la tabla
                document.querySelector('.data-section').scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            });

            container.appendChild(card);
        });
    }

    switchView(view) {
        this.currentView = view;
        this.currentPage = 1;

        // Actualizar botones
        const reportsBtn = document.getElementById('reportsView');
        const servicesBtn = document.getElementById('servicesView');

        if (view === 'reports') {
            reportsBtn.classList.add('active');
            servicesBtn.classList.remove('active');
            document.getElementById('dataTableTitle').innerHTML = 
                '<i class="bi bi-bug me-2"></i>Reportes Técnicos';
        } else {
            servicesBtn.classList.add('active');
            reportsBtn.classList.remove('active');
            document.getElementById('dataTableTitle').innerHTML = 
                '<i class="bi bi-tools me-2"></i>Servicios Técnicos';
        }

        this.renderTable();
    }

    renderTable() {
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');

        if (this.currentView === 'reports') {
            tableHead.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Sala</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Responsable</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Urgencia</th>
                    <th>Acciones</th>
                </tr>
            `;

            const reports = this.getFilteredReports();
            const paginatedReports = this.getPaginatedData(reports);

            if (paginatedReports.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-4">
                            <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No hay reportes disponibles</p>
                            <button class="btn btn-sica" onclick="document.getElementById('newReportBtn').click()">
                                <i class="bi bi-plus-circle me-2"></i>Crear Primer Reporte
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = paginatedReports.map(report => `
                    <tr>
                        <td><strong>${report.numeroReporte || report.id}</strong></td>
                        <td><span class="badge bg-primary">${report.sala}</span></td>
                        <td><span class="badge bg-secondary">${this.formatServiceType(report.tipoServicio)}</span></td>
                        <td class="text-truncate" style="max-width: 200px;" title="${report.descripcion}">
                            ${report.descripcion}
                        </td>
                        <td>${report.responsable}</td>
                        <td>${this.formatDate(report.fechaInicio || report.fechaCreacion)}</td>
                        <td><span class="status-badge status-${report.estado}">${this.formatStatus(report.estado)}</span></td>
                        <td><span class="urgency-badge urgency-${report.urgencia}">${this.formatUrgency(report.urgencia)}</span></td>
                        <td>
                            <button class="action-btn btn-view" onclick="techManager.viewItem('report', '${report.id}')" title="Ver detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="action-btn btn-edit" onclick="techManager.editItem('report', '${report.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="techManager.deleteItem('report', '${report.id}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

        } else {
            tableHead.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Sala</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Responsable</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                    <th>Evidencia</th>
                    <th>Acciones</th>
                </tr>
            `;

            const services = this.getFilteredServices();
            const paginatedServices = this.getPaginatedData(services);

            if (paginatedServices.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center py-4">
                            <i class="bi bi-tools text-muted" style="font-size: 3rem;"></i>
                            <p class="text-muted mt-2">No hay servicios registrados</p>
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = paginatedServices.map(service => `
                    <tr>
                        <td><strong>${service.numeroServicio || service.id}</strong></td>
                        <td><span class="badge bg-primary">${service.sala}</span></td>
                        <td><span class="badge bg-secondary">${this.formatServiceType(service.tipoServicio)}</span></td>
                        <td class="text-truncate" style="max-width: 200px;" title="${service.descripcion}">
                            ${service.descripcion}
                        </td>
                        <td>${service.responsable}</td>
                        <td>${this.formatDate(service.fechaInicio)}</td>
                        <td>${service.fechaTermino ? this.formatDate(service.fechaTermino) : '<span class="text-muted">-</span>'}</td>
                        <td><span class="status-badge status-${service.estado}">${this.formatStatus(service.estado)}</span></td>
                        <td>
                            ${service.evidencia ? 
                                `<i class="bi bi-file-earmark-pdf text-danger" title="${service.evidencia}"></i>` : 
                                '<span class="text-muted">-</span>'
                            }
                        </td>
                        <td>
                            <button class="action-btn btn-view" onclick="techManager.viewItem('service', '${service.id}')" title="Ver detalles">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="action-btn btn-edit" onclick="techManager.editItem('service', '${service.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="action-btn btn-delete" onclick="techManager.deleteItem('service', '${service.id}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        this.renderPagination();
    }

    getFilteredReports() {
        return this.reportsCollection.filter(report => {
            const roomMatch = this.currentFilters.room === 'all' || report.sala === this.currentFilters.room;
            const statusMatch = this.currentFilters.status === 'all' || report.estado === this.currentFilters.status;
            const urgencyMatch = this.currentFilters.urgency === 'all' || report.urgencia === this.currentFilters.urgency;
            return roomMatch && statusMatch && urgencyMatch;
        });
    }

    getFilteredServices() {
        return this.servicesCollection.filter(service => {
            const roomMatch = this.currentFilters.room === 'all' || service.sala === this.currentFilters.room;
            const statusMatch = this.currentFilters.status === 'all' || service.estado === this.currentFilters.status;
            return roomMatch && statusMatch;
        });
    }

    getPaginatedData(data) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return data.slice(start, end);
    }

    renderPagination() {
        const data = this.currentView === 'reports' ? this.getFilteredReports() : this.getFilteredServices();
        const totalPages = Math.ceil(data.length / this.itemsPerPage);
        const pagination = document.getElementById('tablePagination');

        if (totalPages <= 1) {
            pagination.innerHTML = `
                <div class="pagination-info">
                    Mostrando ${data.length} elementos
                </div>
            `;
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, data.length);

        pagination.innerHTML = `
            <div class="pagination-info">
                Mostrando ${start}-${end} de ${data.length} elementos
            </div>
            <div class="pagination-controls">
                <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="techManager.goToPage(${this.currentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </button>
                ${this.generatePageButtons(totalPages)}
                <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="techManager.goToPage(${this.currentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    generatePageButtons(totalPages) {
        let buttons = '';
        const maxButtons = 5;
        let start = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons - 1);

        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        for (let i = start; i <= end; i++) {
            buttons += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="techManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        return buttons;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTable();
    }

    applyFilters() {
        this.currentPage = 1;
        this.updateStats();
        this.renderRoomCards();
        this.renderTable();
    }

    search(query) {
        if (!query) {
            this.renderTable();
            return;
        }

        const searchLower = query.toLowerCase();
        let filteredData;

        if (this.currentView === 'reports') {
            filteredData = this.getFilteredReports().filter(report => 
                (report.numeroReporte && report.numeroReporte.toLowerCase().includes(searchLower)) ||
                (report.sala && report.sala.toLowerCase().includes(searchLower)) ||
                (report.descripcion && report.descripcion.toLowerCase().includes(searchLower)) ||
                (report.responsable && report.responsable.toLowerCase().includes(searchLower))
            );
        } else {
            filteredData = this.getFilteredServices().filter(service => 
                (service.numeroServicio && service.numeroServicio.toLowerCase().includes(searchLower)) ||
                (service.sala && service.sala.toLowerCase().includes(searchLower)) ||
                (service.descripcion && service.descripcion.toLowerCase().includes(searchLower)) ||
                (service.responsable && service.responsable.toLowerCase().includes(searchLower))
            );
        }

        const tableBody = document.getElementById('tableBody');
        
        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center py-4">
                        <i class="bi bi-search text-muted" style="font-size: 2rem;"></i>
                        <p class="text-muted mt-2">No se encontraron resultados para "${query}"</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderizar resultados de búsqueda
        if (this.currentView === 'reports') {
            tableBody.innerHTML = filteredData.map(report => `
                <tr>
                    <td><strong>${report.numeroReporte || report.id}</strong></td>
                    <td><span class="badge bg-primary">${report.sala}</span></td>
                    <td><span class="badge bg-secondary">${this.formatServiceType(report.tipoServicio)}</span></td>
                    <td class="text-truncate" style="max-width: 200px;" title="${report.descripcion}">
                        ${this.highlightSearchTerm(report.descripcion, query)}
                    </td>
                    <td>${this.highlightSearchTerm(report.responsable, query)}</td>
                    <td>${this.formatDate(report.fechaInicio || report.fechaCreacion)}</td>
                    <td><span class="status-badge status-${report.estado}">${this.formatStatus(report.estado)}</span></td>
                    <td><span class="urgency-badge urgency-${report.urgencia}">${this.formatUrgency(report.urgencia)}</span></td>
                    <td>
                        <button class="action-btn btn-view" onclick="techManager.viewItem('report', '${report.id}')" title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="techManager.editItem('report', '${report.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="techManager.deleteItem('report', '${report.id}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = filteredData.map(service => `
                <tr>
                    <td><strong>${service.numeroServicio || service.id}</strong></td>
                    <td><span class="badge bg-primary">${service.sala}</span></td>
                    <td><span class="badge bg-secondary">${this.formatServiceType(service.tipoServicio)}</span></td>
                    <td class="text-truncate" style="max-width: 200px;" title="${service.descripcion}">
                        ${this.highlightSearchTerm(service.descripcion, query)}
                    </td>
                    <td>${this.highlightSearchTerm(service.responsable, query)}</td>
                    <td>${this.formatDate(service.fechaInicio)}</td>
                    <td>${service.fechaTermino ? this.formatDate(service.fechaTermino) : '<span class="text-muted">-</span>'}</td>
                    <td><span class="status-badge status-${service.estado}">${this.formatStatus(service.estado)}</span></td>
                    <td>
                        ${service.evidencia ? 
                            `<i class="bi bi-file-earmark-pdf text-danger" title="${service.evidencia}"></i>` : 
                            '<span class="text-muted">-</span>'
                        }
                    </td>
                    <td>
                        <button class="action-btn btn-view" onclick="techManager.viewItem('service', '${service.id}')" title="Ver detalles">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="action-btn btn-edit" onclick="techManager.editItem('service', '${service.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="techManager.deleteItem('service', '${service.id}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return text || '';
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Modals y formularios
    showNewReportModal() {
        const modal = new bootstrap.Modal(document.getElementById('newReportModal'));
        this.clearForm('newReportForm');
        // Establecer fecha de inicio por defecto
        document.getElementById('reportStartDate').value = new Date().toISOString().split('T')[0];
        // Establecer estado pendiente por defecto
        document.getElementById('reportStatus').value = 'pendiente';
        modal.show();
    }

    async saveReport() {
        const form = document.getElementById('newReportForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        this.showLoading();

        try {
            // Generar ID único para el reporte
            const reportNumber = await this.getNextReportNumber();
            
            const reportData = {
                numeroReporte: `RPT-${String(reportNumber).padStart(3, '0')}`,
                sala: document.getElementById('reportRoom').value,
                tipoServicio: document.getElementById('reportType').value,
                descripcion: document.getElementById('reportDescription').value,
                responsable: document.getElementById('reportResponsible').value,
                estado: document.getElementById('reportStatus').value,
                urgencia: document.getElementById('reportUrgency').value,
                fechaInicio: document.getElementById('reportStartDate').value,
                fechaTermino: document.getElementById('reportEndDate').value || null
            };

            // Guardar en Firebase
            const reportId = await this.saveReportToFirebase(reportData);
            
            // Recargar datos desde Firebase
            await this.loadReportsFromFirebase();
            
            this.hideLoading();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('newReportModal'));
            modal.hide();
            
            this.showNotification('¡Éxito!', 'Reporte creado correctamente', 'success');
            this.updateStats();
            this.renderRoomCards();
            if (this.currentView === 'reports') {
                this.renderTable();
            }
            
        } catch (error) {
            this.hideLoading();
            console.error('Error guardando reporte:', error);
            this.showNotification('Error', 'No se pudo guardar el reporte', 'error');
        }
    }

    async saveReportToFirebase(reportData) {
        try {
            const docRef = await this.db.collection('reportes_tecnicos').add({
                ...reportData,
                fechaCreacion: firebase.firestore.Timestamp.now(),
                fechaActualizacion: firebase.firestore.Timestamp.now()
            });

            console.log('Reporte guardado con ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error guardando reporte:', error);
            throw error;
        }
    }

    async getNextReportNumber() {
        try {
            const snapshot = await this.db.collection('reportes_tecnicos')
                .orderBy('numeroReporte', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return 1;
            } else {
                const lastReport = snapshot.docs[0].data();
                const lastNumber = parseInt(lastReport.numeroReporte.split('-')[1]);
                return lastNumber + 1;
            }
        } catch (error) {
            console.error('Error obteniendo próximo número:', error);
            return Date.now(); // Fallback usando timestamp
        }
    }

    editItem(type, id) {
        if (type === 'report') {
            this.showEditReportModal(id);
        } else {
            this.showNotification('Información', 'Función de edición de servicios en desarrollo', 'info');
        }
    }

    showEditReportModal(reportId) {
        const report = this.reportsCollection.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Error', 'Reporte no encontrado', 'error');
            return;
        }

        // Llenar el formulario con los datos actuales
        document.getElementById('editReportId').value = report.id;
        document.getElementById('editReportIdDisplay').value = report.numeroReporte || report.id;
        document.getElementById('editReportRoom').value = report.sala;
        document.getElementById('editReportType').value = this.formatServiceType(report.tipoServicio);
        document.getElementById('editReportResponsible').value = report.responsable;
        document.getElementById('editReportUrgency').value = this.formatUrgency(report.urgencia);
        document.getElementById('editReportStatus').value = report.estado;
        document.getElementById('editReportStartDate').value = report.fechaInicio;
        document.getElementById('editReportEndDate').value = report.fechaTermino || '';
        document.getElementById('editReportDescription').value = report.descripcion;

        const modal = new bootstrap.Modal(document.getElementById('editReportModal'));
        modal.show();
    }

    async updateReport() {
        const form = document.getElementById('editReportForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        this.showLoading();

        const reportId = document.getElementById('editReportId').value;
        
        try {
            // Validar que si el estado es "resuelto", debe tener fecha de término
            const newStatus = document.getElementById('editReportStatus').value;
            const endDate = document.getElementById('editReportEndDate').value;

            if (newStatus === 'resuelto' && !endDate) {
                this.hideLoading();
                this.showNotification('Advertencia', 'Debes agregar una fecha de término para marcar el reporte como resuelto', 'warning');
                return;
            }

            const updateData = {
                estado: newStatus,
                fechaTermino: endDate || null,
                descripcion: document.getElementById('editReportDescription').value
            };

            await this.updateReportInFirebase(reportId, updateData);
            await this.loadReportsFromFirebase();

            this.hideLoading();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('editReportModal'));
            modal.hide();
            
            this.showNotification('¡Éxito!', 'Reporte actualizado correctamente', 'success');
            this.updateStats();
            this.renderRoomCards();
            if (this.currentView === 'reports') {
                this.renderTable();
            }
            
        } catch (error) {
            this.hideLoading();
            console.error('Error actualizando reporte:', error);
            this.showNotification('Error', 'No se pudo actualizar el reporte', 'error');
        }
    }

    async updateReportInFirebase(reportId, updateData) {
        try {
            await this.db.collection('reportes_tecnicos').doc(reportId).update({
                ...updateData,
                fechaActualizacion: firebase.firestore.Timestamp.now()
            });

            console.log('Reporte actualizado:', reportId);
        } catch (error) {
            console.error('Error actualizando reporte:', error);
            throw error;
        }
    }

    viewItem(type, id) {
        let item;
        if (type === 'report') {
            item = this.reportsCollection.find(r => r.id === id);
        } else {
            item = this.servicesCollection.find(s => s.id === id);
        }

        if (!item) return;

        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        const modalTitle = document.getElementById('detailModalTitle');
        const modalBody = document.getElementById('detailModalBody');

        modalTitle.innerHTML = `
            <i class="bi bi-${type === 'report' ? 'bug' : 'tools'} text-gold me-2"></i>
            Detalles - ${item.numeroReporte || item.numeroServicio || item.id}
        `;

        if (type === 'report') {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">ID del Reporte</label>
                        <p class="form-control-static">${item.numeroReporte || item.id}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Sala</label>
                        <p class="form-control-static"><span class="badge bg-primary">${item.sala}</span></p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Tipo de Servicio</label>
                        <p class="form-control-static">${this.formatServiceType(item.tipoServicio)}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Urgencia</label>
                        <p class="form-control-static">
                            <span class="urgency-badge urgency-${item.urgencia}">${this.formatUrgency(item.urgencia)}</span>
                        </p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Responsable</label>
                        <p class="form-control-static">${item.responsable}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Estado</label>
                        <p class="form-control-static">
                            <span class="status-badge status-${item.estado}">${this.formatStatus(item.estado)}</span>
                        </p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Fecha de Inicio</label>
                        <p class="form-control-static">${this.formatDate(item.fechaInicio)}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Fecha de Término</label>
                        <p class="form-control-static">${item.fechaTermino ? this.formatDate(item.fechaTermino) : '<span class="text-muted">Pendiente</span>'}</p>
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label-sica">Descripción del Problema</label>
                        <p class="form-control-static">${item.descripcion}</p>
                    </div>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">ID del Servicio</label>
                        <p class="form-control-static">${item.numeroServicio || item.id}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Sala</label>
                        <p class="form-control-static"><span class="badge bg-primary">${item.sala}</span></p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Tipo de Servicio</label>
                        <p class="form-control-static">${this.formatServiceType(item.tipoServicio)}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Estado</label>
                        <p class="form-control-static">
                            <span class="status-badge status-${item.estado}">${this.formatStatus(item.estado)}</span>
                        </p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Responsable</label>
                        <p class="form-control-static">${item.responsable}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Evidencia</label>
                        <p class="form-control-static">${item.evidencia ? `<i class="bi bi-file-earmark-pdf text-danger me-2"></i>${item.evidencia}` : '<span class="text-muted">Sin evidencia</span>'}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Fecha de Inicio</label>
                        <p class="form-control-static">${this.formatDate(item.fechaInicio)}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label-sica">Fecha de Finalización</label>
                        <p class="form-control-static">${item.fechaTermino ? this.formatDate(item.fechaTermino) : '<span class="text-muted">En proceso</span>'}</p>
                    </div>
                    <div class="col-12 mb-3">
                        <label class="form-label-sica">Descripción del Servicio</label>
                        <p class="form-control-static">${item.descripcion}</p>
                    </div>
                </div>
            `;
        }

        modal.show();
    }

    async deleteItem(type, id) {
        if (!confirm(`¿Estás seguro de que deseas eliminar este ${type === 'report' ? 'reporte' : 'servicio'}?`)) {
            return;
        }

        this.showLoading();

        try {
            if (type === 'report') {
                await this.deleteReportFromFirebase(id);
                await this.loadReportsFromFirebase();
                this.showNotification('¡Eliminado!', 'Reporte eliminado correctamente', 'success');
            } else {
                await this.deleteServiceFromFirebase(id);
                await this.loadServicesFromFirebase();
                this.showNotification('¡Eliminado!', 'Servicio eliminado correctamente', 'success');
            }

            this.hideLoading();
            this.updateStats();
            this.renderRoomCards();
            this.renderTable();

        } catch (error) {
            this.hideLoading();
            console.error('Error eliminando item:', error);
            this.showNotification('Error', 'No se pudo eliminar el elemento', 'error');
        }
    }

    async deleteReportFromFirebase(reportId) {
        try {
            await this.db.collection('reportes_tecnicos').doc(reportId).delete();
            console.log('Reporte eliminado:', reportId);
        } catch (error) {
            console.error('Error eliminando reporte:', error);
            throw error;
        }
    }

    async deleteServiceFromFirebase(serviceId) {
        try {
            await this.db.collection('servicios_tecnicos').doc(serviceId).delete();
            console.log('Servicio eliminado:', serviceId);
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            throw error;
        }
    }

    // Utilidades
    formatServiceType(type) {
        const types = {
            mantenimiento: 'Mantenimiento',
            instalacion: 'Instalación',
            software: 'Software',
            hardware: 'Hardware',
            limpieza: 'Limpieza',
            otro: 'Otro'
        };
        return types[type] || type;
    }

    formatStatus(status) {
        const statuses = {
            pendiente: 'Pendiente',
            en_proceso: 'En Proceso',
            resuelto: 'Resuelto',
            cancelado: 'Cancelado',
            completado: 'Completado'
        };
        return statuses[status] || status;
    }

    formatUrgency(urgency) {
        const urgencies = {
            urgente: 'Urgente',
            moderado: 'Moderado',
            bajo: 'Bajo'
        };
        return urgencies[urgency] || urgency;
    }

    formatDate(dateInput) {
        if (!dateInput) return '';
        
        let date;
        if (dateInput.toDate && typeof dateInput.toDate === 'function') {
            // Firestore Timestamp
            date = dateInput.toDate();
        } else if (typeof dateInput === 'string') {
            // String date
            date = new Date(dateInput);
        } else if (dateInput instanceof Date) {
            // Date object
            date = dateInput;
        } else {
            return '';
        }

        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        form.reset();
        
        // Remover clases de validación
        form.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    }

    showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        // Usar el sistema de notificaciones base si está disponible
        if (typeof SICAComponents !== 'undefined' && SICAComponents.notify) {
            SICAComponents.notify(title, message, type, icon);
        } else {
            // Fallback a alert nativo
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            if (type === 'error') {
                alert(`Error: ${message}`);
            }
        }
    }
}

// Inicializar el sistema cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación de administrador
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            const authCheck = document.getElementById('authCheck');
            const mainContent = document.getElementById('main-content');
            
            if (user) {
                // Usuario autenticado - asumir que es admin si está logueado
                console.log('Usuario autenticado como admin:', user.email);
                authCheck.style.display = 'none';
                mainContent.style.display = 'block';
                window.techManager = new TechnicalManager();
            } else {
                // Usuario no autenticado, redirigir a login
                console.log('Usuario no autenticado, redirigiendo...');
                window.location.href = '../index.html';
            }
        });
    } else {
        // Firebase no disponible, modo desarrollo
        console.warn('Firebase no disponible - Modo desarrollo');
        document.getElementById('authCheck').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        window.techManager = new TechnicalManager();
    }
});

// Función para verificar permisos de administrador (versión simplificada)
async function checkAdminPermissions(user) {
    try {
        // Para desarrollo: si el usuario está logueado, es admin
        return true;
        
        /* Para producción, descomentar esto:
        if (typeof firebase.firestore !== 'undefined') {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return userData.role === 'admin' || userData.isAdmin === true;
            }
        }
        
        // Fallback: verificar por email
        const adminEmails = [
            'admin@sica.unam.mx',
            'administrador@sica.unam.mx',
            // Agregar más emails de administradores aquí
        ];
        
        return adminEmails.includes(user.email);
        */
    } catch (error) {
        console.error('Error verificando permisos:', error);
        return true; // En desarrollo, permitir acceso
    }
}

// Exportar para uso global
window.TechnicalManager = TechnicalManager;