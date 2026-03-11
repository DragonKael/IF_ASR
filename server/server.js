const net = require('net');
const dgram = require('dgram');
const path = require('path');
const { Worker } = require('worker_threads');

const TCP_PORT = 3000;
const UDP_PORT = 3001;
const HOST = '0.0.0.0'; 

let clients = [];

const tcpServer = net.createServer((socket) => {
    socket.remoteID = `${socket.remoteAddress}:${socket.remotePort}`;
    socket.userName = "Anónimo";
    clients.push(socket);
    console.log(`[TCP] Conexión establecida: ${socket.remoteID}`);

    let buffer = "";

    socket.on('data', (data) => {
        buffer += data.toString();
        try {
            const req = JSON.parse(buffer);
            buffer = ""; 

            switch(req.type) {
                case 'LOGIN': 
                    socket.userName = req.payload.trim() || "Anónimo";
                    socket.fullID = `[${socket.userName}] (${socket.remoteID})`;
                    console.log(`\x1b[32m[LOGIN]\x1b[0m ${socket.fullID} se ha unido.`);
                    break;

                case 'ORDENAR': 
                    console.log(`[TCP] Ordenando datos para ${socket.userName}`);
                    const sorted = req.payload.sort((a, b) => a - b);
                    socket.write(JSON.stringify({ type: 'RES_SORT', data: sorted }));
                    break;

                case 'MATRIZ': 
                    console.log(`[TCP] Proceso multihilo (Worker) para matriz de ${socket.userName}`);
                    const workerPath = path.join(__dirname, 'matrixWorker.js');
                    const worker = new Worker(workerPath, { workerData: req.payload });
                    worker.on('message', (result) => {
                        socket.write(JSON.stringify({ type: 'RES_MATRIX', data: result }));
                    });
                    worker.on('error', (err) => console.error("Error en Worker:", err));
                    break;

                case 'CHAT': 
                    broadcast(socket, req.payload);
                    break;
            }
        } catch (e) { /* Esperando trama completa */ }
    });

    socket.on('close', () => {
        clients = clients.filter(c => c !== socket);
        console.log(`[TCP] Desconectado: ${socket.fullID || socket.remoteID}`);
    });
});

function broadcast(sender, message) {
    const payload = JSON.stringify({ 
        type: 'CHAT_MSG', 
        user: sender.fullID || sender.remoteID, 
        msg: message 
    });
    clients.forEach(client => {
        if (client !== sender) client.write(payload);
    });
}

const udpServer = dgram.createSocket('udp4');
udpServer.on('message', (msg, rinfo) => {
    console.log(`[UDP] Pulso recibido de ${rinfo.address}`);
    udpServer.send("ACK_UDP: Servidor Fedora en línea", rinfo.port, rinfo.address);
});

tcpServer.listen(TCP_PORT, HOST, () => {
    console.log(`\x1b[35m%s\x1b[0m`, `Servidor TCP/UDP listo en 172.16.0.11`);
});
udpServer.bind(UDP_PORT, HOST);

// Capturar el Ctrl + C (SIGINT)
process.on('SIGINT', () => {
    console.log('\n\x1b[31m%s\x1b[0m', '⚠️ Iniciando cierre ordenado del servidor...');

    // Avisar a todos los clientes TCP
    clients.forEach(client => {
        client.write(JSON.stringify({ 
            type: 'CHAT_MSG', 
            user: '[SERVIDOR]', 
            msg: 'El servidor se cerrará en 5 segundos. Guardando cambios...' 
        }));
        client.destroy(); // Cierra el socket de forma limpia
    });

    // Cerrar servidores
    tcpServer.close(() => {
        console.log('✅ Servidor TCP cerrado.');
        udpServer.close(() => {
            console.log('✅ Servidor UDP cerrado.');
            console.log('🚀 Desconexión completada. ¡Adiós!');
            process.exit(0);
        });
    });
});
