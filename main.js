const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
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
    // Verificación de UUID
    const checkUUID = () => {
        return new Promise((resolve, reject) => {
            // Usamos PowerShell en lugar de wmic para compatibilidad con Windows 11
            const cmd = 'powershell.exe -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"';

            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    // Intento fallback con wmic por si acaso (para versiones muy viejas)
                    exec('wmic csproduct get uuid', (err, out, serr) => {
                        if (err) {
                            reject(error); // Si ambos fallan, devolvemos el error original de powershell o una mezcla
                            return;
                        }
                        const lines = out.trim().split('\n');
                        if (lines.length >= 2) {
                            resolve(lines[1].trim());
                        } else {
                            resolve(lines[0].trim());
                        }
                    });
                    return;
                }
                // stdout de powershell debería ser solo el UUID
                resolve(stdout.trim());
            });
        });
    };

    try {
        const currentUUID = await checkUUID();
        // =================================================================================
        // CONFIGURACIÓN DE LICENCIA
        // SI NECESITAS CAMBIAR EL UUID PERMITIDO, EDITA LA SIGUIENTE LÍNEA:
        const allowedUUID = "86568F4F-74BA-7436-2ABC-5811229CE4F5";
        /* const allowedUUID = "01887304-856D-3D4D-91E0-B574F0569C63"; */
        // =================================================================================

        console.log(`UUID Detectado: ${currentUUID}`);

        if (currentUUID !== allowedUUID) {
            dialog.showErrorBox('Error de Licencia', 'Copia ilegal detectada. Este software no está autorizado para ejecutarse en este equipo. \nUUID: ' + currentUUID);
            app.quit();
            return;
        }
    } catch (error) {
        console.error('Error al verificar UUID:', error);
        dialog.showErrorBox('Error de Sistema', 'No se pudo verificar la identidad del equipo.');
        app.quit();
        return;
    }

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

ipcMain.handle('db:editarCategoria', async (event, id, nuevoNombre) => {
    try {
        const result = db.editarCategoria(id, nuevoNombre);
        if (result.success) {
            return { status: 'success', message: result.message };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:eliminarCategoria', async (event, id) => {
    try {
        const result = db.eliminarCategoria(id);
        if (result.success) {
            return { status: 'success', message: result.message };
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

ipcMain.handle('db:getProductos', async () => {
    try {
        const data = db.getProductos();
        return { status: 'success', data };
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:editarProducto', async (event, id, data) => {
    try {
        const result = db.editarProducto(id, data);
        if (result.success) {
            return { status: 'success', message: result.message };
        } else {
            return { status: 'error', message: result.error };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:eliminarProducto', async (event, id) => {
    try {
        const result = db.eliminarProducto(id);
        if (result.success) {
            return { status: 'success', message: result.message };
        } else {
            return { status: 'error', message: result.error };
        }
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

// =============== EXPORTACIÓN ===============


const fs = require('fs');

// Función auxiliar para guardar archivos
async function saveFile(content, defaultName, filters) {
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Guardar Archivo',
        defaultPath: defaultName,
        filters: filters
    });

    if (canceled || !filePath) return null;

    try {
        fs.writeFileSync(filePath, content);
        return filePath;
    } catch (error) {
        throw new Error('Error al guardar el archivo: ' + error.message);
    }
}

ipcMain.handle('db:exportPurchasesPDF', async () => {
    try {
        const { jsPDF } = require('jspdf');
        require('jspdf-autotable');

        const purchases = db.getCompras();
        if (purchases.length === 0) return { status: 'error', message: 'No hay compras para exportar' };

        const doc = new jsPDF();
        doc.text('Reporte de Compras', 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableColumn = ["ID", "Fecha", "Producto", "Cantidad", "Precio", "Proveedor"];
        const tableRows = [];

        purchases.forEach(purchase => {
            const purchaseData = [
                purchase.id,
                purchase.fecha.split('T')[0],
                purchase.producto_nombre,
                purchase.cantidad,
                `$${purchase.precio_compra.toFixed(2)}`,
                purchase.proveedor || '-'
            ];
            tableRows.push(purchaseData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        const pdfData = doc.output('arraybuffer');
        const buffer = Buffer.from(pdfData);

        const filePath = await saveFile(buffer, `compras_${Date.now()}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }]);

        if (filePath) {
            return { status: 'success', message: `Reporte guardado en: ${filePath}` };
        } else {
            return { status: 'cancelled', message: 'Exportación cancelada' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:exportPurchasesExcel', async () => {
    try {
        const XLSX = require('xlsx');

        const purchases = db.getCompras();
        if (purchases.length === 0) return { status: 'error', message: 'No hay compras para exportar' };

        const data = purchases.map(p => ({
            ID: p.id,
            Fecha: p.fecha.split('T')[0],
            Producto: p.producto_nombre,
            Codigo: p.producto_codigo,
            Cantidad: p.cantidad,
            Precio_Unitario: p.precio_compra,
            Total: p.cantidad * p.precio_compra,
            Proveedor: p.proveedor
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Compras");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        const filePath = await saveFile(excelBuffer, `compras_${Date.now()}.xlsx`, [{ name: 'Excel', extensions: ['xlsx'] }]);

        if (filePath) {
            return { status: 'success', message: `Reporte guardado en: ${filePath}` };
        } else {
            return { status: 'cancelled', message: 'Exportación cancelada' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:exportSalesPDF', async () => {
    try {
        const { jsPDF } = require('jspdf');
        require('jspdf-autotable');

        const sales = db.getVentas();
        if (sales.length === 0) return { status: 'error', message: 'No hay ventas para exportar' };

        const doc = new jsPDF();
        doc.text('Reporte de Ventas', 14, 15);
        doc.setFontSize(10);
        doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableColumn = ["ID", "Fecha", "Producto", "Cantidad", "Precio", "Cliente"];
        const tableRows = [];

        sales.forEach(sale => {
            const saleData = [
                sale.id,
                sale.fecha.split('T')[0],
                sale.producto_nombre,
                sale.cantidad,
                `$${sale.precio_venta.toFixed(2)}`,
                sale.cliente || '-'
            ];
            tableRows.push(saleData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        const pdfData = doc.output('arraybuffer');
        const buffer = Buffer.from(pdfData);

        const filePath = await saveFile(buffer, `ventas_${Date.now()}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }]);

        if (filePath) {
            return { status: 'success', message: `Reporte guardado en: ${filePath}` };
        } else {
            return { status: 'cancelled', message: 'Exportación cancelada' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:exportSalesExcel', async () => {
    try {
        const XLSX = require('xlsx');

        const sales = db.getVentas();
        if (sales.length === 0) return { status: 'error', message: 'No hay ventas para exportar' };

        const data = sales.map(s => ({
            ID: s.id,
            Fecha: s.fecha.split('T')[0],
            Producto: s.producto_nombre,
            Codigo: s.producto_codigo,
            Cantidad: s.cantidad,
            Precio_Unitario: s.precio_venta,
            Total: s.cantidad * s.precio_venta,
            Cliente: s.cliente
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        const filePath = await saveFile(excelBuffer, `ventas_${Date.now()}.xlsx`, [{ name: 'Excel', extensions: ['xlsx'] }]);

        if (filePath) {
            return { status: 'success', message: `Reporte guardado en: ${filePath}` };
        } else {
            return { status: 'cancelled', message: 'Exportación cancelada' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});

ipcMain.handle('db:backupDatabase', async () => {
    try {
        const dbPath = path.join(app.getPath('userData'), 'inventario.db');
        if (!fs.existsSync(dbPath)) {
            return { status: 'error', message: 'No se encontró la base de datos para respaldar' };
        }

        const buffer = fs.readFileSync(dbPath);
        const filePath = await saveFile(buffer, `backup_inventario_${Date.now()}.db`, [{ name: 'SQLite DB', extensions: ['db'] }]);

        if (filePath) {
            return { status: 'success', message: `Respaldo guardado en: ${filePath}` };
        } else {
            return { status: 'cancelled', message: 'Respaldo cancelado' };
        }
    } catch (error) {
        return { status: 'error', message: error.message };
    }
});


