/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC
 * CLIENTE MULTIPLATAFORMA (Node.js)
 * Funcionalidad: Ordenamiento Dinámico, Matrices NxN y Chat Grupal
 */

const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

// Configuración de Red
const SERVER_IP = '172.16.0.11';
const TCP_PORT = 3000;
const UDP_PORT = 3001;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>> \x1b[0m'
});

const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

let inChatMode = false;
let myName = "";

// --- UTILIDAD PARA INPUT ASÍNCRONO ---
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// --- CONEXIÓN INICIAL ---
tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('\x1b[32m%s\x1b[0m', `✅ Conectado al servidor Fedora (${SERVER_IP})`);
    startLogin();
});

async function startLogin() {
    while (!myName) {
        const name = await question('👤 Introduce tu nombre para identificarte: ');
        if (name.trim()) {
            myName = name.trim();
            tcpClient.write(JSON.stringify({ type: 'LOGIN', payload: myName }));
            showMenu();
        } else {
            console.log('\x1b[31m⚠️ El nombre no puede estar vacío.\x1b[0m');
        }
    }
}

// --- MANEJO DE RESPUESTAS ---
tcpClient.on('data', (data) => {
    try {
        const res = JSON.parse(data.toString());

        if (res.type === 'CHAT_MSG') {
            readline.cursorTo(process.stdout, 0);
            readline.clearLine(process.stdout, 0);
            console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
            if (inChatMode) rl.prompt(true);
        } else {
            console.log('\n\x1b[33m[RESPUESTA DEL SERVIDOR]:\x1b[0m');
            if (res.type === 'RES_MATRIX') {
                console.table(res.data);
            } else {
                console.log(res.data);
            }
            if (!inChatMode) showMenu();
        }
    } catch (e) {
        // Manejo de tramas parciales si fuera necesario
    }
});

function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [${myName}] ---`);
    console.log('1. Ordenar números (cantidad libre)');
    console.log('2. Multiplicación de Matrices NxN (Dinámico)');
    console.log('3. Entrar al CHAT GRUPAL');
    console.log('4. Prueba de pulso UDP');
    console.log('5. Salir');
    rl.prompt();
}

// --- LÓGICA DE INTERACCIÓN ---
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
            const numsStr = await question('🔢 Ingresa los números separados por coma: ');
            const nums = numsStr.split(',').map(Number).filter(n => !isNaN(n));
            tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: nums }));
            break;

        case '2':
            const nSize = await question('🔢 Tamaño N de la matriz cuadrada: ');
            const N = parseInt(nSize);
            if (isNaN(N) || N <= 0) {
                console.log('❌ Tamaño no válido.');
                return showMenu();
            }

            const readMatrix = async (label) => {
                let matrix = [];
                console.log(`\nConfigurando Matriz ${label}:`);
                for (let i = 0; i < N; i++) {
                    const rowStr = await question(`Fila ${i + 1} (${N} números sep. por coma): `);
                    const row = rowStr.split(',').map(Number);
                    if (row.length !== N || row.some(isNaN)) {
                        console.log(`⚠️ Error: Ingresa exactamente ${N} números.`);
                        i--; // Reintento de fila
                    } else {
                        matrix.push(row);
                    }
                }
                return matrix;
            };

            const A = await readMatrix('A');
            const B = await readMatrix('B');

            console.log('⏳ Enviando al servidor Fedora para proceso multihilo...');
            tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A, B } }));
            break;

        case '3':
            inChatMode = true;
            console.log('\x1b[35m%s\x1b[0m', '\n💬 CHAT GRUPAL ACTIVO (Escribe /salir para volver)');
            rl.prompt();
            break;

        case '4':
            udpClient.send(`Pulso de ${myName}`, UDP_PORT, SERVER_IP, () => {
                console.log('📡 Trama UDP enviada.');
                showMenu();
            });
            break;

        case '5':
            console.log('Cerrando...');
            process.exit(0);
            break;

        default:
            if (!inChatMode) showMenu();
            break;
    }
});

tcpClient.on('error', (err) => console.log(`❌ Error: ${err.message}`));
