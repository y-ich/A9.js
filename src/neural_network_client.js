/* global */
import { WorkerRMI } from 'worker-rmi';
import { LEELA_ZERO } from './constants.js';
import { softmax } from './utils.js';

export class NeuralNetwork extends WorkerRMI {
    async evaluate(...inputs) {
        const result = await this.invokeRM('evaluate', inputs);
        if (LEELA_ZERO) {
            result[0] = softmax(result[0]);
        }
        return result;
    }
}
