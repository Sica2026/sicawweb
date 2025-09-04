 
 firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Usuario autenticado, continuar con la inicialización
    document.body.classList.add('admin-authenticated');
});

class LockerManager {
            constructor() {
                this.currentData = new Map();
                this.proposalData = new Map();
                this.viewMode = 'current';
                this.loading = false;
                this.availableUsers = [];
                this.currentAssignment = {
                    lockerNumber: null,
                    users: [],
                    keys: 2
                };
                this.init();
            }

            async init() {
                try {
                    if (typeof SICAComponents !== 'undefined') {
                        SICAComponents.setPageTitle("Gestión de Lockers - SICA 1");
                    }
                    this.setupEventListeners();
                    this.initializeLockers();
                    await this.loadDataFromFirebase();
                    this.updateDisplay();
                } catch (error) {
                    console.error('Error initializing locker manager:', error);
                    this.showError('Error al cargar los datos de lockers');
                }
            }

            setupEventListeners() {
                document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        this.viewMode = e.target.value;
                        this.toggleViewMode();
                    });
                });

                document.getElementById('resetProposalBtn')?.addEventListener('click', () => {
                    this.resetProposal();
                });

                document.getElementById('uploadBtn')?.addEventListener('click', () => {
                    this.uploadToFirebase();
                });
            }

            initializeLockers() {
                const cabinet1 = document.getElementById('cabinet1');
                const cabinet2 = document.getElementById('cabinet2');

                for (let i = 1; i <= 10; i++) {
                    cabinet1.appendChild(this.createLockerElement(i));
                }
                for (let i = 11; i <= 18; i++) {
                    cabinet2.appendChild(this.createLockerElement(i));
                }
            }

            createLockerElement(number) {
                const locker = document.createElement('div');
                locker.className = 'locker available';
                locker.id = `locker-${number}`;
                locker.setAttribute('data-locker', number);
                locker.innerHTML = `
                    <div class="locker-keys">2</div>
                    <div class="locker-number">${number}</div>
                    <div class="locker-status">Disponible</div>
                    <div class="locker-users"></div>
                `;
                locker.addEventListener('click', () => this.showLockerDetails(number));
                return locker;
            }

            async loadDataFromFirebase() {
                try {
                    this.setLoading(true);
                    if (!firebase.apps.length) {
                        throw new Error('Firebase no está inicializado');
                    }

                    const db = firebase.firestore();
                    const storage = firebase.storage();
                    const asesoresCollection = await db.collection('asesores').get();
                    
                    this.currentData.clear();
                    this.availableUsers = [];
                    
                    for (const doc of asesoresCollection.docs) {
                        const data = doc.data();
                        const lockerId = data.locker;
                        
                        const photoUrl = await this.loadUserPhoto(storage, doc.id);
                        
                        const user = {
                            id: doc.id,
                            numeroCuenta: data.numeroCuenta,
                            nombreHorario: data.nombreHorario,
                            type: data.type || 'asesor',
                            photoUrl: photoUrl,
                            currentLocker: lockerId
                        };
                        
                        this.availableUsers.push(user);
                        
                        if (lockerId && lockerId >= 1 && lockerId <= 18) {
                            if (!this.currentData.has(lockerId)) {
                                this.currentData.set(lockerId, {
                                    users: [],
                                    type: 'asesor',
                                    keys: 2
                                });
                            }
                            
                            this.currentData.get(lockerId).users.push(user);
                            
                            if (data.type === 'administrador') {
                                this.currentData.get(lockerId).type = 'administrador';
                                this.currentData.get(lockerId).keys = 2;
                            }
                        }
                    }

                    this.availableUsers.sort((a, b) => a.nombreHorario.localeCompare(b.nombreHorario));
                    this.proposalData = new Map(this.currentData);
                    
                } catch (error) {
                    console.error('Error loading Firebase data:', error);
                    this.showError('Error al cargar datos desde Firebase: ' + error.message);
                } finally {
                    this.setLoading(false);
                }
            }

            async loadUserPhoto(storage, asesorId) {
                try {
                    const photoRef = storage.ref(`documentos_asesores/${asesorId}/foto_asesor`);
                    const photoUrl = await photoRef.getDownloadURL();
                    return photoUrl;
                } catch (error) {
                    console.warn(`Photo not found for ${asesorId}:`, error);
                    return null;
                }
            }

            updateDisplay() {
                const dataToShow = this.viewMode === 'current' ? this.currentData : this.proposalData;
                
                for (let i = 1; i <= 18; i++) {
                    const lockerElement = document.getElementById(`locker-${i}`);
                    const lockerData = dataToShow.get(i);
                    this.updateLockerElement(lockerElement, i, lockerData);
                }
                
                this.updateStats(dataToShow);
                this.updateUploadButton(); // Actualizar el botón de subir
            }

            updateLockerElement(element, number, data) {
                const keysElement = element.querySelector('.locker-keys');
                const statusElement = element.querySelector('.locker-status');
                const usersElement = element.querySelector('.locker-users');
                
                element.className = 'locker';
                
                if (!data || data.users.length === 0) {
                    element.classList.add('available');
                    statusElement.textContent = 'Disponible';
                    usersElement.innerHTML = '';
                    keysElement.textContent = '2';
                } else {
                    const users = data.users;
                    const isAdmin = data.type === 'administrador';
                    
                    if (isAdmin) {
                        element.classList.add('occupied-admin');
                        statusElement.textContent = 'Administrador';
                        keysElement.textContent = '2';
                    } else if (users.length === 1) {
                        element.classList.add('occupied-partial');
                        statusElement.textContent = 'Ocupado (1/2)';
                        keysElement.textContent = '1';
                    } else {
                        element.classList.add('occupied-full');
                        statusElement.textContent = 'Ocupado (2/2)';
                        keysElement.textContent = '0';
                    }
                    
                    if (users.length === 1) {
                        const user = users[0];
                        const photoHtml = user.photoUrl ? 
                            `<img src="${user.photoUrl}" alt="${user.nombreHorario}" class="user-photo">` :
                            `<div class="user-initials">${user.nombreHorario.charAt(0).toUpperCase()}</div>`;
                        
                        usersElement.innerHTML = `
                            <div class="locker-user-single">
                                <div class="locker-user-photo">${photoHtml}</div>
                                <div class="locker-user-name">${user.nombreHorario.split(' ')[0]}</div>
                            </div>
                        `;
                    } else if (users.length === 2) {
                        const usersHtml = users.map(user => {
                            const photoHtml = user.photoUrl ? 
                                `<img src="${user.photoUrl}" alt="${user.nombreHorario}" class="user-photo-mini">` :
                                `<div class="user-initials-mini">${user.nombreHorario.charAt(0).toUpperCase()}</div>`;
                            return `<div class="locker-user-mini">${photoHtml}</div>`;
                        }).join('');
                        
                        usersElement.innerHTML = `<div class="locker-users-double">${usersHtml}</div>`;
                    }
                }
            }

            updateStats(dataToShow) {
                let occupied = 0, available = 0, totalKeys = 0, totalUsers = 0;

                for (let i = 1; i <= 18; i++) {
                    const lockerData = dataToShow.get(i);
                    
                    if (!lockerData || lockerData.users.length === 0) {
                        available++;
                        totalKeys += 2;
                    } else {
                        occupied++;
                        totalUsers += lockerData.users.length;
                        
                        if (lockerData.type === 'administrador') {
                            totalKeys += 0;
                        } else if (lockerData.users.length === 1) {
                            totalKeys += 1;
                        } else {
                            totalKeys += 0;
                        }
                    }
                }

                document.getElementById('occupiedCount').textContent = occupied;
                document.getElementById('availableCount').textContent = available;
                document.getElementById('keysCount').textContent = totalKeys;
                document.getElementById('usersCount').textContent = totalUsers;
            }

            // Nueva función para actualizar el estado del botón de subir
            updateUploadButton() {
                const uploadBtn = document.getElementById('uploadBtn');
                if (!uploadBtn) return;

                if (this.viewMode === 'proposal') {
                    // Verificar si hay cambios entre la propuesta y los datos actuales
                    const hasChanges = this.hasProposalChanges();
                    uploadBtn.disabled = !hasChanges;
                    
                    if (hasChanges) {
                        uploadBtn.title = 'Subir cambios a Firebase';
                    } else {
                        uploadBtn.title = 'No hay cambios para subir';
                    }
                } else {
                    uploadBtn.disabled = true;
                    uploadBtn.title = 'Solo disponible en vista de propuesta';
                }
            }

            // Verificar si hay cambios en la propuesta
            hasProposalChanges() {
                // Comparar si hay diferencias entre currentData y proposalData
                if (this.currentData.size !== this.proposalData.size) {
                    return true;
                }

                for (let [lockerNumber, proposalData] of this.proposalData) {
                    const currentData = this.currentData.get(lockerNumber);
                    
                    if (!currentData && proposalData.users.length > 0) {
                        return true;
                    }
                    
                    if (currentData && !proposalData) {
                        return true;
                    }
                    
                    if (currentData && proposalData) {
                        // Comparar usuarios
                        const currentUserIds = currentData.users.map(u => u.id).sort();
                        const proposalUserIds = proposalData.users.map(u => u.id).sort();
                        
                        if (JSON.stringify(currentUserIds) !== JSON.stringify(proposalUserIds)) {
                            return true;
                        }
                        
                        // Comparar tipo y llaves
                        if (currentData.type !== proposalData.type || currentData.keys !== proposalData.keys) {
                            return true;
                        }
                    }
                }

                // Verificar lockers que están en currentData pero no en proposalData
                for (let [lockerNumber, currentData] of this.currentData) {
                    if (!this.proposalData.has(lockerNumber) && currentData.users.length > 0) {
                        return true;
                    }
                }

                return false;
            }

            // Nueva función para subir los cambios a Firebase
            async uploadToFirebase() {
                const uploadBtn = document.getElementById('uploadBtn');
                let originalText = '';
                
                try {
                    if (!uploadBtn || uploadBtn.disabled) return;

                    // Mostrar loading en el botón
                    originalText = uploadBtn.innerHTML;
                    uploadBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-1"></i>Subiendo...';
                    uploadBtn.disabled = true;

                    const db = firebase.firestore();
                    const batch = db.batch();
                    let updatesCount = 0;

                    // Crear un mapa de todos los usuarios con sus lockers actuales
                    const userLockerMap = new Map();
                    
                    // Primero, mapear todos los usuarios en la propuesta
                    for (let [lockerNumber, lockerData] of this.proposalData) {
                        if (lockerData && lockerData.users.length > 0) {
                            for (let user of lockerData.users) {
                                userLockerMap.set(user.id, lockerNumber);
                            }
                        }
                    }

                    // También mapear usuarios que están en currentData pero no en proposal (para desasignarlos)
                    for (let [lockerNumber, lockerData] of this.currentData) {
                        if (lockerData && lockerData.users.length > 0) {
                            for (let user of lockerData.users) {
                                if (!userLockerMap.has(user.id)) {
                                    userLockerMap.set(user.id, null); // null significa desasignar
                                }
                            }
                        }
                    }

                    // Actualizar todos los documentos de asesores
                    for (let [userId, lockerNumber] of userLockerMap) {
                        const userRef = db.collection('asesores').doc(userId);
                        
                        if (lockerNumber === null) {
                            // Remover el campo locker
                            batch.update(userRef, {
                                locker: firebase.firestore.FieldValue.delete()
                            });
                        } else {
                            // Asignar nuevo locker
                            batch.update(userRef, {
                                locker: lockerNumber
                            });
                        }
                        updatesCount++;
                    }

                    // Ejecutar todas las actualizaciones
                    if (updatesCount > 0) {
                        await batch.commit();
                        
                        // Actualizar los datos locales
                        this.currentData = new Map(this.proposalData);
                        
                        this.showNotification(
                            'Actualización Exitosa',
                            `Se actualizaron ${updatesCount} asignaciones de lockers correctamente`,
                            'success',
                            'bi-cloud-check'
                        );
                        
                        // Actualizar la vista
                        this.updateDisplay();
                    } else {
                        this.showNotification(
                            'Sin Cambios',
                            'No hay cambios para actualizar',
                            'info',
                            'bi-info-circle'
                        );
                    }

                } catch (error) {
                    console.error('Error uploading to Firebase:', error);
                    this.showError('Error al subir los cambios: ' + error.message);
                } finally {
                    // Restaurar el botón
                    const uploadBtn = document.getElementById('uploadBtn');
                    if (uploadBtn) {
                        uploadBtn.innerHTML = originalText;
                        this.updateUploadButton();
                    }
                }
            }

            showLockerDetails(lockerNumber) {
                const dataToShow = this.viewMode === 'current' ? this.currentData : this.proposalData;
                const lockerData = dataToShow.get(lockerNumber);
                
                const modal = new bootstrap.Modal(document.getElementById('lockerModal'));
                const modalTitle = document.getElementById('modalTitle');
                const modalBody = document.getElementById('modalBody');
                const modalFooter = document.getElementById('modalFooter');
                
                modalTitle.innerHTML = `<i class="bi bi-archive me-2"></i>Locker ${lockerNumber} - ${this.viewMode === 'current' ? 'Vista Actual' : 'Propuesta'}`;
                
                let bodyContent = '';
                let footerContent = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>';
                
                if (!lockerData || lockerData.users.length === 0) {
                    bodyContent = `
                        <div class="text-center py-4">
                            <div class="stat-icon available mx-auto mb-3">
                                <i class="bi bi-archive"></i>
                            </div>
                            <h4>Locker Disponible</h4>
                            <p class="text-muted">Este locker está libre y puede ser asignado</p>
                        </div>
                    `;
                    
                    if (this.viewMode === 'proposal') {
                        footerContent = `
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-sica" id="assignLockerBtn">
                                <i class="bi bi-plus-circle me-1"></i>Asignar Usuario
                            </button>
                        `;
                    }
                } else {
                    const users = lockerData.users;
                    const availableKeys = lockerData.keys || (lockerData.type === 'administrador' ? 0 : (2 - users.length));
                    
                    bodyContent = `
                        <div class="mb-4">
                            <h5 class="mb-3">${lockerData.type === 'administrador' ? 'Administrador Asignado' : `Usuarios Asignados (${users.length}/2)`}</h5>
                            <div class="users-list">
                                ${users.map(user => {
                                    const photoHtml = user.photoUrl ? 
                                        `<img src="${user.photoUrl}" alt="${user.nombreHorario}" class="user-photo-modal">` :
                                        `<div class="user-initials-modal">${user.nombreHorario.charAt(0).toUpperCase()}</div>`;
                                    
                                    return `
                                        <div class="user-card">
                                            <div class="user-info">
                                                <div class="user-avatar-modal">${photoHtml}</div>
                                                <div class="flex-grow-1">
                                                    <h6 class="mb-1">${user.nombreHorario}</h6>
                                                    <small class="text-muted">Cuenta: ${user.numeroCuenta}</small>
                                                    <div class="user-type-badge ${user.type === 'administrador' ? 'admin' : 'asesor'}">
                                                        <i class="bi bi-${user.type === 'administrador' ? 'shield-fill' : 'person-fill'} me-1"></i>
                                                        ${user.type === 'administrador' ? 'Administrador' : 'Asesor'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="row mt-4">
                                <div class="col-6">
                                    <div class="text-center p-3 bg-light rounded">
                                        <i class="bi bi-key-fill text-warning fs-4"></i>
                                        <div class="mt-2">
                                            <strong>Llaves Disponibles</strong>
                                            <div class="fs-4 ${availableKeys > 0 ? 'text-success' : 'text-danger'}">${availableKeys}</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="text-center p-3 bg-light rounded">
                                        <i class="bi bi-people-fill text-primary fs-4"></i>
                                        <div class="mt-2">
                                            <strong>Espacios Libres</strong>
                                            <div class="fs-4 ${lockerData.type === 'administrador' ? 'text-danger' : users.length < 2 ? 'text-success' : 'text-danger'}">
                                                ${lockerData.type === 'administrador' ? 0 : 2 - users.length}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    if (this.viewMode === 'proposal') {
                        footerContent = `
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-sica" id="assignLockerBtn">
                                <i class="bi bi-pencil me-1"></i>Modificar Asignación
                            </button>
                        `;
                    }
                }
                
                modalBody.innerHTML = bodyContent;
                modalFooter.innerHTML = footerContent;
                
                const assignBtn = document.getElementById('assignLockerBtn');
                if (assignBtn) {
                    assignBtn.addEventListener('click', () => {
                        modal.hide();
                        this.showAssignmentModal(lockerNumber);
                    });
                }
                
                modal.show();
            }

            showAssignmentModal(lockerNumber) {
                const modal = new bootstrap.Modal(document.getElementById('assignmentModal'));
                const modalBody = document.getElementById('assignmentModalBody');
                
                this.currentAssignment = {
                    lockerNumber: lockerNumber,
                    users: [],
                    keys: 2
                };

                const currentLockerData = this.proposalData.get(lockerNumber);
                const currentUsers = currentLockerData ? currentLockerData.users : [];
                
                modalBody.innerHTML = `
                    <div class="assignment-info">
                        <h5><i class="bi bi-archive-fill me-2"></i>Configurando Locker ${lockerNumber}</h5>
                        <p class="mb-0">Selecciona hasta 2 usuarios y configura la cantidad de llaves</p>
                    </div>

                    <div class="assignment-container">
                        <h6>Usuario 1</h6>
                        <div class="user-selection-container active" id="userSelection1">
                            <input type="text" class="form-control user-search-input" id="userSearch1" placeholder="Buscar por nombre o cuenta...">
                            <div class="user-dropdown d-none" id="userDropdown1"></div>
                            <div class="selected-user d-none" id="selectedUser1"></div>
                        </div>
                    </div>

                    <div class="assignment-container">
                        <h6>Usuario 2 (Opcional)</h6>
                        <div class="user-selection-container" id="userSelection2">
                            <input type="text" class="form-control user-search-input" id="userSearch2" placeholder="Buscar por nombre o cuenta...">
                            <div class="user-dropdown d-none" id="userDropdown2"></div>
                            <div class="selected-user d-none" id="selectedUser2"></div>
                        </div>
                    </div>

                    <div class="keys-management">
                        <h6 class="text-center mb-3"><i class="bi bi-key-fill me-2"></i>Gestión de Llaves</h6>
                        <div class="keys-counter">
                            <button type="button" class="keys-btn" id="decreaseKeys">-</button>
                            <div class="keys-display" id="keysDisplay">2</div>
                            <button type="button" class="keys-btn" id="increaseKeys">+</button>
                        </div>
                    </div>

                    <div class="assignment-summary">
                        <h6><i class="bi bi-clipboard-check me-2"></i>Resumen de Asignación</h6>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <div class="fw-bold" id="summaryUsers">0 usuarios</div>
                            </div>
                            <div class="summary-item">
                                <div class="fw-bold" id="summaryKeys">2 llaves</div>
                            </div>
                            <div class="summary-item">
                                <div class="fw-bold" id="summaryCapacity">Disponible</div>
                            </div>
                        </div>
                    </div>
                `;

                this.setupAssignmentEventListeners();
                
                if (currentUsers.length > 0) {
                    this.selectUser(1, currentUsers[0]);
                    if (currentUsers.length > 1) {
                        this.selectUser(2, currentUsers[1]);
                    }
                    this.currentAssignment.keys = currentLockerData.keys || 2;
                    document.getElementById('keysDisplay').textContent = this.currentAssignment.keys;
                }

                this.updateAssignmentSummary();
                modal.show();
            }

            setupAssignmentEventListeners() {
                document.getElementById('userSearch1').addEventListener('input', (e) => {
                    this.handleUserSearch(1, e.target.value);
                });

                document.getElementById('userSearch2').addEventListener('input', (e) => {
                    this.handleUserSearch(2, e.target.value);
                });

                document.getElementById('decreaseKeys').addEventListener('click', () => {
                    this.adjustKeys(-1);
                });

                document.getElementById('increaseKeys').addEventListener('click', () => {
                    this.adjustKeys(1);
                });

                document.getElementById('confirmAssignmentBtn').addEventListener('click', () => {
                    this.confirmAssignment();
                });
            }

            handleUserSearch(userNumber, query) {
                const dropdown = document.getElementById(`userDropdown${userNumber}`);
                
                if (query.length < 2) {
                    dropdown.classList.add('d-none');
                    return;
                }

                const filteredUsers = this.availableUsers.filter(user => {
                    const nameMatch = user.nombreHorario.toLowerCase().includes(query.toLowerCase());
                    const accountMatch = user.numeroCuenta.toString().includes(query);
                    const notCurrentlySelected = !this.currentAssignment.users.some(u => u && u.id === user.id);
                    return (nameMatch || accountMatch) && notCurrentlySelected;
                });

                if (filteredUsers.length === 0) {
                    dropdown.innerHTML = '<div class="user-option">No se encontraron usuarios</div>';
                } else {
                    dropdown.innerHTML = filteredUsers.map(user => {
                        const photoHtml = user.photoUrl ? 
                            `<img src="${user.photoUrl}" alt="${user.nombreHorario}" class="user-photo-modal">` :
                            `<div class="user-initials-modal">${user.nombreHorario.charAt(0).toUpperCase()}</div>`;
                        
                        return `
                            <div class="user-option" data-user-id="${user.id}" data-user-number="${userNumber}">
                                <div class="user-avatar-modal">${photoHtml}</div>
                                <div>
                                    <div class="fw-bold">${user.nombreHorario}</div>
                                    <small class="text-muted">Cuenta: ${user.numeroCuenta}</small>
                                </div>
                            </div>
                        `;
                    }).join('');

                    dropdown.querySelectorAll('.user-option[data-user-id]').forEach(option => {
                        option.addEventListener('click', (e) => {
                            const userId = e.currentTarget.dataset.userId;
                            const userNum = e.currentTarget.dataset.userNumber;
                            const user = this.availableUsers.find(u => u.id === userId);
                            if (user) {
                                this.selectUser(parseInt(userNum), user);
                            }
                        });
                    });
                }

                dropdown.classList.remove('d-none');
            }

            selectUser(userNumber, user) {
                this.currentAssignment.users[userNumber - 1] = user;
                
                const searchInput = document.getElementById(`userSearch${userNumber}`);
                const selectedDiv = document.getElementById(`selectedUser${userNumber}`);
                const dropdown = document.getElementById(`userDropdown${userNumber}`);
                
                searchInput.value = user.nombreHorario;
                dropdown.classList.add('d-none');
                
                const photoHtml = user.photoUrl ? 
                    `<img src="${user.photoUrl}" alt="${user.nombreHorario}" class="user-photo-modal">` :
                    `<div class="user-initials-modal">${user.nombreHorario.charAt(0).toUpperCase()}</div>`;
                
                selectedDiv.innerHTML = `
                    <div class="selected-user-photo">${photoHtml}</div>
                    <div class="selected-user-info flex-grow-1">
                        <h6>${user.nombreHorario}</h6>
                        <small>Cuenta: ${user.numeroCuenta}</small>
                    </div>
                    <button type="button" class="remove-user-btn" onclick="lockerManager.removeUser(${userNumber})">
                        <i class="bi bi-x"></i>
                    </button>
                `;
                
                selectedDiv.classList.remove('d-none');
                searchInput.style.display = 'none';
                this.updateAssignmentSummary();
            }

            removeUser(userNumber) {
                this.currentAssignment.users[userNumber - 1] = null;
                const searchInput = document.getElementById(`userSearch${userNumber}`);
                const selectedDiv = document.getElementById(`selectedUser${userNumber}`);
                
                searchInput.value = '';
                searchInput.style.display = 'block';
                selectedDiv.classList.add('d-none');
                this.updateAssignmentSummary();
            }

            adjustKeys(change) {
                const newKeys = Math.max(0, Math.min(2, this.currentAssignment.keys + change));
                this.currentAssignment.keys = newKeys;
                document.getElementById('keysDisplay').textContent = newKeys;
                document.getElementById('decreaseKeys').disabled = newKeys <= 0;
                document.getElementById('increaseKeys').disabled = newKeys >= 2;
                this.updateAssignmentSummary();
            }

            updateAssignmentSummary() {
                const activeUsers = this.currentAssignment.users.filter(u => u !== null);
                const userCount = activeUsers.length;
                const keys = this.currentAssignment.keys;
                
                document.getElementById('summaryUsers').textContent = `${userCount} usuario${userCount !== 1 ? 's' : ''}`;
                document.getElementById('summaryKeys').textContent = `${keys} llave${keys !== 1 ? 's' : ''}`;
                
                let capacityText = 'Disponible';
                if (userCount === 2) capacityText = 'Completo';
                else if (userCount === 1) capacityText = 'Parcial';
                if (activeUsers.some(u => u.type === 'administrador')) capacityText = 'Administrador';
                
                document.getElementById('summaryCapacity').textContent = capacityText;
                
                const confirmBtn = document.getElementById('confirmAssignmentBtn');
                const hasValidAssignment = userCount > 0 || this.currentAssignment.keys !== 2;
                confirmBtn.disabled = !hasValidAssignment;
            }

            confirmAssignment() {
                const lockerNumber = this.currentAssignment.lockerNumber;
                const activeUsers = this.currentAssignment.users.filter(u => u !== null);
                const keys = this.currentAssignment.keys;
                
                if (activeUsers.length === 0) {
                    this.proposalData.delete(lockerNumber);
                } else {
                    const hasAdmin = activeUsers.some(u => u.type === 'administrador');
                    const lockerType = hasAdmin ? 'administrador' : 'asesor';
                    
                    this.proposalData.set(lockerNumber, {
                        users: activeUsers,
                        type: lockerType,
                        keys: keys
                    });
                }
                
                bootstrap.Modal.getInstance(document.getElementById('assignmentModal')).hide();
                this.updateDisplay();
                
                const userNames = activeUsers.map(u => u.nombreHorario).join(' y ');
                this.showNotification(
                    'Asignación Actualizada',
                    activeUsers.length > 0 ? 
                        `${userNames} asignado${activeUsers.length > 1 ? 's' : ''} al locker ${lockerNumber}` :
                        `Locker ${lockerNumber} liberado`,
                    'success',
                    'bi-check-circle'
                );
            }

            toggleViewMode() {
                const proposalActions = document.getElementById('proposalActions');
                proposalActions.style.display = this.viewMode === 'proposal' ? 'flex' : 'none';
                this.updateDisplay();
            }

            resetProposal() {
                this.proposalData = new Map(this.currentData);
                this.updateDisplay();
                this.showNotification('Propuesta Reiniciada', 'La propuesta ha vuelto al estado actual', 'success', 'bi-arrow-counterclockwise');
            }

            setLoading(loading) {
                this.loading = loading;
                const loadingState = document.getElementById('loadingState');
                const lockersContainer = document.getElementById('lockersContainer');
                
                if (loading) {
                    loadingState.style.display = 'block';
                    lockersContainer.style.display = 'none';
                } else {
                    loadingState.style.display = 'none';
                    lockersContainer.style.display = 'block';
                }
            }

            showNotification(title, message, type, icon) {
                if (typeof SICAComponents !== 'undefined') {
                    SICAComponents.notify(title, message, type, icon);
                } else {
                    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
                }
            }

            showError(message) {
                this.showNotification('Error', message, 'error', 'bi-exclamation-triangle');
            }
        }

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof firebase !== 'undefined') {
                window.lockerManager = new LockerManager();
            } else {
                console.error('Firebase no está disponible');
                document.getElementById('loadingState').innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Error: Firebase no está configurado correctamente
                    </div>
                `;
            }
        });