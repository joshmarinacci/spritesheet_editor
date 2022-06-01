import {
    Sheet,
    Sprite,
    Tilemap,
    SpriteGlyph,
    SpriteFont,
    gen_id,
    CanvasSurface,
} from "thneed-gfx";

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
export const PICO8 = [
'#000000',
'#1D2B53',
'#7E2553',
'#008751',
'#AB5236',
'#5F574F',
'#C2C3C7',
'#FFF1E8',
'#FF004D',
'#FFA300',
'#FFEC27',
'#00E436',
'#29ADFF',
'#83769C',
'#FF77A8',
'#FFCCAA',
'transparent',
]


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


function obj_to_class(sh, doc:Doc) {
    if(sh.clazz === 'Sprite') {
        console.log("making a sprite",sh.id,sh.name)
        let sprite = new Sprite(sh.id, sh.name, sh.w, sh.h, doc)
        sprite.data = sh.data
        sprite.sync()
        console.log("called sync")
        return sprite
    }
    if(sh.clazz === 'Tilemap') {
        let tilemap = new Tilemap(sh.id, sh.name, sh.w, sh.h)
        tilemap.data = sh.data
        return tilemap
    }
    if(sh.clazz === 'Sheet') {
        console.log("making a sheet",sh.id,sh.name)
        let sheet = new Sheet(sh.id,sh.name)
        sheet.sprites = sh.sprites.map(sp => obj_to_class(sp, doc))
        return sheet
    }
    if(sh.clazz === 'Font') {
        let font = new SpriteFont(sh.id,sh.name)
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
    private _name:string

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
        let font = new SpriteFont(gen_id('font'),'somefont')
        let glyph = new SpriteGlyph(gen_id('glyph'),'a',8,8,this)
        font.glyphs.push(glyph)
        this.fonts = [font]
        // this.selected_tree_item_index = -1
        this.selected_tree_item = null
        this._dirty = false
        this._name = 'unnamed-project'
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
    // get_selected_glyph_index():number {
    //     return this.selected_glyph_index
    // }
    // set_selected_glyph_index(val: number) {
    //     this.selected_glyph_index = val;
    //     this.fire('change', this.selected_glyph_index)
    // }
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
            version:3,
            name: this._name,
            color_palette:this._color_palette,
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
        if(data.version === 2) {
            data.color_palette = GRAYSCALE_PALETTE
            data.version = 3
        }
        if(data.version !== 3) throw new Error("we can only parse version 3 json")
        // console.log("processing",data);
        if(data.name) this._name = data.name
        this._color_palette = data.color_palette

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

    find_tilemap_by_name(name: string):Tilemap {
        return this.maps.find(mp => mp.name === name)
    }

    set_name(text:string) {
        this._name = text
        this.mark_dirty()
    }

    name():string {
        return this._name
    }

    find_sheet_by_name(name: string) {
        return this.sheets.find(sh => sh.name === name);
    }
}

export function draw_sprite(sprite: Sprite, ctx: CanvasSurface, x: number, y: number, scale: number, palette:string[]) {
    sprite.forEachPixel((val: number, i: number, j: number) => {
        ctx.fillRect(x + i * scale, y + j * scale, scale, scale, palette[val]);
    });
}
