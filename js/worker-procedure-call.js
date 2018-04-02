function getTransferList(obj, list = []) {
    if (ArrayBuffer.isView(obj)) {
        list.push(obj.buffer);
        return list;
    }
    if (isTransferable(obj)) {
        list.push(obj);
        return list;
    }
    if (!(typeof obj === 'object')) {
        return list;
    }
    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            getTransferList(obj[prop], list);
        }
    }
    return list;
}

function isTransferable(instance) {
    const transferable = [ArrayBuffer];
    if (typeof MessagePort !== 'undefined') {
        transferable.push(MessagePort);
    }
    if (typeof ImageBitmap !== 'undefined') {
        transferable.push(ImageBitmap);
    }
    return transferable.some(e => instance instanceof e);
}

class WorkerProcedureCall {
    constructor(receiver, signature) {
        this.receiver = receiver;
        this.signature = signature;
        this.id = 0;
        this.resRejs = {};
        this.receiver.addEventListener('message', async event => {
            const data = event.data;
            if (data.signature !== this.signature) {
                return;
            }
            if ('result' in data) {
                this.returnHandler(data);
            }
        }, false);
    }

    call(func, args = []) {
        return new Promise((resolve, reject) => {
            this.id += 1;
            this.resRejs[this.id] = { resolve, reject };
            this.receiver.postMessage({
                signature: this.signature,
                id: this.id,
                func,
                args,
            }, getTransferList(args));
        });
    }

    returnHandler(data) {
        if (data.error) {
            this.resRejs[data.id].reject(data.error);
        } else {
            this.resRejs[data.id].resolve(data.result);
        }
        delete this.resRejs[data.id];
    }
}

function addProcedureListener(target, thisArg) {
    target.addEventListener('message', async function(event) {
        const data = event.data;
        if (data.signature !== thisArg.constructor.name) {
            return;
        }
        let result = await thisArg[data.func].apply(thisArg, data.args);
        target.postMessage({
            signature: data.signature,
            id: data.id,
            func: data.func,
            result: result,
        }, getTransferList(result));
    }, false);
}
