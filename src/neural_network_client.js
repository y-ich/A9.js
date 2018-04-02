/* global WorkerProcedureCall */


export class NeuralNetwork {
    constructor() {
        this.receiver = new WorkerProcedureCall(self, this.constructor.name);
    }

    async evaluate(...inputs) {
        return await this.receiver.call('evaluate', inputs);
    }
}
