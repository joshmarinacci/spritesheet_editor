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

export class Point {
    x: number
    y: number

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    translate(x: number, y: number) {
        return new Point(this.x - x, this.y - y)
    }

    divide_floor(scale: number) {
        return new Point(
            Math.floor(this.x / scale),
            Math.floor(this.y / scale)
        )
    }

    add(pt: Point) {
        return new Point(
            this.x + pt.x,
            this.y + pt.y,
        )
    }

    set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    copy_from(pt: Point) {
        this.x = pt.x
        this.y = pt.y
    }

    clone() {
        return new Point(this.x,this.y)
    }

    subtract(trans: Point) {
        return new Point(
            this.x - trans.x,
            this.y - trans.y
        )
    }
}

export class Rect {
    x: number;
    y: number;
    w: number;
    h: number;

    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    contains(pt: Point): boolean {
        if (pt.x < this.x) return false;
        if (pt.y < this.y) return false;
        if (pt.x >= this.x + this.w) return false;
        if (pt.y >= this.y + this.h) return false;
        return true;
    }

    bottom() {
        return this.y + this.h;
    }

    right() {
        return this.x + this.w;
    }
}

export class Size {
    w: number;
    h: number;

    constructor(w, h) {
        this.w = w
        this.h = h
    }

    shrink(pad: number) {
        return new Size(this.w-pad*2,this.h-pad*2)
    }

    grow(pad: number) {
        return new Size(this.w+pad*2,this.h+pad*2)
    }

    subtract(delta: Point) {
        return new Size(this.w-delta.x,this.h-delta.y)
    }

    add(delta: Point) {
        return new Size(this.w+delta.x,this.h+delta.y)
    }
}
