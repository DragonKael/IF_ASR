/**
 * PROYECTO DE INVESTIGACIÓN FORMATIVA - UAC [cite: 1]
 * CLIENTE UNIVERSAL (Windows, Mint, Ubuntu, ArchLinux) [cite: 4]
 * Implementación: Node.js - Protocolos TCP y UDP [cite: 2]
 */

const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

// Parámetros de Red Clase B [cite: 17]
const SERVER_IP = '172.16.0.11'; // IP configurada del servidor Fedora
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

// --- CONEXIÓN Y LOGIN ---
tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('\x1b[32m%s\x1b[0m', `✅ Conectado al servidor Fedora (${SERVER_IP})`);
    loginProcess();
});

function loginProcess() {
    rl.question('👤 Introduce tu nombre para identificarte: ', (name) => {
        if (!name.trim()) {
            console.log('\x1b[31m%s\x1b[0m', '⚠️ Error: El nombre es obligatorio para el registro del servidor.');
            return loginProcess();
        }
        myName = name.trim();
        tcpClient.write(JSON.stringify({ type: 'LOGIN', payload: myName }));
        showMenu();
    });
}

// --- MANEJO DE RESPUESTAS DEL SERVIDOR ---
tcpClient.on('data', (data) => {
    try {
        const res = JSON.parse(data.toString());

        if (res.type === 'CHAT_MSG') {
            // Limpieza de línea para evitar superposición con el prompt
            readline.cursorTo(process.stdout, 0);
            readline.clearLine(process.stdout, 0);
            console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
            if (inChatMode) rl.prompt(true);
        } 
        else if (res.type === 'RES_MATRIX') {
            console.log('\n\x1b[33m[RESULTADO MULTIPLICACIÓN NxN]:\x1b[0m');
            console.table(res.data); // Muestra la matriz cuadrada de forma estética 
            if (!inChatMode) showMenu();
        } 
        else if (res.type === 'RES_SORT') {
            console.log('\n\x1b[33m[RESULTADO ORDENAMIENTO]:\x1b[0m', res.data);
            if (!inChatMode) showMenu();
        }
    } catch (e) {
        // Manejo de fragmentación de buffer en tramas grandes
    }
});

// --- MENÚ PRINCIPAL EN CONSOLA  ---
function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [Usuario: ${myName}] ---`);
    console.log('1. Ordenar 10 números (TCP)');
    console.log('2. Multiplicación de Matrices NxN (TCP)');
    console.log('3. ENTRAR AL CHAT GRUPAL (TCP)');
    console.log('4. Prueba de pulso UDP (UDP)');
    console.log('5. Salir');
    rl.prompt();
}

// --- LÓGICA DE INTERACCIÓN CONTINUA ---
rl.on('line', (line) => {
    const input = line.trim();

    if (inChatMode) {
        if (input.toLowerCase() === '/salir') return showMenu();
        if (input) tcpClient.write(JSON.stringify({ type: 'CHAT', payload: input }));
        rl.prompt();
        return;
    }

    switch (input) {
        case '1': // Ordenar 10 números 
            rl.question('🔢 Ingrese 10 números separados por coma: ', (nStr) => {
                const nums = nStr.split(',').map(Number);
                if (nums.length !== 10 || nums.some(isNaN)) {
                    console.log('⚠️ Error: Debe ingresar exactamente 10 números válidos.');
                    return showMenu();
                }
                tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: nums }));
            });
            break;

        case '2': // Matrices NxN Dinámicas 
            rl.question('🔢 Ingrese el tamaño N de las matrices: ', (nStr) => {
                const N = parseInt(nStr);
                if (isNaN(N) || N <= 0) return showMenu();

                const readMatrix = (name, row, matrix, callback) => {
                    if (row === N) return callback(matrix);
                    rl.question(`Matriz ${name} - Fila ${row + 1} (${N} valores sep. por coma): `, (vals) => {
                        const rowData = vals.split(',').map(Number);
                        if (rowData.length !== N || rowData.some(isNaN)) return readMatrix(name, row, matrix, callback);
                        matrix.push(rowData);
                        readMatrix(name, row + 1, matrix, callback);
                    });
                };

                readMatrix('A', 0, [], (mA) => {
                    readMatrix('B', 0, [], (mB) => {
                        tcpClient.write(JSON.stringify({ type: 'MATRIZ', payload: { A: mA, B: mB } }));
                    });
                });
            });
            break;

        case '3': // Chat Grupal Continuo 
            inChatMode = true;
            console.log('\x1b[35m%s\x1b[0m', '\n💬 MODO CHAT GRUPAL ACTIVO');
            console.log('(Escribe tus mensajes. Escribe "/salir" para volver al menú)');
            rl.prompt();
            break;

        case '4': // Protocolo UDP [cite: 2, 4]
            const udpMsg = Buffer.from(`Pulso UDP de ${myName}`);
            udpClient.send(udpMsg, UDP_PORT, SERVER_IP, () => {
                console.log('📡 Trama UDP enviada para verificación en Wireshark.');
                showMenu();
            });
            break;

        case '5':
            console.log('Cerrando conexión...');
            process.exit(0);
            break;

        default:
            showMenu();
            break;
    }
});

tcpClient.on('error', (err) => console.log(`❌ Error de conexión: ${err.message}`));
