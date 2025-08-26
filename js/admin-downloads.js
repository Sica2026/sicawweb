// Admin Downloads JavaScript
class AdminDownloadsManager {
    constructor() {
        this.documents = [];
        this.filteredDocuments = [];
        this.selectedDocuments = new Set();
        this.isLoading = false;
        this.downloadProgress = {
            current: 0,
            total: 0,
            currentFile: ''
        };
        
        this.init();
    }

    init() {
        this.initializeComponents();
        this.setupEventListeners();
        this.loadDocuments();
        this.setupSounds();
    }

    initializeComponents() {
        // Set page title
        if (window.SICAComponents) {
            window.SICAComponents.setPageTitle("Centro de Descargas - Administración SICA");
        }

        // Initialize UI elements
        this.elements = {
            searchInput: document.getElementById('search-input'),
            stateFilter: document.getElementById('state-filter'),
            selectAllBtn: document.getElementById('select-all-btn'),
            clearSelectionBtn: document.getElementById('clear-selection-btn'),
            downloadSelectedBtn: document.getElementById('download-selected-btn'),
            documentsGrid: document.getElementById('documents-grid'),
            loadingState: document.getElementById('loading-state'),
            emptyState: document.getElementById('empty-state'),
            totalDocuments: document.getElementById('total-documents'),
            selectedCount: document.getElementById('selected-count'),
            downloadModal: new bootstrap.Modal(document.getElementById('downloadModal')),
            closeDownloadModal: document.getElementById('close-download-modal')
        };
    }

    setupEventListeners() {
        // Search functionality
        this.elements.searchInput.addEventListener('input', 
            this.debounce(() => this.filterDocuments(), 300));

        // Filter by state
        this.elements.stateFilter.addEventListener('change', () => this.filterDocuments());

        // Bulk actions
        this.elements.selectAllBtn.addEventListener('click', () => this.selectAll());
        this.elements.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        this.elements.downloadSelectedBtn.addEventListener('click', () => this.downloadSelected());

        // Modal close
        this.elements.closeDownloadModal.addEventListener('click', () => {
            this.elements.downloadModal.hide();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupSounds() {
        // Audio context for UI sounds
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not supported');
        }
    }

    playSound(frequency, duration) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    async loadDocuments() {
        try {
            console.log('Starting to load documents...');
            this.showLoading(true);
            
            // Check if Firebase is available
            if (!firebase || !firebase.firestore) {
                throw new Error('Firebase Firestore not available');
            }
            
            console.log('Firebase available, getting documents from asesores collection...');
            
            // Get documents from Firestore
            const documentsSnapshot = await firebase.firestore()
                .collection('asesores')
                .get();

            console.log('Documents snapshot received, size:', documentsSnapshot.size);
            this.documents = [];
            
            documentsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log('Processing document ID:', doc.id);
                console.log('Document data:', data);
                
                // Only include documents that have URLs for download
                if (this.hasDownloadableContent(data)) {
                    const processedDoc = {
                        id: doc.id,
                        ...data,
                        displayName: this.getDisplayName(data),
                        downloadUrls: this.getDownloadUrls(data)
                    };
                    console.log('Processed document:', processedDoc);
                    this.documents.push(processedDoc);
                } else {
                    console.log('Document has no downloadable content, skipping:', doc.id);
                }
            });

            console.log('Total documents processed:', this.documents.length);
            this.filteredDocuments = [...this.documents];
            this.updateStats();
            this.renderDocuments();
            this.showLoading(false);
            
            this.playSound(440, 0.1); // Success sound
            
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('Error al cargar los documentos: ' + error.message);
            this.showLoading(false);
        }
    }

    hasDownloadableContent(data) {
        // First, let's check what URL fields actually exist in the data
        console.log('All data fields:', Object.keys(data));
        
        // Correct URL field names based on your specification
        const urlFields = [
            'comprobanteDomicilioUrl',
            'comprobanteInscripcionUrl',
            'credencialUnamUrl',
            'curpUrl',
            'historialAcademicoUrl',
            'ineUrl'
        ];
        
        console.log('Checking downloadable content for fields:', urlFields);
        
        const hasContent = urlFields.some(field => {
            const hasField = data[field] && data[field].trim() !== '';
            if (hasField) {
                console.log(`Found content in field ${field}:`, data[field]);
            }
            return hasField;
        });
        
        console.log('Document has downloadable content:', hasContent);
        return hasContent;
    }

    getDisplayName(data) {
        // Priority order for display name
        if (data.nombreAsesor) {
            return data.nombreAsesor;
        }
        
        if (data.emailInstitucional) {
            // Extract name from institutional email
            const emailParts = data.emailInstitucional.split('@')[0];
            return emailParts.replace(/\./g, ' ').toUpperCase();
        }
        
        return data.curp || data.correoElectronico || 'Documento sin nombre';
    }

    getDownloadUrls(data) {
        const urls = [];
        
        // Correct URL field names with proper labels
        const urlFields = {
            'comprobanteDomicilioUrl': 'Comprobante de Domicilio',
            'comprobanteInscripcionUrl': 'Comprobante de Inscripción', 
            'credencialUnamUrl': 'Credencial UNAM',
            'curpUrl': 'CURP',
            'historialAcademicoUrl': 'Historial Académico',
            'ineUrl': 'INE'
        };

        Object.entries(urlFields).forEach(([field, label]) => {
            if (data[field] && data[field].trim() !== '') {
                urls.push({
                    url: data[field],
                    label: label,
                    field: field
                });
            }
        });

        return urls;
    }

    filterDocuments() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        const stateFilter = this.elements.stateFilter.value;

        this.filteredDocuments = this.documents.filter(doc => {
            // Search filter - now searches in nombreAsesor and numeroCuenta
            const matchesSearch = !searchTerm || 
                (doc.nombreAsesor && doc.nombreAsesor.toLowerCase().includes(searchTerm)) ||
                (doc.numeroCuenta && doc.numeroCuenta.toString().toLowerCase().includes(searchTerm)) ||
                // Keep other fields as backup
                doc.displayName.toLowerCase().includes(searchTerm) ||
                (doc.curp && doc.curp.toLowerCase().includes(searchTerm)) ||
                (doc.correoElectronico && doc.correoElectronico.toLowerCase().includes(searchTerm)) ||
                (doc.emailInstitucional && doc.emailInstitucional.toLowerCase().includes(searchTerm));

            // State filter
            const matchesState = !stateFilter || doc.estado === stateFilter;

            return matchesSearch && matchesState;
        });

        this.updateStats();
        this.renderDocuments();
        this.updateSelectionAfterFilter();
    }

    updateSelectionAfterFilter() {
        // Remove selected documents that are no longer visible
        const visibleIds = new Set(this.filteredDocuments.map(doc => doc.id));
        const newSelection = new Set();
        
        this.selectedDocuments.forEach(id => {
            if (visibleIds.has(id)) {
                newSelection.add(id);
            }
        });
        
        this.selectedDocuments = newSelection;
        this.updateDownloadButton();
        this.updateStats();
    }

    renderDocuments() {
        const grid = this.elements.documentsGrid;
        
        if (this.filteredDocuments.length === 0) {
            grid.innerHTML = '';
            this.elements.emptyState.style.display = 'block';
            return;
        }

        this.elements.emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredDocuments.map((doc, index) => {
            const isSelected = this.selectedDocuments.has(doc.id);
            const statusClass = `status-${doc.estado || 'pendiente'}`;
            const statusIcon = this.getStatusIcon(doc.estado);
            
            return `
                <div class="col-lg-6 col-xl-4 fade-in-up" style="animation-delay: ${index * 0.1}s">
                    <div class="document-card ${isSelected ? 'selected' : ''}" data-id="${doc.id}">
                        <input type="checkbox" class="document-checkbox" 
                               ${isSelected ? 'checked' : ''} 
                               onchange="adminDownloads.toggleSelection('${doc.id}')">
                        
                        <div class="document-info">
                            <h3 class="document-name">${doc.displayName}</h3>
                            
                            <div class="document-details">
                                <div class="detail-item">
                                    <i class="bi bi-person-badge"></i>
                                    <span>${doc.curp || 'No disponible'}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-envelope"></i>
                                    <span>${doc.correoElectronico || 'No disponible'}</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-files"></i>
                                    <span>${doc.downloadUrls.length} documento(s)</span>
                                </div>
                                <div class="detail-item">
                                    <i class="bi bi-calendar-event"></i>
                                    <span>${this.formatDate(doc.fechaActualizacion || doc.fechaNacimiento)}</span>
                                </div>
                            </div>
                            
                            <div class="document-status ${statusClass}">
                                <i class="bi ${statusIcon}"></i>
                                ${this.getStatusText(doc.estado)}
                            </div>
                            
                            <div class="document-actions">
                                <button class="btn-document-action btn-download-single" 
                                        onclick="adminDownloads.downloadSingle('${doc.id}')">
                                    <i class="bi bi-download"></i>
                                    Descargar
                                </button>
                                <button class="btn-document-action btn-view-details" 
                                        onclick="adminDownloads.viewDetails('${doc.id}')">
                                    <i class="bi bi-eye"></i>
                                    Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusIcon(estado) {
        const icons = {
            'aprobado': 'bi-check-circle-fill',
            'pendiente': 'bi-clock-fill',
            'rechazado': 'bi-x-circle-fill'
        };
        return icons[estado] || 'bi-question-circle-fill';
    }

    getStatusText(estado) {
        const texts = {
            'aprobado': 'Aprobado',
            'pendiente': 'Pendiente',
            'rechazado': 'Rechazado'
        };
        return texts[estado] || 'Sin Estado';
    }

    formatDate(dateString) {
        if (!dateString) return 'Fecha no disponible';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Fecha inválida';
        }
    }

    toggleSelection(docId) {
        if (this.selectedDocuments.has(docId)) {
            this.selectedDocuments.delete(docId);
            this.playSound(300, 0.1);
        } else {
            this.selectedDocuments.add(docId);
            this.playSound(500, 0.1);
        }
        
        this.updateDocumentCardSelection(docId);
        this.updateDownloadButton();
        this.updateStats();
    }

    updateDocumentCardSelection(docId) {
        const card = document.querySelector(`[data-id="${docId}"]`);
        if (card) {
            const isSelected = this.selectedDocuments.has(docId);
            card.classList.toggle('selected', isSelected);
            
            const checkbox = card.querySelector('.document-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        }
    }

    selectAll() {
        this.selectedDocuments.clear();
        this.filteredDocuments.forEach(doc => {
            this.selectedDocuments.add(doc.id);
        });
        
        this.updateAllDocumentCards();
        this.updateDownloadButton();
        this.updateStats();
        this.playSound(600, 0.2);
        
        this.showNotification('Todos los documentos seleccionados', 'success');
    }

    clearSelection() {
        this.selectedDocuments.clear();
        this.updateAllDocumentCards();
        this.updateDownloadButton();
        this.updateStats();
        this.playSound(200, 0.1);
        
        this.showNotification('Selección limpiada', 'info');
    }

    updateAllDocumentCards() {
        document.querySelectorAll('.document-card').forEach(card => {
            const docId = card.getAttribute('data-id');
            const isSelected = this.selectedDocuments.has(docId);
            
            card.classList.toggle('selected', isSelected);
            
            const checkbox = card.querySelector('.document-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
        });
    }

    updateDownloadButton() {
        const btn = this.elements.downloadSelectedBtn;
        const count = this.selectedDocuments.size;
        
        btn.disabled = count === 0;
        
        if (count === 0) {
            btn.querySelector('.download-text').textContent = 'Selecciona documentos';
        } else {
            btn.querySelector('.download-text').textContent = `Descargar ${count} documento(s)`;
        }
    }

    updateStats() {
        this.elements.totalDocuments.textContent = this.filteredDocuments.length;
        this.elements.selectedCount.textContent = this.selectedDocuments.size;
    }

    async downloadSelected() {
        if (this.selectedDocuments.size === 0) return;
        
        const selectedDocs = this.documents.filter(doc => 
            this.selectedDocuments.has(doc.id)
        );
        
        await this.downloadMultipleDocuments(selectedDocs);
    }

    async downloadSingle(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        await this.downloadMultipleDocuments([doc]);
    }

    async downloadMultipleDocuments(docs) {
        this.downloadProgress.current = 0;
        this.downloadProgress.total = docs.reduce((sum, doc) => sum + doc.downloadUrls.length, 0);
        this.downloadProgress.currentFile = '';
        
        this.elements.downloadModal.show();
        this.updateDownloadProgress();
        
        const logList = document.getElementById('download-log-list');
        logList.innerHTML = '';
        
        try {
            for (const doc of docs) {
                for (const urlInfo of doc.downloadUrls) {
                    this.downloadProgress.currentFile = `${doc.displayName} - ${urlInfo.label}`;
                    this.updateDownloadProgress();
                    
                    try {
                        await this.downloadFile(urlInfo.url, `${doc.displayName}_${urlInfo.label}`);
                        this.addDownloadLog(`✓ ${this.downloadProgress.currentFile}`, 'success');
                    } catch (error) {
                        console.error('Download error:', error);
                        this.addDownloadLog(`✗ Error: ${this.downloadProgress.currentFile}`, 'error');
                    }
                    
                    this.downloadProgress.current++;
                    this.updateDownloadProgress();
                    
                    // Small delay between downloads
                    await this.delay(500);
                }
            }
            
            this.playSound(800, 0.3);
            this.showNotification('Descarga completada', 'success');
            
        } catch (error) {
            console.error('Download process error:', error);
            this.showNotification('Error durante la descarga', 'error');
        } finally {
            document.getElementById('close-download-modal').disabled = false;
            this.downloadProgress.currentFile = 'Descarga completada';
            this.updateDownloadProgress();
        }
    }

    async downloadFile(url, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.sanitizeFilename(filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
            
        } catch (error) {
            throw new Error(`Failed to download ${filename}: ${error.message}`);
        }
    }

    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
    }

    updateDownloadProgress() {
        const percentage = this.downloadProgress.total > 0 
            ? (this.downloadProgress.current / this.downloadProgress.total) * 100 
            : 0;
            
        document.querySelector('.modal .progress-bar').style.width = `${percentage}%`;
        document.querySelector('.current-file').textContent = this.downloadProgress.currentFile;
        document.querySelector('.download-count').textContent = 
            `${this.downloadProgress.current} / ${this.downloadProgress.total}`;
    }

    addDownloadLog(message, type = 'info') {
        const logList = document.getElementById('download-log-list');
        const li = document.createElement('li');
        li.className = type;
        li.textContent = message;
        logList.appendChild(li);
        logList.scrollTop = logList.scrollHeight;
    }

    viewDetails(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        const details = {
            'ID': doc.id,
            'Nombre': doc.displayName,
            'CURP': doc.curp || 'No disponible',
            'Email': doc.correoElectronico || 'No disponible',
            'Email Institucional': doc.emailInstitucional || 'No disponible',
            'Estado': this.getStatusText(doc.estado),
            'Fecha de Nacimiento': doc.fechaNacimiento || 'No disponible',
            'Fecha de Actualización': doc.fechaActualizacion || 'No disponible',
            'Documentos disponibles': doc.downloadUrls.map(url => url.label).join(', ')
        };
        
        const detailsHtml = Object.entries(details)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
            
        if (window.SICAComponents && window.SICAComponents.notify) {
            window.SICAComponents.notify(
                'Detalles del Documento',
                detailsHtml,
                'info',
                'bi-info-circle-fill'
            );
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'd':
                    e.preventDefault();
                    if (this.selectedDocuments.size > 0) {
                        this.downloadSelected();
                    }
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.clearSelection();
        }
    }

    showLoading(show) {
        this.elements.loadingState.style.display = show ? 'block' : 'none';
        this.elements.documentsGrid.style.display = show ? 'none' : 'block';
    }

    showNotification(message, type = 'info') {
        if (window.SICAComponents && window.SICAComponents.notify) {
            const icons = {
                'success': 'bi-check-circle-fill',
                'error': 'bi-exclamation-triangle-fill',
                'info': 'bi-info-circle-fill',
                'warning': 'bi-exclamation-circle-fill'
            };
            
            window.SICAComponents.notify(
                type.charAt(0).toUpperCase() + type.slice(1),
                message,
                type,
                icons[type]
            );
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Downloads page loaded');
    
    // Wait for Firebase to initialize
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        alert('Error: Firebase no está disponible');
        return;
    }
    
    // Add a timeout fallback in case auth state doesn't trigger
    let authCheckTimeout = setTimeout(() => {
        console.log('Auth check timeout - initializing anyway');
        // If user is already logged in but auth state didn't trigger, try to initialize
        const user = firebase.auth().currentUser;
        if (user) {
            console.log('Current user found:', user.email);
            window.adminDownloads = new AdminDownloadsManager();
        } else {
            console.log('No user found, redirecting to index');
            window.location.href = '../index.html';
        }
    }, 3000);
    
    // Check if user is authenticated (only admins have accounts)
    firebase.auth().onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        clearTimeout(authCheckTimeout); // Cancel timeout since auth state triggered
        
        if (user) {
            console.log('User authenticated:', user.email);
            console.log('Initializing admin downloads manager...');
            
            try {
                // Initialize admin downloads manager
                window.adminDownloads = new AdminDownloadsManager();
            } catch (error) {
                console.error('Error initializing AdminDownloadsManager:', error);
            }
        } else {
            console.log('No user authenticated, redirecting to index');
            // Redirect unauthenticated users to index instead of login
            window.location.href = '../index.html';
        }
    });
});

// Export for global access
window.AdminDownloadsManager = AdminDownloadsManager;