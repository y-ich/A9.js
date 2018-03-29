/* global WorkerProcedureCall */


export class NeuralNetwork {
    constructor() {
        this.receiver = new WorkerProcedureCall(self, this.constructor.name);
    }

    async evaluate(b) {
        const result = await this.receiver.call('evaluate', [b.feature()]);
        self.PONDER_STOP = result.pop();
        return result;
    }
}
