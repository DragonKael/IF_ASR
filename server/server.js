const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; // Escucha en todas las interfaces

let clients = [];

// --- SERVIDOR TCP (Multicliente/Multihilo)  ---
const tcpServer = net.createServer((socket) => {
    socket.name = `${socket.remoteAddress}:${socket.remotePort}`;
    clients.push(socket);
    console.log(`[TCP] Cliente conectado: ${socket.name}`);

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());
            
            switch(req.type) {
                case 'ORDENAR': // Ordenar 10 números [cite: 13]
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': // Multiplicación NxN [cite: 13]
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });
                    worker.on('message', (result) => {
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                    });
                    break;

                case 'CHAT': // Chat Grupal [cite: 13]
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

function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender) {
            client.write(JSON.stringify({ type: 'CHAT_MSG', user: sender.name, msg: message }));
        }
    });
}

// --- SERVIDOR UDP ---
const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Trama de ${rinfo.address}: ${msg}`);
    udpServer.send("ACK_UDP: Recibido", rinfo.port, rinfo.address);
});

tcpServer.listen(TCP_PORT, HOST, () => console.log(`Servidor TCP en puerto ${TCP_PORT}`));
udpServer.bind(UDP_PORT, HOST);
