/* global WebDNN addProcedureListener */


if (!ArrayBuffer.prototype.slice) {
    ArrayBuffer.prototype.slice = function(start, end) {
        var that = new Uint8Array(this);
        if (end == undefined) end = that.length;
        var result = new ArrayBuffer(end - start);
        var resultArray = new Uint8Array(result);
        for (var i = 0; i < resultArray.length; i++)
           resultArray[i] = that[i + start];
        return result;
    };
}

export class NeuralNetwork {
    constructor(worker) {
        this.nn = null;
        addProcedureListener(worker, this);
    }

    async load() {
        if (this.nn) {
            return;
        }
        this.nn = await WebDNN.load('./output', { backendOrder: ['webgpu', 'webgl'] });
    }

    async evaluate(feature) {
        const views = this.nn.getInputViews();
        views[0].set(feature);
        await this.nn.run();
        const result = this.nn.getOutputViews().map(e => e.toActual());
        result.push(window.PONDER_STOP);
        return result;
    }
}
