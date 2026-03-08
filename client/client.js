const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11'; // IP Actualizada del servidor Fedora
const TCP_PORT = 3000;
const UDP_PORT = 3001;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '>> ' });
const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

let inChatMode = false;

tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('\x1b[32m%s\x1b[0m', 'Conectado al servidor (172.16.0.11)');
    showMenu();
});

tcpClient.on('data', (data) => {
    const res = JSON.parse(data.toString());
    if (res.type === 'CHAT_MSG') {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        console.log(`\x1b[36m[${res.user}]\x1b[0m: ${res.msg}`);
        if (inChatMode) rl.prompt(true);
    } else {
        console.log('\n\x1b[33m[RESULTADO]:\x1b[0m', JSON.stringify(res.data));
        if (!inChatMode) showMenu();
    }
});

function showMenu() {
    inChatMode = false;
    console.log('\n--- 📋 MENÚ (TCP/UDP) ---');
    console.log('1. Ordenar 10 números');
    console.log('2. Multiplicar Matrices NxN');
    console.log('3. ENTRAR AL CHAT GRUPAL');
    console.log('4. Prueba UDP');
    console.log('5. Salir');
    rl.prompt();
}

rl.on('line', (line) => {
    const input = line.trim();
    if (inChatMode) {
        if (input.toLowerCase() === '/salir') return showMenu();
        tcpClient.write(JSON.stringify({ type: 'CHAT', payload: input }));
        rl.prompt();
    } else {
        switch (input) {
            case '1':
                rl.question('Números (ej. 1,9,3...): ', (n) => {
                    tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: n.split(',').map(Number) }));
                });
                break;
            case '2':
                const A = [[1,1],[1,1]], B = [[2,2],[2,2]]; // Ejemplo 2x2
                tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A, B } }));
                break;
            case '3':
                inChatMode = true;
                console.log('\x1b[35m%s\x1b[0m', '\nMODO CHAT ACTIVO (Escribe /salir para volver)');
                rl.prompt();
                break;
            case '4':
                udpClient.send("Test UDP", UDP_PORT, SERVER_IP, () => console.log('Enviado.'));
                break;
            case '5': process.exit(0);
        }
    }
});
