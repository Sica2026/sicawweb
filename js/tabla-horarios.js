// tabla-horarios.js

class TablaHorariosManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        
        // Current filters
        this.currentTipoHorario = '';
        this.currentSala = 'SICA-1';
        
        // Data cache
        this.horariosData = [];
        this.tableMatrix = {};
        
        // Time slots (7:00 AM to 9:00 PM in 30-minute intervals)
        this.timeSlots = this.generateTimeSlots();
        this.days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando TablaHorariosManager...');
            
            // Configurar página
            this.setupPage();
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Configurar Firebase
            this.setupFirebase();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Verificar si hay parámetros en la URL
            this.checkURLParameters();
            
            console.log('✅ TablaHorariosManager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando TablaHorariosManager:', error);
            this.showNotification('Error al cargar el sistema', 'error');
        }
    }

    checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const tipoParam = urlParams.get('tipo');
        
        if (tipoParam) {
            console.log('📋 Tipo de horario desde URL:', tipoParam);
            
            // Seleccionar el tipo automáticamente
            const selectElement = document.getElementById('tipoHorarioSelect');
            selectElement.value = tipoParam;
            this.currentTipoHorario = tipoParam;
            
            // Actualizar status y cargar datos
            this.updateStatusInfo();
            this.loadHorariosData();
            
            this.showNotification(`Cargando datos para ${tipoParam}`, 'info');
        }
    }

    setupPage() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Tabla de Horarios - Vista Administrativa');
        } else {
            document.title = 'Tabla de Horarios - Vista Administrativa';
        }
    }

    async checkAuthentication() {
        return new Promise((resolve, reject) => {
            const checkAuth = setInterval(() => {
                if (window.firebaseAuth) {
                    clearInterval(checkAuth);
                    
                    window.firebaseAuth.onAuthStateChanged((user) => {
                        if (!user) {
                            console.log('❌ Usuario no autenticado, redirigiendo...');
                            window.location.href = 'login.html';
                            return;
                        }
                        
                        this.currentUser = user;
                        console.log('✅ Usuario autenticado:', user.email);
                        resolve(user);
                    });
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkAuth);
                if (!window.firebaseAuth) {
                    reject(new Error('Firebase Auth no disponible'));
                }
            }, 10000);
        });
    }

    setupFirebase() {
        if (window.firebaseDB) this.db = window.firebaseDB;
        if (window.firebaseAuth) this.auth = window.firebaseAuth;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase no está completamente inicializado');
        }
        
        console.log('🔥 Firebase configurado correctamente');
    }

    setupEventListeners() {
        // Tipo de horario selector
        document.getElementById('tipoHorarioSelect').addEventListener('change', (e) => {
            this.currentTipoHorario = e.target.value;
            this.updateStatusInfo();
            if (this.currentTipoHorario) {
                this.loadHorariosData();
            } else {
                this.showEmptyState();
            }
        });
        
        // Sala selectors
        document.querySelectorAll('.sala-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectSala(option);
            });
        });
        
        console.log('🎧 Event listeners configurados');
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 7; hour <= 20; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                if (hour === 20 && minute === 30) break; // Stop at 20:30
                
                const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const endHour = minute === 30 ? hour + 1 : hour;
                const endMinute = minute === 30 ? 0 : 30;
                const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
                
                slots.push({
                    start: startTime,
                    end: endTime,
                    display: `${startTime}-${endTime}`
                });
            }
        }
        return slots;
    }

    selectSala(option) {
        // Remove previous selection
        document.querySelectorAll('.sala-option').forEach(opt => opt.classList.remove('active'));
        
        // Select current option
        option.classList.add('active');
        this.currentSala = option.getAttribute('data-sala');
        
        this.showNotification(`Sala seleccionada: ${this.currentSala}`, 'success');
        
        // Reload data if tipo is selected
        if (this.currentTipoHorario) {
            this.loadHorariosData();
        }
    }

    updateStatusInfo() {
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        if (this.currentTipoHorario) {
            const tipoNames = {
                'provisional-a': 'Provisional A',
                'provisional-b': 'Provisional B',
                'definitivo': 'Definitivo',
                'bloque-1': 'Bloque 1',
                'bloque-2': 'Bloque 2',
                'extraordinarios': 'Extraordinarios'
            };
            
            statusText.textContent = `Cargando ${tipoNames[this.currentTipoHorario]}...`;
            statusIndicator.classList.add('active');
        } else {
            statusText.textContent = 'Selecciona tipo de horario';
            statusIndicator.classList.remove('active');
        }
    }

    async loadHorariosData() {
        try {
            // Mostrar indicador de carga en lugar del modal
            this.showLoadingIndicator(true);
            
            console.log(`🔍 Cargando horarios: ${this.currentTipoHorario} - ${this.currentSala}`);
            
            const snapshot = await this.db.collection('horarios')
                .where('tipoBloque', '==', this.currentTipoHorario)
                .where('sala', '==', this.currentSala)
                .get();
            
            this.horariosData = [];
            snapshot.forEach(doc => {
                this.horariosData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`✅ ${this.horariosData.length} horarios cargados`);
            
            // Process data and create matrix
            this.processDataMatrix();
            
            // Render table
            this.renderTable();
            
            // Update statistics
            this.updateStatistics();
            
            // Update status
            const statusText = document.querySelector('.status-text');
            statusText.textContent = `${this.horariosData.length} horarios cargados`;
            
            // Ocultar indicador de carga
            this.showLoadingIndicator(false);
            
        } catch (error) {
            console.error('❌ Error cargando horarios:', error);
            this.showLoadingIndicator(false);
            this.showNotification('Error cargando datos', 'error');
        }
    }

    processDataMatrix() {
        // Initialize matrix
        this.tableMatrix = {};
        
        // Initialize all cells with 0
        this.timeSlots.forEach(slot => {
            this.tableMatrix[slot.display] = {};
            this.days.forEach(day => {
                this.tableMatrix[slot.display][day] = {
                    count: 0,
                    asesores: []
                };
            });
        });
        
        // Process each horario
        this.horariosData.forEach(horario => {
            const { dias, horaInicio, horaFinal, nombreHorario, numeroCuenta } = horario;
            
            // Find overlapping time slots
            const overlappingSlots = this.findOverlappingSlots(horaInicio, horaFinal);
            
            // Add asesor to each overlapping slot for each day
            overlappingSlots.forEach(slot => {
                dias.forEach(day => {
                    if (this.tableMatrix[slot] && this.tableMatrix[slot][day]) {
                        this.tableMatrix[slot][day].count++;
                        this.tableMatrix[slot][day].asesores.push({
                            nombre: nombreHorario,
                            numeroCuenta: numeroCuenta,
                            horaInicio: horaInicio,
                            horaFinal: horaFinal
                        });
                    }
                });
            });
        });
        
        console.log('📊 Matriz de datos procesada:', this.tableMatrix);
    }

    findOverlappingSlots(inicio, final) {
        const overlapping = [];
        
        this.timeSlots.forEach(slot => {
            // Check if time ranges overlap
            if (this.timeRangesOverlap(inicio, final, slot.start, slot.end)) {
                overlapping.push(slot.display);
            }
        });
        
        return overlapping;
    }

    timeRangesOverlap(start1, end1, start2, end2) {
        // Convert time strings to minutes for easier comparison
        const toMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };
        
        const s1 = toMinutes(start1);
        const e1 = toMinutes(end1);
        const s2 = toMinutes(start2);
        const e2 = toMinutes(end2);
        
        return s1 < e2 && s2 < e1;
    }

    renderTable() {
        const container = document.getElementById('tableContainer');
        
        if (!this.currentTipoHorario) {
            this.showEmptyState();
            return;
        }
        
        const dayNames = {
            lunes: 'Lunes',
            martes: 'Martes',
            miercoles: 'Miércoles',
            jueves: 'Jueves',
            viernes: 'Viernes'
        };
        
        const tableHTML = `
            <table class="horarios-table">
                <thead>
                    <tr>
                        <th class="time-header">Horario</th>
                        ${this.days.map(day => `<th>${dayNames[day]}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.timeSlots.map(slot => `
                        <tr>
                            <td class="time-cell">${this.formatTimeSlot(slot.display)}</td>
                            ${this.days.map(day => {
                                const cellData = this.tableMatrix[slot.display][day];
                                const colorClass = this.getColorClass(cellData.count);
                                const icon = this.getIconForCount(cellData.count);
                                
                                return `
                                    <td class="data-cell ${colorClass}" 
                                        data-slot="${slot.display}" 
                                        data-day="${day}"
                                        onclick="tablaManager.showAsesoresModal('${slot.display}', '${day}')">
                                        <div class="cell-content">
                                            <span class="cell-number">${cellData.count}</span>
                                            <i class="cell-icon ${icon}"></i>
                                        </div>
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        container.classList.add('fade-in');
        
        // Show statistics panel
        document.getElementById('statisticsPanel').style.display = 'block';
    }

    formatTimeSlot(slot) {
        const [start, end] = slot.split('-');
        return `${this.formatTime12Hour(start)}<br><small>${this.formatTime12Hour(end)}</small>`;
    }

    formatTime12Hour(time) {
        const [hours, minutes] = time.split(':');
        const hour24 = parseInt(hours);
        const isPM = hour24 >= 12;
        const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
        return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    }

    getColorClass(count) {
        if (count === 0 || count === 1) return 'rojo';
        if (count >= 2 && count <= 3) return 'amarillo';
        if (count === 4) return 'verde';
        if (count >= 5 && count <= 7) return 'naranja';
        return 'lila'; // 8+
    }

    getIconForCount(count) {
        if (count === 0) return 'bi-x-circle';
        if (count >= 1 && count <= 3) return 'bi-exclamation-circle';
        if (count === 4) return 'bi-check-circle';
        if (count >= 5 && count <= 7) return 'bi-info-circle';
        return 'bi-star'; // 8+
    }

    showEmptyState() {
        const container = document.getElementById('tableContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-table"></i>
                <h4>Selecciona un Tipo de Horario</h4>
                <p>Elige un tipo de horario para visualizar la distribución de asesores</p>
            </div>
        `;
        
        // Hide statistics panel
        document.getElementById('statisticsPanel').style.display = 'none';
    }

    showAsesoresModal(slot, day) {
        const cellData = this.tableMatrix[slot][day];
        
        if (cellData.count === 0) {
            this.showNotification('No hay asesores en este horario', 'info');
            return;
        }
        
        const dayNames = {
            lunes: 'Lunes',
            martes: 'Martes',
            miercoles: 'Miércoles',
            jueves: 'Jueves',
            viernes: 'Viernes'
        };
        
        try {
            // Asegurar que no hay modales previos
            this.closeAllModals();
            
            // Pequeño delay para asegurar que los modales anteriores se cierren
            setTimeout(() => {
                // Update modal title and info
                document.getElementById('modalTitle').textContent = 
                    `Asesores - ${dayNames[day]} ${this.formatTimeSlot(slot).replace('<br><small>', ' a ').replace('</small>', '')}`;
                
                const modalInfo = document.getElementById('modalInfo');
                modalInfo.innerHTML = `
                    <div class="info-item">
                        <span class="info-label">Día:</span>
                        <span class="info-value">${dayNames[day]}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Horario:</span>
                        <span class="info-value">${slot}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Sala:</span>
                        <span class="info-value">${this.currentSala}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Tipo:</span>
                        <span class="info-value">${this.currentTipoHorario}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Asesores:</span>
                        <span class="info-value">${cellData.count}</span>
                    </div>
                `;
                
                // Update asesores list
                const asesoresList = document.getElementById('asesoresList');
                asesoresList.innerHTML = cellData.asesores.map(asesor => `
                    <div class="asesor-item">
                        <div class="asesor-avatar">
                            ${this.getInitials(asesor.nombre)}
                        </div>
                        <div class="asesor-info">
                            <h6>${asesor.nombre}</h6>
                            <p>Cuenta: ${asesor.numeroCuenta || 'No especificada'}</p>
                            <small class="text-muted">Horario: ${asesor.horaInicio} - ${asesor.horaFinal}</small>
                        </div>
                    </div>
                `).join('');
                
                // Show modal con manejo de errores mejorado
                const modalElement = document.getElementById('asesoresModal');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement, {
                        backdrop: true,
                        keyboard: true
                    });
                    modal.show();
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ Error abriendo modal:', error);
            this.showNotification('Error al mostrar detalles', 'error');
        }
    }

    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    updateStatistics() {
        // Calculate statistics
        let totalAsesores = 0;
        let totalHoras = 0;
        let horariosCompletos = 0;
        let horariosVacios = 0;
        
        // Count unique asesores
        const uniqueAsesores = new Set();
        this.horariosData.forEach(horario => {
            uniqueAsesores.add(horario.nombreHorario);
            totalHoras += horario.horas * horario.dias.length;
        });
        totalAsesores = uniqueAsesores.size;
        
        // Count complete and empty time slots
        Object.values(this.tableMatrix).forEach(timeSlot => {
            Object.values(timeSlot).forEach(dayData => {
                if (dayData.count >= 4) horariosCompletos++;
                if (dayData.count === 0) horariosVacios++;
            });
        });
        
        // Update UI
        document.getElementById('totalAsesores').textContent = totalAsesores;
        document.getElementById('totalHoras').textContent = totalHoras.toFixed(1);
        document.getElementById('horariosCompletos').textContent = horariosCompletos;
        document.getElementById('horariosVacios').textContent = horariosVacios;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    showLoadingIndicator(show) {
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        const container = document.getElementById('tableContainer');
        
        if (show) {
            statusIndicator.classList.add('active');
            if (container && !this.horariosData.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="loading-spinner mb-3"></div>
                        <h4>Cargando datos...</h4>
                        <p>Procesando información de horarios</p>
                    </div>
                `;
            }
        } else {
            statusIndicator.classList.remove('active');
        }
    }

    closeAllModals() {
        // Cerrar todos los modales de Bootstrap activos
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modalElement => {
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
        
        // Remover backdrops que puedan quedar
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
    }

    showNotification(title, type = 'info', message = '') {
        if (window.modernNav && window.modernNav.showModernNotification) {
            const icons = {
                success: 'bi-check-circle-fill',
                error: 'bi-x-circle-fill',
                warning: 'bi-exclamation-triangle-fill',
                info: 'bi-info-circle-fill'
            };
            
            window.modernNav.showModernNotification(
                title,
                message,
                type,
                icons[type]
            );
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            window.tablaManager = new TablaHorariosManager();
            
            console.log('🚀 Sistema de tabla de horarios cargado');
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.tablaManager) {
            console.error('❌ No se pudo inicializar el sistema');
            
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container">
                        <div class="alert alert-danger text-center">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Error de Sistema</strong><br>
                            No se pudo conectar con la base de datos. Verifique su conexión.
                            <div class="mt-3">
                                <button class="btn btn-outline-danger" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Recargar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }, 10000);
});

// Handle global errors
window.addEventListener('error', (event) => {
    console.error('❌ Error global en tabla-horarios:', event.error);
    
    if (window.tablaManager) {
        window.tablaManager.showNotification(
            'Error del Sistema',
            'error',
            'Se produjo un error inesperado. Recargue la página si persiste.'
        );
    }
});

// Export for global use
window.TablaHorariosManager = TablaHorariosManager;