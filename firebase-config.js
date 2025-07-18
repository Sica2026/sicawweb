// Firebase config usando CDN - para usar en navegadores directamente

// Este archivo debe ser cargado DESPUÉS de los scripts de Firebase CDN
const firebaseConfig = {
  apiKey: "AIzaSyCKbsV-F63jAHT342uw-XBF1DWPKJKrxmY",
  authDomain: "sica-a5c24.firebaseapp.com",
  projectId: "sica-a5c24",
  storageBucket: "sica-a5c24.firebasestorage.app",
  messagingSenderId: "1004926038824",
  appId: "1:1004926038824:web:552abf02e9c7c89124961d"
};

// Initialize Firebase (usando las variables globales del CDN)
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Hacer disponible globalmente
window.firebaseDB = db;

console.log('🔥 Firebase inicializado correctamente');