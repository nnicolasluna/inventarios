const { app, BrowserWindow } = require('electron');
const path = require('path');

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

// Cuando Electron haya terminado de inicializarse
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        // En macOS es común recrear la ventana cuando
        // se hace clic en el ícono del dock
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', function () {
    // En macOS es común que las aplicaciones permanezcan activas
    // hasta que el usuario salga explícitamente con Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

// En este archivo puedes incluir el resto del código de proceso principal de tu aplicación.
// También puedes ponerlos en archivos separados y requerirlos aquí.
