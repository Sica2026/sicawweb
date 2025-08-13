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
    // MÉTODO PRINCIPAL DE VALIDACIÓN
    // ======================================
    async validateSalaAsignada(numeroCuenta) {
        try {
            console.log('🔍 Iniciando validación de sala para:', numeroCuenta);
            
            // 1. Obtener IP actual del equipo
            const ipActual = await this.getCurrentIP();
            console.log('📍 IP actual detectada:', ipActual);
            
            // 2. Determinar sala actual basada en IP
            const salaActual = this.ipToSala[ipActual];
            if (!salaActual) {
                console.warn('⚠️ IP no reconocida:', ipActual);
                return {
                    valido: true, // Permitir si no podemos determinar la IP
                    mensaje: 'IP no reconocida - validación omitida'
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
            // Método 1: Intentar con WebRTC (más confiable para IP local)
            const ipWebRTC = await this.getIPViaWebRTC();
            if (ipWebRTC && this.ipToSala[ipWebRTC]) {
                return ipWebRTC;
            }
            
            // Método 2: Servicio externo como fallback
            const ipExterno = await this.getIPViaService();
            if (ipExterno && this.ipToSala[ipExterno]) {
                return ipExterno;
            }
            
            // Si no encontramos IP conocida, devolver null
            console.warn('⚠️ No se pudo determinar IP local conocida');
            return null;
            
        } catch (error) {
            console.error('❌ Error obteniendo IP:', error);
            return null;
        }
    }

    // WebRTC para obtener IP local
    getIPViaWebRTC() {
        return new Promise((resolve) => {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            let foundIP = null;
            
            pc.onicecandidate = (ice) => {
                if (!ice || !ice.candidate || !ice.candidate.candidate) return;
                
                const candidate = ice.candidate.candidate;
                const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                
                if (ipMatch && ipMatch[1]) {
                    const ip = ipMatch[1];
                    // Buscar IP que coincida con nuestras salas
                    if (this.ipToSala[ip] && !foundIP) {
                        foundIP = ip;
                        resolve(ip);
                    }
                }
            };
            
            pc.createDataChannel('');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            // Timeout después de 3 segundos
            setTimeout(() => {
                if (!foundIP) {
                    resolve(null);
                }
                pc.close();
            }, 3000);
        });
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
        // Crear modal de error personalizado
        const modalHTML = `
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
    // MÉTODO DE UTILIDAD PARA DEBUGGING
    // ======================================
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
// EXPORTAR PARA USO GLOBAL
// ======================================
window.SalaValidator = SalaValidator;