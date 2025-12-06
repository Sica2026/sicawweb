// =====================================================================
// TECHNICIAN REPORTES - Visual Grid by Salas
// =====================================================================

// State Management
let reportesList = [];
let filteredReportes = [];
let currentReporte = null;
let editingMode = false;

// Salas configuration
const SALAS = ['Sica 1', 'Sica 2', 'Sica 3', 'Sica 4', 'Salon inteligente 1', 'Salon inteligente 2'];

// Subcategories mapping
const subcategorias = {
    'Software': [
        'Activación de Office',
        'Activación de Windows',
        'Solicitud de nuevos programas',
        'ANSYS',
        'Otros - Especificar'
    ],
    'Hardware': [
        'Teclado',
        'Pantalla',
        'Fuente',
        'Red',
        'Mouse',
        'Disco',
        'RAM',
        'Otros - Especificar'
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Technician Reportes initialized');

    // Wait a bit for dashboard to finish initializing
    setTimeout(() => {
        setupReportesEventListeners();
        loadReportes();
        setDefaultDate();
        fillTechnicianName();
    }, 100);
});

// =====================================================================
// EVENT LISTENERS
// =====================================================================

function setupReportesEventListeners() {
    // New Report Button
    const newReportBtn = document.getElementById('newReportBtn');
    const emptyStateNewBtn = document.getElementById('emptyStateNewBtn');

    if (newReportBtn) newReportBtn.addEventListener('click', openNewReportModal);
    if (emptyStateNewBtn) emptyStateNewBtn.addEventListener('click', openNewReportModal);

    // Form Events
    const reportForm = document.getElementById('reportForm');
    const reportCategoria = document.getElementById('reportCategoria');
    const saveReportBtn = document.getElementById('saveReportBtn');

    if (reportForm) reportForm.addEventListener('submit', handleReportSubmit);
    if (reportCategoria) reportCategoria.addEventListener('change', handleCategoriaChange);
    if (saveReportBtn) saveReportBtn.addEventListener('click', handleSaveReport);

    // Search
    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) searchInput.addEventListener('input', handleSearchReportes);

    // Details Modal
    const editDetailsBtn = document.getElementById('editDetailsBtn');
    const resolveDetailsBtn = document.getElementById('resolveDetailsBtn');
    if (editDetailsBtn) editDetailsBtn.addEventListener('click', editFromDetails);
    if (resolveDetailsBtn) resolveDetailsBtn.addEventListener('click', openResolveModal);

    // Resolve Modal
    const confirmResolveBtn = document.getElementById('confirmResolveBtn');
    if (confirmResolveBtn) confirmResolveBtn.addEventListener('click', handleResolveReport);

    console.log('🎧 Reportes event listeners configured');
}

// =====================================================================
// MODAL MANAGEMENT
// =====================================================================

function openNewReportModal() {
    currentReporte = null;
    editingMode = false;

    document.getElementById('reportForm').reset();
    document.getElementById('reportModalTitle').innerHTML = `
        <i class="bi bi-file-earmark-plus me-2"></i>
        Nuevo Reporte
    `;

    setDefaultDate();
    document.getElementById('reportSubcategoria').innerHTML = '<option value="">Seleccionar subcategoría...</option>';
    document.getElementById('especificarContainer').style.display = 'none';
    fillTechnicianName();

    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();

    console.log('📝 New report modal opened');
}

function openEditReportModal(reporte) {
    currentReporte = reporte;
    editingMode = true;

    document.getElementById('reportModalTitle').innerHTML = `
        <i class="bi bi-pencil me-2"></i>
        Editar Reporte
    `;

    fillReportForm(reporte);

    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();

    console.log('✏️ Edit report modal opened:', reporte.id);
}

function openDetailsModal(reporte) {
    const detailsContent = document.getElementById('detailsContent');
    const resolveBtn = document.getElementById('resolveDetailsBtn');

    detailsContent.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Estado</span>
            <span class="detail-value">
                ${reporte.resuelto ?
                    '<span class="badge bg-success">✓ RESUELTO</span>' :
                    '<span class="badge bg-warning text-dark">⏳ PENDIENTE</span>'}
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">${formatDate(reporte.fecha)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Sala</span>
            <span class="detail-value">${reporte.sala}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Equipo</span>
            <span class="detail-value">${reporte.equipo || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Categoría</span>
            <span class="detail-value">
                <span class="report-categoria ${reporte.categoria.toLowerCase()}">${reporte.categoria}</span>
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Subcategoría</span>
            <span class="detail-value">${reporte.subcategoria}</span>
        </div>
        ${reporte.especificar ? `
        <div class="detail-row">
            <span class="detail-label">Especificación</span>
            <span class="detail-value">${reporte.especificar}</span>
        </div>
        ` : ''}
        <div class="detail-row">
            <span class="detail-label">Urgencia</span>
            <span class="detail-value">
                <span class="report-urgencia ${reporte.urgencia.toLowerCase()}">${reporte.urgencia}</span>
            </span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Técnico Asignado</span>
            <span class="detail-value">${reporte.tecnico}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Descripción del Problema</span>
            <span class="detail-value">${reporte.descripcion}</span>
        </div>
        ${reporte.resuelto ? `
        <hr style="margin: 20px 0; border-color: #22c55e;">
        <h6 style="color: #22c55e; margin-bottom: 15px;">
            <i class="bi bi-check-circle-fill me-2"></i>Información de Resolución
        </h6>
        <div class="detail-row">
            <span class="detail-label">Fecha de Resolución</span>
            <span class="detail-value">${formatDate(reporte.fechaResolucion)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Resuelto Por</span>
            <span class="detail-value">${reporte.resueltoPor || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Solución Aplicada</span>
            <span class="detail-value">${reporte.solucion || 'N/A'}</span>
        </div>
        ${reporte.notasResolucion ? `
        <div class="detail-row">
            <span class="detail-label">Notas Adicionales</span>
            <span class="detail-value">${reporte.notasResolucion}</span>
        </div>
        ` : ''}
        ` : ''}
    `;

    // Mostrar u ocultar botón de resolver según el estado
    if (reporte.resuelto) {
        resolveBtn.style.display = 'none';
    } else {
        resolveBtn.style.display = 'inline-block';
    }

    currentReporte = reporte;
    const modal = new bootstrap.Modal(document.getElementById('reportDetailsModal'));
    modal.show();
}

function editFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('reportDetailsModal'));
    detailsModal.hide();

    setTimeout(() => {
        openEditReportModal(currentReporte);
    }, 300);
}

function openResolveModal() {
    if (!currentReporte) {
        console.error('❌ No current reporte to resolve');
        return;
    }

    // Cerrar modal de detalles
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('reportDetailsModal'));
    if (detailsModal) detailsModal.hide();

    // Limpiar formulario
    document.getElementById('resolveSolucion').value = '';
    document.getElementById('resolveNotas').value = '';

    // Abrir modal de resolución
    setTimeout(() => {
        const resolveModal = new bootstrap.Modal(document.getElementById('resolveModal'));
        resolveModal.show();
    }, 300);

    console.log('🔧 Resolve modal opened for:', currentReporte.id);
}

async function handleResolveReport() {
    const solucion = document.getElementById('resolveSolucion').value.trim();
    const notas = document.getElementById('resolveNotas').value.trim();

    if (!solucion) {
        showNotification('Por favor describe la solución aplicada', 'error');
        return;
    }

    if (!currentReporte) {
        console.error('❌ No current reporte to resolve');
        return;
    }

    const confirmBtn = document.getElementById('confirmResolveBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

    try {
        const session = getTechnicianSession();
        const today = new Date().toISOString().split('T')[0];

        const resolutionData = {
            resuelto: true,
            solucion: solucion,
            notasResolucion: notas || '',
            fechaResolucion: today,
            resueltoPor: session?.nombre || session?.usuario || 'Técnico',
            resueltoPorId: session?.id || 'unknown',
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        await window.firebaseDB.collection('reportes').doc(currentReporte.id).update(resolutionData);

        console.log('✅ Report resolved:', currentReporte.id);
        showNotification('Reporte marcado como resuelto exitosamente', 'success');

        // Cerrar modal
        const resolveModal = bootstrap.Modal.getInstance(document.getElementById('resolveModal'));
        if (resolveModal) resolveModal.hide();

        // Recargar reportes
        setTimeout(() => {
            loadReportes();
        }, 500);

    } catch (error) {
        console.error('❌ Error resolving report:', error);
        showNotification('Error al resolver el reporte: ' + error.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// =====================================================================
// FORM HANDLING
// =====================================================================

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('reportFecha');
    if (fechaInput) fechaInput.value = today;
}

function fillTechnicianName() {
    const session = getTechnicianSession();
    const tecnicoInput = document.getElementById('reportTecnico');
    if (session && tecnicoInput) {
        tecnicoInput.value = session.nombre || session.usuario || 'Técnico';
    }
}

function fillReportForm(reporte) {
    document.getElementById('reportFecha').value = reporte.fecha;
    document.getElementById('reportSala').value = reporte.sala;
    document.getElementById('reportEquipo').value = reporte.equipo || '';
    document.getElementById('reportUrgencia').value = reporte.urgencia;
    document.getElementById('reportCategoria').value = reporte.categoria;
    document.getElementById('reportDescripcion').value = reporte.descripcion;

    handleCategoriaChange();

    setTimeout(() => {
        document.getElementById('reportSubcategoria').value = reporte.subcategoria;

        if (reporte.subcategoria.includes('Otros')) {
            document.getElementById('especificarContainer').style.display = 'block';
            document.getElementById('reportEspecificar').value = reporte.especificar || '';
        } else {
            document.getElementById('especificarContainer').style.display = 'none';
        }
    }, 10);

    fillTechnicianName();
}

function handleCategoriaChange() {
    const categoria = document.getElementById('reportCategoria').value;
    const subcategoriaSelect = document.getElementById('reportSubcategoria');

    subcategoriaSelect.innerHTML = '<option value="">Seleccionar subcategoría...</option>';

    if (categoria && subcategorias[categoria]) {
        subcategorias[categoria].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            subcategoriaSelect.appendChild(option);
        });

        subcategoriaSelect.addEventListener('change', function() {
            const especificarContainer = document.getElementById('especificarContainer');
            if (this.value.includes('Otros')) {
                especificarContainer.style.display = 'block';
            } else {
                especificarContainer.style.display = 'none';
            }
        });
    }
}

function handleReportSubmit(e) {
    e.preventDefault();
}

async function handleSaveReport() {
    const errors = validateReportForm();
    if (errors.length > 0) {
        showNotification('Por favor completa todos los campos requeridos', 'error');
        console.warn('❌ Validation errors:', errors);
        return;
    }

    const reportData = collectReportFormData();
    const saveBtn = document.getElementById('saveReportBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

    try {
        if (editingMode && currentReporte) {
            await updateReporte(currentReporte.id, reportData);
            showNotification('Reporte actualizado exitosamente', 'success');
        } else {
            await createReporte(reportData);
            showNotification('Reporte creado exitosamente', 'success');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
        modal.hide();

        setTimeout(() => {
            loadReportes();
        }, 500);

    } catch (error) {
        console.error('❌ Error saving report:', error);
        showNotification('Error al guardar: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

function validateReportForm() {
    const errors = [];

    const fecha = document.getElementById('reportFecha').value;
    const sala = document.getElementById('reportSala').value;
    const urgencia = document.getElementById('reportUrgencia').value;
    const categoria = document.getElementById('reportCategoria').value;
    const subcategoria = document.getElementById('reportSubcategoria').value;
    const descripcion = document.getElementById('reportDescripcion').value;

    if (!fecha) errors.push('Fecha es requerida');
    if (!sala) errors.push('Sala es requerida');
    if (!urgencia) errors.push('Urgencia es requerida');
    if (!categoria) errors.push('Categoría es requerida');
    if (!subcategoria) errors.push('Subcategoría es requerida');
    if (!descripcion) errors.push('Descripción es requerida');

    return errors;
}

function collectReportFormData() {
    return {
        fecha: document.getElementById('reportFecha').value,
        sala: document.getElementById('reportSala').value,
        equipo: document.getElementById('reportEquipo').value,
        urgencia: document.getElementById('reportUrgencia').value,
        categoria: document.getElementById('reportCategoria').value,
        subcategoria: document.getElementById('reportSubcategoria').value,
        especificar: document.getElementById('reportEspecificar').value || '',
        descripcion: document.getElementById('reportDescripcion').value,
        tecnico: document.getElementById('reportTecnico').value
    };
}

// =====================================================================
// FIRESTORE CRUD
// =====================================================================

async function createReporte(reportData) {
    try {
        if (!window.firebaseDB) {
            throw new Error('Base de datos no disponible');
        }

        const reporteConMetadata = {
            ...reportData,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            tecnicoId: getTechnicianSession()?.id || 'unknown'
        };

        const docRef = await window.firebaseDB.collection('reportes').add(reporteConMetadata);
        console.log('✅ Report created:', docRef.id);
        return docRef.id;

    } catch (error) {
        console.error('❌ Error creating report:', error);
        throw error;
    }
}

async function updateReporte(reporteId, reportData) {
    try {
        if (!window.firebaseDB) {
            throw new Error('Base de datos no disponible');
        }

        const reporteConMetadata = {
            ...reportData,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };

        await window.firebaseDB.collection('reportes').doc(reporteId).update(reporteConMetadata);
        console.log('✅ Report updated:', reporteId);

    } catch (error) {
        console.error('❌ Error updating report:', error);
        throw error;
    }
}

async function deleteReporte(reporteId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte?')) {
        return;
    }

    try {
        if (!window.firebaseDB) {
            throw new Error('Base de datos no disponible');
        }

        await window.firebaseDB.collection('reportes').doc(reporteId).delete();
        console.log('✅ Report deleted:', reporteId);

        showNotification('Reporte eliminado exitosamente', 'success');
        loadReportes();

    } catch (error) {
        console.error('❌ Error deleting report:', error);
        showNotification('Error al eliminar el reporte', 'error');
    }
}

async function loadReportes() {
    const loadingState = document.getElementById('reportsLoadingState');
    const salasGrid = document.getElementById('salasGrid');
    const emptyState = document.getElementById('reportsEmptyState');

    try {
        if (!window.firebaseDB) {
            throw new Error('Base de datos no disponible');
        }

        loadingState.style.display = 'flex';
        salasGrid.style.display = 'none';
        emptyState.style.display = 'none';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        const snapshot = await window.firebaseDB.collection('reportes')
            .where('fecha', '==', todayString)
            .orderBy('fechaCreacion', 'desc')
            .get();

        reportesList = [];
        snapshot.forEach(doc => {
            reportesList.push({
                id: doc.id,
                ...doc.data()
            });
        });

        filteredReportes = [...reportesList];

        console.log('✅ Reports loaded:', reportesList.length);

        renderSalasGrid();

    } catch (error) {
        console.error('❌ Error loading reports:', error);
        loadingState.style.display = 'none';
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h3>Error al cargar reportes</h3>
            <p>${error.message}</p>
        `;
        emptyState.style.display = 'flex';
    }
}

function renderSalasGrid() {
    const loadingState = document.getElementById('reportsLoadingState');
    const salasGrid = document.getElementById('salasGrid');
    const emptyState = document.getElementById('reportsEmptyState');

    loadingState.style.display = 'none';

    if (filteredReportes.length === 0) {
        salasGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    salasGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    let html = '';

    SALAS.forEach(sala => {
        const reportesSala = filteredReportes.filter(r => r.sala === sala);

        if (reportesSala.length > 0) {
            const softwareCount = reportesSala.filter(r => r.categoria === 'Software').length;
            const hardwareCount = reportesSala.filter(r => r.categoria === 'Hardware').length;

            // Nuevas categorías basadas en urgencia y estado de resolución
            const urgenteCount = reportesSala.filter(r => r.urgencia === 'Urgente' && !r.resuelto).length;
            const pendientesCount = reportesSala.filter(r => r.urgencia === 'Moderado' && !r.resuelto).length;
            const normalCount = reportesSala.filter(r => r.urgencia === 'Normal' && !r.resuelto).length;
            const resueltosCount = reportesSala.filter(r => r.resuelto === true).length;
            const serviciosCount = reportesSala.length; // Total de reportes

            // Determinar estado
            let estado = 'OPERATIVA';
            let estadoColor = 'success';
            if (urgenteCount > 0) {
                estado = 'CON PROBLEMAS';
                estadoColor = 'danger';
            } else if (pendientesCount > 0) {
                estado = 'MANTENIMIENTO';
                estadoColor = 'warning';
            }

            html += `
                <div class="sala-card">
                    <div class="sala-header">
                        <h5><i class="bi bi-building me-2"></i>${sala}</h5>
                        <span class="estado-badge ${estadoColor === 'success' ? 'operativa' : estadoColor === 'warning' ? 'mantenimiento' : 'problemas'}">${estado}</span>
                    </div>
                    <div class="sala-body">
                        <div class="sala-stats">
                            <div class="stat-item urgentes" onclick="filterBySalaAndStatus('${sala}', 'urgente')">
                                <div class="stat-value">${urgenteCount}</div>
                                <div class="stat-label">URGENTES</div>
                            </div>
                            <div class="stat-item pendientes" onclick="filterBySalaAndStatus('${sala}', 'pendiente')">
                                <div class="stat-value">${pendientesCount}</div>
                                <div class="stat-label">PENDIENTES</div>
                            </div>
                            <div class="stat-item normales" onclick="filterBySalaAndStatus('${sala}', 'normal')">
                                <div class="stat-value">${normalCount}</div>
                                <div class="stat-label">NORMALES</div>
                            </div>
                            <div class="stat-item resueltos" onclick="filterBySalaAndStatus('${sala}', 'resuelto')">
                                <div class="stat-value">${resueltosCount}</div>
                                <div class="stat-label">RESUELTOS</div>
                            </div>
                            <div class="stat-item servicios">
                                <div class="stat-value">${serviciosCount}</div>
                                <div class="stat-label">SERVICIOS</div>
                            </div>
                        </div>
                        <div class="sala-categories">
                            <div class="categoria-box software" onclick="filterBySalaAndCategory('${sala}', 'Software')">
                                <div class="categoria-icon"><i class="bi bi-cpu"></i></div>
                                <div class="categoria-name">SOFTWARE</div>
                                <div class="categoria-count">${softwareCount}</div>
                            </div>
                            <div class="categoria-box hardware" onclick="filterBySalaAndCategory('${sala}', 'Hardware')">
                                <div class="categoria-icon"><i class="bi bi-laptop"></i></div>
                                <div class="categoria-name">HARDWARE</div>
                                <div class="categoria-count">${hardwareCount}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    salasGrid.innerHTML = html;
}

function filterBySalaAndCategory(sala, categoria) {
    filteredReportes = reportesList.filter(r => r.sala === sala && r.categoria === categoria);
    showReportesModal(sala, categoria);
}

function filterBySalaAndStatus(sala, status) {
    console.log('🔍 Filtering by sala:', sala, 'status:', status);

    if (status === 'urgente') {
        filteredReportes = reportesList.filter(r => r.sala === sala && r.urgencia === 'Urgente' && !r.resuelto);
        showReportesModal(sala, 'Urgentes');
    } else if (status === 'pendiente') {
        filteredReportes = reportesList.filter(r => r.sala === sala && r.urgencia === 'Moderado' && !r.resuelto);
        showReportesModal(sala, 'Pendientes (Moderado)');
    } else if (status === 'normal') {
        filteredReportes = reportesList.filter(r => r.sala === sala && r.urgencia === 'Normal' && !r.resuelto);
        showReportesModal(sala, 'Normales');
    } else if (status === 'resuelto') {
        filteredReportes = reportesList.filter(r => r.sala === sala && r.resuelto === true);
        showReportesModal(sala, 'Resueltos');
    }
}

function showReportesModal(sala, filtro) {
    // Create a modal HTML structure
    const modalHtml = document.createElement('div');
    modalHtml.className = 'modal fade';
    modalHtml.id = 'filteredReportesModal';
    modalHtml.setAttribute('tabindex', '-1');
    modalHtml.setAttribute('role', 'dialog');
    modalHtml.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="bi bi-filter me-2"></i>
                        ${sala} - ${filtro}
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    ${filteredReportes.length === 0 ? `
                        <div class="alert alert-info" role="alert">
                            <i class="bi bi-info-circle me-2"></i>
                            No hay reportes que coincidan con el filtro
                        </div>
                    ` : `
                        <div class="reportes-list">
                            ${filteredReportes.map(r => `
                                <div class="reporte-item" style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;" onmouseenter="this.style.backgroundColor='#f9fafb'" onmouseleave="this.style.backgroundColor='white'" onclick="openDetailsFromFilteredModal('${r.id}')">
                                    <div style="display: flex; justify-content: space-between; align-items: start;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${r.categoria}: ${r.subcategoria}</div>
                                            <div style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">${r.descripcion.substring(0, 80)}...</div>
                                            <div style="font-size: 12px; color: #9ca3af;">👨‍🔧 ${r.tecnico}</div>
                                        </div>
                                        <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: ${r.urgencia === 'Urgente' ? '#fee2e2' : r.urgencia === 'Moderado' ? '#fef3c7' : '#dcfce7'}; color: ${r.urgencia === 'Urgente' ? '#dc2626' : r.urgencia === 'Moderado' ? '#d97706' : '#16a34a'};">
                                            ${r.urgencia}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    // Remove old modal if exists
    const oldModal = document.getElementById('filteredReportesModal');
    if (oldModal) oldModal.remove();

    // Add new modal to body
    document.body.appendChild(modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(modalHtml);
    modal.show();

    // Clean up modal from DOM when hidden
    modalHtml.addEventListener('hidden.bs.modal', () => {
        modalHtml.remove();
    });
}

function openDetailsFromFilteredModal(reporteId) {
    // Cerrar el modal filtrado primero
    const filteredModal = document.getElementById('filteredReportesModal');
    if (filteredModal) {
        const bsModal = bootstrap.Modal.getInstance(filteredModal);
        if (bsModal) {
            bsModal.hide();
        }
    }

    // Esperar a que se cierre y luego abrir detalles
    setTimeout(() => {
        const reporte = reportesList.find(r => r.id === reporteId);
        if (reporte) {
            openDetailsModal(reporte);
        }
    }, 300);
}

// =====================================================================
// SEARCH & FILTER
// =====================================================================

function handleSearchReportes(event) {
    const searchTerm = event.target.value.toLowerCase();

    filteredReportes = reportesList.filter(reporte => {
        const texto = `
            ${reporte.sala}
            ${reporte.equipo}
            ${reporte.descripcion}
            ${reporte.categoria}
            ${reporte.subcategoria}
            ${reporte.urgencia}
        `.toLowerCase();

        return texto.includes(searchTerm);
    });

    renderSalasGrid();
}

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function getTechnicianSession() {
    const session = sessionStorage.getItem('technicianSession');
    return session ? JSON.parse(session) : null;
}

function showNotification(message, type = 'info') {
    const container = document.createElement('div');
    container.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1060;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    container.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(container);

    setTimeout(() => {
        container.remove();
    }, 5000);
}

console.log('✅ Technician Reportes ready');
