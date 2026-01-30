// Backend local SQLite - Las operaciones ahora se hacen a través de window.electronAPI
let productDataCache = {};
let resumenFinancieroChart, tendenciasChart;

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadInitialData();
    setupForms();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.main-content .content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-section');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                    if (targetId === 'dashboard') {
                        handleLoadDashboard();
                    } else if (targetId === 'inventario') {
                        document.getElementById('cargarInventarioBtn').click();
                    }
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

async function loadInitialData() {
    try {
        const data = await window.electronAPI.getCategorias();

        if (data.status === 'success') {
            populateCategories(data.data);
        } else {
            displayStatus('statusProducto', 'warning', `No se pudieron cargar las categorías: ${data.message}.`);
            populateCategories([]);
        }
    } catch (error) {
        displayStatus('statusProducto', 'error', `Error de conexión al cargar categorías.`);
        populateCategories([]);
    }
}

function populateCategories(categories) {
    const selectProducto = document.getElementById('p_categoria');
    const selectEditProducto = document.getElementById('edit_prod_categoria');
    const tableBody = document.getElementById('categoriasTableBody');

    selectProducto.innerHTML = '';
    if (selectEditProducto) selectEditProducto.innerHTML = '';

    if (categories.length === 0) {
        selectProducto.innerHTML = '<option value="" disabled selected>No hay categorías registradas</option>';
        if (selectEditProducto) selectEditProducto.innerHTML = '<option value="" disabled selected>No hay categorías</option>';
        tableBody.innerHTML = '<tr><td colspan="3">No hay categorías.</td></tr>';
        return;
    }

    selectProducto.innerHTML = '<option value="" disabled selected>Seleccione una categoría</option>';
    if (selectEditProducto) selectEditProducto.innerHTML = '<option value="" disabled>Seleccione una categoría</option>';

    const tableHtml = categories.map(cat => {
        const name = cat.nombre || `(ID ${cat.id})`;
        selectProducto.innerHTML += `<option value="${name}">${name}</option>`;
        if (selectEditProducto) selectEditProducto.innerHTML += `<option value="${name}">${name}</option>`;

        return `
            <tr>
                <td>${cat.id}</td>
                <td>${name}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="openEditCategoriaModal(${cat.id}, '${name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="handleDeleteCategoria(${cat.id}, '${name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = tableHtml;
}

function setupForms() {
    // Configuración
    document.getElementById('iniciarDBBtn').addEventListener('click', () => handleConfigAction('iniciar'));
    document.getElementById('resetDBBtn').addEventListener('click', () => {
        if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
            handleConfigAction('resetear');
        }
    });

    // Categorías y Productos
    document.getElementById('categoriaForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarCategoria', 'statusCategoria'));
    document.getElementById('productoForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarProducto', 'statusProducto'));

    // Compras/Ventas
    document.getElementById('co_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'co'));
    document.getElementById('v_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'v'));

    document.getElementById('compraForm').addEventListener('submit', (e) => handleTransactionPost(e, 'compra'));
    document.getElementById('ventaForm').addEventListener('submit', (e) => handleTransactionPost(e, 'venta'));

    // Resúmenes
    document.getElementById('resumenVentasBtn').addEventListener('click', () => loadSummary('Ventas'));
    document.getElementById('resumenComprasBtn').addEventListener('click', () => loadSummary('Compras'));

    // Dashboard
    document.getElementById('cargarInventarioBtn').addEventListener('click', loadInventario);
    document.getElementById('cargarDatosGraficosBtn').addEventListener('click', handleLoadDashboard);
    document.getElementById('calcularResumenBtn').addEventListener('click', calcularResumenFinanciero);

    // Lista de productos
    document.getElementById('cargarProductosBtn').addEventListener('click', loadProductos);

    // Edit forms
    document.getElementById('editCategoriaForm').addEventListener('submit', handleEditCategoriaSubmit);
    document.getElementById('editProductoForm').addEventListener('submit', handleEditProductoSubmit);
}

// ================= DASHBOARD FUNCTIONS =================

async function handleLoadDashboard() {
    await calcularResumenFinanciero();
    await cargarDatosGraficos();
}

async function calcularResumenFinanciero() {
    displayStatus('statusDashboard', 'info', 'Calculando resumen financiero...');

    try {
        const [ventasData, comprasData] = await Promise.all([
            window.electronAPI.getVentas(),
            window.electronAPI.getCompras()
        ]);

        let totalVentas = 0;
        let totalCompras = 0;

        if (ventasData.status === 'success' && ventasData.data) {
            totalVentas = ventasData.data.reduce((sum, venta) => {
                return sum + (parseFloat(venta.cantidad) * parseFloat(venta.precio_venta));
            }, 0);
        }

        if (comprasData.status === 'success' && comprasData.data) {
            totalCompras = comprasData.data.reduce((sum, compra) => {
                return sum + (parseFloat(compra.cantidad) * parseFloat(compra.precio_compra));
            }, 0);
        }

        const ganancias = totalVentas - totalCompras;

        document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
        document.getElementById('totalCompras').textContent = `$${totalCompras.toFixed(2)}`;
        document.getElementById('totalGanancias').textContent = `$${ganancias.toFixed(2)}`;
        document.getElementById('totalGastos').textContent = `$${totalCompras.toFixed(2)}`;

        const gananciasElement = document.getElementById('totalGanancias');
        if (ganancias > 0) {
            gananciasElement.style.color = 'var(--secondary-color)';
        } else if (ganancias < 0) {
            gananciasElement.style.color = 'var(--danger-color)';
        } else {
            gananciasElement.style.color = '#666';
        }

        displayStatus('statusDashboard', 'success', `Resumen calculado: Ventas: $${totalVentas.toFixed(2)} | Compras: $${totalCompras.toFixed(2)} | Ganancia: $${ganancias.toFixed(2)}`);

        return { totalVentas, totalCompras, ganancias };

    } catch (error) {
        displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
        return { totalVentas: 0, totalCompras: 0, ganancias: 0 };
    }
}

async function cargarDatosGraficos() {
    try {
        const resumenData = await window.electronAPI.getResumenDiario();

        if (resumenData.status === 'success' && resumenData.data && resumenData.data.length > 0) {
            renderCharts(resumenData.data);
        } else {
            await renderChartsFromRawData();
        }

    } catch (error) {
        displayStatus('statusDashboard', 'error', `Error al cargar gráficos: ${error.message}`);
    }
}

async function renderChartsFromRawData() {
    try {
        const [ventasData, comprasData] = await Promise.all([
            window.electronAPI.getVentas(),
            window.electronAPI.getCompras()
        ]);

        const ventasPorFecha = {};
        const comprasPorFecha = {};

        if (ventasData.status === 'success' && ventasData.data) {
            ventasData.data.forEach(venta => {
                const fecha = new Date(venta.fecha).toLocaleDateString();
                const monto = parseFloat(venta.cantidad) * parseFloat(venta.precio_venta);
                ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + monto;
            });
        }

        if (comprasData.status === 'success' && comprasData.data) {
            comprasData.data.forEach(compra => {
                const fecha = new Date(compra.fecha).toLocaleDateString();
                const monto = parseFloat(compra.cantidad) * parseFloat(compra.precio_compra);
                comprasPorFecha[fecha] = (comprasPorFecha[fecha] || 0) + monto;
            });
        }

        const todasFechas = [...new Set([...Object.keys(ventasPorFecha), ...Object.keys(comprasPorFecha)])];
        todasFechas.sort((a, b) => new Date(a) - new Date(b));

        const datosResumen = todasFechas.map(fecha => ({
            fecha: fecha,
            total_ventas: ventasPorFecha[fecha] || 0,
            total_compras: comprasPorFecha[fecha] || 0,
            ganancia: (ventasPorFecha[fecha] || 0) - (comprasPorFecha[fecha] || 0)
        }));

        renderCharts(datosResumen);

    } catch (error) {
        console.error('Error al procesar datos para gráficos:', error);
        displayStatus('statusDashboard', 'warning', 'No hay datos suficientes para generar gráficos.');
    }
}

function renderCharts(resumenData) {
    const labels = resumenData.map(row => {
        if (row.fecha instanceof Date) {
            return row.fecha.toLocaleDateString();
        }
        return row.fecha;
    });

    const ventas = resumenData.map(row => row.total_ventas || 0);
    const compras = resumenData.map(row => row.total_compras || 0);
    const ganancias = resumenData.map(row => row.ganancia || 0);

    const ctx1 = document.getElementById('resumenFinancieroChart').getContext('2d');
    if (resumenFinancieroChart) resumenFinancieroChart.destroy();
    resumenFinancieroChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas',
                    data: ventas,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Compras',
                    data: compras,
                    backgroundColor: 'rgba(23, 162, 184, 0.7)',
                    borderColor: 'rgba(23, 162, 184, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Ganancias',
                    data: ganancias,
                    type: 'line',
                    fill: false,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Resumen Financiero - Ventas, Compras y Ganancias'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monto ($)'
                    }
                }
            }
        }
    });

    const ctx2 = document.getElementById('tendenciasChart').getContext('2d');
    if (tendenciasChart) tendenciasChart.destroy();
    tendenciasChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas Acumuladas',
                    data: ventas.reduce((acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr], []),
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Compras Acumuladas',
                    data: compras.reduce((acc, curr, i) => [...acc, (acc[i - 1] || 0) + curr], []),
                    borderColor: 'rgba(23, 162, 184, 1)',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Tendencias Acumuladas - Ventas vs Compras'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monto Acumulado ($)'
                    }
                }
            }
        }
    });
}

// ================= REST OF THE FUNCTIONS =================

async function handlePostAction(e, action, statusDivId) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = e.submitter;
    submitBtn.disabled = true;
    displayStatus(statusDivId, 'info', `Procesando...`);

    const data = {};
    Array.from(form.elements).forEach(input => {
        if (input.id && (input.id.startsWith('p_') || input.id.startsWith('c_'))) {
            data[input.id.replace(/p_|c_/, '')] = input.value;
        }
    });

    try {
        let responseData;

        if (action === 'agregarCategoria') {
            responseData = await window.electronAPI.agregarCategoria(data.nombre);
        } else if (action === 'agregarProducto') {
            responseData = await window.electronAPI.agregarProducto(data);
        }

        if (responseData.status === 'success') {
            displayStatus(statusDivId, 'success', responseData.message);
            form.reset();
            if (action === 'agregarCategoria') {
                loadInitialData();
            }
        } else {
            displayStatus(statusDivId, 'error', responseData.message);
        }
    } catch (error) {
        displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function handleQueryFilter(query, prefix) {
    const detailDiv = document.getElementById(`${prefix}_product_details`);
    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    const idInput = document.getElementById(`${prefix}_producto_id`);

    detailDiv.classList.add('hidden');
    detailDiv.innerHTML = '';
    idInput.value = '';
    submitBtn.disabled = true;

    if (query.length < 2) return;

    try {
        const data = await window.electronAPI.buscarProducto(query);

        if (data.status === 'success' && data.data && data.data.length > 0) {
            const product = data.data[0];
            productDataCache[product.id] = product;
            updateProductDetails(product, detailDiv, prefix);
            idInput.value = product.id;
            submitBtn.disabled = false;
        } else {
            detailDiv.classList.remove('hidden');
            detailDiv.innerHTML = `<p style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${data.message || 'No se encontraron productos.'}</p>`;
        }

    } catch (error) {
        detailDiv.classList.remove('hidden');
        detailDiv.innerHTML = `<p style="color:var(--danger-color);">Error de búsqueda: ${error.message}</p>`;
    }
}

function updateProductDetails(product, detailDiv, prefix) {
    detailDiv.classList.remove('hidden');

    const isCompra = prefix === 'co';
    const price = isCompra ? product.precio_compra : product.precio_venta;
    const priceLabel = isCompra ? 'Precio Compra Actual' : 'Precio Venta Actual';

    const stockStyle = product.stock < 5 ? 'style="font-weight:bold; color:var(--danger-color);"' : 'style="font-weight:bold; color:var(--secondary-color);"';

    detailDiv.innerHTML = `
                <p><b>ID:</b> ${product.id} | <b>Producto:</b> ${product.nombre} (Cód: ${product.codigo})</p>
                <p><b>Categoría:</b> ${product.categoria}</p>
                <p><b>Stock Actual:</b> <span ${stockStyle}>${product.stock}</span></p>
                <p><b>${priceLabel}:</b> $${parseFloat(price).toFixed(2)}</p>
            `;

    document.getElementById(`${prefix}_precio_${isCompra ? 'compra' : 'venta'}`).value = parseFloat(price).toFixed(2);

    if (!isCompra && product.stock < 5) {
        detailDiv.innerHTML += `<p class="status-message warning" style="display:block; margin-top: 10px;">Stock bajo. Solo quedan ${product.stock} unidades.</p>`;
    }
}

async function handleTransactionPost(e, type) {
    e.preventDefault();
    const form = e.target;
    const prefix = type === 'compra' ? 'co' : 'v';
    const statusDivId = type === 'compra' ? 'statusCompra' : 'statusVenta';

    const submitBtn = document.getElementById(`${prefix}_submit_btn`);
    submitBtn.disabled = true;
    displayStatus(statusDivId, 'info', `Registrando ${type}...`);

    const productoId = document.getElementById(`${prefix}_producto_id`).value;

    if (!productoId) {
        displayStatus(statusDivId, 'error', `No hay producto seleccionado. Busque y seleccione uno.`);
        submitBtn.disabled = false;
        return;
    }

    const transaccionData = {
        producto_id: productoId,
        cantidad: document.getElementById(`${prefix}_cantidad`).value,
        precio: document.getElementById(`${prefix}_precio_${type === 'compra' ? 'compra' : 'venta'}`).value,
        type: type,
        extra_data: document.getElementById(`${prefix}_${type === 'compra' ? 'proveedor' : 'cliente'}`).value,
    };

    try {
        const data = await window.electronAPI.registrarTransaccion(transaccionData);

        if (data.status === 'success') {
            displayStatus(statusDivId, 'success', data.message);
            form.reset();
            delete productDataCache[productoId];
            document.getElementById(`${prefix}_product_details`).classList.add('hidden');
        } else {
            displayStatus(statusDivId, 'error', data.message);
        }
    } catch (error) {
        displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadInventario() {
    displayStatus('statusInventario', 'info', 'Cargando datos de inventario...');
    const tableBody = document.getElementById('inventarioTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    try {
        const data = await window.electronAPI.getInventario();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayStatus('statusInventario', 'success', `Inventario cargado: ${data.data.length} productos.`);
            tableBody.innerHTML = data.data.map(p => {
                const stockStyle = p.stock < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
                return `
                            <tr>
                                <td>${p.id}</td>
                                <td>${p.nombre}</td>
                                <td>${p.código}</td>
                                <td>${p.categoría}</td>
                                <td ${stockStyle}>${p.stock}</td>
                                <td>$${p.precio_venta.toFixed(2)}</td>
                            </tr>
                        `;
            }).join('');
        } else {
            displayStatus('statusInventario', 'warning', data.message);
            tableBody.innerHTML = '<tr><td colspan="6">No hay productos en inventario.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusInventario', 'error', `Error al cargar inventario: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="6">Error al cargar datos.</td></tr>';
    }
}

async function loadSummary(type) {
    const sheetName = type === 'Ventas' ? 'VENTAS' : 'COMPRAS';
    displayStatus('statusResumen', 'info', `Cargando resumen de ${sheetName}...`);
    const table = document.getElementById('resumenTable');
    const tableHead = table.querySelector('thead');
    const tableBody = document.getElementById('resumenTableBody');
    table.classList.add('hidden');
    tableBody.innerHTML = '';

    try {
        const data = type === 'Ventas' ?
            await window.electronAPI.getVentas() :
            await window.electronAPI.getCompras();

        if (data.status === 'success' && data.data.length > 0) {
            displayStatus('statusResumen', 'success', `${data.data.length} ${sheetName} registradas.`);
            table.classList.remove('hidden');

            const headers = Object.keys(data.data[0]).map(h => `<th>${h.toUpperCase().replace('_', ' ')}</th>`).join('');
            tableHead.innerHTML = `<tr>${headers}</tr>`;

            tableBody.innerHTML = data.data.map(row => {
                const cells = Object.values(row).map(value => {
                    if (typeof value === 'number') {
                        value = value.toFixed(2);
                    }
                    return `<td>${value}</td>`;
                }).join('');
                return `<tr>${cells}</tr>`;
            }).join('');

        } else {
            displayStatus('statusResumen', 'warning', `No hay datos en ${sheetName}.`);
        }
    } catch (error) {
        displayStatus('statusResumen', 'error', `Error al cargar resumen: ${error.message}`);
    }
}

async function handleConfigAction(action) {
    const statusConfig = document.getElementById('statusConfig');
    setButtonState(true);
    displayStatus('statusConfig', 'info', `Procesando la acción de ${action}...`);

    try {
        const data = action === 'iniciar' ?
            await window.electronAPI.iniciar() :
            await window.electronAPI.resetear();

        if (data.status === 'success') {
            displayStatus('statusConfig', 'success', data.message);
            loadInitialData();
        } else {
            displayStatus('statusConfig', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusConfig', 'error', `Error de conexión: ${error.message}.`);
    } finally {
        setButtonState(false);
    }
}

function setButtonState(disabled) {
    document.getElementById('iniciarDBBtn').disabled = disabled;
    document.getElementById('resetDBBtn').disabled = disabled;
}

function displayStatus(elementId, type, message) {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    el.className = `status-message ${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i> ${message}`;
}

// ================= CATEGORY CRUD FUNCTIONS =================

function openEditCategoriaModal(id, nombre) {
    document.getElementById('edit_cat_id').value = id;
    document.getElementById('edit_cat_nombre').value = nombre;
    document.getElementById('editCategoriaModal').style.display = 'block';
}

function closeEditCategoriaModal() {
    document.getElementById('editCategoriaModal').style.display = 'none';
    document.getElementById('editCategoriaForm').reset();
}

async function handleEditCategoriaSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit_cat_id').value;
    const nuevoNombre = document.getElementById('edit_cat_nombre').value;

    displayStatus('statusCategoria', 'info', 'Actualizando categoría...');

    try {
        const data = await window.electronAPI.editarCategoria(parseInt(id), nuevoNombre);

        if (data.status === 'success') {
            displayStatus('statusCategoria', 'success', data.message);
            closeEditCategoriaModal();
            loadInitialData();
        } else {
            displayStatus('statusCategoria', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusCategoria', 'error', `Error: ${error.message}`);
    }
}

async function handleDeleteCategoria(id, nombre) {
    if (!confirm(`¿Está seguro de eliminar la categoría "${nombre}"?\n\nNota: No se puede eliminar si hay productos usando esta categoría.`)) {
        return;
    }

    displayStatus('statusCategoria', 'info', 'Eliminando categoría...');

    try {
        const data = await window.electronAPI.eliminarCategoria(id);

        if (data.status === 'success') {
            displayStatus('statusCategoria', 'success', data.message);
            loadInitialData();
        } else {
            displayStatus('statusCategoria', 'error', data.message);
        }
    } catch (error) {
        displayStatus('statusCategoria', 'error', `Error: ${error.message}`);
    }
}

// ================= PRODUCT LIST AND CRUD FUNCTIONS =================

async function loadProductos() {
    displayStatus('statusListaProductos', 'info', 'Cargando productos...');
    const tableBody = document.getElementById('productosTableBody');
    tableBody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';

    try {
        const data = await window.electronAPI.getProductos();

        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayStatus('statusListaProductos', 'success', `${data.data.length} productos cargados.`);

            // Get categories for the edit modal
            const catData = await window.electronAPI.getCategorias();
            if (catData.status === 'success') {
                populateCategories(catData.data);
            }

            tableBody.innerHTML = data.data.map(p => {
                const stockStyle = p.stock < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
                return `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.codigo}</td>
                        <td>${p.nombre}</td>
                        <td>${p.categoria}</td>
                        <td>$${parseFloat(p.precio_compra).toFixed(2)}</td>
                        <td>$${parseFloat(p.precio_venta).toFixed(2)}</td>
                        <td ${stockStyle}>${p.stock}</td>
                        <td>
                            <button class="btn-icon btn-edit" onclick='openEditProductoModal(${JSON.stringify(p)})'>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="handleDeleteProducto(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            displayStatus('statusListaProductos', 'warning', 'No hay productos registrados.');
            tableBody.innerHTML = '<tr><td colspan="8">No hay productos.</td></tr>';
        }
    } catch (error) {
        displayStatus('statusListaProductos', 'error', `Error: ${error.message}`);
        tableBody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
    }
}

function openEditProductoModal(producto) {
    document.getElementById('edit_prod_id').value = producto.id;
    document.getElementById('edit_prod_codigo').value = producto.codigo;
    document.getElementById('edit_prod_nombre').value = producto.nombre;
    document.getElementById('edit_prod_categoria').value = producto.categoria;
    document.getElementById('edit_prod_precio_compra').value = producto.precio_compra;
    document.getElementById('edit_prod_precio_venta').value = producto.precio_venta;
    document.getElementById('edit_prod_stock').value = producto.stock;
    document.getElementById('editProductoModal').style.display = 'block';
}

function closeEditProductoModal() {
    document.getElementById('editProductoModal').style.display = 'none';
    document.getElementById('editProductoForm').reset();
}

async function handleEditProductoSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit_prod_id').value;

    const data = {
        codigo: document.getElementById('edit_prod_codigo').value,
        nombre: document.getElementById('edit_prod_nombre').value,
        categoria: document.getElementById('edit_prod_categoria').value,
        precio_compra: document.getElementById('edit_prod_precio_compra').value,
        precio_venta: document.getElementById('edit_prod_precio_venta').value,
        stock: document.getElementById('edit_prod_stock').value
    };

    displayStatus('statusListaProductos', 'info', 'Actualizando producto...');

    try {
        const result = await window.electronAPI.editarProducto(parseInt(id), data);

        if (result.status === 'success') {
            displayStatus('statusListaProductos', 'success', result.message);
            closeEditProductoModal();
            loadProductos();
        } else {
            displayStatus('statusListaProductos', 'error', result.message);
        }
    } catch (error) {
        displayStatus('statusListaProductos', 'error', `Error: ${error.message}`);
    }
}

async function handleDeleteProducto(id, nombre) {
    if (!confirm(`¿Está seguro de eliminar el producto "${nombre}"?\n\nNota: No se puede eliminar si hay transacciones relacionadas.`)) {
        return;
    }

    displayStatus('statusListaProductos', 'info', 'Eliminando producto...');

    try {
        const result = await window.electronAPI.eliminarProducto(id);

        if (result.status === 'success') {
            displayStatus('statusListaProductos', 'success', result.message);
            loadProductos();
        } else {
            displayStatus('statusListaProductos', 'error', result.message);
        }
    } catch (error) {
        displayStatus('statusListaProductos', 'error', `Error: ${error.message}`);
    }
}

// Close modals when clicking outside
window.onclick = function (event) {
    const editCatModal = document.getElementById('editCategoriaModal');
    const editProdModal = document.getElementById('editProductoModal');

    if (event.target === editCatModal) {
        closeEditCategoriaModal();
    }
    if (event.target === editProdModal) {
        closeEditProductoModal();
    }
}
