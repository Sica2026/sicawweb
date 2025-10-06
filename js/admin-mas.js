// admin-mas.js

class AdminMasManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        try {
            // Configurar página
            this.setupPage();
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Configurar Firebase
            this.setupFirebase();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Cargar estadísticas
            await this.loadQuickStats();
            
            console.log('✅ AdminMasManager inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando AdminMasManager:', error);
            this.showNotification('Error al cargar el sistema', 'error');
        }
    }

    setupPage() {
        // Configurar título
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Más Opciones - Panel Administrativo');
        } else {
            document.title = 'Más Opciones - Panel Administrativo';
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
            
            // Timeout de seguridad
            setTimeout(() => {
                clearInterval(checkAuth);
                if (!window.firebaseAuth) {
                    console.error('❌ Firebase Auth no disponible');
                    reject(new Error('Firebase Auth no disponible'));
                }
            }, 10000);
        });
    }

    setupFirebase() {
        if (window.firebaseDB) this.db = window.firebaseDB;
        if (window.firebaseAuth) this.auth = window.firebaseAuth;
        if (window.firebaseStorage) this.storage = window.firebaseStorage;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase no está completamente inicializado');
        }
        
        console.log('🔥 Firebase configurado correctamente');
    }

    setupEventListeners() {
        // Eventos para las tarjetas principales
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = card.getAttribute('data-action');
                this.handleMainAction(action, card);
            });
            
            // Agregar atributo tabindex para accesibilidad
            card.setAttribute('tabindex', '0');
            
            // Soporte para teclado
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const action = card.getAttribute('data-action');
                    this.handleMainAction(action, card);
                }
            });
        });

        // Eventos para acciones rápidas
        document.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = card.getAttribute('data-quick-action');
                this.handleQuickAction(action, card);
            });
            
            card.setAttribute('tabindex', '0');
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const action = card.getAttribute('data-quick-action');
                    this.handleQuickAction(action, card);
                }
            });
        });

        console.log('🎧 Event listeners configurados');
    }

    async navigateToDepartamentales() {
    this.showNotification(
        'Exámenes Departamentales',
        'Accediendo al sistema de evaluaciones...',
        'info',
        'bi-file-earmark-check'
    );
    
    setTimeout(() => {
        window.location.href = 'departamentales.html';
        console.log('📝 Navegando a exámenes departamentales...');
    }, 1000);
}

    async handleMainAction(action, card) {
        try {
            // Efecto visual en la tarjeta
            this.addClickEffect(card);
            
            // Mostrar modal de carga
            this.showLoadingModal(`Iniciando ${this.getActionDisplayName(action)}...`);
            
            console.log(`🎯 Acción principal: ${action}`);
            
            switch (action) {
                case 'reportes':
                    await this.navigateToReportes();
                    break;
                    
                case 'organigrama':
                    await this.navigateToOrganigrama();
                    break;
                    
                case 'horarios':
                    await this.navigateToHorarios();
                    break;
                    
                case 'servicio':
                    await this.navigateToServicioSocial();
                    break;

                case 'departamentales':
                    await this.navigateToDepartamentales();
                    break;
                    
                default:
                    console.warn(`❓ Acción no reconocida: ${action}`);
                    this.showNotification('Función en desarrollo', 'info');
            }
            
        } catch (error) {
            console.error(`❌ Error ejecutando acción ${action}:`, error);
            this.showNotification(`Error al ejecutar ${action}`, 'error');
        } finally {
            this.hideLoadingModal();
        }
    }

    async handleQuickAction(action, card) {
        try {
            this.addClickEffect(card);
            
            console.log(`⚡ Acción rápida: ${action}`);
            
            switch (action) {
                case 'materias':
                    await this.navigateToMaterias();
                    break;
                    
                case 'maestros':  // Cambiar de 'maintenance' a 'maestros'
                    await this.navigateToMaestros();  // Cambiar método
                    break;
                    
                case 'logs':
                    await this.viewSystemLogs();
                    break;
                    
                case 'settings':
                    await this.openSystemSettings();
                    break;
                    
                default:
                    this.showNotification('Función en desarrollo', 'info');
            }
            
        } catch (error) {
            console.error(`❌ Error en acción rápida ${action}:`, error);
            this.showNotification(`Error en ${action}`, 'error');
        }
    }

    // ========================================
    // NAVEGACIÓN A MÓDULOS PRINCIPALES
    // ========================================

    async navigateToReportes() {
        this.showNotification(
            'Módulo de Reportes',
            'Cargando sistema de reportes y estadísticas...',
            'info',
            'bi-bar-chart'
        );
        
        // Simular carga y navegar
        setTimeout(() => {
            // Aquí navegarías a la página de reportes
            // window.location.href = 'admin-reportes.html';
            console.log('📊 Navegando a reportes...');
            this.showNotification('Módulo en desarrollo', 'warning');
        }, 1500);
    }

    async navigateToOrganigrama() {
        this.showNotification(
            'Organigrama',
            'Cargando estructura organizacional...',
            'info',
            'bi-diagram-3'
        );
        
        setTimeout(() => {
        window.location.href = 'organigrama.html';
        console.log('🏢 Navegando a organigrama...');
        }, 1500);
    }

    async navigateToHorarios() {
        this.showNotification(
            'Gestión de Horarios',
            'Accediendo al sistema de horarios...',
            'success',
            'bi-calendar-week'
        );
        
        setTimeout(() => {
            // ✅ NAVEGACIÓN A LA PÁGINA DE HORARIOS
            window.location.href = 'horarios-asesores.html';
            console.log('📅 Navegando a gestión de horarios...');
        }, 1000);
    }

    async navigateToServicioSocial() {
        this.showNotification(
            'Servicio Social',
            'Cargando módulo de servicio social...',
            'info',
            'bi-heart'
        );
        
        setTimeout(() => {
            // window.location.href = 'admin-servicio-social.html';
            window.location.href = 'servicio-social.html';
            console.log('📅 Navegando a gestión servicio social...');
        }, 1000);
    }

    // ========================================
    // ACCIONES RÁPIDAS
    // ========================================

    async navigateToMaterias() {
        this.showNotification(
            'Gestión de Materias',
            'Accediendo al módulo de materias...',
            'info',
            'bi-book'
        );
        
        setTimeout(() => {
            // ✅ NAVEGACIÓN A LA PÁGINA DE MATERIAS
            window.location.href = 'gestion-materias.html';
            console.log('📚 Navegando a gestión de materias...');
        }, 1000);
    }

    async navigateToMaestros() {
        this.showNotification(
            'Gestión de Maestros',
            'Accediendo al módulo de profesores...',
            'info',
            'bi-person-badge'
        );
        
        setTimeout(() => {
            // ✅ NAVEGACIÓN A LA PÁGINA DE PROFESORES
            window.location.href = 'gestion-profesores.html';
            console.log('👨‍🏫 Navegando a gestión de profesores...');
        }, 1000);
    }

    async viewSystemLogs() {
        this.showNotification(
            'Logs del Sistema',
            'Cargando registros de actividad...',
            'info',
            'bi-journal-text'
        );
        
        // Aquí abrirías una modal o navegarías a una página de logs
        setTimeout(() => {
            console.log('📋 Mostrando logs del sistema...');
            this.showNotification('Visualizador de logs en desarrollo', 'info');
        }, 1500);
    }

    async openSystemSettings() {
        this.showNotification(
            'Configuración',
            'Abriendo configuración del sistema...',
            'info',
            'bi-gear'
        );
        
        setTimeout(() => {
            console.log('⚙️ Abriendo configuración...');
            this.showNotification('Panel de configuración en desarrollo', 'info');
        }, 1500);
    }

    // ========================================
    // ESTADÍSTICAS RÁPIDAS
    // ========================================

    async loadQuickStats() {
        try {
            console.log('📊 Cargando estadísticas rápidas...');
            
            // Cargar estadísticas en paralelo
            const [usuarios, horarios, reportes, servicioSocial] = await Promise.allSettled([
                this.loadUsuariosStats(),
                this.loadHorariosStats(),
                this.loadReportesStats(),
                this.loadServicioSocialStats()
            ]);
            
            // Actualizar UI con los resultados
            this.updateStatElement('totalUsuarios', usuarios.status === 'fulfilled' ? usuarios.value : '---');
            this.updateStatElement('horariosActivos', horarios.status === 'fulfilled' ? horarios.value : '---');
            this.updateStatElement('reportesGenerados', reportes.status === 'fulfilled' ? reportes.value : '---');
            this.updateStatElement('servicioSocial', servicioSocial.status === 'fulfilled' ? servicioSocial.value : '---');
            
            console.log('✅ Estadísticas cargadas');
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }

    async loadUsuariosStats() {
        if (!this.db) return 0;
        
        try {
            const snapshot = await this.db.collection('asesores')
                .where('estado', '==', 'aprobado')
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            return 0;
        }
    }

    async loadHorariosStats() {
        if (!this.db) return 0;
        
        try {
            const snapshot = await this.db.collection('horarios').get();
            return snapshot.size;
        } catch (error) {
            console.error('Error cargando horarios:', error);
            return 0;
        }
    }

    async loadReportesStats() {
        // Simular carga de reportes del mes actual
        const currentMonth = new Date().getMonth();
        return Math.floor(Math.random() * 50) + 10; // Simulado
    }

    async loadServicioSocialStats() {
        if (!this.db) return 0;
        
        try {
            // Buscar asesores que están haciendo servicio social
            const snapshot = await this.db.collection('asesores')
                .where('servicioSocial', '==', true)
                .get();
            return snapshot.size;
        } catch (error) {
            console.error('Error cargando servicio social:', error);
            return 0;
        }
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animación de contador
            this.animateNumber(element, parseInt(value) || 0);
        }
    }

    animateNumber(element, targetValue) {
        const startValue = 0;
        const duration = 1500; // 1.5 segundos
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    // ========================================
    // UTILIDADES Y EFECTOS VISUALES
    // ========================================

    addClickEffect(element) {
        // Efecto de click visual
        element.style.transform = 'scale(0.98)';
        element.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.transition = '';
        }, 150);
        
        // Efecto de ondas
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: radial-gradient(circle, rgba(172, 150, 90, 0.3), transparent);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
            z-index: 1000;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
        
        // Agregar CSS de animación si no existe
        if (!document.querySelector('#ripple-animation')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation';
            style.textContent = `
                @keyframes ripple {
                    to {
                        width: 300px;
                        height: 300px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    showLoadingModal(message = 'Cargando...') {
        const modal = document.getElementById('loadingModal');
        const messageElement = document.getElementById('loadingMessage');
        
        if (modal && messageElement) {
            messageElement.textContent = message;
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    hideLoadingModal() {
        const modal = document.getElementById('loadingModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    getActionDisplayName(action) {
        const displayNames = {
            'reportes': 'Reportes y Estadísticas',
            'organigrama': 'Organigrama',
            'horarios': 'Gestión de Horarios',
            'servicio': 'Servicio Social'
        };
        return displayNames[action] || action;
    }

    showNotification(title, message = '', type = 'info', icon = null) {
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
                icon || icons[type]
            );
        } else {
            // Fallback básico
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebaseDB && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            // Inicializar el manager
            window.adminMasManager = new AdminMasManager();
            
            console.log('🚀 Sistema de administración avanzado cargado');
        }
    }, 100);
    
    // Timeout de seguridad
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.adminMasManager) {
            console.error('❌ No se pudo inicializar el sistema');
            
            // Mostrar mensaje de error en la interfaz
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

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('❌ Error global en admin-mas:', event.error);
    
    if (window.adminMasManager) {
        window.adminMasManager.showNotification(
            'Error del Sistema',
            'Se produjo un error inesperado. Recargue la página si persiste.',
            'error'
        );
    }
});

// Exportar para uso global
window.AdminMasManager = AdminMasManager;