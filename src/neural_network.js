/* global WebDNN */

export class NeuralNetwork {
    constructor() {
        this.nn = null;
    }

    async load() {
        if (this.nn) {
            return;
        }
        this.nn = await WebDNN.load('./output', { backendOrder: ['webgpu', 'webgl'] });
    }

    async evaluate(b) {
        const views = this.nn.getInputViews();
        views[0].set(b.feature());
        await this.nn.run();
        const result = this.nn.getOutputViews().map(e => e.toActual());
        return result;
    }
}
