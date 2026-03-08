const net = require('net');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');

const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces (NAT y Puente) 
const LOG_FILE = path.join(__dirname, 'network_logs.txt');

let clients = [];

// Función de Logging para evidencia en el informe 
function logger(msg) {
    const entry = `[${new Date().toLocaleString()}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(`\x1b[34m[LOG]\x1b[0m ${msg}`);
}

const tcpServer = net.createServer((socket) => {
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Anónimo";
    clients.push(socket);

    // Control de errores de Socket (Anti-ECONNRESET)
    socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            logger(`Conexión reseteada por: ${socket.userName} (${socket.remoteID})`);
        } else {
            logger(`Error en socket ${socket.userName}: ${err.message}`);
        }
        removeClient(socket);
    });

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());
            const start = Date.now(); // Inicio de métrica 
            
            switch(req.type) {
                case 'LOGIN':
                    socket.userName = req.payload;
                    socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
                    logger(`LOGIN exitoso: ${socket.fullID}`);
                    break;

                case 'ORDENAR':
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted, time: Date.now() - start }));
                    break;

                case 'MATRIZ':
                    logger(`Procesando matriz NxN para ${socket.userName}`);
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });
                    worker.on('message', (result) => {
                        if (socket.writable) {
                            socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result, time: Date.now() - start }));
                        }
                    });
                    break;

                case 'CHAT':
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) { logger(`Trama mal formada de ${socket.remoteID}`); }
    });

    socket.on('close', () => {
        logger(`Cierre de sesión: ${socket.userName || socket.remoteID}`);
        removeClient(socket);
    });
});

function removeClient(socket) {
    clients = clients.filter(c => c !== socket);
    if (!socket.destroyed) socket.destroy();
}

function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender && client.writable) {
            client.write(JSON.stringify({ 
                type: 'CHAT_MSG', 
                user: sender.fullID || sender.remoteID, 
                msg: message 
            }));
        }
    });
}

// Servidor UDP para demostración 
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    logger(`UDP Datagrama de ${rinfo.address}: ${msg}`);
    udpServer.send("ACK_UDP: Recibido en Fedora", rinfo.port, rinfo.address);
});

// Red de seguridad para errores críticos
process.on('uncaughtException', (err) => logger(`CRÍTICO NO CAPTURADO: ${err.message}`));

tcpServer.listen(TCP_PORT, HOST, () => logger(`Servidor TCP activo en puerto ${TCP_PORT}`));
udpServer.bind(UDP_PORT, HOST);
