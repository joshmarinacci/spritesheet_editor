export function gen_id(prefix: string) {
    return `${prefix}_${Math.floor(Math.random() * 100000)}`
}

export type Callback = (any) => any;

export class SuperArray {
    private data: any[];

    constructor() {
        this.data = []
    }

    clear() {
        this.data = []
    }

    push_end(value: any) {
        this.data.push(value)
    }

    length() {
        return this.data.length
    }

    pop_start() {
        return this.data.shift()
    }

    forEach(cb: Callback) {
        // @ts-ignore
        this.data.forEach((v, i) => cb(v, i))
    }
}

export class Observable {
    listeners: Map<string, Array<Callback>>

    constructor() {
        this.listeners = new Map();
    }

    addEventListener(etype: string, cb: Callback) {
        if (!this.listeners.has(etype)) this.listeners.set(etype, new Array<Callback>());
        this.listeners.get(etype).push(cb);
    }

    fire(etype: string, payload: any) {
        if (!this.listeners.has(etype)) this.listeners.set(etype, new Array<Callback>());
        this.listeners.get(etype).forEach(cb => cb(payload))
    }
}

export function on(target: Observable, event_type: string, cb: Callback) {
    target.addEventListener(event_type, cb);
}

function wait(msec: number, cb: Callback) {
    setTimeout(() => {
        cb({})
    }, msec)
}

export function randi(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min))
}
