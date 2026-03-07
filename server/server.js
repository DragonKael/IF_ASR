const net = require('net');
const dgram = require('dgram');
const { Worker } = require('worker_threads');

const TCP_PORT = 3000;
const UDP_PORT = 3001;
let clients = []; // Para el chat

// 1. SERVIDOR TCP (Multicliente/Multihilo) [cite: 4, 11]
const tcpServer = net.createServer((socket) => {
    socket.name = `${socket.remoteAddress}:${socket.remotePort}`;
    clients.push(socket);
    console.log(`[TCP] Conectado: ${socket.name}`);

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());

            switch(req.type) {
                case 'ORDENAR': // Ordenar 10 números
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': // Multiplicación NxN
                    // Se lanza un hilo aparte para no bloquear el servidor
                    const worker = new Worker('./matrixWorker.js', { workerData: req.payload });
                    worker.on('message', (result) => {
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                    });
                    break;

                case 'CHAT': // Chat interactivo
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) { console.error("Error en trama recibida"); }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[TCP] Desconectado: ${socket.name}`);
    });
});

// Función para el Chat
function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender) {
            client.write(JSON.stringify({ type: 'CHAT_MSG', user: sender.name, msg: message }));
        }
    });
}

// 2. SERVIDOR UDP
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Mensaje de ${rinfo.address}: ${msg}`);
    udpServer.send("ACK_UDP: Recibido", rinfo.port, rinfo.address);
});

tcpServer.listen(TCP_PORT, '0.0.0.0', () => console.log(`Servidor TCP en puerto ${TCP_PORT}`));
udpServer.bind(UDP_PORT);
