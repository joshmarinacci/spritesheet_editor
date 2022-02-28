import {Ctx} from "./graphics";

export class Sprite {
    id: string;
    private w: number;
    private h: number;
    private data: number[];

    constructor(id, w, h) {
        this.id = id;
        this.w = w;
        this.h = h;
        this.data = []
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
    }

    forEachPixel(cb: (val: any, i: number, j: number) => void) {
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                let n = j * this.w + i;
                let v = this.data[n];
                cb(v, i, j);
            }
        }
    }

    set_pixel(x: number, y: number, color: any) {
        let n = y * this.w + x;
        this.data[n] = color;
    }

    fromJSONObj(obj) {
        let sprite = new Sprite(obj.id, obj.w, obj.h);
        sprite.data = obj.data;
        return sprite;

    }

    get_pixel(x: number, y: number):any {
        let n = y * this.w + x;
        return this.data[n]
    }
}

export type CB = (any) => void;
export type Etype = "change"

export class Observable {
    listeners: Map<Etype, Array<CB>>

    constructor() {
        this.listeners = new Map<Etype, Array<CB>>();
    }

    addEventListener(etype: Etype, cb: CB) {
        if (!this.listeners.has(etype)) this.listeners.set(etype, new Array<CB>());
        this.listeners.get(etype).push(cb);
    }

    fire(etype: Etype, payload: any) {
        if (!this.listeners.has(etype)) this.listeners.set(etype, new Array<CB>());
        this.listeners.get(etype).forEach(cb => cb(payload))
    }
}

export class Doc extends Observable {
    selected_color: number;
    palette: string[];
    tiles: Sprite[]
    selected_tile: number;
    tilemap: Sprite;
    map_grid_visible: boolean;

    constructor() {
        super();
        this.selected_color = 1;
        this.palette = [
            '#ff00ff',
            '#f0f0f0',
            '#d0d0d0',
            '#909090',
            '#404040',
        ];
        this.tiles = [
            new Sprite('sprite1', 8, 8)
        ]
        this.selected_tile = 0;
        this.tilemap = new Sprite('main-map', 16, 16);
        this.tilemap.set_pixel(0, 0, 'sprite1');
        this.map_grid_visible = true;
    }
}

export function draw_sprite(sprite: Sprite, ctx: Ctx, x: number, y: number, scale: number, doc: Doc) {
    sprite.forEachPixel((val: number, i: number, j: number) => {
        ctx.fillRect(x + i * scale, y + j * scale, scale, scale, doc.palette[val]);
    });
}
