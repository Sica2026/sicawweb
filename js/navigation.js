// Modern Navigation System for SICA (Extracted from components)
class ModernNavigation {
    constructor() {
        this.registroBtn = null;
        this.asesorBtn = null;
        this.registroPanel = null;
        this.asesorPanel = null;
        this.mobileMenuToggle = null;
        this.mainNavButtons = null;
        this.darkModeToggle = null;
        this.homeBtn = null;
        
        this.activePanel = null;
        this.isAnimating = false;
        
        // Esperar a que los componentes se carguen
        this.waitForComponents();
    }
    
    waitForComponents() {
        const checkInterval = setInterval(() => {
            if (this.initializeElements()) {
                clearInterval(checkInterval);
                this.init();
            }
        }, 100);
        
        // Timeout después de 5 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.registroBtn) {
                console.warn('⚠️ No se pudieron inicializar los elementos de navegación');
            }
        }, 5000);
    }
    
    initializeElements() {
        this.registroBtn = document.getElementById('registroBtn');
        this.asesorBtn = document.getElementById('asesorBtn');
        this.administracionBtn = document.getElementById('administracionBtn');
        this.registroPanel = document.getElementById('registroPanel');
        this.asesorPanel = document.getElementById('asesorPanel');
        this.administracionPanel = document.getElementById('administracionPanel');
        this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
        this.mainNavButtons = document.querySelector('.main-nav-buttons');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.homeBtn = document.getElementById('homeBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        return this.registroBtn && this.asesorBtn && this.registroPanel && this.asesorPanel;
    }
    
    init() {
        this.setupEventListeners();
        this.setupDarkMode();
        this.setupMobileMenu();
        this.setupOptionButtons();
        this.setupKeyboardNavigation();
        this.setupHomeButton();
        
        console.log('🚀 Sistema de navegación moderno inicializado');
    }
    
    setupEventListeners() {
        // Botones principales
        this.registroBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePanel('registro');
        });
        
        this.asesorBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePanel('asesor');
        });

        this.administracionBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePanel('administracion');
        });

        this.logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        // Cerrar paneles al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.modern-navbar')) {
                this.closeAllPanels();
            }
        });
        
        // Cerrar paneles con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllPanels();
            }
        });
    }
    
    setupHomeButton() {
        this.homeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToHome();
        });
    }
    
    navigateToHome() {
        // Si existe el router, usarlo
        if (window.sicaRouter) {
            window.sicaRouter.navigate('/');
        } else {
            // Fallback: redirigir a index.html
            window.location.href = 'index.html';
        }
        
        this.showModernNotification(
            'Navegando al Inicio',
            'Regresando a la página principal...',
            'info',
            'bi-house-fill'
        );
    }

    showAdminAccess() {
        // Efecto visual sutil
        document.body.style.filter = 'brightness(0.95)';
        setTimeout(() => document.body.style.filter = '', 200);
        
        this.showModernNotification(
            'Acceso Administrador',
            'Iniciando autenticación...',
            'info',
            'bi-shield-lock-fill'
        );
        
        // Redirigir después de la notificación
        setTimeout(() => {
            // Detectar si estamos en subdirectorio
            const currentPath = window.location.pathname;
            const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
            
            if (isInSubdirectory) {
                // Si ya estamos en view/, ir al login.html en la misma carpeta
                window.location.href = 'login.html';
            } else {
                // Si estamos en la raíz, ir a view/login.html
                window.location.href = 'view/login.html';
            }
        }, 1500);
    }
    
    async togglePanel(panelType) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        const panels = {
            'registro': { panel: this.registroPanel, btn: this.registroBtn },
            'asesor': { panel: this.asesorPanel, btn: this.asesorBtn },
            'administracion': { panel: this.administracionPanel, btn: this.administracionBtn }
        };
        
        const targetPanel = panels[panelType]?.panel;
        const targetBtn = panels[panelType]?.btn;
        
        if (!targetPanel || !targetBtn) {
            this.isAnimating = false;
            return;
        }
        
        // Si el panel objetivo ya está activo, cerrarlo
        if (this.activePanel === panelType) {
            await this.closePanel(targetPanel, targetBtn);
            this.activePanel = null;
        } else {
            // Cerrar todos los otros paneles
            if (this.activePanel) {
                const currentPanel = panels[this.activePanel];
                if (currentPanel) {
                    await this.closePanel(currentPanel.panel, currentPanel.btn);
                }
            }
            
            // Abrir el panel objetivo
            await this.openPanel(targetPanel, targetBtn);
            this.activePanel = panelType;
        }
        
        this.isAnimating = false;
    }
    
    async openPanel(panel, button) {
        return new Promise((resolve) => {
            // Activar botón
            button.classList.add('active');
            button.classList.add('pulse');
            
            // Mostrar panel con animación
            panel.classList.add('active');  
            
            // Forzar layout horizontal para ciertos paneles
            const panelOptions = panel.querySelector('.panel-options');
            if (panelOptions) {
                panelOptions.style.display = 'flex';
                panelOptions.style.flexDirection = 'row';
                panelOptions.style.flexWrap = 'nowrap';
                panelOptions.style.gap = '1rem';
                panelOptions.style.overflowX = 'auto';
                panelOptions.style.width = '100%';
            }
            
            // Animar las opciones con delay
            const options = panel.querySelectorAll('.option-btn');
            options.forEach((option, index) => {
                setTimeout(() => {
                    option.style.animation = `slideInFromTop 0.3s ease forwards`;
                    option.style.animationDelay = `${index * 0.1}s`;
                }, 100);
            });
            
            // Efecto de sonido (si está habilitado)
            this.playSound('open');
            
            setTimeout(() => {
                button.classList.remove('pulse');
                resolve();
            }, 500);
        });
    }
    
    async closePanel(panel, button) {
        return new Promise((resolve) => {
            // Desactivar botón
            button.classList.remove('active');
            
            // Ocultar panel
            panel.classList.remove('active');
            
            // Limpiar animaciones de opciones
            const options = panel.querySelectorAll('.option-btn');
            options.forEach(option => {
                option.style.animation = '';
                option.style.animationDelay = '';
            });
            
            setTimeout(resolve, 300);
        });
    }
    
    closeAllPanels() {
        if (this.activePanel) {
            const panels = {
                'registro': { panel: this.registroPanel, btn: this.registroBtn },
                'asesor': { panel: this.asesorPanel, btn: this.asesorBtn },
                'administracion': { panel: this.administracionPanel, btn: this.administracionBtn }
            };
            
            const currentPanel = panels[this.activePanel];
            if (currentPanel) {
                this.closePanel(currentPanel.panel, currentPanel.btn);
            }
            
            this.activePanel = null;
        }
    }
    
    setupOptionButtons() {
        // Usar delegación de eventos para manejar botones dinámicos
        document.addEventListener('click', (e) => {
            // Opciones de SICA
            if (e.target.closest('.option-btn[data-sica]')) {
                e.preventDefault();
                const btn = e.target.closest('.option-btn[data-sica]');
                const sicaNumber = btn.getAttribute('data-sica');
                this.handleSicaSelection(sicaNumber, btn);
            }
            
            // Opciones de Asesor
            if (e.target.closest('.option-btn[data-action]')) {
                e.preventDefault();
                const btn = e.target.closest('.option-btn[data-action]');
                const action = btn.getAttribute('data-action');
                this.handleAsesorAction(action, btn);
            }

            // Opciones de Administrador
            if (e.target.closest('.option-btn[data-admin-action]')) {
                e.preventDefault();
                const btn = e.target.closest('.option-btn[data-admin-action]');
                const action = btn.getAttribute('data-admin-action');
                this.handleAdminAction(action, btn);
            }
        });
    }
    
    // Función que navega al menú de selección
    handleSicaSelection(sicaNumber, button) {
        // Efecto visual en el botón seleccionado
        this.addSelectionEffect(button);
        
        // Mostrar notificación moderna
        this.showModernNotification(
            `SICA ${sicaNumber}`,
            `Accediendo al menú de selección...`,
            'success',
            'bi-pc-display'
        );
        
        console.log(`🖥️ Accediendo a SICA ${sicaNumber}`);
        
        // Detección inteligente de ubicación
        const currentPath = window.location.pathname;
        const isInViewFolder = currentPath.includes('/view/') || currentPath.includes('view/');
        
        let targetPage;
        
        if (isInViewFolder) {
            // Si ya estamos en la carpeta view/, usar ruta relativa
            targetPage = `menu-seleccion.html?sica=${sicaNumber}`;
        } else {
            // Si estamos en la raíz, usar ruta completa
            targetPage = `view/menu-seleccion.html?sica=${sicaNumber}`;
        }
        
        console.log(`📍 Ubicación actual: ${currentPath}`);
        console.log(`🎯 Navegando a: ${targetPage}`);
        
        // Navegación inmediata
        window.location.href = targetPage;
        
        // Cerrar panel inmediatamente
        this.closeAllPanels();
    }

    handleLogout() {
        // Efecto visual
        this.showModernNotification(
            'Cerrando Sesión',
            'Saliendo del panel de administración...',
            'warning',
            'bi-box-arrow-right'
        );
        
        // Cerrar sesión de Firebase
        if (window.firebaseAuth) {
            window.firebaseAuth.signOut().then(() => {
                // Redirigir según la ubicación actual
                const currentPath = window.location.pathname;
                const isInSubdirectory = currentPath.includes('/view/');
                
                if (isInSubdirectory) {
                    window.location.href = '../index.html';
                } else {
                    window.location.href = 'index.html';
                }
            });
        } else {
            // Fallback si no hay Firebase
            const currentPath = window.location.pathname;
            const isInSubdirectory = currentPath.includes('/view/');
            
            if (isInSubdirectory) {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }
    
    // ✅ FUNCIÓN CORREGIDA - Aquí estaba el problema principal
    handleAsesorAction(action, button) {
    // Efecto visual en el botón seleccionado
    this.addSelectionEffect(button);
    
    const actionMessages = {
        'lista': {
            title: 'Pase de Lista',
            message: 'Accediendo al sistema de asistencia...',
            icon: 'bi-list-check',
            page: 'pase-lista.html'
        },
        'impresiones': {
            title: 'Registro de Impresiones',
            message: 'Abriendo módulo de impresiones...',
            icon: 'bi-printer',
            page: 'registro-impresiones.html'
        },
        'reportes': {
            title: 'Reportes',
            message: 'Generando reportes del sistema...',
            icon: 'bi-file-earmark-text',
            page: 'reportes-aesor.html'
        },
        'horario': {
            title: 'Consulta de Horario',
            message: 'Accediendo a consulta de horarios...',
            icon: 'bi-clock',
            page: 'consulta-horarios.html'
        },
        'armador': {  // ← NUEVA ENTRADA
            title: 'Armador de Horarios',
            message: 'Accediendo al armador de horarios...',
            icon: 'bi-gear-fill',
            page: 'armador.html'
        }
    };
    
    const actionData = actionMessages[action];
    
    if (actionData) {
        this.showModernNotification(
            actionData.title,
            actionData.message,
            'info',
            actionData.icon
        );
        
        console.log(`⚙️ Ejecutando acción: ${action}`);
        
        // Navegación corregida - Detección de ubicación y navegación directa
        setTimeout(() => {
            const currentPath = window.location.pathname;
            const isInViewFolder = currentPath.includes('/view/') || currentPath.includes('view/');
            
            let targetPage;
            
            if (isInViewFolder) {
                // Si ya estamos en la carpeta view/, usar ruta relativa
                targetPage = actionData.page;
            } else {
                // Si estamos en la raíz, usar ruta completa
                targetPage = `view/${actionData.page}`;
            }
            
            console.log(`📍 Navegando desde: ${currentPath}`);
            console.log(`🎯 Navegando a: ${targetPage}`);
            
            // Navegar directamente
            window.location.href = targetPage;
            
        }, 1000);
    }
    
    // Cerrar panel después de la selección
    setTimeout(() => {
        this.closeAllPanels();
    }, 800);
}
    
    addSelectionEffect(button) {
        // Efecto de selección visual
        button.style.transform = 'scale(0.95)';
        button.style.backgroundColor = 'var(--primary-gold)';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.backgroundColor = '';
        }, 200);
        
        // Efecto de ondas
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: radial-gradient(circle, rgba(255,255,255,0.6), transparent);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: rippleAnimation 0.6s ease-out;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
        
        // Agregar CSS de animación si no existe
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes rippleAnimation {
                    to {
                        width: 200px;
                        height: 200px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    showModernNotification(title, message, type = 'info', icon = 'bi-info-circle') {
        // Crear notificación moderna
        const notification = document.createElement('div');
        notification.className = `modern-notification ${type}`;
        
        const typeColors = {
            'success': 'linear-gradient(135deg, #10B981, #059669)',
            'info': 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            'warning': 'linear-gradient(135deg, #F59E0B, #D97706)',
            'error': 'linear-gradient(135deg, #EF4444, #DC2626)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 350px;
            max-width: 400px;
            background: ${typeColors[type]};
            color: white;
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.2);
            transform: translateX(100%) scale(0.8);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="
                    width: 50px;
                    height: 50px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                ">
                    <i class="${icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">
                        ${title}
                    </div>
                    <div style="opacity: 0.9; font-size: 0.9rem;">
                        ${message}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.3s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.opacity = '1';
        });
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%) scale(0.8)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 400);
            }
        }, 5000);
        
        // Efecto de sonido
        this.playSound(type);
    }
    
    playSound(type) {
        // Sistema de sonidos opcional (solo si están habilitados)
        if (!window.sicaSoundsEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const frequencies = {
                'open': [440, 554.37],
                'success': [523.25, 659.25],
                'info': [440, 523.25],
                'warning': [369.99, 440],
                'error': [277.18, 369.99]
            };
            
            const [freq1, freq2] = frequencies[type] || frequencies['info'];
            
            oscillator.frequency.setValueAtTime(freq1, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(freq2, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('Audio context not available:', error);
        }
    }
    
    setupDarkMode() {
        if (!this.darkModeToggle) return;
        
        const darkModeIcon = this.darkModeToggle.querySelector('i');
        const darkModeText = this.darkModeToggle.querySelector('span');
        
        // Verificar tema guardado
        const savedTheme = localStorage.getItem('sica-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateDarkModeButton(savedTheme === 'dark');
        
        this.darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleDarkMode();
        });
    }
    
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Efecto de transición suave
        document.body.style.transition = 'all 0.3s ease';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sica-theme', newTheme);
        this.updateDarkModeButton(newTheme === 'dark');
        
        // Mostrar notificación
        this.showModernNotification(
            `Modo ${newTheme === 'dark' ? 'Oscuro' : 'Claro'} Activado`,
            `Se ha cambiado al tema ${newTheme === 'dark' ? 'oscuro' : 'claro'}`,
            'info',
            newTheme === 'dark' ? 'bi-moon-fill' : 'bi-sun-fill'
        );
        
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }
    
    updateDarkModeButton(isDark) {
        const icon = this.darkModeToggle.querySelector('i');
        const text = this.darkModeToggle.querySelector('span');
        
        if (isDark) {
            icon.className = 'bi bi-sun-fill';
            text.textContent = 'Modo Claro';
        } else {
            icon.className = 'bi bi-moon-fill';
            text.textContent = 'Modo Oscuro';
        }
    }
    
    setupMobileMenu() {
        if (!this.mobileMenuToggle) return;
        
        this.mobileMenuToggle.addEventListener('click', () => {
            this.toggleMobileMenu();
        });
        
        // Cerrar menú móvil al redimensionar ventana
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeMobileMenu();
            }
        });
    }
    
    toggleMobileMenu() {
        this.mobileMenuToggle.classList.toggle('active');
        this.mainNavButtons.classList.toggle('active');
        
        // Prevenir scroll del body cuando el menú está abierto
        if (this.mainNavButtons.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    closeMobileMenu() {
        this.mobileMenuToggle.classList.remove('active');
        this.mainNavButtons.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Alt + R para Registro
            if (e.altKey && e.key === 'r') {
                e.preventDefault();
                this.togglePanel('registro');
            }
            
            // Alt + A para Asesor
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                this.togglePanel('asesor');
            }
            
            // Alt + D para Dark Mode
            if (e.altKey && e.key === 'd') {
                e.preventDefault();
                this.toggleDarkMode();
            }
            
            // Alt + H para Home
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                this.navigateToHome();
            }

            // Alt + E para acceso de administrador
            if (e.altKey && e.key === 'e') {
                e.preventDefault();
                this.showAdminAccess();
            }
                        
            // Números 1-4 para SICA cuando panel registro está abierto
            if (this.activePanel === 'registro' && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const sicaBtn = document.querySelector(`[data-sica="${e.key}"]`);
                if (sicaBtn) {
                    sicaBtn.click();
                }
            }
        });
    }
    
    // ✅ FUNCIÓN ACTUALIZADA CON INCIDENCIAS
    handleAdminAction(action, button) {
        this.addSelectionEffect(button);
        
        const adminActions = {
            'formularios': {
                title: 'Formularios y Avisos',
                message: 'Accediendo al centro de comunicaciones...',
                icon: 'bi-file-earmark-text',
                route: 'formularios-avisos.html'
            },
            'asesores': {
                title: 'Gestión de Asesores',
                message: 'Cargando panel de asesores...',
                icon: 'bi-people',
                route: 'gestion-asesores.html'
            },
            'pago-horas': {
                title: 'Pago de Horas',
                message: 'Accediendo al sistema de pagos...',
                icon: 'bi-cash-coin',
                route: 'pago-horas.html'
            },
            'reportes': {
                title: 'Reportes Administrativos',
                message: 'Accediendo al módulo de reportes...',
                icon: 'bi-graph-up',
                route: 'reportes-admin.html'
            },
            // ✅ NUEVA OPCIÓN DE INCIDENCIAS
            'incidencias': {
                title: 'Gestión de Incidencias',
                message: 'Accediendo al sistema de incidencias...',
                icon: 'bi-exclamation-triangle',
                route: 'admin-incidencias.html'
            },
            // ✅ NUEVA OPCIÓN DE NOTICIAS
            'noticias': {
                title: 'Gestión de Noticias',
                message: 'Accediendo al sistema de noticias...',
                icon: 'bi-newspaper',
                route: 'gestion-noticias.html'
            },
            'mas': {
                title: 'Más Opciones',
                message: 'Cargando opciones adicionales...',
                icon: 'bi-three-dots',
                route: 'admin-mas.html'
            },
            'logout': {
                title: 'Cerrar Sesión',
                message: 'Cerrando sesión de administrador...',
                icon: 'bi-box-arrow-right',
                route: null
            }
        };
        
        const actionData = adminActions[action];
        
        if (actionData) {
            this.showModernNotification(
                actionData.title,
                actionData.message,
                action === 'logout' ? 'warning' : action === 'incidencias' ? 'warning' : action === 'noticias' ? 'info' : 'info',
                actionData.icon
            );
            
            console.log(`🔧 Ejecutando acción de administrador: ${action}`);
            
            if (action === 'logout') {
                // Cerrar sesión
                if (window.firebaseAuth) {
                    window.firebaseAuth.signOut().then(() => {
                        window.location.href = '../index.html';
                    });
                } else {
                    window.location.href = '../index.html';
                }
            } else {
                // Redirigir a la página correspondiente
                setTimeout(() => {
                    const currentPath = window.location.pathname;
                    const isInViewFolder = currentPath.includes('/view/') || currentPath.includes('view/');
                    
                    let targetPage;
                    
                    if (isInViewFolder) {
                        targetPage = actionData.route;
                    } else {
                        targetPage = `view/${actionData.route}`;
                    }
                    
                    console.log(`📍 Navegando a: ${targetPage}`);
                    window.location.href = targetPage;
                }, 1000);
            }
        }
        
        // Cerrar panel después de la selección
        setTimeout(() => {
            this.closeAllPanels();
        }, 1000);
    }

    // Método para habilitar/deshabilitar sonidos
    toggleSounds() {
        window.sicaSoundsEnabled = !window.sicaSoundsEnabled;
        localStorage.setItem('sica-sounds', window.sicaSoundsEnabled);
        
        this.showModernNotification(
            'Configuración de Sonidos',
            `Sonidos ${window.sicaSoundsEnabled ? 'habilitados' : 'deshabilitados'}`,
            'info',
            window.sicaSoundsEnabled ? 'bi-volume-up' : 'bi-volume-mute'
        );
    }
    
    // Método para agregar nuevas opciones dinámicamente
    addDynamicOption(panelType, optionData) {
        const panel = panelType === 'registro' ? this.registroPanel : this.asesorPanel;
        const optionsContainer = panel.querySelector('.panel-options');
        
        const optionBtn = document.createElement('button');
        optionBtn.className = 'option-btn';
        optionBtn.setAttribute(`data-${panelType === 'registro' ? 'sica' : 'action'}`, optionData.value);
        
        optionBtn.innerHTML = `
            <div class="option-content">
                <div class="option-icon">
                    <i class="${optionData.icon}"></i>
                </div>
                <span>${optionData.label}</span>
            </div>
        `;
        
        optionsContainer.appendChild(optionBtn);
        
        // Animar entrada
        optionBtn.style.opacity = '0';
        optionBtn.style.transform = 'scale(0.8)';
        requestAnimationFrame(() => {
            optionBtn.style.transition = 'all 0.3s ease';
            optionBtn.style.opacity = '1';
            optionBtn.style.transform = 'scale(1)';
        });
    }
    
    // Método para obtener estadísticas de uso
    getUsageStats() {
        const stats = JSON.parse(localStorage.getItem('sica-usage-stats') || '{}');
        return stats;
    }
    
    // Método para actualizar estadísticas
    updateUsageStats(action) {
        const stats = this.getUsageStats();
        const today = new Date().toDateString();
        
        if (!stats[today]) {
            stats[today] = {};
        }
        
        stats[today][action] = (stats[today][action] || 0) + 1;
        localStorage.setItem('sica-usage-stats', JSON.stringify(stats));
    }
}

// Inicializar navegación cuando los componentes estén listos
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para asegurar que los componentes estén cargados
    setTimeout(() => {
        // Inicializar navegación moderna
        window.modernNav = new ModernNavigation();
        
        // Configurar sonidos (deshabilitados por defecto)
        window.sicaSoundsEnabled = localStorage.getItem('sica-sounds') === 'true';
       
        console.log('🎨 Sistema de navegación moderno SICA cargado exitosamente');
    }, 500);
});

// Funciones globales para facilitar el uso
window.SICAModern = {
    // Abrir panel específico
    openPanel: (type) => window.modernNav?.togglePanel(type),
    
    // Cerrar todos los paneles
    closeAll: () => window.modernNav?.closeAllPanels(),
    
    // Toggle dark mode
    toggleDarkMode: () => window.modernNav?.toggleDarkMode(),
    
    // Toggle sonidos
    toggleSounds: () => window.modernNav?.toggleSounds(),
    
    // Mostrar notificación personalizada
    notify: (title, message, type, icon) => 
        window.modernNav?.showModernNotification(title, message, type, icon),
    
    // Agregar opción dinámica
    addOption: (panelType, optionData) => 
        window.modernNav?.addDynamicOption(panelType, optionData),
    
    // Obtener estadísticas
    getStats: () => window.modernNav?.getUsageStats(),
    
    // Navegar al inicio
    goHome: () => window.modernNav?.navigateToHome()
};