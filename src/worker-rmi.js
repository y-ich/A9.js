import ObjectID from 'bson-objectid';

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

export class WorkerRMI {
    constructor(remote, ...args) {
        this.remote = remote;
        this.id = ObjectID().toString();
        this.methodStates = {};
        this.remote.addEventListener('message', event => {
            const data = event.data;
            if (data.id === this.id) {
                this.returnHandler(data);
            }
        }, false);
        this.constructorPromise = this.call(this.constructor.name, args);
    }

    invokeRM(methodName, args = []) {
        if (!this.methodStates[methodName]) {
            this.methodStates[methodName] = {
                num: 0,
                resolveReject: {}
            };
        }
        return new Promise((resolve, reject) => {
            const methodState = this.methodStates[methodName];
            methodState.num += 1;
            methodState.resolveRejects[methodState.num] = { resolve, reject };
            this.remote.postMessage({
                id: this.id,
                methodName,
                num: methodState.num,
                args
            }, getTransferList(args));
        });
    }

    returnHandler(data) {
        const resolveReject = this.methodStates[data.methodName].resolveReject;
        if (data.error) {
            resolveReject[data.id].reject(data.error);
        } else {
            resolveReject[data.id].resolve(data.result);
        }
        delete resolveReject[data.id];
    }
}

export function resigterWorkerRMI(target, klass) {
    klass.workerRMI = {
        target,
        instances: {}
    }
    target.addEventListener('message', async event => {
        const data = event.data;
        const message = {
            id: data.id,
            methodName: data.methodName,
            num: data.num,
        };
        let result;
        if (data.methodName === this.name) {
            this.workerRMI.instances[data.id] = new this(...data.args);
            result = null;
        } else {
            result = await this.workerRMI.instances[data.id][data.methodName].apply(this.objs[data.id], data.args)
        }
        message.result = result;
        this.workerRMI.target.postMessage(message, getTransferList(result));
    }, false);
}
