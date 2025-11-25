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
        this.salaValidator = new SalaValidator();
        
        // 🚨 NUEVO: Inicializar configuración
        this.initializeConfiguration();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTodaysActivity();
        this.updateStats();
        
        console.log('📋 Sistema de Pase de Lista inicializado');
    }

    // 🚨 CORREGIDO: Inicializar configuración mejorada
    async initializeConfiguration() {
        try {
            // 🚨 NUEVO: Auto-detectar sala si no está configurada
            await this.autoDetectSalaIfNeeded();

            const configSnapshot = await this.db.collection('configuracion').get();

            if (configSnapshot.empty) {
                // Solo crear si la colección está completamente vacía
                await this.db.collection('configuracion').add({
                    tipoBloque: 'default',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Documento de configuración inicializado');
            } else {
                // Verificar si al menos un documento tiene tipoBloque
                let tieneTipoBloque = false;
                configSnapshot.docs.forEach(doc => {
                    if (doc.data().tipoBloque) {
                        tieneTipoBloque = true;
                    }
                });

                if (!tieneTipoBloque) {
                    console.warn('⚠️ No se encontró campo tipoBloque en los documentos existentes');
                } else {
                    console.log('✅ Configuración existente encontrada');
                }
            }
        } catch (error) {
            console.error('❌ Error inicializando configuración:', error);
        }
    }

    // 🚨 NUEVO: Auto-detectar sala automáticamente si no está configurada
    async autoDetectSalaIfNeeded() {
        try {
            // Verificar si ya hay configuración guardada
            const ipConfigManual = localStorage.getItem('sica_ip_configurada');

            if (ipConfigManual) {
                console.log('✅ Configuración de sala ya existe:', ipConfigManual);
                return;
            }

            // Si no hay configuración, intentar auto-detectar
            console.log('🔍 No hay configuración de sala, intentando auto-detectar...');
            const salaDetectada = await this.salaValidator.autoDetectAndConfigureIP();

            if (salaDetectada) {
                console.log('✅ Sala auto-configurada:', salaDetectada);
            } else {
                console.log('⚠️ No se pudo auto-detectar sala. Usa setSica1() o setSica2() en la consola.');
            }

        } catch (error) {
            console.warn('⚠️ Error en auto-detección de sala:', error);
        }
    }

    // 🚨 NUEVO: Método híbrido para obtener tipoBloque (RECOMENDADO)
    async getTipoBloqueHibrido() {
        try {
            // Primero intentar con el ID específico que viste en la imagen
            const specificDoc = await this.db.collection('configuracion').doc('qkLlvrqIPsI7HEPKIhyh').get();
            if (specificDoc.exists && specificDoc.data().tipoBloque) {
                console.log('✅ TipoBloque encontrado en documento específico:', specificDoc.data().tipoBloque);
                return specificDoc.data().tipoBloque;
            }
            
            // Si no funciona, buscar en todos los documentos
            const configSnapshot = await this.db.collection('configuracion').get();
            if (!configSnapshot.empty) {
                for (const doc of configSnapshot.docs) {
                    const configData = doc.data();
                    if (configData.tipoBloque) {
                        console.log('✅ TipoBloque encontrado en búsqueda general:', configData.tipoBloque, 'documento:', doc.id);
                        return configData.tipoBloque;
                    }
                }
            }
            
            console.warn('⚠️ No se encontró tipoBloque en ningún lugar');
            return 'default';
            
        } catch (error) {
            console.error('❌ Error en getTipoBloqueHibrido:', error);
            return 'default';
        }
    }

    // 🚨 NUEVO: Método para actualizar tipoBloque en configuración
    async updateTipoBloque(nuevoTipoBloque) {
        try {
            // Intentar actualizar el documento específico primero
            const specificDoc = await this.db.collection('configuracion').doc('qkLlvrqIPsI7HEPKIhyh').get();
            if (specificDoc.exists) {
                await this.db.collection('configuracion').doc('qkLlvrqIPsI7HEPKIhyh').update({
                    tipoBloque: nuevoTipoBloque,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ TipoBloque actualizado en documento específico:', nuevoTipoBloque);
                return true;
            }
            
            // Si no existe el documento específico, buscar cualquier documento con tipoBloque
            const configSnapshot = await this.db.collection('configuracion').get();
            if (!configSnapshot.empty) {
                for (const doc of configSnapshot.docs) {
                    if (doc.data().tipoBloque !== undefined) {
                        await doc.ref.update({
                            tipoBloque: nuevoTipoBloque,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('✅ TipoBloque actualizado en documento:', doc.id, nuevoTipoBloque);
                        return true;
                    }
                }
            }
            
            console.warn('⚠️ No se encontró documento para actualizar');
            return false;
        } catch (error) {
            console.error('❌ Error actualizando tipoBloque:', error);
            return false;
        }
    }

    setupEventListeners() {
    // Manual entry form
    const form = document.getElementById('manualEntryForm');
    const numeroCuentaInput = document.getElementById('numeroCuentaInput');
    const registerBtn = document.getElementById('registerBtn'); // Solo un botón
    const toggleCameraBtn = document.getElementById('toggleCameraBtn');
    const completeRecordsBtn = document.getElementById('completeRecordsBtn');

    // Form validation
    numeroCuentaInput?.addEventListener('input', (e) => {
        this.validateNumeroCuenta(e.target.value);
    });

    // CAMBIO: Solo un botón que detecta automáticamente
    registerBtn?.addEventListener('click', () => {
        this.handleManualEntry();
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
            this.handleManualEntry();
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
        // Reset button
        this.resetRegisterButton();
        return false;
    } else if (cleaned.length < 9) {
        feedback.textContent = 'El número de cuenta debe tener 9 dígitos';
        feedback.className = 'input-feedback invalid';
        return false;
    } else if (cleaned.length === 9) {
        feedback.textContent = '✓ Número de cuenta válido';
        feedback.className = 'input-feedback valid';
        
        // Mostrar qué tipo de registro se hará
        this.showUpcomingRegistrationType(cleaned);
        
        return true;
    }

    return false;
}

async handleManualEntry() {
    if (this.isProcessing) return;

    const numeroCuentaInput = document.getElementById('numeroCuentaInput');
    const numeroCuenta = numeroCuentaInput.value.trim();

    if (!this.validateNumeroCuenta(numeroCuenta)) {
        this.showError('Por favor ingresa un número de cuenta válido');
        this.shakeInput(numeroCuentaInput);
        return;
    }

    this.isProcessing = true;
    const registerBtn = document.getElementById('registerBtn');
    
    try {
        this.setButtonLoading(registerBtn, true);

        // 🚨 NUEVO: Validar sala antes de procesar
        console.log('🔍 Validando sala asignada...');
        const salaValidation = await this.salaValidator.validateSalaAsignada(numeroCuenta);
        
        if (!salaValidation.valido) {
            console.warn('❌ Sala incorrecta:', salaValidation);
            this.salaValidator.mostrarErrorSala(salaValidation);
            return; // Detener procesamiento
        }
        
        console.log('✅ Validación de sala exitosa:', salaValidation.mensaje);

        // Buscar asesor
        const asesorQuery = await this.db.collection('asesores')
            .where('numeroCuenta', '==', numeroCuenta)
            .get();
        
        if (asesorQuery.empty) {
            throw new Error('Número de cuenta no encontrado en el sistema');
        }

        const asesorDoc = asesorQuery.docs[0];
        const asesorData = asesorDoc.data();
        const nombreAsesor = asesorData.nombreAsesor || 'Asesor';

        // Determinar si es entrada o salida
        const tipo = await this.determineEntryOrExit(numeroCuenta);
        
        let registroResultado;

        if (tipo === 'entrada') {
            // Crear nuevo registro incompleto
            const docRef = await this.createIncompleteRecord(numeroCuenta, nombreAsesor, tipo, 'manual');
            const docSnapshot = await docRef.get();
            registroResultado = docSnapshot.data();
            registroResultado.id = docRef.id;
        } else {
            // Completar registro existente
            const incompleteRecord = await this.findTodaysIncompleteRecord(numeroCuenta);
            if (incompleteRecord.exists) {
                registroResultado = await this.completeExistingRecord(
                    incompleteRecord.doc.ref, 
                    incompleteRecord.data, 
                    tipo, 
                    'manual'
                );
                registroResultado.id = incompleteRecord.doc.id;
            } else {
                throw new Error('No se encontró registro de entrada para completar');
            }
        }

        // Mostrar éxito
        this.showSuccessScreen(nombreAsesor, tipo, registroResultado);
        
        // Agregar al log local
        this.addToActivityLog({
            numeroCuenta: numeroCuenta,
            nombreAsesor: nombreAsesor,
            tipo: tipo,
            timestamp: new Date(),
            hora: tipo === 'entrada' ? registroResultado.entrada?.horaOriginal : registroResultado.salida?.horaOriginal,
            metodo: 'manual',
            completo: registroResultado.completo || false
        });

        // Limpiar formulario
        numeroCuentaInput.value = '';
        document.getElementById('inputFeedback').textContent = '';
        document.getElementById('inputFeedback').className = 'input-feedback';
        this.resetRegisterButton();

        // Actualizar estadísticas
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
        this.setButtonLoading(registerBtn, false);
        this.isProcessing = false;
    }
}


async showUpcomingRegistrationType(numeroCuenta) {
    try {
        const tipo = await this.determineEntryOrExit(numeroCuenta);
        const registerBtn = document.getElementById('registerBtn');
        
        if (tipo === 'entrada') {
            registerBtn.className = 'btn-action btn-entry btn-highlighted';
            registerBtn.innerHTML = `
                <i class="bi bi-box-arrow-in-right"></i>
                <span>Registrar Entrada</span>
            `;
        } else {
            registerBtn.className = 'btn-action btn-exit btn-highlighted';
            registerBtn.innerHTML = `
                <i class="bi bi-box-arrow-right"></i>
                <span>Registrar Salida</span>
            `;
        }
    } catch (error) {
        // Reset button on error
        this.resetRegisterButton();
    }
}

resetRegisterButton() {
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.className = 'btn-action btn-primary';
        registerBtn.innerHTML = `
            <i class="bi bi-person-check"></i>
            <span>Registrar Asistencia</span>
        `;
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
        
        // 🚨 NUEVO: Validar sala antes de procesar reconocimiento facial
        console.log('🔍 Validando sala para reconocimiento facial...');
        const salaValidation = await this.salaValidator.validateSalaAsignada(numeroCuenta);
        
        if (!salaValidation.valido) {
            console.warn('❌ Sala incorrecta en reconocimiento facial:', salaValidation);
            this.salaValidator.mostrarErrorSala(salaValidation);
            this.disableCameraAfterRegistration();
            return; // Detener procesamiento
        }
        
        console.log('✅ Validación de sala exitosa para facial:', salaValidation.mensaje);
        
        // Buscar asesor
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

        // Determinar entrada o salida
        const tipo = await this.determineEntryOrExit(numeroCuenta);
        
        let registroResultado;

        if (tipo === 'entrada') {
            // Crear nuevo registro incompleto
            const docRef = await this.createIncompleteRecord(
                numeroCuenta, 
                nombreAsesor, 
                tipo, 
                'facial', 
                recognitionResult.confidence
            );
            const docSnapshot = await docRef.get();
            registroResultado = docSnapshot.data();
            registroResultado.id = docRef.id;
        } else {
            // Completar registro existente
            const incompleteRecord = await this.findTodaysIncompleteRecord(numeroCuenta);
            if (incompleteRecord.exists) {
                registroResultado = await this.completeExistingRecord(
                    incompleteRecord.doc.ref, 
                    incompleteRecord.data, 
                    tipo, 
                    'facial',
                    recognitionResult.confidence
                );
                registroResultado.id = incompleteRecord.doc.id;
            } else {
                console.warn('No se encontró registro de entrada para completar');
                return;
            }
        }

        // Desactivar cámara inmediatamente tras registro exitoso
        this.disableCameraAfterRegistration();

        // Mostrar éxito
        this.showSuccessScreen(nombreAsesor, tipo, registroResultado);
        
        // Agregar al log local
        this.addToActivityLog({
            numeroCuenta: numeroCuenta,
            nombreAsesor: nombreAsesor,
            tipo: tipo,
            timestamp: new Date(),
            hora: tipo === 'entrada' ? registroResultado.entrada?.horaOriginal : registroResultado.salida?.horaOriginal,
            metodo: 'facial',
            confidence: recognitionResult.confidence,
            completo: registroResultado.completo || false
        });

        // Actualizar estadísticas
        if (tipo === 'entrada') {
            this.entryCount++;
        } else {
            this.exitCount++;
        }
        this.updateStats();

    } catch (error) {
        console.error('Error en reconocimiento facial:', error);
        // En caso de error, también desactivar la cámara para evitar problemas
        this.disableCameraAfterRegistration();
    } finally {
        // Reducir el tiempo de bloqueo ya que la cámara se desactivará
        setTimeout(() => {
            this.isProcessing = false;
        }, 1000);
    }
}

async debugSalaValidation(numeroCuenta) {
    if (!this.salaValidator) {
        console.error('SalaValidator no inicializado');
        return;
    }
    
    return await this.salaValidator.debugValidation(numeroCuenta);
}

async testSalaValidation() {
    console.log('🧪 TESTING SALA VALIDATION');
    
    // Test con diferentes números de cuenta
    const testNumbers = ['322327964', '314302498', '317197914'];
    
    for (const numeroCuenta of testNumbers) {
        console.log(`\n--- Testing ${numeroCuenta} ---`);
        const result = await this.debugSalaValidation(numeroCuenta);
        console.log('Result:', result);
    }
}

// 🚨 NUEVO MÉTODO: Desactivar cámara después de registro
disableCameraAfterRegistration() {
    try {
        // Detener el stream de la cámara
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }

        // Actualizar la UI
        const video = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        const toggleBtn = document.getElementById('toggleCameraBtn');
        const statusIndicator = document.querySelector('#facialStatus .status-indicator');
        const statusText = document.querySelector('#facialStatus .status-text');
        const scanFrame = document.querySelector('.scan-frame');

        if (video && placeholder && toggleBtn) {
            video.style.display = 'none';
            placeholder.style.display = 'flex';
            
            // Actualizar botón
            toggleBtn.innerHTML = '<i class="bi bi-camera-video"></i><span>Activar Cámara</span>';
            
            // Actualizar indicadores de estado
            if (statusIndicator) statusIndicator.classList.remove('active');
            if (statusText) statusText.textContent = 'Desactivado';
            if (scanFrame) scanFrame.classList.remove('active');
        }

        // Detener reconocimiento facial
        if (window.FacialRecognition) {
            window.FacialRecognition.stopRecognition();
        }

        console.log('📷 Cámara desactivada automáticamente tras registro exitoso');

    } catch (error) {
        console.error('Error al desactivar cámara:', error);
    }
}

async determineEntryOrExit(numeroCuenta) {
    try {
        // Buscar si hay un registro incompleto del día de hoy
        const incompleteRecord = await this.findTodaysIncompleteRecord(numeroCuenta);
        
        if (incompleteRecord.exists) {
            // Si hay un registro incompleto, debe ser salida
            const data = incompleteRecord.data;
            if (data.entrada && !data.salida) {
                return 'salida';
            }
            return 'entrada';
        }
        
        // Si no hay registro incompleto, es entrada (nuevo registro)
        return 'entrada';
        
    } catch (error) {
        console.error('Error determining entry/exit:', error);
        return 'entrada';
    }
}

showSuccessScreen(nombreAsesor, tipo, registroData = null) {
    const screenId = tipo === 'entrada' ? 'welcomeScreen' : 'exitScreen';
    const nameId = tipo === 'entrada' ? 'welcomeName' : 'exitName';
    const timeId = tipo === 'entrada' ? 'welcomeTime' : 'exitTime';
    
    const screen = document.getElementById(screenId);
    const nameElement = document.getElementById(nameId);
    const timeElement = document.getElementById(timeId);
    
    if (screen && nameElement && timeElement) {
        nameElement.textContent = nombreAsesor;
        
        let timeText = new Date().toLocaleString('es-MX');
        
        // Mostrar hora redondeada y tiempo trabajado si es salida
        if (tipo === 'entrada' && registroData && registroData.entrada) {
            timeText += ` • Hora redondeada: ${registroData.entrada.horaRedondeada}`;
        } else if (tipo === 'salida' && registroData && registroData.salida && registroData.horasTrabajadas) {
            timeText += ` • Hora redondeada: ${registroData.salida.horaRedondeada} • Tiempo trabajado: ${registroData.horasTrabajadas}`;
        }
        
        timeElement.textContent = timeText;
        
        // 🚨 NUEVO: Agregar mensaje sobre reactivación de cámara
        const infoMessage = document.createElement('div');
        infoMessage.className = 'camera-info-message';
        infoMessage.innerHTML = `
            <i class="bi bi-info-circle"></i>
            Cámara desactivada. El siguiente asesor debe reactivarla.
        `;
        timeElement.appendChild(infoMessage);
        
        screen.style.display = 'flex';
        
        // Auto hide después de tiempo extendido para leer el mensaje
        const hideTime = tipo === 'salida' ? 6000 : 4000; // Más tiempo para leer
        setTimeout(() => {
            screen.style.display = 'none';
            // Limpiar mensaje informativo
            if (infoMessage.parentNode) {
                infoMessage.remove();
            }
        }, hideTime);
    }

    this.playSuccessSound();
}

async findTodaysIncompleteRecord(numeroCuenta) {
    try {
        const today = new Date().toDateString();
        const registros = await this.db.collection('registroasistencia')
            .where('numeroCuenta', '==', numeroCuenta)
            .where('fecha', '==', today)
            .where('completo', '==', false)
            .limit(1)
            .get();

        if (!registros.empty) {
            return {
                exists: true,
                doc: registros.docs[0],
                data: registros.docs[0].data()
            };
        }
        
        return { exists: false };
    } catch (error) {
        console.error('Error buscando registro incompleto:', error);
        return { exists: false };
    }
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
    
    // Preparar texto adicional
    let extraInfo = '';
    if (registro.tipo === 'salida' && registro.horasTrabajadas) {
        extraInfo = ` • ${registro.horasTrabajadas}`;
    }
    if (!registro.completo && registro.tipo === 'entrada') {
        extraInfo = ' • Pendiente de salida';
    }
    
    logItem.innerHTML = `
        <div class="log-icon ${iconClass}">
            <i class="${iconName}"></i>
        </div>
        <div class="log-details">
            <div class="log-name">${registro.nombreAsesor}</div>
            <div class="log-account">${registro.numeroCuenta}</div>
            <div class="log-time">${registro.hora} - ${registro.metodo}${extraInfo}</div>
        </div>
    `;

    // Add to top of log
    logContainer.insertBefore(logItem, logContainer.firstChild);

    // Keep only last 15 items (más items porque ahora hay entrada y salida)
    const items = logContainer.querySelectorAll('.log-item');
    if (items.length > 15) {
        items[items.length - 1].remove();
    }

    // Add to local array
    this.activityLog.unshift(registro);
    if (this.activityLog.length > 15) {
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
        
        // Cargar registros incompletos (solo entradas)
        const incompleteSnapshot = await this.db.collection('registroasistencia')
            .where('fecha', '==', today)
            .where('completo', '==', false)
            .orderBy('fechaCompleta', 'desc')
            .get();

        // Cargar registros completos del día (desde asistenciasemana)
        const completeSnapshot = await this.db.collection('asistenciasemana')
            .where('fecha', '==', today)
            .orderBy('fechaCompleta', 'desc')
            .get();

        let entryCount = 0;
        let exitCount = 0;

        // Procesar registros incompletos (solo entradas)
        incompleteSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.entrada) {
                this.addToActivityLog({
                    numeroCuenta: data.numeroCuenta,
                    nombreAsesor: data.nombreAsesor,
                    tipo: 'entrada',
                    timestamp: data.entrada.timestamp?.toDate() || new Date(),
                    hora: data.entrada.horaOriginal,
                    metodo: data.entrada.metodo,
                    completo: false
                });
                entryCount++;
            }
        });

        // Procesar registros completos (entrada y salida)
        completeSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Agregar entrada al log
            if (data.entrada) {
                this.addToActivityLog({
                    numeroCuenta: data.numeroCuenta,
                    nombreAsesor: data.nombreAsesor,
                    tipo: 'entrada',
                    timestamp: data.entrada.timestamp?.toDate() || new Date(),
                    hora: data.entrada.horaOriginal,
                    metodo: data.entrada.metodo,
                    completo: true
                });
                entryCount++;
            }
            
            // Agregar salida al log
            if (data.salida) {
                this.addToActivityLog({
                    numeroCuenta: data.numeroCuenta,
                    nombreAsesor: data.nombreAsesor,
                    tipo: 'salida',
                    timestamp: data.salida.timestamp?.toDate() || new Date(),
                    hora: data.salida.horaOriginal,
                    metodo: data.salida.metodo,
                    completo: true,
                    horasTrabajadas: data.horasTrabajadas
                });
                exitCount++;
            }
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

    redondearHora(hora) {
    const partes = hora.split(":");
    let horas = parseInt(partes[0], 10);
    let minutos = parseInt(partes[1], 10);
    
    if (minutos <= 10) {
        minutos = 0;
    } else if (minutos <= 40) {
        minutos = 30;
    } else {
        minutos = 0;
        horas = (horas + 1) % 24;
    }
    
    const horasFormateadas = horas.toString().padStart(2, "0");
    const minutosFormateados = minutos.toString().padStart(2, "0");
    return `${horasFormateadas}:${minutosFormateados}`;
}

// 2. NUEVA FUNCIÓN - Calcular horas trabajadas entre dos horas redondeadas
calcularHorasTrabajadas(horaEntrada, horaSalida) {
    // Convertir horas a minutos
    const [horasEntrada, minutosEntrada] = horaEntrada.split(':').map(Number);
    const [horasSalida, minutosSalida] = horaSalida.split(':').map(Number);
    
    const minutosEntradaTotal = horasEntrada * 60 + minutosEntrada;
    let minutosSalidaTotal = horasSalida * 60 + minutosSalida;
    
    // Manejar caso de trabajo nocturno (cruzar medianoche)
    if (minutosSalidaTotal <= minutosEntradaTotal) {
        minutosSalidaTotal += 24 * 60; // Agregar 24 horas
    }
    
    const minutosTrabajados = minutosSalidaTotal - minutosEntradaTotal;
    
    // Convertir a horas y minutos
    const horas = Math.floor(minutosTrabajados / 60);
    const minutos = minutosTrabajados % 60;
    
    return `${horas}h ${minutos}m`;
}

async createIncompleteRecord(numeroCuenta, nombreAsesor, tipo, metodo, confidence = null) {
    const horaActual = new Date().toLocaleTimeString('es-MX', { hour12: false });
    const horaRedondeada = this.redondearHora(horaActual);
    
    const registro = {
        numeroCuenta: numeroCuenta,
        nombreAsesor: nombreAsesor,
        fecha: new Date().toDateString(),
        fechaCompleta: new Date(),
        completo: false,
        metodo: metodo
    };

    // Agregar campos según el tipo
    if (tipo === 'entrada') {
        registro.entrada = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            horaOriginal: horaActual,
            horaRedondeada: horaRedondeada,
            metodo: metodo
        };
        if (confidence) registro.entrada.confidence = confidence;
        
        registro.salida = null;
    } else {
        // Esto no debería pasar en un registro nuevo, pero por seguridad
        registro.salida = {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            horaOriginal: horaActual,
            horaRedondeada: horaRedondeada,
            metodo: metodo
        };
        if (confidence) registro.salida.confidence = confidence;
        
        registro.entrada = null;
    }

    return await this.db.collection('registroasistencia').add(registro);
}

async completeExistingRecord(docRef, docData, tipo, metodo, confidence = null) {
    const horaActual = new Date().toLocaleTimeString('es-MX', { hour12: false });
    const horaRedondeada = this.redondearHora(horaActual);
    
    const updateData = {
        completo: true
    };

    // Agregar datos de salida
    updateData.salida = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        horaOriginal: horaActual,
        horaRedondeada: horaRedondeada,
        metodo: metodo
    };
    
    if (confidence) updateData.salida.confidence = confidence;

    // Actualizar el registro
    await docRef.update(updateData);
    
    // Obtener el registro completo actualizado
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    
    // Mover a asistenciasemana
    await this.moveToWeeklyAttendance(updatedData, docRef);
    
    return updatedData;
}

// 🚨 MODIFICADO: Método moveToWeeklyAttendance con tipoBloque híbrido
async moveToWeeklyAttendance(registroData, originalDocRef) {
    try {
        // Calcular horas trabajadas usando las horas redondeadas
        const horasTrabajadas = this.calcularHorasTrabajadas(
            registroData.entrada.horaRedondeada,
            registroData.salida.horaRedondeada
        );
        
        // Determinar método principal (si ambos son iguales, usar ese; si no, "mixed")
        let metodoFinal = registroData.entrada.metodo;
        if (registroData.entrada.metodo !== registroData.salida.metodo) {
            metodoFinal = 'mixed';
        }

        // 🚨 NUEVO: Obtener tipoBloque usando método híbrido
        const tipoBloque = await this.getTipoBloqueHibrido();
        
        // Preparar los datos para asistenciasemana
        const weeklyRecord = {
            numeroCuenta: registroData.numeroCuenta,
            nombreAsesor: registroData.nombreAsesor,
            fecha: registroData.fecha,
            fechaCompleta: registroData.fechaCompleta,
            completo: true,
            metodo: metodoFinal,
            entrada: registroData.entrada,
            salida: registroData.salida,
            horasTrabajadas: horasTrabajadas,
            tipoBloque: tipoBloque // 🚨 NUEVO CAMPO agregado
        };

        // Agregar a asistenciasemana
        await this.db.collection('asistenciasemana').add(weeklyRecord);
        
        // Eliminar de registroasistencia
        await originalDocRef.delete();
        
        console.log('✅ Registro movido a asistenciasemana:', registroData.numeroCuenta, 'Horas:', horasTrabajadas, 'TipoBloque:', tipoBloque);
        
    } catch (error) {
        console.error('Error moviendo registro a asistenciasemana:', error);
        throw error;
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
    
    // 🚨 NUEVO: Limpiar SalaValidator si es necesario
    if (this.salaValidator) {
        // SalaValidator no necesita cleanup especial por ahora
        this.salaValidator = null;
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
        .camera-info-message {
            margin-top: 10px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            font-size: 0.9rem;
            color: #6c757d;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .camera-info-message i {
            color: #0d6efd;
        }
    `;
    document.head.appendChild(style);
}