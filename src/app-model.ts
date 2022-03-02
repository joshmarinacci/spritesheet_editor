import {CanvasSurface} from "./canvas";

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

export class Sheet {
    sprites: Sprite[];
    private id: string;
    name: string;
    constructor(id:string, name:string) {
        this.id = id
        this.name = name
        this.sprites = []
    }
    add(sprite: Sprite) {
        this.sprites.push(sprite)
    }
}
export class SpriteFont {

}
export class Doc extends Observable {
    selected_color: number
    palette: string[]
    sheets: Sheet[]
    fonts: SpriteFont[]
    selected_tile: number
    maps:Sprite[]
    selected_map: number
    map_grid_visible: boolean;
    selected_tree_item_index:number
    selected_tree_item:any
    selected_sheet: number;

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
        let sheet = new Sheet("sheet1", "first sheet")
        sheet.add(new Sprite('sprite1',8,8))
        sheet.add(new Sprite('sprite2',8,8))
        this.sheets = [sheet]
        this.selected_sheet = 0
        this.selected_tile = 0;
        let tilemap = new Sprite('main-map', 16, 16);
        tilemap.set_pixel(0, 0, 'sprite1');
        this.maps = [tilemap]
        this.map_grid_visible = true;
        this.fonts = []
        this.selected_tree_item_index = -1
        this.selected_tree_item = null
    }
}

export function draw_sprite(sprite: Sprite, ctx: CanvasSurface, x: number, y: number, scale: number, doc: Doc) {
    sprite.forEachPixel((val: number, i: number, j: number) => {
        ctx.fillRect(x + i * scale, y + j * scale, scale, scale, doc.palette[val]);
    });
}
