// Admin Noticias - JavaScript Simple y Directo

class AdminNoticias {
    constructor() {
        this.noticias = [];
        this.noticiaEditando = null;
        this.init();
    }

    init() {
        console.log('Inicializando Admin Noticias...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Cargar noticias
        this.cargarNoticias();
    }

    setupEventListeners() {
        // Verificar que los elementos existan antes de agregar listeners
        const btnNuevaNoticia = document.getElementById('btnNuevaNoticia');
        if (btnNuevaNoticia) {
            btnNuevaNoticia.addEventListener('click', () => {
                this.nuevaNoticia();
            });
        }

        const btnGuardarNoticia = document.getElementById('btnGuardarNoticia');
        if (btnGuardarNoticia) {
            btnGuardarNoticia.addEventListener('click', () => {
                this.guardarNoticia();
            });
        }

        // Filtros
        const filtroTitulo = document.getElementById('filtroTitulo');
        if (filtroTitulo) {
            filtroTitulo.addEventListener('input', () => this.filtrarNoticias());
        }

        const filtroEstado = document.getElementById('filtroEstado');
        if (filtroEstado) {
            filtroEstado.addEventListener('change', () => this.filtrarNoticias());
        }

        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) {
            filtroCategoria.addEventListener('change', () => this.filtrarNoticias());
        }

        const filtroPrioridad = document.getElementById('filtroPrioridad');
        if (filtroPrioridad) {
            filtroPrioridad.addEventListener('change', () => this.filtrarNoticias());
        }
        
        // Limpiar filtros
        const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', () => {
                const elementos = ['filtroTitulo', 'filtroEstado', 'filtroCategoria', 'filtroPrioridad'];
                elementos.forEach(id => {
                    const elemento = document.getElementById(id);
                    if (elemento) elemento.value = '';
                });
                this.filtrarNoticias();
            });
        }

        // Confirmar eliminación
        const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
        if (btnConfirmarEliminar) {
            btnConfirmarEliminar.addEventListener('click', () => {
                this.confirmarEliminar();
            });
        }
    }

    async cargarNoticias() {
        try {
            console.log('Cargando noticias...');
            
            // Verificar que el elemento loading exista
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'block';
            }

            const snapshot = await firebase.firestore()
                .collection('noticias')
                .orderBy('fechaCreacion', 'desc')
                .get();

            this.noticias = [];
            snapshot.forEach(doc => {
                this.noticias.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Cargadas ${this.noticias.length} noticias`);
            this.renderizarNoticias();
            this.actualizarEstadisticas();

        } catch (error) {
            console.error('Error cargando noticias:', error);
            this.mostrarError('Error al cargar las noticias');
        } finally {
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }
    }

    renderizarNoticias(noticias = this.noticias) {
        const container = document.getElementById('listaNoticias');
        
        if (noticias.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-newspaper display-1 text-muted"></i>
                    <h5 class="text-muted mt-3">No hay noticias</h5>
                    <p class="text-muted">Crea tu primera noticia para comenzar</p>
                </div>
            `;
            return;
        }

        const html = noticias.map(noticia => this.crearHtmlNoticia(noticia)).join('');
        container.innerHTML = html;
    }

    crearHtmlNoticia(noticia) {
        const fecha = this.formatearFecha(noticia.fechaCreacion);
        const estadoBadge = this.getEstadoBadge(noticia.estado);
        const prioridadBadge = noticia.prioridad !== 'normal' ? this.getPrioridadBadge(noticia.prioridad) : '';
        const dirigidoTexto = Array.isArray(noticia.dirigidoA) ? noticia.dirigidoA.join(', ') : 'todos';
        
        return `
            <div class="news-item fade-in">
                <div class="news-header">
                    <div class="d-flex align-items-center">
                        <div class="news-icon">
                            <i class="bi ${noticia.imagenUrl || 'bi-newspaper'}"></i>
                        </div>
                        <div>
                            <h5 class="news-title">${noticia.titulo}</h5>
                            <div class="news-meta">
                                <span><i class="bi bi-person me-1"></i>${noticia.autor || 'Anónimo'}</span>
                                <span><i class="bi bi-calendar me-1"></i>${fecha}</span>
                                <span><i class="bi bi-tag me-1"></i>${noticia.categoria}</span>
                                <span><i class="bi bi-people me-1"></i>${dirigidoTexto}</span>
                            </div>
                        </div>
                    </div>
                    <div class="news-actions">
                        <button class="btn-action btn-primary" onclick="adminNoticias.editarNoticia('${noticia.id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-success" onclick="adminNoticias.toggleEstado('${noticia.id}')" title="Cambiar estado">
                            <i class="bi bi-${noticia.estado === 'publicada' ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn-action btn-warning" onclick="adminNoticias.duplicarNoticia('${noticia.id}')" title="Duplicar">
                            <i class="bi bi-files"></i>
                        </button>
                        <button class="btn-action btn-danger" onclick="adminNoticias.eliminarNoticia('${noticia.id}', '${noticia.titulo}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="news-content">
                    <p>${noticia.resumen}</p>
                </div>
                
                <div class="news-tags">
                    ${estadoBadge}
                    ${prioridadBadge}
                    ${noticia.visibilidad === 'privada' ? '<span class="news-badge badge-borrador">Privada</span>' : ''}
                </div>
            </div>
        `;
    }

    getEstadoBadge(estado) {
        const badges = {
            'borrador': '<span class="news-badge badge-borrador">Borrador</span>',
            'publicada': '<span class="news-badge badge-publicada">Publicada</span>',
            'archivada': '<span class="news-badge badge-archivada">Archivada</span>'
        };
        return badges[estado] || '';
    }

    getPrioridadBadge(prioridad) {
        const badges = {
            'importante': '<span class="news-badge priority-importante">Importante</span>',
            'urgente': '<span class="news-badge priority-urgent">Urgente</span>'
        };
        return badges[prioridad] || '';
    }

    nuevaNoticia() {
        this.noticiaEditando = null;
        this.limpiarFormulario();
        document.getElementById('modalTitle').textContent = 'Nueva Noticia';
        
        // Establecer fecha actual
        const ahora = new Date();
        ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
        document.getElementById('fechaPublicacion').value = ahora.toISOString().slice(0, 16);
        
        const modal = new bootstrap.Modal(document.getElementById('modalNoticia'));
        modal.show();
    }

    editarNoticia(id) {
        const noticia = this.noticias.find(n => n.id === id);
        if (!noticia) return;

        this.noticiaEditando = id;
        this.llenarFormulario(noticia);
        document.getElementById('modalTitle').textContent = 'Editar Noticia';

        const modal = new bootstrap.Modal(document.getElementById('modalNoticia'));
        modal.show();
    }

    llenarFormulario(noticia) {
        document.getElementById('titulo').value = noticia.titulo || '';
        document.getElementById('autor').value = noticia.autor || '';
        document.getElementById('resumen').value = noticia.resumen || '';
        document.getElementById('contenido').value = noticia.contenido || '';
        document.getElementById('estado').value = noticia.estado || 'borrador';
        document.getElementById('categoria').value = noticia.categoria || 'anuncio';
        document.getElementById('prioridad').value = noticia.prioridad || 'normal';
        document.getElementById('visibilidad').value = noticia.visibilidad || 'publica';
        document.getElementById('imagenUrl').value = noticia.imagenUrl || 'bi-newspaper';
        document.getElementById('liga').value = noticia.liga || '';
        document.getElementById('etiquetas').value = Array.isArray(noticia.etiquetas) ? noticia.etiquetas.join(', ') : '';

        // Dirigido A
        document.getElementById('dirigidoEstudiantes').checked = false;
        document.getElementById('dirigidoAsesores').checked = false;
        document.getElementById('dirigidoTodos').checked = false;

        if (Array.isArray(noticia.dirigidoA)) {
            if (noticia.dirigidoA.includes('estudiantes')) document.getElementById('dirigidoEstudiantes').checked = true;
            if (noticia.dirigidoA.includes('asesores')) document.getElementById('dirigidoAsesores').checked = true;
            if (noticia.dirigidoA.includes('todos')) document.getElementById('dirigidoTodos').checked = true;
        } else {
            document.getElementById('dirigidoTodos').checked = true;
        }

        // Fecha de publicación
        if (noticia.fechaPublicacion) {
            const fecha = noticia.fechaPublicacion.toDate ? noticia.fechaPublicacion.toDate() : new Date(noticia.fechaPublicacion);
            fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
            document.getElementById('fechaPublicacion').value = fecha.toISOString().slice(0, 16);
        }
    }

    limpiarFormulario() {
        document.getElementById('formNoticia').reset();
        document.getElementById('dirigidoTodos').checked = true;
        
        // Establecer valores por defecto
        document.getElementById('estado').value = 'borrador';
        document.getElementById('categoria').value = 'anuncio';
        document.getElementById('prioridad').value = 'normal';
        document.getElementById('visibilidad').value = 'publica';
        document.getElementById('imagenUrl').value = 'bi-newspaper';
    }

    async guardarNoticia() {
        try {
            const formData = this.obtenerDatosFormulario();
            
            if (!this.validarFormulario(formData)) {
                return;
            }

            const btnGuardar = document.getElementById('btnGuardarNoticia');
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Guardando...';

            if (this.noticiaEditando) {
                // Actualizar
                await firebase.firestore()
                    .collection('noticias')
                    .doc(this.noticiaEditando)
                    .update({
                        ...formData,
                        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                this.mostrarExito('Noticia actualizada correctamente');
            } else {
                // Crear nueva
                await firebase.firestore()
                    .collection('noticias')
                    .add({
                        ...formData,
                        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                this.mostrarExito('Noticia creada correctamente');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalNoticia'));
            modal.hide();
            
            this.cargarNoticias();

        } catch (error) {
            console.error('Error guardando noticia:', error);
            this.mostrarError('Error al guardar la noticia');
        } finally {
            const btnGuardar = document.getElementById('btnGuardarNoticia');
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="bi bi-save me-2"></i>Guardar';
        }
    }

    obtenerDatosFormulario() {
        // Obtener dirigidoA
        const dirigidoA = [];
        if (document.getElementById('dirigidoEstudiantes').checked) dirigidoA.push('estudiantes');
        if (document.getElementById('dirigidoAsesores').checked) dirigidoA.push('asesores');
        if (document.getElementById('dirigidoTodos').checked) dirigidoA.push('todos');

        // Obtener etiquetas
        const etiquetasTexto = document.getElementById('etiquetas').value.trim();
        const etiquetas = etiquetasTexto ? etiquetasTexto.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        // Fecha de publicación
        const fechaPublicacionInput = document.getElementById('fechaPublicacion').value;
        const fechaPublicacion = fechaPublicacionInput ? new Date(fechaPublicacionInput) : null;

        return {
            titulo: document.getElementById('titulo').value.trim(),
            autor: document.getElementById('autor').value.trim() || 'Administrador',
            resumen: document.getElementById('resumen').value.trim(),
            contenido: document.getElementById('contenido').value.trim(),
            estado: document.getElementById('estado').value,
            categoria: document.getElementById('categoria').value,
            prioridad: document.getElementById('prioridad').value,
            visibilidad: document.getElementById('visibilidad').value,
            dirigidoA: dirigidoA.length > 0 ? dirigidoA : ['todos'],
            imagenUrl: document.getElementById('imagenUrl').value,
            liga: document.getElementById('liga').value.trim(),
            etiquetas: etiquetas,
            fechaPublicacion: fechaPublicacion
        };
    }

    validarFormulario(data) {
        if (!data.titulo) {
            this.mostrarError('El título es obligatorio');
            return false;
        }
        if (!data.resumen) {
            this.mostrarError('El resumen es obligatorio');
            return false;
        }
        if (!data.contenido) {
            this.mostrarError('El contenido es obligatorio');
            return false;
        }
        return true;
    }

    async toggleEstado(id) {
        try {
            const noticia = this.noticias.find(n => n.id === id);
            if (!noticia) return;

            let nuevoEstado;
            if (noticia.estado === 'publicada') {
                nuevoEstado = 'borrador';
            } else if (noticia.estado === 'borrador') {
                nuevoEstado = 'publicada';
            } else {
                nuevoEstado = 'publicada';
            }

            await firebase.firestore()
                .collection('noticias')
                .doc(id)
                .update({
                    estado: nuevoEstado,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.mostrarExito(`Noticia ${nuevoEstado === 'publicada' ? 'publicada' : 'guardada como borrador'}`);
            this.cargarNoticias();

        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.mostrarError('Error al cambiar el estado');
        }
    }

    async duplicarNoticia(id) {
        try {
            const noticia = this.noticias.find(n => n.id === id);
            if (!noticia) return;

            const nuevaNoticia = {
                ...noticia,
                titulo: `${noticia.titulo} (Copia)`,
                estado: 'borrador'
            };

            // Eliminar campos que no deben duplicarse
            delete nuevaNoticia.id;
            delete nuevaNoticia.fechaCreacion;
            delete nuevaNoticia.fechaActualizacion;

            await firebase.firestore()
                .collection('noticias')
                .add({
                    ...nuevaNoticia,
                    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });

            this.mostrarExito('Noticia duplicada correctamente');
            this.cargarNoticias();

        } catch (error) {
            console.error('Error duplicando noticia:', error);
            this.mostrarError('Error al duplicar la noticia');
        }
    }

    eliminarNoticia(id, titulo) {
        this.noticiaAEliminar = id;
        document.getElementById('noticiaAEliminar').textContent = titulo;
        
        const modal = new bootstrap.Modal(document.getElementById('modalEliminar'));
        modal.show();
    }

    async confirmarEliminar() {
        if (!this.noticiaAEliminar) return;

        try {
            await firebase.firestore()
                .collection('noticias')
                .doc(this.noticiaAEliminar)
                .delete();

            this.mostrarExito('Noticia eliminada correctamente');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminar'));
            modal.hide();
            
            this.cargarNoticias();

        } catch (error) {
            console.error('Error eliminando noticia:', error);
            this.mostrarError('Error al eliminar la noticia');
        }

        this.noticiaAEliminar = null;
    }

    filtrarNoticias() {
        const titulo = document.getElementById('filtroTitulo').value.toLowerCase();
        const estado = document.getElementById('filtroEstado').value;
        const categoria = document.getElementById('filtroCategoria').value;
        const prioridad = document.getElementById('filtroPrioridad').value;

        const noticiasFiltradas = this.noticias.filter(noticia => {
            return (!titulo || noticia.titulo.toLowerCase().includes(titulo)) &&
                   (!estado || noticia.estado === estado) &&
                   (!categoria || noticia.categoria === categoria) &&
                   (!prioridad || noticia.prioridad === prioridad);
        });

        this.renderizarNoticias(noticiasFiltradas);
    }

    actualizarEstadisticas() {
        const total = this.noticias.length;
        const publicadas = this.noticias.filter(n => n.estado === 'publicada').length;
        const borradores = this.noticias.filter(n => n.estado === 'borrador').length;
        const archivadas = this.noticias.filter(n => n.estado === 'archivada').length;

        // Actualizar solo si los elementos existen
        const actualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        };

        actualizarElemento('totalNoticias', total);
        actualizarElemento('noticiasPublicadas', publicadas);
        actualizarElemento('borradores', borradores);
        actualizarElemento('archivadas', archivadas);

        console.log(`Estadísticas: ${total} total, ${publicadas} publicadas, ${borradores} borradores, ${archivadas} archivadas`);
    }

    formatearFecha(timestamp) {
        if (!timestamp) return 'Sin fecha';
        
        const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    mostrarExito(mensaje) {
        // Usar el sistema de notificaciones moderno si está disponible
        if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification('Éxito', mensaje, 'success', 'bi-check-circle-fill');
        } else {
            alert(mensaje);
        }
    }

    mostrarError(mensaje) {
        if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification('Error', mensaje, 'error', 'bi-exclamation-triangle-fill');
        } else {
            alert('Error: ' + mensaje);
        }
    }
}

// Inicialización mejorada
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, verificando elementos...');
    
    // Verificar que los elementos principales existan
    const elementosRequeridos = [
        'btnNuevaNoticia', 'listaNoticias', 'totalNoticias', 
        'noticiasPublicadas', 'borradores', 'archivadas'
    ];
    
    const elementosEncontrados = elementosRequeridos.filter(id => document.getElementById(id));
    console.log(`Elementos encontrados: ${elementosEncontrados.length}/${elementosRequeridos.length}`);
    
    if (elementosEncontrados.length < elementosRequeridos.length) {
        console.warn('Algunos elementos del DOM no se encontraron. Reintentando en 1 segundo...');
        setTimeout(() => {
            initializeAdminNoticias();
        }, 1000);
    } else {
        initializeAdminNoticias();
    }
});

function initializeAdminNoticias() {
    console.log('Inicializando Admin Noticias...');
    
    // Verificar autenticación cuando Firebase esté listo
    const checkAuth = () => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            console.log('Firebase disponible, verificando autenticación...');
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    console.log('Usuario no autenticado, redirigiendo...');
                    window.location.href = '../login.html';
                    return;
                }
                
                console.log('Usuario autenticado:', user.email);
                
                // Esperar un poco más para asegurar que todo esté cargado
                setTimeout(() => {
                    try {
                        window.adminNoticias = new AdminNoticias();
                    } catch (error) {
                        console.error('Error inicializando AdminNoticias:', error);
                        alert('Error al inicializar la aplicación. Por favor, recarga la página.');
                    }
                }, 500);
            });
        } else {
            console.log('Esperando Firebase...');
            setTimeout(checkAuth, 1000);
        }
    };
    
    checkAuth();
}