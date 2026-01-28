// Script de precarga para exponer APIs de manera segura
const { contextBridge } = require('electron');

// Exponer APIs protegidas al renderer process si es necesario
contextBridge.exposeInMainWorld('electronAPI', {
    // Aquí puedes exponer funciones personalizadas si lo necesitas
    platform: process.platform
});

// Este script se ejecuta antes de que se cargue el contenido de la página
// Proporciona una forma segura de exponer APIs de Node.js al contenido web
console.log('Preload script cargado correctamente');
