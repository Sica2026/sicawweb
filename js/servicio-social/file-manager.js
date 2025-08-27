// file-manager.js (actualizado para nuevo diseño)
// Módulo para gestión y visualización de archivos

class FileManager {
    constructor(core) {
        this.core = core;
        this.supportedFormats = ['pdf'];
        this.setupFileUploads();
    }

    setupFileUploads() {
        const documentCards = document.querySelectorAll('.document-card');
        
        documentCards.forEach(card => {
            const documentType = card.getAttribute('data-document');
            const input = card.querySelector('.document-input');
            const primaryAction = card.querySelector('.document-action.primary');
            const secondaryAction = card.querySelector('.document-action.secondary');
            const dangerAction = card.querySelector('.document-action.danger');
            
            if (input && primaryAction) {
                // Click en botón principal abre selector
                primaryAction.addEventListener('click', () => {
                    input.click();
                });
                
                // Manejar selección de archivo
                input.addEventListener('change', (e) => {
                    this.handleFileUpload(e, documentType);
                });
                
                // Vista previa
                secondaryAction?.addEventListener('click', () => {
                    this.previewDocument(documentType);
                });
                
                // Eliminar archivo
                dangerAction?.addEventListener('click', () => {
                    this.removeFile(documentType);
                });
                
                // Drag and drop
                this.setupDragDrop(card, input, documentType);
            }
        });

        console.log('File manager configurado para nuevo diseño');
    }

    setupDragDrop(card, input, documentType) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            card.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            card.addEventListener(eventName, () => {
                card.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            card.addEventListener(eventName, () => {
                card.classList.remove('drag-over');
            });
        });

        card.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    handleFileUpload(event, documentType) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validaciones
        if (file.type !== 'application/pdf') {
            this.core.showNotification('Solo se permiten archivos PDF', 'warning');
            event.target.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.core.showNotification('El archivo no debe superar los 10MB', 'warning');
            event.target.value = '';
            return;
        }
        
        this.showDocumentLoaded(documentType, file.name, file);
        
        // Guardar en pendingFiles
        if (!this.core.currentAsesor.servicioSocial.pendingFiles) {
            this.core.currentAsesor.servicioSocial.pendingFiles = {};
        }
        this.core.currentAsesor.servicioSocial.pendingFiles[documentType] = file;
    }

    showDocumentLoaded(documentType, fileName, file) {
        const card = document.querySelector(`[data-document="${documentType}"]`);
        if (!card) return;
        
        // Elementos UI
        const emptyState = card.querySelector('.document-empty');
        const loadedState = card.querySelector('.document-loaded');
        const fileNameElement = card.querySelector('.file-name');
        const secondaryAction = card.querySelector('.document-action.secondary');
        const dangerAction = card.querySelector('.document-action.danger');
        
        // Actualizar UI
        if (emptyState) emptyState.style.display = 'none';
        if (loadedState) loadedState.style.display = 'block';
        if (fileNameElement) fileNameElement.textContent = fileName;
        if (secondaryAction) secondaryAction.style.display = 'flex';
        if (dangerAction) dangerAction.style.display = 'flex';
        
        // Guardar referencia del archivo para preview
        card.setAttribute('data-file-loaded', 'true');
        if (file) {
            card._fileObject = file;
        }
    }

    displayFileStatus(documentType, fileData) {
        const card = document.querySelector(`[data-document="${documentType}"]`);
        if (!card) return;
        
        if (fileData && fileData.url) {
            this.showDocumentLoaded(documentType, fileData.name || 'Archivo cargado');
            card._fileData = fileData;
        } else {
            this.showDocumentEmpty(documentType);
        }
    }

    showDocumentEmpty(documentType) {
        const card = document.querySelector(`[data-document="${documentType}"]`);
        if (!card) return;
        
        const emptyState = card.querySelector('.document-empty');
        const loadedState = card.querySelector('.document-loaded');
        const secondaryAction = card.querySelector('.document-action.secondary');
        const dangerAction = card.querySelector('.document-action.danger');
        
        if (emptyState) emptyState.style.display = 'block';
        if (loadedState) loadedState.style.display = 'none';
        if (secondaryAction) secondaryAction.style.display = 'none';
        if (dangerAction) dangerAction.style.display = 'none';
        
        card.removeAttribute('data-file-loaded');
        delete card._fileObject;
        delete card._fileData;
    }

    previewDocument(documentType) {
        const card = document.querySelector(`[data-document="${documentType}"]`);
        if (!card) return;
        
        if (card._fileObject) {
            // Archivo nuevo (pendiente de subir)
            this.previewFile(card._fileObject, documentType);
        } else if (card._fileData) {
            // Archivo ya guardado
            this.previewSavedFile(card._fileData, documentType);
        }
    }

    async previewFile(file, documentType) {
        try {
            const fileURL = URL.createObjectURL(file);
            this.openFileViewer(fileURL, file.name, file.type, documentType);
        } catch (error) {
            console.error('Error creando vista previa:', error);
            this.core.showNotification('Error al crear vista previa', 'error');
        }
    }

    previewSavedFile(fileData, documentType) {
        if (fileData.url) {
            this.openFileViewer(fileData.url, fileData.name, 'application/pdf', documentType);
        } else {
            this.core.showNotification('URL del archivo no disponible', 'error');
        }
    }

    openFileViewer(url, fileName, fileType, documentType) {
        const modal = this.createViewerModal(url, fileName, fileType, documentType);
        document.body.appendChild(modal);
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    createViewerModal(url, fileName, fileType, documentType) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = `fileViewer_${Date.now()}`;
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('data-bs-backdrop', 'static');
        
        const documentTypeLabel = this.getDocumentTypeLabel(documentType);
        
        modal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-file-earmark-pdf me-2 fs-4"></i>
                            <div>
                                <h5 class="modal-title mb-0">${documentTypeLabel}</h5>
                                <small class="text-white-50">${fileName}</small>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-light btn-sm" onclick="window.open('${url}', '_blank')">
                                <i class="bi bi-box-arrow-up-right me-1"></i>Abrir en nueva pestaña
                            </button>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                    </div>
                    <div class="modal-body p-0 position-relative" style="height: 70vh;">
                        ${this.createViewerContent(url, fileType)}
                    </div>
                    <div class="modal-footer bg-light">
                        <div class="d-flex justify-content-between w-100 align-items-center">
                            <div class="text-muted small">
                                <i class="bi bi-info-circle me-1"></i>
                                ${documentTypeLabel} - ${this.getAsesorName()}
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" onclick="this.closest('.modal').querySelector('iframe, embed, object').contentWindow.print()" title="Imprimir">
                                    <i class="bi bi-printer me-1"></i>Imprimir
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle me-1"></i>Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }

    createViewerContent(url, fileType) {
        if (fileType === 'application/pdf' || url.toLowerCase().includes('.pdf')) {
            return `
                <iframe 
                    src="${url}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0"
                    style="border: none;"
                    title="Vista previa del documento PDF">
                    <p>Su navegador no soporta la vista previa de PDF. 
                    <a href="${url}" target="_blank">Haga clic aquí para abrir el archivo</a>.</p>
                </iframe>
            `;
        } else {
            return `
                <div class="d-flex justify-content-center align-items-center h-100 text-center">
                    <div>
                        <i class="bi bi-file-earmark display-1 text-muted mb-3"></i>
                        <p class="text-muted">Vista previa no disponible para este tipo de archivo</p>
                        <a href="${url}" target="_blank" class="btn btn-primary">
                            <i class="bi bi-box-arrow-up-right me-1"></i>Abrir archivo
                        </a>
                    </div>
                </div>
            `;
        }
    }

    removeFile(documentType) {
        const card = document.querySelector(`[data-document="${documentType}"]`);
        const input = card?.querySelector('.document-input');
        
        if (input) input.value = '';
        
        this.showDocumentEmpty(documentType);
        
        // Marcar para eliminación
        if (!this.core.currentAsesor.servicioSocial.filesToDelete) {
            this.core.currentAsesor.servicioSocial.filesToDelete = [];
        }
        this.core.currentAsesor.servicioSocial.filesToDelete.push(documentType);
        
        // Remover de archivos pendientes
        if (this.core.currentAsesor.servicioSocial.pendingFiles) {
            delete this.core.currentAsesor.servicioSocial.pendingFiles[documentType];
        }
    }

    getDocumentTypeLabel(documentType) {
        const labels = {
            'cartaPresentacion': 'Carta de Presentación',
            'cartaAceptacion': 'Carta de Aceptación Firmada',
            'cartaTermino': 'Carta de Término',
            'reporteSS': 'Reporte de Servicio Social'
        };
        return labels[documentType] || 'Documento';
    }

    getAsesorName() {
        return this.core.currentAsesor?.nombreAsesor || 'Sin nombre';
    }
}

window.FileManager = FileManager;