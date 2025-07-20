// JavaScript para login de administrador con Firebase Authentication

// Inicializar Firebase Auth cuando esté disponible
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que Firebase esté disponible
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebase.auth) {
            clearInterval(checkFirebase);
            initializeAuth();
        }
    }, 100);
    
    // Timeout después de 10 segundos
    setTimeout(() => {
        clearInterval(checkFirebase);
        if (!window.currentAuth) {
            showNotification('Error de conexión con Firebase', 'error');
        }
    }, 10000);
});

function initializeAuth() {
    try {
        // Usar el auth ya disponible globalmente de firebase-config.js
        const auth = window.firebaseAuth || firebase.auth();
        window.currentAuth = auth; // Guardarlo globalmente para uso en este archivo
        
        console.log('🔐 Firebase Auth inicializado correctamente');
        
        // Verificar si ya hay un usuario autenticado
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 Usuario ya autenticado:', user.email);
                redirectToDashboard();
            }
        });
        
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Error inicializando Firebase Auth:', error);
        showNotification('Error de configuración de autenticación', 'error');
    }
}

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const backToHome = document.getElementById('backToHome');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Envío del formulario
    loginForm.addEventListener('submit', handleLogin);
    
    // Toggle de contraseña
    passwordToggle.addEventListener('click', togglePasswordVisibility);
    
    // Botón de regresar
    backToHome.addEventListener('click', goBackToHome);

    // Validación en tiempo real
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);
    
    // Enter en los campos
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    console.log('🎧 Event listeners configurados');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    
    // Validaciones básicas
    if (!validateForm(email, password)) {
        return;
    }
    
    // Mostrar estado de carga
    setButtonState(loginBtn, 'loading');
    
    try {
        // Configurar persistencia si "recordar sesión" está marcado
        if (rememberMe) {
            await window.currentAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
            await window.currentAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
        
        // Intentar autenticación
        const userCredential = await window.currentAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Login exitoso:', user.email);
        
        // Mostrar estado de éxito
        setButtonState(loginBtn, 'success');
        showNotification('¡Bienvenido administrador!', 'success');
        
        // Registrar login en Firestore (opcional)
        await logLoginAttempt(user.uid, true);
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            redirectToDashboard();
        }, 1500);
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        // Restaurar botón
        setButtonState(loginBtn, 'normal');
        
        // Mostrar error específico
        handleAuthError(error);
        
        // Registrar intento fallido
        await logLoginAttempt(email, false, error.code);
        
        // Limpiar contraseña
        document.getElementById('password').value = '';
    }
}

// En admin-login.js, después del login exitoso:
function redirectToDashboard() {
    // Como login.html está en view/, ir al dashboard en la misma carpeta
    window.location.href = 'admin-dashboard.html';
}

function validateForm(email, password) {
    let isValid = true;
    
    // Validar email
    if (!email) {
        showFieldError('email', 'El email es requerido');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Email inválido');
        isValid = false;
    } else {
        clearFieldError('email');
    }
    
    // Validar contraseña
    if (!password) {
        showFieldError('password', 'La contraseña es requerida');
        isValid = false;
    } else if (password.length < 6) {
        showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    } else {
        clearFieldError('password');
    }
    
    return isValid;
}

function validateEmail() {
    const email = document.getElementById('email').value.trim();
    
    if (email && !isValidEmail(email)) {
        showFieldError('email', 'Email inválido');
    } else {
        clearFieldError('email');
    }
}

function validatePassword() {
    const password = document.getElementById('password').value;
    
    if (password && password.length < 6) {
        showFieldError('password', 'Mínimo 6 caracteres');
    } else {
        clearFieldError('password');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const container = field.closest('.input-container');
    
    // Limpiar error previo
    clearFieldError(fieldId);
    
    // Agregar clase de error
    container.classList.add('error');
    
    // Crear elemento de error
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.cssText = `
        color: #dc3545;
        font-size: 0.8rem;
        margin-top: 0.5rem;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
    `;
    
    container.appendChild(errorElement);
    
    // Animar entrada
    setTimeout(() => {
        errorElement.style.opacity = '1';
        errorElement.style.transform = 'translateY(0)';
    }, 10);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const container = field.closest('.input-container');
    const errorElement = container.querySelector('.field-error');
    
    container.classList.remove('error');
    
    if (errorElement) {
        errorElement.remove();
    }
}

function setButtonState(button, state) {
    button.classList.remove('loading', 'success');
    
    switch (state) {
        case 'loading':
            button.classList.add('loading');
            button.disabled = true;
            break;
        case 'success':
            button.classList.add('success');
            button.disabled = true;
            break;
        case 'normal':
        default:
            button.disabled = false;
            break;
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('#passwordToggle i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'bi bi-eye-slash-fill';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'bi bi-eye-fill';
    }
}

function handleAuthError(error) {
    let message = 'Error de autenticación';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'Usuario no encontrado';
            break;
        case 'auth/wrong-password':
            message = 'Contraseña incorrecta';
            break;
        case 'auth/invalid-email':
            message = 'Email inválido';
            break;
        case 'auth/user-disabled':
            message = 'Usuario deshabilitado';
            break;
        case 'auth/too-many-requests':
            message = 'Demasiados intentos. Intenta más tarde';
            break;
        case 'auth/network-request-failed':
            message = 'Error de conexión';
            break;
        default:
            message = `Error: ${error.message}`;
    }
    
    showNotification(message, 'error');
}

function goBackToHome() {
    // Efecto visual
    const button = document.getElementById('backToHome');
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // Como login.html está en view/, ir un nivel arriba al index
        window.location.href = '../index.html';
    }, 150);
}

async function logLoginAttempt(userIdOrEmail, success, errorCode = null) {
    try {
        if (!window.firebaseDB) return;
        
        const loginLog = {
            userIdOrEmail: userIdOrEmail,
            success: success,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: await getUserIP(),
            userAgent: navigator.userAgent,
            errorCode: errorCode
        };
        
        await window.firebaseDB.collection('admin_logins').add(loginLog);
        console.log('📊 Login attempt logged');
        
    } catch (error) {
        console.warn('⚠️ Error logging login attempt:', error);
    }
}

async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="font-size: 1.5rem;">
                <i class="bi ${getNotificationIcon(type)}"></i>
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none; border: none; color: white; font-size: 1.2rem; 
                cursor: pointer; opacity: 0.7; padding: 0; line-height: 1;
            ">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'bi-check-circle-fill';
        case 'error': return 'bi-exclamation-triangle-fill';
        case 'info': return 'bi-info-circle-fill';
        default: return 'bi-info-circle-fill';
    }
}

// Exportar funciones para uso global
window.AdminAuth = {
    login: handleLogin,
    logout: () => window.currentAuth?.signOut(),
    getCurrentUser: () => window.currentAuth?.currentUser,
    isAuthenticated: () => !!window.currentAuth?.currentUser
};