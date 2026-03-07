const { parentPort, workerData } = require('worker_threads');

function multiplyMatrices(A, B) {
    let N = A.length;
    let result = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            for (let k = 0; k < N; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
}

const result = multiplyMatrices(workerData.A, workerData.B);
parentPort.postMessage(result);
