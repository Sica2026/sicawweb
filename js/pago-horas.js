// Pago de Horas - JavaScript
class PagoHorasManager {
    constructor() {
        this.db = firebase.firestore();
        this.asesores = [];
        this.selectedAsesor = null;
        this.selectedBuscarAsesor = null;
        this.currentEditId = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadAsesores();
            this.setupEventListeners();
            this.setupAutocomplete();
            this.setDefaultDate();
            
        } catch (error) {
            console.error('Error inicializando sistema:', error);
            this.showNotification('Error', 'Error al inicializar el sistema', 'error');
        }
    }

    // Cargar asesores desde Firestore
    async loadAsesores() {
        try {
            this.showLoading(true);
            
            const snapshot = await this.db.collection('asesores').get();
            this.asesores = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.nombreAsesor && data.numeroCuenta) {
                    this.asesores.push({
                        id: doc.id,
                        nombreAsesor: data.nombreAsesor,
                        numeroCuenta: data.numeroCuenta
                    });
                }
            });
            
        } catch (error) {
            console.error('Error cargando asesores:', error);
            this.showNotification('Error', 'Error al cargar la lista de asesores', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Form submission
        document.getElementById('pagoHorasForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Limpiar formulario
        document.getElementById('limpiarBtn').addEventListener('click', () => {
            this.clearForm();
        });

        // Búsqueda
        document.getElementById('buscarBtn').addEventListener('click', () => {
            this.buscarRegistros();
        });

        // Limpiar búsqueda
        document.getElementById('limpiarBusquedaBtn').addEventListener('click', () => {
            this.limpiarBusqueda();
        });

        // Modal de edición
        document.getElementById('guardarEditBtn').addEventListener('click', () => {
            this.guardarEdicion();
        });

        // Actualizar resumen al cambiar campos
        ['asesorInput', 'salaSelect', 'fechaInput', 'horaInicioInput', 'horaFinInput', 'quienAutorizoInput'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateSummary());
                element.addEventListener('change', () => this.updateSummary());
            }
        });
    }

    // Configurar autocompletado
    setupAutocomplete() {
        this.setupAutocompleteField('asesorInput', 'asesorList', 'numeroCuentaDisplay', (asesor) => {
            this.selectedAsesor = asesor;
            this.updateSummary();
        });

        this.setupAutocompleteField('buscarAsesorInput', 'buscarAsesorList', 'buscarNumeroCuentaDisplay', (asesor) => {
            this.selectedBuscarAsesor = asesor;
        });
    }

    setupAutocompleteField(inputId, listId, displayId, onSelectCallback) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        const display = document.getElementById(displayId);
        let currentFocus = -1;

        if (!input || !list || !display) return;

        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            currentFocus = -1;

            if (!value) {
                list.classList.remove('show');
                display.textContent = '-';
                if (inputId === 'asesorInput') {
                    this.selectedAsesor = null;
                } else {
                    this.selectedBuscarAsesor = null;
                }
                return;
            }

            const filtered = this.asesores.filter(asesor => 
                asesor.nombreAsesor && asesor.nombreAsesor.toLowerCase().includes(value)
            );

            this.displayAutocompleteResults(filtered, list, input, display, onSelectCallback);
        });

        input.addEventListener('keydown', (e) => {
            const items = list.querySelectorAll('.autocomplete-item');
            
            if (e.key === 'ArrowDown') {
                currentFocus++;
                this.addActive(items, currentFocus);
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                currentFocus--;
                this.addActive(items, currentFocus);
                e.preventDefault();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentFocus > -1 && items[currentFocus]) {
                    items[currentFocus].click();
                }
            } else if (e.key === 'Escape') {
                list.classList.remove('show');
                currentFocus = -1;
            }
        });

        // Cerrar lista al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) {
                list.classList.remove('show');
            }
        });
    }

    displayAutocompleteResults(asesores, list, input, display, onSelectCallback) {
        list.innerHTML = '';
        
        if (asesores.length === 0) {
            list.classList.remove('show');
            return;
        }

        asesores.forEach(asesor => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <span>${asesor.nombreAsesor}</span>
                <span class="autocomplete-cuenta">${asesor.numeroCuenta}</span>
            `;
            
            item.addEventListener('click', () => {
                input.value = asesor.nombreAsesor;
                display.textContent = asesor.numeroCuenta;
                onSelectCallback(asesor);
                list.classList.remove('show');
            });

            list.appendChild(item);
        });

        list.classList.add('show');
    }

    addActive(items, currentFocus) {
        if (!items) return false;
        
        this.removeActive(items);
        
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        
        if (items[currentFocus]) {
            items[currentFocus].classList.add('active');
        }
    }

    removeActive(items) {
        items.forEach(item => item.classList.remove('active'));
    }

    // Cambiar tab
    switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Content`).classList.add('active');
    }

    // Establecer fecha por defecto (hoy)
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fechaInput').value = today;
    }

    // Actualizar resumen
    updateSummary() {
        const asesor = document.getElementById('asesorInput').value;
        const sala = document.getElementById('salaSelect').value;
        const fecha = document.getElementById('fechaInput').value;
        const horaInicio = document.getElementById('horaInicioInput').value;
        const horaFin = document.getElementById('horaFinInput').value;
        const autorizado = document.getElementById('quienAutorizoInput').value;

        const summaryCard = document.getElementById('summaryCard');
        const summaryContent = document.getElementById('summaryContent');

        if (asesor && sala && fecha && horaInicio && horaFin) {
            const horas = this.calcularHorasTrabajadas(horaInicio, horaFin);
            const fechaFormateada = this.formatearFecha(fecha);
            const horaInicioFormat = this.formatearHora(horaInicio);
            const horaFinFormat = this.formatearHora(horaFin);

            summaryContent.innerHTML = `
                <div class="summary-item">
                    <span class="summary-label">Asesor</span>
                    <span class="summary-value">${asesor}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Número de Cuenta</span>
                    <span class="summary-value">${this.selectedAsesor?.numeroCuenta || 'N/A'}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Sala</span>
                    <span class="summary-value">${sala}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Fecha</span>
                    <span class="summary-value">${fechaFormateada}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Horario</span>
                    <span class="summary-value">${horaInicioFormat} - ${horaFinFormat}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Horas</span>
                    <span class="summary-value text-gold">${horas} horas</span>
                </div>
                ${autorizado ? `
                <div class="summary-item">
                    <span class="summary-label">Autorizado por</span>
                    <span class="summary-value">${autorizado}</span>
                </div>
                ` : ''}
            `;

            summaryCard.style.display = 'block';
        } else {
            summaryCard.style.display = 'none';
        }
    }

    // Calcular horas trabajadas
    calcularHorasTrabajadas(horaInicio, horaFin) {
        if (!horaInicio || !horaFin) return '0';
        
        const [horasI, minutosI] = horaInicio.split(':').map(Number);
        const [horasF, minutosF] = horaFin.split(':').map(Number);
        
        const inicioMinutos = horasI * 60 + minutosI;
        const finMinutos = horasF * 60 + minutosF;
        
        const diffMinutos = finMinutos - inicioMinutos;
        const diffHoras = diffMinutos / 60;
        
        return diffHoras > 0 ? diffHoras.toFixed(1) : '0';
    }

    // Formatear hora para display
    formatearHora(hora24) {
        if (!hora24) return '';
        
        const [horas, minutos] = hora24.split(':');
        const horaNum = parseInt(horas);
        const periodo = horaNum >= 12 ? 'PM' : 'AM';
        const hora12 = horaNum === 0 ? 12 : horaNum > 12 ? horaNum - 12 : horaNum;
        
        return `${hora12.toString().padStart(2, '0')}:${minutos} ${periodo}`;
    }

    // Formatear fecha
    formatearFecha(fecha) {
        const date = new Date(fecha + 'T00:00:00');
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Manejar envío del formulario
    async handleFormSubmit() {
        try {
            if (!this.validateForm()) {
                return;
            }

            this.showLoading(true);

            const formData = this.getFormData();
            
            // Guardar en Firestore
            await this.db.collection('pago_horas').add({
                ...formData,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showNotification('Éxito', 'Registro guardado correctamente', 'success');
            this.clearForm();
            
        } catch (error) {
            console.error('Error guardando registro:', error);
            this.showNotification('Error', 'Error al guardar el registro', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Validar formulario
    validateForm() {
        const requiredFields = [
            { id: 'asesorInput', name: 'Asesor' },
            { id: 'salaSelect', name: 'Sala' },
            { id: 'fechaInput', name: 'Fecha' },
            { id: 'horaInicioInput', name: 'Hora de inicio' },
            { id: 'horaFinInput', name: 'Hora de fin' },
            { id: 'quienAutorizoInput', name: 'Quien autorizó' }
        ];

        let isValid = true;

        // Limpiar errores anteriores
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });

        // Validar campos requeridos
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element.value.trim()) {
                this.showFieldError(element, `${field.name} es requerido`);
                isValid = false;
            }
        });

        // Validar que se haya seleccionado un asesor válido
        if (!this.selectedAsesor) {
            const asesorInput = document.getElementById('asesorInput');
            this.showFieldError(asesorInput, 'Debe seleccionar un asesor válido de la lista');
            isValid = false;
        }

        // Validar horas
        const horaInicio = document.getElementById('horaInicioInput').value;
        const horaFin = document.getElementById('horaFinInput').value;
        
        if (horaInicio && horaFin) {
            const horas = parseFloat(this.calcularHorasTrabajadas(horaInicio, horaFin));
            if (horas <= 0) {
                this.showFieldError(document.getElementById('horaFinInput'), 'La hora de fin debe ser posterior a la hora de inicio');
                isValid = false;
            } else if (horas > 12) {
                this.showFieldError(document.getElementById('horaFinInput'), 'No se pueden registrar más de 12 horas continuas');
                isValid = false;
            }
        }

        return isValid;
    }

    // Mostrar error en campo
    showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    }

    // Obtener datos del formulario
    getFormData() {
        return {
            nombreAsesor: document.getElementById('asesorInput').value.trim(),
            numeroCuenta: this.selectedAsesor.numeroCuenta,
            asesorId: this.selectedAsesor.id,
            sala: document.getElementById('salaSelect').value,
            fecha: document.getElementById('fechaInput').value,
            horaInicio: document.getElementById('horaInicioInput').value,
            horaFin: document.getElementById('horaFinInput').value,
            totalHoras: parseFloat(this.calcularHorasTrabajadas(
                document.getElementById('horaInicioInput').value,
                document.getElementById('horaFinInput').value
            )),
            quienAutorizo: document.getElementById('quienAutorizoInput').value.trim()
        };
    }

    // Limpiar formulario
    clearForm() {
        document.getElementById('pagoHorasForm').reset();
        this.selectedAsesor = null;
        document.getElementById('numeroCuentaDisplay').textContent = '-';
        document.getElementById('summaryCard').style.display = 'none';
        document.getElementById('asesorList').classList.remove('show');
        
        // Limpiar errores
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });

        this.setDefaultDate();
    }

    // Buscar registros
    async buscarRegistros() {
        if (!this.selectedBuscarAsesor) {
            this.showNotification('Advertencia', 'Seleccione un asesor para buscar', 'warning');
            return;
        }

        const numeroCuenta = this.selectedBuscarAsesor.numeroCuenta;

        try {
            this.showLoading(true);
            
            const snapshot = await this.db.collection('pago_horas')
                .where('numeroCuenta', '==', numeroCuenta)
                .orderBy('fechaCreacion', 'desc')
                .get();

            const registros = [];
            snapshot.forEach(doc => {
                registros.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            this.displaySearchResults(registros);
            
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.showNotification('Error', 'Error al buscar registros', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Mostrar resultados de búsqueda
    displaySearchResults(registros) {
        const resultsCard = document.getElementById('resultsCard');
        const resultsCount = document.getElementById('resultsCount');
        const tableBody = document.getElementById('registrosTableBody');

        resultsCount.textContent = `${registros.length} registro${registros.length !== 1 ? 's' : ''}`;
        
        if (registros.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-search me-2"></i>
                        No se encontraron registros para este número de cuenta
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = registros.map(registro => `
                <tr>
                    <td>${registro.nombreAsesor}</td>
                    <td>${registro.sala}</td>
                    <td>${this.formatearFecha(registro.fecha)}</td>
                    <td>${this.formatearHora(registro.horaInicio)} - ${this.formatearHora(registro.horaFin)}</td>
                    <td><strong class="text-gold">${registro.totalHoras}h</strong></td>
                    <td>${registro.quienAutorizo}</td>
                    <td>
                        <button class="action-btn action-btn-edit" onclick="pagoHorasManager.editarRegistro('${registro.id}')">
                            <i class="bi bi-pencil"></i>
                            Editar
                        </button>
                        <button class="action-btn action-btn-delete" onclick="pagoHorasManager.eliminarRegistro('${registro.id}')">
                            <i class="bi bi-trash"></i>
                            Eliminar
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        resultsCard.style.display = 'block';
    }

    // Limpiar búsqueda
    limpiarBusqueda() {
        document.getElementById('buscarAsesorInput').value = '';
        document.getElementById('buscarNumeroCuentaDisplay').textContent = '-';
        document.getElementById('buscarAsesorList').classList.remove('show');
        this.selectedBuscarAsesor = null;
        document.getElementById('resultsCard').style.display = 'none';
    }

    // Editar registro
    async editarRegistro(id) {
        try {
            this.showLoading(true);
            
            const doc = await this.db.collection('pago_horas').doc(id).get();
            
            if (!doc.exists) {
                this.showNotification('Error', 'Registro no encontrado', 'error');
                return;
            }

            const data = doc.data();
            this.currentEditId = id;

            // Llenar modal de edición
            document.getElementById('editRegistroId').value = id;
            document.getElementById('editAsesor').value = data.nombreAsesor;
            document.getElementById('editSala').value = data.sala;
            document.getElementById('editFecha').value = data.fecha;
            document.getElementById('editHoraInicio').value = data.horaInicio;
            document.getElementById('editHoraFin').value = data.horaFin;
            document.getElementById('editQuienAutorizo').value = data.quienAutorizo;

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error cargando registro:', error);
            this.showNotification('Error', 'Error al cargar el registro', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Guardar edición
    async guardarEdicion() {
        try {
            const id = this.currentEditId;
            
            if (!id) return;

            // Validar campos del modal
            const requiredFields = ['editSala', 'editFecha', 'editHoraInicio', 'editHoraFin', 'editQuienAutorizo'];
            let isValid = true;

            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });

            if (!isValid) {
                this.showNotification('Error', 'Complete todos los campos requeridos', 'error');
                return;
            }

            this.showLoading(true);

            const horaInicio = document.getElementById('editHoraInicio').value;
            const horaFin = document.getElementById('editHoraFin').value;
            const totalHoras = parseFloat(this.calcularHorasTrabajadas(horaInicio, horaFin));

            if (totalHoras <= 0) {
                this.showNotification('Error', 'La hora de fin debe ser posterior a la hora de inicio', 'error');
                return;
            }

            const updateData = {
                sala: document.getElementById('editSala').value,
                fecha: document.getElementById('editFecha').value,
                horaInicio: horaInicio,
                horaFin: horaFin,
                totalHoras: totalHoras,
                quienAutorizo: document.getElementById('editQuienAutorizo').value.trim(),
                fechaModificacion: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('pago_horas').doc(id).update(updateData);

            this.showNotification('Éxito', 'Registro actualizado correctamente', 'success');
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();

            // Refrescar resultados
            this.buscarRegistros();
            
        } catch (error) {
            console.error('Error actualizando registro:', error);
            this.showNotification('Error', 'Error al actualizar el registro', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Eliminar registro
    async eliminarRegistro(id) {
        if (!confirm('¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.showLoading(true);
            
            await this.db.collection('pago_horas').doc(id).delete();
            
            this.showNotification('Éxito', 'Registro eliminado correctamente', 'success');
            this.buscarRegistros(); // Refrescar resultados
            
        } catch (error) {
            console.error('Error eliminando registro:', error);
            this.showNotification('Error', 'Error al eliminar el registro', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Mostrar loading
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    // Mostrar notificación
    showNotification(title, message, type = 'info', icon = null) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-circle-fill',
            info: 'bi-info-circle-fill'
        };

        const selectedIcon = icon || icons[type] || 'bi-info-circle-fill';

        if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification(title, message, type, selectedIcon);
        } else if (window.SICAComponents) {
            window.SICAComponents.notify(title, message, type, selectedIcon);
        } else {
            alert(`${title}: ${message}`);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté inicializado
    const checkFirebase = () => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            window.pagoHorasManager = new PagoHorasManager();
        } else {
            setTimeout(checkFirebase, 100);
        }
    };
    
    checkFirebase();
});