/* =================================================================
   REPORTES DE ASESORES - JAVASCRIPT
   Sistema de visualización de reportes con autenticación
   ================================================================= */

class ReportesManager {
    constructor() {
        this.currentUser = null;
        this.reportes = [];
        this.filteredReportes = [];
        this.db = null;
        this.sortConfig = { key: 'fecha', direction: 'desc' };
        
        this.init();
    }

    async init() {
        try {
            // Inicializar Firebase
            this.db = firebase.firestore();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Verificar autenticación existente
            this.checkExistingAuth();
            
            console.log('✅ ReportesManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando ReportesManager:', error);
            this.showNotification('Error', 'Error al inicializar el sistema', 'error');
        }
    }

    setupEventListeners() {
        // Formulario de autenticación
        const authForm = document.getElementById('authForm');
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.authenticateUser();
            });
        }

        // Input de número de cuenta con validación
        if (numeroCuentaInput) {
            numeroCuentaInput.addEventListener('input', (e) => {
                // Solo números
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                
                // Habilitar/deshabilitar botón
                const isValid = e.target.value.length === 9;
                authBtn.disabled = !isValid;
                authBtn.classList.toggle('disabled', !isValid);
            });

            // Enter para enviar
            numeroCuentaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.length === 9) {
                    this.authenticateUser();
                }
            });
        }

        // Botón de logout/cambiar usuario
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // También buscar por si el ID es diferente en el HTML
        const cambiarUsuarioBtn = document.querySelector('.btn-logout');
        if (cambiarUsuarioBtn && cambiarUsuarioBtn !== logoutBtn) {
            cambiarUsuarioBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Filtros
        const mesFilter = document.getElementById('mesFilter');
        const estadoFilter = document.getElementById('estadoFilter');
        
        if (mesFilter) {
            mesFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
        
        if (estadoFilter) {
            estadoFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Botones de acción
        const refreshBtn = document.getElementById('refreshBtn');
        const exportBtn = document.getElementById('exportBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadReportes();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReportes();
            });
        }

        // Sorting de tabla
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                this.sortReportes(sortKey);
            });
        });
    }

    checkExistingAuth() {
        // Verificar si hay datos de usuario en localStorage
        const savedUser = localStorage.getItem('reportes_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.showReportsSection();
                this.loadReportes();
            } catch (error) {
                console.error('Error al recuperar usuario guardado:', error);
                localStorage.removeItem('reportes_user');
            }
        }
    }

    async authenticateUser() {
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        const numeroCuenta = numeroCuentaInput.value.trim();

        if (numeroCuenta.length !== 9) {
            this.showNotification('Error', 'El número de cuenta debe tener 9 dígitos', 'error');
            return;
        }

        // Mostrar estado de carga
        authBtn.classList.add('loading');
        authBtn.disabled = true;

        try {
            // Verificar si existe el asesor en Firebase
            const reportesSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .limit(1)
                .get();

            if (reportesSnapshot.empty) {
                throw new Error('No se encontraron reportes para este número de cuenta');
            }

            // Obtener nombre del primer reporte
            const primerReporte = reportesSnapshot.docs[0].data();
            const nombreAsesor = primerReporte.nombreAsesor || 'Asesor';

            // Guardar usuario
            this.currentUser = {
                numeroCuenta,
                nombreAsesor,
                authenticatedAt: new Date().toISOString()
            };

            // Guardar en localStorage para persistencia
            localStorage.setItem('reportes_user', JSON.stringify(this.currentUser));

            // Mostrar sección de reportes
            this.showReportsSection();
            this.loadReportes();

            this.showNotification(
                '¡Bienvenido!', 
                `Acceso autorizado para ${nombreAsesor}`, 
                'success',
                'bi-check-circle-fill'
            );

        } catch (error) {
            console.error('Error en autenticación:', error);
            this.showNotification(
                'Error de acceso', 
                error.message || 'No se pudo verificar el número de cuenta', 
                'error',
                'bi-exclamation-triangle-fill'
            );
        } finally {
            authBtn.classList.remove('loading');
            authBtn.disabled = false;
        }
    }

    showReportsSection() {
        const authSection = document.getElementById('authSection');
        const reportsSection = document.getElementById('reportsSection');
        
        // Actualizar información del usuario
        const userName = document.getElementById('userName');
        const userAccount = document.getElementById('userAccount');
        
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.nombreAsesor;
        }
        
        if (userAccount && this.currentUser) {
            userAccount.textContent = this.currentUser.numeroCuenta;
        }

        // Animación de transición
        if (authSection) {
            authSection.style.opacity = '0';
            authSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                authSection.style.display = 'none';
                reportsSection.style.display = 'block';
                reportsSection.classList.add('animate-fade-in');
            }, 300);
        }
    }

    async loadReportes() {
        if (!this.currentUser) return;

        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const reportsTableBody = document.getElementById('reportsTableBody');

        // Mostrar loading
        if (loadingState) loadingState.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (reportsTableBody) reportsTableBody.innerHTML = '';

        try {
            // Consultar reportes de Firebase
            const reportesSnapshot = await this.db.collection('reportesasesores')
                .where('numeroCuenta', '==', this.currentUser.numeroCuenta)
                .orderBy('fecha', 'desc')
                .get();

            this.reportes = reportesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Aplicar filtros iniciales
            this.filteredReportes = [...this.reportes];
            this.applyFilters();

            // Actualizar estadísticas
            this.updateStats();

            // Renderizar tabla
            this.renderTable();

            // Ocultar loading
            if (loadingState) loadingState.style.display = 'none';

            console.log(`📊 Cargados ${this.reportes.length} reportes`);

        } catch (error) {
            console.error('Error cargando reportes:', error);
            this.showNotification('Error', 'No se pudieron cargar los reportes', 'error');
            
            if (loadingState) loadingState.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.querySelector('h3').textContent = 'Error al cargar';
                emptyState.querySelector('p').textContent = 'No se pudieron cargar los reportes. Intenta de nuevo.';
            }
        }
    }

    updateStats() {
        // Calcular estadísticas
        const horasTrabajadas = this.calcularHorasTotales();
        const horasRequeridas = 60; // Asumiendo 60 horas requeridas
        const progreso = Math.min((horasTrabajadas / horasRequeridas) * 100, 100);
        const diasTrabajados = this.reportes.filter(r => r.estado === 'presente').length;

        // Actualizar UI
        const horasTrabajadasEl = document.getElementById('horasTrabajadas');
        const horasRequeridasEl = document.getElementById('horasRequeridas');
        const progresoPorcentajeEl = document.getElementById('progresoPorcentaje');
        const diasTrabajadosEl = document.getElementById('diasTrabajados');
        const progressCircle = document.getElementById('progressCircle');

        if (horasTrabajadasEl) {
            this.animateValue(horasTrabajadasEl, 0, horasTrabajadas, 1000, 'h');
        }

        if (horasRequeridasEl) {
            horasRequeridasEl.textContent = `${horasRequeridas}h`;
        }

        if (progresoPorcentajeEl) {
            this.animateValue(progresoPorcentajeEl, 0, Math.round(progreso), 1500, '%');
        }

        if (diasTrabajadosEl) {
            this.animateValue(diasTrabajadosEl, 0, diasTrabajados, 800);
        }

        // Animar círculo de progreso
        if (progressCircle) {
            const circumference = 2 * Math.PI * 25; // radio = 25
            const offset = circumference - (progreso / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    calcularHorasTotales() {
        let totalMinutos = 0;

        this.reportes.forEach(reporte => {
            if (reporte.tiempoTrabajado && reporte.estado === 'presente') {
                const tiempo = this.parseTimeString(reporte.tiempoTrabajado);
                totalMinutos += tiempo.horas * 60 + tiempo.minutos;
            }
        });

        return Math.round(totalMinutos / 60 * 100) / 100; // Redondear a 2 decimales
    }

    parseTimeString(timeStr) {
        // Parsear strings como "1h 30m", "2h", "45m"
        const horasMatch = timeStr.match(/(\d+)h/);
        const minutosMatch = timeStr.match(/(\d+)m/);
        
        return {
            horas: horasMatch ? parseInt(horasMatch[1]) : 0,
            minutos: minutosMatch ? parseInt(minutosMatch[1]) : 0
        };
    }

    animateValue(element, start, end, duration, suffix = '') {
        if (!element) return;

        const range = end - start;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Función de easing
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = start + (range * easeOutCubic);
            
            element.textContent = Math.round(current) + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = end + suffix;
            }
        };

        requestAnimationFrame(animate);
    }

    applyFilters() {
        const mesFilter = document.getElementById('mesFilter');
        const estadoFilter = document.getElementById('estadoFilter');
        
        let filtered = [...this.reportes];

        // Filtro por mes
        if (mesFilter && mesFilter.value) {
            const [year, month] = mesFilter.value.split('-');
            filtered = filtered.filter(reporte => {
                // Parsear fecha correctamente para evitar problemas de zona horaria
                const [reporteYear, reporteMonth, reporteDay] = reporte.fecha.split('-');
                const fechaReporte = new Date(reporteYear, reporteMonth - 1, reporteDay);
                return fechaReporte.getFullYear() == year && 
                       (fechaReporte.getMonth() + 1) == parseInt(month);
            });
        }

        // Filtro por estado
        if (estadoFilter && estadoFilter.value) {
            filtered = filtered.filter(reporte => 
                reporte.estado === estadoFilter.value
            );
        }

        this.filteredReportes = filtered;
        this.renderTable();
    }

    sortReportes(key) {
        // Actualizar configuración de sort
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }

        // Ordenar datos
        this.filteredReportes.sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];

            // Manejar fechas - parsear correctamente para evitar problemas de zona horaria
            if (key === 'fecha') {
                const [aYear, aMonth, aDay] = aVal.split('-');
                const [bYear, bMonth, bDay] = bVal.split('-');
                aVal = new Date(aYear, aMonth - 1, aDay);
                bVal = new Date(bYear, bMonth - 1, bDay);
            }
            
            // Manejar tiempo trabajado
            if (key === 'tiempoTrabajado') {
                const aTime = this.parseTimeString(aVal);
                const bTime = this.parseTimeString(bVal);
                aVal = aTime.horas * 60 + aTime.minutos;
                bVal = bTime.horas * 60 + bTime.minutos;
            }

            if (aVal < bVal) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Actualizar iconos de sort
        this.updateSortIcons();
        
        // Re-renderizar tabla
        this.renderTable();
    }

    updateSortIcons() {
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (header.dataset.sort === this.sortConfig.key) {
                icon.className = this.sortConfig.direction === 'asc' 
                    ? 'bi bi-arrow-up sort-icon'
                    : 'bi bi-arrow-down sort-icon';
                header.style.background = 'var(--report-gold)';
                header.style.color = 'white';
            } else {
                icon.className = 'bi bi-arrow-up-down sort-icon';
                header.style.background = '';
                header.style.color = '';
            }
        });
    }

    renderTable() {
        const reportsTableBody = document.getElementById('reportsTableBody');
        const emptyState = document.getElementById('emptyState');
        const totalReportesEl = document.getElementById('totalReportes');

        if (!reportsTableBody) return;

        // Actualizar contador
        if (totalReportesEl) {
            totalReportesEl.textContent = this.filteredReportes.length;
        }

        // Verificar si hay datos
        if (this.filteredReportes.length === 0) {
            reportsTableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Generar filas
        const rows = this.filteredReportes.map((reporte, index) => {
            // Parsear fecha correctamente para evitar problemas de zona horaria
            const [year, month, day] = reporte.fecha.split('-');
            const fecha = new Date(year, month - 1, day).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            const statusClass = `status-${reporte.estado}`;
            const statusIcon = this.getStatusIcon(reporte.estado);

            return `
                <tr style="animation-delay: ${index * 0.1}s">
                    <td class="date-cell">${fecha}</td>
                    <td class="time-cell">${reporte.entrada || '--'}</td>
                    <td class="time-cell">${reporte.salida || '--'}</td>
                    <td class="duration-cell">${reporte.tiempoTrabajado || '--'}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="${statusIcon}"></i>
                            ${reporte.estado}
                        </span>
                    </td>
                    <td class="observations-cell" title="${reporte.observaciones || 'Sin observaciones'}">
                        ${reporte.observaciones || 'Sin observaciones'}
                    </td>
                </tr>
            `;
        }).join('');

        reportsTableBody.innerHTML = rows;
    }

    getStatusIcon(estado) {
        switch (estado) {
            case 'presente': return 'bi-check-circle-fill';
            case 'ausente': return 'bi-x-circle-fill';
            case 'tardanza': return 'bi-exclamation-triangle-fill';
            default: return 'bi-question-circle-fill';
        }
    }

    exportReportes() {
        if (this.filteredReportes.length === 0) {
            this.showNotification('Sin datos', 'No hay reportes para exportar', 'warning');
            return;
        }

        // Preparar datos para CSV
        const headers = [
            'Fecha',
            'Entrada',
            'Salida',
            'Tiempo Trabajado',
            'Estado',
            'Observaciones'
        ];

        const csvData = this.filteredReportes.map(reporte => [
            reporte.fecha,
            reporte.entrada || '',
            reporte.salida || '',
            reporte.tiempoTrabajado || '',
            reporte.estado,
            reporte.observaciones || ''
        ]);

        // Generar CSV
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => 
                row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `reportes_${this.currentUser.numeroCuenta}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(
                'Exportación exitosa', 
                'Los reportes se han exportado correctamente', 
                'success',
                'bi-download'
            );
        }
    }

    logout() {
        // Limpiar datos
        this.currentUser = null;
        this.reportes = [];
        this.filteredReportes = [];
        localStorage.removeItem('reportes_user');

        // Resetear formulario
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const authBtn = document.getElementById('authBtn');
        if (numeroCuentaInput) {
            numeroCuentaInput.value = '';
        }
        if (authBtn) {
            authBtn.disabled = true;
            authBtn.classList.add('disabled');
        }

        // Limpiar estadísticas
        this.clearStats();

        // Limpiar tabla
        const reportsTableBody = document.getElementById('reportsTableBody');
        if (reportsTableBody) {
            reportsTableBody.innerHTML = '';
        }

        // Resetear filtros
        const mesFilter = document.getElementById('mesFilter');
        const estadoFilter = document.getElementById('estadoFilter');
        if (mesFilter) mesFilter.value = '';
        if (estadoFilter) estadoFilter.value = '';

        // Mostrar sección de auth con animación
        const authSection = document.getElementById('authSection');
        const reportsSection = document.getElementById('reportsSection');
        
        if (reportsSection && authSection) {
            // Animar salida de reports
            reportsSection.style.transition = 'all 0.3s ease';
            reportsSection.style.opacity = '0';
            reportsSection.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                reportsSection.style.display = 'none';
                authSection.style.display = 'flex';
                authSection.style.opacity = '0';
                authSection.style.transform = 'translateY(20px)';
                
                // Animar entrada de auth
                setTimeout(() => {
                    authSection.style.transition = 'all 0.3s ease';
                    authSection.style.opacity = '1';
                    authSection.style.transform = 'translateY(0)';
                    
                    // Enfocar el input después de la animación
                    setTimeout(() => {
                        if (numeroCuentaInput) {
                            numeroCuentaInput.focus();
                        }
                    }, 350);
                }, 50);
            }, 300);
        }

        this.showNotification('Sesión cerrada', 'Has cerrado sesión correctamente. Ingresa otro número de cuenta.', 'info', 'bi-box-arrow-right');
    }

    clearStats() {
        // Limpiar todas las estadísticas
        const horasTrabajadasEl = document.getElementById('horasTrabajadas');
        const progresoPorcentajeEl = document.getElementById('progresoPorcentaje');
        const diasTrabajadosEl = document.getElementById('diasTrabajados');
        const progressCircle = document.getElementById('progressCircle');
        const totalReportesEl = document.getElementById('totalReportes');

        if (horasTrabajadasEl) horasTrabajadasEl.textContent = '0h';
        if (progresoPorcentajeEl) progresoPorcentajeEl.textContent = '0%';
        if (diasTrabajadosEl) diasTrabajadosEl.textContent = '0';
        if (totalReportesEl) totalReportesEl.textContent = '0';
        
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = '157'; // Círculo vacío
        }
    }

    showNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        // Usar el sistema de notificaciones de navigation.js si está disponible
        if (window.modernNav && typeof window.modernNav.showModernNotification === 'function') {
            window.modernNav.showModernNotification(title, message, type, icon);
        } else {
            // Fallback a console
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // Método para establecer mes actual por defecto
    setCurrentMonth() {
        const mesFilter = document.getElementById('mesFilter');
        if (mesFilter) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
            mesFilter.value = currentMonth;
        }
    }

    // Método para estadísticas avanzadas
    getAdvancedStats() {
        const presenteDays = this.reportes.filter(r => r.estado === 'presente').length;
        const ausenteDays = this.reportes.filter(r => r.estado === 'ausente').length;
        const tardanzaDays = this.reportes.filter(r => r.estado === 'tardanza').length;
        
        const horasPromedioPorDia = this.reportes.length > 0 
            ? this.calcularHorasTotales() / presenteDays
            : 0;

        return {
            presenteDays,
            ausenteDays,
            tardanzaDays,
            horasPromedioPorDia: Math.round(horasPromedioPorDia * 100) / 100,
            totalDays: this.reportes.length,
            asistenciaRate: Math.round((presenteDays / this.reportes.length) * 100)
        };
    }
}

// Utilidades adicionales
class ReportesUtils {
    static parseDate(dateStr) {
        // Parsear fecha en formato "YYYY-MM-DD" correctamente
        // Evita problemas de zona horaria usando Date constructor con parámetros separados
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    static formatDate(dateStr) {
        const date = this.parseDate(dateStr);
        if (!date) return 'Fecha inválida';
        
        return date.toLocaleDateString('es-MX', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    static formatTime(timeStr) {
        if (!timeStr) return '--:--';
        
        // Asegurar formato HH:MM
        const [hours, minutes] = timeStr.split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }

    static calculateTimeDifference(entrada, salida) {
        if (!entrada || !salida) return null;
        
        const [entradaHours, entradaMinutes] = entrada.split(':').map(Number);
        const [salidaHours, salidaMinutes] = salida.split(':').map(Number);
        
        const entradaTotal = entradaHours * 60 + entradaMinutes;
        const salidaTotal = salidaHours * 60 + salidaMinutes;
        
        const diferencia = salidaTotal - entradaTotal;
        const hours = Math.floor(diferencia / 60);
        const minutes = diferencia % 60;
        
        return `${hours}h ${minutes}m`;
    }

    static exportToPDF(reportes, userInfo) {
        // Esta función requeriría una librería como jsPDF
        console.warn('Exportación a PDF no implementada. Usar CSV por ahora.');
    }

    static validateReportData(reporte) {
        const required = ['fecha', 'numeroCuenta', 'nombreAsesor'];
        const missing = required.filter(field => !reporte[field]);
        
        if (missing.length > 0) {
            throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
        }
        
        return true;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo
    if (typeof firebase !== 'undefined') {
        window.reportesManager = new ReportesManager();
        console.log('🚀 Sistema de Reportes inicializado');
    } else {
        console.error('❌ Firebase no disponible');
        
        // Retry después de un momento
        setTimeout(() => {
            if (typeof firebase !== 'undefined') {
                window.reportesManager = new ReportesManager();
                console.log('🚀 Sistema de Reportes inicializado (retry)');
            } else {
                alert('Error: No se pudo conectar con la base de datos. Por favor, recarga la página.');
            }
        }, 2000);
    }
});

// Cleanup al cerrar la página
window.addEventListener('beforeunload', () => {
    if (window.reportesManager) {
        console.log('🧹 Limpiando recursos del sistema de reportes');
    }
});

// Exportar para uso global
window.ReportesManager = ReportesManager;
window.ReportesUtils = ReportesUtils;

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    // Ctrl+R para refresh (si no es F5)
    if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        if (window.reportesManager && window.reportesManager.currentUser) {
            window.reportesManager.loadReportes();
        }
    }
    
    // Ctrl+E para export
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (window.reportesManager && window.reportesManager.currentUser) {
            window.reportesManager.exportReportes();
        }
    }
    
    // Escape para logout
    if (e.key === 'Escape' && window.reportesManager && window.reportesManager.currentUser) {
        const confirmLogout = confirm('¿Deseas cerrar sesión?');
        if (confirmLogout) {
            window.reportesManager.logout();
        }
    }
});

// Configuración para modo desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Modo desarrollo activado para Reportes');
    
    // Funciones de debug
    window.debugReportes = {
        showCurrentUser: () => {
            console.log('Usuario actual:', window.reportesManager?.currentUser);
        },
        showReportes: () => {
            console.log('Reportes cargados:', window.reportesManager?.reportes);
        },
        testNotification: () => {
            window.reportesManager?.showNotification('Test', 'Notificación de prueba', 'info');
        }
    };
}