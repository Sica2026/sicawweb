// folio-manager.js - Gestor principal de folios y Firebase
class FolioManager {
    constructor() {
        this.db = firebase.firestore();
        this.configDoc = 'qkLlvrqIPsI7HEPKIhyh';
        this.currentAsesor = null;
        this.currentDocType = null;
        this.isLoading = false;
    }

    // ================================
    // INICIALIZACIÓN
    // ================================
    async init() {
        try {
            console.log('🔧 Inicializando FolioManager...');
            await this.loadHistorial();
            this.setupEventListeners();
            console.log('✅ FolioManager inicializado');
        } catch (error) {
            console.error('❌ Error inicializando FolioManager:', error);
            this.showNotification('Error de inicialización', 'No se pudo conectar con Firebase', 'error');
        }
    }

    setupEventListeners() {
        // Botón de folio personalizado
        const btnCustomFolio = document.getElementById('btnCustomFolio');
        btnCustomFolio?.addEventListener('click', () => this.showCustomFolioModal());

        // Botón guardar folio personalizado
        const btnSaveCustomFolio = document.getElementById('btnSaveCustomFolio');
        btnSaveCustomFolio?.addEventListener('click', () => this.saveCustomFolio());

        // Botón volver a búsqueda
        const btnBackToSearch = document.getElementById('btnBackToSearch');
        btnBackToSearch?.addEventListener('click', () => this.showMainView());

        // Botón generar folio automático
        const btnAutoFolio = document.getElementById('btnAutoFolio');
        btnAutoFolio?.addEventListener('click', () => this.generateAutoFolio());

        // Botón guardar y generar PDF
        const btnSaveAndGenerate = document.getElementById('btnSaveAndGenerate');
        btnSaveAndGenerate?.addEventListener('click', () => this.saveAndGeneratePDF());

        // Botón actualizar vista previa
        const btnPreview = document.getElementById('btnPreview');
        btnPreview?.addEventListener('click', () => this.updatePreview());
    }

    // ================================
    // GESTIÓN DE VISTAS
    // ================================
    showMainView() {
        document.getElementById('main-view').style.display = 'block';
        document.getElementById('config-view').style.display = 'none';
        this.currentAsesor = null;
        this.currentDocType = null;
    }

    showConfigView(asesor, docType) {
        this.currentAsesor = asesor;
        this.currentDocType = docType;
        
        document.getElementById('main-view').style.display = 'none';
        document.getElementById('config-view').style.display = 'block';
        
        // Actualizar títulos
        document.getElementById('selectedAsesorName').textContent = asesor.nombreAsesor;
        document.getElementById('selectedDocType').textContent = docType.title;
        document.getElementById('configTitle').textContent = `${docType.title}`;
        
        // Cargar configuración del asesor
        this.loadAsesorConfig(asesor);
        
        // Añadir clase de animación
        document.getElementById('config-view').classList.add('slide-in-right');
    }

    // ================================
    // DATOS DE FIREBASE
    // ================================
    async loadHistorial() {
        try {
            this.setLoadingState(true);
            const configRef = this.db.collection('configuracion').doc(this.configDoc);
            const configSnap = await configRef.get();
            
            if (configSnap.exists) {
                const data = configSnap.data();
                const historial = data.historialFolios || [];
                
                // Ordenar por fecha descendente y tomar los últimos 10
                const recentHistorial = historial
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .slice(0, 10);
                
                this.renderHistorial(recentHistorial);
            }
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showNotification('Error', 'No se pudo cargar el historial', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async loadAsesorConfig(asesor) {
        try {
            // Cargar datos del servicio social
            const servicioSocialId = `asesor_${asesor.numeroCuenta}`;
            const servicioRef = this.db.collection('serviciosocial').doc(servicioSocialId);
            const servicioSnap = await servicioRef.get();
            
            let servicioData = {};
            if (servicioSnap.exists) {
                servicioData = servicioSnap.data();
            }
            
            // Renderizar formulario de configuración
            this.renderConfigForm(asesor, servicioData);
            
            // Generar folio automático si está vacío
            const folioInput = document.getElementById('folioInput');
            if (!folioInput.value) {
                this.generateAutoFolio();
            }
            
        } catch (error) {
            console.error('❌ Error cargando configuración del asesor:', error);
            this.showNotification('Error', 'No se pudieron cargar los datos del asesor', 'error');
        }
    }

    // ================================
    // RENDERIZADO DE UI
    // ================================
    renderHistorial(historial) {
        const historyList = document.getElementById('historyList');
        const historyCount = document.getElementById('historyCount');
        
        historyCount.textContent = `${historial.length} registros`;
        
        if (historial.length === 0) {
            historyList.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No hay registros recientes</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = historial.map(item => `
            <div class="history-item fade-in">
                <div class="history-item-header">
                    <span class="history-folio">${item.folio}</span>
                    <span class="history-date">${this.formatDate(item.fecha)}</span>
                </div>
                <span class="history-type">${item.tipo}</span>
            </div>
        `).join('');
    }

    renderConfigForm(asesor, servicioData) {
        const configForm = document.getElementById('configForm');
        
        configForm.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-person-fill"></i>
                        Nombre del Asesor
                    </label>
                    <input type="text" 
                           class="form-control form-control-sica" 
                           id="nombreAsesor" 
                           value="${asesor.nombreAsesor}" 
                           readonly>
                </div>
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-credit-card-fill"></i>
                        Número de Cuenta
                    </label>
                    <input type="text" 
                           class="form-control form-control-sica" 
                           id="numeroCuenta" 
                           value="${asesor.numeroCuenta}" 
                           readonly>
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label-sica">
                        <i class="bi bi-mortarboard-fill"></i>
                        Carrera
                    </label>
                    <input type="text" 
                           class="form-control form-control-sica" 
                           id="carrera" 
                           value="${asesor.carrera || ''}" 
                           readonly>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-calendar-event"></i>
                        Fecha de Inicio
                    </label>
                    <input type="date" 
                           class="form-control form-control-sica" 
                           id="fechaInicio" 
                           value="${servicioData.fechaInicio || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-calendar-check"></i>
                        Fecha de Término
                    </label>
                    <input type="date" 
                           class="form-control form-control-sica" 
                           id="fechaTermino" 
                           value="${servicioData.fechaTermino || ''}">
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-key-fill"></i>
                        Clave de Programa
                    </label>
                    <input type="text" 
                           class="form-control form-control-sica" 
                           id="clavePrograma" 
                           value="${servicioData.clavePrograma || 'DGOSE-CI-001'}" 
                           placeholder="DGOSE-CI-001">
                </div>
                <div class="col-md-6">
                    <label class="form-label-sica">
                        <i class="bi bi-briefcase-fill"></i>
                        Programa
                    </label>
                    <input type="text" 
                           class="form-control form-control-sica" 
                           id="programa" 
                           value="${servicioData.programa || 'Sala de informática y cómputo para alumnos (SICA)'}" 
                           placeholder="Programa SICA">
                </div>
            </div>
        `;
    }

// ================================
// GENERACIÓN DE FOLIOS (MÉTODO ACTUALIZADO)
// ================================
    async generateAutoFolio() {
        try {
            const folioInput = document.getElementById('folioInput');
            
            if (!this.currentDocType) {
                this.showNotification('Error', 'Selecciona un tipo de documento primero', 'warning');
                return;
            }
            
            // Obtener configuración actual
            const configRef = this.db.collection('configuracion').doc(this.configDoc);
            const configSnap = await configRef.get();
            
            if (!configSnap.exists) {
                throw new Error('No se pudo acceder a la configuración');
            }
            
            const config = configSnap.data();
            const year = new Date().getFullYear();
            
            let counter, prefix;
            
            if (this.currentDocType.category === 'aceptacion') {
                counter = config.foliocartaaceptacion || 1;
                prefix = 'CI'; // Cambiado de 'CA' a 'CI'
            } else if (this.currentDocType.category === 'termino') {
                counter = config.foliocartatermino || 1;
                prefix = 'CI'; // También cambiado para consistencia
            } else {
                counter = config.folioEvaluacion || 1;
                prefix = 'CI'; // Cambiado de 'EV' a 'CI'
            }
            
            const folio = `${prefix}/${String(counter).padStart(3, '0')}/${year}`;
            folioInput.value = folio;
            
            // Animación visual
            folioInput.classList.add('border-success');
            setTimeout(() => folioInput.classList.remove('border-success'), 2000);
            
            this.showNotification('Folio generado', `Se generó el folio: ${folio}`, 'success');
            
        } catch (error) {
            console.error('❌ Error generando folio automático:', error);
            this.showNotification('Error', 'No se pudo generar el folio automático', 'error');
        }
    }
    // ================================
    // GUARDADO Y GENERACIÓN PDF
    // ================================
    async saveAndGeneratePDF() {
        try {
            this.setLoadingState(true);
            
            // Validar datos
            const formData = this.collectFormData();
            if (!this.validateFormData(formData)) {
                return;
            }
            
            // Actualizar Firebase
            await this.updateFirebaseData(formData);
            
            // Generar PDF
            await this.generatePDF(formData);
            
            // Actualizar historial
            await this.updateHistorial(formData);
            
            this.showNotification(
                'Documento generado', 
                'El PDF se generó exitosamente y los datos se guardaron', 
                'success'
            );
            
        } catch (error) {
            console.error('❌ Error guardando y generando PDF:', error);
            this.showNotification('Error', 'No se pudo completar la operación', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        return {
            folio: document.getElementById('folioInput').value,
            nombreAsesor: document.getElementById('nombreAsesor').value,
            numeroCuenta: document.getElementById('numeroCuenta').value,
            carrera: document.getElementById('carrera').value,
            fechaInicio: document.getElementById('fechaInicio').value,
            fechaTermino: document.getElementById('fechaTermino').value,
            clavePrograma: document.getElementById('clavePrograma').value,
            programa: document.getElementById('programa').value
        };
    }

    validateFormData(data) {
        const required = ['folio', 'nombreAsesor', 'numeroCuenta'];
        
        for (const field of required) {
            if (!data[field]) {
                this.showNotification('Error de validación', `El campo ${field} es requerido`, 'error');
                return false;
            }
        }
        
        return true;
    }

    async updateFirebaseData(formData) {
        // Actualizar servicio social
        const servicioSocialId = `asesor_${formData.numeroCuenta}`;
        const servicioRef = this.db.collection('serviciosocial').doc(servicioSocialId);
        
        const updateData = {
            fechaInicio: formData.fechaInicio,
            fechaTermino: formData.fechaTermino,
            clavePrograma: formData.clavePrograma,
            programa: formData.programa
        };
        
        // Agregar folio según el tipo
        if (this.currentDocType.category === 'aceptacion') {
            updateData.folioAceptacion = formData.folio;
        } else if (this.currentDocType.category === 'termino') {
            updateData.folioTermino = formData.folio;
        }
        
        await servicioRef.set(updateData, { merge: true });
        
        // Actualizar contador en configuración
        await this.updateFolioCounter();
    }

    async updateFolioCounter() {
        const configRef = this.db.collection('configuracion').doc(this.configDoc);
        
        let field;
        if (this.currentDocType.category === 'aceptacion') {
            field = 'foliocartaaceptacion'; // Corregido a minúsculas sin CamelCase
        } else if (this.currentDocType.category === 'termino') {
            field = 'foliocartatermino'; // Corregido a minúsculas sin CamelCase
        } else {
            field = 'folioEvaluacion'; // Este se mantiene igual si es diferente
        }
        
        await configRef.update({
            [field]: firebase.firestore.FieldValue.increment(1)
        });
    }

    async generatePDF(formData) {
        const { type } = this.currentDocType;
        
        // Preparar datos para el generador PDF
        const pdfData = {
            ...formData,
            [`folio${this.currentDocType.category === 'aceptacion' ? 'Aceptacion' : 'Termino'}`]: formData.folio
        };
        
        // Llamar al generador correspondiente
        switch (type) {
            case 'carta-aceptacion-fq':
                await window.generarCartaAceptacionFQPDF(pdfData);
                break;
            case 'carta-aceptacion-prepa':
                await window.generarCartaAceptacionPrepaPDF(pdfData);
                break;
            case 'carta-termino-fq':
                await window.generarCartaTerminoFQPDF(pdfData);
                break;
            case 'carta-termino-prepa':
                await window.generarCartaTerminoPrepaPDF(pdfData);
                break;
            default:
                throw new Error('Tipo de documento no soportado');
        }
    }

    async updateHistorial(formData) {
        const configRef = this.db.collection('configuracion').doc(this.configDoc);
        
        const historialEntry = {
            folio: formData.folio,
            tipo: this.currentDocType.title,
            fecha: new Date().toISOString(),
            asesor: formData.nombreAsesor,
            numeroCuenta: formData.numeroCuenta
        };
        
        await configRef.update({
            historialFolios: firebase.firestore.FieldValue.arrayUnion(historialEntry)
        });
        
        // Recargar historial
        await this.loadHistorial();
    }

    // ================================
    // FOLIO PERSONALIZADO
    // ================================
    showCustomFolioModal() {
        const modal = new bootstrap.Modal(document.getElementById('customFolioModal'));
        
        // Establecer fecha actual
        document.getElementById('customDate').valueAsDate = new Date();
        
        modal.show();
    }

    async saveCustomFolio() {
        try {
            const formData = {
                folio: document.getElementById('customFolio').value,
                nombre: document.getElementById('customName').value,
                fecha: document.getElementById('customDate').value,
                comentario: document.getElementById('customComment').value
            };
            
            if (!formData.folio || !formData.nombre || !formData.fecha || !formData.comentario) {
                this.showNotification('Error', 'Todos los campos son requeridos', 'error');
                return;
            }
            
            // Guardar en colección edgar
            await this.db.collection('edgar').add({
                ...formData,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('customFolioModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('customFolioForm').reset();
            
            this.showNotification('Folio guardado', 'El folio personalizado se guardó correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error guardando folio personalizado:', error);
            this.showNotification('Error', 'No se pudo guardar el folio personalizado', 'error');
        }
    }

    // ================================
    // UTILIDADES
    // ================================
    updatePreview() {
        if (window.documentPreview) {
            const formData = this.collectFormData();
            window.documentPreview.updatePreview(this.currentDocType, formData);
        }
    }

    setLoadingState(loading) {
        this.isLoading = loading;
        const elements = document.querySelectorAll('.btn, .form-control');
        elements.forEach(el => {
            if (loading) {
                el.classList.add('loading-state');
            } else {
                el.classList.remove('loading-state');
            }
        });
    }

    showNotification(title, message, type = 'info', icon = null) {
        if (window.SICAComponents) {
            const iconMap = {
                success: 'bi-check-circle',
                error: 'bi-exclamation-triangle',
                warning: 'bi-exclamation-circle',
                info: 'bi-info-circle'
            };
            
            window.SICAComponents.notify(
                title, 
                message, 
                type, 
                icon || iconMap[type]
            );
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.folioManager = new FolioManager();
    window.folioManager.init();
});

// Exportar para uso global
window.FolioManager = FolioManager;