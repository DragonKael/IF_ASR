/**
 * CLIENTE
 */

const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11';
const TCP_PORT = 3000;
const UDP_PORT = 3001;
const RECONNECT_DELAY = 3000;
const MATRIX_TIMEOUT = 30000; // 30 segundos

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>> \x1b[0m'
});

let tcpClient;
let udpClient = dgram.createSocket('udp4');
let inChatMode = false;
let myName = "";
let reconnectTimer = null;

// Variables para control de timeout de matriz
let waitingForMatrix = false;
let matrixTimeout = null;

// --- ENMARCADO TCP ---
let messageLength = null;
let buffer = Buffer.alloc(0);

function setupTcpClient() {
    tcpClient = new net.Socket();

    tcpClient.on('connect', () => {
        console.log('\x1b[32m✅ Conectado al servidor Fedora\x1b[0m');
        if (myName) {
            sendTcp({ type: 'LOGIN', payload: myName });
        } else {
            startLogin();
        }
        messageLength = null;
        buffer = Buffer.alloc(0);
    });

    tcpClient.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length >= 4) {
            if (messageLength === null) {
                messageLength = buffer.readUInt32BE(0);
                buffer = buffer.slice(4);
            }
            if (buffer.length >= messageLength) {
                const msgBuffer = buffer.slice(0, messageLength);
                buffer = buffer.slice(messageLength);
                try {
                    const res = JSON.parse(msgBuffer.toString());
                    handleResponse(res);
                } catch (e) {
                    console.log('\n\x1b[31m⚠️ Error al parsear respuesta del servidor\x1b[0m');
                }
                messageLength = null;
            } else {
                break;
            }
        }
    });

    tcpClient.on('close', () => {
        console.log('\x1b[31m❌ Conexión con servidor perdida\x1b[0m');
        scheduleReconnect();
    });

    tcpClient.on('error', (err) => {
        console.log(`\n\x1b[31mError TCP: ${err.message}\x1b[0m`);
        tcpClient.destroy();
    });

    tcpClient.connect(TCP_PORT, SERVER_IP);
}

function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        console.log('🔄 Intentando reconectar...');
        setupTcpClient();
    }, RECONNECT_DELAY);
}

function sendTcp(obj) {
    if (!tcpClient || tcpClient.destroyed) {
        console.log('\x1b[31mNo conectado al servidor\x1b[0m');
        return;
    }
    const json = JSON.stringify(obj);
    const buffer = Buffer.from(json, 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(buffer.length, 0);
    tcpClient.write(Buffer.concat([header, buffer]));
}

// --- MANEJO DE RESPUESTAS ---
function handleResponse(res) {
    // Si estábamos esperando matriz y llega respuesta de matriz, cancelamos timeout
    if (waitingForMatrix && res.type === 'RES_MATRIX') {
        clearTimeout(matrixTimeout);
        waitingForMatrix = false;
    }

    if (res.type === 'CHAT_MSG') {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 0);
        console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
        if (inChatMode) rl.prompt(true);
    } else if (res.type === 'ERROR') {
        console.log(`\n\x1b[31m⚠️ Error: ${res.message}\x1b[0m`);
        if (!inChatMode) showMenu();
    } else {
        console.log('\n\x1b[33m[RESPUESTA DEL SERVIDOR]:\x1b[0m');
        if (res.type === 'RES_MATRIX') {
            if (res.error) {
                console.log(`\x1b[31m${res.error}\x1b[0m`);
            } else {
                console.table(res.data);
            }
        } else if (res.type === 'RES_SORT') {
            if (res.error) console.log(`\x1b[31m${res.error}\x1b[0m`);
            else console.log('📊 Números ordenados:', res.data.join(', '));
        }
        if (!inChatMode) showMenu();
    }
}

// --- UDP ENTRANTE ---
udpClient.on('message', (msg, rinfo) => {
    console.log(`\n📡 [UDP desde ${rinfo.address}:${rinfo.port}]: ${msg.toString()}`);
    if (!inChatMode) rl.prompt();
});
udpClient.on('error', (err) => console.log(`\n❌ Error UDP: ${err.message}`));

// --- LOGIN ---
async function startLogin() {
    while (!myName) {
        const name = await question('👤 Introduce tu nombre para identificarte: ');
        if (name.trim()) {
            myName = name.trim();
            sendTcp({ type: 'LOGIN', payload: myName });
            showMenu();
        } else {
            console.log('\x1b[31m⚠️ El nombre no puede estar vacío.\x1b[0m');
        }
    }
}

function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [${myName}] ---`);
    console.log('1. Ordenar números');
    console.log('2. Multiplicar matrices NxN');
    console.log('3. Entrar al CHAT GRUPAL');
    console.log('4. Enviar pulso UDP');
    console.log('5. Salir');
    rl.prompt();
}

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

// --- TIMEOUT PARA MATRIZ ---
function startMatrixTimeout() {
    waitingForMatrix = true;
    matrixTimeout = setTimeout(() => {
        console.log('\n\x1b[31m⏰ Tiempo de espera agotado para la operación de matriz.\x1b[0m');
        waitingForMatrix = false;
        if (!inChatMode) showMenu();
    }, MATRIX_TIMEOUT);
}

// --- LÓGICA PRINCIPAL ---
rl.on('line', async (line) => {
    const input = line.trim();

    if (inChatMode) {
        if (input.toLowerCase() === '/salir') {
            showMenu();
        } else if (input) {
            sendTcp({ type: 'CHAT', payload: input });
        }
        rl.prompt();
        return;
    }

    switch (input) {
        case '1':
            const numsStr = await question('🔢 Ingresa números separados por coma: ');
            const nums = numsStr.split(',').map(Number).filter(n => !isNaN(n));
            if (nums.length === 0) {
                console.log('❌ No ingresaste números válidos.');
                showMenu();
            } else {
                sendTcp({ type: 'ORDENAR', payload: nums });
            }
            break;

        case '2': {
            const nSize = await question('🔢 Tamaño N de la matriz cuadrada: ');
            const N = parseInt(nSize);
            if (isNaN(N) || N <= 0) {
                console.log('❌ Tamaño no válido.');
                showMenu();
                return;
            }

            const readMatrix = async (label) => {
                console.log(`\nMatriz ${label}:`);
                const matrix = [];
                for (let i = 0; i < N; i++) {
                    const rowStr = await question(`Fila ${i + 1} (${N} números separados por coma): `);
                    const row = rowStr.split(',').map(Number);
                    if (row.length !== N || row.some(isNaN)) {
                        console.log(`⚠️ Error: Deben ser exactamente ${N} números. Reintenta.`);
                        i--;
                    } else {
                        matrix.push(row);
                    }
                }
                return matrix;
            };

            const A = await readMatrix('A');
            const B = await readMatrix('B');
            console.log('⏳ Enviando al servidor... (timeout 30s)');
            sendTcp({ type: 'MATRIZ', payload: { A, B } });
            startMatrixTimeout();
            break;
        }

        case '3':
            inChatMode = true;
            console.log('\x1b[35m💬 CHAT GRUPAL ACTIVO (Escribe /salir para volver)\x1b[0m');
            rl.prompt();
            break;

        case '4': {
            const message = await question('📝 Mensaje a enviar por UDP: ');
            udpClient.send(message, UDP_PORT, SERVER_IP, (err) => {
                if (err) console.log(`❌ Error enviando UDP: ${err.message}`);
                else console.log('📡 UDP enviado.');
                showMenu();
            });
            break;
        }

        case '5':
            console.log('👋 Hasta luego!');
            tcpClient.destroy();
            udpClient.close();
            process.exit(0);
            break;

        default:
            showMenu();
    }
});

setupTcpClient();

process.on('SIGINT', () => {
    console.log('\nCerrando cliente...');
    tcpClient.destroy();
    udpClient.close();
    process.exit(0);
});
