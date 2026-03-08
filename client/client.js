const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11'; // IP de tu servidor Fedora [cite: 17]
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '>> ' });
const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

let inChatMode = false;
let myName = "";

tcpClient.connect(3000, SERVER_IP, () => {
    console.clear();
    console.log('\x1b[32m%s\x1b[0m', '✅ CONECTADO AL SERVIDOR CENTRAL ASR');
    rl.question('👤 Ingrese su nombre de usuario: ', (name) => {
        myName = name;
        tcpClient.write(JSON.stringify({ type: 'LOGIN', payload: myName }));
        showMenu();
    });
});

tcpClient.on('data', (data) => {
    const res = JSON.parse(data.toString());
    if (res.type === 'CHAT_MSG') {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
        if (inChatMode) rl.prompt(true);
    } else {
        console.log(`\n\x1b[32m[RESPUESTA EN ${res.time}ms]:\x1b[0m`);
        console.table(res.data); // Muestra matrices y arreglos en formato profesional
        if (!inChatMode) showMenu();
    }
});

function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [${myName}] ---`);
    console.log('1. Ordenar arreglo (10 números)');
    console.log('2. Multiplicar Matrices NxN (Dinámico)');
    console.log('3. Chat Grupal (Broadcast)');
    console.log('4. Test de pulso UDP');
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
        handleMenu(input);
    }
});

function handleMenu(input) {
    switch (input) {
        case '1':
            rl.question('Ingrese 10 números separados por coma: ', (nums) => {
                tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: nums.split(',').map(Number) }));
            });
            break;
        case '2':
            rl.question('Tamaño N de la matriz cuadrada: ', (nStr) => {
                const N = parseInt(nStr);
                getMatrices(N, (A, B) => {
                    tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A, B } }));
                });
            });
            break;
        case '3':
            inChatMode = true;
            console.log('\x1b[35m%s\x1b[0m', '\n💬 CHAT GRUPAL ACTIVO (Escriba /salir para volver)');
            rl.prompt();
            break;
        case '4':
            udpClient.send(`Ping de ${myName}`, 3001, SERVER_IP, () => console.log('Paquete UDP enviado.'));
            break;
        case '5': process.exit(0);
    }
}

// Función para captura dinámica de matrices NxN [cite: 13]
function getMatrices(N, callback) {
    const fill = (name, row, matrix, cb) => {
        if (row === N) return cb(matrix);
        rl.question(`${name} - Fila ${row + 1} (${N} números): `, (val) => {
            matrix.push(val.split(',').map(Number));
            fill(name, row + 1, matrix, cb);
        });
    };
    fill('A', 0, [], (A) => fill('B', 0, [], (B) => callback(A, B)));
}
