/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC
 * SERVIDOR CENTRAL MEJORADO
 * - Enmarcado de mensajes TCP con prefijo de longitud
 * - Pool de workers para multiplicación de matrices
 * - Validación de entrada y límites de seguridad
 * - Cierre graceful y manejo de errores
 */

const net = require('net');
const dgram = require('dgram');
const { Worker } = require('worker_threads');
const path = require('path');

// Configuración
const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0';
const MAX_MESSAGE_SIZE = 1024 * 1024; // 1 MB
const MAX_WORKERS = 4; // Tamaño del pool de workers

let clients = []; // Socket clients activos

// --- POOL DE WORKERS PARA MATRICES ---
class WorkerPool {
    constructor(workerScript, size) {
        this.workerScript = workerScript;
        this.size = size;
        this.workers = [];
        this.taskQueue = [];
        this.availableWorkers = [];

        for (let i = 0; i < size; i++) {
            this._createWorker();
        }
    }

    _createWorker() {
        const worker = new Worker(this.workerScript);
        worker.on('message', (result) => {
            // El worker está libre, encolar la siguiente tarea si existe
            this.availableWorkers.push(worker);
            this._processQueue();
        });
        worker.on('error', (err) => {
            console.error(`[WORKER ERROR] ${err.message}`);
            // Reemplazar worker defectuoso
            this._replaceWorker(worker);
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`[WORKER EXIT] Código ${code}`);
                this._replaceWorker(worker);
            }
        });
        this.workers.push(worker);
        this.availableWorkers.push(worker);
    }

    _replaceWorker(oldWorker) {
        const index = this.workers.indexOf(oldWorker);
        if (index !== -1) {
            this.workers.splice(index, 1);
            // Eliminar de disponibles si estaba
            const availIndex = this.availableWorkers.indexOf(oldWorker);
            if (availIndex !== -1) this.availableWorkers.splice(availIndex, 1);
        }
        // Crear nuevo worker
        this._createWorker();
    }

    _processQueue() {
        if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) return;
        const worker = this.availableWorkers.shift();
        const { task, resolve, reject } = this.taskQueue.shift();
        worker.once('message', (result) => {
            resolve(result);
            // El worker se vuelve a poner disponible en el evento message,
            // pero ya lo hicimos antes, cuidado con duplicados.
            // Lo manejaremos así: el worker se marca disponible al recibir mensaje,
            // pero aquí también lo estamos poniendo. Para evitar duplicados,
            // no lo hacemos aquí, sino en el listener global.
        });
        worker.postMessage(task);
    }

    runTask(task) {
        return new Promise((resolve, reject) => {
            this.taskQueue.push({ task, resolve, reject });
            this._processQueue();
        });
    }

    close() {
        for (const worker of this.workers) {
            worker.terminate();
        }
    }
}

// Crear pool de workers (el script matrixWorker.js debe estar en el mismo directorio)
const workerPool = new WorkerPool(path.join(__dirname, 'matrixWorker.js'), MAX_WORKERS);

// --- SERVIDOR TCP ---
const tcpServer = net.createServer((socket) => {
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Sin_Nombre";
    clients.push(socket);
    console.log(`[TCP] Nueva conexión: ${socket.remoteID}`);

    // Variables para el enmarcado de mensajes
    let messageLength = null;
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        // Protección contra mensajes demasiado grandes
        if (buffer.length > MAX_MESSAGE_SIZE) {
            console.error(`[SECURITY] Buffer excede límite (${socket.remoteID})`);
            socket.destroy();
            return;
        }

        while (buffer.length >= 4) {
            if (messageLength === null) {
                messageLength = buffer.readUInt32BE(0);
                if (messageLength > MAX_MESSAGE_SIZE) {
                    console.error(`[SECURITY] Longitud de mensaje inválida (${messageLength}) de ${socket.remoteID}`);
                    socket.destroy();
                    return;
                }
                buffer = buffer.slice(4);
            }
            if (buffer.length >= messageLength) {
                const messageBuffer = buffer.slice(0, messageLength);
                buffer = buffer.slice(messageLength);
                try {
                    const req = JSON.parse(messageBuffer.toString());
                    processRequest(socket, req);
                } catch (e) {
                    console.error(`[PARSE ERROR] ${socket.remoteID}: ${e.message}`);
                    // Enviar error al cliente (opcional)
                    sendResponse(socket, { type: 'ERROR', message: 'Formato JSON inválido' });
                }
                messageLength = null; // Listo para el siguiente mensaje
            } else {
                break; // Esperar más datos
            }
        }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[DISCONNECTED] ${socket.fullID || socket.remoteID}`);
    });

    socket.on('error', (err) => {
        console.error(`[SOCKET ERROR] ${socket.remoteID}: ${err.message}`);
        // Eliminar de la lista si aún está
        clients = clients.filter(c => c !== socket);
    });
});

// Función para enviar respuestas con enmarcado
function sendResponse(socket, response) {
    const json = JSON.stringify(response);
    const buffer = Buffer.from(json, 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(buffer.length, 0);
    socket.write(Buffer.concat([header, buffer]));
}

// Procesamiento de solicitudes
async function processRequest(socket, req) {
    switch (req.type) {
        case 'LOGIN':
            socket.userName = req.payload ? req.payload.trim() : "Anónimo";
            socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
            console.log(`\x1b[32m[LOGIN]\x1b[0m Usuario: ${socket.fullID}`);
            break;

        case 'ORDENAR':
            if (!Array.isArray(req.payload) || req.payload.some(isNaN)) {
                sendResponse(socket, { type: 'RES_SORT', error: 'Datos inválidos' });
                return;
            }
            console.log(`[TCP] Ordenando ${req.payload.length} números de ${socket.userName}`);
            const sorted = req.payload.slice().sort((a, b) => a - b);
            sendResponse(socket, { type: 'RES_SORT', data: sorted });
            break;

        case 'MATRIZ':
            const { A, B } = req.payload;
            // Validación exhaustiva
            if (!Array.isArray(A) || !Array.isArray(B) || A.length === 0 || A.length !== B.length) {
                sendResponse(socket, { type: 'RES_MATRIX', error: 'Matrices no válidas o dimensiones incorrectas' });
                return;
            }
            const n = A.length;
            if (!A.every(row => Array.isArray(row) && row.length === n && row.every(Number.isFinite)) ||
                !B.every(row => Array.isArray(row) && row.length === n && row.every(Number.isFinite))) {
                sendResponse(socket, { type: 'RES_MATRIX', error: 'Las matrices deben ser NxN con números válidos' });
                return;
            }

            console.log(`[TCP] Solicitando multiplicación ${n}x${n} para ${socket.userName} (worker pool)`);
            try {
                const result = await workerPool.runTask({ A, B });
                sendResponse(socket, { type: 'RES_MATRIX', data: result });
                console.log(`[TCP] Matriz enviada a ${socket.userName}`);
            } catch (err) {
                console.error(`[WORKER POOL ERROR] ${err.message}`);
                sendResponse(socket, { type: 'RES_MATRIX', error: 'Error en el cálculo' });
            }
            break;

        case 'CHAT':
            if (!req.payload || typeof req.payload !== 'string') return;
            console.log(`[CHAT] Mensaje de ${socket.userName}`);
            broadcast(socket, req.payload);
            break;

        default:
            sendResponse(socket, { type: 'ERROR', message: 'Tipo de solicitud desconocido' });
    }
}

// Broadcast de mensajes de chat
function broadcast(sender, message) {
    const response = {
        type: 'CHAT_MSG',
        user: sender.fullID || sender.remoteID,
        msg: message
    };
    const json = JSON.stringify(response);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(Buffer.byteLength(json), 0);
    const packet = Buffer.concat([header, Buffer.from(json)]);

    clients.forEach(client => {
        if (client !== sender && client.writable) {
            client.write(packet);
        }
    });
}

// --- SERVIDOR UDP ---
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Trama de ${rinfo.address}:${rinfo.port}: ${msg.toString().trim()}`);
    const response = Buffer.from(`ACK_UDP: Recibido en Fedora a las ${new Date().toLocaleTimeString()}`);
    udpServer.send(response, rinfo.port, rinfo.address, (err) => {
        if (err) console.error(`[UDP SEND ERROR] ${err.message}`);
    });
});

udpServer.on('error', (err) => {
    console.error(`[UDP SERVER ERROR] ${err.message}`);
});

// --- CIERRE GRACEFUL ---
function shutdown() {
    console.log('\n🔻 Cerrando servidores...');
    tcpServer.close(() => console.log('Servidor TCP cerrado'));
    udpServer.close(() => console.log('Servidor UDP cerrado'));
    workerPool.close();
    clients.forEach(socket => socket.destroy());
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- INICIO DE SERVIDORES ---
tcpServer.listen(TCP_PORT, HOST, () => {
    console.log(`\x1b[35mServidor TCP en ${HOST}:${TCP_PORT}\x1b[0m`);
});

udpServer.bind(UDP_PORT, HOST, () => {
    console.log(`\x1b[35mServidor UDP en ${HOST}:${UDP_PORT}\x1b[0m`);
});
