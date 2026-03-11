/**
 * Worker para multiplicación de matrices.
 * Recibe { A, B } y devuelve el resultado.
 * Incluye validación adicional por seguridad.
 */

const { parentPort, workerData } = require('worker_threads');

function multiplyMatrices(A, B) {
    const n = A.length;
    // Verificar que ambas sean cuadradas y del mismo tamaño
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

try {
    const { A, B } = workerData;
    const result = multiplyMatrices(A, B);
    parentPort.postMessage(result);
} catch (err) {
    parentPort.postMessage({ error: err.message });
}
