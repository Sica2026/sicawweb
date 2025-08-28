/**
 * FOLIO MANAGER - Sistema de Gestión de Folios SICA
 * Versión completa con modo claro/oscuro
 */

// Variable global única para evitar conflictos
let sicaFolioManager = null;

// Clase principal del sistema
class SICAFolioManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.configDocId = 'qkLlvrqIPsI7HEPKIhyh';
        this.currentConfig = null;
        this.folioHistory = [];
        this.currentFilter = 'all';
        this.currentTheme = localStorage.getItem('sica-folio-theme') || 'light';
        this.audioContext = null;
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('Inicializando Sistema de Folios SICA...');
            
            // Configurar tema
            this.setupTheme();
            
            // Esperar Firebase
            await this.waitForFirebase();
            
            // Configurar Firebase
            this.db = window.firebaseDB || firebase.firestore();
            this.auth = window.firebaseAuth || firebase.auth();
            
            // Verificar autenticación
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await this.startFolioManager(user);
                } else {
                    window.location.href = '../login.html';
                }
            });
            
        } catch (error) {
            console.error('Error inicializando sistema:', error);
            this.showNotification('Error al inicializar el sistema', 'error');
        }
    }

    setupTheme() {
        // Aplicar tema inicial
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Configurar toggle cuando esté disponible
        this.setupThemeToggle();
        
        // Reintentrar configuración del toggle cada 500ms hasta que esté disponible
        const toggleInterval = setInterval(() => {
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) {
                this.setupThemeToggle();
                clearInterval(toggleInterval);
            }
        }, 500);
        
        // Timeout después de 10 segundos
        setTimeout(() => {
            clearInterval(toggleInterval);
        }, 10000);
    }

    setupThemeToggle() {
        const toggle = document.getElementById('darkModeToggle');
        if (!toggle) return;
        
        const sunIcon = toggle.querySelector('.sun-icon');
        const moonIcon = toggle.querySelector('.moon-icon');
        const toggleText = toggle.querySelector('.toggle-text');
        
        // Verificar que todos los elementos existan antes de proceder
        if (!sunIcon || !moonIcon) return;
        
        this.updateThemeUI(sunIcon, moonIcon, toggleText);
        
        // Remover event listeners anteriores para evitar duplicados
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', () => this.toggleTheme());
    }

    updateThemeUI(sunIcon, moonIcon, toggleText) {
        // Verificar que los elementos existan
        if (!sunIcon || !moonIcon) return;
        
        if (this.currentTheme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            if (toggleText) toggleText.textContent = 'Modo Oscuro';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            if (toggleText) toggleText.textContent = 'Modo Claro';
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Actualizar UI del toggle si está disponible
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) {
            const sunIcon = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            const toggleText = toggle.querySelector('.toggle-text');
            
            if (sunIcon && moonIcon) {
                this.updateThemeUI(sunIcon, moonIcon, toggleText);
            }
        }
        
        localStorage.setItem('sica-folio-theme', this.currentTheme);
        
        const message = this.currentTheme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado';
        this.showNotification(message, 'info');
        this.playSound(this.currentTheme === 'dark' ? 400 : 600, 0.2);
    }

    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const checkFirebase = () => {
                attempts++;
                
                if (window.firebase && (window.firebaseDB || firebase.firestore)) {
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase no disponible'));
                    return;
                }
                
                setTimeout(checkFirebase, 200);
            };
            
            checkFirebase();
        });
    }

    async startFolioManager(user) {
        try {
            console.log('Usuario autenticado:', user.email);
            
            // Configurar página
            this.setupPageComponents();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Configurar audio
            this.setupAudio();
            
            // Cargar datos
            await this.loadConfiguration();
            await this.loadFolioHistory();
            
            this.showNotification('Sistema cargado correctamente', 'success');
            
        } catch (error) {
            console.error('Error configurando sistema:', error);
            this.showNotification('Error al configurar el sistema', 'error');
        }
    }

    setupPageComponents() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Gestión de Folios - Administración SICA');
        }
    }

    setupEventListeners() {
        // Formulario
        const form = document.getElementById('addFolioForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Refresh
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadFolioHistory());
        }

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Input de folio
        const folioInput = document.getElementById('folioNumber');
        if (folioInput) {
            folioInput.addEventListener('input', (e) => this.validateInput(e));
            folioInput.addEventListener('focus', () => this.showSuggestion());
            folioInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        }

        // Radio buttons
        document.querySelectorAll('input[name="folioType"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleTypeChange());
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio no soportado');
        }
    }

    playSound(frequency = 440, duration = 0.1) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.log('Error reproduciendo sonido');
        }
    }

    async loadConfiguration() {
        try {
            console.log('Cargando configuración...');
            
            const doc = await this.db.collection('configuracion').doc(this.configDocId).get();
            
            if (doc.exists) {
                this.currentConfig = doc.data();
                this.updateDisplayValues();
                console.log('Configuración cargada');
            } else {
                console.warn('Configuración no encontrada');
                this.showNotification('Configuración no encontrada', 'warning');
            }
            
        } catch (error) {
            console.error('Error cargando configuración:', error);
            this.showNotification('Error cargando configuración', 'error');
        }
    }

    updateDisplayValues() {
        // Actualizar valores actuales
        const currentAceptacion = document.getElementById('currentAceptacion');
        const currentTermino = document.getElementById('currentTermino');
        
        const aceptacionValue = this.currentConfig?.foliocartaaceptacion || 0;
        const terminoValue = this.currentConfig?.foliocartatermino || 0;
        
        if (currentAceptacion) currentAceptacion.textContent = aceptacionValue;
        if (currentTermino) currentTermino.textContent = terminoValue;
        
        // Actualizar sugerencias
        const suggestedAceptacion = document.getElementById('suggestedAceptacion');
        const suggestedTermino = document.getElementById('suggestedTermino');
        
        if (suggestedAceptacion) {
            suggestedAceptacion.textContent = `Siguiente: ${parseInt(aceptacionValue) + 1}`;
        }
        if (suggestedTermino) {
            suggestedTermino.textContent = `Siguiente: ${parseInt(terminoValue) + 1}`;
        }
        
        // Mostrar sugerencia activa
        this.showSuggestion();
    }

    showSuggestion() {
        const folioType = document.querySelector('input[name="folioType"]:checked')?.value;
        const suggestionContainer = document.getElementById('suggestionContainer');
        const suggestionValue = document.getElementById('suggestionValue');
        
        if (!folioType || !this.currentConfig || !suggestionContainer || !suggestionValue) {
            if (suggestionContainer) suggestionContainer.style.display = 'none';
            return;
        }
        
        const currentValue = folioType === 'aceptacion' 
            ? parseInt(this.currentConfig.foliocartaaceptacion || 0)
            : parseInt(this.currentConfig.foliocartatermino || 0);
        
        const nextValue = currentValue + 1;
        
        suggestionValue.textContent = nextValue;
        suggestionContainer.style.display = 'flex';
    }

    async loadFolioHistory() {
        try {
            console.log('Cargando historial...');
            this.showLoading(true);
            
            const doc = await this.db.collection('configuracion').doc(this.configDocId).get();
            
            if (doc.exists) {
                const data = doc.data();
                this.folioHistory = data.historialFolios || [];
                
                // Ordenar por fecha
                this.folioHistory.sort((a, b) => {
                    const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
                    const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
                    return dateB - dateA;
                });
                
                this.renderHistory();
                this.updateStats();
            }
            
        } catch (error) {
            console.error('Error cargando historial:', error);
            this.showNotification('Error cargando historial', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    renderHistory() {
        const container = document.getElementById('folioHistory');
        const emptyState = document.getElementById('emptyHistory');
        
        if (!container) return;
        
        const filteredHistory = this.currentFilter === 'all' 
            ? this.folioHistory 
            : this.folioHistory.filter(item => item.tipo === this.currentFilter);
        
        if (filteredHistory.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        container.style.display = 'block';
        
        container.innerHTML = filteredHistory.map((record, index) => {
            const fecha = this.formatDate(record.fecha);
            const tipo = record.tipo || 'aceptacion';
            const tipoDisplay = tipo === 'aceptacion' ? 'Carta Aceptación' : 'Carta Término';
            const icon = tipo === 'aceptacion' ? 'bi-check-circle-fill' : 'bi-file-text-fill';
            
            return `
                <div class="history-item fade-in-up" style="animation-delay: ${index * 0.1}s">
                    <div class="history-icon ${tipo}">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div class="history-content">
                        <div class="history-title">
                            Folio #${record.folio} - ${tipoDisplay}
                        </div>
                        <div class="history-details">
                            <span class="detail-badge">
                                <i class="bi bi-calendar-event me-1"></i>
                                ${fecha}
                            </span>
                            <span class="detail-badge">
                                <i class="bi bi-person-fill me-1"></i>
                                ${record.agregadoPor || 'Sistema'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const totalEl = document.getElementById('totalFolios');
        const aceptacionEl = document.getElementById('totalAceptacion');
        const terminoEl = document.getElementById('totalTermino');
        
        const total = this.folioHistory.length;
        const aceptacion = this.folioHistory.filter(f => f.tipo === 'aceptacion').length;
        const termino = this.folioHistory.filter(f => f.tipo === 'termino').length;
        
        if (totalEl) this.animateValue(totalEl, 0, total, 1000);
        if (aceptacionEl) this.animateValue(aceptacionEl, 0, aceptacion, 800);
        if (terminoEl) this.animateValue(terminoEl, 0, termino, 800);
    }

    animateValue(element, start, end, duration) {
        if (!element || isNaN(end)) return;
        
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    handleFilterChange(e) {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentFilter = btn.dataset.filter;
        this.renderHistory();
        this.playSound(600, 0.1);
    }

    validateInput(e) {
        const input = e.target;
        const value = parseInt(input.value);
        const folioType = document.querySelector('input[name="folioType"]:checked')?.value;
        
        if (!value || !folioType || !this.currentConfig) return;
        
        const currentValue = folioType === 'aceptacion' 
            ? this.currentConfig.foliocartaaceptacion 
            : this.currentConfig.foliocartatermino;
        
        const inputIcon = document.querySelector('.input-icon');
        
        if (value <= currentValue) {
            input.classList.add('is-invalid');
            if (inputIcon) inputIcon.style.color = '#ef4444';
            this.showInputError(input, `El folio debe ser mayor a ${currentValue}`);
        } else {
            input.classList.remove('is-invalid');
            if (inputIcon) inputIcon.style.color = 'var(--unam-gold)';
            this.clearInputError(input);
        }
    }

    showInputError(input, message) {
        this.clearInputError(input);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        input.parentElement.parentElement.appendChild(errorDiv);
    }

    clearInputError(input) {
        const errorDiv = input.parentElement.parentElement.querySelector('.invalid-feedback');
        if (errorDiv) errorDiv.remove();
    }

    handleKeyPress(e) {
        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
            e.preventDefault();
            this.playSound(200, 0.1);
        }
    }

    handleTypeChange() {
        const folioInput = document.getElementById('folioNumber');
        if (folioInput && folioInput.value) {
            this.validateInput({ target: folioInput });
        }
        
        this.showSuggestion();
        this.playSound(500, 0.1);
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const folioNumber = parseInt(document.getElementById('folioNumber').value);
        const folioType = document.querySelector('input[name="folioType"]:checked')?.value;
        
        if (!folioNumber || !folioType) {
            this.showNotification('Completa todos los campos', 'warning');
            return;
        }
        
        const currentValue = folioType === 'aceptacion' 
            ? this.currentConfig?.foliocartaaceptacion 
            : this.currentConfig?.foliocartatermino;
        
        if (folioNumber <= currentValue) {
            this.showNotification(`El folio debe ser mayor a ${currentValue}`, 'error');
            return;
        }
        
        try {
            await this.saveFolio(folioNumber, folioType);
        } catch (error) {
            console.error('Error guardando folio:', error);
            this.showNotification('Error al guardar el folio', 'error');
        }
    }

    async saveFolio(folioNumber, folioType) {
        try {
            console.log(`Guardando folio ${folioNumber} tipo ${folioType}...`);
            
            // Mostrar loading en botón
            const submitBtn = document.querySelector('#addFolioForm button[type="submit"]');
            const originalContent = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spin me-2"></i>Guardando...';
            submitBtn.disabled = true;
            
            // Preparar datos
            const updateData = {};
            const fieldName = folioType === 'aceptacion' ? 'foliocartaaceptacion' : 'foliocartatermino';
            updateData[fieldName] = folioNumber;
            
            // Crear registro de historial
            const historyRecord = {
                folio: folioNumber,
                tipo: folioType,
                fecha: firebase.firestore.Timestamp.now(),
                agregadoPor: this.auth.currentUser?.email || 'Sistema'
            };
            
            // Actualizar historial
            const currentHistory = this.currentConfig?.historialFolios || [];
            currentHistory.unshift(historyRecord);
            updateData.historialFolios = currentHistory;
            
            // Guardar en Firestore
            await this.db.collection('configuracion').doc(this.configDocId).update(updateData);
            
            // Actualizar configuración local
            this.currentConfig = { ...this.currentConfig, ...updateData };
            
            // Actualizar UI
            this.updateDisplayValues();
            this.folioHistory = currentHistory;
            this.renderHistory();
            this.updateStats();
            
            // Limpiar formulario
            document.getElementById('addFolioForm').reset();
            document.querySelector('input[name="folioType"][value="aceptacion"]').checked = true;
            this.showSuggestion();
            
            // Restaurar botón
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
            
            // Feedback
            this.playSound(800, 0.3);
            const tipoTexto = folioType === 'aceptacion' ? 'Carta de Aceptación' : 'Carta de Término';
            this.showNotification(`Folio ${folioNumber} agregado para ${tipoTexto}`, 'success');
            
            console.log('Folio guardado correctamente');
            
        } catch (error) {
            // Restaurar botón en caso de error
            const submitBtn = document.querySelector('#addFolioForm button[type="submit"]');
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Agregar Folio';
            submitBtn.disabled = false;
            
            throw error;
        }
    }

    handleKeyboard(e) {
        // Alt + D: Toggle tema
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }
        
        // Alt + A: Focus input
        if (e.altKey && e.key === 'a') {
            e.preventDefault();
            document.getElementById('folioNumber')?.focus();
            this.playSound(600, 0.1);
        }
        
        // Alt + 1: Aceptación
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            const radio = document.getElementById('cartaAceptacion');
            if (radio) {
                radio.checked = true;
                this.handleTypeChange();
            }
        }
        
        // Alt + 2: Término
        if (e.altKey && e.key === '2') {
            e.preventDefault();
            const radio = document.getElementById('cartaTermino');
            if (radio) {
                radio.checked = true;
                this.handleTypeChange();
            }
        }
        
        // F5: Refresh
        if (e.key === 'F5' && !e.ctrlKey) {
            e.preventDefault();
            this.loadFolioHistory();
            this.playSound(500, 0.2);
        }
        
        // Escape: Reset form
        if (e.key === 'Escape') {
            document.getElementById('addFolioForm').reset();
            document.querySelector('input[name="folioType"][value="aceptacion"]').checked = true;
            this.showSuggestion();
            this.playSound(400, 0.1);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('historyLoading');
        const content = document.getElementById('folioHistory');
        const empty = document.getElementById('emptyHistory');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
            if (empty) empty.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Fecha no disponible';
        
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            'success': 'bi-check-circle-fill',
            'error': 'bi-exclamation-triangle-fill',
            'warning': 'bi-exclamation-circle-fill',
            'info': 'bi-info-circle-fill'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 1.2rem;">
                    <i class="bi ${icons[type]}"></i>
                </div>
                <div style="flex: 1; font-weight: 500;">
                    ${message}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: var(--text-primary); 
                               font-size: 1.1rem; cursor: pointer; opacity: 0.7; 
                               padding: 0; line-height: 1;">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        console.log('Sistema de folios destruido');
    }
}

// Función global para aplicar sugerencia
function applySuggestion() {
    const suggestionValue = document.getElementById('suggestionValue');
    const folioInput = document.getElementById('folioNumber');
    
    if (suggestionValue && folioInput && sicaFolioManager) {
        folioInput.value = suggestionValue.textContent;
        folioInput.focus();
        
        const event = new Event('input', { bubbles: true });
        folioInput.dispatchEvent(event);
        
        sicaFolioManager.playSound(700, 0.2);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado - Iniciando SICA Folio Manager...');
    
    // Crear instancia única
    sicaFolioManager = new SICAFolioManager();
    
    // Agregar estilos adicionales
    const styles = document.createElement('style');
    styles.textContent = `
        .spin {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .suggestion-value:hover {
            background: var(--unam-gold);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        @media (prefers-reduced-motion: reduce) {
            .notification,
            .fade-in-up,
            .spin {
                animation: none !important;
            }
        }
    `;
    document.head.appendChild(styles);
});

// Cleanup al cerrar página
window.addEventListener('beforeunload', () => {
    if (sicaFolioManager) {
        sicaFolioManager.destroy();
    }
});

// Exportar para uso externo si es necesario
window.sicaFolioManager = sicaFolioManager;