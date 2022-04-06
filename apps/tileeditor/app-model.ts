import {CanvasSurface} from "../../lib/src/canvas";
import {gen_id} from "../../lib/src/common";

export const GRAYSCALE_PALETTE = [
    '#ff00ff',
    '#f0f0f0',
    '#d0d0d0',
    '#909090',
    '#404040',
];
export const INVERTED_PALETTE = [
    '#ff00ff',
    '#404040',
    '#909090',
    '#d0d0d0',
    '#f0f0f0',
];
export const DEMI_CHROME = [
    '#ff00ff',
    '#e9efec',
    '#a0a08b',
    '#555568',
    '#211e20',
];
export const CHERRY_BLOSSOM = [
    '#ff00ff',
    '#ffe9fc',
    '#e6cdf7',
    '#dea0d9',
    '#a76e87',
];
export const DUNE = [
    '#ff00ff',
    '#edcda7',
    '#dcac70',
    '#e67718',
    '#320404',
];

export class Sprite {
    id: string
    name:string
    w: number
    h: number
    data: number[]
    _img: HTMLCanvasElement
    private doc: Doc;

    constructor(id:string, name:string, w:number, h:number, doc:Doc) {
        this.id = id || gen_id('unknown');
        this.doc = doc
        this.name = name || 'unknown'
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
        let pal = this.doc.get_color_palette()
        this.forEachPixel((v,i,j)=>{
            c.fillStyle = pal[v]
            c.fillRect(i, j, 1, 1)
        })
    }

    get_pixel(x: number, y: number):any {
        let n = y * this.w + x;
        return this.data[n]
    }

    toJsonObj():object {
        return {
            clazz:'Sprite',
            id:this.id,
            name:this.name,
            w:this.w,
            h:this.h,
            data:this.data,
        }
    }
}

export class Tilemap {
    id:string
    name: string
    w: number
    h: number
    data: number[];

    constructor(id, name, w, h) {
        this.id = id || gen_id('unknown');
        this.name = name || 'unknown'
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
            name:this.name,
            w:this.w,
            h:this.h,
            data:this.data,
        }
    }


}

export type CB = (any) => void;
export type Etype = "change"|"reload"|"structure"|'main-selection'|'palette-change'

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
        this.id = id || gen_id('unknown');
        this.name = name || 'unknown'
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
type GlyphMeta = {
    codepoint:number
    left:number,
    right:number,
    baseline:number,
}
export class SpriteGlyph extends Sprite {
    meta: GlyphMeta;
    constructor(id,name,w,h, doc:Doc) {
        super(id,name,w,h,doc)
        this.meta = {
            codepoint:300,
            left:0,
            right:0,
            baseline:0
        }
    }
    override sync() {
        let c = this._img.getContext('2d')
        this.forEachPixel((v,i,j)=>{
            if(v %2 === 0) {
                c.fillStyle = 'white'
                c.fillRect(i, j, 1, 1)
            }
            if(v%2 === 1) {
                c.fillStyle = 'black'
                c.fillRect(i, j, 1, 1)
            }
        })
    }

    toJsonObj():object {
        let obj = super.toJsonObj()
        // @ts-ignore
        obj.clazz = 'Glyph'
        // @ts-ignore
        obj.meta = this.meta
        // @ts-ignore
        // console.log("saving out",obj.meta)
        return obj
    }
}

export class SpriteFont {
    glyphs:SpriteGlyph[]
    private id: string;
    name: string;
    constructor(id,name, doc:Doc) {
        this.id = id || gen_id('unknown');
        this.name = name || 'unknown'
        this.glyphs = []
    }
    toJsonObj() {
        return {
            clazz:'Font',
            id:this.id,
            name:this.name,
            glyphs: this.glyphs.map(sp => sp.toJsonObj())
        }
    }

    add(spriteGlyph: SpriteGlyph) {
        this.glyphs.push(spriteGlyph)
    }
}

function obj_to_class(sh, doc:Doc) {
    if(sh.clazz === 'Sprite') {
        let sprite = new Sprite(sh.id, sh.name, sh.w, sh.h, doc)
        sprite.data = sh.data
        sprite.sync()
        return sprite
    }
    if(sh.clazz === 'Tilemap') {
        let tilemap = new Tilemap(sh.id, sh.name, sh.w, sh.h)
        tilemap.data = sh.data
        return tilemap
    }
    if(sh.clazz === 'Sheet') {
        let sheet = new Sheet(sh.id,sh.name)
        sheet.sprites = sh.sprites.map(sp => obj_to_class(sp, doc))
        return sheet
    }
    if(sh.clazz === 'Font') {
        let font = new SpriteFont(sh.id,sh.name, doc)
        font.glyphs = sh.glyphs.map(g => obj_to_class(g, doc))
        return font
    }
    if(sh.clazz === 'Glyph') {
        let glyph = new SpriteGlyph(sh.id,sh.name,sh.w,sh.h, doc)
        glyph.data = sh.data
        glyph.meta = sh.meta
        if(!glyph.meta.left) glyph.meta.left = 0
        if(!glyph.meta.right) glyph.meta.right = 0
        if(!glyph.meta.baseline) glyph.meta.baseline = 0
        glyph.sync()
        return glyph
    }
    throw new Error(`don't know how to deserialize ${sh.clazz}`)
}

export class Doc extends Observable {
    sheets: Sheet[]
    fonts: SpriteFont[]
    maps:Tilemap[]
    name:string

    private _selected_color: number
    private _color_palette: string[]
    private font_palette: string[]
    private _selected_tile_index: number
    private selected_map: number
    private selected_font: number
    private selected_glyph_index: number
    private _map_grid_visible: boolean;
    // private selected_tree_item_index:number
    selected_tree_item:any
    private _selected_sheet: number;
    private _dirty: boolean;

    constructor() {
        super();
        this._selected_color = 1;
        this._color_palette = GRAYSCALE_PALETTE
        this.font_palette = [
            '#ffffff',
            '#404040',
        ];
        let sheet = new Sheet("sheet1", "first sheet")
        sheet.add(new Sprite(gen_id('sprite'),'sprite1',8,8,this))
        sheet.add(new Sprite(gen_id('sprite'),'sprite2',8,8,this))
        this.sheets = [sheet]
        this._selected_sheet = 0
        this._selected_tile_index = 0;
        let tilemap = new Tilemap(gen_id('tilemap'),'main-map', 16, 16);
        tilemap.set_pixel(0, 0, 'sprite1');
        this.maps = [tilemap]
        this._map_grid_visible = true;
        let font = new SpriteFont(gen_id('font'),'somefont',this)
        let glyph = new SpriteGlyph(gen_id('glyph'),'a',8,8,this)
        font.glyphs.push(glyph)
        this.fonts = [font]
        // this.selected_tree_item_index = -1
        this.selected_tree_item = null
        this._dirty = false
        this.name = 'unnamed-project'
    }

    get_color_palette(): string[] {
        return this._color_palette
    }
    set_palette(palette: string[]) {
        this._color_palette = palette
        this.fire('palette-change',this._color_palette)
        this.sheets.forEach(sh => {
            sh.sprites.forEach(sp => {
                sp.sync()
            })
        })
    }
    set_selected_color(value: number) {
        this._selected_color = value;
        this.fire('change', "tile edited");
    }
    get_selected_color():number {
        return this._selected_color
    }
    get_selected_tile_index() {
        return this._selected_tile_index
    }
    set_selected_tile_index(val: number) {
        this._selected_tile_index = val
    }
    get_selected_sheet():Sheet {
        return this.sheets[this._selected_sheet]
    }
    set_selected_sheet(target: Sheet) {
        this._selected_sheet = this.sheets.indexOf(target)
        this.fire('main-selection',this._selected_sheet)
    }
    get_selected_tile():Sprite {
        let sheet = this.get_selected_sheet();
        if (!sheet) return null
        return sheet.sprites[this._selected_tile_index]
    }
    get_selected_glyph_index():number {
        return this.selected_glyph_index
    }
    set_selected_glyph_index(val: number) {
        this.selected_glyph_index = val;
        this.fire('change', this.selected_glyph_index)
    }
    get_selected_map():Tilemap {
        return this.maps[this.selected_map]
    }
    set_selected_map(target: Tilemap) {
        this.selected_map = this.maps.indexOf(target)
        this.fire('main-selection',this.selected_map)
    }
    get_selected_font():SpriteFont {
        return this.fonts[this.selected_font]
    }
    set_selected_font(target: SpriteFont) {
        this.selected_font = this.fonts.indexOf(target)
        this.fire('main-selection',this.selected_font)
    }
    get_selected_glyph():SpriteGlyph {
        let font = this.get_selected_font()
        if(!font) return  null
        return font.glyphs[this.selected_glyph_index]
    }
    set_selected_glyph(target: SpriteGlyph) {
        let font = this.get_selected_font()
        if(!font) return
        this.selected_glyph_index = font.glyphs.indexOf(target)
    }
    get_font_palette():string[] {
        return this.font_palette;
    }
    get_map_grid_visible():boolean {
        return this._map_grid_visible
    }
    set_map_grid_visible(visible: boolean) {
        this._map_grid_visible = visible
        this.fire("change", this._map_grid_visible);
    }

    toJsonObj() {
        return {
            version:2,
            sheets: this.sheets.map(sh => sh.toJsonObj()),
            fonts:  this.fonts.map(fnt => fnt.toJsonObj()),
            maps:   this.maps.map(mp => mp.toJsonObj()),
        }
    }

    reset_from_json(data) {
        // console.log('data is',data)
        if(data.version === 1) {
            if(data.fonts && data.fonts.length > 0) {
                console.log("pretending to upgrade the document")
                data.version = 2
            } else {
                console.log("really upgrade")
                data.maps.forEach(mp => {
                    console.log("converting",mp)
                    mp.clazz = 'Tilemap'
                    if(!mp.id) mp.id = gen_id("tilemap")
                    if(!mp.name) mp.name = gen_id("unknown")
                    return mp
                })
                data.version = 2
            }
        }
        if(data.version !== 2) throw new Error("we can only parse version 2 json")
        // console.log("processing",data);

        this.sheets = data.sheets.map(sh => {
            // console.log("sheet",sh)
            return obj_to_class(sh,this)
        })
        this.fonts = data.fonts.map(fnt => {
            // console.log("font",fnt)
            return obj_to_class(fnt, this)
        })
        this.maps = data.maps.map(mp => {
            // console.log("map is",mp)
            let mp2 = obj_to_class(mp, this)
            // console.log("restored map is",mp2)
            return mp2
        })


        this._selected_color = 0
        this._selected_tile_index = 0
        this.selected_map = 0
        this.selected_font = 0
        this.selected_glyph_index = 0
        this._map_grid_visible = true
        // this.selected_tree_item_index = -1
        this.selected_tree_item = null
        this._selected_sheet = 0

        console.log("final version of the doc is",this)
        console.log('selected tile is',this.get_selected_tile())
        console.log("selected map is",this.get_selected_map())
        console.log("selected font is",this.get_selected_font())
        console.log("selected glyph is",this.get_selected_glyph())
        this.fire('reload',this)
        this.fire('structure',this)
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

    set_selected_tree_item_index(y:number) {
        // this.selected_tree_item_index = y
    }

    set_selected_tree_item(item:any) {
        this.selected_tree_item = item
    }
}

export function draw_sprite(sprite: Sprite, ctx: CanvasSurface, x: number, y: number, scale: number, palette:string[]) {
    sprite.forEachPixel((val: number, i: number, j: number) => {
        ctx.fillRect(x + i * scale, y + j * scale, scale, scale, palette[val]);
    });
}
