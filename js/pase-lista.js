// ======================================
// PASE DE LISTA - MAIN FUNCTIONALITY
// ======================================

class PaseLista {
    constructor() {
        this.db = firebase.firestore();
        this.currentStream = null;
        this.activityLog = [];
        this.entryCount = 0;
        this.exitCount = 0;
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTodaysActivity();
        this.updateStats();
        
        console.log('📋 Sistema de Pase de Lista inicializado');
    }

    setupEventListeners() {
        // Manual entry form
        const form = document.getElementById('manualEntryForm');
        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const entryBtn = document.getElementById('entryBtn');
        const exitBtn = document.getElementById('exitBtn');
        const toggleCameraBtn = document.getElementById('toggleCameraBtn');
        const completeRecordsBtn = document.getElementById('completeRecordsBtn');

        // Form validation
        numeroCuentaInput?.addEventListener('input', (e) => {
            this.validateNumeroCuenta(e.target.value);
        });

        // Entry/Exit buttons
        entryBtn?.addEventListener('click', () => {
            this.handleManualEntry('entrada');
        });

        exitBtn?.addEventListener('click', () => {
            this.handleManualEntry('salida');
        });

        // Camera toggle
        toggleCameraBtn?.addEventListener('click', () => {
            this.toggleCamera();
        });

        // Complete records modal
        completeRecordsBtn?.addEventListener('click', () => {
            this.openCompleteRecordsModal();
        });

        // Enter key submit
        numeroCuentaInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                e.preventDefault();
                this.handleManualEntry('entrada');
            }
        });
    }

    validateNumeroCuenta(numeroCuenta) {
        const input = document.getElementById('numeroCuentaInput');
        const feedback = document.getElementById('inputFeedback');
        
        // Remove non-numeric characters
        const cleaned = numeroCuenta.replace(/\D/g, '');
        if (cleaned !== numeroCuenta) {
            input.value = cleaned;
        }

        // Validate length and format
        if (cleaned.length === 0) {
            feedback.textContent = '';
            feedback.className = 'input-feedback';
            return false;
        } else if (cleaned.length < 9) {
            feedback.textContent = 'El número de cuenta debe tener 9 dígitos';
            feedback.className = 'input-feedback invalid';
            return false;
        } else if (cleaned.length === 9) {
            feedback.textContent = '✓ Número de cuenta válido';
            feedback.className = 'input-feedback valid';
            return true;
        }

        return false;
    }

    async handleManualEntry(tipo) {
        if (this.isProcessing) return;

        const numeroCuentaInput = document.getElementById('numeroCuentaInput');
        const numeroCuenta = numeroCuentaInput.value.trim();

        if (!this.validateNumeroCuenta(numeroCuenta)) {
            this.showError('Por favor ingresa un número de cuenta válido');
            this.shakeInput(numeroCuentaInput);
            return;
        }

        this.isProcessing = true;
        const button = tipo === 'entrada' ? document.getElementById('entryBtn') : document.getElementById('exitBtn');
        
        try {
            // Show loading state
            this.setButtonLoading(button, true);

            // Search for asesor by numeroCuenta field
            const asesorQuery = await this.db.collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .get();
            
            if (asesorQuery.empty) {
                throw new Error('Número de cuenta no encontrado en el sistema');
            }

            const asesorDoc = asesorQuery.docs[0];
            const asesorData = asesorDoc.data();
            const nombreAsesor = asesorData.nombreAsesor || 'Asesor';

            // Create registro
            const registro = {
                numeroCuenta: numeroCuenta,
                nombreAsesor: nombreAsesor,
                tipo: tipo,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                fecha: new Date().toDateString(),
                hora: new Date().toLocaleTimeString('es-MX', { hour12: false }),
                metodo: 'manual'
            };

            // Save to Firestore in registroasistencia collection
            await this.db.collection('registroasistencia').add(registro);

            // Show success
            this.showSuccessScreen(nombreAsesor, tipo);
            
            // Add to local log
            this.addToActivityLog({
                ...registro,
                timestamp: new Date()
            });

            // Clear form
            numeroCuentaInput.value = '';
            document.getElementById('inputFeedback').textContent = '';
            document.getElementById('inputFeedback').className = 'input-feedback';

            // Update stats
            if (tipo === 'entrada') {
                this.entryCount++;
            } else {
                this.exitCount++;
            }
            this.updateStats();

        } catch (error) {
            console.error('Error en registro:', error);
            this.showError(error.message || 'Error al procesar el registro');
            this.shakeInput(numeroCuentaInput);
        } finally {
            this.setButtonLoading(button, false);
            this.isProcessing = false;
        }
    }

    async toggleCamera() {
        const video = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        const toggleBtn = document.getElementById('toggleCameraBtn');
        const statusIndicator = document.querySelector('#facialStatus .status-indicator');
        const statusText = document.querySelector('#facialStatus .status-text');
        const scanFrame = document.querySelector('.scan-frame');

        try {
            if (!this.currentStream) {
                // Request camera access
                this.currentStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });

                video.srcObject = this.currentStream;
                video.style.display = 'block';
                placeholder.style.display = 'none';
                
                // Update UI
                toggleBtn.innerHTML = '<i class="bi bi-camera-video-off"></i><span>Desactivar Cámara</span>';
                statusIndicator.classList.add('active');
                statusText.textContent = 'Activo';
                scanFrame.classList.add('active');

                // Start facial recognition (if available)
                if (window.FacialRecognition) {
                    window.FacialRecognition.startRecognition(video, (result) => {
                        this.handleFacialRecognition(result);
                    });
                }

            } else {
                // Stop camera
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;

                video.style.display = 'none';
                placeholder.style.display = 'flex';
                
                // Update UI
                toggleBtn.innerHTML = '<i class="bi bi-camera-video"></i><span>Activar Cámara</span>';
                statusIndicator.classList.remove('active');
                statusText.textContent = 'Desactivado';
                scanFrame.classList.remove('active');

                // Stop facial recognition
                if (window.FacialRecognition) {
                    window.FacialRecognition.stopRecognition();
                }
            }
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            this.showError('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }

    async handleFacialRecognition(recognitionResult) {
        if (this.isProcessing || !recognitionResult.confidence || recognitionResult.confidence < 0.8) {
            return;
        }

        this.isProcessing = true;

        try {
            const numeroCuenta = recognitionResult.numeroCuenta;
            
            // Search for asesor by numeroCuenta field
            const asesorQuery = await this.db.collection('asesores')
                .where('numeroCuenta', '==', numeroCuenta)
                .get();
            
            if (asesorQuery.empty) {
                console.warn('Rostro reconocido pero asesor no encontrado:', numeroCuenta);
                return;
            }

            const asesorDoc = asesorQuery.docs[0];
            const asesorData = asesorDoc.data();
            const nombreAsesor = asesorData.nombreAsesor || 'Asesor';

            // Determine entry or exit based on last record
            const tipo = await this.determineEntryOrExit(numeroCuenta);

            // Create registro
            const registro = {
                numeroCuenta: numeroCuenta,
                nombreAsesor: nombreAsesor,
                tipo: tipo,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                fecha: new Date().toDateString(),
                hora: new Date().toLocaleTimeString('es-MX', { hour12: false }),
                metodo: 'facial',
                confidence: recognitionResult.confidence
            };

            // Save to Firestore in registroasistencia collection
            await this.db.collection('registroasistencia').add(registro);

            // Show success
            this.showSuccessScreen(nombreAsesor, tipo);
            
            // Add to local log
            this.addToActivityLog({
                ...registro,
                timestamp: new Date()
            });

            // Update stats
            if (tipo === 'entrada') {
                this.entryCount++;
            } else {
                this.exitCount++;
            }
            this.updateStats();

        } catch (error) {
            console.error('Error en reconocimiento facial:', error);
        } finally {
            // Reset processing after a delay to avoid multiple triggers
            setTimeout(() => {
                this.isProcessing = false;
            }, 3000);
        }
    }

    async determineEntryOrExit(numeroCuenta) {
        try {
            const today = new Date().toDateString();
            const registros = await this.db.collection('registroasistencia')
                .where('numeroCuenta', '==', numeroCuenta)
                .where('fecha', '==', today)
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (registros.empty) {
                return 'entrada'; // First record of the day
            }

            const lastRecord = registros.docs[0].data();
            return lastRecord.tipo === 'entrada' ? 'salida' : 'entrada';
        } catch (error) {
            console.error('Error determining entry/exit:', error);
            return 'entrada'; // Default to entry
        }
    }

    showSuccessScreen(nombreAsesor, tipo) {
        const screenId = tipo === 'entrada' ? 'welcomeScreen' : 'exitScreen';
        const nameId = tipo === 'entrada' ? 'welcomeName' : 'exitName';
        const timeId = tipo === 'entrada' ? 'welcomeTime' : 'exitTime';
        
        const screen = document.getElementById(screenId);
        const nameElement = document.getElementById(nameId);
        const timeElement = document.getElementById(timeId);
        
        if (screen && nameElement && timeElement) {
            nameElement.textContent = nombreAsesor;
            timeElement.textContent = new Date().toLocaleString('es-MX');
            
            screen.style.display = 'flex';
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                screen.style.display = 'none';
            }, 3000);
        }

        // Play success sound
        this.playSuccessSound();
    }

    addToActivityLog(registro) {
        const logContainer = document.getElementById('activityLog');
        const emptyState = logContainer.querySelector('.log-empty');
        
        // Remove empty state
        if (emptyState) {
            emptyState.remove();
        }

        // Create log item
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const iconClass = registro.tipo === 'entrada' ? 'entry' : 'exit';
        const iconName = registro.tipo === 'entrada' ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right';
        
        logItem.innerHTML = `
            <div class="log-icon ${iconClass}">
                <i class="${iconName}"></i>
            </div>
            <div class="log-details">
                <div class="log-name">${registro.nombreAsesor}</div>
                <div class="log-account">${registro.numeroCuenta}</div>
                <div class="log-time">${registro.hora} - ${registro.metodo}</div>
            </div>
        `;

        // Add to top of log
        logContainer.insertBefore(logItem, logContainer.firstChild);

        // Keep only last 10 items
        const items = logContainer.querySelectorAll('.log-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }

        // Add to local array
        this.activityLog.unshift(registro);
        if (this.activityLog.length > 10) {
            this.activityLog.pop();
        }
    }

    updateStats() {
        const entryCountElement = document.getElementById('entryCount');
        const exitCountElement = document.getElementById('exitCount');
        
        if (entryCountElement) entryCountElement.textContent = this.entryCount;
        if (exitCountElement) exitCountElement.textContent = this.exitCount;
    }

    async loadTodaysActivity() {
        try {
            const today = new Date().toDateString();
            const snapshot = await this.db.collection('registroasistencia')
                .where('fecha', '==', today)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            let entryCount = 0;
            let exitCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                this.addToActivityLog({
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });

                if (data.tipo === 'entrada') entryCount++;
                else exitCount++;
            });

            this.entryCount = entryCount;
            this.exitCount = exitCount;
            this.updateStats();

        } catch (error) {
            console.error('Error loading today\'s activity:', error);
        }
    }

    openCompleteRecordsModal() {
        const modal = new bootstrap.Modal(document.getElementById('completeRecordsModal'));
        modal.show();
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

    shakeInput(input) {
        input.classList.add('error-shake');
        setTimeout(() => {
            input.classList.remove('error-shake');
        }, 500);
    }

    showError(message) {
        // Use existing notification system
        if (window.modernNav) {
            window.modernNav.showModernNotification(
                'Error',
                message,
                'error',
                'bi-exclamation-triangle-fill'
            );
        } else {
            alert(message); // Fallback
        }
    }

    playSuccessSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play success sound:', error);
        }
    }

    destroy() {
        // Clean up camera stream
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        // Stop facial recognition
        if (window.FacialRecognition) {
            window.FacialRecognition.stopRecognition();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    firebase.auth().onAuthStateChanged(() => {
        window.paseLista = new PaseLista();
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.paseLista) {
        window.paseLista.destroy();
    }
});

// Add CSS for loading spinner animation
if (!document.querySelector('#spinner-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation-styles';
    style.textContent = `
        .loading-spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}