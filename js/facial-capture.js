// ======================================
// FACIAL CAPTURE - COMPLETE RECORDS MODAL
// ======================================

class FacialCapture {
    constructor() {
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentStream = null;
        this.capturedImage = null;
        this.currentAsesor = null;
        this.currentStep = 1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('📸 Sistema de captura facial inicializado');
    }

    setupEventListeners() {
        // Modal event listeners
        const modal = document.getElementById('completeRecordsModal');
        const searchBtn = document.getElementById('searchAsesorBtn');
        const captureBtn = document.getElementById('captureBtn');
        const retakeBtn = document.getElementById('retakeBtn');
        const saveRecordBtn = document.getElementById('saveRecordBtn');
        const startOverBtn = document.getElementById('startOverBtn');
        const modalNumeroCuenta = document.getElementById('modalNumeroCuenta');

        // Modal shown event
        modal?.addEventListener('shown.bs.modal', () => {
            this.resetModal();
        });

        // Modal hidden event
        modal?.addEventListener('hidden.bs.modal', () => {
            this.cleanup();
        });

        // Search asesor
        searchBtn?.addEventListener('click', () => {
            this.searchAsesor();
        });

        // Enter key on input
        modalNumeroCuenta?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchAsesor();
            }
        });

        // Input validation
        modalNumeroCuenta?.addEventListener('input', (e) => {
            const cleaned = e.target.value.replace(/\D/g, '');
            if (cleaned !== e.target.value) {
                e.target.value = cleaned;
            }
        });

        // Capture photo
        captureBtn?.addEventListener('click', () => {
            this.capturePhoto();
        });

        // Retake photo
        retakeBtn?.addEventListener('click', () => {
            this.retakePhoto();
        });

        // Save record
        saveRecordBtn?.addEventListener('click', () => {
            this.saveRecord();
        });

        // Start over
        startOverBtn?.addEventListener('click', () => {
            this.resetModal();
        });
    }

    resetModal() {
        this.currentStep = 1;
        this.currentAsesor = null;
        this.capturedImage = null;
        
        // Reset form
        document.getElementById('modalNumeroCuenta').value = '';
        
        // Show only step 1
        this.showStep(1);
        
        // Stop any camera stream
        this.stopCamera();
    }

    showStep(stepNumber) {
        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) {
                step.style.display = i === stepNumber ? 'block' : 'none';
            }
        }
        this.currentStep = stepNumber;
    }

    async searchAsesor() {
        const input = document.getElementById('modalNumeroCuenta');
        const numeroCuenta = input.value.trim();

        if (numeroCuenta.length !== 9) {
            this.showModalError('Por favor ingresa un número de cuenta válido de 9 dígitos');
            return;
        }

        try {
            // Show loading
            const searchBtn = document.getElementById('searchAsesorBtn');
            this.setButtonLoading(searchBtn, true);

            // Search in Firestore by numeroCuenta field
            const asesorQuery = await this.db.collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .get();

            if (asesorQuery.empty) {
                throw new Error('No se encontró un asesor con ese número de cuenta');
            }

            // Get the first (and should be only) document
            const asesorDoc = asesorQuery.docs[0];
            const asesorData = asesorDoc.data();
            
            this.currentAsesor = {
                id: asesorDoc.id, // Store document ID for updates
                numeroCuenta: numeroCuenta,
                ...asesorData
            };

            // Show asesor info
            this.displayAsesorInfo(asesorData);
            
            // Move to step 2
            this.showStep(2);

            // Auto advance to step 3 after showing info
            setTimeout(() => {
                this.showStep(3);
                this.startCamera();
            }, 2000);

        } catch (error) {
            console.error('Error searching asesor:', error);
            this.showModalError(error.message || 'Error al buscar el asesor');
        } finally {
            const searchBtn = document.getElementById('searchAsesorBtn');
            this.setButtonLoading(searchBtn, false);
        }
    }

    displayAsesorInfo(asesorData) {
        const asesorInfoContainer = document.getElementById('asesorInfo');
        
        asesorInfoContainer.innerHTML = `
            <div class="asesor-card">
                <h6><i class="bi bi-person-fill me-2"></i>Información del Asesor</h6>
                <p><strong>Nombre:</strong> ${asesorData.nombreAsesor || 'No especificado'}</p>
                <p><strong>Número de Cuenta:</strong> ${this.currentAsesor.numeroCuenta}</p>
                <p><strong>Estado:</strong> <span class="badge bg-success">Encontrado</span></p>
                ${asesorData.faceData ? 
                    '<p><i class="bi bi-camera-fill text-warning me-2"></i>Ya tiene registro facial - se actualizará</p>' : 
                    '<p><i class="bi bi-camera text-info me-2"></i>Sin registro facial - se creará nuevo</p>'
                }
            </div>
        `;
    }

    async startCamera() {
        const video = document.getElementById('modalCameraVideo');
        
        try {
            this.currentStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            video.srcObject = this.currentStream;
            video.play();

            // Enable capture button
            document.getElementById('captureBtn').disabled = false;

        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showModalError('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    capturePhoto() {
        const video = document.getElementById('modalCameraVideo');
        const canvas = document.getElementById('captureCanvas');
        const context = canvas.getContext('2d');

        if (!video.videoWidth || !video.videoHeight) {
            this.showModalError('La cámara no está lista. Espera un momento e intenta de nuevo.');
            return;
        }

        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0);

        // Convert to blob
        canvas.toBlob((blob) => {
            this.capturedImage = blob;
            
            // Show preview
            const preview = document.getElementById('capturePreview');
            preview.src = URL.createObjectURL(blob);
            
            // Move to confirmation step
            this.showStep(4);
            
            // Stop camera
            this.stopCamera();
            
        }, 'image/jpeg', 0.8);

        // Provide visual feedback
        this.flashCapture();
    }

    retakePhoto() {
        // Go back to step 3
        this.showStep(3);
        this.startCamera();
        
        // Clean up previous capture
        if (this.capturedImage) {
            URL.revokeObjectURL(document.getElementById('capturePreview').src);
            this.capturedImage = null;
        }
    }

    async saveRecord() {
        if (!this.currentAsesor || !this.capturedImage) {
            this.showModalError('Datos incompletos para guardar el registro');
            return;
        }

        try {
            const saveBtn = document.getElementById('saveRecordBtn');
            this.setButtonLoading(saveBtn, true);

            // Process face data (if face recognition library is available)
            let faceData = null;
            if (window.FacialRecognition) {
                try {
                    const canvas = document.getElementById('captureCanvas');
                    faceData = await window.FacialRecognition.extractFaceData(canvas);
                } catch (error) {
                    console.warn('Could not extract face data:', error);
                }
            }

            if (!faceData) {
                throw new Error('No se pudieron extraer los datos faciales de la imagen');
            }

            // Update asesor document (WITHOUT uploading image)
            const updateData = {
                faceData: faceData,
                faceDataUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: 'facial-capture-system'
                // faceImageUrl: imageUrl, // ❌ Comentado - no guarda imagen
            };

            await this.db.collection('asesores').doc(this.currentAsesor.id).update(updateData);

            // Show success
            this.showModalSuccess('Registro facial guardado exitosamente (solo vectores)');

            // Close modal after success
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('completeRecordsModal'));
                modal.hide();
            }, 2000);

        } catch (error) {
            console.error('Error saving facial record:', error);
            this.showModalError('Error al guardar el registro facial: ' + error.message);
        } finally {
            const saveBtn = document.getElementById('saveRecordBtn');
            this.setButtonLoading(saveBtn, false);
        }
    }

    flashCapture() {
        // Create flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
            opacity: 0.8;
            pointer-events: none;
        `;
        
        document.body.appendChild(flash);
        
        // Remove flash after animation
        setTimeout(() => {
            flash.remove();
        }, 150);

        // Play capture sound
        this.playCaptureSound();
    }

    playCaptureSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Camera shutter sound simulation
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.warn('Could not play capture sound:', error);
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalContent = button.innerHTML;
            button.setAttribute('data-original-content', originalContent);
            button.innerHTML = `
                <i class="bi bi-arrow-clockwise loading-spinner"></i>
                <span>Procesando...</span>
            `;
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const originalContent = button.getAttribute('data-original-content');
            if (originalContent) {
                button.innerHTML = originalContent;
                button.removeAttribute('data-original-content');
            }
        }
    }

    showModalError(message) {
        // Create error alert in modal
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-3';
        errorAlert.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to current step
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            // Remove existing alerts
            const existingAlerts = currentStepElement.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
            
            currentStepElement.appendChild(errorAlert);
        }
    }

    showModalSuccess(message) {
        // Create success alert in modal
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success alert-dismissible fade show mt-3';
        successAlert.innerHTML = `
            <i class="bi bi-check-circle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to current step
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            // Remove existing alerts
            const existingAlerts = currentStepElement.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
            
            currentStepElement.appendChild(successAlert);
        }
    }

    cleanup() {
        // Stop camera
        this.stopCamera();
        
        // Clean up captured image
        if (this.capturedImage) {
            const preview = document.getElementById('capturePreview');
            if (preview && preview.src) {
                URL.revokeObjectURL(preview.src);
            }
            this.capturedImage = null;
        }
        
        // Reset state
        this.currentAsesor = null;
        this.currentStep = 1;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.facialCapture = new FacialCapture();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.facialCapture) {
        window.facialCapture.cleanup();
    }
});