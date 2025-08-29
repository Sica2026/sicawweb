// Gestión Técnica SICA - JavaScript
class TecnicalManager {
    constructor() {
        this.reports = [];
        this.services = [];
        this.currentView = 'dashboard';
        this.currentViewType = 'list';
        this.filters = {
            sala: '',
            estado: '',
            urgencia: '',
            search: ''
        };
        
        // Salas disponibles
        this.rooms = [
            { id: 'sica1', name: 'SICA 1', icon: 'bi-1-circle-fill', type: 'sica' },
            { id: 'sica2', name: 'SICA 2', icon: 'bi-2-circle-fill', type: 'sica' },
            { id: 'sica3', name: 'SICA 3', icon: 'bi-3-circle-fill', type: 'sica' },
            { id: 'sica4', name: 'SICA 4', icon: 'bi-4-circle-fill', type: 'sica' },
            { id: 'salon1', name: 'Salón Inteligente 1', icon: 'bi-display', type: 'salon' },
            { id: 'salon2', name: 'Salón Inteligente 2', icon: 'bi-display', type: 'salon' }
        ];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupBreadcrumbs();
        await this.loadData();
        this.renderDashboard();
        this.updateStatistics();
        
        // Mostrar notificación de bienvenida
        this.showNotification('Sistema Iniciado', 'Gestión Técnica SICA cargada correctamente', 'success', 'bi-check-circle-fill');
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('filterSala').addEventListener('change', (e) => {
            this.filters.sala = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('filterEstado').addEventListener('change', (e) => {
            this.filters.estado = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('filterUrgencia').addEventListener('change', (e) => {
            this.filters.urgencia = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Auto-actualización cada 30 segundos
        setInterval(() => {
            this.loadData();
            this.updateCurrentView();
        }, 30000);
    }

    setupBreadcrumbs() {
        const breadcrumbs = [
            { text: "Inicio", link: "../index.html" },
            { text: "Gestión Técnica", active: true }
        ];
        
        if (typeof SICAComponents !== 'undefined') {
            SICAComponents.addBreadcrumbs(breadcrumbs);
        }
    }

    async loadData() {
        try {
            // Cargar reportes desde Firebase
            if (typeof firebase !== 'undefined') {
                const reportsSnapshot = await firebase.firestore()
                    .collection('technical_reports')
                    .orderBy('fechaCreacion', 'desc')
                    .get();
                
                this.reports = reportsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const servicesSnapshot = await firebase.firestore()
                    .collection('technical_services')
                    .orderBy('fechaInicio', 'desc')
                    .get();
                
                this.services = servicesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Datos de ejemplo para desarrollo
                this.loadSampleData();
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.loadSampleData();
        }
    }

    loadSampleData() {
        // Datos de ejemplo para desarrollo
        this.reports = [
            {
                id: '1',
                sala: 'SICA 1',
                tipo: 'hardware',
                descripcion: 'Proyector no enciende, se escucha ruido extraño en el ventilador',
                responsable: 'Juan Pérez',
                fechaCreacion: new Date('2024-01-15'),
                fechaResolucion: null,
                estado: 'pendiente',
                urgencia: 'urgente',
                notas: 'Se solicitó revisión técnica especializada. Posible falla en ventilador interno.'
            },
            {
                id: '2',
                sala: 'SICA 2',
                tipo: 'software',
                descripcion: 'Sistema operativo presenta errores al iniciar aplicaciones',
                responsable: 'María García',
                fechaCreacion: new Date('2024-01-14'),
                fechaResolucion: null,
                estado: 'en_proceso',
                urgencia: 'moderado',
                notas: 'Realizando análisis de logs del sistema. Se encontraron conflictos de dependencias.'
            },
            {
                id: '3',
                sala: 'Salón Inteligente 1',
                tipo: 'mantenimiento',
                descripcion: 'Limpieza profunda de equipos y calibración de pantallas',
                responsable: 'Carlos López',
                fechaCreacion: new Date('2024-01-12'),
                fechaResolucion: new Date('2024-01-13'),
                estado: 'resuelto',
                urgencia: 'bajo',
                notas: 'Mantenimiento completado exitosamente. Se calibraron 3 pantallas y se actualizaron drivers de video.'
            },
            {
                id: '4',
                sala: 'SICA 3',
                tipo: 'software',
                descripcion: 'Aplicación de videoconferencia no responde correctamente',
                responsable: 'Ana Martínez',
                fechaCreacion: new Date('2024-01-16'),
                fechaResolucion: null,
                estado: 'pendiente',
                urgencia: 'moderado',
                notas: 'Pendiente de reunión con proveedor de software para diagnóstico remoto.'
            },
            {
                id: '5',
                sala: 'SICA 4',
                tipo: 'hardware',
                descripcion: 'Micrófono inalámbrico presenta interferencias',
                responsable: 'Roberto Silva',
                fechaCreacion: new Date('2024-01-11'),
                fechaResolucion: new Date('2024-01-14'),
                estado: 'resuelto',
                urgencia: 'moderado',
                notas: 'Se cambió frecuencia de operación y se reemplazaron baterías. Sistema funcionando correctamente.'
            }
        ];

        this.services = [
            {
                id: '1',
                sala: 'SICA 3',
                tipo: 'instalacion',
                descripcion: 'Instalación de nuevo software de presentaciones y configuración',
                responsable: 'Ana Martínez',
                fechaInicio: new Date('2024-01-10'),
                fechaFin: new Date('2024-01-11'),
                estado: 'completado',
                evidencias: ['instalacion_software.pdf'],
                notas: 'Software instalado y configurado según especificaciones. Personal capacitado en uso básico.'
            },
            {
                id: '2',
                sala: 'SICA 4',
                tipo: 'mantenimiento',
                descripcion: 'Mantenimiento preventivo de equipos y actualización de drivers',
                responsable: 'Roberto Silva',
                fechaInicio: new Date('2024-01-08'),
                fechaFin: null,
                estado: 'en_proceso',
                evidencias: [],
                notas: 'Progreso: 60% completado. Pendiente actualización de drivers de video.'
            }
        ];
    }

    renderDashboard() {
        const roomCardsContainer = document.getElementById('room-cards');
        if (!roomCardsContainer) return;

        roomCardsContainer.innerHTML = '';

        this.rooms.forEach(room => {
            const roomStats = this.getRoomStatistics(room.name);
            const roomCard = this.createRoomCard(room, roomStats);
            roomCardsContainer.appendChild(roomCard);
        });

        // Animación de entrada
        setTimeout(() => {
            roomCardsContainer.querySelectorAll('.room-card').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('fade-in-up');
                }, index * 100);
            });
        }, 100);
    }

    createRoomCard(room, stats) {
        const card = document.createElement('div');
        card.className = 'col-lg-4 col-md-6';
        
        const statusClass = this.getRoomStatusClass(stats);
        const completionRate = stats.total > 0 ? Math.round((stats.resueltos / stats.total) * 100) : 100;
        
        card.innerHTML = `
            <div class="room-card" onclick="tecManager.showRoomDetails('${room.name}')">
                <div class="room-card-header">
                    <h3 class="room-card-title">
                        <i class="${room.icon}"></i>
                        ${room.name}
                    </h3>
                    <span class="room-card-status ${statusClass}">
                        ${this.getRoomStatusText(stats)}
                    </span>
                </div>
                
                <div class="room-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${stats.total}</div>
                        <div class="metric-label">Total</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${stats.pendientes}</div>
                        <div class="metric-label">Pendientes</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${stats.urgentes}</div>
                        <div class="metric-label">Urgentes</div>
                    </div>
                </div>
                
                <div class="room-progress">
                    <div class="progress-label">
                        <span>Completado</span>
                        <span>${completionRate}%</span>
                    </div>
                    <div class="progress-bar-tec">
                        <div class="progress-fill" style="width: ${completionRate}%"></div>
                    </div>
                </div>
                
                <div class="room-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-outline-primary btn-sm" onclick="tecManager.showReports('${room.name}')">
                        <i class="bi bi-clipboard-data"></i> Ver Reportes
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }

    getRoomStatistics(roomName) {
        const roomReports = this.reports.filter(r => r.sala === roomName);
        
        return {
            total: roomReports.length,
            pendientes: roomReports.filter(r => r.estado === 'pendiente').length,
            enProceso: roomReports.filter(r => r.estado === 'en_proceso').length,
            resueltos: roomReports.filter(r => r.estado === 'resuelto').length,
            urgentes: roomReports.filter(r => r.urgencia === 'urgente').length
        };
    }

    getRoomStatusClass(stats) {
        if (stats.urgentes > 0) return 'status-critical';
        if (stats.pendientes > 2) return 'status-maintenance';
        return 'status-operational';
    }

    getRoomStatusText(stats) {
        if (stats.urgentes > 0) return 'Crítico';
        if (stats.pendientes > 2) return 'Mantenimiento';
        return 'Operativo';
    }

    updateStatistics() {
        const stats = {
            total: this.reports.length,
            pendientes: this.reports.filter(r => r.estado === 'pendiente').length,
            enProceso: this.reports.filter(r => r.estado === 'en_proceso').length,
            resueltos: this.reports.filter(r => r.estado === 'resuelto').length,
            urgentes: this.reports.filter(r => r.urgencia === 'urgente').length,
            servicios: this.services.length
        };

        // Actualizar elementos con animación
        this.animateCounter('totalReports', stats.total);
        this.animateCounter('pendingReports', stats.pendientes);
        this.animateCounter('processReports', stats.enProceso);
        this.animateCounter('resolvedReports', stats.resueltos);
        this.animateCounter('urgentReports', stats.urgentes);
        this.animateCounter('totalServices', stats.servicios);
    }

    animateCounter(elementId, finalValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 1000;
        const startValue = parseInt(element.textContent) || 0;
        const increment = (finalValue - startValue) / (duration / 16);
        let currentValue = startValue;

        const updateCounter = () => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= finalValue) || 
                (increment < 0 && currentValue <= finalValue)) {
                element.textContent = finalValue;
            } else {
                element.textContent = Math.round(currentValue);
                requestAnimationFrame(updateCounter);
            }
        };

        updateCounter();
    }

    showDashboard() {
        this.currentView = 'dashboard';
        this.updateBreadcrumb('Gestión Técnica');
        
        document.getElementById('dashboard-section').style.display = 'block';
        document.getElementById('reports-section').style.display = 'none';
        document.getElementById('services-section').style.display = 'none';
        
        this.renderDashboard();
        this.updateStatistics();
    }

    showReports(roomFilter = '') {
        this.currentView = 'reports';
        this.updateBreadcrumb('Reportes Técnicos');
        
        if (roomFilter) {
            this.filters.sala = roomFilter;
            document.getElementById('filterSala').value = roomFilter;
        }
        
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('reports-section').style.display = 'block';
        document.getElementById('services-section').style.display = 'none';
        
        this.renderReports();
    }

    showServices() {
        this.currentView = 'services';
        this.updateBreadcrumb('Registro de Servicios');
        
        document.getElementById('dashboard-section').style.display = 'none';
        document.getElementById('reports-section').style.display = 'none';
        document.getElementById('services-section').style.display = 'block';
        
        this.renderServices();
    }

    showRoomDetails(roomName) {
        this.showReports(roomName);
    }

    updateBreadcrumb(currentPage) {
        const breadcrumbCurrent = document.getElementById('breadcrumb-current');
        if (breadcrumbCurrent) {
            breadcrumbCurrent.textContent = currentPage;
        }
    }

    renderReports() {
        const container = document.getElementById('reports-container');
        if (!container) return;

        const filteredReports = this.getFilteredReports();
        
        if (filteredReports.length === 0) {
            container.innerHTML = this.getEmptyState('reportes', 'bi-clipboard-x');
            return;
        }

        const containerClass = this.currentViewType === 'grid' ? 'reports-grid' : 'reports-list';
        container.innerHTML = `<div class="${containerClass}" id="reports-list"></div>`;
        
        const reportsList = document.getElementById('reports-list');
        
        filteredReports.forEach((report, index) => {
            const reportCard = this.createReportCard(report);
            reportsList.appendChild(reportCard);
            
            // Animación escalonada
            setTimeout(() => {
                reportCard.classList.add('fade-in-up');
            }, index * 50);
        });
    }

    renderServices() {
        const container = document.getElementById('services-container');
        if (!container) return;

        const filteredServices = this.getFilteredServices();
        
        if (filteredServices.length === 0) {
            container.innerHTML = this.getEmptyState('servicios', 'bi-tools');
            return;
        }

        container.innerHTML = '<div class="services-list" id="services-list"></div>';
        const servicesList = document.getElementById('services-list');
        
        filteredServices.forEach((service, index) => {
            const serviceCard = this.createServiceCard(service);
            servicesList.appendChild(serviceCard);
            
            setTimeout(() => {
                serviceCard.classList.add('fade-in-up');
            }, index * 50);
        });
    }

    createReportCard(report) {
        const card = document.createElement('div');
        card.className = `report-card ${report.urgencia}`;
        
        const fechaCreacion = new Date(report.fechaCreacion.seconds ? 
            report.fechaCreacion.seconds * 1000 : report.fechaCreacion).toLocaleDateString();
        const fechaResolucion = report.fechaResolucion ? 
            new Date(report.fechaResolucion.seconds ? 
                report.fechaResolucion.seconds * 1000 : report.fechaResolucion).toLocaleDateString() : 'Pendiente';
        
        card.innerHTML = `
            <div class="card-header-tec">
                <div>
                    <h4 class="card-title-tec">
                        <i class="bi bi-${this.getTypeIcon(report.tipo)}"></i>
                        ${this.getTypeLabel(report.tipo)} - ${report.sala}
                    </h4>
                    <div class="card-meta">
                        <div class="meta-item">
                            <i class="bi bi-person"></i>
                            <span>${report.responsable}</span>
                        </div>
                        <div class="meta-item">
                            <i class="bi bi-calendar"></i>
                            <span>${fechaCreacion}</span>
                        </div>
                        <div class="meta-item">
                            <i class="bi bi-check-circle"></i>
                            <span>${fechaResolucion}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <span class="status-badge status-${report.estado}">
                        ${this.getStatusLabel(report.estado)}
                    </span>
                    <br>
                    <span class="urgency-badge urgency-${report.urgencia}">
                        <i class="bi bi-${this.getUrgencyIcon(report.urgencia)}"></i>
                        ${this.getUrgencyLabel(report.urgencia)}
                    </span>
                </div>
            </div>
            
            <div class="card-description">
                <strong>Problema:</strong> ${report.descripcion}
            </div>
            
            ${report.notas ? `
                <div class="card-notes">
                    <div class="notes-header">
                        <i class="bi bi-sticky"></i>
                        <strong>Notas:</strong>
                    </div>
                    <div class="notes-content">${report.notas}</div>
                </div>
            ` : ''}
            
            <div class="card-actions">
                <button class="btn-icon" onclick="tecManager.editReport('${report.id}')" title="Editar Reporte">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-icon" onclick="tecManager.changeReportStatus('${report.id}')" title="Cambiar Estado">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn-icon btn-icon-info" onclick="tecManager.viewReportHistory('${report.id}')" title="Ver Historial">
                    <i class="bi bi-clock-history"></i>
                </button>
                <button class="btn-icon btn-icon-danger" onclick="tecManager.deleteReport('${report.id}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const fechaInicio = new Date(service.fechaInicio.seconds ? 
            service.fechaInicio.seconds * 1000 : service.fechaInicio).toLocaleDateString();
        const fechaFin = service.fechaFin ? 
            new Date(service.fechaFin.seconds ? 
                service.fechaFin.seconds * 1000 : service.fechaFin).toLocaleDateString() : 'En proceso';
        
        card.innerHTML = `
            <div class="card-header-tec">
                <div>
                    <h4 class="card-title-tec">
                        <i class="bi bi-${this.getTypeIcon(service.tipo)}"></i>
                        ${this.getTypeLabel(service.tipo)} - ${service.sala}
                    </h4>
                    <div class="card-meta">
                        <div class="meta-item">
                            <i class="bi bi-person"></i>
                            <span>${service.responsable}</span>
                        </div>
                        <div class="meta-item">
                            <i class="bi bi-calendar-check"></i>
                            <span>${fechaInicio}</span>
                        </div>
                        <div class="meta-item">
                            <i class="bi bi-calendar-x"></i>
                            <span>${fechaFin}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <span class="status-badge status-${service.estado}">
                        ${this.getStatusLabel(service.estado)}
                    </span>
                </div>
            </div>
            
            <div class="card-description">
                ${service.descripcion}
            </div>
            
            ${service.evidencias && service.evidencias.length > 0 ? `
                <div class="service-evidences">
                    <strong>Evidencias:</strong>
                    ${service.evidencias.map(ev => `
                        <span class="evidence-badge">
                            <i class="bi bi-file-earmark"></i> ${ev}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="card-actions">
                <button class="btn-icon" onclick="tecManager.editService('${service.id}')" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn-icon" onclick="tecManager.deleteService('${service.id}')" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    getFilteredReports() {
        return this.reports.filter(report => {
            if (this.filters.sala && report.sala !== this.filters.sala) return false;
            if (this.filters.estado && report.estado !== this.filters.estado) return false;
            if (this.filters.urgencia && report.urgencia !== this.filters.urgencia) return false;
            if (this.filters.search && 
                !report.descripcion.toLowerCase().includes(this.filters.search) &&
                !report.responsable.toLowerCase().includes(this.filters.search)) return false;
            
            return true;
        });
    }

    getFilteredServices() {
        return this.services.filter(service => {
            if (this.filters.sala && service.sala !== this.filters.sala) return false;
            if (this.filters.search && 
                !service.descripcion.toLowerCase().includes(this.filters.search) &&
                !service.responsable.toLowerCase().includes(this.filters.search)) return false;
            
            return true;
        });
    }

    applyFilters() {
        if (this.currentView === 'reports') {
            this.renderReports();
        } else if (this.currentView === 'services') {
            this.renderServices();
        } else {
            this.renderDashboard();
        }
        this.updateStatistics();
    }

    clearFilters() {
        this.filters = { sala: '', estado: '', urgencia: '', search: '' };
        
        document.getElementById('filterSala').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterUrgencia').value = '';
        document.getElementById('searchInput').value = '';
        
        this.applyFilters();
    }

    toggleView(viewType) {
        this.currentViewType = viewType;
        
        document.getElementById('gridViewBtn').classList.toggle('active', viewType === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', viewType === 'list');
        
        if (this.currentView === 'reports') {
            this.renderReports();
        }
    }

    async saveReport() {
        try {
            const formData = this.getReportFormData();
            if (!this.validateReportForm(formData)) return;

            const reportData = {
                ...formData,
                fechaCreacion: new Date(),
                fechaResolucion: null,
                estado: 'pendiente'
            };

            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_reports')
                    .add(reportData);
            } else {
                // Agregar a datos locales para desarrollo
                reportData.id = 'temp_' + Date.now();
                this.reports.unshift(reportData);
            }

            this.hideModal('reportModal');
            this.clearReportForm();
            this.showNotification('Éxito', 'Reporte creado correctamente', 'success', 'bi-check-circle-fill');
            
            await this.loadData();
            this.updateCurrentView();
            this.updateStatistics();
        } catch (error) {
            console.error('Error guardando reporte:', error);
            this.showNotification('Error', 'Error al crear el reporte', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    async saveService() {
        try {
            const formData = this.getServiceFormData();
            if (!this.validateServiceForm(formData)) return;

            const serviceData = {
                ...formData,
                evidencias: await this.uploadFiles(formData.files)
            };

            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_services')
                    .add(serviceData);
            } else {
                serviceData.id = 'temp_' + Date.now();
                this.services.unshift(serviceData);
            }

            this.hideModal('serviceModal');
            this.clearServiceForm();
            this.showNotification('Éxito', 'Servicio registrado correctamente', 'success', 'bi-check-circle-fill');
            
            await this.loadData();
            this.updateCurrentView();
        } catch (error) {
            console.error('Error guardando servicio:', error);
            this.showNotification('Error', 'Error al registrar el servicio', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    getReportFormData() {
        return {
            sala: document.getElementById('reportSala').value,
            tipo: document.getElementById('reportTipo').value,
            descripcion: document.getElementById('reportDescripcion').value,
            responsable: document.getElementById('reportResponsable').value,
            urgencia: document.getElementById('reportUrgencia').value,
            notas: document.getElementById('reportNotas').value
        };
    }

    getServiceFormData() {
        const files = document.getElementById('serviceFiles').files;
        return {
            sala: document.getElementById('serviceSala').value,
            tipo: document.getElementById('serviceTipo').value,
            descripcion: document.getElementById('serviceDescripcion').value,
            responsable: document.getElementById('serviceResponsable').value,
            estado: document.getElementById('serviceEstado').value,
            fechaInicio: new Date(document.getElementById('serviceFechaInicio').value),
            fechaFin: document.getElementById('serviceFechaFin').value ? 
                new Date(document.getElementById('serviceFechaFin').value) : null,
            files: files
        };
    }

    validateReportForm(data) {
        if (!data.sala || !data.tipo || !data.descripcion || !data.responsable || !data.urgencia) {
            this.showNotification('Error', 'Todos los campos son requeridos', 'warning', 'bi-exclamation-triangle-fill');
            return false;
        }
        return true;
    }

    validateServiceForm(data) {
        if (!data.sala || !data.tipo || !data.descripcion || !data.responsable || !data.estado || !data.fechaInicio) {
            this.showNotification('Error', 'Los campos obligatorios son requeridos', 'warning', 'bi-exclamation-triangle-fill');
            return false;
        }
        return true;
    }

    async uploadFiles(files) {
        const fileNames = [];
        
        if (typeof firebase !== 'undefined' && files && files.length > 0) {
            try {
                for (let file of files) {
                    const fileName = `services/${Date.now()}_${file.name}`;
                    const storageRef = firebase.storage().ref(fileName);
                    await storageRef.put(file);
                    fileNames.push(fileName);
                }
            } catch (error) {
                console.error('Error subiendo archivos:', error);
            }
        }
        
        return fileNames;
    }

    clearReportForm() {
        document.getElementById('reportForm').reset();
    }

    clearServiceForm() {
        document.getElementById('serviceForm').reset();
    }

    hideModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) modal.hide();
    }

    async editReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Error', 'Reporte no encontrado', 'error', 'bi-exclamation-triangle-fill');
            return;
        }

        this.currentEditingReport = report;
        this.populateEditForm(report);
        this.showModal('editReportModal');
    }

    populateEditForm(report) {
        const modal = document.getElementById('editReportModal');
        const modalBody = modal.querySelector('.modal-body');
        
        const fechaCreacion = new Date(report.fechaCreacion.seconds ? 
            report.fechaCreacion.seconds * 1000 : report.fechaCreacion);
        const fechaResolucion = report.fechaResolucion ? 
            new Date(report.fechaResolucion.seconds ? 
                report.fechaResolucion.seconds * 1000 : report.fechaResolucion) : null;

        modalBody.innerHTML = `
            <form id="editReportForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label-sica">Sala</label>
                        <select class="form-control form-control-sica" id="editReportSala" required>
                            <option value="">Seleccionar sala</option>
                            <option value="SICA 1" ${report.sala === 'SICA 1' ? 'selected' : ''}>SICA 1</option>
                            <option value="SICA 2" ${report.sala === 'SICA 2' ? 'selected' : ''}>SICA 2</option>
                            <option value="SICA 3" ${report.sala === 'SICA 3' ? 'selected' : ''}>SICA 3</option>
                            <option value="SICA 4" ${report.sala === 'SICA 4' ? 'selected' : ''}>SICA 4</option>
                            <option value="Salón Inteligente 1" ${report.sala === 'Salón Inteligente 1' ? 'selected' : ''}>Salón Inteligente 1</option>
                            <option value="Salón Inteligente 2" ${report.sala === 'Salón Inteligente 2' ? 'selected' : ''}>Salón Inteligente 2</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Tipo de Servicio</label>
                        <select class="form-control form-control-sica" id="editReportTipo" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="mantenimiento" ${report.tipo === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                            <option value="instalacion" ${report.tipo === 'instalacion' ? 'selected' : ''}>Instalación</option>
                            <option value="software" ${report.tipo === 'software' ? 'selected' : ''}>Software</option>
                            <option value="hardware" ${report.tipo === 'hardware' ? 'selected' : ''}>Hardware</option>
                            <option value="limpieza" ${report.tipo === 'limpieza' ? 'selected' : ''}>Limpieza</option>
                            <option value="otro" ${report.tipo === 'otro' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Responsable</label>
                        <input type="text" class="form-control form-control-sica" id="editReportResponsable" value="${report.responsable}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Estado</label>
                        <select class="form-control form-control-sica" id="editReportEstado" required>
                            <option value="pendiente" ${report.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="en_proceso" ${report.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="resuelto" ${report.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                            <option value="cancelado" ${report.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Nivel de Urgencia</label>
                        <select class="form-control form-control-sica" id="editReportUrgencia" required>
                            <option value="urgente" ${report.urgencia === 'urgente' ? 'selected' : ''}>Urgente</option>
                            <option value="moderado" ${report.urgencia === 'moderado' ? 'selected' : ''}>Moderado</option>
                            <option value="bajo" ${report.urgencia === 'bajo' ? 'selected' : ''}>Bajo</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Fecha de Creación</label>
                        <input type="date" class="form-control form-control-sica" id="editReportFechaCreacion" 
                               value="${fechaCreacion.toISOString().split('T')[0]}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label-sica">Fecha de Resolución</label>
                        <input type="date" class="form-control form-control-sica" id="editReportFechaResolucion" 
                               value="${fechaResolucion ? fechaResolucion.toISOString().split('T')[0] : ''}"
                               ${report.estado === 'resuelto' ? 'required' : ''}>
                        <div class="form-text">Solo requerido si el estado es "Resuelto"</div>
                    </div>
                    <div class="col-12">
                        <label class="form-label-sica">Descripción del Problema</label>
                        <textarea class="form-control form-control-sica" id="editReportDescripcion" rows="4" required>${report.descripcion}</textarea>
                    </div>
                    <div class="col-12">
                        <label class="form-label-sica">Notas Adicionales</label>
                        <textarea class="form-control form-control-sica" id="editReportNotas" rows="3" placeholder="Agregar notas, observaciones o comentarios adicionales...">${report.notas || ''}</textarea>
                        <div class="form-text">Opcional: Comentarios sobre el progreso, solución aplicada, o información relevante</div>
                    </div>
                </div>
            </form>
        `;

        // Agregar evento para manejar el campo de fecha de resolución automáticamente
        const estadoSelect = document.getElementById('editReportEstado');
        const fechaResolucionInput = document.getElementById('editReportFechaResolucion');
        
        estadoSelect.addEventListener('change', (e) => {
            if (e.target.value === 'resuelto') {
                fechaResolucionInput.required = true;
                if (!fechaResolucionInput.value) {
                    fechaResolucionInput.value = new Date().toISOString().split('T')[0];
                }
                fechaResolucionInput.parentElement.querySelector('.form-text').textContent = 'Requerido para reportes resueltos';
            } else {
                fechaResolucionInput.required = false;
                fechaResolucionInput.parentElement.querySelector('.form-text').textContent = 'Solo requerido si el estado es "Resuelto"';
            }
        });
    }

    async updateReport() {
        try {
            const formData = this.getEditReportFormData();
            if (!this.validateEditReportForm(formData)) return;

            const updatedReport = {
                ...formData,
                id: this.currentEditingReport.id,
                fechaCreacion: new Date(formData.fechaCreacion),
                fechaResolucion: formData.fechaResolucion ? new Date(formData.fechaResolucion) : null
            };

            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_reports')
                    .doc(this.currentEditingReport.id)
                    .update({
                        sala: updatedReport.sala,
                        tipo: updatedReport.tipo,
                        descripcion: updatedReport.descripcion,
                        responsable: updatedReport.responsable,
                        estado: updatedReport.estado,
                        urgencia: updatedReport.urgencia,
                        fechaCreacion: updatedReport.fechaCreacion,
                        fechaResolucion: updatedReport.fechaResolucion,
                        notas: updatedReport.notas || '',
                        fechaActualizacion: new Date()
                    });
            } else {
                // Actualizar en datos locales para desarrollo
                const reportIndex = this.reports.findIndex(r => r.id === this.currentEditingReport.id);
                if (reportIndex !== -1) {
                    this.reports[reportIndex] = { ...this.reports[reportIndex], ...updatedReport, fechaActualizacion: new Date() };
                }
            }

            this.hideModal('editReportModal');
            this.currentEditingReport = null;
            this.showNotification('Éxito', 'Reporte actualizado correctamente', 'success', 'bi-check-circle-fill');
            
            await this.loadData();
            this.updateCurrentView();
            this.updateStatistics();
        } catch (error) {
            console.error('Error actualizando reporte:', error);
            this.showNotification('Error', 'Error al actualizar el reporte', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    getEditReportFormData() {
        return {
            sala: document.getElementById('editReportSala').value,
            tipo: document.getElementById('editReportTipo').value,
            descripcion: document.getElementById('editReportDescripcion').value,
            responsable: document.getElementById('editReportResponsable').value,
            estado: document.getElementById('editReportEstado').value,
            urgencia: document.getElementById('editReportUrgencia').value,
            fechaCreacion: document.getElementById('editReportFechaCreacion').value,
            fechaResolucion: document.getElementById('editReportFechaResolucion').value,
            notas: document.getElementById('editReportNotas').value
        };
    }

    validateEditReportForm(data) {
        if (!data.sala || !data.tipo || !data.descripcion || !data.responsable || 
            !data.estado || !data.urgencia || !data.fechaCreacion) {
            this.showNotification('Error', 'Los campos obligatorios son requeridos', 'warning', 'bi-exclamation-triangle-fill');
            return false;
        }

        if (data.estado === 'resuelto' && !data.fechaResolucion) {
            this.showNotification('Error', 'La fecha de resolución es requerida para reportes resueltos', 'warning', 'bi-exclamation-triangle-fill');
            return false;
        }

        if (data.fechaResolucion && new Date(data.fechaResolucion) < new Date(data.fechaCreacion)) {
            this.showNotification('Error', 'La fecha de resolución no puede ser anterior a la fecha de creación', 'warning', 'bi-exclamation-triangle-fill');
            return false;
        }

        return true;
    }

    async viewReportHistory(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) {
            this.showNotification('Error', 'Reporte no encontrado', 'error', 'bi-exclamation-triangle-fill');
            return;
        }

        // Crear modal de historial dinámicamente
        const historyModal = this.createHistoryModal(report);
        document.body.appendChild(historyModal);
        
        const modal = new bootstrap.Modal(historyModal);
        modal.show();
        
        // Remover modal cuando se cierre
        historyModal.addEventListener('hidden.bs.modal', () => {
            historyModal.remove();
        });
    }

    createHistoryModal(report) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'historyModal';
        modal.tabIndex = -1;
        
        const fechaCreacion = new Date(report.fechaCreacion.seconds ? 
            report.fechaCreacion.seconds * 1000 : report.fechaCreacion);
        const fechaResolucion = report.fechaResolucion ? 
            new Date(report.fechaResolucion.seconds ? 
                report.fechaResolucion.seconds * 1000 : report.fechaResolucion) : null;
        const fechaActualizacion = report.fechaActualizacion ? 
            new Date(report.fechaActualizacion.seconds ? 
                report.fechaActualizacion.seconds * 1000 : report.fechaActualizacion) : null;

        // Generar historial simulado basado en los datos del reporte
        const historyItems = this.generateReportHistory(report, fechaCreacion, fechaResolucion, fechaActualizacion);
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content modal-tec">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-clock-history"></i>
                            Historial del Reporte - ${report.sala}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="report-summary mb-4">
                            <h6 class="text-primary">
                                <i class="bi bi-${this.getTypeIcon(report.tipo)}"></i>
                                ${this.getTypeLabel(report.tipo)} - ${report.sala}
                            </h6>
                            <p class="mb-2"><strong>Responsable:</strong> ${report.responsable}</p>
                            <p class="mb-2"><strong>Estado Actual:</strong> 
                                <span class="status-badge status-${report.estado}">
                                    ${this.getStatusLabel(report.estado)}
                                </span>
                            </p>
                            <p class="mb-0"><strong>Urgencia:</strong> 
                                <span class="urgency-badge urgency-${report.urgencia}">
                                    <i class="bi bi-${this.getUrgencyIcon(report.urgencia)}"></i>
                                    ${this.getUrgencyLabel(report.urgencia)}
                                </span>
                            </p>
                        </div>
                        
                        <h6 class="mb-3">
                            <i class="bi bi-list-ol"></i>
                            Cronología de Actividades
                        </h6>
                        
                        <div class="history-timeline">
                            ${historyItems.map(item => `
                                <div class="history-item">
                                    <div class="history-item-header">
                                        <div class="history-item-title">
                                            <i class="bi bi-${item.icon}"></i>
                                            ${item.title}
                                        </div>
                                        <div class="history-item-date">
                                            ${item.date}
                                        </div>
                                    </div>
                                    <div class="history-item-content">
                                        ${item.description}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-lg"></i>
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    generateReportHistory(report, fechaCreacion, fechaResolucion, fechaActualizacion) {
        const history = [];
        
        // Evento de creación
        history.push({
            icon: 'plus-circle-fill',
            title: 'Reporte Creado',
            date: fechaCreacion.toLocaleString(),
            description: `Reporte de ${this.getTypeLabel(report.tipo).toLowerCase()} creado por ${report.responsable}. Descripción: "${report.descripcion}"`
        });
        
        // Si hay notas iniciales
        if (report.notas) {
            history.push({
                icon: 'sticky-fill',
                title: 'Notas Agregadas',
                date: fechaCreacion.toLocaleString(),
                description: `Notas iniciales: "${report.notas}"`
            });
        }
        
        // Estados intermedios (simulados basados en el estado actual)
        if (report.estado === 'en_proceso' || report.estado === 'resuelto') {
            const processingDate = new Date(fechaCreacion.getTime() + (24 * 60 * 60 * 1000)); // +1 día
            history.push({
                icon: 'gear-wide',
                title: 'Iniciado Proceso de Resolución',
                date: processingDate.toLocaleString(),
                description: 'El reporte ha sido asignado y se ha iniciado el proceso de resolución.'
            });
        }
        
        // Si fue actualizado
        if (fechaActualizacion && fechaActualizacion > fechaCreacion) {
            history.push({
                icon: 'pencil-square',
                title: 'Reporte Actualizado',
                date: fechaActualizacion.toLocaleString(),
                description: 'Se actualizó la información del reporte.'
            });
        }
        
        // Si está resuelto
        if (report.estado === 'resuelto' && fechaResolucion) {
            history.push({
                icon: 'check-circle-fill',
                title: 'Reporte Resuelto',
                date: fechaResolucion.toLocaleString(),
                description: 'El reporte ha sido marcado como resuelto. El problema ha sido solucionado exitosamente.'
            });
        }
        
        // Si está cancelado
        if (report.estado === 'cancelado') {
            const cancelDate = fechaActualizacion || new Date();
            history.push({
                icon: 'x-circle-fill',
                title: 'Reporte Cancelado',
                date: cancelDate.toLocaleString(),
                description: 'El reporte ha sido cancelado.'
            });
        }
        
        return history.reverse(); // Mostrar más reciente primero
    }

    async changeReportStatus(reportId) {
        try {
            const report = this.reports.find(r => r.id === reportId);
            if (!report) return;

            const newStatus = this.getNextStatus(report.estado);
            
            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_reports')
                    .doc(reportId)
                    .update({
                        estado: newStatus,
                        fechaResolucion: newStatus === 'resuelto' ? new Date() : null
                    });
            } else {
                report.estado = newStatus;
                report.fechaResolucion = newStatus === 'resuelto' ? new Date() : null;
            }

            this.showNotification('Éxito', 'Estado actualizado correctamente', 'success', 'bi-check-circle-fill');
            await this.loadData();
            this.updateCurrentView();
            this.updateStatistics();
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showNotification('Error', 'Error al actualizar el estado', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    getNextStatus(currentStatus) {
        const statusFlow = {
            'pendiente': 'en_proceso',
            'en_proceso': 'resuelto',
            'resuelto': 'pendiente'
        };
        return statusFlow[currentStatus] || 'pendiente';
    }

    async deleteReport(reportId) {
        if (!confirm('¿Estás seguro de eliminar este reporte?')) return;

        try {
            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_reports')
                    .doc(reportId)
                    .delete();
            } else {
                this.reports = this.reports.filter(r => r.id !== reportId);
            }

            this.showNotification('Éxito', 'Reporte eliminado correctamente', 'success', 'bi-check-circle-fill');
            await this.loadData();
            this.updateCurrentView();
            this.updateStatistics();
        } catch (error) {
            console.error('Error eliminando reporte:', error);
            this.showNotification('Error', 'Error al eliminar el reporte', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    async editService(serviceId) {
        console.log('Editando servicio:', serviceId);
        this.showNotification('Información', 'Función de edición en desarrollo', 'info', 'bi-info-circle-fill');
    }

    async deleteService(serviceId) {
        if (!confirm('¿Estás seguro de eliminar este servicio?')) return;

        try {
            if (typeof firebase !== 'undefined') {
                await firebase.firestore()
                    .collection('technical_services')
                    .doc(serviceId)
                    .delete();
            } else {
                this.services = this.services.filter(s => s.id !== serviceId);
            }

            this.showNotification('Éxito', 'Servicio eliminado correctamente', 'success', 'bi-check-circle-fill');
            await this.loadData();
            this.updateCurrentView();
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            this.showNotification('Error', 'Error al eliminar el servicio', 'error', 'bi-exclamation-triangle-fill');
        }
    }

    updateCurrentView() {
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        } else if (this.currentView === 'reports') {
            this.renderReports();
        } else if (this.currentView === 'services') {
            this.renderServices();
        }
        this.updateStatistics();
    }

    getEmptyState(type, icon) {
        return `
            <div class="empty-state">
                <i class="bi ${icon}"></i>
                <h3>No hay ${type} disponibles</h3>
                <p>Los ${type} aparecerán aquí cuando estén disponibles.</p>
            </div>
        `;
    }

    getTypeIcon(type) {
        const icons = {
            'mantenimiento': 'tools',
            'instalacion': 'download',
            'software': 'code-square',
            'hardware': 'cpu',
            'limpieza': 'brush',
            'otro': 'question-circle'
        };
        return icons[type] || 'question-circle';
    }

    getTypeLabel(type) {
        const labels = {
            'mantenimiento': 'Mantenimiento',
            'instalacion': 'Instalación',
            'software': 'Software',
            'hardware': 'Hardware',
            'limpieza': 'Limpieza',
            'otro': 'Otro'
        };
        return labels[type] || 'Otro';
    }

    getStatusLabel(status) {
        const labels = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'resuelto': 'Resuelto',
            'cancelado': 'Cancelado',
            'completado': 'Completado'
        };
        return labels[status] || status;
    }

    getUrgencyLabel(urgency) {
        const labels = {
            'urgente': 'Urgente',
            'moderado': 'Moderado',
            'bajo': 'Bajo'
        };
        return labels[urgency] || urgency;
    }

    getUrgencyIcon(urgency) {
        const icons = {
            'urgente': 'exclamation-triangle-fill',
            'moderado': 'exclamation-circle',
            'bajo': 'info-circle'
        };
        return icons[urgency] || 'info-circle';
    }

    showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        // Usar el sistema de notificaciones existente si está disponible
        if (typeof window.modernNav !== 'undefined') {
            window.modernNav.showModernNotification(title, message, type, icon);
        } else if (typeof SICAComponents !== 'undefined') {
            SICAComponents.notify(title, message, type, icon);
        } else {
            // Notificación personalizada
            this.createCustomNotification(title, message, type, icon);
        }
    }

    createCustomNotification(title, message, type, icon) {
        const notification = document.createElement('div');
        notification.className = `notification-tec alert alert-${type}`;
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi ${icon} me-2"></i>
                <div>
                    <strong>${title}</strong>
                    <div>${message}</div>
                </div>
                <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Funciones globales para eventos
function showDashboard() {
    if (window.tecManager) {
        window.tecManager.showDashboard();
    }
}

function showReports() {
    if (window.tecManager) {
        window.tecManager.showReports();
    }
}

function showServices() {
    if (window.tecManager) {
        window.tecManager.showServices();
    }
}

function clearFilters() {
    if (window.tecManager) {
        window.tecManager.clearFilters();
    }
}

function toggleView(viewType) {
    if (window.tecManager) {
        window.tecManager.toggleView(viewType);
    }
}

function saveReport() {
    if (window.tecManager) {
        window.tecManager.saveReport();
    }
}

function saveService() {
    if (window.tecManager) {
        window.tecManager.saveService();
    }
}

function updateReport() {
    if (window.tecManager) {
        window.tecManager.updateReport();
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que los componentes base se carguen
    setTimeout(() => {
        window.tecManager = new TecnicalManager();
    }, 500);
});

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error en Gestión Técnica:', e.error);
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TecnicalManager;
}