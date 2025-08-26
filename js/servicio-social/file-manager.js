// file-manager.js
// Módulo para gestión y visualización de archivos

class FileManager {
    constructor(core) {
        this.core = core;
        this.supportedFormats = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
        this.setupFileUploads();
    }

    setupFileUploads() {
        const fileInputs = ['cartaPresentacion', 'cartaAceptacion', 'cartaTermino', 'reporteSS'];
        
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => {
                    this.handleFileUpload(e, inputId);
                });
            }
        });

        console.log('📁 File manager configurado');
    }

    handleFileUpload(event, inputId) {
        const file = event.target.files[0];
        if (!file) return;
        
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
        
        this.displayFilePreview(event.target, file, inputId);
        
        if (!this.core.currentAsesor.servicioSocial.pendingFiles) {
            this.core.currentAsesor.servicioSocial.pendingFiles = {};
        }
        this.core.currentAsesor.servicioSocial.pendingFiles[inputId] = file;
    }

    displayFilePreview(input, file, inputId) {
        const container = input.closest('.file-upload-area');
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (display) display.style.display = 'none';
        if (current) {
            current.style.display = 'flex';
            const fileName = current.querySelector('.file-name');
            if (fileName) {
                fileName.textContent = file.name;
            }

            // Agregar botón de vista previa
            this.addPreviewButton(current, file, inputId);
        }
    }

    addPreviewButton(container, file, inputId) {
        // Eliminar botón existente si existe
        const existingBtn = container.querySelector('.btn-file-preview');
        if (existingBtn) {
            existingBtn.remove();
        }

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn-file-preview';
        previewBtn.innerHTML = '<i class="bi bi-eye"></i>';
        previewBtn.title = 'Vista previa';
        previewBtn.type = 'button';
        
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.previewFile(file, inputId);
        });

        // Insertar antes del botón de eliminar
        const removeBtn = container.querySelector('.btn-file-remove');
        if (removeBtn) {
            container.insertBefore(previewBtn, removeBtn);
        } else {
            container.appendChild(previewBtn);
        }
    }

    displayFileStatus(inputId, fileData) {
        const container = document.getElementById(inputId)?.closest('.file-upload-area');
        if (!container) return;
        
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (fileData && fileData.url) {
            if (display) display.style.display = 'none';
            if (current) {
                current.style.display = 'flex';
                const fileName = current.querySelector('.file-name');
                if (fileName) {
                    fileName.textContent = fileData.name || 'Archivo cargado';
                }
                
                // Agregar botón de vista previa para archivos guardados
                this.addPreviewButtonForSavedFile(current, fileData, inputId);
                
                const removeBtn = current.querySelector('.btn-file-remove');
                if (removeBtn) {
                    removeBtn.onclick = () => this.removeFile(inputId);
                }
            }
        } else {
            if (display) display.style.display = 'flex';
            if (current) current.style.display = 'none';
        }
    }

    addPreviewButtonForSavedFile(container, fileData, inputId) {
        const existingBtn = container.querySelector('.btn-file-preview');
        if (existingBtn) {
            existingBtn.remove();
        }

        const previewBtn = document.createElement('button');
        previewBtn.className = 'btn-file-preview';
        previewBtn.innerHTML = '<i class="bi bi-eye"></i>';
        previewBtn.title = 'Vista previa';
        previewBtn.type = 'button';
        
        previewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.previewSavedFile(fileData, inputId);
        });

        const removeBtn = container.querySelector('.btn-file-remove');
        if (removeBtn) {
            container.insertBefore(previewBtn, removeBtn);
        } else {
            container.appendChild(previewBtn);
        }
    }

    async previewFile(file, inputId) {
        try {
            const fileURL = URL.createObjectURL(file);
            this.openFileViewer(fileURL, file.name, file.type, inputId);
        } catch (error) {
            console.error('Error creando vista previa:', error);
            this.core.showNotification('Error al crear vista previa', 'error');
        }
    }

    previewSavedFile(fileData, inputId) {
        if (fileData.url) {
            this.openFileViewer(fileData.url, fileData.name, 'application/pdf', inputId);
        } else {
            this.core.showNotification('URL del archivo no disponible', 'error');
        }
    }

    openFileViewer(url, fileName, fileType, inputId) {
        // Crear modal de vista previa
        const modal = this.createViewerModal(url, fileName, fileType, inputId);
        document.body.appendChild(modal);
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Remover modal al cerrar
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    createViewerModal(url, fileName, fileType, inputId) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = `fileViewer_${Date.now()}`;
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('data-bs-backdrop', 'static');
        
        const documentTypeLabel = this.getDocumentTypeLabel(inputId);
        
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
        } else if (fileType.startsWith('image/')) {
            return `
                <div class="d-flex justify-content-center align-items-center h-100 bg-light">
                    <img src="${url}" class="img-fluid" style="max-height: 100%; max-width: 100%;" alt="Vista previa de imagen">
                </div>
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

    getDocumentTypeLabel(inputId) {
        const labels = {
            'cartaPresentacion': 'Carta de Presentación',
            'cartaAceptacion': 'Carta de Aceptación Firmada',
            'cartaTermino': 'Carta de Término',
            'reporteSS': 'Reporte de Servicio Social'
        };
        return labels[inputId] || 'Documento';
    }

    getAsesorName() {
        return this.core.currentAsesor?.nombreAsesor || 'Sin nombre';
    }

    removeFile(inputId) {
        const input = document.getElementById(inputId);
        const container = input?.closest('.file-upload-area');
        if (!container) return;
        
        const display = container.querySelector('.file-upload-display');
        const current = container.querySelector('.file-current');
        
        if (input) input.value = '';
        if (display) display.style.display = 'flex';
        if (current) current.style.display = 'none';
        
        if (!this.core.currentAsesor.servicioSocial.filesToDelete) {
            this.core.currentAsesor.servicioSocial.filesToDelete = [];
        }
        this.core.currentAsesor.servicioSocial.filesToDelete.push(inputId);
        
        if (this.core.currentAsesor.servicioSocial.pendingFiles) {
            delete this.core.currentAsesor.servicioSocial.pendingFiles[inputId];
        }
    }
}

window.FileManager = FileManager;