/**
 * =================================================================
 * ADMIN CORE - Main Controller & Application State Management
 * Archivo: admin-core.js (ACTUALIZADO con módulo Incidencias)
 * =================================================================
 */

class AdminCore {
    constructor() {
        this.db = null;
        this.currentAdvisor = null;
        this.currentPanel = 'search';
        this.modules = {};
        this.cache = new Map();
        this.eventListeners = new Map();
        
        // State management
        this.state = {
            isLoading: false,
            hasError: false,
            errorMessage: '',
            lastUpdate: null
        };
        
        this.init();
    }

    async init() {
        try {
            // Initialize Firebase
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está disponible');
            }
            
            this.db = firebase.firestore();
            
            // Initialize core components
            this.setupEventListeners();
            this.initializeModules();
            
            // Set initial view
            this.showPanel('search');
            
            console.log('🚀 AdminCore initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing AdminCore:', error);
            this.handleError('Error del sistema', 'No se pudo inicializar la aplicación');
        }
    }

    /**
     * Initialize all required modules
     */
    initializeModules() {
        // Initialize SearchManager
        if (typeof SearchManager !== 'undefined') {
            this.modules.search = new SearchManager(this);
            console.log('🔍 SearchManager initialized');
        }
        
        // Initialize StatsManager
        if (typeof StatsManager !== 'undefined') {
            this.modules.stats = new StatsManager(this);
            console.log('📊 StatsManager initialized');
        }
        
        // Initialize ReportsManager
        if (typeof ReportsManager !== 'undefined') {
            this.modules.reports = new ReportsManager(this);
            console.log('📋 ReportsManager initialized');
        }
        
        // Initialize PaymentsManager
        if (typeof PaymentsManager !== 'undefined') {
            this.modules.payments = new PaymentsManager(this);
            console.log('💰 PaymentsManager initialized');
        }
        
        // Initialize IncidenciasManager - NUEVO MÓDULO
        if (typeof IncidenciasManager !== 'undefined') {
            this.modules.incidencias = new IncidenciasManager(this);
            console.log('🚨 IncidenciasManager initialized');
        }
        
        // Initialize AnalyticsManager
        if (typeof AnalyticsManager !== 'undefined') {
            this.modules.analytics = new AnalyticsManager(this);
            console.log('📈 AnalyticsManager initialized');
        }
    }

    /**
     * Setup core event listeners
     */
    setupEventListeners() {
        // Back to search button
        this.addEventListener('backToSearch', 'click', () => {
            this.changeAdvisor();
        });

        // Dashboard navigation tabs
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const panelType = e.currentTarget.dataset.panel;
                this.switchDashboardPanel(panelType);
            });
        });

        // Header action buttons
        this.addEventListener('refreshData', 'click', () => {
            this.refreshAllData();
        });

        this.addEventListener('exportData', 'click', () => {
            this.exportCurrentData();
        });

        // Quick actions
        const quickActions = document.querySelectorAll('.quick-action');
        quickActions.forEach(action => {
            action.addEventListener('click', (e) => {
                const actionType = e.currentTarget.dataset.action;
                this.handleQuickAction(actionType);
            });
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        console.log('🎯 Core event listeners setup complete');
    }

    /**
     * Utility method to add event listeners with cleanup
     */
    addEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            
            // Store for cleanup
            const key = `${elementId}-${event}`;
            this.eventListeners.set(key, { element, event, handler });
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K - Focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.getElementById('advisorSearch');
            if (searchInput && this.currentPanel === 'search') {
                searchInput.focus();
            }
        }
        
        // Escape - Go back or clear
        if (event.key === 'Escape') {
            if (this.currentPanel === 'dashboard') {
                this.changeAdvisor();
            } else {
                const searchInput = document.getElementById('advisorSearch');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.blur();
                    if (this.modules.search) {
                        this.modules.search.clearResults();
                    }
                }
            }
        }
        
        // Numbers 1-5 for dashboard navigation (actualizado para incluir incidencias)
        if (this.currentPanel === 'dashboard' && ['1', '2', '3', '4', '5'].includes(event.key)) {
            const panels = ['overview', 'reports', 'payments', 'incidencias', 'analytics'];
            const panelIndex = parseInt(event.key) - 1;
            if (panels[panelIndex]) {
                this.switchDashboardPanel(panels[panelIndex]);
            }
        }
    }

    /**
     * Show specific panel (search or dashboard)
     */
    showPanel(panelType) {
        const searchPanel = document.getElementById('searchPanel');
        const dashboardPanel = document.getElementById('dashboardPanel');
        
        if (panelType === 'search') {
            if (searchPanel) searchPanel.style.display = 'block';
            if (dashboardPanel) dashboardPanel.style.display = 'none';
            this.currentPanel = 'search';
            
            // Clear current advisor
            this.currentAdvisor = null;
            
        } else if (panelType === 'dashboard') {
            if (searchPanel) searchPanel.style.display = 'none';
            if (dashboardPanel) dashboardPanel.style.display = 'block';
            this.currentPanel = 'dashboard';
        }
    }

    /**
     * Switch between dashboard panels
     */
    switchDashboardPanel(panelType) {
        // Update navigation tabs
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            if (tab.dataset.panel === panelType) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update content panels
        const contentPanels = document.querySelectorAll('.content-panel');
        contentPanels.forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = document.getElementById(`${panelType}Panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Load panel-specific data
        this.loadPanelData(panelType);
    }

    /**
     * Load data for specific panel
     */
    async loadPanelData(panelType) {
        if (!this.currentAdvisor) return;

        try {
            this.setLoadingState(true);

            switch (panelType) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'reports':
                    if (this.modules.reports) {
                        await this.modules.reports.loadData();
                    }
                    break;
                case 'payments':
                    if (this.modules.payments) {
                        await this.modules.payments.loadData();
                    }
                    break;
                case 'incidencias': // NUEVO PANEL
                    if (this.modules.incidencias) {
                        await this.modules.incidencias.loadData();
                    }
                    break;
                case 'analytics':
                    if (this.modules.analytics) {
                        await this.modules.analytics.loadData();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${panelType} data:`, error);
            this.handleError('Error de carga', `No se pudieron cargar los datos de ${panelType}`);
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Load overview dashboard data
     */
    async loadOverviewData() {
        if (!this.currentAdvisor) return;

        // Load stats
        if (this.modules.stats) {
            await this.modules.stats.loadAdvisorStats(this.currentAdvisor.numeroCuenta);
        }

        // Load recent activity
        await this.loadRecentActivity();
    }

    /**
     * Load recent activity data (actualizado para incluir incidencias)
     */
    async loadRecentActivity() {
        try {
            const activityList = document.getElementById('recentActivityList');
            if (!activityList || !this.currentAdvisor) return;

            const activities = [];

            // Get recent reports
            const reportsSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', this.currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .limit(3)
                .get();

            reportsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const activity = {
                    type: 'report',
                    title: `Asistencia ${data.estado}`,
                    description: `${data.tipoBloque || 'Bloque'} - ${data.horasValidas || '0h'}`,
                    time: this.formatDate(data.fecha),
                    icon: this.getActivityIcon(data.estado),
                    iconClass: this.getActivityIconClass(data.estado)
                };
                activities.push(activity);
            });

            // Get recent payments
            const paymentsSnapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', this.currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .limit(2)
                .get();

            paymentsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const activity = {
                    type: 'payment',
                    title: 'Pago de horas registrado',
                    description: `${data.totalHoras || 0}h en ${data.sala || 'sala'}`,
                    time: this.formatDate(data.fecha),
                    icon: 'bi-cash-coin',
                    iconClass: 'success'
                };
                activities.push(activity);
            });

            // Get recent incidencias - NUEVA FUNCIONALIDAD
            const incidenciasSnapshot = await this.db.collection('incidencias')
                .where('asesorCuenta', '==', this.currentAdvisor.numeroCuenta)
                .orderBy('fecha', 'desc')
                .limit(2)
                .get();

            incidenciasSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const activity = {
                    type: 'incidencia',
                    title: 'Incidencia reportada',
                    description: `${data.motivoFalta || 'Sin motivo'} - ${data.horasAcumuladas || 0}h`,
                    time: this.formatDate(data.fecha),
                    icon: 'bi-exclamation-triangle-fill',
                    iconClass: 'warning'
                };
                activities.push(activity);
            });

            // Sort by date and render
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));
            this.renderRecentActivity(activities.slice(0, 5));

        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    /**
     * Render recent activity items
     */
    renderRecentActivity(activities) {
        const activityList = document.getElementById('recentActivityList');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-empty">
                    <div class="activity-empty-icon">
                        <i class="bi bi-clock-history"></i>
                    </div>
                    <h4>Sin actividad reciente</h4>
                    <p>No hay registros recientes para mostrar</p>
                </div>
            `;
            return;
        }

        const activityHTML = activities.map((activity, index) => `
            <div class="activity-item" style="animation-delay: ${index * 100}ms">
                <div class="activity-icon ${activity.iconClass}">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');

        activityList.innerHTML = activityHTML;
    }

    /**
     * Set advisor and switch to dashboard
     */
    async setCurrentAdvisor(advisorData) {
        try {
            this.currentAdvisor = advisorData;
            
            // Update UI with advisor info
            this.updateAdvisorUI(advisorData);
            
            // Switch to dashboard
            this.showPanel('dashboard');
            this.switchDashboardPanel('overview');
            
            // Cache advisor data
            this.cache.set(`advisor_${advisorData.numeroCuenta}`, {
                data: advisorData,
                timestamp: Date.now()
            });

            console.log(`Advisor selected: ${advisorData.nombreAsesor}`);
            
        } catch (error) {
            console.error('Error setting advisor:', error);
            this.handleError('Error', 'No se pudo seleccionar el asesor');
        }
    }

    /**
     * Update advisor information in UI
     */
    updateAdvisorUI(advisorData) {
        // Update advisor name
        const advisorName = document.getElementById('advisorName');
        if (advisorName) {
            advisorName.textContent = advisorData.nombreAsesor;
        }

        // Update advisor account
        const advisorAccount = document.getElementById('advisorAccount');
        if (advisorAccount) {
            advisorAccount.textContent = advisorData.numeroCuenta;
        }

        // Update advisor initials
        const advisorInitials = document.getElementById('advisorInitials');
        if (advisorInitials) {
            const initials = advisorData.nombreAsesor
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
            advisorInitials.textContent = initials;
        }
    }

    /**
     * Change advisor (go back to search)
     */
    changeAdvisor() {
        console.log('🔄 Changing advisor - starting cleanup');
        
        // 1. Store current advisor account BEFORE clearing it
        const currentAdvisorAccount = this.currentAdvisor?.numeroCuenta;
        
        // 2. Clear current advisor
        this.currentAdvisor = null;
        
        // 3. Clear all module data BEFORE showing search panel
        Object.values(this.modules).forEach(module => {
            if (typeof module.clearData === 'function') {
                try {
                    module.clearData();
                    console.log(`✅ Cleared data for module: ${module.constructor.name}`);
                } catch (error) {
                    console.error(`❌ Error clearing module data:`, error);
                }
            }
        });

        // 4. Clear relevant caches
        if (currentAdvisorAccount) {
            const cacheKeysToDelete = [
                `advisor_${currentAdvisorAccount}`,
                `reports_${currentAdvisorAccount}`,
                `payments_${currentAdvisorAccount}`,
                `incidencias_${currentAdvisorAccount}`, // NUEVA CACHE
                `stats_${currentAdvisorAccount}`,
                `analytics_${currentAdvisorAccount}`
            ];
            
            cacheKeysToDelete.forEach(key => {
                this.cache.delete(key);
            });
        }

        // 5. Reset search input and clear results
        const searchInput = document.getElementById('advisorSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        // 6. Clear stats displays
        this.clearStats();

        // 7. Clear tables (using new system element IDs)
        const reportsContainer = document.getElementById('reportsContainer');
        const paymentsContainer = document.getElementById('paymentsContainer');
        const incidenciasContainer = document.getElementById('incidenciasContainer'); // NUEVO CONTAINER
        const analyticsContainer = document.getElementById('analyticsContainer');
        const statsContainer = document.getElementById('statsContainer');
        
        if (reportsContainer) reportsContainer.innerHTML = '';
        if (paymentsContainer) paymentsContainer.innerHTML = '';
        if (incidenciasContainer) incidenciasContainer.innerHTML = ''; // LIMPIAR INCIDENCIAS
        if (analyticsContainer) analyticsContainer.innerHTML = '';
        if (statsContainer) statsContainer.innerHTML = '';

        // 8. Reset filters
        this.resetFilters();

        // 9. Show search panel with proper transition
        const searchPanel = document.getElementById('searchPanel');
        const dashboardPanel = document.getElementById('dashboardPanel');
        
        if (dashboardPanel && searchPanel) {
            // Animate out the dashboard
            dashboardPanel.style.transition = 'all 0.3s ease';
            dashboardPanel.style.opacity = '0';
            dashboardPanel.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                // Hide dashboard and show search
                dashboardPanel.style.display = 'none';
                searchPanel.style.display = 'block';
                searchPanel.style.opacity = '0';
                searchPanel.style.transform = 'translateY(20px)';
                
                // Update current panel
                this.currentPanel = 'search';
                
                // Animate in the search panel
                requestAnimationFrame(() => {
                    searchPanel.style.transition = 'all 0.3s ease';
                    searchPanel.style.opacity = '1';
                    searchPanel.style.transform = 'translateY(0)';
                });
            }, 300);
        }

        // 10. IMPORTANTE: Reinitializar el SearchManager
        if (this.modules.search) {
            // Force reload of advisors list
            console.log('🔄 Reloading advisors list...');
            setTimeout(() => {
                this.modules.search.loadAsesoresList(true); // Force reload
            }, 500); // Wait for UI transition to complete
        }

        // 11. Focus search input after transition
        setTimeout(() => {
            const searchInput = document.getElementById('advisorSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }, 800);

        console.log('✅ Advisor change completed');
        this.showNotification('Selección cambiada', 'Busca otro asesor para continuar', 'info');
    }

    /**
     * Refresh all current data
     */
    async refreshAllData() {
        if (!this.currentAdvisor) return;

        try {
            this.setLoadingState(true);
            
            // Clear cache for current advisor
            const cacheKey = `advisor_${this.currentAdvisor.numeroCuenta}`;
            this.cache.delete(cacheKey);
            
            // Refresh current panel data
            const activePanel = document.querySelector('.nav-tab.active');
            if (activePanel) {
                const panelType = activePanel.dataset.panel;
                await this.loadPanelData(panelType);
            }
            
            this.showNotification('Datos actualizados', 'La información ha sido actualizada correctamente', 'success');
            
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.handleError('Error de actualización', 'No se pudieron actualizar los datos');
        } finally {
            this.setLoadingState(false);
        }
    }

    clearStats() {
        const statElements = [
            'adminHorasTrabajadas',
            'adminHorasAdeudo', 
            'adminTotalPagoHoras',
            'adminDiasTrabajados',
            'adminTotalReportes',
            'adminTotalPagos',
            'adminTotalIncidencias', // NUEVO ELEMENTO
            'horasTrabajadas',
            'horasAdeudo',
            'totalPagoHoras',
            'diasTrabajados'
        ];
        
        statElements.forEach(statId => {
            const element = document.getElementById(statId);
            if (element) {
                element.textContent = statId.includes('Total') ? '0' : '0h';
            }
        });
    }

    resetFilters() {
        const filters = [
            'adminMesFilter',
            'adminEstadoFilter', 
            'adminMesPagoFilter',
            'adminSalaFilter',
            'adminMesIncidenciaFilter', // NUEVO FILTRO
            'adminMotivoIncidenciaFilter', // NUEVO FILTRO
            'reportsMonthFilter',
            'reportsStatusFilter',
            'reportsTypeFilter',
            'paymentsMonthFilter',
            'paymentsSalaFilter',
            'paymentsAuthorizerFilter',
            'incidenciasMonthFilter', // NUEVOS FILTROS DE INCIDENCIAS
            'incidenciasMotivoFilter',
            'incidenciasSalaFilter',
            'incidenciasReporterFilter'
        ];
        
        filters.forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.value = '';
            }
        });
    }

    switchView(viewType) {
        // This method exists for compatibility with the old system
        // In the new system, use switchDashboardPanel instead
        console.log(`switchView called with: ${viewType}`);
        
        if (viewType === 'reportes') {
            this.switchDashboardPanel('reports');
        } else if (viewType === 'pago') {
            this.switchDashboardPanel('payments');
        } else if (viewType === 'incidencias') { // NUEVA VISTA
            this.switchDashboardPanel('incidencias');
        }
    }

    /**
     * Export current view data
     */
    async exportCurrentData() {
        if (!this.currentAdvisor) return;

        try {
            const activePanel = document.querySelector('.nav-tab.active');
            if (!activePanel) return;

            const panelType = activePanel.dataset.panel;
            
            switch (panelType) {
                case 'reports':
                    if (this.modules.reports && this.modules.reports.exportData) {
                        await this.modules.reports.exportData();
                    }
                    break;
                case 'payments':
                    if (this.modules.payments && this.modules.payments.exportData) {
                        await this.modules.payments.exportData();
                    }
                    break;
                case 'incidencias': // NUEVA EXPORTACIÓN
                    if (this.modules.incidencias && this.modules.incidencias.exportData) {
                        await this.modules.incidencias.exportData();
                    }
                    break;
                case 'analytics':
                    if (this.modules.analytics && this.modules.analytics.exportData) {
                        await this.modules.analytics.exportData();
                    }
                    break;
                default:
                    this.exportOverviewData();
                    break;
            }
            
        } catch (error) {
            console.error('Error exporting data:', error);
            this.handleError('Error de exportación', 'No se pudieron exportar los datos');
        }
    }

    /**
     * Export overview data as CSV
     */
    exportOverviewData() {
        if (!this.modules.stats) return;

        const stats = this.modules.stats.getCurrentStats();
        const csvData = [
            ['Métrica', 'Valor'],
            ['Asesor', this.currentAdvisor.nombreAsesor],
            ['Número de Cuenta', this.currentAdvisor.numeroCuenta],
            ['Horas Trabajadas', stats.horasTrabajadas || '0'],
            ['Horas Pendientes', stats.horasPendientes || '0'],
            ['Horas Pagadas', stats.horasPagadas || '0'],
            ['Días Trabajados', stats.diasTrabajados || '0'],
            ['Fecha de Reporte', new Date().toLocaleDateString('es-MX')]
        ];

        this.generateCSV(csvData, `resumen_${this.currentAdvisor.numeroCuenta}`);
    }

    /**
     * Handle quick actions
     */
    handleQuickAction(actionType) {
        switch (actionType) {
            case 'view-reports':
                this.switchDashboardPanel('reports');
                break;
            case 'view-incidencias': // NUEVA ACCIÓN
                this.switchDashboardPanel('incidencias');
                break;
            case 'export-all':
                this.exportCurrentData();
                break;
            case 'generate-summary':
                this.generateMonthlySummary();
                break;
            case 'view-analytics':
                this.switchDashboardPanel('analytics');
                break;
            default:
                console.warn(`Unknown quick action: ${actionType}`);
        }
    }

    /**
     * Generate monthly summary report
     */
    async generateMonthlySummary() {
        // This would be implemented to create a comprehensive monthly report
        this.showNotification('Función en desarrollo', 'La generación de resumen mensual estará disponible pronto', 'info');
    }

    /**
     * Loading state management
     */
    setLoadingState(isLoading) {
        this.state.isLoading = isLoading;
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (loadingOverlay) {
            if (isLoading) {
                loadingOverlay.classList.add('active');
            } else {
                loadingOverlay.classList.remove('active');
            }
        }
    }

    /**
     * Error handling
     */
    handleError(title, message) {
        this.state.hasError = true;
        this.state.errorMessage = message;
        
        console.error(`${title}: ${message}`);
        this.showNotification(title, message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(title, message, type = 'info', icon = '') {
        if (window.modernNav && typeof window.modernNav.showModernNotification === 'function') {
            window.modernNav.showModernNotification(title, message, type, icon);
        } else {
            // Fallback console notification
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    /**
     * Utility methods
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Fecha no disponible';
        
        try {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (error) {
            return dateStr;
        }
    }

    getActivityIcon(estado) {
        switch (estado) {
            case 'presente': return 'bi-check-circle-fill';
            case 'ausente': return 'bi-x-circle-fill';
            case 'tardanza': return 'bi-exclamation-triangle-fill';
            default: return 'bi-question-circle-fill';
        }
    }

    getActivityIconClass(estado) {
        switch (estado) {
            case 'presente': return 'success';
            case 'ausente': return 'danger';
            case 'tardanza': return 'warning';
            default: return 'info';
        }
    }

    /**
     * Generate CSV file
     */
    generateCSV(data, filename) {
        const csvContent = data.map(row => 
            row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Exportación exitosa', 'Los datos se han exportado correctamente', 'success');
        }
    }

    /**
     * Get module by name
     */
    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }

    /**
     * Get current advisor data
     */
    getCurrentAdvisor() {
        return this.currentAdvisor;
    }

    /**
     * Check if data is cached and valid
     */
    isCacheValid(key, maxAge = 300000) { // 5 minutes default
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        return (Date.now() - cached.timestamp) < maxAge;
    }

    /**
     * Cleanup method
     */
    cleanup() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();

        // Clear cache
        this.cache.clear();

        // Cleanup modules
        Object.values(this.modules).forEach(module => {
            if (typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });

        console.log('AdminCore cleanup completed');
    }
}

// Export for global access
window.AdminCore = AdminCore;