// SICA Components System
class SICAComponents {
    constructor() {
        this.components = {
            header: this.getHeaderComponent(),
            navbar: this.getNavbarComponent(),
            footer: this.getFooterComponent()
        };
        this.init();
    }

    init() {
        this.loadComponents();
        this.setupClock();
        
        // ✅ AGREGAR: Verificar estado de autenticación
        setTimeout(() => {
            SICAComponents.checkAuthState();
        }, 1000);
        
        console.log('🧩 Componentes SICA cargados exitosamente');
    }

    loadComponents() {
        // Cargar Header
        const headerContainer = document.getElementById('header-component');
        if (headerContainer) {
            headerContainer.innerHTML = this.components.header;
        }

        // Cargar Navbar
        const navbarContainer = document.getElementById('navbar-component');
        if (navbarContainer) {
            navbarContainer.innerHTML = this.components.navbar;
        }

        // Cargar Footer
        const footerContainer = document.getElementById('footer-component');
        if (footerContainer) {
            footerContainer.innerHTML = this.components.footer;
        }
    }

    getHeaderComponent() {
        return `
            <header class="header-section">
                <div class="container-fluid">
                    <div class="row align-items-center py-3">
                        <div class="col-md-2 text-center">
                            <div class="logo-container">
                                <img src="../image/fq.png" alt="FQ Logo" class="logo-img">
                                <span class="logo-text">SICA</span>
                            </div>
                        </div>
                        <div class="col-md-8 text-center">
                            <h1 class="main-title">SALA DE INFORMÁTICA DE CÓMPUTO PARA ALUMNOS</h1>
                        </div>
                        <div class="col-md-2 text-center">
                            <div class="logo-container">
                                <img src="../image/unam.png" alt="UNAM Logo" class="logo-img">
                                <span class="logo-text">UNAM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    getNavbarComponent() {
    return `
        <nav class="modern-navbar">
            <div class="container">
                <div class="navbar-content">
                    <!-- UN SOLO CONTENEDOR PRINCIPAL -->
                    <div class="main-nav-buttons">
                        <!-- Botones de Usuario (visibles por defecto) -->
                        <div class="user-mode" id="userNavButtons" style="display: flex; gap: inherit;">
                            <button class="nav-btn registro-btn" id="registroBtn">
                                <div class="btn-content">
                                    <i class="bi bi-person-plus-fill"></i>
                                    <span>Registro</span>
                                    <i class="bi bi-chevron-down chevron-icon"></i>
                                </div>
                            </button>
                            
                            <button class="nav-btn asesor-btn" id="asesorBtn">
                                <div class="btn-content">
                                    <i class="bi bi-headset"></i>
                                    <span>Asesor</span>
                                    <i class="bi bi-chevron-down chevron-icon"></i>
                                </div>
                            </button>
                        </div>

                        <!-- Botones de Administrador (ocultos por defecto) -->
                        <div class="admin-mode" id="adminNavButtons" style="display: none; gap: inherit;">
                            <button class="nav-btn admin-btn" id="administracionBtn">
                                <div class="btn-content">
                                    <i class="bi bi-shield-lock-fill"></i>
                                    <span>Administración</span>
                                    <i class="bi bi-chevron-down chevron-icon"></i>
                                </div>
                            </button>
                            <button class="nav-btn logout-btn" id="logoutBtn">
                                <div class="btn-content">
                                    <i class="bi bi-box-arrow-right"></i>
                                        <span>Cerrar Sesión</span>
                                </div>
                            </button>
                        </div>

                        <!-- Botones Comunes (siempre visibles) -->
                        <button class="nav-btn" id="darkModeToggle">
                            <div class="btn-content">
                                <i class="bi bi-moon"></i>
                                <span>Modo Oscuro</span>
                            </div>
                        </button>

                        <button class="nav-btn" id="homeBtn">
                            <div class="btn-content">
                                <i class="bi bi-house-fill"></i>
                                <span id="homeBtnText">Inicio</span>
                            </div>
                        </button>
                    </div>

                        <!-- Expandable Panels -->
                        <div class="expandable-panels">
                            <!-- Panel Registro (solo visible en modo usuario) -->
                            <div class="nav-panel registro-panel user-mode" id="registroPanel">
                                <div class="panel-content">
                                    <div class="panel-options horizontal-layout">
                                        <button class="option-btn" data-sica="1">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-1-circle-fill"></i>
                                                </div>
                                                <span>SICA 1</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-sica="2">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-2-circle-fill"></i>
                                                </div>
                                                <span>SICA 2</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-sica="3">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-3-circle-fill"></i>
                                                </div>
                                                <span>S.I 1</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-sica="4">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-4-circle-fill"></i>
                                                </div>
                                                <span>SICA 4</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Panel Asesor (solo visible en modo usuario) -->
                            <div class="nav-panel asesor-panel user-mode" id="asesorPanel">
                                <div class="panel-content">
                                    <div class="panel-options horizontal-layout">
                                        <button class="option-btn" data-action="lista">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-list-check"></i>
                                                </div>
                                                <span>Pase de Lista</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-action="impresiones">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-printer"></i>
                                                </div>
                                                <span>Impresiones</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-action="reportes">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-file-earmark-text"></i>
                                                </div>
                                                <span>Reportes</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-action="configuracion">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-gear"></i>
                                                </div>
                                                <span>Configuración</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Panel Administración (solo visible en modo admin) -->
                            <div class="nav-panel admin-panel admin-mode" id="administracionPanel" style="display: none;">
                                <div class="panel-content">
                                    <div class="panel-options horizontal-layout">
                                        <button class="option-btn" data-admin-action="formularios">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-file-earmark-text"></i>
                                                </div>
                                                <span>Formularios/Avisos</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-admin-action="asesores">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-people"></i>
                                                </div>
                                                <span>Gestión Asesores</span>
                                            </div>
                                        </button>
                                        <button class="option-btn" data-admin-action="mas">
                                            <div class="option-content">
                                                <div class="option-icon">
                                                    <i class="bi bi-three-dots"></i>
                                                </div>
                                                <span>Más...</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Menu Toggle -->
                        <button class="mobile-menu-toggle" id="mobileMenuToggle">
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                            <span class="hamburger-line"></span>
                        </button>
                    </div>
                </div>
            </nav>
        `;
    }

    getFooterComponent() {
        return `
            <footer class="footer-section">
                <div class="container">
                    <div class="row align-items-center">
                        <div class="col-md-4">
                            <div class="current-time">
                                <i class="bi bi-clock me-2"></i>
                                <span id="currentTime">--:--:--</span>
                            </div>
                        </div>
                        <div class="col-md-8 text-end">
                            <p class="footer-text mb-0">
                                Desarrollado por <strong>SICA</strong> - Facultad de Química, UNAM
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    setupClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            const clockElement = document.getElementById('currentTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };

        // Actualizar inmediatamente y luego cada segundo
        updateClock();
        setInterval(updateClock, 1000);
    }

    // Método para cambiar el título de la página
    static setPageTitle(title) {
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
        document.title = title;
    }

    // Método para cargar estilos específicos de página
    static loadPageStyles(cssFile) {
        const pageStyles = document.getElementById('page-styles');
        if (pageStyles && cssFile) {
            pageStyles.href = cssFile;
        }
    }

    // Método para cargar JavaScript específico de página
    static loadPageScript(jsFile) {
        const existingScript = document.getElementById('page-script');
        if (existingScript) {
            existingScript.remove();
        }

        if (jsFile) {
            const script = document.createElement('script');
            script.id = 'page-script';
            script.src = jsFile;
            script.defer = true;
            document.body.appendChild(script);
        }
    }

    // Método para cargar contenido en el main
    static loadMainContent(content) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = content;
        }
    }

    // Método para agregar breadcrumbs
    static addBreadcrumbs(breadcrumbs) {
        const breadcrumbHtml = `
            <nav aria-label="breadcrumb" class="breadcrumb-nav">
                <div class="container">
                    <ol class="breadcrumb">
                        ${breadcrumbs.map(crumb => 
                            crumb.active 
                                ? `<li class="breadcrumb-item active" aria-current="page">${crumb.text}</li>`
                                : `<li class="breadcrumb-item"><a href="${crumb.link}">${crumb.text}</a></li>`
                        ).join('')}
                    </ol>
                </div>
            </nav>
        `;

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.insertAdjacentHTML('afterbegin', breadcrumbHtml);
        }
    }

    // Método para mostrar notificaciones usando el sistema existente
    static notify(title, message, type = 'info', icon = 'bi-info-circle') {
        if (window.modernNav) {
            window.modernNav.showModernNotification(title, message, type, icon);
        }
    }

    // Método para obtener configuración de la página actual
    static getPageConfig() {
        return {
            title: document.title,
            path: window.location.pathname,
            theme: document.documentElement.getAttribute('data-theme') || 'light'
        };
    }

    // ✅ FUNCIÓN PARA ALTERNAR ENTRE MODO USUARIO Y ADMIN
    static toggleAdminMode(isAdmin = false) {
        const userElements = document.querySelectorAll('.user-mode');
        const adminElements = document.querySelectorAll('.admin-mode');
        const homeBtnText = document.getElementById('homeBtnText');
        
        if (isAdmin) {
            // Ocultar elementos de usuario
            userElements.forEach(el => el.style.display = 'none');
            // Mostrar elementos de admin
            adminElements.forEach(el => el.style.display = 'flex');
            // Cambiar texto del botón inicio
            if (homeBtnText) homeBtnText.textContent = 'Panel Admin';
            
            document.body.classList.add('admin-authenticated');
            
            // Configurar navegación del botón inicio para admin
            SICAComponents.updateHomeButton('admin');
            
        } else {
            // Mostrar elementos de usuario
            userElements.forEach(el => el.style.display = 'flex');
            // Ocultar elementos de admin
            adminElements.forEach(el => el.style.display = 'none');
            // Restaurar texto del botón inicio
            if (homeBtnText) homeBtnText.textContent = 'Inicio';
            
            document.body.classList.remove('admin-authenticated');
            
            // Configurar navegación del botón inicio para usuario
            SICAComponents.updateHomeButton('user');
        }
    }

    // ✅ FUNCIÓN PARA ACTUALIZAR COMPORTAMIENTO DEL BOTÓN INICIO
    static updateHomeButton(mode) {
        const homeBtn = document.getElementById('homeBtn');
        
        if (homeBtn) {
            // Remover listeners anteriores
            const newHomeBtn = homeBtn.cloneNode(true);
            homeBtn.parentNode.replaceChild(newHomeBtn, homeBtn);
            
            // Agregar nuevo listener según el modo
            newHomeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (mode === 'admin') {
                    // Redirigir al dashboard de admin
                    window.location.href = 'admin-dashboard.html';
                } else {
                    // Redirigir al inicio normal
                    const currentPath = window.location.pathname;
                    const isInSubdirectory = currentPath.includes('/view/');
                    
                    if (isInSubdirectory) {
                        window.location.href = '../index.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    }

    // ✅ FUNCIÓN PARA VERIFICAR AUTENTICACIÓN AL CARGAR
    static checkAuthState() {
        // Verificar si hay usuario autenticado en Firebase
        if (window.firebaseAuth) {
            window.firebaseAuth.onAuthStateChanged((user) => {
                SICAComponents.toggleAdminMode(!!user);
            });
        }
        
        // También verificar parámetro URL para login directo
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'true') {
            SICAComponents.toggleAdminMode(true);
        }
    }
}

// Sistema de enrutamiento simple
class SICARouter {
    constructor() {
        this.routes = {};
        this.defaultRoute = '/';
    }

    // Registrar una ruta
    route(path, config) {
        this.routes[path] = config;
        return this;
    }

    // Navegar a una ruta
    navigate(path) {
        const route = this.routes[path] || this.routes[this.defaultRoute];
        
        if (route) {
            // Cambiar título
            if (route.title) {
                SICAComponents.setPageTitle(route.title);
            }

            // Cargar estilos específicos
            if (route.css) {
                SICAComponents.loadPageStyles(route.css);
            }

            // Cargar contenido
            if (route.content) {
                SICAComponents.loadMainContent(route.content);
            }

            // Cargar JavaScript específico
            if (route.js) {
                SICAComponents.loadPageScript(route.js);
            }

            // Agregar breadcrumbs
            if (route.breadcrumbs) {
                SICAComponents.addBreadcrumbs(route.breadcrumbs);
            }

            // Actualizar URL sin recargar
            history.pushState({ path }, route.title || '', path);

            // Callback después de cargar
            if (route.onLoad) {
                route.onLoad();
            }
        }
    }

    // Inicializar router
    init() {
        // Manejar botón atrás/adelante
        window.addEventListener('popstate', (e) => {
            const path = e.state?.path || window.location.pathname;
            this.navigate(path);
        });

        // Navegar a la ruta actual
        this.navigate(window.location.pathname);
    }
}

// Inicializar componentes cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar componentes
    window.sicaComponents = new SICAComponents();
    
    // Inicializar router
    window.sicaRouter = new SICARouter();

    console.log('🚀 Sistema de componentes SICA inicializado');
});

// Exportar para uso global
window.SICAComponents = SICAComponents;
window.SICARouter = SICARouter;