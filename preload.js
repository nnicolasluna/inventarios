// Script de precarga para exponer APIs de manera segura
const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs protegidas al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // Categorías
    getCategorias: () => ipcRenderer.invoke('db:getCategorias'),
    agregarCategoria: (nombre) => ipcRenderer.invoke('db:agregarCategoria', nombre),

    // Productos
    agregarProducto: (data) => ipcRenderer.invoke('db:agregarProducto', data),
    buscarProducto: (query) => ipcRenderer.invoke('db:buscarProducto', query),
    getInventario: () => ipcRenderer.invoke('db:getInventario'),

    // Transacciones
    registrarTransaccion: (data) => ipcRenderer.invoke('db:registrarTransaccion', data),

    // Resúmenes
    getVentas: () => ipcRenderer.invoke('db:getVentas'),
    getCompras: () => ipcRenderer.invoke('db:getCompras'),
    getResumenDiario: () => ipcRenderer.invoke('db:getResumenDiario'),

    // Configuración
    iniciar: () => ipcRenderer.invoke('db:iniciar'),
    resetear: () => ipcRenderer.invoke('db:resetear')
});

console.log('Preload script cargado - APIs de BD expuestas');
