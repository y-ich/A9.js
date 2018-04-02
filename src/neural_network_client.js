/* global WorkerProcedureCall */


export class NeuralNetwork {
    constructor() {
        this.receiver = new WorkerProcedureCall(self, this.constructor.name);
    }

    async evaluate(...inputs) {
        const result = await this.receiver.call('evaluate', inputs);
        self.PONDER_STOP = result.pop();
        return result;
    }
}
