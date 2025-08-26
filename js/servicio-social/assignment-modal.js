// assignment-modal.js
// Módulo para modal de asignación de estado

class AssignmentModal {
    constructor(core, dataManager, uiManager) {
        this.core = core;
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('confirmarAsignacion')?.addEventListener('click', () => {
            this.confirmarAsignacionEstado();
        });

        document.querySelectorAll('input[name="estadoAsignacion"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.handleEstadoSelection();
            });
        });

        document.querySelectorAll('.estado-option').forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.handleEstadoSelection();
                }
            });
        });

        console.log('📋 Assignment modal listeners configurados');
    }

    openAssignmentModal(asesor) {
        this.core.currentAsesor = asesor;
        this.populateAssignmentModal(asesor);
        
        const modal = new bootstrap.Modal(document.getElementById('asignacionModal'));
        modal.show();
    }

    populateAssignmentModal(asesor) {
        const nombreCompleto = asesor.nombreAsesor || 'Sin nombre';
        
        document.getElementById('asignacionFoto').src = asesor.fotoUrl || '../image/default-avatar.png';
        document.getElementById('asignacionFoto').onerror = (e) => e.target.src = '../image/default-avatar.png';
        document.getElementById('asignacionSubtitle').textContent = `${nombreCompleto} • ${asesor.numeroCuenta || 'Sin número'}`;
        
        document.querySelectorAll('input[name="estadoAsignacion"]').forEach(radio => {
            radio.checked = false;
        });
        
        document.querySelectorAll('.estado-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        document.getElementById('confirmarAsignacion').disabled = true;
    }

    handleEstadoSelection() {
        const selectedRadio = document.querySelector('input[name="estadoAsignacion"]:checked');
        
        document.querySelectorAll('.estado-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        if (selectedRadio) {
            const selectedOption = selectedRadio.closest('.estado-option');
            selectedOption.classList.add('selected');
            document.getElementById('confirmarAsignacion').disabled = false;
        } else {
            document.getElementById('confirmarAsignacion').disabled = true;
        }
    }

    async confirmarAsignacionEstado() {
        const selectedRadio = document.querySelector('input[name="estadoAsignacion"]:checked');
        
        if (!selectedRadio || !this.core.currentAsesor) {
            this.core.showNotification('Selecciona un estado', 'warning');
            return;
        }
        
        try {
            this.core.showLoadingModal('Asignando estado...');
            
            const nuevoEstado = selectedRadio.value;
            
            const servicioData = {
                asesorId: this.core.currentAsesor.id,
                estadoTermino: nuevoEstado,
                fechaInicio: '',
                fechaTermino: '',
                clavePrograma: '',
                folioAceptacion: '',
                folioTermino: '',
                fechaEntregaCarta: '',
                horasAsesor: 0,
                horasServicioSocial: 0,
                totalHoras: 0,
                cartaPresentacion: null,
                cartaAceptacion: null,
                cartaTermino: null,
                reporteSS: null,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };
            
            const docRef = this.core.db.collection('serviciosocial').doc(this.core.currentAsesor.id);
            await docRef.set(servicioData);
            
            this.core.currentAsesor.servicioSocial = servicioData;
            
            const asesorIndex = this.core.asesores.findIndex(a => a.id === this.core.currentAsesor.id);
            if (asesorIndex !== -1) {
                this.core.asesores[asesorIndex].servicioSocial = servicioData;
            }
            
            this.core.servicioSocialData.push(servicioData);
            
            bootstrap.Modal.getInstance(document.getElementById('asignacionModal')).hide();
            
            this.uiManager.renderAsesores();
            this.uiManager.updateStats();
            
            this.core.showNotification(
                'Estado Asignado',
                `${this.core.currentAsesor.nombre} ha sido clasificado como "${this.getEstadoLabel(nuevoEstado)}"`,
                'success'
            );
            
        } catch (error) {
            console.error('Error asignando estado:', error);
            this.core.showNotification('Error al asignar estado', 'error');
        } finally {
            this.core.hideLoadingModal();
        }
    }

    getEstadoLabel(estado) {
        const labels = {
            'ya-registro': 'Registrado',
            'en-proceso': 'En Proceso',
            'sin-creditos': 'Sin Créditos',
            'terminado': 'Terminado',
            'cancelado': 'Cancelado'
        };
        return labels[estado] || 'Pendiente';
    }
}

window.AssignmentModal = AssignmentModal;