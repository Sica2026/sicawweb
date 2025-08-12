/**
 * REPORTES DE ASISTENCIA - JavaScript
 * Sistema Integral de Control de Asistencias - UNAM
 * Diseño futurista con integración completa
 */

// =============================================
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// =============================================

class ReportesAsistenciaApp {
    constructor() {
        this.db = window.firebaseDB;
        this.generador = null;
        this.reporteActual = null;
        this.currentView = 'card';
        this.progressInterval = null;
        
        this.init();
    }

    async init() {
        try {
            // Configurar título de página si SICAComponents está disponible
            if (typeof SICAComponents !== 'undefined' && typeof SICAComponents.setPageTitle === 'function') {
                SICAComponents.setPageTitle('Reportes de Asistencia - SICA UNAM');
            } else {
                // Fallback: cambiar título manualmente
                document.title = 'Reportes de Asistencia - SICA UNAM';
            }
            
            // Configurar breadcrumbs si está disponible
            if (typeof SICAComponents !== 'undefined' && typeof SICAComponents.addBreadcrumbs === 'function') {
                SICAComponents.addBreadcrumbs([
                    { text: 'Inicio', link: '../index.html' },
                    { text: 'Reportes', link: '#' },
                    { text: 'Asistencias', active: true }
                ]);
            }

            // Inicializar componentes
            await this.setupComponents();
            await this.loadTiposBloque();
            this.setupEventListeners();
            this.setDefaultDates();
            
            // Inicializar generador de reportes
            this.generador = new GeneradorReporteAsistencia(this.db);
            
            // Mostrar notificación de bienvenida
            this.showNotification('Sistema Listo', 'El generador de reportes está preparado para usarse', 'success', 'fas fa-check-circle');
            
            console.log('🎯 Reportes de Asistencia iniciado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando aplicación:', error);
            this.showNotification('Error', 'Error al inicializar la aplicación: ' + error.message, 'error', 'fas fa-exclamation-triangle');
        }
    }

    async setupComponents() {
        try {
            // Cargar componentes base si están disponibles
            if (typeof SICAComponents !== 'undefined') {
                // Verificar qué métodos están disponibles
                if (typeof SICAComponents.loadAllComponents === 'function') {
                    await SICAComponents.loadAllComponents();
                } else {
                    console.log('📝 SICAComponents disponible pero loadAllComponents no está definido');
                    
                    // Intentar cargar componentes individuales si existen
                    if (typeof SICAComponents.loadHeader === 'function') {
                        await SICAComponents.loadHeader();
                    }
                    if (typeof SICAComponents.loadNavbar === 'function') {
                        await SICAComponents.loadNavbar();
                    }
                    if (typeof SICAComponents.loadFooter === 'function') {
                        await SICAComponents.loadFooter();
                    }
                }
            } else {
                console.log('📝 SICAComponents no está disponible, continuando sin componentes base');
            }
        } catch (error) {
            console.warn('⚠️ Error cargando componentes base, continuando sin ellos:', error);
        }
    }

    async loadTiposBloque() {
        try {
            const configSnapshot = await this.db.collection('configuracion').get();
            const select = document.getElementById('tipoBloque');
            
            // Limpiar opciones existentes (excepto "Todos los tipos")
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            configSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.tipoBloque) {
                    const option = document.createElement('option');
                    option.value = data.tipoBloque;
                    option.textContent = data.tipoBloque.charAt(0).toUpperCase() + data.tipoBloque.slice(1);
                    select.appendChild(option);
                }
            });
            
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar los tipos de bloque:', error);
        }
    }

    setupEventListeners() {
        // Eventos del formulario
        const btnGenerar = document.getElementById('btnGenerar');
        const btnPreview = document.getElementById('btnPreview');
        
        if (btnGenerar) {
            btnGenerar.addEventListener('click', () => this.generarReporte());
        }
        
        if (btnPreview) {
            btnPreview.addEventListener('click', () => this.previewReporte());
        }
        
        // Eventos de exportación
        const btnExportCSV = document.getElementById('btnExportCSV');
        const btnExportExcel = document.getElementById('btnExportExcel');
        const btnExportPDF = document.getElementById('btnExportPDF');
        const btnShare = document.getElementById('btnShare');
        
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => this.exportar('csv'));
        }
        
        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', () => this.exportar('excel'));
        }
        
        if (btnExportPDF) {
            btnExportPDF.addEventListener('click', () => this.exportar('pdf'));
        }
        
        if (btnShare) {
            btnShare.addEventListener('click', () => this.compartirReporte());
        }
        
        // Eventos de vista
        const btnViewCard = document.getElementById('btnViewCard');
        const btnViewTable = document.getElementById('btnViewTable');
        
        if (btnViewCard) {
            btnViewCard.addEventListener('click', () => this.toggleView('card'));
        }
        
        if (btnViewTable) {
            btnViewTable.addEventListener('click', () => this.toggleView('table'));
        }
        
        // Otros eventos
        const btnReset = document.getElementById('btnReset');
        const btnHelp = document.getElementById('btnHelp');
        
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetFilters());
        }
        
        if (btnHelp) {
            btnHelp.addEventListener('click', () => this.toggleHelpPanel());
        }
        
        // Validación en tiempo real
        const fechaInicio = document.getElementById('fechaInicio');
        const fechaFin = document.getElementById('fechaFin');
        
        if (fechaInicio) {
            fechaInicio.addEventListener('change', () => this.validateDates());
        }
        
        if (fechaFin) {
            fechaFin.addEventListener('change', () => this.validateDates());
        }
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setDefaultDates() {
        const hoy = new Date();
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(hoy.getDate() - 7);
        
        document.getElementById('fechaInicio').value = haceUnaSemana.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
    }

    validateDates() {
        const fechaInicio = new Date(document.getElementById('fechaInicio').value);
        const fechaFin = new Date(document.getElementById('fechaFin').value);
        
        if (fechaInicio > fechaFin) {
            this.showNotification('Fechas Inválidas', 'La fecha de inicio debe ser anterior a la fecha de fin', 'warning', 'fas fa-exclamation-triangle');
            return false;
        }
        
        const diasDiferencia = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
        if (diasDiferencia > 365) {
            this.showNotification('Rango Muy Amplio', 'El rango de fechas no puede exceder 1 año', 'warning', 'fas fa-exclamation-triangle');
            return false;
        }
        
        return true;
    }

    async generarReporte() {
        if (!this.validateForm()) return;
        
        const formData = this.getFormData();
        
        try {
            // Mostrar loading
            this.showLoading(true);
            
            // Simular progreso
            this.startProgressAnimation();
            
            // Generar reporte
            const reporte = await this.generador.generarReporte(
                formData.fechaInicio,
                formData.fechaFin,
                formData.numerosCuenta
            );
            
            // Filtrar por tipo de bloque si se especifica
            const reporteFiltrado = formData.tipoBloque 
                ? reporte.filter(item => item.tipoBloque === formData.tipoBloque)
                : reporte;
            
            this.reporteActual = reporteFiltrado;
            
            // Generar estadísticas
            const estadisticas = this.generador.obtenerEstadisticas(reporteFiltrado);
            
            // Mostrar resultados
            await this.mostrarResultados(reporteFiltrado, estadisticas);
            
            // Ocultar loading
            this.showLoading(false);
            
            this.showNotification('Reporte Generado', `Se generaron ${reporteFiltrado.length} registros`, 'success', 'fas fa-chart-bar');
            
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            this.showLoading(false);
            this.showNotification('Error', 'Error al generar el reporte: ' + error.message, 'error', 'fas fa-exclamation-triangle');
        }
    }

    async previewReporte() {
        if (!this.validateForm()) return;
        
        const formData = this.getFormData();
        
        // Limitar preview a 7 días máximo
        const diasDiferencia = (formData.fechaFin - formData.fechaInicio) / (1000 * 60 * 60 * 24);
        if (diasDiferencia > 7) {
            const nuevaFechaFin = new Date(formData.fechaInicio);
            nuevaFechaFin.setDate(nuevaFechaFin.getDate() + 7);
            formData.fechaFin = nuevaFechaFin;
            
            this.showNotification('Vista Previa Limitada', 'La vista previa se limita a 7 días para mejor rendimiento', 'info', 'fas fa-info-circle');
        }
        
        try {
            this.showLoading(true, 'Generando vista previa...');
            
            const reporte = await this.generador.generarReporte(
                formData.fechaInicio,
                formData.fechaFin,
                formData.numerosCuenta
            );
            
            // Limitar a primeros 20 registros
            const reportePreview = reporte.slice(0, 20);
            const estadisticas = this.generador.obtenerEstadisticas(reportePreview);
            
            await this.mostrarResultados(reportePreview, estadisticas);
            this.showLoading(false);
            
            if (reporte.length > 20) {
                this.showNotification('Vista Previa', `Mostrando 20 de ${reporte.length} registros`, 'info', 'fas fa-eye');
            }
            
        } catch (error) {
            console.error('❌ Error en vista previa:', error);
            this.showLoading(false);
            this.showNotification('Error', 'Error al generar vista previa', 'error', 'fas fa-exclamation-triangle');
        }
    }

    validateForm() {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        
        if (!fechaInicio || !fechaFin) {
            this.showNotification('Campos Requeridos', 'Por favor selecciona las fechas de inicio y fin', 'warning', 'fas fa-exclamation-triangle');
            return false;
        }
        
        return this.validateDates();
    }

    getFormData() {
        const fechaInicio = new Date(document.getElementById('fechaInicio').value);
        const fechaFin = new Date(document.getElementById('fechaFin').value);
        const numeroCuentaInput = document.getElementById('numeroCuenta').value;
        const tipoBloque = document.getElementById('tipoBloque').value;
        
        const numerosCuenta = numeroCuentaInput 
            ? numeroCuentaInput.split(',').map(n => n.trim()).filter(n => n)
            : null;
        
        return {
            fechaInicio,
            fechaFin,
            numerosCuenta,
            tipoBloque: tipoBloque || null
        };
    }

    showLoading(show, message = 'Generando reporte...') {
        const loadingContainer = document.getElementById('loadingContainer');
        const resultsContainer = document.getElementById('resultsContainer');
        
        if (show) {
            loadingContainer.style.display = 'block';
            resultsContainer.style.display = 'none';
            loadingContainer.querySelector('p').textContent = message;
        } else {
            loadingContainer.style.display = 'none';
            this.stopProgressAnimation();
        }
    }

    startProgressAnimation() {
        const progressBar = document.getElementById('progressBar');
        let progress = 0;
        
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            progressBar.style.width = progress + '%';
        }, 200);
    }

    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 500);
    }

    async mostrarResultados(reporte, estadisticas) {
        // Mostrar estadísticas
        this.renderEstadisticas(estadisticas);
        
        // Mostrar reporte detallado
        this.renderReporteDetalle(reporte);
        
        // Mostrar contenedor de resultados
        document.getElementById('resultsContainer').style.display = 'block';
        
        // Scroll suave a resultados
        document.getElementById('resultsContainer').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        // Agregar animaciones
        this.addAnimations();
    }

    renderEstadisticas(estadisticas) {
        const container = document.getElementById('statsContainer');
        
        const stats = [
            {
                icon: 'fas fa-clipboard-list',
                number: estadisticas.totalRegistros,
                label: 'Total Registros',
                color: 'var(--unam-blue)'
            },
            {
                icon: 'fas fa-user-check',
                number: estadisticas.presentes,
                label: 'Presentes',
                color: '#2ed573'
            },
            {
                icon: 'fas fa-user-times',
                number: estadisticas.ausentes,
                label: 'Ausentes',
                color: '#ff4757'
            },
            {
                icon: 'fas fa-clock',
                number: estadisticas.tardanzas,
                label: 'Tardanzas',
                color: '#ffa502'
            },
            {
                icon: 'fas fa-hourglass-half',
                number: this.generador.minutosAHora(estadisticas.promedioHorasTrabajadas),
                label: 'Promedio Horas',
                color: 'var(--unam-gold)'
            }
        ];
        
        container.innerHTML = stats.map(stat => `
            <div class="stat-card fade-in" style="animation-delay: ${Math.random() * 0.5}s">
                <i class="${stat.icon}" style="color: ${stat.color}"></i>
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    renderReporteDetalle(reporte) {
        const container = document.getElementById('reporteDetalle');
        
        container.innerHTML = reporte.map((item, index) => {
            const claseItem = item.estado === 'AUSENTE' ? 'ausente' : 
                             (item.tiempoTardanza > 0 ? 'tardanza' : 'presente');
            
            return `
                <div class="report-item ${claseItem} slide-in" style="animation-delay: ${index * 0.1}s">
                    <div class="report-header">
                        <div class="report-title">
                            <i class="fas fa-user me-2"></i>
                            ${item.nombreAsesor} (${item.numeroCuenta})
                        </div>
                        <div class="status-badge status-${item.estado.toLowerCase()}">
                            ${item.estado}
                        </div>
                    </div>
                    <div class="report-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${item.fecha} - ${item.dia}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Horario: ${item.horarioOficial.inicio} - ${item.horarioOficial.fin}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tag"></i>
                            <span>Horario tipo: ${item.tipoBloque}</span>
                        </div>
                        ${item.tipoBloqueComparado ? `
                            <div class="detail-item">
                                <i class="fas fa-check-circle"></i>
                                <span>Asistencia tipo: ${item.tipoBloqueComparado}</span>
                            </div>
                        ` : ''}
                        ${item.asistenciaReal ? `
                            <div class="detail-item">
                                <i class="fas fa-sign-in-alt"></i>
                                <span>Entrada: ${item.asistenciaReal.entrada || 'No registrada'}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-sign-out-alt"></i>
                                <span>Salida: ${item.asistenciaReal.salida || 'No registrada'}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-stopwatch"></i>
                                <span>Trabajadas: ${this.generador.minutosAHora(item.horasTrabajadas)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${item.observaciones.length > 0 ? `
                        <div class="observations">
                            <ul>
                                ${item.observaciones.map(obs => `<li>${obs}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        // Renderizar tabla también
        this.renderTabla(reporte);
    }

    renderTabla(reporte) {
        const tbody = document.querySelector('#reporteTabla tbody');
        
        tbody.innerHTML = reporte.map(item => `
            <tr>
                <td><strong>${item.nombreAsesor}</strong></td>
                <td>${item.numeroCuenta}</td>
                <td>${item.fecha}<br><small class="text-muted">${item.dia}</small></td>
                <td>
                    <span class="status-badge status-${item.estado.toLowerCase()}">${item.estado}</span>
                </td>
                <td>
                    <small>Tipo: ${item.tipoBloque}</small><br>
                    ${item.horarioOficial.inicio} - ${item.horarioOficial.fin}
                </td>
                <td>
                    ${item.asistenciaReal ? `
                        <small>Tipo: ${item.tipoBloqueComparado || 'N/A'}</small><br>
                        ${item.asistenciaReal.entrada || 'N/A'} - ${item.asistenciaReal.salida || 'N/A'}
                    ` : 'Sin registro'}
                </td>
                <td>
                    <small>${item.observaciones.join('<br>')}</small>
                </td>
            </tr>
        `).join('');
    }

    toggleView(view) {
        this.currentView = view;
        
        const cardView = document.getElementById('cardViewContainer');
        const tableView = document.getElementById('tableViewContainer');
        const btnCard = document.getElementById('btnViewCard');
        const btnTable = document.getElementById('btnViewTable');
        
        if (view === 'card') {
            cardView.style.display = 'block';
            tableView.style.display = 'none';
            btnCard.classList.add('active');
            btnTable.classList.remove('active');
        } else {
            cardView.style.display = 'none';
            tableView.style.display = 'block';
            btnCard.classList.remove('active');
            btnTable.classList.add('active');
        }
    }

    addAnimations() {
        // Agregar clases de animación a elementos
        const elements = document.querySelectorAll('.fade-in, .slide-in');
        elements.forEach((el, index) => {
            el.style.animationDelay = (index * 0.1) + 's';
        });
    }

    exportar(formato) {
        if (!this.reporteActual) {
            this.showNotification('Sin Datos', 'Primero genera un reporte para exportar', 'warning', 'fas fa-exclamation-triangle');
            return;
        }

        switch (formato) {
            case 'csv':
                this.exportarCSV();
                break;
            case 'excel':
                this.exportarExcel();
                break;
            case 'pdf':
                this.exportarPDF();
                break;
            default:
                this.showNotification('Error', 'Formato de exportación no válido', 'error', 'fas fa-exclamation-triangle');
        }
    }

    exportarCSV() {
        try {
            const headers = [
                'Nombre', 'Número Cuenta', 'Fecha', 'Día', 'Estado', 
                'Horario Tipo', 'Asistencia Tipo', 'Horario Oficial', 
                'Entrada Real', 'Salida Real', 'Tardanza (min)', 'Observaciones'
            ];
            
            const csvContent = [
                headers.join(','),
                ...this.reporteActual.map(item => [
                    `"${item.nombreAsesor}"`,
                    item.numeroCuenta,
                    item.fecha,
                    item.dia,
                    item.estado,
                    item.tipoBloque,
                    item.tipoBloqueComparado || 'N/A',
                    `"${item.horarioOficial.inicio}-${item.horarioOficial.fin}"`,
                    item.asistenciaReal?.entrada || 'N/A',
                    item.asistenciaReal?.salida || 'N/A',
                    item.tiempoTardanza,
                    `"${item.observaciones.join('; ')}"`
                ].join(','))
            ].join('\n');

            this.downloadFile(csvContent, 'text/csv', 'reporte_asistencia.csv');
            this.showNotification('Exportado', 'Archivo CSV descargado exitosamente', 'success', 'fas fa-download');
            
        } catch (error) {
            console.error('Error exportando CSV:', error);
            this.showNotification('Error', 'Error al exportar CSV', 'error', 'fas fa-exclamation-triangle');
        }
    }

    exportarExcel() {
        // Simulación de exportación Excel (requeriría una librería como SheetJS)
        this.showNotification('Próximamente', 'Exportación a Excel estará disponible pronto', 'info', 'fas fa-info-circle');
    }

    exportarPDF() {
        // Simulación de exportación PDF (requeriría una librería como jsPDF)
        this.showNotification('Próximamente', 'Exportación a PDF estará disponible pronto', 'info', 'fas fa-info-circle');
    }

    downloadFile(content, mimeType, filename) {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    compartirReporte() {
        if (!this.reporteActual) {
            this.showNotification('Sin Datos', 'Primero genera un reporte para compartir', 'warning', 'fas fa-exclamation-triangle');
            return;
        }

        if (navigator.share) {
            navigator.share({
                title: 'Reporte de Asistencia - SICA UNAM',
                text: `Reporte generado con ${this.reporteActual.length} registros`,
                url: window.location.href
            }).then(() => {
                this.showNotification('Compartido', 'Reporte compartido exitosamente', 'success', 'fas fa-share-alt');
            }).catch(err => {
                this.fallbackShare();
            });
        } else {
            this.fallbackShare();
        }
    }

    fallbackShare() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('URL Copiada', 'La URL del reporte se copió al portapapeles', 'success', 'fas fa-copy');
        }).catch(() => {
            this.showNotification('Compartir', 'Puedes compartir esta URL: ' + url, 'info', 'fas fa-share-alt');
        });
    }

    handleKeyboardShortcuts(e) {
        // Alt + G: Generar reporte
        if (e.altKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            this.generarReporte();
        }
        
        // Alt + P: Vista previa
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            this.previewReporte();
        }
        
        // Alt + V: Cambiar vista
        if (e.altKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.toggleView(this.currentView === 'card' ? 'table' : 'card');
        }
        
        // Alt + E: Exportar CSV
        if (e.altKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            this.exportar('csv');
        }
        
        // Escape: Cerrar panel de ayuda
        if (e.key === 'Escape') {
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('show')) {
                bootstrap.Offcanvas.getInstance(helpPanel).hide();
            }
        }
    }

    showNotification(title, message, type = 'info', icon = 'fas fa-info-circle') {
        // Usar el sistema de notificaciones de SICAComponents si está disponible
        if (typeof SICAComponents !== 'undefined' && typeof SICAComponents.notify === 'function') {
            SICAComponents.notify(title, message, type, icon);
        } else if (typeof window.modernNav !== 'undefined' && typeof window.modernNav.showModernNotification === 'function') {
            // Fallback a modernNav si está disponible
            window.modernNav.showModernNotification(title, message, type, icon);
        } else {
            // Fallback final: crear notificación simple
            this.showSimpleNotification(title, message, type);
        }
    }

    showSimpleNotification(title, message, type) {
        // Crear notificación simple sin dependencias
        const notification = document.createElement('div');
        notification.className = `alert alert-${this.getBootstrapClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        notification.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getBootstrapClass(type) {
        const classMap = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return classMap[type] || 'info';
    }

    // Métodos de utilidad
    resetFilters() {
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        document.getElementById('numeroCuenta').value = '';
        document.getElementById('tipoBloque').value = '';
        
        this.setDefaultDates();
        this.showNotification('Filtros Reseteados', 'Se han restaurado los valores por defecto', 'info', 'fas fa-undo');
    }

    toggleHelpPanel() {
        const helpPanel = document.getElementById('helpPanel');
        if (helpPanel) {
            const offcanvas = new bootstrap.Offcanvas(helpPanel);
            offcanvas.show();
        }
    }
}

// =============================================
// GENERADOR DE REPORTES DE ASISTENCIA
// =============================================

class GeneradorReporteAsistencia {
    constructor(db) {
        this.db = db;
        this.reporteActual = null;
    }

    horaAMinutos(horaStr) {
        if (!horaStr) return 0;
        const [hora, minuto] = horaStr.split(':').map(Number);
        return hora * 60 + minuto;
    }

    minutosAHora(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    obtenerNombreDia(fecha) {
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return dias[fecha.getDay()];
    }

    calcularDiferenciaTiempo(horaReal, horaOficial) {
        const minutosReal = this.horaAMinutos(horaReal);
        const minutosOficial = this.horaAMinutos(horaOficial);
        return minutosReal - minutosOficial;
    }

    async generarReporte(fechaInicio, fechaFin, numerosCuenta = null) {
        try {
            const reporte = [];

            // 1. Obtener configuración
            const configSnapshot = await this.db.collection('configuracion').get();
            const configuraciones = {};
            configSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.tipoBloque) {
                    configuraciones[doc.id] = data;
                }
            });

            // 2. Obtener horarios
            let horariosQuery = this.db.collection('horarios');
            if (numerosCuenta && numerosCuenta.length > 0) {
                horariosQuery = horariosQuery.where('numeroCuenta', 'in', numerosCuenta);
            }
            
            const horariosSnapshot = await horariosQuery.get();
            const horarios = {};
            
            horariosSnapshot.forEach(doc => {
                const data = doc.data();
                const numeroCuenta = data.numeroCuenta;
                
                if (!horarios[numeroCuenta]) {
                    horarios[numeroCuenta] = [];
                }
                horarios[numeroCuenta].push({
                    id: doc.id,
                    ...data
                });
            });

            // 3. Obtener asistencias
            let asistenciasQuery = this.db.collection('asistenciasemana')
                .where('fechaCompleta', '>=', fechaInicio)
                .where('fechaCompleta', '<=', fechaFin);
                
            if (numerosCuenta && numerosCuenta.length > 0) {
                asistenciasQuery = asistenciasQuery.where('numeroCuenta', 'in', numerosCuenta);
            }

            const asistenciasSnapshot = await asistenciasQuery.get();
            const asistencias = {};

            asistenciasSnapshot.forEach(doc => {
                const data = doc.data();
                const numeroCuenta = data.numeroCuenta;
                const fecha = data.fechaCompleta.toDate();
                const fechaStr = fecha.toISOString().split('T')[0];
                
                if (!asistencias[numeroCuenta]) {
                    asistencias[numeroCuenta] = {};
                }
                if (!asistencias[numeroCuenta][fechaStr]) {
                    asistencias[numeroCuenta][fechaStr] = [];
                }
                asistencias[numeroCuenta][fechaStr].push({
                    id: doc.id,
                    ...data,
                    fecha: fecha
                });
            });

            // 4. Generar reporte comparando por tipoBloque
            for (const numeroCuenta in horarios) {
                const horariosPersona = horarios[numeroCuenta];
                const asistenciasPersona = asistencias[numeroCuenta] || {};

                const nombreAsesor = horariosPersona[0]?.nombreAsesor || 
                                   Object.values(asistenciasPersona)[0]?.[0]?.nombreAsesor || 
                                   'Nombre no encontrado';

                let fechaActual = new Date(fechaInicio);
                while (fechaActual <= fechaFin) {
                    const fechaStr = fechaActual.toISOString().split('T')[0];
                    const nombreDia = this.obtenerNombreDia(fechaActual);
                    
                    const horariosDelDia = horariosPersona.filter(horario => {
                        return horario.dias && horario.dias.includes(nombreDia);
                    });

                    if (horariosDelDia.length > 0) {
                        const asistenciaDelDia = asistenciasPersona[fechaStr] || [];

                        for (const horario of horariosDelDia) {
                            const tipoBloque = horario.tipoBloque;

                            const reporteItem = {
                                numeroCuenta: numeroCuenta,
                                nombreAsesor: nombreAsesor,
                                fecha: fechaActual.toLocaleDateString('es-ES'),
                                dia: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1),
                                tipoBloque: tipoBloque,
                                horarioOficial: {
                                    inicio: horario.horaInicio,
                                    fin: horario.horaFinal,
                                    horas: horario.horas
                                },
                                asistenciaReal: null,
                                estado: 'AUSENTE',
                                observaciones: [],
                                tiempoTardanza: 0,
                                tiempoSalidaTemprana: 0,
                                horasTrabajadas: 0,
                                tipoBloqueComparado: null
                            };

                            if (asistenciaDelDia.length > 0) {
                                // Buscar asistencias que coincidan con el tipoBloque del horario
                                const asistenciasCompatibles = asistenciaDelDia.filter(asistencia => 
                                    asistencia.tipoBloque === tipoBloque
                                );

                                if (asistenciasCompatibles.length > 0) {
                                    let mejorCoincidencia = null;
                                    let menorDiferencia = Infinity;

                                    for (const asistencia of asistenciasCompatibles) {
                                        if (asistencia.entrada && asistencia.entrada.horaOriginal) {
                                            const horaEntrada = asistencia.entrada.horaOriginal;
                                            const diferencia = Math.abs(
                                                this.calcularDiferenciaTiempo(horaEntrada, horario.horaInicio)
                                            );
                                            
                                            if (diferencia < menorDiferencia) {
                                                menorDiferencia = diferencia;
                                                mejorCoincidencia = asistencia;
                                            }
                                        }
                                    }

                                    if (mejorCoincidencia) {
                                        const asistencia = mejorCoincidencia;
                                        reporteItem.estado = 'PRESENTE';
                                        reporteItem.tipoBloqueComparado = asistencia.tipoBloque;
                                        
                                        reporteItem.asistenciaReal = {
                                            entrada: asistencia.entrada?.horaOriginal || null,
                                            salida: asistencia.salida?.horaOriginal || null,
                                            horasTrabajadas: asistencia.horasTrabajadas || '0h 0m'
                                        };

                                        if (asistencia.entrada?.horaOriginal) {
                                            const tardanza = this.calcularDiferenciaTiempo(
                                                asistencia.entrada.horaOriginal,
                                                horario.horaInicio
                                            );
                                            
                                            if (tardanza > 0) {
                                                reporteItem.tiempoTardanza = tardanza;
                                                reporteItem.observaciones.push(
                                                    `Llegó ${tardanza} minutos tarde`
                                                );
                                            }
                                        }

                                        if (asistencia.salida?.horaOriginal) {
                                            const salidaTemprana = this.calcularDiferenciaTiempo(
                                                horario.horaFinal,
                                                asistencia.salida.horaOriginal
                                            );
                                            
                                            if (salidaTemprana > 0) {
                                                reporteItem.tiempoSalidaTemprana = salidaTemprana;
                                                reporteItem.observaciones.push(
                                                    `Salió ${salidaTemprana} minutos antes`
                                                );
                                            }
                                        }

                                        if (asistencia.horasTrabajadas) {
                                            const match = asistencia.horasTrabajadas.match(/(\d+)h\s*(\d+)m/);
                                            if (match) {
                                                const horas = parseInt(match[1]);
                                                const minutos = parseInt(match[2]);
                                                reporteItem.horasTrabajadas = horas * 60 + minutos;
                                            }
                                        }
                                    } else {
                                        reporteItem.observaciones.push(
                                            `No hay asistencia para el tipo de bloque: ${tipoBloque}`
                                        );
                                    }
                                } else {
                                    reporteItem.observaciones.push(
                                        `No registró asistencia para el tipo de bloque: ${tipoBloque}`
                                    );
                                }
                            }

                            if (reporteItem.estado === 'AUSENTE') {
                                if (asistenciaDelDia.length > 0) {
                                    const otrosTipos = asistenciaDelDia
                                        .filter(a => a.tipoBloque && a.tipoBloque !== tipoBloque)
                                        .map(a => a.tipoBloque);
                                    
                                    if (otrosTipos.length > 0) {
                                        reporteItem.observaciones.push(
                                            `Registró asistencia con otros tipos de bloque: ${[...new Set(otrosTipos)].join(', ')}`
                                        );
                                    } else {
                                        reporteItem.observaciones.push('No registró asistencia');
                                    }
                                } else {
                                    reporteItem.observaciones.push('No registró asistencia');
                                }
                            }

                            reporte.push(reporteItem);
                        }
                    }

                    fechaActual.setDate(fechaActual.getDate() + 1);
                }
            }

            this.reporteActual = reporte;
            return reporte;

        } catch (error) {
            console.error('Error generando reporte:', error);
            throw error;
        }
    }

    obtenerEstadisticas(reporte) {
        const stats = {
            totalRegistros: reporte.length,
            presentes: 0,
            ausentes: 0,
            tardanzas: 0,
            salidasTempranas: 0,
            tiempoTotalTardanza: 0,
            tiempoTotalSalidaTemprana: 0,
            promedioHorasTrabajadas: 0
        };

        let totalMinutosTrabajados = 0;

        reporte.forEach(item => {
            if (item.estado === 'PRESENTE') {
                stats.presentes++;
                totalMinutosTrabajados += item.horasTrabajadas;
            } else {
                stats.ausentes++;
            }

            if (item.tiempoTardanza > 0) {
                stats.tardanzas++;
                stats.tiempoTotalTardanza += item.tiempoTardanza;
            }

            if (item.tiempoSalidaTemprana > 0) {
                stats.salidasTempranas++;
                stats.tiempoTotalSalidaTemprana += item.tiempoSalidaTemprana;
            }
        });

        if (stats.presentes > 0) {
            stats.promedioHorasTrabajadas = Math.round(totalMinutosTrabajados / stats.presentes);
        }

        return stats;
    }
}

// =============================================
// FUNCIONES GLOBALES Y EVENTOS
// =============================================

// Funciones globales para compatibilidad con HTML onclick
window.generarReporte = () => {
    if (reportesApp) {
        reportesApp.generarReporte();
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.previewReporte = () => {
    if (reportesApp) {
        reportesApp.previewReporte();
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.exportarCSV = () => {
    if (reportesApp) {
        reportesApp.exportar('csv');
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.exportarExcel = () => {
    if (reportesApp) {
        reportesApp.exportar('excel');
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.exportarPDF = () => {
    if (reportesApp) {
        reportesApp.exportar('pdf');
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.compartirReporte = () => {
    if (reportesApp) {
        reportesApp.compartirReporte();
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.toggleView = (view) => {
    if (reportesApp) {
        reportesApp.toggleView(view);
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.resetFilters = () => {
    if (reportesApp) {
        reportesApp.resetFilters();
    } else {
        console.error('La aplicación no está inicializada');
    }
};

window.toggleHelpPanel = () => {
    const helpPanel = new bootstrap.Offcanvas(document.getElementById('helpPanel'));
    helpPanel.show();
};

// Instancia global de la aplicación
let reportesApp;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando aplicación de reportes...');
    
    // Función para inicializar la aplicación
    function initApp() {
        try {
            reportesApp = new ReportesAsistenciaApp();
            console.log('✅ Aplicación inicializada correctamente');
        } catch (error) {
            console.error('❌ Error al inicializar aplicación:', error);
            // Mostrar error al usuario
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger position-fixed';
            errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            errorDiv.innerHTML = `
                <strong>Error de Inicialización</strong><br>
                ${error.message}<br>
                <small>Verifica que Firebase esté configurado correctamente.</small>
            `;
            document.body.appendChild(errorDiv);
        }
    }
    
    // Esperar a que Firebase esté listo
    if (window.firebaseDB) {
        console.log('🔥 Firebase ya está listo');
        initApp();
    } else {
        console.log('⏳ Esperando Firebase...');
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        const checkFirebase = setInterval(() => {
            attempts++;
            
            if (window.firebaseDB) {
                console.log('🔥 Firebase listo después de', attempts, 'intentos');
                clearInterval(checkFirebase);
                initApp();
            } else if (attempts >= maxAttempts) {
                console.error('❌ Firebase no se pudo cargar después de', maxAttempts, 'intentos');
                clearInterval(checkFirebase);
                
                // Mostrar error específico de Firebase
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-warning position-fixed';
                errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
                errorDiv.innerHTML = `
                    <strong>Firebase no disponible</strong><br>
                    Verifica que firebase-config.js esté cargado correctamente.
                `;
                document.body.appendChild(errorDiv);
            }
        }, 100);
    }
});

console.log('📊 Módulo de Reportes de Asistencia cargado');