// ui-manager.js
// Módulo para manejo de interfaz de usuario

class UIManager {
    constructor(core) {
        this.core = core;
    }

    renderAsesores() {
        const groups = {
            'pendientes': [],
            'ya-registro': [],
            'en-proceso': [],
            'sin-creditos': [],
            'terminado': [],
            'cancelado': []
        };
        
        this.core.filteredAsesores.forEach(asesor => {
            const estado = asesor.servicioSocial.estadoTermino;
            
            if (!estado || estado === null || estado === undefined) {
                groups['pendientes'].push(asesor);
            } else if (groups[estado]) {
                groups[estado].push(asesor);
            }
        });
        
        Object.keys(groups).forEach(estado => {
            this.renderGroup(estado, groups[estado]);
        });
        
        this.toggleEmptyStates();
    }

    renderGroup(estado, asesores) {
        const container = document.querySelector(`#content-${estado} .cards-grid`);
        if (!container) return;
        
        container.innerHTML = '';
        
        asesores.forEach((asesor, index) => {
            const card = this.createAsesorCard(asesor, index);
            container.appendChild(card);
        });
        
        const countElement = document.getElementById(`count-${estado}`);
        if (countElement) {
            countElement.textContent = `${asesores.length} ${asesores.length === 1 ? 'asesor' : 'asesores'}`;
        }
        
        this.core.categoryCounts[estado] = asesores.length;
    }

    createAsesorCard(asesor, index) {
        const card = document.createElement('div');
        const isPending = !asesor.servicioSocial.estadoTermino;
        
        card.className = `asesor-card fade-in-up ${isPending ? 'pending-card' : ''}`;
        card.style.animationDelay = `${index * 0.1}s`;
        card.setAttribute('data-asesor-id', asesor.id);
        
        const nombreCompleto = asesor.nombreAsesor || 'Sin nombre';
        const fotoUrl = asesor.fotoUrl || '../image/default-avatar.png';
        const estado = asesor.servicioSocial.estadoTermino;
        
        let cardContent = `
            <img src="${fotoUrl}" alt="${nombreCompleto}" class="card-avatar" 
                 onerror="this.src='../image/default-avatar.png'">
            <h5 class="card-name">${nombreCompleto}</h5>
            <div class="card-cuenta">${asesor.numeroCuenta || 'Sin número'}</div>
            <div class="card-info">
                <div class="card-detail">
                    <i class="bi bi-building"></i>
                    <span>${asesor.escuela || 'Sin escuela'}</span>
                </div>
                <div class="card-detail">
                    <i class="bi bi-mortarboard"></i>
                    <span>${asesor.carrera || 'Sin carrera'}</span>
                </div>
                <div class="card-detail">
                    <i class="bi bi-graph-up"></i>
                    <span>${asesor.avance || 'Sin avance'}</span>
                </div>
        `;
        
        if (isPending) {
            cardContent += `
                </div>
                <div class="pending-badge">Sin Asignar</div>
                <div class="pending-prompt">Clic para asignar estado</div>
            `;
        } else {
            cardContent += `
                ${asesor.servicioSocial.totalHoras > 0 ? `
                <div class="card-detail">
                    <i class="bi bi-clock"></i>
                    <span>${asesor.servicioSocial.totalHoras} horas</span>
                </div>
                ` : ''}
                </div>
                <div class="status-badge status-${estado}">
                    ${this.getEstadoLabel(estado)}
                </div>
            `;
        }
        
        card.innerHTML = cardContent;
        
        card.addEventListener('click', () => {
            if (isPending) {
                if (window.assignmentModal) {
                    window.assignmentModal.openAssignmentModal(asesor);
                }
            } else {
                if (window.detailModal) {
                    window.detailModal.openModal(asesor);
                }
            }
        });
        
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isPending) {
                    if (window.assignmentModal) {
                        window.assignmentModal.openAssignmentModal(asesor);
                    }
                } else {
                    if (window.detailModal) {
                        window.detailModal.openModal(asesor);
                    }
                }
            }
        });
        
        return card;
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

    toggleEmptyStates() {
        Object.keys(this.core.categoryCounts).forEach(estado => {
            const accordion = document.querySelector(`[data-category="${estado}"]`)?.closest('.category-accordion');
            if (accordion) {
                if (this.core.categoryCounts[estado] === 0) {
                    accordion.style.opacity = '0.5';
                    accordion.style.pointerEvents = 'none';
                } else {
                    accordion.style.opacity = '1';
                    accordion.style.pointerEvents = 'auto';
                }
            }
        });
    }

    updateStats() {
        const totalAsesores = this.core.asesores.length;
        const pendientes = this.core.categoryCounts['pendientes'];
        const enProceso = this.core.categoryCounts['en-proceso'] + this.core.categoryCounts['ya-registro'];
        const completados = this.core.categoryCounts['terminado'];
        
        this.animateNumber(document.getElementById('totalAsesores'), totalAsesores);
        this.animateNumber(document.getElementById('enProceso'), enProceso);
        this.animateNumber(document.getElementById('completados'), completados);
        
        if (pendientes > 0) {
            this.addPendingStats(pendientes);
        } else {
            this.removePendingStats();
        }
        
        const hasResults = this.core.filteredAsesores.length > 0;
        document.getElementById('accordionContainer').style.display = hasResults ? 'block' : 'none';
        document.getElementById('emptyState').style.display = hasResults ? 'none' : 'block';
    }

    addPendingStats(count) {
        let pendingStat = document.querySelector('.stat-item.pending-stat');
        
        if (!pendingStat) {
            pendingStat = document.createElement('div');
            pendingStat.className = 'stat-item pending-stat';
            pendingStat.innerHTML = `
                <span class="stat-number" id="pendientesCount">0</span>
                <span class="stat-label">Sin Asignar</span>
            `;
            
            const heroStats = document.querySelector('.hero-stats');
            const firstStat = heroStats?.querySelector('.stat-item');
            if (heroStats && firstStat) {
                if (firstStat.nextSibling) {
                    heroStats.insertBefore(pendingStat, firstStat.nextSibling);
                } else {
                    heroStats.appendChild(pendingStat);
                }
            }
        }
        
        this.animateNumber(document.getElementById('pendientesCount'), count);
    }

    removePendingStats() {
        const pendingStat = document.querySelector('.stat-item.pending-stat');
        if (pendingStat) {
            pendingStat.remove();
        }
    }

    animateNumber(element, targetValue) {
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }
}

window.UIManager = UIManager;