const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11'; // IP del servidor (Fedora)
const TCP_PORT = 3000;
const UDP_PORT = 3001;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

// Conexión TCP inicial
tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('Conectado al servidor Fedora via TCP.');
    showMenu();
});

// Escucha de respuestas TCP (Resultados y Chat)
tcpClient.on('data', (data) => {
    const res = JSON.parse(data.toString());
    if (res.type === 'CHAT_MSG') {
        console.log(`\n[CHAT] ${res.user}: ${res.msg}`);
    } else {
        console.log('\n[RESULTADO]:', JSON.stringify(res.data, null, 2));
    }
    showMenu();
});

function showMenu() {
    console.log('\n--- MENÚ DE CONTROL DE REDES ---');
    console.log('1. Ordenar 10 números (TCP)');
    console.log('2. Multiplicación de Matrices NxN (TCP)');
    console.log('3. Enviar mensaje de Chat (TCP)');
    console.log('4. Prueba de pulso UDP (UDP)');
    console.log('5. Salir');
    rl.question('Seleccione una opción: ', (opt) => {
        switch (opt) {
            case '1':
                rl.question('Ingrese 10 números separados por coma: ', (input) => {
                    const nums = input.split(',').map(Number);
                    tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: nums }));
                });
                break;
            case '2':
                // Ejemplo simple de matriz 2x2 para demo
                const A = [[1, 2], [3, 4]], B = [[5, 6], [7, 8]];
                tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A, B } }));
                break;
            case '3':
                rl.question('Mensaje: ', (msg) => {
                    tcpClient.write(JSON.stringify({ type: 'CHAT', payload: msg }));
                    showMenu();
                });
                break;
            case '4':
                const msgUDP = Buffer.from('Prueba UDP desde cliente');
                udpClient.send(msgUDP, UDP_PORT, SERVER_IP, () => {
                    console.log('Trama UDP enviada.');
                    showMenu();
                });
                break;
            case '5':
                process.exit();
            default:
                showMenu();
        }
    });
}
