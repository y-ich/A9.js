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
        this.constructorPromise = this.invokeRM(this.constructor.name, args);
    }

    invokeRM(methodName, args = []) {
        if (!this.methodStates[methodName]) {
            this.methodStates[methodName] = {
                num: 0,
                resolveRejects: {}
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
        const resolveRejects = this.methodStates[data.methodName].resolveRejects;
        if (data.error) {
            resolveRejects[data.num].reject(data.error);
        } else {
            resolveRejects[data.num].resolve(data.result);
        }
        delete resolveRejects[data.num];
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
        if (data.methodName === klass.name) {
            klass.workerRMI.instances[data.id] = new klass(...data.args);
            message.result = null;
            klass.workerRMI.target.postMessage(message, getTransferList(result));
        } else {
            const instance = klass.workerRMI.instances[data.id];
            if (instance) {
                result = await instance[data.methodName].apply(instance, data.args)
                message.result = result;
                klass.workerRMI.target.postMessage(message, getTransferList(result));
            }
        }
    }, false);
}
