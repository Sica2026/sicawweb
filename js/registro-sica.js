// JavaScript global para todas las páginas de registro SICA
// ✅ SISTEMA COMPLETO DE ENTRADA Y SALIDA CON FORMULARIO INTELIGENTE

// ✅ DETECTAR SICA Y TIPO AUTOMÁTICAMENTE DESDE LA URL
function detectSICA() {
    const urlParams = new URLSearchParams(window.location.search);
    const sicaNumber = urlParams.get('sica') || '1';
    return sicaNumber;
}

function detectTipo() {
    const urlParams = new URLSearchParams(window.location.search);
    const tipo = urlParams.get('tipo') || 'computadora';
    return tipo;
}

// ✅ CONFIGURACIÓN DE CADA SICA
const SICA_CONFIG = {
    // Detectar automáticamente si estamos en un subdirectorio
    isInSubdirectory: window.location.pathname.includes('/view/') || window.location.pathname.includes('view/'),
    
    // Rutas base según la ubicación
    get basePath() {
        return this.isInSubdirectory ? '../' : '';
    },
    
    // Rutas específicas
    get indexPath() {
        return this.basePath + 'index.html';
    },
    
    get cssPath() {
        return this.basePath + 'css/';
    },
    
    get jsPath() {
        return this.basePath + 'js/';
    },
    
    // ✅ CONFIGURACIÓN ESPECÍFICA DE CADA SICA
    sicaNames: {
        '1': {
            title: 'Registro de préstamos de COMPUTADORAS SICA 1',
            shortName: 'SICA1',
            displayName: 'SICA 1',
            icon: 'bi-laptop',
            maxElementos: 65 // ✅ Hasta elemento 65 (Terbio)
        },
        '2': {
            title: 'Registro de préstamos de COMPUTADORAS SICA 2',
            shortName: 'SICA2',
            displayName: 'SICA 2',
            icon: 'bi-laptop',
            maxElementos: 101 // ✅ Hasta elemento 101 (Mendelevio)
        },
        '3': {
            title: 'Registro de préstamos de COMPUTADORAS SALON INTELIGENTE 1',
            shortName: 'SALON_INTELIGENTE1',
            displayName: 'SALON INTELIGENTE 1',
            icon: 'bi-laptop',
            maxElementos: 35 // ✅ Hasta elemento 35 (Bromo)
        },
        '4': {
            title: 'Registro de préstamos de COMPUTADORAS SICA 4',
            shortName: 'SICA4',
            displayName: 'SICA 4',
            icon: 'bi-laptop',
            maxElementos: 45 // ✅ Hasta elemento 45 (Rodio)
        }
    }
};

// Elementos químicos completos hasta el 101 (para SICA 2)
const elementosQuimicos = [
    { numero: 1, nombre: "Hidrógeno", simbolo: "H" },
    { numero: 2, nombre: "Helio", simbolo: "He" },
    { numero: 3, nombre: "Litio", simbolo: "Li" },
    { numero: 4, nombre: "Berilio", simbolo: "Be" },
    { numero: 5, nombre: "Boro", simbolo: "B" },
    { numero: 6, nombre: "Carbono", simbolo: "C" },
    { numero: 7, nombre: "Nitrógeno", simbolo: "N" },
    { numero: 8, nombre: "Oxígeno", simbolo: "O" },
    { numero: 9, nombre: "Flúor", simbolo: "F" },
    { numero: 10, nombre: "Neón", simbolo: "Ne" },
    { numero: 11, nombre: "Sodio", simbolo: "Na" },
    { numero: 12, nombre: "Magnesio", simbolo: "Mg" },
    { numero: 13, nombre: "Aluminio", simbolo: "Al" },
    { numero: 14, nombre: "Silicio", simbolo: "Si" },
    { numero: 15, nombre: "Fósforo", simbolo: "P" },
    { numero: 16, nombre: "Azufre", simbolo: "S" },
    { numero: 17, nombre: "Cloro", simbolo: "Cl" },
    { numero: 18, nombre: "Argón", simbolo: "Ar" },
    { numero: 19, nombre: "Potasio", simbolo: "K" },
    { numero: 20, nombre: "Calcio", simbolo: "Ca" },
    { numero: 21, nombre: "Escandio", simbolo: "Sc" },
    { numero: 22, nombre: "Titanio", simbolo: "Ti" },
    { numero: 23, nombre: "Vanadio", simbolo: "V" },
    { numero: 24, nombre: "Cromo", simbolo: "Cr" },
    { numero: 25, nombre: "Manganeso", simbolo: "Mn" },
    { numero: 26, nombre: "Hierro", simbolo: "Fe" },
    { numero: 27, nombre: "Cobalto", simbolo: "Co" },
    { numero: 28, nombre: "Níquel", simbolo: "Ni" },
    { numero: 29, nombre: "Cobre", simbolo: "Cu" },
    { numero: 30, nombre: "Zinc", simbolo: "Zn" },
    { numero: 31, nombre: "Galio", simbolo: "Ga" },
    { numero: 32, nombre: "Germanio", simbolo: "Ge" },
    { numero: 33, nombre: "Arsénico", simbolo: "As" },
    { numero: 34, nombre: "Selenio", simbolo: "Se" },
    { numero: 35, nombre: "Bromo", simbolo: "Br" }, // ✅ Hasta aquí SALON INTELIGENTE 1
    { numero: 36, nombre: "Kriptón", simbolo: "Kr" },
    { numero: 37, nombre: "Rubidio", simbolo: "Rb" },
    { numero: 38, nombre: "Estroncio", simbolo: "Sr" },
    { numero: 39, nombre: "Itrio", simbolo: "Y" },
    { numero: 40, nombre: "Zirconio", simbolo: "Zr" },
    { numero: 41, nombre: "Niobio", simbolo: "Nb" },
    { numero: 42, nombre: "Molibdeno", simbolo: "Mo" },
    { numero: 43, nombre: "Tecnecio", simbolo: "Tc" },
    { numero: 44, nombre: "Rutenio", simbolo: "Ru" },
    { numero: 45, nombre: "Rodio", simbolo: "Rh" }, // ✅ Hasta aquí SICA 4
    { numero: 46, nombre: "Paladio", simbolo: "Pd" },
    { numero: 47, nombre: "Plata", simbolo: "Ag" },
    { numero: 48, nombre: "Cadmio", simbolo: "Cd" },
    { numero: 49, nombre: "Indio", simbolo: "In" },
    { numero: 50, nombre: "Estaño", simbolo: "Sn" },
    { numero: 51, nombre: "Antimonio", simbolo: "Sb" },
    { numero: 52, nombre: "Telurio", simbolo: "Te" },
    { numero: 53, nombre: "Yodo", simbolo: "I" },
    { numero: 54, nombre: "Xenón", simbolo: "Xe" },
    { numero: 55, nombre: "Cesio", simbolo: "Cs" },
    { numero: 56, nombre: "Bario", simbolo: "Ba" },
    { numero: 57, nombre: "Lantano", simbolo: "La" },
    { numero: 58, nombre: "Cerio", simbolo: "Ce" },
    { numero: 59, nombre: "Praseodimio", simbolo: "Pr" },
    { numero: 60, nombre: "Neodimio", simbolo: "Nd" },
    { numero: 61, nombre: "Prometio", simbolo: "Pm" },
    { numero: 62, nombre: "Samario", simbolo: "Sm" },
    { numero: 63, nombre: "Europio", simbolo: "Eu" },
    { numero: 64, nombre: "Gadolinio", simbolo: "Gd" },
    { numero: 65, nombre: "Terbio", simbolo: "Tb" }, // ✅ Hasta aquí SICA 1
    { numero: 66, nombre: "Disprosio", simbolo: "Dy" },
    { numero: 67, nombre: "Holmio", simbolo: "Ho" },
    { numero: 68, nombre: "Erbio", simbolo: "Er" },
    { numero: 69, nombre: "Tulio", simbolo: "Tm" },
    { numero: 70, nombre: "Iterbio", simbolo: "Yb" },
    { numero: 71, nombre: "Lutecio", simbolo: "Lu" },
    { numero: 72, nombre: "Hafnio", simbolo: "Hf" },
    { numero: 73, nombre: "Tantalio", simbolo: "Ta" },
    { numero: 74, nombre: "Wolframio", simbolo: "W" },
    { numero: 75, nombre: "Renio", simbolo: "Re" },
    { numero: 76, nombre: "Osmio", simbolo: "Os" },
    { numero: 77, nombre: "Iridio", simbolo: "Ir" },
    { numero: 78, nombre: "Platino", simbolo: "Pt" },
    { numero: 79, nombre: "Oro", simbolo: "Au" },
    { numero: 80, nombre: "Mercurio", simbolo: "Hg" },
    { numero: 81, nombre: "Talio", simbolo: "Tl" },
    { numero: 82, nombre: "Plomo", simbolo: "Pb" },
    { numero: 83, nombre: "Bismuto", simbolo: "Bi" },
    { numero: 84, nombre: "Polonio", simbolo: "Po" },
    { numero: 85, nombre: "Astato", simbolo: "At" },
    { numero: 86, nombre: "Radón", simbolo: "Rn" },
    { numero: 87, nombre: "Francio", simbolo: "Fr" },
    { numero: 88, nombre: "Radio", simbolo: "Ra" },
    { numero: 89, nombre: "Actinio", simbolo: "Ac" },
    { numero: 90, nombre: "Torio", simbolo: "Th" },
    { numero: 91, nombre: "Protactinio", simbolo: "Pa" },
    { numero: 92, nombre: "Uranio", simbolo: "U" },
    { numero: 93, nombre: "Neptunio", simbolo: "Np" },
    { numero: 94, nombre: "Plutonio", simbolo: "Pu" },
    { numero: 95, nombre: "Americio", simbolo: "Am" },
    { numero: 96, nombre: "Curio", simbolo: "Cm" },
    { numero: 97, nombre: "Berkelio", simbolo: "Bk" },
    { numero: 98, nombre: "Californio", simbolo: "Cf" },
    { numero: 99, nombre: "Einstenio", simbolo: "Es" },
    { numero: 100, nombre: "Fermio", simbolo: "Fm" },
    { numero: 101, nombre: "Mendelevio", simbolo: "Md" } // ✅ Hasta aquí SICA 2
];

// Variables globales
let currentSICA = '1';
let currentTipo = 'computadora';
let currentSICAConfig = null;

// ✅ NUEVAS VARIABLES PARA EL SISTEMA INTELIGENTE
let formularioModo = 'auto'; // auto, entrada, salida
let registroEncontrado = null;

// ✅ CONFIGURACIÓN DE MESAS (5 aminoácidos esenciales)
const mesas = [
    { numero: 1, nombre: "Histidina", codigo: "His" },
    { numero: 2, nombre: "Isoleucina", codigo: "Ile" },
    { numero: 3, nombre: "Leucina", codigo: "Leu" },
    { numero: 4, nombre: "Lisina", codigo: "Lys" },
    { numero: 5, nombre: "Metionina", codigo: "Met" }
];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadElementsIntoSelect();
    // ✅ CARGAR SCRIPTS ADICIONALES
    loadAdditionalScripts();
});

function initializePage() {
    // ✅ DETECTAR SICA Y TIPO ACTUAL
    currentSICA = detectSICA();
    currentTipo = detectTipo();
    currentSICAConfig = SICA_CONFIG.sicaNames[currentSICA];
    
    if (!currentSICAConfig) {
        console.error(`SICA ${currentSICA} no configurado`);
        currentSICA = '1';
        currentSICAConfig = SICA_CONFIG.sicaNames['1'];
    }
    
    // ✅ ACTUALIZAR TÍTULOS DINÁMICAMENTE
    updatePageTitles();
    
    // Configurar usando las funciones de la plantilla
    if (window.SICAComponents) {
        const tipoTexto = currentTipo === 'computadora' ? 'COMPUTADORAS' : 'MESAS';
        const titulo = `Registro de préstamos de ${tipoTexto} ${currentSICAConfig.displayName}`;
        SICAComponents.setPageTitle(titulo);
    }
    
    console.log(`🎯 Página inicializada para ${currentSICAConfig.displayName} - Tipo: ${currentTipo}`);
}

function updatePageTitles() {
    // Actualizar título de la página
    const tipoTexto = currentTipo === 'computadora' ? 'COMPUTADORAS' : 'MESAS';
    const titulo = `Registro de préstamos de ${tipoTexto} ${currentSICAConfig.displayName}`;
    document.title = titulo;
    
    // Actualizar título principal en el header
    const mainTitle = document.getElementById('main-title');
    const titleText = document.getElementById('title-text');
    const sicaNameSpan = document.getElementById('sica-name');
    
    if (titleText && sicaNameSpan) {
        titleText.textContent = `Registro de préstamos de ${tipoTexto}`;
        sicaNameSpan.textContent = currentSICAConfig.displayName;
        
        // Cambiar ícono según el tipo
        const icon = mainTitle.querySelector('i');
        if (icon) {
            icon.className = currentTipo === 'computadora' ? 'bi-laptop me-2' : 'bi-table me-2';
        }
    }
    
    // Actualizar etiquetas de formulario
    const equipoLabel = document.querySelector('label[for="equipoSelect"]');
    if (equipoLabel) {
        const iconClass = currentTipo === 'computadora' ? 'bi-pc-display' : 'bi-table';
        const labelText = currentTipo === 'computadora' ? 'Selecciona el número del equipo' : 'Selecciona el número de la mesa';
        equipoLabel.innerHTML = `<i class="${iconClass} me-2"></i>${labelText}`;
    }
}

function setupEventListeners() {
    const form = document.getElementById('registroForm');
    const numeroCuenta = document.getElementById('numeroCuenta');
    const equipoSelect = document.getElementById('equipoSelect');

    // Manejar envío del formulario
    form.addEventListener('submit', handleFormSubmit);

    // ✅ NUEVO: Validación inteligente en tiempo real
    numeroCuenta.addEventListener('input', handleNumeroCuentaInput);
    equipoSelect.addEventListener('change', validateEquipoSelect);

    // Limpiar errores al enfocar
    numeroCuenta.addEventListener('focus', () => clearFieldError(numeroCuenta));
    equipoSelect.addEventListener('focus', () => clearFieldError(equipoSelect));
}

// ✅ NUEVA FUNCIÓN: Manejo inteligente del input de número de cuenta
async function handleNumeroCuentaInput() {
    const numeroCuentaInput = document.getElementById('numeroCuenta');
    const value = numeroCuentaInput.value.trim();
    
    // Validación básica
    if (!validateNumeroCuenta()) {
        resetFormularioModo();
        return;
    }
    
    // Si tiene 9 dígitos completos, buscar registro activo
    if (value.length >= 9) {
        const numeroCuenta = value.substring(0, 9);
        await verificarRegistroActivo(numeroCuenta);
    } else {
        resetFormularioModo();
    }
}

// ✅ NUEVA FUNCIÓN: Verificar si existe registro activo
async function verificarRegistroActivo(numeroCuenta) {
    try {
        // Buscar registro activo para esta cuenta en este SICA
        const query = await window.firebaseDB.collection("registros")
            .where("numeroCuenta", "==", numeroCuenta)
            .where("sica", "==", currentSICAConfig.shortName)
            .where("estado", "==", "activo")
            .limit(1)
            .get();
        
        if (!query.empty) {
            const doc = query.docs[0];
            const data = doc.data();
            registroEncontrado = { id: doc.id, data: data };
            activarModoSalida(data);
        } else {
            registroEncontrado = null;
            activarModoEntrada();
        }
    } catch (error) {
        console.error("Error verificando registro activo:", error);
        resetFormularioModo();
    }
}

// ✅ NUEVA FUNCIÓN: Activar modo salida
function activarModoSalida(datosRegistro) {
    formularioModo = 'salida';
    
    const equipoSelect = document.getElementById('equipoSelect');
    const submitButton = document.querySelector('button[type="submit"]');
    const equipoContainer = equipoSelect.parentElement;
    
    // ✅ IMPORTANTE: Remover el atributo required del select cuando está oculto
    equipoSelect.removeAttribute('required');
    
    // Crear mensaje informativo
    const infoMessage = document.createElement('div');
    infoMessage.id = 'registro-activo-info';
    infoMessage.className = 'alert alert-info mt-2';
    infoMessage.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        <strong>Registro activo encontrado:</strong><br>
        Equipo prestado: <strong>${datosRegistro.nombreElemento}</strong><br>
        <small>Entrada: ${datosRegistro.fechaEntrada ? new Date(datosRegistro.fechaEntrada.seconds * 1000).toLocaleString() : 'N/A'}</small>
    `;
    
    // Limpiar mensaje anterior si existe
    const existingInfo = document.getElementById('registro-activo-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Insertar mensaje después del container del equipo
    equipoContainer.parentNode.insertBefore(infoMessage, equipoContainer.nextSibling);
    
    // Ocultar selector de equipo
    equipoContainer.style.display = 'none';
    
    // Cambiar botón
    submitButton.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Registrar Salida';
    submitButton.className = 'btn btn-warning btn-lg';
}

// ✅ NUEVA FUNCIÓN: Activar modo entrada
function activarModoEntrada() {
    formularioModo = 'entrada';
    resetFormularioModo();
    
    const submitButton = document.querySelector('button[type="submit"]');
    const equipoSelect = document.getElementById('equipoSelect');
    
    // ✅ IMPORTANTE: Restaurar el atributo required cuando se muestra el select
    equipoSelect.setAttribute('required', 'true');
    
    submitButton.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Registrar Entrada';
    submitButton.className = 'btn btn-success btn-lg';
}

// ✅ NUEVA FUNCIÓN: Resetear modo del formulario
function resetFormularioModo() {
    formularioModo = 'auto';
    registroEncontrado = null;
    
    const equipoSelect = document.getElementById('equipoSelect');
    const submitButton = document.querySelector('button[type="submit"]');
    const equipoContainer = equipoSelect.parentElement;
    const existingInfo = document.getElementById('registro-activo-info');
    
    // Remover mensaje informativo
    if (existingInfo) {
        existingInfo.remove();
    }
    
    // Mostrar selector de equipo
    equipoContainer.style.display = 'block';
    
    // ✅ IMPORTANTE: Restaurar el atributo required cuando se muestra el select
    equipoSelect.setAttribute('required', 'true');
    
    // Resetear botón
    submitButton.innerHTML = '<i class="bi bi-send me-2"></i>Enviar';
    submitButton.className = 'btn btn-sica btn-lg';
}

function loadElementsIntoSelect() {
    const equipoSelect = document.getElementById('equipoSelect');
    
    // ✅ LIMPIAR OPCIONES ANTERIORES (importante para cuando se cambia de SICA)
    equipoSelect.innerHTML = '';
    
    // ✅ IMPORTANTE: Establecer required por defecto al cargar elementos  
    equipoSelect.setAttribute('required', 'true');
    
    if (currentTipo === 'computadora') {
        // ✅ CARGAR ELEMENTOS QUÍMICOS PARA COMPUTADORAS
        equipoSelect.innerHTML = '<option value="">Selecciona un equipo...</option>';
        
        const maxElementos = currentSICAConfig.maxElementos;
        const elementosDisponibles = elementosQuimicos.filter(elemento => elemento.numero <= maxElementos);
        
        console.log(`🧪 Cargando ${elementosDisponibles.length} elementos químicos para computadoras`);
        
        elementosDisponibles.forEach(elemento => {
            const option = document.createElement('option');
            option.value = elemento.numero;
            option.textContent = `${elemento.numero} - ${elemento.nombre} (${elemento.simbolo})`;
            equipoSelect.appendChild(option);
        });
        
    } else if (currentTipo === 'mesa') {
        // ✅ CARGAR AMINOÁCIDOS PARA MESAS
        equipoSelect.innerHTML = '<option value="">Selecciona una mesa...</option>';
        
        console.log(`🧬 Cargando ${mesas.length} aminoácidos para mesas`);
        
        mesas.forEach(mesa => {
            const option = document.createElement('option');
            option.value = mesa.numero;
            option.textContent = `Mesa ${mesa.numero} - ${mesa.nombre} (${mesa.codigo})`;
            equipoSelect.appendChild(option);
        });
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const hideLoading = showLoading(submitButton);
    
    if (validateForm()) {
        // ✅ GUARDAR EN FIRESTORE CON SISTEMA ENTRADA/SALIDA INTELIGENTE
        saveToFirestore()
            .then((result) => {
                hideLoading();
                resetForm();
            })
            .catch((error) => {
                hideLoading();
                showError('Error al guardar el registro: ' + error.message);
                console.error('Error guardando en Firestore:', error);
            });
    } else {
        hideLoading();
    }
}

function validateForm() {
    const numeroCuenta = document.getElementById('numeroCuenta');
    const equipoSelect = document.getElementById('equipoSelect');
    let isValid = true;

    // Validar número de cuenta
    if (!validateNumeroCuenta()) {
        isValid = false;
    }

    // ✅ CORRECCIÓN: Solo validar equipo si el container está visible Y el formulario no está en modo salida
    const equipoContainer = equipoSelect.parentElement;
    const isEquipoVisible = equipoContainer.style.display !== 'none';
    
    if (isEquipoVisible && formularioModo !== 'salida') {
        if (!validateEquipoSelect()) {
            isValid = false;
        }
    }

    return isValid;
}

function validateNumeroCuenta() {
    const numeroCuenta = document.getElementById('numeroCuenta');
    const value = numeroCuenta.value.trim();
    
    if (!value) {
        showFieldError(numeroCuenta, 'El número de cuenta es requerido');
        return false;
    }
    
    if (!/^\d+$/.test(value)) {
        showFieldError(numeroCuenta, 'El número de cuenta solo debe contener números');
        return false;
    }
    
    // ✅ VALIDACIÓN ACTUALIZADA: Aceptar 9 o 13 dígitos
    if (value.length !== 9 && value.length !== 13) {
        showFieldError(numeroCuenta, 'El número de cuenta debe tener 9 o 13 dígitos');
        return false;
    }
    
    // Si tiene 13 dígitos, verificar que comience con los primeros 9 + "0008"
    if (value.length === 13) {
        const primeros9 = value.substring(0, 9);
        const ultimos4 = value.substring(9);
        
        if (ultimos4 !== "0008") {
            showFieldError(numeroCuenta, 'El formato de 13 dígitos debe terminar en 0008');
            return false;
        }
    }
    
    clearFieldError(numeroCuenta);
    return true;
}

function validateEquipoSelect() {
    const equipoSelect = document.getElementById('equipoSelect');
    const equipoContainer = equipoSelect.parentElement;
    
    // No validar si está oculto o en modo salida
    if (equipoContainer.style.display === 'none' || formularioModo === 'salida') {
        clearFieldError(equipoSelect);
        return true;
    }
    
    if (!equipoSelect.value) {
        showFieldError(equipoSelect, 'Debe seleccionar un equipo');
        return false;
    }
    
    clearFieldError(equipoSelect);
    return true;
}

function showFieldError(field, message) {
    // Limpiar errores previos
    clearFieldError(field);
    
    field.classList.add('is-invalid');
    
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentNode.appendChild(feedback);
}

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    
    const feedback = field.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
}

function showLoading(button) {
    const originalText = button.innerHTML;
    button.classList.add('btn-loading');
    button.disabled = true;
    
    return function() {
        button.classList.remove('btn-loading');
        button.innerHTML = originalText;
        button.disabled = false;
    };
}

// ✅ SISTEMA INTELIGENTE DE ENTRADA Y SALIDA - FUNCIÓN PRINCIPAL MODIFICADA
async function saveToFirestore() {
    try {
        if (!window.firebaseDB) {
            throw new Error('Firebase no está inicializado');
        }
        
        const numeroCuentaOriginal = document.getElementById('numeroCuenta').value;
        const numeroCuenta = numeroCuentaOriginal.substring(0, 9);
        
        // ✅ MODO SALIDA: Usar registro encontrado
        if (formularioModo === 'salida' && registroEncontrado) {
            return await procesarSalida(registroEncontrado.id, registroEncontrado.data);
        }
        
        // ✅ MODO ENTRADA: Crear nuevo registro
        const equipoNumero = document.getElementById('equipoSelect').value;
        let nombreElemento;
        let tipoEquipo;
        
        if (currentTipo === 'computadora') {
            const elemento = elementosQuimicos.find(el => el.numero == equipoNumero);
            nombreElemento = `${equipoNumero} ${elemento.nombre} ${elemento.simbolo}`;
            tipoEquipo = "computadora";
        } else {
            const mesa = mesas.find(m => m.numero == equipoNumero);
            nombreElemento = `Mesa ${equipoNumero} ${mesa.nombre} ${mesa.codigo}`;
            tipoEquipo = "mesa";
        }
        
        return await procesarEntrada(numeroCuenta, nombreElemento, tipoEquipo);
        
    } catch (error) {
        console.error("❌ Error al guardar en Firestore: ", error);
        throw error;
    }
}

// ✅ FUNCIÓN PARA PROCESAR ENTRADA (NUEVO REGISTRO)
async function procesarEntrada(numeroCuenta, nombreElemento, tipoEquipo) {
    const registroEntrada = {
        numeroCuenta: numeroCuenta,
        nombreElemento: nombreElemento,
        tipoEquipo: tipoEquipo,
        sica: currentSICAConfig.shortName,
        fechaEntrada: firebase.firestore.FieldValue.serverTimestamp(),
        fechaSalida: null,
        estado: "activo",
        tipo: "entrada"
    };
    
    const docRef = await window.firebaseDB.collection("registros").add(registroEntrada);
    
    console.log("✅ ENTRADA registrada con ID: ", docRef.id);
    console.log("📊 Datos guardados:", {
        numeroCuenta: registroEntrada.numeroCuenta,
        nombreElemento: registroEntrada.nombreElemento,
        tipoEquipo: registroEntrada.tipoEquipo,
        sica: registroEntrada.sica,
        sicaDisplayName: currentSICAConfig.displayName,
        tipo: currentTipo
    });
    
    // Mostrar mensaje de entrada
    mostrarMensajeEntrada(numeroCuenta, nombreElemento);
    
    return docRef;
}

// ✅ FUNCIÓN PARA PROCESAR SALIDA (ACTUALIZAR REGISTRO)
async function procesarSalida(docId, datosExistentes) {
    // Actualizar el registro con la fecha de salida
    await window.firebaseDB.collection("registros").doc(docId).update({
        fechaSalida: firebase.firestore.FieldValue.serverTimestamp(),
        estado: "completado"
    });
    
    console.log("✅ SALIDA registrada para documento ID: ", docId);
    
    // Obtener el documento actualizado para moverlo
    const docActualizado = await window.firebaseDB.collection("registros").doc(docId).get();
    const datosCompletos = docActualizado.data();
    
    // ✅ MOVER A REGISTROS COMPLETOS
    await moverARegistrosCompletos(datosCompletos);
    
    // ✅ ELIMINAR DE REGISTROS ACTIVOS
    await window.firebaseDB.collection("registros").doc(docId).delete();
    
    // Mostrar mensaje de salida
    mostrarMensajeSalida(datosExistentes.numeroCuenta, datosExistentes.nombreElemento);
    
    return { id: docId, moved: true };
}

// ✅ FUNCIÓN PARA MOVER A REGISTROS COMPLETOS
async function moverARegistrosCompletos(datos) {
    try {
        // Calcular duración del préstamo
        const duracionMinutos = calcularDuracion(datos.fechaEntrada.toDate(), datos.fechaSalida.toDate());
        
        const registroCompleto = {
            ...datos,
            duracionMinutos: duracionMinutos,
            fechaCompletado: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await window.firebaseDB.collection("registros_completos").add(registroCompleto);
        
        console.log("✅ Registro movido a 'registros_completos' con ID: ", docRef.id);
        console.log("⏱️ Duración del préstamo: ", duracionMinutos, "minutos");
        
        return docRef;
    } catch (error) {
        console.error("Error moviendo a registros completos:", error);
        throw error;
    }
}

// ✅ FUNCIÓN PARA CALCULAR DURACIÓN
function calcularDuracion(fechaEntrada, fechaSalida) {
    const diferenciaMilisegundos = fechaSalida.getTime() - fechaEntrada.getTime();
    return Math.round(diferenciaMilisegundos / (1000 * 60)); // Convertir a minutos
}

// ✅ MENSAJES ESPECÍFICOS PARA ENTRADA Y SALIDA
function mostrarMensajeEntrada(numeroCuenta, nombreElemento) {
    const tipoEquipoTexto = currentTipo === 'computadora' ? 'equipo' : 'mesa';
    const message = `ENTRADA registrada para la cuenta ${numeroCuenta} con ${tipoEquipoTexto} ${nombreElemento} en ${currentSICAConfig.displayName}`;
    
    if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(
            "🔵 Entrada Registrada",
            message,
            "info",
            "bi-box-arrow-in-right"
        );
    } else {
        showAlert(message, 'info');
    }
}

function mostrarMensajeSalida(numeroCuenta, nombreElemento) {
    const tipoEquipoTexto = currentTipo === 'computadora' ? 'equipo' : 'mesa';
    const message = `SALIDA registrada y préstamo completado para la cuenta ${numeroCuenta} con ${tipoEquipoTexto} ${nombreElemento} en ${currentSICAConfig.displayName}`;
    
    if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(
            "🟢 Salida Registrada - Préstamo Completado",
            message,
            "success",
            "bi-box-arrow-right"
        );
    } else {
        showAlert(message, 'success');
    }
}

// ✅ FUNCIÓN PARA MOSTRAR ERRORES
function showError(message) {
    // Usar sistema de notificaciones de la plantilla si está disponible
    if (window.SICAComponents && window.SICAComponents.notify) {
        window.SICAComponents.notify(
            "Error",
            message,
            "error",
            "bi-exclamation-triangle-fill"
        );
    } else {
        // Fallback: crear alerta personalizada
        showAlert(message, 'error');
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert-sica alert-sica-${type}`;
    
    let iconClass;
    switch(type) {
        case 'success':
            iconClass = 'bi-check-circle-fill';
            break;
        case 'info':
            iconClass = 'bi-info-circle-fill';
            break;
        case 'error':
            iconClass = 'bi-exclamation-triangle-fill';
            break;
        default:
            iconClass = 'bi-info-circle-fill';
    }
    
    alertDiv.innerHTML = `
        <i class="bi ${iconClass} me-2"></i>
        ${message}
    `;
    
    const form = document.getElementById('registroForm');
    form.insertBefore(alertDiv, form.firstChild);
    
    // Remover alerta después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function resetForm() {
    document.getElementById('registroForm').reset();
    
    // Limpiar cualquier error que pueda quedar
    const fields = document.querySelectorAll('.is-invalid');
    fields.forEach(field => clearFieldError(field));
    
    // ✅ RESETEAR MODO DEL FORMULARIO
    resetFormularioModo();
    
    // ✅ IMPORTANTE: Asegurar que el campo equipo tenga required después del reset
    const equipoSelect = document.getElementById('equipoSelect');
    if (equipoSelect) {
        equipoSelect.setAttribute('required', 'true');
    }
}

// Función para buscar elementos por nombre o símbolo
function searchElement(query) {
    const results = elementosQuimicos.filter(elemento => 
        elemento.nombre.toLowerCase().includes(query.toLowerCase()) ||
        elemento.simbolo.toLowerCase().includes(query.toLowerCase())
    );
    
    return results;
}

// Función para obtener información del elemento seleccionado
function getSelectedElementInfo() {
    const equipoSelect = document.getElementById('equipoSelect');
    const selectedValue = equipoSelect.value;
    
    if (selectedValue) {
        if (currentTipo === 'computadora') {
            return elementosQuimicos.find(elemento => elemento.numero == selectedValue);
        } else {
            return mesas.find(mesa => mesa.numero == selectedValue);
        }
    }
    
    return null;
}

// ✅ FUNCIÓN PARA CARGAR SCRIPTS ADICIONALES
function loadAdditionalScripts() {
    // Cargar script del mapa visual
    const mapaScript = document.createElement('script');
    mapaScript.src = SICA_CONFIG.jsPath + 'mapa-visual.js';
    mapaScript.defer = true;
    document.head.appendChild(mapaScript);
    
    console.log('📦 Scripts adicionales cargados');
}

// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL (ACTUALIZADO)
window.SICARegistro = {
    searchElement,
    getSelectedElementInfo,
    validateForm,
    resetForm,
    getCurrentSICA: () => currentSICA,
    getCurrentSICAConfig: () => currentSICAConfig,
    getCurrentTipo: () => currentTipo,
    getElementosQuimicos: () => elementosQuimicos,
    getMesas: () => mesas,
    // ✅ NUEVAS FUNCIONES DEL SISTEMA ENTRADA/SALIDA
    verificarRegistroActivo,
    procesarEntrada,
    procesarSalida,
    moverARegistrosCompletos,
    calcularDuracion,
    // ✅ FUNCIONES DEL FORMULARIO INTELIGENTE
    activarModoEntrada,
    activarModoSalida,
    resetFormularioModo,
    getFormularioModo: () => formularioModo,
    getRegistroEncontrado: () => registroEncontrado
};

// ✅ SOLUCIÓN: Sobrescribir la función de navegación al inicio
// para que funcione correctamente desde la carpeta view
if (window.SICAModern) {
    // Sobrescribir el método goHome para páginas en subdirectorios
    const originalGoHome = window.SICAModern.goHome;
    window.SICAModern.goHome = function() {
        // Detectar si estamos en un subdirectorio
        const currentPath = window.location.pathname;
        const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
        
        if (isInSubdirectory) {
            // Si estamos en view/, ir un nivel arriba
            window.location.href = SICA_CONFIG.indexPath;
        } else {
            // Si no, usar la función original
            if (originalGoHome) {
                originalGoHome();
            } else {
                window.location.href = 'index.html';
            }
        }
        
        // Mostrar notificación si está disponible
        if (window.modernNav && window.modernNav.showModernNotification) {
            window.modernNav.showModernNotification(
                'Navegando al Inicio',
                'Regresando a la página principal...',
                'info',
                'bi-house-fill'
            );
        }
    };
}

// ✅ SOBRESCRIBIR TAMBIÉN LA FUNCIÓN navigateToHome DEL OBJETO modernNav
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que se cargue el sistema de navegación
    setTimeout(() => {
        if (window.modernNav && window.modernNav.navigateToHome) {
            // Sobrescribir el método navigateToHome del objeto modernNav
            window.modernNav.navigateToHome = function() {
                const currentPath = window.location.pathname;
                const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
                
                if (isInSubdirectory) {
                    window.location.href = SICA_CONFIG.indexPath;
                } else {
                    window.location.href = 'index.html';
                }
                
                this.showModernNotification(
                    'Navegando al Inicio',
                    'Regresando a la página principal...',
                    'info',
                    'bi-house-fill'
                );
            };
        }
        
        // ✅ TAMBIÉN SOBRESCRIBIR EN EL OBJETO DE LA CLASE
        if (window.modernNav) {
            window.modernNav.navigateToHome = function() {
                const currentPath = window.location.pathname;
                const isInSubdirectory = currentPath.includes('/view/') || currentPath.includes('view/');
                
                if (isInSubdirectory) {
                    window.location.href = '../index.html';
                } else {
                    window.location.href = 'index.html';
                }
                
                this.showModernNotification(
                    'Navegando al Inicio',
                    'Regresando a la página principal...',
                    'info',
                    'bi-house-fill'
                );
            };
        }
    }, 1000);
});