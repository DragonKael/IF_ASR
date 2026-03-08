/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC [cite: 1]
 * SERVIDOR CENTRAL: Fedora Server 43 (KDE Plasma) 
 * Implementación: TCP Multihilo y UDP [cite: 2, 11]
 */

const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

// Configuración de Red Clase B [cite: 17]
const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; 

let clients = []; // Lista de sockets activos

// --- 1. SERVIDOR TCP (Multicliente y Gestión de Tareas) [cite: 4, 11] ---
const tcpServer = net.createServer((socket) => {
    // Identificación inicial por IP/Puerto
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Sin_Nombre";
    clients.push(socket);
    console.log(`[TCP] Nueva conexión detectada: ${socket.remoteID}`);

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());

            switch(req.type) {
                case 'LOGIN': // Registro de usuario
                    socket.userName = req.payload.trim() || "Anónimo";
                    // Formato requerido: Nombre + IP + Puerto
                    socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
                    console.log(`\x1b[32m[LOGIN]\x1b[0m Usuario autenticado: ${socket.fullID}`);
                    break;

                case 'ORDENAR': // Requerimiento: Ordenar 10 números 
                    console.log(`[TCP] Ordenando datos para ${socket.userName}`);
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': // Requerimiento: Multiplicación NxN 
                    console.log(`[TCP] Iniciando proceso multihilo de matriz para ${socket.userName}`);
                    
                    // Asegurar la ruta absoluta del Worker para evitar MODULE_NOT_FOUND
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });

                    worker.on('message', (result) => {
                        // Enviar resultado al cliente y liberar el hilo
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                        console.log(`[TCP] Cálculo de matriz finalizado para ${socket.userName}`);
                    });

                    worker.on('error', (err) => {
                        console.error(`[ERROR WORKER]: ${err.message}`);
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: "Error en el cálculo" }));
                    });
                    break;

                case 'CHAT': // Requerimiento: Chat interactivo 
                    console.log(`[CHAT] Mensaje de ${socket.userName}`);
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) {
            console.error(`[ERROR TRAMA]: No se pudo procesar el JSON de ${socket.remoteID}`);
        }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[DISCONNECTED] Conexión cerrada para: ${socket.fullID || socket.remoteID}`);
    });

    socket.on('error', (err) => {
        console.error(`[SOCKET ERROR] ${socket.remoteID}: ${err.message}`);
    });
});

// Función de Broadcast para Chat Grupal
function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender) {
            client.write(JSON.stringify({ 
                type: 'CHAT_MSG', 
                user: sender.fullID, 
                msg: message 
            }));
        }
    });
}

// --- 2. SERVIDOR UDP (Pruebas de Pulso) [cite: 2, 12] ---
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Trama recibida de ${rinfo.address}:${rinfo.port}`);
    udpServer.send("ACK_UDP: Conexión verificada", rinfo.port, rinfo.address);
});

// Lanzamiento de Servicios
tcpServer.listen(TCP_PORT, HOST, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `Servidor TCP Activo en 172.16.0.11:${TCP_PORT}`);
});

udpServer.bind(UDP_PORT, HOST, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `Servidor UDP Activo en 172.16.0.11:${UDP_PORT}`);
});
