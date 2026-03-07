/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC
 * IMPLEMENTACIÓN DE PROTOCOLO TCP (MULTIHILO) Y UDP [cite: 1, 2, 4]
 * Servidor: Fedora Server 43 (KDE Plasma) [cite: 4]
 */

const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

// Parámetros de Red Clase B [cite: 17]
const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces (NAT y Puente)

let clients = []; // Control de clientes para el Chat [cite: 13]

// --- 1. SERVIDOR TCP (MULTICLIENTE / MULTIHILO) [cite: 4, 11] ---
const tcpServer = net.createServer((socket) => {
    // Identificación única del cliente para la demostración
    socket.name = `${socket.remoteAddress}:${socket.remotePort}`;
    clients.push(socket);
    console.log(`[TCP] Cliente conectado: ${socket.name}`);

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());

            switch (req.type) {
                case 'ORDENAR': 
                    // Requerimiento: Ordenar arreglo de 10 números enteros [cite: 13]
                    console.log(`[TCP] Ordenando datos para ${socket.name}`);
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': 
                    // Requerimiento: Multiplicación de matrices NxN (Proceso pesado) [cite: 13]
                    // Se utiliza Worker Threads para cumplir el requisito de "Multihilo" [cite: 11]
                    console.log(`[TCP] Iniciando cálculo de matriz para ${socket.name}`);
                    
                    // SOLUCIÓN DE RUTA: Uso de path.join para evitar MODULE_NOT_FOUND
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });

                    worker.on('message', (result) => {
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                        console.log(`[TCP] Resultado de matriz enviado a ${socket.name}`);
                    });

                    worker.on('error', (err) => {
                        console.error(`[WORKER ERROR]: ${err.message}`);
                    });
                    break;

                case 'CHAT': 
                    // Requerimiento: Interacción continua - Chat [cite: 13]
                    console.log(`[CHAT] Mensaje recibido de ${socket.name}`);
                    broadcast(socket, req.payload);
                    break;
                
                default:
                    console.log(`[TCP] Tipo de petición desconocido: ${req.type}`);
            }
        } catch (e) {
            console.error(`[TCP ERROR] Error procesando trama de ${socket.name}: ${e.message}`);
        }
    });

    socket.on('error', (err) => {
        console.error(`[TCP SOCKET ERROR] ${socket.name}: ${err.message}`);
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[TCP] Cliente desconectado: ${socket.name}`);
    });
});

// Función de retransmisión para el Chat [cite: 13]
function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender) {
            client.write(JSON.stringify({ 
                type: 'CHAT_MSG', 
                user: sender.name, 
                msg: message 
            }));
        }
    });
}

// --- 2. SERVIDOR UDP (DEMOSTRACIÓN DE FUNCIONAMIENTO) [cite: 2, 4] ---
const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Datagrama de ${rinfo.address}:${rinfo.port} -> ${msg}`);
    // Respuesta rápida por UDP para validación en Wireshark [cite: 19]
    const response = Buffer.from(`ACK_UDP: Servidor Fedora recibió tu mensaje`);
    udpServer.send(response, rinfo.port, rinfo.address);
});

udpServer.on('error', (err) => {
    console.error(`[UDP SERVER ERROR]: ${err.stack}`);
});

// --- INICIO DE SERVICIOS ---
tcpServer.listen(TCP_PORT, HOST, () => {
    console.log(`Servidor TCP escuchando en ${HOST}:${TCP_PORT}`);
});

udpServer.bind(UDP_PORT, HOST, () => {
    console.log(`Servidor UDP escuchando en ${HOST}:${UDP_PORT}`);
});
