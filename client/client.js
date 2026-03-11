const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11';
const TCP_PORT = 3000;
const UDP_PORT = 3001;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

let inChatMode = false;
let myName = "";

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('\x1b[32m%s\x1b[0m', `✅ Conectado al servidor Fedora (${SERVER_IP})`);
    startLogin();
});

async function startLogin() {
    while (!myName) {
        const name = await question('👤 Ingrese su nombre para el registro: ');
        if (name.trim()) {
            myName = name.trim();
            tcpClient.write(JSON.stringify({ type: 'LOGIN', payload: myName }));
            showMenu();
        } else {
            console.log('\x1b[31m⚠️ El nombre es obligatorio.\x1b[0m');
        }
    }
}

// --- ESCUCHAR RESPUESTAS (TCP y UDP) ---
tcpClient.on('data', (data) => {
    try {
        const res = JSON.parse(data.toString());
        if (res.type === 'CHAT_MSG') {
            // MEJORA: Solo mostrar si el usuario está en modo chat
            if (inChatMode) {
                readline.cursorTo(process.stdout, 0);
                readline.clearLine(process.stdout, 0);
                console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
                rl.prompt(true);
            }
        } else {
            console.log('\n\x1b[33m[SISTEMA]:\x1b[0m');
            if (res.type === 'RES_MATRIX') console.table(res.data);
            else console.log(res.data);
            if (!inChatMode) showMenu();
        }
    } catch (e) { }
});

udpClient.on('message', (msg) => {
    console.log(`\n\x1b[35m[RESPUESTA UDP]:\x1b[0m ${msg}`);
    if (!inChatMode) showMenu();
});

function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [${myName}] ---`);
    console.log('1. Ordenar números');
    console.log('2. Multiplicación de Matrices NxN');
    console.log('3. CHAT GRUPAL');
    console.log('4. Prueba de pulso UDP');
    console.log('5. Salir');
    rl.setPrompt('Elija una opción > '); // Nuevo prompt
    rl.prompt();
}

rl.on('line', async (line) => {
    const input = line.trim();

    if (inChatMode) {
        if (input.toLowerCase() === '/salir') {
            showMenu();
        } else if (input) {
            tcpClient.write(JSON.stringify({ type: 'CHAT', payload: input }));
            rl.prompt();
        }
        return;
    }

    switch (input) {
        case '1':
            const numsStr = await question('🔢 Ingrese números (sep. por coma): ');
            const nums = numsStr.split(',').map(Number).filter(n => !isNaN(n));
            tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: nums }));
            break;

        case '2':
            const nSize = await question('🔢 Tamaño N de la matriz: ');
            const N = parseInt(nSize);
            if (isNaN(N) || N <= 0) return showMenu();

            const readM = async (label) => {
                let m = [];
                for (let i = 0; i < N; i++) {
                    const r = await question(`M${label} - Fila ${i + 1} (${N} valores): `);
                    const row = r.split(',').map(Number);
                    if (row.length !== N || row.some(isNaN)) { i--; continue; }
                    m.push(row);
                }
                return m;
            };

            const A = await readM('A');
            const B = await readM('B');
            tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A, B } }));
            break;

        case '3':
            inChatMode = true;
            console.log('\x1b[35m\n💬 MODO CHAT ACTIVADO (Escribe /salir para volver)\x1b[0m');
            rl.setPrompt('Escribe un mensaje > '); // Prompt de chat
            rl.prompt();
            break;

        case '4':
            udpClient.send(`Pulso de ${myName}`, UDP_PORT, SERVER_IP, () => {
                console.log('📡 Trama UDP enviada...');
            });
            break;

        case '5': process.exit(0);
        default: if (!inChatMode) showMenu();
    }
});
