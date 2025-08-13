// ======================================
// SALA VALIDATOR - VALIDACIÓN DE UBICACIÓN
// ======================================

class SalaValidator {
    constructor() {
        this.db = firebase.firestore();
        
        // Mapeo de IPs a salas
        this.ipToSala = {
            '192.168.14.42': 'SICA-1',
            '192.168.16.161': 'SICA-2'
        };
        
        // Mapeo de salas a IPs (reverso)
        this.salaToIp = {
            'SICA-1': '192.168.14.42',
            'SICA-2': '192.168.16.161'
        };
        
        // Días de la semana en español
        this.diasSemana = [
            'domingo', 'lunes', 'martes', 'miercoles', 
            'jueves', 'viernes', 'sabado'
        ];
        
        console.log('🏢 SalaValidator inicializado');
    }

    // ======================================
    // MÉTODO PRINCIPAL DE VALIDACIÓN - CON PANTALLA DE PROGRESO
    // ======================================
    async validateSalaAsignada(numeroCuenta, showProgress = true) {
        try {
            console.log('🔍 Iniciando validación de sala para:', numeroCuenta);
            
            // Si hay ValidationManager disponible, usar pantalla de progreso
            if (showProgress && window.validationManager) {
                return await window.validationManager.validateWithProgress(this, numeroCuenta);
            }
            
            // Validación original sin pantalla (fallback)
            return await this.validateSalaAsignadaBasic(numeroCuenta);
            
        } catch (error) {
            console.error('❌ Error en validación de sala:', error);
            if (window.validationManager) {
                window.validationManager.showError('Error durante la validación');
            }
            return {
                valido: true, // En caso de error, permitir el acceso
                mensaje: 'Error en validación - acceso permitido',
                error: error.message
            };
        }
    }

    // ======================================
    // VALIDACIÓN BÁSICA SIN PANTALLA (ORIGINAL)
    // ======================================
    async validateSalaAsignadaBasic(numeroCuenta) {
        try {
            console.log('🔍 Iniciando validación de sala para:', numeroCuenta);
            
            // 1. Obtener IP actual del equipo
            const ipActual = await this.getCurrentIP();
            console.log('📍 IP actual detectada:', ipActual);
            
            // 2. Determinar sala actual basada en IP
            const salaActual = this.ipToSala[ipActual];
            if (!salaActual) {
                console.warn('🚨 IP no autorizada detectada:', ipActual);
                return {
                    valido: false, // 🚨 BLOQUEAR IPs no autorizadas
                    mensaje: `Acceso denegado. Esta IP (${ipActual}) no está autorizada para pase de lista. Solo se permite desde las salas oficiales de SICA.`,
                    ipDetectada: ipActual,
                    salasAutorizadas: Object.values(this.ipToSala)
                };
            }
            
            // 3. Obtener tipoBloque desde configuración
            const tipoBloque = await this.getTipoBloque();
            console.log('📋 TipoBloque obtenido:', tipoBloque);
            
            // 4. Buscar horario asignado
            const horarioAsignado = await this.buscarHorarioAsignado(numeroCuenta, tipoBloque);
            
            if (!horarioAsignado) {
                console.log('📝 No se encontró horario específico - permitiendo acceso');
                return {
                    valido: true,
                    mensaje: 'Sin horario específico asignado'
                };
            }
            
            // 5. Validar que la sala coincida
            const salaAsignada = horarioAsignado.sala;
            console.log('🏢 Sala asignada:', salaAsignada, '| Sala actual:', salaActual);
            
            if (salaAsignada === salaActual) {
                return {
                    valido: true,
                    mensaje: 'Sala correcta',
                    salaAsignada: salaAsignada,
                    salaActual: salaActual
                };
            } else {
                return {
                    valido: false,
                    mensaje: `No te toca este SICA, te toca ${salaAsignada}. Acude a tu sala a pasar lista.`,
                    salaAsignada: salaAsignada,
                    salaActual: salaActual,
                    horario: horarioAsignado
                };
            }
            
        } catch (error) {
            console.error('❌ Error en validación de sala:', error);
            return {
                valido: true, // En caso de error, permitir el acceso
                mensaje: 'Error en validación - acceso permitido',
                error: error.message
            };
        }
    }

    // ======================================
    // OBTENER IP ACTUAL DEL CLIENTE
    // ======================================
    async getCurrentIP() {
        try {
            console.log('🔍 Intentando detectar IP del cliente...');
            
            // Método 1: Intentar con WebRTC (más confiable para IP local)
            console.log('📡 Método 1: WebRTC...');
            const ipWebRTC = await this.getIPViaWebRTC();
            console.log('WebRTC result:', ipWebRTC);
            if (ipWebRTC && this.ipToSala[ipWebRTC]) {
                console.log('✅ IP encontrada via WebRTC:', ipWebRTC);
                return ipWebRTC;
            }
            
            // Método 2: Manual override para testing
            console.log('📡 Método 2: Override manual...');
            const manualIP = this.getManualOverrideIP();
            if (manualIP) {
                console.log('✅ IP manual configurada:', manualIP);
                return manualIP;
            }
            
            // Método 3: Detección por hostname/URL
            console.log('📡 Método 3: Detección por hostname...');
            const hostnameIP = this.getIPFromHostname();
            if (hostnameIP) {
                console.log('✅ IP detectada por hostname:', hostnameIP);
                return hostnameIP;
            }
            
            // Método 4: Servicio externo como fallback
            console.log('📡 Método 4: Servicio externo...');
            const ipExterno = await this.getIPViaService();
            console.log('Servicio externo result:', ipExterno);
            if (ipExterno && this.ipToSala[ipExterno]) {
                console.log('✅ IP encontrada via servicio externo:', ipExterno);
                return ipExterno;
            }
            
            // Si no encontramos IP conocida, devolver null
            console.warn('⚠️ No se pudo determinar IP local conocida con ningún método');
            console.log('💡 IPs válidas esperadas:', Object.keys(this.ipToSala));
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo IP:', error);
            return null;
        }
    }

    // WebRTC para obtener IP local - mejorado
    getIPViaWebRTC() {
        return new Promise((resolve) => {
            console.log('🌐 Iniciando detección WebRTC...');
            
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            let foundIPs = new Set();
            let foundValidIP = null;
            
            pc.onicecandidate = (ice) => {
                if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                
                const candidate = ice.candidate.candidate;
                console.log('📋 Candidate encontrado:', candidate);
                
                // Buscar todas las IPs en el candidate
                const ipMatches = candidate.match(/(\d+\.\d+\.\d+\.\d+)/g);
                
                if (ipMatches) {
                    ipMatches.forEach(ip => {
                        foundIPs.add(ip);
                        console.log('🔍 IP detectada:', ip);
                        
                        // Verificar si es una IP que reconocemos
                        if (this.ipToSala[ip] && !foundValidIP) {
                            foundValidIP = ip;
                            console.log('✅ IP válida encontrada:', ip, '→', this.ipToSala[ip]);
                            resolve(ip);
                        }
                    });
                }
            };
            
            // Crear canal de datos y oferta
            pc.createDataChannel('test');
            pc.createOffer().then(offer => {
                pc.setLocalDescription(offer);
            }).catch(err => {
                console.warn('Error creando oferta WebRTC:', err);
            });
            
            // Timeout más largo y logging detallado
            setTimeout(() => {
                if (!foundValidIP) {
                    console.log('📊 Resumen WebRTC:');
                    console.log('- IPs encontradas:', Array.from(foundIPs));
                    console.log('- IPs válidas esperadas:', Object.keys(this.ipToSala));
                    console.log('- Ninguna IP válida encontrada');
                    resolve(null);
                }
                pc.close();
            }, 5000); // Aumentar timeout a 5 segundos
        });
    }

    // NUEVO: Override manual para testing
    getManualOverrideIP() {
        // Verificar si hay override manual en localStorage o configuración
        try {
            const manualIP = localStorage.getItem('sica_manual_ip');
            if (manualIP && this.ipToSala[manualIP]) {
                console.log('🔧 Usando IP manual configurada:', manualIP);
                return manualIP;
            }
            
            // O verificar variable global para testing
            if (window.SICA_MANUAL_IP && this.ipToSala[window.SICA_MANUAL_IP]) {
                console.log('🔧 Usando IP manual global:', window.SICA_MANUAL_IP);
                return window.SICA_MANUAL_IP;
            }
            
        } catch (error) {
            console.warn('Error verificando IP manual:', error);
        }
        
        return null;
    }

    // NUEVO: Detección por hostname/URL
    getIPFromHostname() {
        try {
            const hostname = window.location.hostname;
            const href = window.location.href;
            
            console.log('🌐 Analizando hostname:', hostname);
            console.log('🌐 URL completa:', href);
            
            // Si el hostname es una IP directa
            if (this.ipToSala[hostname]) {
                return hostname;
            }
            
            // Buscar patrones en la URL que indiquen la sala
            if (href.includes('sica1') || href.includes('sica-1')) {
                return '192.168.14.42'; // SICA-1
            }
            
            if (href.includes('sica2') || href.includes('sica-2')) {
                return '192.168.16.161'; // SICA-2
            }
            
            console.log('⚠️ No se pudo determinar IP por hostname');
            return null;
            
        } catch (error) {
            console.warn('Error analizando hostname:', error);
            return null;
        }
    }

    // Servicio externo como fallback (aunque probablemente dará IP pública)
    async getIPViaService() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('No se pudo obtener IP via servicio externo:', error);
            return null;
        }
    }

    // ======================================
    // OBTENER TIPO BLOQUE DESDE CONFIGURACIÓN
    // ======================================
    async getTipoBloque() {
        try {
            // Intentar con el documento específico primero
            const specificDoc = await this.db.collection('configuracion')
                .doc('qkLlvrqIPsI7HEPKIhyh').get();
            
            if (specificDoc.exists && specificDoc.data().tipoBloque) {
                return specificDoc.data().tipoBloque;
            }
            
            // Fallback: buscar en todos los documentos
            const configSnapshot = await this.db.collection('configuracion').get();
            if (!configSnapshot.empty) {
                for (const doc of configSnapshot.docs) {
                    const configData = doc.data();
                    if (configData.tipoBloque) {
                        return configData.tipoBloque;
                    }
                }
            }
            
            console.warn('⚠️ No se encontró tipoBloque en configuración');
            return 'default';
            
        } catch (error) {
            console.error('❌ Error obteniendo tipoBloque:', error);
            return 'default';
        }
    }

    // ======================================
    // BUSCAR HORARIO ASIGNADO
    // ======================================
    async buscarHorarioAsignado(numeroCuenta, tipoBloque) {
        try {
            const hoy = new Date();
            const diaActual = this.diasSemana[hoy.getDay()]; // 0=domingo, 1=lunes, etc.
            const horaActual = hoy.toLocaleTimeString('es-MX', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            console.log('📅 Buscando horario para:', {
                numeroCuenta,
                tipoBloque,
                diaActual,
                horaActual
            });
            
            // Buscar horarios que coincidan con los criterios
            const horariosSnapshot = await this.db.collection('horarios')
                .where('numeroCuenta', '==', numeroCuenta)
                .where('tipoBloque', '==', tipoBloque)
                .get();
            
            if (horariosSnapshot.empty) {
                console.log('📝 No se encontraron horarios para este asesor y tipoBloque');
                return null;
            }
            
            // Filtrar por día y horario
            for (const doc of horariosSnapshot.docs) {
                const horario = doc.data();
                
                // Verificar si el día actual está en el array de días
                if (!horario.dias || !Array.isArray(horario.dias)) {
                    continue;
                }
                
                const tieneElDia = horario.dias.some(dia => 
                    dia.toLowerCase() === diaActual.toLowerCase()
                );
                
                if (!tieneElDia) {
                    continue;
                }
                
                // Verificar si la hora actual está en el rango
                if (this.estaEnRangoHorario(horaActual, horario.horaInicio, horario.horaFinal)) {
                    console.log('✅ Horario encontrado:', horario);
                    return {
                        ...horario,
                        documentId: doc.id
                    };
                }
            }
            
            console.log('📝 No se encontró horario activo para la hora actual');
            return null;
            
        } catch (error) {
            console.error('❌ Error buscando horario asignado:', error);
            return null;
        }
    }

    // ======================================
    // VERIFICAR SI HORA ESTÁ EN RANGO
    // ======================================
    estaEnRangoHorario(horaActual, horaInicio, horaFinal) {
        try {
            // Convertir horas a minutos para comparación fácil
            const minutosActuales = this.horaAMinutos(horaActual);
            const minutosInicio = this.horaAMinutos(horaInicio);
            const minutosFinal = this.horaAMinutos(horaFinal);
            
            // Manejar caso de horario nocturno (cruza medianoche)
            if (minutosInicio > minutosFinal) {
                // Horario nocturno: ej. 22:00 - 06:00
                return minutosActuales >= minutosInicio || minutosActuales <= minutosFinal;
            } else {
                // Horario normal: ej. 09:00 - 17:00
                return minutosActuales >= minutosInicio && minutosActuales <= minutosFinal;
            }
            
        } catch (error) {
            console.error('❌ Error verificando rango horario:', error);
            return false;
        }
    }

    // Convertir hora en formato HH:MM a minutos
    horaAMinutos(hora) {
        if (!hora) return 0;
        
        const partes = hora.split(':');
        if (partes.length !== 2) return 0;
        
        const horas = parseInt(partes[0], 10) || 0;
        const minutos = parseInt(partes[1], 10) || 0;
        
        return horas * 60 + minutos;
    }

    // ======================================
    // MOSTRAR ERROR DE SALA INCORRECTA
    // ======================================
    mostrarErrorSala(validationResult) {
        let modalHTML;
        
        if (validationResult.ipDetectada && !validationResult.salaAsignada) {
            // Error de IP no autorizada
            modalHTML = `
                <div class="modal fade" id="salaErrorModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content sala-error-modal">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-shield-exclamation text-danger me-2"></i>
                                    Acceso No Autorizado
                                </h5>
                            </div>
                            <div class="modal-body text-center">
                                <div class="sala-error-icon">
                                    <i class="bi bi-shield-x"></i>
                                </div>
                                <h6 class="mt-3 mb-3 text-danger">IP No Autorizada</h6>
                                <p class="sala-info">
                                    <strong>Tu IP:</strong> ${validationResult.ipDetectada}<br>
                                    <strong>Salas autorizadas:</strong> ${validationResult.salasAutorizadas?.join(', ') || 'SICA-1, SICA-2'}
                                </p>
                                <div class="alert alert-danger">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                    Solo puedes pasar lista desde las salas oficiales de SICA
                                </div>
                            </div>
                            <div class="modal-footer justify-content-center">
                                <button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                                    <i class="bi bi-x-lg me-2"></i>
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Error de sala incorrecta normal
            modalHTML = `
                <div class="modal fade" id="salaErrorModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content sala-error-modal">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                                    Sala Incorrecta
                                </h5>
                            </div>
                            <div class="modal-body text-center">
                                <div class="sala-error-icon">
                                    <i class="bi bi-geo-alt-fill"></i>
                                </div>
                                <h6 class="mt-3 mb-3">No te toca este SICA</h6>
                                <p class="sala-info">
                                    <strong>Estás en:</strong> ${validationResult.salaActual}<br>
                                    <strong>Te toca:</strong> ${validationResult.salaAsignada}
                                </p>
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle-fill me-2"></i>
                                    Acude a tu sala asignada para pasar lista
                                </div>
                            </div>
                            <div class="modal-footer justify-content-center">
                                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                                    <i class="bi bi-check-lg me-2"></i>
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Remover modal existente si hay uno
        const existingModal = document.getElementById('salaErrorModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Agregar nuevo modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('salaErrorModal'));
        modal.show();
        
        // Limpiar modal del DOM cuando se cierre
        document.getElementById('salaErrorModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('salaErrorModal').remove();
        });
    }

    // ======================================
    // MÉTODOS DE CONFIGURACIÓN Y TESTING
    // ======================================
    
    // Configurar IP manualmente para testing
    setManualIP(ip) {
        if (this.ipToSala[ip]) {
            localStorage.setItem('sica_manual_ip', ip);
            window.SICA_MANUAL_IP = ip;
            console.log('✅ IP manual configurada:', ip, '→', this.ipToSala[ip]);
            return true;
        } else {
            console.error('❌ IP no válida:', ip);
            console.log('IPs válidas:', Object.keys(this.ipToSala));
            return false;
        }
    }

    // Limpiar configuración manual
    clearManualIP() {
        localStorage.removeItem('sica_manual_ip');
        delete window.SICA_MANUAL_IP;
        console.log('🧹 Configuración manual eliminada');
    }

    // Mostrar todas las IPs detectadas
    async getAllDetectedIPs() {
        console.log('🔍 DETECTANDO TODAS LAS IPs DISPONIBLES');
        console.log('=====================================');
        
        // WebRTC IPs
        const webrtcIPs = await this.getAllWebRTCIPs();
        console.log('📡 IPs detectadas por WebRTC:', webrtcIPs);
        
        // Hostname
        const hostname = window.location.hostname;
        console.log('🌐 Hostname actual:', hostname);
        
        // IP externa
        try {
            const externalIP = await this.getIPViaService();
            console.log('🌍 IP externa:', externalIP);
        } catch (error) {
            console.log('🌍 IP externa: No disponible');
        }
        
        // Configuración manual
        const manualIP = localStorage.getItem('sica_manual_ip');
        console.log('🔧 IP manual configurada:', manualIP || 'Ninguna');
        
        console.log('✅ IPs válidas esperadas:', Object.keys(this.ipToSala));
        console.log('=====================================');
        
        return {
            webrtc: webrtcIPs,
            hostname: hostname,
            manual: manualIP,
            validIPs: Object.keys(this.ipToSala)
        };
    }

    // Obtener todas las IPs de WebRTC (no solo las válidas)
    getAllWebRTCIPs() {
        return new Promise((resolve) => {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            const foundIPs = new Set();
            
            pc.onicecandidate = (ice) => {
                if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                
                const candidate = ice.candidate.candidate;
                const ipMatches = candidate.match(/(\d+\.\d+\.\d+\.\d+)/g);
                
                if (ipMatches) {
                    ipMatches.forEach(ip => foundIPs.add(ip));
                }
            };
            
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            setTimeout(() => {
                resolve(Array.from(foundIPs));
                pc.close();
            }, 3000);
        });
    }
    async debugValidation(numeroCuenta) {
        console.log('🔧 DEBUGGING SALA VALIDATION');
        console.log('================================');
        
        const ipActual = await this.getCurrentIP();
        console.log('IP Actual:', ipActual);
        console.log('Sala Actual:', this.ipToSala[ipActual]);
        
        const tipoBloque = await this.getTipoBloque();
        console.log('Tipo Bloque:', tipoBloque);
        
        const horario = await this.buscarHorarioAsignado(numeroCuenta, tipoBloque);
        console.log('Horario Encontrado:', horario);
        
        const validation = await this.validateSalaAsignada(numeroCuenta);
        console.log('Resultado Validación:', validation);
        
        console.log('================================');
        return validation;
    }
}

// ======================================
// CSS PARA EL MODAL DE ERROR
// ======================================
const salaValidatorStyles = `
    .sala-error-modal .modal-content {
        border: none;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .sala-error-modal .modal-header {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        border-radius: 15px 15px 0 0;
        border-bottom: none;
    }
    
    .sala-error-icon {
        font-size: 4rem;
        color: #ff6b6b;
        margin: 20px 0;
    }
    
    .sala-info {
        font-size: 1.1rem;
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        border-left: 4px solid #ff6b6b;
    }
    
    .sala-error-modal .alert-info {
        background: #e3f2fd;
        border: 1px solid #2196f3;
        color: #1976d2;
    }
`;

// Agregar estilos al documento
if (!document.querySelector('#sala-validator-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'sala-validator-styles';
    styleSheet.textContent = salaValidatorStyles;
    document.head.appendChild(styleSheet);
}

// ======================================
// FUNCIONES GLOBALES PARA TESTING Y CONFIGURACIÓN
// ======================================

// Configurar IP manualmente para testing
window.setSicaIP = function(ip) {
    if (window.paseLista && window.paseLista.salaValidator) {
        return window.paseLista.salaValidator.setManualIP(ip);
    } else {
        console.error('PaseLista no inicializado');
        return false;
    }
};

// Limpiar configuración manual
window.clearSicaIP = function() {
    if (window.paseLista && window.paseLista.salaValidator) {
        window.paseLista.salaValidator.clearManualIP();
    } else {
        console.error('PaseLista no inicializado');
    }
};

// Mostrar todas las IPs detectadas
window.showAllIPs = async function() {
    if (window.paseLista && window.paseLista.salaValidator) {
        return await window.paseLista.salaValidator.getAllDetectedIPs();
    } else {
        console.error('PaseLista no inicializado');
        return null;
    }
};

// Función rápida para configurar SICA-1
window.setSica1 = function() {
    return window.setSicaIP('192.168.14.42');
};

// Función rápida para configurar SICA-2
window.setSica2 = function() {
    return window.setSicaIP('192.168.16.161');
};

// 🚨 NUEVO: Probar validación con pantalla de progreso
window.testValidationScreen = async function(numeroCuenta = '314302498') {
    if (window.validationManager) {
        await window.validationManager.simulateValidation(numeroCuenta);
    } else {
        console.error('ValidationManager no disponible');
    }
};

// 🚨 NUEVO: Probar validación real con pantalla
window.testRealValidation = async function(numeroCuenta = '314302498') {
    if (window.paseLista && window.paseLista.salaValidator) {
        return await window.paseLista.salaValidator.validateSalaAsignada(numeroCuenta, true);
    } else {
        console.error('PaseLista no inicializado');
        return null;
    }
};

console.log('🏢 SalaValidator cargado con funciones de testing:');
console.log('📋 Funciones disponibles:');
console.log('- setSica1() → Configurar como SICA-1');
console.log('- setSica2() → Configurar como SICA-2');
console.log('- setSicaIP("192.168.x.x") → Configurar IP específica');
console.log('- clearSicaIP() → Limpiar configuración manual');
console.log('- showAllIPs() → Mostrar todas las IPs detectadas');
console.log('- testValidationScreen() → 🆕 Probar pantalla de validación');
console.log('- testRealValidation() → 🆕 Probar validación real con pantalla');

// ======================================
// EXPORTAR PARA USO GLOBAL
// ======================================
window.SalaValidator = SalaValidator;