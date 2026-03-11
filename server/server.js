/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC
 * SERVIDOR CENTRAL: Fedora Server 43 (KDE Plasma) 
 * Implementación: TCP Multihilo (Worker Threads) y UDP
 */

const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

// Configuración de Red Clase B
const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; 

let clients = []; // Lista de sockets activos

// --- 1. SERVIDOR TCP (Multicliente y Gestión de Tareas) ---
const tcpServer = net.createServer((socket) => {
    // Identificación inicial
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Sin_Nombre";
    clients.push(socket);
    console.log(`[TCP] Nueva conexión detectada: ${socket.remoteID}`);

    // Buffer para manejar tramas grandes (evita que el JSON se corte)
    let buffer = "";

    socket.on('data', (data) => {
        buffer += data.toString();
        
        // Intentamos procesar si la trama está completa
        try {
            const req = JSON.parse(buffer);
            buffer = ""; // Limpiamos el buffer tras un parse exitoso

            switch(req.type) {
                case 'LOGIN': 
                    socket.userName = req.payload.trim() || "Anónimo";
                    socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
                    console.log(`\x1b[32m[LOGIN]\x1b[0m Usuario autenticado: ${socket.fullID}`);
                    break;

                case 'ORDENAR': 
                    // CORRECCIÓN: Ordena cualquier cantidad de números (dinámico)
                    console.log(`[TCP] Ordenando ${req.payload.length} números para ${socket.userName}`);
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': 
                    // CORRECCIÓN: Manejo de hilos para matrices NxN
                    console.log(`[TCP] Hilo Worker iniciado para matriz de ${socket.userName}`);
                    
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });

                    worker.on('message', (result) => {
                        // Enviamos el resultado y liberamos el hilo principal
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                        console.log(`[TCP] Matriz enviada a ${socket.userName}`);
                    });

                    worker.on('error', (err) => {
                        console.error(`[WORKER ERROR]: ${err.message}`);
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: null, error: "Fallo en el cálculo" }));
                    });
                    break;

                case 'CHAT': 
                    console.log(`[CHAT] Mensaje de ${socket.userName}`);
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) {
            // Si el JSON está incompleto (fragmentado), esperamos al siguiente evento 'data'
            // No limpiamos el buffer aquí.
        }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[DISCONNECTED] ${socket.fullID || socket.remoteID}`);
    });

    socket.on('error', (err) => {
        console.error(`[SOCKET ERROR] ${socket.remoteID}: ${err.message}`);
    });
});

// Función de Broadcast para Chat Grupal
function broadcast(sender, message) {
    const payload = JSON.stringify({ 
        type: 'CHAT_MSG', 
        user: sender.fullID || sender.remoteID, 
        msg: message 
    });

    clients.forEach(client => {
        if (client !== sender) {
            client.write(payload);
        }
    });
}

// --- 2. SERVIDOR UDP (Pruebas de Pulso) ---
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Trama recibida de ${rinfo.address}:${rinfo.port}`);
    udpServer.send("ACK_UDP: Recibido en Fedora", rinfo.port, rinfo.address);
});

// Lanzamiento de Servicios
tcpServer.listen(TCP_PORT, HOST, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `Servidor TCP Activo en 172.16.0.11:${TCP_PORT}`);
});

udpServer.bind(UDP_PORT, HOST, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `Servidor UDP Activo en 172.16.0.11:${UDP_PORT}`);
});
