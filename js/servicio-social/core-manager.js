// core-manager.js
// Módulo principal del sistema de servicio social

class ServicioSocialCore {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.currentUser = null;
        this.asesores = [];
        this.servicioSocialData = [];
        this.filteredAsesores = [];
        this.currentAsesor = null;
        this.categoryCounts = {
            'pendientes': 0,
            'ya-registro': 0,
            'en-proceso': 0,
            'sin-creditos': 0,
            'terminado': 0,
            'cancelado': 0
        };
    }

    async init() {
        try {
            console.log('🚀 Inicializando ServicioSocialCore...');
            
            this.setupPage();
            await this.checkAuthentication();
            this.setupFirebase();
            
            console.log('✅ Core inicializado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando core:', error);
            throw error;
        }
    }

    setupPage() {
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle('Servicio Social - SICA Administrativo');
        } else {
            document.title = 'Servicio Social - SICA Administrativo';
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
                            window.location.href = '../login.html';
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
        if (window.firebaseStorage) this.storage = window.firebaseStorage;
        
        if (!this.db || !this.auth) {
            throw new Error('Firebase no está completamente inicializado');
        }
        
        console.log('🔥 Firebase configurado correctamente');
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
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    showLoadingModal(message = 'Procesando...') {
        const modal = document.getElementById('loadingModal');
        const messageElement = document.getElementById('loadingMessage');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (modal) {
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

    showLoading(show) {
        const loading = document.getElementById('loadingState');
        const content = document.getElementById('accordionContainer');
        const empty = document.getElementById('emptyState');
        
        if (show) {
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
            if (empty) empty.style.display = 'none';
        } else {
            if (loading) loading.style.display = 'none';
        }
    }

    setElementValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    async getNextFolio(tipoFolio) {
        const configRef = this.db.collection('configuracion').doc('qkLlvrqIPsI7HEPKIhyh');
        const currentYear = new Date().getFullYear();
        
        try {
            const doc = await configRef.get();
            const data = doc.data();
            const numeroActual = parseInt(data[tipoFolio]) || 0;
            const siguienteNumero = numeroActual + 1;
            
            const folioCompleto = `CI/${siguienteNumero}/${currentYear}`;
            
            await configRef.update({
                [tipoFolio]: siguienteNumero
            });
            
            return folioCompleto;
            
        } catch (error) {
            console.error('Error obteniendo folio:', error);
            return `CI/ERROR/${currentYear}`;
        }
    }

    prepareAsesorData() {
        const nombreCompleto = this.currentAsesor.nombreAsesor || 'Sin nombre';
        
        return {
            nombreAsesor: nombreCompleto,
            numeroCuenta: this.currentAsesor.numeroCuenta || '',
            escuela: this.currentAsesor.escuela || '',
            carrera: this.currentAsesor.carrera || '',
            avance: this.currentAsesor.avance || '',
            folioTermino: document.getElementById('folioTermino')?.value || '',
            folioAceptacion: document.getElementById('folioAceptacion')?.value || '',
            clavePrograma: document.getElementById('clavePrograma')?.value || '',
            fechaInicio: document.getElementById('fechaInicio')?.value || '',
            fechaTermino: document.getElementById('fechaTermino')?.value || '',
            fechaEntregaCarta: document.getElementById('fechaEntregaCarta')?.value || '',
            estadoTermino: document.getElementById('estadoTermino')?.value || '',
            horasAsesor: parseFloat(document.getElementById('horasAsesor')?.value) || 0,
            horasServicioSocial: parseFloat(document.getElementById('horasServicioSocial')?.value) || 0,
            totalHoras: parseFloat(document.getElementById('totalHoras')?.value) || 0,
            fechaGeneracion: new Date().toISOString().split('T')[0],
            usuarioGenerador: this.currentUser?.email || '',
            sistemaGenerador: 'SICA Administrativo',
            versionSistema: '1.0'
        };
    }
}

// Exportar para uso global
window.ServicioSocialCore = ServicioSocialCore;