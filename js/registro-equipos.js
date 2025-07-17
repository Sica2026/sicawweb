/* ==========================================
   REGISTRO DE EQUIPOS - JAVASCRIPT
   ========================================== */

/**
 * Configuración de laboratorios
 */
const LAB_CONFIGS = {
    'sica1': {
        title: 'SICA 1 - Laboratorio Principal',
        subtitle: 'Sistema de registro para equipos de cómputo',
        icon: 'bi-cpu',
        maxElements: 61,
        description: 'Laboratorio principal con 61 estaciones de trabajo'
    },
    'sica2': {
        title: 'SICA 2 - Laboratorio Avanzado',
        subtitle: 'Equipos especializados para proyectos avanzados',
        icon: 'bi-pc-display',
        maxElements: 102,
        description: 'Laboratorio avanzado con 102 estaciones especializadas'
    },
    'sica4': {
        title: 'SICA 4 - Laboratorio Básico',
        subtitle: 'Equipos para cursos introductorios',
        icon: 'bi-laptop',
        maxElements: 35,
        description: 'Laboratorio básico con 35 estaciones de trabajo'
    },
    'salon-inteligente-1': {
        title: 'Salón Inteligente 1',
        subtitle: 'Tecnología interactiva para aprendizaje colaborativo',
        icon: 'bi-display',
        maxElements: 35,
        description: 'Salón con tecnología inteligente y 35 dispositivos'
    }
};

/**
 * Clase principal
 */
class EquipmentRegistrationSystem {
    constructor() {
        this.currentLab = null;
        this.selectedElement = null;
        this.equipmentStatus = new Map();
        this.registrationForm = null;
        this.periodicTable = null;
        this.equipmentInfoPanel = null;

        this.init();
    }

    async init() {
        try {
            this.currentLab = this.detectCurrentLab();
            this.initializeDOM();
            this.setupLab();
            this.generatePeriodicTable();
            this.setupForm();
            this.setupEventListeners();
            await this.loadEquipmentStatus();
            this.updateStats();

            console.log(`🧪 Sistema de registro inicializado para ${this.currentLab}`);
        } catch (error) {
            console.error('Error inicializando sistema:', error);
            this.handleError('Error al inicializar el sistema');
        }
    }

    detectCurrentLab() {
        const urlParams = new URLSearchParams(window.location.search);
        const labFromUrl = urlParams.get('lab');
        const labFromStorage = localStorage.getItem('sica-current-lab');
        const hash = window.location.hash.replace('#', '');
        return labFromUrl || labFromStorage || hash || 'sica1';
    }

    initializeDOM() {
        this.registrationForm = document.getElementById('registrationForm');
        this.periodicTable = document.getElementById('periodicTable');
        this.equipmentInfoPanel = document.getElementById('equipmentInfoPanel');

        if (!this.periodicTable) {
            throw new Error('Tabla periódica no encontrada');
        }
    }

    setupLab() {
        let config = LAB_CONFIGS[this.currentLab];
        if (!config) {
            console.warn(`Configuración no encontrada para ${this.currentLab}, usando SICA 1`);
            this.currentLab = 'sica1';
            config = LAB_CONFIGS['sica1'];
        }

        this.updateLabUI(config);
        localStorage.setItem('sica-current-lab', this.currentLab);
    }

    updateLabUI(config) {
        const titleElement = document.getElementById('labTitle');
        if (titleElement) titleElement.textContent = config.title;

        const subtitleElement = document.getElementById('labSubtitle');
        if (subtitleElement) subtitleElement.textContent = config.subtitle;

        const iconElement = document.getElementById('labIcon');
        if (iconElement) iconElement.className = `bi ${config.icon}`;

        document.title = `${config.title} - SICA`;
    }

    generatePeriodicTable() {
        const config = LAB_CONFIGS[this.currentLab];
        const maxElements = config.maxElements;
        this.periodicTable.innerHTML = '';

        for (let i = 1; i <= maxElements; i++) {
            const element = {
                number: i,
                symbol: `E${i}`,
                name: `Equipo ${i}`
            };

            const elementDiv = this.createElement(element, i);
            this.periodicTable.appendChild(elementDiv);
            elementDiv.style.animationDelay = `${i * 0.05}s`;
        }

        console.log(`📊 Tabla periódica generada con ${maxElements} elementos`);
    }

    createElement(element, index) {
        const div = document.createElement('div');
        div.className = 'element';
        div.dataset.elementNumber = element.number;
        div.dataset.elementSymbol = element.symbol;
        div.dataset.elementName = element.name;
        div.tabIndex = 0;

        const status = this.getRandomStatus();
        div.classList.add(status);

        this.equipmentStatus.set(element.number, {
            status,
            lastUsed: this.getRandomLastUsed(),
            user: status === 'occupied' ? this.getRandomUser() : null
        });

        div.innerHTML = `
            <div class="element-number">${element.number}</div>
            <div class="element-symbol">${element.symbol}</div>
            <div class="element-name">${element.name}</div>
        `;

        div.addEventListener('click', () => this.selectElement(element, div));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectElement(element, div);
            }
        });

        return div;
    }

    getRandomStatus() {
        const rand = Math.random();
        if (rand < 0.7) return 'available';
        if (rand < 0.9) return 'occupied';
        return 'maintenance';
    }

    getRandomLastUsed() {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date(now.getTime() - daysAgo * 86400000);
        return date.toLocaleDateString('es-MX');
    }

    getRandomUser() {
        const users = ['318123456', '318234567', '318345678', '318456789', '318567890'];
        return users[Math.floor(Math.random() * users.length)];
    }

    selectElement(element, elementDiv) {
        const status = this.equipmentStatus.get(element.number);
        if (status.status !== 'available') {
            this.showElementInfo(element, elementDiv);
            const message = status.status === 'occupied'
                ? `El equipo ${element.symbol} está ocupado por el usuario ${status.user}`
                : `El equipo ${element.symbol} está en mantenimiento`;

            if (window.SICA?.notify) {
                window.SICA.notify('Equipo No Disponible', message, 'warning', 'bi-exclamation-triangle');
            }
            return;
        }

        this.clearSelection();
        this.selectedElement = element;
        elementDiv.classList.add('selected');
        this.updateFormWithSelection(element);
        this.showElementInfo(element, elementDiv);

        if (window.SICA?.notify) {
            window.SICA.notify('Equipo Seleccionado', `Has seleccionado el equipo ${element.symbol} (${element.name})`, 'success', 'bi-check-circle');
        }

        console.log(`✅ Elemento seleccionado: ${element.symbol} (${element.name})`);
    }

    clearSelection() {
        document.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'));
        this.selectedElement = null;
        this.hideElementInfo();
        this.clearFormSelection();
    }

    updateFormWithSelection(element) {
        const selectedEquipmentInput = document.getElementById('selectedEquipment');
        const registerBtn = document.getElementById('registerBtn');
        if (selectedEquipmentInput) selectedEquipmentInput.value = `${element.symbol} - ${element.name} (Equipo ${element.number})`;
        if (registerBtn) registerBtn.disabled = false;
    }

    clearFormSelection() {
        const selectedEquipmentInput = document.getElementById('selectedEquipment');
        const registerBtn = document.getElementById('registerBtn');
        if (selectedEquipmentInput) selectedEquipmentInput.value = '';
        if (registerBtn) registerBtn.disabled = true;
    }

    showElementInfo(element, elementDiv) {
        if (!this.equipmentInfoPanel) return;

        const status = this.equipmentStatus.get(element.number);
        document.getElementById('elementName').textContent = element.name;
        document.getElementById('elementSymbol').textContent = element.symbol;
        document.getElementById('elementNumber').textContent = element.number;

        const statusElement = document.getElementById('equipmentStatus');
        if (statusElement) {
            const statusText = {
                'available': 'Disponible',
                'occupied': 'Ocupado',
                'maintenance': 'Mantenimiento'
            };
            statusElement.textContent = statusText[status.status];
            statusElement.className = `status-badge status-${status.status}`;
        }

        document.getElementById('lastUsed').textContent = status.lastUsed;

        const selectBtn = document.getElementById('selectEquipmentBtn');
        if (selectBtn) {
            if (status.status === 'available') {
                selectBtn.style.display = 'block';
                selectBtn.onclick = () => {
                    this.selectElement(element, elementDiv);
                    this.hideElementInfo();
                };
            } else {
                selectBtn.style.display = 'none';
            }
        }

        this.equipmentInfoPanel.classList.add('show');
    }

    hideElementInfo() {
        if (this.equipmentInfoPanel) {
            this.equipmentInfoPanel.classList.remove('show');
        }
    }

    setupForm() {
        if (!this.registrationForm) return;

        const studentIdInput = document.getElementById('studentId');
        const studentIdFeedback = document.getElementById('studentIdFeedback');

        if (studentIdInput) {
            studentIdInput.addEventListener('input', (e) => {
                this.validateStudentId(e.target.value, studentIdFeedback);
            });

            studentIdInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        this.registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
    }

    validateStudentId(value, feedbackElement) {
        const isValid = /^\d{9}$/.test(value);
        const studentIdInput = document.getElementById('studentId');

        if (!value) {
            feedbackElement.textContent = '';
            feedbackElement.className = 'input-feedback';
            studentIdInput.classList.remove('is-valid', 'is-invalid');
            return false;
        }

        if (isValid) {
            feedbackElement.textContent = '✓ Número de cuenta válido';
            feedbackElement.className = 'input-feedback success';
            studentIdInput.classList.remove('is-invalid');
            studentIdInput.classList.add('is-valid');
            return true;
        } else {
            feedbackElement.textContent = value.length < 9
                ? `Faltan ${9 - value.length} dígitos`
                : 'El número debe tener exactamente 9 dígitos';
            feedbackElement.className = 'input-feedback error';
            studentIdInput.classList.remove('is-valid');
            studentIdInput.classList.add('is-invalid');
            return false;
        }
    }

    async handleFormSubmit() {
        const studentId = document.getElementById('studentId').value;
        const registerBtn = document.getElementById('registerBtn');

        if (!this.validateStudentId(studentId, document.getElementById('studentIdFeedback'))) {
            this.showError('Por favor, ingresa un número de cuenta válido');
            return;
        }

        if (!this.selectedElement) {
            this.showError('Por favor, selecciona un equipo');
            return;
        }

        try {
            this.setLoadingState(registerBtn, true);
            await this.processRegistration(studentId, this.selectedElement);

            this.equipmentStatus.set(this.selectedElement.number, {
                status: 'occupied',
                lastUsed: new Date().toLocaleDateString('es-MX'),
                user: studentId
            });

            this.updateElementUI(this.selectedElement.number, 'occupied');
            this.updateStats();
            this.showSuccessModal(studentId, this.selectedElement);
            this.resetForm();
        } catch (error) {
            console.error('Error en registro:', error);
            this.showError('Error al procesar el registro. Inténtalo de nuevo.');
        } finally {
            this.setLoadingState(registerBtn, false);
        }
    }

    async processRegistration(studentId, element) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    resolve();
                } else {
                    reject(new Error('Error del servidor'));
                }
            }, 2000);
        });
    }

    updateElementUI(number, status) {
        const div = document.querySelector(`[data-element-number="${number}"]`);
        if (div) {
            div.classList.remove('available', 'occupied', 'maintenance', 'selected');
            div.classList.add(status);
        }
    }

    showSuccessModal(studentId, element) {
        document.getElementById('confirmedEquipment').textContent = `${element.symbol} - ${element.name}`;
        document.getElementById('confirmedAccount').textContent = studentId;
        document.getElementById('confirmedTime').textContent = new Date().toLocaleTimeString('es-MX');

        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
    }

    resetForm() {
        this.registrationForm.reset();
        this.clearSelection();
        this.registrationForm.querySelectorAll('.form-control').forEach(i => i.classList.remove('is-valid', 'is-invalid'));
        this.registrationForm.querySelectorAll('.input-feedback').forEach(fb => fb.textContent = '');
    }

    updateStats() {
        const config = LAB_CONFIGS[this.currentLab];
        const stats = { available: 0, occupied: 0, maintenance: 0 };

        this.equipmentStatus.forEach(status => stats[status.status]++);

        document.getElementById('totalEquipment').textContent = config.maxElements;
        document.getElementById('availableEquipment').textContent = stats.available;
        document.getElementById('occupiedEquipment').textContent = stats.occupied;
    }

    setLoadingState(button, loading) {
        button.disabled = loading;
        if (loading) {
            button.classList.add('loading');
        } else {
            button.classList.remove('loading');
        }
    }

    showError(message) {
        if (window.SICA?.notify) {
            window.SICA.notify('Error', message, 'error', 'bi-exclamation-triangle');
        }
    }

    async loadEquipmentStatus() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    setupEventListeners() {
        document.getElementById('closePanelBtn')?.addEventListener('click', () => this.hideElementInfo());
        document.getElementById('newRegistrationBtn')?.addEventListener('click', () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
            modal.hide();
            document.getElementById('studentId').focus();
        });

        window.addEventListener('popstate', () => {
            const newLab = this.detectCurrentLab();
            if (newLab !== this.currentLab) location.reload();
        });
    }

    handleError(msg) {
        console.error(msg);
        this.showError(msg);
    }
}

/**
 * Inicialización global
 */
window.EquipmentSystem = {
    instance: null,
    changeLab: (labId) => {
        localStorage.setItem('sica-current-lab', labId);
        window.location.search = `?lab=${labId}`;
    },
    getStats: () => window.EquipmentSystem.instance?.getStats() || null
};

document.addEventListener('sicaReady', () => {
    window.EquipmentSystem.instance = new EquipmentRegistrationSystem();
});
