const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0';

let clients = [];

const tcpServer = net.createServer((socket) => {
    // Identificación temporal por IP/Puerto hasta que haga Login
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Anónimo"; 
    clients.push(socket);

    socket.on('data', (data) => {
        try {
            const req = JSON.parse(data.toString());
            
            switch(req.type) {
                case 'LOGIN':
                    socket.userName = req.payload;
                    // Formato solicitado: Nombre + IP + Puerto
                    socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
                    console.log(`\x1b[32m[LOGIN]\x1b[0m Usuario identificado: ${socket.fullID}`);
                    break;

                case 'ORDENAR':
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ':
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });
                    worker.on('message', (result) => {
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                    });
                    break;

                case 'CHAT':
                    // Se usa el fullID para que todos sepan quién habla
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) { console.error("Error en trama"); }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[DESCONECTADO] ${socket.fullID || socket.remoteID}`);
    });
});

function broadcast(sender, message) {
    clients.forEach(client => {
        if (client !== sender) {
            client.write(JSON.stringify({ 
                type: 'CHAT_MSG', 
                user: sender.fullID, // Enviamos la identificación completa
                msg: message 
            }));
        }
    });
}

const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Trama de ${rinfo.address}: ${msg}`);
    udpServer.send("ACK_UDP: Recibido", rinfo.port, rinfo.address);
});

tcpServer.listen(TCP_PORT, HOST, () => console.log(`Servidor TCP en puerto ${TCP_PORT} (IP: 172.16.0.11)`));
udpServer.bind(UDP_PORT, HOST);
