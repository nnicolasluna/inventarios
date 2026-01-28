const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const InventoryDatabase = require('./database');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        icon: path.join(__dirname, 'build/icon.png'),
        backgroundColor: '#1a1a2e',
        show: false
    });

    // Cargar el archivo HTML principal
    mainWindow.loadFile('index.html');

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Abrir DevTools en desarrollo (opcional, comentar para producción)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}



// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', function () {
    // En macOS es común que las aplicaciones permanezcan activas
    // hasta que el usuario salga explícitamente con Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

// En este archivo puedes incluir el resto del código de proceso principal de tu aplicación.
// También puedes ponerlos en archivos separados y requerirlos aquí.

// =============== BASE DE DATOS E IPC ===============

let db;

// Inicializar la base de datos cuando la app esté lista
app.whenReady().then(async () => {
    db = new InventoryDatabase();
    await db.initialize();
    console.log('Base de datos SQLite inicializada');

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Cerrar la BD al salir
app.on('before-quit', () => {
    if (db) db.close();
});

// =============== HANDLERS IPC ===============

// Categorías
ipcMain.handle('db:getCategorias', async () => {
    try {
        const data = db.getCategorias();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:agregarCategoria', async (event, nombre) => {
    try {
        const result = db.agregarCategoria(nombre);
        if (result.success) {
            return { status: 'success', message: 'Categoría agregada exitosamente', id: result.id };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

// Productos
ipcMain.handle('db:agregarProducto', async (event, data) => {
    try {
        const result = db.agregarProducto(data);
        if (result.success) {
            return { status: 'success', message: 'Producto agregado exitosamente', id: result.id };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:buscarProducto', async (event, query) => {
    try {
        const data = db.buscarProducto(query);
        if (data.length > 0) {
            return { status: 'success', data };
        } else {
            return { status: 'error', message: 'No se encontraron productos' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:getInventario', async () => {
    try {
        const data = db.getInventario();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

// Transacciones
ipcMain.handle('db:registrarTransaccion', async (event, data) => {
    try {
        const result = db.registrarTransaccion(data);
        if (result.success) {
            return { status: 'success', message: result.message };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

// Resúmenes
ipcMain.handle('db:getVentas', async () => {
    try {
        const data = db.getVentas();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:getCompras', async () => {
    try {
        const data = db.getCompras();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:getResumenDiario', async () => {
    try {
        const data = db.getResumenDiario();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

// Configuración
ipcMain.handle('db:iniciar', async () => {
    try {
        db.createTables();
        return { status: 'success', message: 'Base de datos inicializada correctamente' };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:resetear', async () => {
    try {
        const result = db.resetDatabase();
        if (result.success) {
            return { status: 'success', message: result.message };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

