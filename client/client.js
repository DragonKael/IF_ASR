const net = require('net');
const dgram = require('dgram');
const readline = require('readline');

const SERVER_IP = '172.16.0.11';
const TCP_PORT = 3000;
const UDP_PORT = 3001;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '>> ' });
const tcpClient = new net.Socket();
const udpClient = dgram.createSocket('udp4');

let inChatMode = false;
let myName = "";

tcpClient.connect(TCP_PORT, SERVER_IP, () => {
    console.log('\x1b[32m%s\x1b[0m', '🌐 Conectado al servidor Fedora');
    
    // FASE DE LOGIN BÁSICO
    rl.question('👤 Introduce tu nombre para identificarte: ', (name) => {
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
        // Aquí se muestra el Nombre + IP + Puerto del emisor
        console.log(`\x1b[36m${res.user}\x1b[0m: ${res.msg}`);
        if (inChatMode) rl.prompt(true);
    } else {
        console.log('\n\x1b[33m[SISTEMA]:\x1b[0m', JSON.stringify(res.data));
        if (!inChatMode) showMenu();
    }
});

function showMenu() {
    inChatMode = false;
    console.log(`\n--- 📋 MENÚ PRINCIPAL [Usuario: ${myName}] ---`);
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
                rl.question('Números (ej. 4,1,8...): ', (n) => {
                    tcpClient.write(JSON.stringify({ type: 'ORDENAR', payload: n.split(',').map(Number) }));
                });
                break;
            case '2': // Multiplicación de Matrices NxN 
            rl.question('🔢 Ingrese el tamaño N de las matrices cuadradas: ', (nStr) => {
                const N = parseInt(nStr);
                if (isNaN(N) || N <= 0) {
                    console.log('❌ Error: N debe ser un número entero positivo.');
                    return showMenu();
                }

                console.log(`\n--- Configurando Matrices ${N}x${N} ---`);
                
                // Función recursiva para capturar filas de una matriz
                const readMatrix = (name, row, matrix, callback) => {
                    if (row === N) return callback(matrix);
                    
                    rl.question(`Matriz ${name} - Ingrese los ${N} valores de la fila ${row + 1} (separados por coma): `, (input) => {
                        const vals = input.split(',').map(Number);
                        if (vals.length !== N || vals.some(isNaN)) {
                            console.log(`⚠️ Error: Debe ingresar exactamente ${N} números.`);
                            return readMatrix(name, row, matrix, callback);
                        }
                        matrix.push(vals);
                        readMatrix(name, row + 1, matrix, callback);
                    });
                };

                // Capturar Matriz A, luego B, y enviar
                readMatrix('A', 0, [], (matrixA) => {
                    readMatrix('B', 0, [], (matrixB) => {
                        console.log('🚀 Enviando matrices al servidor Fedora...');
                        tcpClient.write(JSON.stringify({ 
                            type: 'MATRIZ', 
                            payload: { A: matrixA, B: matrixB } 
                        }));
                        // El resultado llegará por el evento 'data' del socket
                    });
                });
            });
            break;
            case '3':
                inChatMode = true;
                console.log('\x1b[35m%s\x1b[0m', '\n💬 CHAT GRUPAL ACTIVO (Escribe /salir para volver)');
                rl.prompt();
                break;
            case '4':
                udpClient.send(`Test de ${myName}`, UDP_PORT, SERVER_IP, () => console.log('UDP enviado.'));
                break;
            case '5': process.exit(0);
        }
    }
});
