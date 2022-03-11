import {CanvasSurface} from "./uilib/canvas";

export class Sprite {
    id: string;
    w: number;
    h: number;
    data: number[];
    _img: HTMLCanvasElement;

    constructor(id, w, h) {
        this.id = id;
        this.w = w;
        this.h = h;
        this.data = []
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
        this._img = document.createElement('canvas')
        this._img.width = this.w
        this._img.height = this.h
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
        this.sync()
    }
    sync() {
        let c = this._img.getContext('2d')
        this.forEachPixel((v,i,j)=>{
            if(v === 1) {
                c.fillStyle = '#f0f0f0'
                c.fillRect(i, j, 1, 1)
            }
            if(v === 2) {
                c.fillStyle = '#d0d0d0'
                c.fillRect(i, j, 1, 1)
            }
            if(v === 3) {
                c.fillStyle = '#909090'
                c.fillRect(i, j, 1, 1)
            }
            if(v === 4) {
                c.fillStyle = '#404040'
                c.fillRect(i, j, 1, 1)
            }
        })
    }

    get_pixel(x: number, y: number):any {
        let n = y * this.w + x;
        return this.data[n]
    }

    toJsonObj() {
        return {
            clazz:'Sprite',
            id:this.id,
            w:this.w,
            h:this.h,
            data:this.data,
        }
    }
}

export class Tilemap {
    id: string;
    w: number;
    h: number;
    data: number[];

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
    get_pixel(x: number, y: number):any {
        let n = y * this.w + x;
        return this.data[n]
    }

    toJsonObj() {
        return {
            clazz:'Tilemap',
            id:this.id,
            w:this.w,
            h:this.h,
            data:this.data,
        }
    }


}

export type CB = (any) => void;
export type Etype = "change"|"reload"

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

    toJsonObj() {
        return {
            clazz:'Sheet',
            id:this.id,
            name:this.name,
            sprites: this.sprites.map(sp => sp.toJsonObj())
        }
    }
}
export class SpriteFont {

    toJsonObj() {
        return {
            clazz:'SpriteFont',
        }
    }
}

function obj_to_class(sh) {
    if(sh.clazz === 'Sprite') {
        let sprite = new Sprite(sh.id, sh.w, sh.h)
        sprite.data = sh.data
        sprite.sync()
        return sprite
    }
    if(sh.clazz === 'Tilemap') {
        let tilemap = new Tilemap(sh.id, sh.w, sh.h)
        tilemap.data = sh.data
        return tilemap
    }
    if(sh.clazz === 'Sheet') {
        let sheet = new Sheet(sh.id,sh.name)
        sheet.sprites = sh.sprites.map(sp => obj_to_class(sp))
        return sheet
    }
    throw new Error(`don't know how to deserialize ${sh.clazz}`)
}

export class Doc extends Observable {
    sheets: Sheet[]
    fonts: SpriteFont[]
    maps:Tilemap[]

    selected_color: number
    palette: string[]
    selected_tile: number
    selected_map: number
    map_grid_visible: boolean;
    selected_tree_item_index:number
    selected_tree_item:any
    selected_sheet: number;
    private _dirty: boolean;

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
        let tilemap = new Tilemap('main-map', 16, 16);
        tilemap.set_pixel(0, 0, 'sprite1');
        this.maps = [tilemap]
        this.map_grid_visible = true;
        this.fonts = []
        this.selected_tree_item_index = -1
        this.selected_tree_item = null
        this._dirty = false
    }

    get_selected_sheet():Sheet {
        return this.sheets[this.selected_sheet]
    }

    get_selected_map():Tilemap {
        return this.maps[this.selected_map]
    }

    set_selected_sheet(target: Sheet) {
        this.selected_sheet = this.sheets.indexOf(target)
    }

    set_selected_map(target: Tilemap) {
        this.selected_map = this.maps.indexOf(target)
    }

    get_selected_tile() {
        let sheet = this.get_selected_sheet();
        if (!sheet) return null
        let tile = sheet.sprites[this.selected_tile];
        return tile
    }

    toJsonObj() {
        return {
            version:1,
            sheets: this.sheets.map(sh => sh.toJsonObj()),
            fonts:  this.fonts.map(fnt => fnt.toJsonObj()),
            maps:   this.maps.map(mp => mp.toJsonObj()),
        }
    }

    reset_from_json(data) {
        console.log('data is',data)
        if(data.version !== 1) throw new Error("we can only parse version 1 json")
        console.log("processing",data);

        this.sheets = data.sheets.map(sh => {
            console.log("sheet",sh)
            return obj_to_class(sh)
        })
        this.fonts = data.fonts.map(fnt => {
            console.log("font",fnt)
            return obj_to_class(fnt)
        })
        this.maps = data.maps.map(mp => {
            console.log("map is",mp)
            let mp2 = obj_to_class(mp)
            console.log("restored map is",mp2)
            return mp2
        })


        this.selected_color = 0
        this.selected_tile = 0
        this.selected_map = 0
        this.map_grid_visible = true
        this.selected_tree_item_index = -1
        this.selected_tree_item = null
        this.selected_sheet = 0

        console.log("final version of the doc is",this)
        console.log("selected sheet is",this.get_selected_sheet())
        console.log('selected tile is',this.get_selected_tile())
        console.log("selected map is",this.get_selected_map())
        this.fire('reload',this)
    }

    dirty() {
        return this._dirty
    }

    mark_dirty() {
        this._dirty = true
    }

    persist() {
        let json = this.toJsonObj()
        let str = JSON.stringify(json,null, '  ')
        localStorage.setItem('backup',str)
        console.log("persisted to backup")
        this._dirty = false
    }

    check_backup() {
        let item = localStorage.getItem('backup')
        if(item) {
            let data = JSON.parse(item)
            this.reset_from_json(data)
        }
    }
}

export function draw_sprite(sprite: Sprite, ctx: CanvasSurface, x: number, y: number, scale: number, doc: Doc) {
    sprite.forEachPixel((val: number, i: number, j: number) => {
        ctx.fillRect(x + i * scale, y + j * scale, scale, scale, doc.palette[val]);
    });
}
