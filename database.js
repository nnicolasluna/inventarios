const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class InventoryDatabase {
    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'inventario.db');
        this.db = null;
        this.SQL = null;
    }

    async initialize() {
        this.SQL = await initSqlJs();

        // Cargar BD existente o crear nueva
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new this.SQL.Database(buffer);
        } else {
            this.db = new this.SQL.Database();
        }

        this.createTables();
    }

    createTables() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                precio_compra REAL NOT NULL,
                precio_venta REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS compras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_compra REAL NOT NULL,
                proveedor TEXT,
                fecha TEXT NOT NULL
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_venta REAL NOT NULL,
                cliente TEXT,
                fecha TEXT NOT NULL
            )
        `);

        this.save();
    }

    save() {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    // =============== CATEGORÍAS ===============

    agregarCategoria(nombre) {
        try {
            const stmt = this.db.prepare('INSERT INTO categorias (nombre) VALUES (?)');
            stmt.run([nombre]);
            stmt.free();
            this.save();

            const result = this.db.exec('SELECT last_insert_rowid() as id');
            return { success: true, id: result[0].values[0][0] };
        } catch (error) {
            return { success: false, error: error.message.includes('UNIQUE') ? 'La categoría ya existe' : error.message };
        }
    }

    getCategorias() {
        const result = this.db.exec('SELECT * FROM categorias ORDER BY id');
        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0],
            nombre: row[1]
        }));
    }

    editarCategoria(id, nuevoNombre) {
        try {
            // Verificar si la categoría existe
            const result = this.db.exec(`SELECT * FROM categorias WHERE id = ${id}`);
            if (result.length === 0) {
                return { success: false, error: 'Categoría no encontrada' };
            }

            const stmt = this.db.prepare('UPDATE categorias SET nombre = ? WHERE id = ?');
            stmt.run([nuevoNombre, id]);
            stmt.free();
            this.save();

            return { success: true, message: 'Categoría actualizada exitosamente' };
        } catch (error) {
            return { success: false, error: error.message.includes('UNIQUE') ? 'Ya existe una categoría con ese nombre' : error.message };
        }
    }

    eliminarCategoria(id) {
        try {
            // Verificar si la categoría existe
            const catResult = this.db.exec(`SELECT nombre FROM categorias WHERE id = ${id}`);
            if (catResult.length === 0) {
                return { success: false, error: 'Categoría no encontrada' };
            }

            const nombreCategoria = catResult[0].values[0][0];

            // Verificar si hay productos usando esta categoría
            const prodResult = this.db.exec(`SELECT COUNT(*) as count FROM productos WHERE categoria = '${nombreCategoria}'`);
            const count = prodResult[0].values[0][0];

            if (count > 0) {
                return { success: false, error: `No se puede eliminar. Hay ${count} producto(s) usando esta categoría` };
            }

            const stmt = this.db.prepare('DELETE FROM categorias WHERE id = ?');
            stmt.run([id]);
            stmt.free();
            this.save();

            return { success: true, message: 'Categoría eliminada exitosamente' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =============== PRODUCTOS ===============

    agregarProducto(data) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO productos (codigo, nombre, categoria, precio_compra, precio_venta, stock)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run([
                data.codigo,
                data.nombre,
                data.categoria,
                parseFloat(data.precio_compra),
                parseFloat(data.precio_venta),
                parseInt(data.stock)
            ]);
            stmt.free();
            this.save();

            const result = this.db.exec('SELECT last_insert_rowid() as id');
            return { success: true, id: result[0].values[0][0] };
        } catch (error) {
            return { success: false, error: error.message.includes('UNIQUE') ? 'El código de producto ya existe' : error.message };
        }
    }

    buscarProducto(query) {
        const stmt = this.db.prepare(`
            SELECT * FROM productos 
            WHERE CAST(id AS TEXT) = ? OR codigo LIKE ? OR nombre LIKE ?
            LIMIT 5
        `);
        const searchTerm = `%${query}%`;
        stmt.bind([query, searchTerm, searchTerm]);

        const products = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            products.push(row);
        }
        stmt.free();
        return products;
    }

    getInventario() {
        const result = this.db.exec('SELECT * FROM productos ORDER BY id');
        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0],
            código: row[1],
            nombre: row[2],
            categoría: row[3],
            precio_compra: row[4],
            precio_venta: row[5],
            stock: row[6]
        }));
    }

    actualizarStock(productoId, nuevaCantidad) {
        const stmt = this.db.prepare('UPDATE productos SET stock = ? WHERE id = ?');
        stmt.run([nuevaCantidad, productoId]);
        stmt.free();
        this.save();
    }

    getProductos() {
        const result = this.db.exec('SELECT * FROM productos ORDER BY id');
        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0],
            codigo: row[1],
            nombre: row[2],
            categoria: row[3],
            precio_compra: row[4],
            precio_venta: row[5],
            stock: row[6]
        }));
    }

    editarProducto(id, data) {
        try {
            // Verificar si el producto existe
            const result = this.db.exec(`SELECT * FROM productos WHERE id = ${id}`);
            if (result.length === 0) {
                return { success: false, error: 'Producto no encontrado' };
            }

            const stmt = this.db.prepare(`
                UPDATE productos 
                SET codigo = ?, nombre = ?, categoria = ?, precio_compra = ?, precio_venta = ?, stock = ?
                WHERE id = ?
            `);
            stmt.run([
                data.codigo,
                data.nombre,
                data.categoria,
                parseFloat(data.precio_compra),
                parseFloat(data.precio_venta),
                parseInt(data.stock),
                id
            ]);
            stmt.free();
            this.save();

            return { success: true, message: 'Producto actualizado exitosamente' };
        } catch (error) {
            return { success: false, error: error.message.includes('UNIQUE') ? 'El código de producto ya existe' : error.message };
        }
    }

    eliminarProducto(id) {
        try {
            // Verificar si el producto existe
            const prodResult = this.db.exec(`SELECT * FROM productos WHERE id = ${id}`);
            if (prodResult.length === 0) {
                return { success: false, error: 'Producto no encontrado' };
            }

            // Verificar si hay compras relacionadas
            const comprasResult = this.db.exec(`SELECT COUNT(*) as count FROM compras WHERE producto_id = ${id}`);
            const comprasCount = comprasResult[0].values[0][0];

            // Verificar si hay ventas relacionadas
            const ventasResult = this.db.exec(`SELECT COUNT(*) as count FROM ventas WHERE producto_id = ${id}`);
            const ventasCount = ventasResult[0].values[0][0];

            const totalTransacciones = comprasCount + ventasCount;

            if (totalTransacciones > 0) {
                return { success: false, error: `No se puede eliminar. Hay ${totalTransacciones} transacción(es) relacionada(s)` };
            }

            const stmt = this.db.prepare('DELETE FROM productos WHERE id = ?');
            stmt.run([id]);
            stmt.free();
            this.save();

            return { success: true, message: 'Producto eliminado exitosamente' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =============== TRANSACCIONES ===============

    registrarTransaccion(data) {
        try {
            const result = this.db.exec(`SELECT * FROM productos WHERE id = ${data.producto_id}`);

            if (result.length === 0) {
                return { success: false, error: 'Producto no encontrado' };
            }

            const producto = {
                id: result[0].values[0][0],
                codigo: result[0].values[0][1],
                nombre: result[0].values[0][2],
                categoria: result[0].values[0][3],
                precio_compra: result[0].values[0][4],
                precio_venta: result[0].values[0][5],
                stock: result[0].values[0][6]
            };

            const fecha = new Date().toISOString();
            const cantidad = parseInt(data.cantidad);
            const precio = parseFloat(data.precio);

            if (data.type === 'compra') {
                const stmt = this.db.prepare(`
                    INSERT INTO compras (producto_id, cantidad, precio_compra, proveedor, fecha)
                    VALUES (?, ?, ?, ?, ?)
                `);
                stmt.run([data.producto_id, cantidad, precio, data.extra_data || '', fecha]);
                stmt.free();

                this.actualizarStock(data.producto_id, producto.stock + cantidad);

                return { success: true, message: 'Compra registrada exitosamente' };

            } else if (data.type === 'venta') {
                if (producto.stock < cantidad) {
                    return { success: false, error: `Stock insuficiente. Disponible: ${producto.stock}` };
                }

                const stmt = this.db.prepare(`
                    INSERT INTO ventas (producto_id, cantidad, precio_venta, cliente, fecha)
                    VALUES (?, ?, ?, ?, ?)
                `);
                stmt.run([data.producto_id, cantidad, precio, data.extra_data || '', fecha]);
                stmt.free();

                this.actualizarStock(data.producto_id, producto.stock - cantidad);

                return { success: true, message: 'Venta registrada exitosamente' };
            }

            return { success: false, error: 'Tipo de transacción inválido' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =============== RESÚMENES ===============

    getVentas() {
        const result = this.db.exec(`
            SELECT v.id, v.producto_id, v.cantidad, v.precio_venta, v.cliente, v.fecha,
                   p.nombre as producto_nombre, p.codigo as producto_codigo
            FROM ventas v
            JOIN productos p ON v.producto_id = p.id
            ORDER BY v.fecha DESC
        `);

        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0],
            producto_id: row[1],
            cantidad: row[2],
            precio_venta: row[3],
            cliente: row[4],
            fecha: row[5],
            producto_nombre: row[6],
            producto_codigo: row[7]
        }));
    }

    getCompras() {
        const result = this.db.exec(`
            SELECT c.id, c.producto_id, c.cantidad, c.precio_compra, c.proveedor, c.fecha,
                   p.nombre as producto_nombre, p.codigo as producto_codigo
            FROM compras c
            JOIN productos p ON c.producto_id = p.id
            ORDER BY c.fecha DESC
        `);

        if (result.length === 0) return [];

        return result[0].values.map(row => ({
            id: row[0],
            producto_id: row[1],
            cantidad: row[2],
            precio_compra: row[3],
            proveedor: row[4],
            fecha: row[5],
            producto_nombre: row[6],
            producto_codigo: row[7]
        }));
    }

    getResumenDiario() {
        const ventas = this.db.exec(`
            SELECT DATE(fecha) as fecha, SUM(cantidad * precio_venta) as total
            FROM ventas
            GROUP BY DATE(fecha)
        `);

        const compras = this.db.exec(`
            SELECT DATE(fecha) as fecha, SUM(cantidad * precio_compra) as total
            FROM compras
            GROUP BY DATE(fecha)
        `);

        const resumen = {};

        if (ventas.length > 0) {
            ventas[0].values.forEach(row => {
                resumen[row[0]] = { fecha: row[0], total_ventas: row[1], total_compras: 0 };
            });
        }

        if (compras.length > 0) {
            compras[0].values.forEach(row => {
                if (resumen[row[0]]) {
                    resumen[row[0]].total_compras = row[1];
                } else {
                    resumen[row[0]] = { fecha: row[0], total_ventas: 0, total_compras: row[1] };
                }
            });
        }

        return Object.values(resumen).map(r => ({
            ...r,
            ganancia: r.total_ventas - r.total_compras
        }));
    }

    // =============== CONFIGURACIÓN ===============

    resetDatabase() {
        try {
            this.db.run('DELETE FROM ventas');
            this.db.run('DELETE FROM compras');
            this.db.run('DELETE FROM productos');
            this.db.run('DELETE FROM categorias');
            this.save();
            return { success: true, message: 'Base de datos reseteada exitosamente' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    close() {
        if (this.db) {
            this.save();
            this.db.close();
        }
    }
}

module.exports = InventoryDatabase;
