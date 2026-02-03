// Script de precarga para exponer APIs de manera segura
const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs protegidas al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // Categorías
    getCategorias: () => ipcRenderer.invoke('db:getCategorias'),
    agregarCategoria: (nombre) => ipcRenderer.invoke('db:agregarCategoria', nombre),
    editarCategoria: (id, nuevoNombre) => ipcRenderer.invoke('db:editarCategoria', id, nuevoNombre),
    eliminarCategoria: (id) => ipcRenderer.invoke('db:eliminarCategoria', id),

    // Productos
    agregarProducto: (data) => ipcRenderer.invoke('db:agregarProducto', data),
    buscarProducto: (query) => ipcRenderer.invoke('db:buscarProducto', query),
    getInventario: () => ipcRenderer.invoke('db:getInventario'),
    getProductos: () => ipcRenderer.invoke('db:getProductos'),
    editarProducto: (id, data) => ipcRenderer.invoke('db:editarProducto', id, data),
    eliminarProducto: (id) => ipcRenderer.invoke('db:eliminarProducto', id),

    // Transacciones
    registrarTransaccion: (data) => ipcRenderer.invoke('db:registrarTransaccion', data),

    // Resúmenes
    getVentas: () => ipcRenderer.invoke('db:getVentas'),
    getCompras: () => ipcRenderer.invoke('db:getCompras'),
    getResumenDiario: () => ipcRenderer.invoke('db:getResumenDiario'),

    // Configuración
    iniciar: () => ipcRenderer.invoke('db:iniciar'),
    resetear: () => ipcRenderer.invoke('db:resetear'),

    // Exportación
    exportPurchasesPDF: () => ipcRenderer.invoke('db:exportPurchasesPDF'),
    exportPurchasesExcel: () => ipcRenderer.invoke('db:exportPurchasesExcel'),
    exportSalesPDF: () => ipcRenderer.invoke('db:exportSalesPDF'),
    exportSalesExcel: () => ipcRenderer.invoke('db:exportSalesExcel'),
    backupDatabase: () => ipcRenderer.invoke('db:backupDatabase')
});

console.log('Preload script cargado - APIs de BD expuestas');
