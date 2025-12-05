// =====================================================================
// TECHNICIAN DASHBOARD - Main Functionality
// =====================================================================

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Technician Dashboard loaded');

    // Check if user is technician
    if (!isTechnicianLogged()) {
        console.warn('❌ Not logged in as technician, redirecting to login');
        window.location.href = './login.html';
        return;
    }

    initializeDashboard();
    setupEventListeners();
    loadTechnicianInfo();
    loadSimulatedData();
});

// =====================================================================
// AUTHENTICATION CHECK
// =====================================================================

function isTechnicianLogged() {
    const session = sessionStorage.getItem('technicianSession');
    return session !== null;
}

function getTechnicianSession() {
    const session = sessionStorage.getItem('technicianSession');
    return session ? JSON.parse(session) : null;
}

// =====================================================================
// INITIALIZATION
// =====================================================================

function initializeDashboard() {
    console.log('📊 Initializing technician dashboard');

    // Set default active section to 'inicio'
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('section-inicio').classList.add('active');

    // Set active nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector('.nav-link[data-section="inicio"]').classList.add('active');
}

function setupEventListeners() {
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    if (sidebarToggleMobile) {
        sidebarToggleMobile.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            alert('Perfil de técnico - Funcionalidad próximamente');
        });
    }
}

// =====================================================================
// NAVIGATION HANDLERS
// =====================================================================

function handleNavigation(e) {
    e.preventDefault();

    const target = e.currentTarget;
    const sectionName = target.getAttribute('data-section');

    console.log('🔗 Navigation clicked:', sectionName);

    if (!sectionName) return;

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    target.classList.add('active');

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const titleMap = {
        'inicio': 'Inicio',
        'reportes': 'Reportes',
        'inventario': 'Inventario',
        'mapas': 'Mapas'
    };
    pageTitle.textContent = titleMap[sectionName] || 'Inicio';

    // Show corresponding section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${sectionName}`).classList.add('active');

    // Close mobile sidebar
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth < 992) {
        sidebar.classList.remove('show');
    }

    console.log(`📄 Navigated to section: ${sectionName}`);
}

// =====================================================================
// TECHNICIAN INFO LOADING
// =====================================================================

function loadTechnicianInfo() {
    const session = getTechnicianSession();

    if (session) {
        const technicianName = document.getElementById('technicianName');
        if (technicianName) {
            technicianName.textContent = session.nombre || session.usuario || 'Técnico';
        }
        console.log(`👨‍🔧 Technician loaded: ${session.nombre || session.usuario}`);
    }
}

// =====================================================================
// REAL DATA LOADING FROM FIRESTORE
// =====================================================================

async function loadSimulatedData() {
    console.log('📊 Loading reports data from Firestore');

    try {
        if (!window.firebaseDB) {
            console.warn('⚠️ Database not available, using simulated data');
            loadFallbackData();
            return;
        }

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        // Load reports from Firestore
        const snapshot = await window.firebaseDB.collection('reportes')
            .where('fecha', '==', todayString)
            .get();

        const reports = [];
        snapshot.forEach(doc => {
            reports.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Count reports by status
        const totalReports = reports.length;
        const pendingReports = reports.filter(r => r.urgencia === 'Urgente').length;
        const completedReports = reports.filter(r => r.categoria === 'Software').length; // Placeholder
        const inProgressReports = reports.filter(r => r.categoria === 'Hardware').length; // Placeholder

        // Update stat cards with real data
        document.getElementById('todayReports').textContent = totalReports;
        document.getElementById('pendingReports').textContent = pendingReports;
        document.getElementById('completedReports').textContent = completedReports;
        document.getElementById('inProgressReports').textContent = inProgressReports;

        // Update activity log with real reports
        updateActivityLogFromReports(reports);

        console.log(`✅ Real stats loaded: Today=${totalReports}, Urgent=${pendingReports}, Software=${completedReports}, Hardware=${inProgressReports}`);

    } catch (error) {
        console.error('❌ Error loading reports:', error);
        loadFallbackData();
    }
}

function loadFallbackData() {
    console.log('📊 Using fallback simulated data');

    // Generate simulated data if database is not available
    const todayReports = Math.floor(Math.random() * 15) + 5;
    const pendingReports = Math.floor(Math.random() * 8) + 1;
    const completedReports = Math.floor(Math.random() * 10) + 2;
    const inProgressReports = Math.floor(Math.random() * 5) + 1;

    // Update stat cards
    document.getElementById('todayReports').textContent = todayReports;
    document.getElementById('pendingReports').textContent = pendingReports;
    document.getElementById('completedReports').textContent = completedReports;
    document.getElementById('inProgressReports').textContent = inProgressReports;

    // Update activity log with simulated data
    updateActivityLog();
}

function updateActivityLogFromReports(reports) {
    const activityList = document.getElementById('activityList');

    if (reports.length === 0) {
        // Show empty state
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon pending">
                    <i class="bi bi-inbox"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">Sin reportes hoy</p>
                    <small class="activity-time">No hay reportes registrados para hoy</small>
                </div>
            </div>
        `;
        return;
    }

    // Show last 4 reports
    const recentReports = reports.slice(0, 4).map(report => ({
        icon: getReportIcon(report.categoria),
        status: getReportStatus(report.urgencia),
        title: `${report.categoria}: ${report.subcategoria}`,
        description: report.descripcion.substring(0, 50),
        time: formatTimeAgo(report.fechaCreacion)
    }));

    activityList.innerHTML = recentReports.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.status}">
                <i class="bi ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-title">${activity.title}</p>
                <small class="activity-time">${activity.time}</small>
            </div>
        </div>
    `).join('');
}

function updateActivityLog() {
    const activityList = document.getElementById('activityList');

    // Sample activities
    const activities = [
        {
            icon: 'bi-file-text',
            type: 'pending',
            title: 'Nuevo reporte creado',
            time: 'Hace 2 horas',
            status: 'pending'
        },
        {
            icon: 'bi-check-circle',
            type: 'completed',
            title: 'Reporte completado',
            time: 'Hace 4 horas',
            status: 'completed'
        },
        {
            icon: 'bi-arrow-repeat',
            type: 'in-progress',
            title: 'Reporte en progreso',
            time: 'Hace 6 horas',
            status: 'in-progress'
        },
        {
            icon: 'bi-file-text',
            type: 'pending',
            title: 'Reporte pendiente de revisión',
            time: 'Hace 8 horas',
            status: 'pending'
        }
    ];

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.status}">
                <i class="bi ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-title">${activity.title}</p>
                <small class="activity-time">${activity.time}</small>
            </div>
        </div>
    `).join('');
}

// =====================================================================
// LOGOUT HANDLER
// =====================================================================

function handleLogout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        // Clear technician session
        sessionStorage.removeItem('technicianSession');

        // Log logout action
        const session = getTechnicianSession();
        if (session) {
            logTechnicianLogout(session.usuario);
        }

        // Redirect to login
        window.location.href = './login.html';
        console.log('👋 Technician logged out');
    }
}

async function logTechnicianLogout(usuario) {
    try {
        if (window.firebaseDB) {
            await window.firebaseDB.collection('technician_logins').add({
                usuario: usuario,
                action: 'logout',
                timestamp: new Date(),
                success: true
            });
        }
    } catch (error) {
        console.error('Error logging logout:', error);
    }
}

// =====================================================================
// WINDOW RESIZE HANDLER
// =====================================================================

window.addEventListener('resize', function() {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth >= 992) {
        sidebar.classList.remove('show');
    }
});

// =====================================================================
// KEYBOARD SHORTCUTS
// =====================================================================

document.addEventListener('keydown', function(e) {
    // Alt + E to go to Inicio
    if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        document.querySelector('.nav-link[data-section="inicio"]').click();
        console.log('⌨️ Shortcut: Alt+I - Going to Inicio');
    }

    // Alt + L for logout
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        document.getElementById('logoutBtn').click();
        console.log('⌨️ Shortcut: Alt+L - Logging out');
    }
});

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function getReportIcon(categoria) {
    return categoria === 'Software' ? 'bi-cpu' : 'bi-laptop';
}

function getReportStatus(urgencia) {
    if (urgencia === 'Urgente') return 'pending';
    if (urgencia === 'Moderado') return 'in-progress';
    return 'completed';
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'N/A';

    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        date = new Date();
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 30) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES');
}

console.log('✅ Technician Dashboard ready');
