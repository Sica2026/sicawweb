// servicio-social-main.js
// Archivo principal para inicialización del sistema

class ServicioSocialManager {
    constructor() {
        this.core = null;
        this.dataManager = null;
        this.uiManager = null;
        this.searchFilterManager = null;
        this.fileManager = null;
        this.assignmentModal = null;
        this.detailModal = null;
        this.eventManager = null;
        this.initialized = false;
    }

    async init() {
        try {
            console.log('Inicializando ServicioSocialManager...');
            
            // Verificar que las dependencias estén cargadas
            this.checkDependencies();
            
            // Inicializar core
            this.core = new ServicioSocialCore();
            await this.core.init();
            
            // Inicializar managers
            this.dataManager = new DataManager(this.core);
            this.uiManager = new UIManager(this.core);
            this.fileManager = new FileManager(this.core);
            
            // Inicializar modales
            this.assignmentModal = new AssignmentModal(this.core, this.dataManager, this.uiManager);
            this.detailModal = new DetailModal(this.core, this.dataManager, this.fileManager);
            
            // Inicializar búsqueda y filtros
            this.searchFilterManager = new SearchFilterManager(this.core, this.uiManager);
            
            // Inicializar eventos globales
            this.eventManager = new EventManager(this.uiManager);
            
            // Establecer referencias globales
            this.setupGlobalReferences();
            
            // Cargar datos
            await this.dataManager.loadData();
            
            // Renderizar UI inicial
            this.uiManager.renderAsesores();
            this.uiManager.updateStats();
            
            // Configurar animaciones
            setupScrollAnimations();
            
            this.initialized = true;
            console.log('ServicioSocialManager inicializado correctamente');
            
        } catch (error) {
            console.error('Error inicializando ServicioSocialManager:', error);
            this.showError(error);
        }
    }

    checkDependencies() {
        const requiredClasses = [
            'ServicioSocialCore',
            'DataManager', 
            'UIManager',
            'SearchFilterManager',
            'FileManager',
            'AssignmentModal',
            'DetailModal',
            'EventManager'
        ];

        const missingDependencies = requiredClasses.filter(className => !window[className]);
        
        if (missingDependencies.length > 0) {
            throw new Error(`Dependencias faltantes: ${missingDependencies.join(', ')}`);
        }
    }

    setupGlobalReferences() {
        // Referencias globales para acceso desde otros módulos
        window.servicioSocialCore = this.core;
        window.dataManager = this.dataManager;
        window.uiManager = this.uiManager;
        window.fileManager = this.fileManager;
        window.assignmentModal = this.assignmentModal;
        window.detailModal = this.detailModal;
        window.eventManager = this.eventManager;
    }

    showError(error) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="alert alert-danger text-center mt-5">
                        <div class="mb-3">
                            <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
                        </div>
                        <h4><strong>Error de Inicialización</strong></h4>
                        <p>${error.message || 'Error desconocido al inicializar el sistema'}</p>
                        <div class="mt-4">
                            <button class="btn btn-outline-danger me-2" onclick="location.reload()">
                                <i class="bi bi-arrow-clockwise me-1"></i>Recargar Página
                            </button>
                            <a href="../admin/" class="btn btn-secondary">
                                <i class="bi bi-house me-1"></i>Volver al Inicio
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Métodos de conveniencia para acceso externo
    getAsesores() {
        return this.core?.asesores || [];
    }

    getCurrentAsesor() {
        return this.core?.currentAsesor || null;
    }

    showNotification(title, message, type) {
        this.core?.showNotification(title, message, type);
    }
}

// Funciones de debug para desarrollo
window.debugSS = {
    manager: () => window.servicioSocialManager,
    core: () => window.servicioSocialCore,
    asesores: () => window.servicioSocialCore?.asesores || [],
    filteredAsesores: () => window.servicioSocialCore?.filteredAsesores || [],
    counts: () => window.servicioSocialCore?.categoryCounts || {},
    currentAsesor: () => window.servicioSocialCore?.currentAsesor || null,
    exportData: () => exportData(),
    testNotification: (type = 'info') => {
        if (window.servicioSocialCore) {
            window.servicioSocialCore.showNotification(
                'Notificación de Prueba',
                `Esta es una notificación de tipo ${type}`,
                type
            );
        }
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando página de Servicio Social...');
    
    // Verificar que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            // Inicializar el sistema
            window.servicioSocialManager = new ServicioSocialManager();
            window.servicioSocialManager.init();
        }
    }, 100);
    
    // Timeout de seguridad
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.servicioSocialManager) {
            console.error('No se pudo inicializar el sistema');
            
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container">
                        <div class="alert alert-danger text-center mt-5">
                            <div class="mb-3">
                                <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
                            </div>
                            <h4><strong>Error de Conexión</strong></h4>
                            <p>No se pudo conectar con Firebase. Verifique su conexión y configuración.</p>
                            <div class="mt-4">
                                <button class="btn btn-outline-danger me-2" onclick="location.reload()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>Recargar Página
                                </button>
                                <a href="../admin/" class="btn btn-secondary">
                                    <i class="bi bi-house me-1"></i>Volver al Inicio
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }, 10000);
});

// Exportar para uso global
window.ServicioSocialManager = ServicioSocialManager;