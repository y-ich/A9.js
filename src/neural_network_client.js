/* global */
import { WorkerRMI } from 'worker-rmi';

export class NeuralNetwork extends WorkerRMI {
    async evaluate(...inputs) {
        return await this.invokeRM('evaluate', inputs);
    }
}
