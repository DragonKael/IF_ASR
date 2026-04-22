const { parentPort } = require('worker_threads');

// Función de multiplicación de matrices (igual que antes)
function multiplyMatrices(A, B) {
    const n = A.length;
    if (!Array.isArray(A) || !Array.isArray(B) || n === 0 || B.length !== n) {
        throw new Error('Dimensiones de matrices no coinciden');
    }
    for (let i = 0; i < n; i++) {
        if (!Array.isArray(A[i]) || A[i].length !== n || !Array.isArray(B[i]) || B[i].length !== n) {
            throw new Error('Fila inválida en matriz');
        }
    }

    const result = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += A[i][k] * B[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

// Escuchamos las tareas enviadas por el pool
parentPort.on('message', (task) => {
    try {
        const { A, B } = task; // task es el objeto { A, B } enviado desde el servidor
        const result = multiplyMatrices(A, B);
        parentPort.postMessage(result);
    } catch (err) {
        parentPort.postMessage({ error: err.message });
    }
});
