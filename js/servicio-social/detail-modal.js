// detail-modal.js
// Módulo para modal detallado de servicio social

class DetailModal {
    constructor(core, dataManager, fileManager) {
        this.core = core;
        this.dataManager = dataManager;
        this.fileManager = fileManager;
        this.authRequestManager = new AuthorizationRequestManager(core, dataManager);
        this.setupEventListeners();
    }

    setupEventListeners() {
        const form = document.getElementById('servicioSocialForm');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveServicioSocial();
        });

        document.getElementById('guardarCambios')?.addEventListener('click', () => {
            this.saveServicioSocial();
        });

        document.getElementById('horasAsesor')?.addEventListener('input', () => {
            this.calculateTotalHoras();
        });
        
        document.getElementById('horasServicioSocial')?.addEventListener('input', () => {
            this.calculateTotalHoras();
        });

        document.getElementById('fechaInicio')?.addEventListener('change', () => {
            this.autoCalculateFechaTermino();
        });

        document.getElementById('estadoTermino')?.addEventListener('change', () => {
            this.autoGenerateFolios();
        });

        document.querySelectorAll('[data-doc]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateDocument(btn.getAttribute('data-doc'));
            });
        });

        console.log('📝 Detail modal listeners configurados');
    }

    openModal(asesor) {
        this.core.currentAsesor = asesor;
        this.populateModal(asesor);
        
        const modal = new bootstrap.Modal(document.getElementById('detalleModal'));
        modal.show();
        
        // Cargar estado de solicitudes después de abrir el modal
        setTimeout(() => {
            this.authRequestManager.cargarEstadoSolicitudes();
        }, 200);
    }

    populateModal(asesor) {
        const modalFoto = document.getElementById('modalFoto');
        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');
        
        const nombreCompleto = asesor.nombreAsesor || 'Sin nombre';
        
        if (modalFoto) {
            modalFoto.src = asesor.fotoUrl || '../image/default-avatar.png';
            modalFoto.onerror = () => modalFoto.src = '../image/default-avatar.png';
        }
        
        if (modalTitle) {
            modalTitle.textContent = `Servicio Social - ${nombreCompleto}`;
        }
        
        if (modalSubtitle) {
            modalSubtitle.textContent = `${asesor.escuela || ''} • ${asesor.carrera || ''}`;
        }
        
        // Información personal
        this.core.setElementValue('nombreCompleto', nombreCompleto);
        this.core.setElementValue('numeroCuenta', asesor.numeroCuenta || '');
        this.core.setElementValue('escuela', asesor.escuela || '');
        this.core.setElementValue('carrera', asesor.carrera || '');
        this.core.setElementValue('avance', asesor.avance || '');
        
        // Historial académico
        this.setupHistorialLink(asesor);
        
        // Datos de servicio social
        const ss = asesor.servicioSocial;
        this.core.setElementValue('estadoTermino', ss.estadoTermino || '');
        this.core.setElementValue('fechaInicio', ss.fechaInicio || '');
        this.core.setElementValue('fechaTermino', ss.fechaTermino || '');
        this.core.setElementValue('clavePrograma', ss.clavePrograma || '');
        
        // ✅ MODIFICADO: Ahora obtiene los folios desde solicitudesAutorizacion
        this.core.setElementValue('folioAceptacion', this.core.getFolioAceptacion());
        this.core.setElementValue('folioTermino', this.core.getFolioTermino());
        
        this.core.setElementValue('fechaEntregaCarta', ss.fechaEntregaCarta || '');
        this.core.setElementValue('horasAsesor', ss.horasAsesor || 0);
        this.core.setElementValue('horasServicioSocial', ss.horasServicioSocial || 0);
        this.core.setElementValue('totalHoras', ss.totalHoras || 0);
        this.core.setElementValue('ajustesHoras', ss.ajustesHoras || 0);
        
        // Archivos
        this.fileManager.displayFileStatus('cartaPresentacion', ss.cartaPresentacion);
        this.fileManager.displayFileStatus('cartaAceptacion', ss.cartaAceptacion);
        this.fileManager.displayFileStatus('cartaTermino', ss.cartaTermino);
        this.fileManager.displayFileStatus('reporteSS', ss.reporteSS);

        // Resetear botones de autorización para evitar estados anteriores
        this.authRequestManager.resetearBotones();
    }

    setupHistorialLink(asesor) {
        const historialLink = document.getElementById('historialLink');
        if (historialLink) {
            if (asesor.documentos?.downloadURL) {
                historialLink.href = asesor.documentos.downloadURL;
                historialLink.style.display = 'flex';
                
                // Agregar funcionalidad de vista previa
                historialLink.onclick = (e) => {
                    e.preventDefault();
                    this.previewHistorial(asesor.documentos.downloadURL, 'Historial Académico');
                };
            } else {
                historialLink.style.display = 'none';
            }
        }
    }

    previewHistorial(url, title) {
        const modal = this.createSimpleViewer(url, title);
        document.body.appendChild(modal);
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    createSimpleViewer(url, title) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = `historialViewer_${Date.now()}`;
        modal.setAttribute('tabindex', '-1');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-file-earmark-pdf me-2"></i>${title}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0" style="height: 70vh;">
                        <iframe src="${url}" width="100%" height="100%" frameborder="0"></iframe>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    calculateTotalHoras() {
        const horasAsesor = parseFloat(document.getElementById('horasAsesor')?.value) || 0;
        const horasServicio = parseFloat(document.getElementById('horasServicioSocial')?.value) || 0;
        const total = horasAsesor + horasServicio;
        
        const totalElement = document.getElementById('totalHoras');
        if (totalElement) {
            totalElement.value = total;
        }
    }

    autoCalculateFechaTermino() {
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaTerminoElement = document.getElementById('fechaTermino');
        
        if (fechaInicio && fechaTerminoElement) {
            const inicio = new Date(fechaInicio);
            const termino = new Date(inicio);
            termino.setMonth(termino.getMonth() + 6);
            
            const year = termino.getFullYear();
            const month = String(termino.getMonth() + 1).padStart(2, '0');
            const day = String(termino.getDate()).padStart(2, '0');
            
            fechaTerminoElement.value = `${year}-${month}-${day}`;
        }
    }

    async autoGenerateFolios() {
        const estado = document.getElementById('estadoTermino')?.value;
        
        if (estado === 'ya-registro' || estado === 'en-proceso' || estado === 'terminado') {
            await this.generateFolioAceptacion();
        }
        
        if (estado === 'terminado') {
            await this.generateFolioTermino();
        }
    }

    async generateFolioAceptacion() {
        try {
            const folioElement = document.getElementById('folioAceptacion');
            if (folioElement && !folioElement.value) {
                const folio = await this.core.getNextFolio('foliocartaaceptacion');
                folioElement.value = folio;
            }
        } catch (error) {
            console.error('Error generando folio aceptación:', error);
        }
    }

    async generateFolioTermino() {
        try {
            const folioElement = document.getElementById('folioTermino');
            if (folioElement && !folioElement.value) {
                const folio = await this.core.getNextFolio('foliocartatermino');
                folioElement.value = folio;
            }
        } catch (error) {
            console.error('Error generando folio término:', error);
        }
    }

    async saveServicioSocial() {
        if (!this.core.currentAsesor) return;
        
        try {
            const formData = this.dataManager.getFormData();
            await this.dataManager.saveServicioSocial(formData);
            
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('detalleModal'));
            if (modalInstance) {
                modalInstance.hide();
            }
            
            if (window.uiManager) {
                window.uiManager.renderAsesores();
                window.uiManager.updateStats();
            }
            
            this.core.showNotification('Información guardada exitosamente', 'success');
            
        } catch (error) {
            console.error('Error guardando:', error);
            this.core.showNotification('Error al guardar la información', 'error');
        }
    }

    generateDocument(docType) {
        if (!this.core.currentAsesor) return;
        
        console.log(`📄 Generando documento: ${docType}`);
        
        const docScripts = {
            'carta-termino-fq': 'carta-termino-FQ-pdf.js',
            'carta-termino-prepa': 'carta-termino-prepa.js',
            'carta-aceptacion-fq': 'carta-aceptacion-FQ.js',
            'carta-aceptacion-prepa': 'carta-aceptacion-prepa.js',
            'formato-asesor-ss': 'formato-asesor-ss.js',
            'formato-solo-ss': 'formato-solo-ss.js'
        };
        
        const scriptFile = docScripts[docType];
        
        if (scriptFile) {
            this.core.showNotification(
                'Generando documento...',
                `Preparando ${this.getDocumentName(docType)}`,
                'info',
                'bi-file-earmark-pdf'
            );
            
            const datosAsesor = this.core.prepareAsesorData();
            
            this.loadScript(`../js/documents/${scriptFile}`)
                .then(() => {
                    switch(docType) {
                        case 'carta-termino-fq':
                            return window.generarCartaTerminoFQWord(datosAsesor);
                        case 'carta-termino-prepa':
                            return window.generarCartaTerminoPrepaWord(datosAsesor);
                        case 'carta-aceptacion-fq':
                            return window.generarCartaAceptacionFQWord(datosAsesor);
                        case 'carta-aceptacion-prepa':
                            return window.generarCartaAceptacionPrepaWord(datosAsesor);
                        case 'formato-asesor-ss':
                            return window.generarFormatoAsesorSS(datosAsesor);
                        case 'formato-solo-ss':
                            return window.generarFormatoSoloSS(datosAsesor);
                        default:
                            throw new Error(`Función de generación no encontrada para: ${docType}`);
                    }
                })
                .then((resultado) => {
                    console.log('✅ Documento generado exitosamente:', resultado);
                })
                .catch((error) => {
                    console.error('❌ Error generando documento:', error);
                    this.core.showNotification(
                        'Error al generar documento',
                        `No se pudo generar ${this.getDocumentName(docType)}`,
                        'error'
                    );
                });
                
        } else {
            this.core.showNotification('Tipo de documento no reconocido', 'error');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getDocumentName(docType) {
        const names = {
            'carta-termino-fq': 'Carta de Término FQ',
            'carta-termino-prepa': 'Carta de Término Prepa',
            'carta-aceptacion-fq': 'Carta de Aceptación FQ',
            'carta-aceptacion-prepa': 'Carta de Aceptación Prepa',
            'formato-asesor-ss': 'Formato Asesor + SS',
            'formato-solo-ss': 'Formato Solo SS'
        };
        return names[docType] || docType;
    }
}

window.DetailModal = DetailModal;