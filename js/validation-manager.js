// ======================================
// VALIDATION MANAGER - PANTALLA DE VALIDACIÓN
// ======================================

class ValidationManager {
    constructor() {
        this.isShowing = false;
        this.currentStep = null;
        this.steps = ['ip', 'config', 'schedule', 'sala'];
        this.stepMessages = {
            ip: 'Detectando tu ubicación actual...',
            config: 'Obteniendo configuración del sistema...',
            schedule: 'Buscando tu horario asignado...',
            sala: 'Verificando que estés en la sala correcta...'
        };
    }

    // ======================================
    // MOSTRAR PANTALLA DE VALIDACIÓN
    // ======================================
    show(numeroCuenta = '') {
        if (this.isShowing) return;

        const screen = document.getElementById('validationScreen');
        if (!screen) {
            console.error('Validation screen not found in DOM');
            return;
        }

        // Reset all steps
        this.resetSteps();
        
        // Update message
        const messageEl = document.getElementById('validationMessage');
        if (messageEl && numeroCuenta) {
            messageEl.textContent = `Verificando información para cuenta: ${numeroCuenta}`;
        }

        // Show screen with animation
        screen.style.display = 'flex';
        screen.classList.add('show');
        this.isShowing = true;

        console.log('🔄 Pantalla de validación mostrada');
    }

    // ======================================
    // OCULTAR PANTALLA DE VALIDACIÓN
    // ======================================
    hide() {
        if (!this.isShowing) return;

        const screen = document.getElementById('validationScreen');
        if (!screen) return;

        // Add hide animation
        screen.classList.remove('show');
        screen.classList.add('hide');

        // Remove from DOM after animation
        setTimeout(() => {
            screen.style.display = 'none';
            screen.classList.remove('hide');
            this.isShowing = false;
            this.currentStep = null;
        }, 500);

        console.log('✅ Pantalla de validación ocultada');
    }

    // ======================================
    // ACTUALIZAR PASO ACTUAL
    // ======================================
    updateStep(stepName, status = 'loading', customMessage = null) {
        if (!this.steps.includes(stepName)) {
            console.warn('Invalid step name:', stepName);
            return;
        }

        // Update current step
        this.currentStep = stepName;

        // Reset previous steps to completed
        const currentIndex = this.steps.indexOf(stepName);
        for (let i = 0; i < currentIndex; i++) {
            this.setStepStatus(this.steps[i], 'completed');
        }

        // Update current step
        this.setStepStatus(stepName, status);

        // Update message
        const message = customMessage || this.stepMessages[stepName];
        this.updateMessage(message);

        console.log(`📋 Paso actualizado: ${stepName} → ${status}`);
    }

    // ======================================
    // ESTABLECER ESTADO DE PASO
    // ======================================
    setStepStatus(stepName, status) {
        const stepEl = document.getElementById(`step-${stepName}`);
        const statusEl = document.getElementById(`status-${stepName}`);

        if (!stepEl || !statusEl) return;

        // Remove all status classes
        stepEl.classList.remove('active', 'completed', 'error');
        
        // Update step appearance
        switch (status) {
            case 'loading':
                stepEl.classList.add('active');
                statusEl.innerHTML = '<i class="bi bi-arrow-clockwise step-loading"></i>';
                break;
            case 'completed':
                stepEl.classList.add('completed');
                statusEl.innerHTML = '<i class="bi bi-check-circle-fill step-success"></i>';
                break;
            case 'error':
                stepEl.classList.add('error');
                statusEl.innerHTML = '<i class="bi bi-x-circle-fill step-error"></i>';
                break;
            case 'pending':
            default:
                statusEl.innerHTML = '<i class="bi bi-clock step-pending"></i>';
                break;
        }
    }

    // ======================================
    // ACTUALIZAR MENSAJE
    // ======================================
    updateMessage(message) {
        const messageEl = document.getElementById('validationMessage');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    // ======================================
    // MOSTRAR ERROR DE VALIDACIÓN
    // ======================================
    showError(errorMessage, failedStep = null) {
        if (failedStep) {
            this.setStepStatus(failedStep, 'error');
        }
        
        this.updateMessage(`❌ ${errorMessage}`);
        
        // Auto hide after showing error
        setTimeout(() => {
            this.hide();
        }, 3000);
    }

    // ======================================
    // MOSTRAR ÉXITO
    // ======================================
    showSuccess(successMessage = 'Validación exitosa') {
        // Mark all steps as completed
        this.steps.forEach(step => {
            this.setStepStatus(step, 'completed');
        });
        
        this.updateMessage(`✅ ${successMessage}`);
        
        // Auto hide after showing success
        setTimeout(() => {
            this.hide();
        }, 1500);
    }

    // ======================================
    // RESET TODOS LOS PASOS
    // ======================================
    resetSteps() {
        this.steps.forEach(step => {
            this.setStepStatus(step, 'pending');
        });
        this.currentStep = null;
    }

    // ======================================
    // SIMULACIÓN DE PROGRESO (PARA TESTING)
    // ======================================
    async simulateValidation(numeroCuenta = '314302498') {
        this.show(numeroCuenta);
        
        // Simular cada paso con delay
        await this.delay(800);
        this.updateStep('ip', 'loading');
        
        await this.delay(1200);
        this.updateStep('config', 'loading');
        
        await this.delay(1000);
        this.updateStep('schedule', 'loading');
        
        await this.delay(1500);
        this.updateStep('sala', 'loading');
        
        await this.delay(1000);
        this.showSuccess('¡Validación completada exitosamente!');
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ======================================
    // INTEGRACIÓN CON SALA VALIDATOR
    // ======================================
    async validateWithProgress(salaValidator, numeroCuenta) {
        try {
            this.show(numeroCuenta);
            
            // Paso 1: Detectar IP
            this.updateStep('ip', 'loading', 'Detectando tu ubicación actual...');
            const ipActual = await salaValidator.getCurrentIP();
            await this.delay(500); // Dar tiempo para que se vea
            
            if (!ipActual) {
                this.showError('No se pudo detectar la ubicación', 'ip');
                return { valido: false, mensaje: 'Error de ubicación' };
            }
            
            // Paso 2: Obtener configuración
            this.updateStep('config', 'loading', 'Obteniendo configuración del sistema...');
            const tipoBloque = await salaValidator.getTipoBloque();
            await this.delay(500);
            
            // Paso 3: Buscar horario
            this.updateStep('schedule', 'loading', 'Buscando tu horario asignado...');
            const horarioAsignado = await salaValidator.buscarHorarioAsignado(numeroCuenta, tipoBloque);
            await this.delay(500);
            
            // Paso 4: Validar sala
            this.updateStep('sala', 'loading', 'Verificando que estés en la sala correcta...');
            
            // Determinar sala actual
            const salaActual = salaValidator.ipToSala[ipActual];
            if (!salaActual) {
                this.showError('IP no autorizada para pase de lista', 'sala');
                return {
                    valido: false,
                    mensaje: `Acceso denegado. Esta IP (${ipActual}) no está autorizada.`,
                    ipDetectada: ipActual
                };
            }
            
            // Verificar horario y sala
            if (!horarioAsignado) {
                this.showSuccess('Sin horario específico - acceso permitido');
                return {
                    valido: true,
                    mensaje: 'Sin horario específico asignado'
                };
            }
            
            const salaAsignada = horarioAsignado.sala;
            if (salaAsignada === salaActual) {
                this.showSuccess('¡Sala correcta! Puedes continuar');
                return {
                    valido: true,
                    mensaje: 'Sala correcta',
                    salaAsignada,
                    salaActual
                };
            } else {
                this.showError(`Te toca ${salaAsignada}, estás en ${salaActual}`, 'sala');
                return {
                    valido: false,
                    mensaje: `No te toca este SICA, te toca ${salaAsignada}.`,
                    salaAsignada,
                    salaActual
                };
            }
            
        } catch (error) {
            console.error('Error en validación:', error);
            this.showError('Error durante la validación', this.currentStep);
            return {
                valido: false,
                mensaje: 'Error durante la validación',
                error: error.message
            };
        }
    }
}

// ======================================
// EXPORTAR PARA USO GLOBAL
// ======================================
window.ValidationManager = ValidationManager;

// Crear instancia global
window.validationManager = new ValidationManager();

console.log('🔄 ValidationManager cargado');
console.log('Funciones disponibles:');
console.log('- validationManager.simulateValidation() → Simular validación');
console.log('- validationManager.show() → Mostrar pantalla');
console.log('- validationManager.hide() → Ocultar pantalla');