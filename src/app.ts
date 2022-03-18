import {
    ActionButton,
    HBox,
    Label,
    ToggleButton,
    SelectList,
    CustomLabel,
    VBox,
    Header,
    ScrollView, LayerView, PopupContainer
} from "./uilib/components";
import {
    canvasToPNGBlob, fileToJSON,
    forceDownloadBlob,
    jsonObjToBlob,
    on
} from "./util";
import {
    CHERRY_BLOSSOM,
    DEMI_CHROME,
    Doc,
    draw_sprite, DUNE,
    GRAYSCALE_PALETTE,
    INVERTED_PALETTE,
    Sheet,
    Sprite,
    SpriteFont,
    SpriteGlyph,
    Tilemap
} from "./app-model";
import {
    CanvasSurface,
    EVENTS,
    log,
} from "./uilib/canvas";
import {
    StandardLeftPadding,
    StandardPanelBackgroundColor,
    StandardSelectionColor,
    StandardTextColor,
    StandardTextHeight, StandardTextStyle
} from "./style";
import {gen_id, Observable, Point, Rect, Size} from "./uilib/common";
import {CommonEvent, SuperChildView, SuperParentView} from "./uilib/core";
// @ts-ignore
import basefont_data from "./base_font.json";

export const EMPTY_COLOR = '#62fcdc'

class TileEditor extends SuperChildView {
    doc: Doc;
    scale: number
    sprite: Sprite
    private palette: string[];
    private _next_click_fill: boolean;
    constructor(doc, palette) {
        super('tile editor')
        this.doc = doc
        this.palette = palette
        this.scale = 32;
        this.sprite = null
        this._next_click_fill = false
    }

    draw(g: CanvasSurface) {
        //clear the background
        g.fillBackgroundSize(this.size(), 'white');
        //draw each pixel in the tile as a rect
        let palette = this.palette
        if (this.sprite) {
            this.sprite.forEachPixel((val: number, i: number, j: number) => {
                g.ctx.fillStyle = palette[val]
                g.ctx.fillRect(i * this.scale, j * this.scale, this.scale, this.scale)
            });
        }

        draw_grid(g, this.size(), this.scale)
    }

    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        if(!this.sprite) return
        let tile = this.sprite
        if (e.button == 2) {
            if (e.type === "mousedown") {
                let value = tile.get_pixel(pt.x, pt.y);
                if (typeof value === 'number') {
                    this.doc.selected_color = value
                    this.doc.fire('change', "tile edited");
                }
            }
            return
        }
        if(this._next_click_fill && e.type === 'mousedown') {
            let v = tile.get_pixel(pt.x,pt.y)
            this.bucket_fill(tile,v,this.doc.selected_color,pt)
            this._next_click_fill = false
        } else {
            tile.set_pixel(pt.x, pt.y, this.doc.selected_color);
        }
        this.doc.mark_dirty()
        this.doc.fire('change', "tile edited");
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(32*8+1,32*8+1))
        return this.size()
    }

    set_sprite(sprite: Sprite) {
        this.sprite = sprite
    }

    next_click_fill() {
        this._next_click_fill = true
    }

    private bucket_fill(tile: Sprite, target: number, replace: number, pt: Point) {
        let v = tile.get_pixel(pt.x,pt.y)
        if(v !== target) return
        if(v === target) {
            tile.set_pixel(pt.x,pt.y,replace)
        } else {
            return
        }
        if(pt.x > 0) this.bucket_fill(tile,target,replace,pt.add(new Point(-1,0)))
        if(pt.x < tile.w - 1) this.bucket_fill(tile,target,replace,pt.add(new Point(+1,0)))
        if(pt.y > 0) this.bucket_fill(tile,target,replace,pt.add(new Point(0,-1)))
        if(pt.y < tile.h - 1) this.bucket_fill(tile,target,replace,pt.add(new Point(0,+1)))
    }
}

class TileSelector extends SuperChildView {
    doc: Doc;
    scale: number;
    constructor(doc) {
        super('tile-selector')
        this.doc = doc
        this.scale = 32;
        this._name = 'tile-selector'
    }
    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),EMPTY_COLOR);
        let sheet = this.doc.get_selected_sheet()
        if(sheet) {
            sheet.sprites.forEach((sprite, s) => {
                let pt = wrap_number(s, 8);
                draw_sprite(sprite, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.palette())
            })
        }
        draw_grid(g,this.size(),this.scale);
        let pt = wrap_number(this.doc.selected_tile,8);
        draw_selection_rect(g,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }
    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        let val = pt.x + pt.y * 8;
        let sheet = this.doc.get_selected_sheet()
        if(val >= 0 && val < sheet.sprites.length) {
            this.doc.selected_tile = val;
            this.doc.fire('change', this.doc.selected_color)
        }
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(8*this.scale,8*this.scale))
        return this.size()
    }
}

function wrap_number(num:number,width:number):Point {
    return new Point(
        num % width,
        Math.floor(num/width)
    )
}

class MapEditor extends SuperChildView {
    doc: Doc;
    _scale:number;
    private tilemap: Tilemap | null;

    constructor(doc:Doc, scale:number) {
        super("map-editor")
        this._name = 'map-editor'
        this._scale = scale;
        this.doc = doc
        this.tilemap = null
    }

    scale() {
        return this._scale
    }
    set_scale(scale) {
        this._scale = scale
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackgroundSize(this.size(),EMPTY_COLOR)
        if(!this.tilemap) return
        this.tilemap.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let sheet = this.doc.get_selected_sheet()
            let tile = sheet.sprites.find((t:Sprite) => t.id ===val);
            ctx.ctx.imageSmoothingEnabled = false
            if(tile) {
                ctx.ctx.drawImage(tile._img,i*this._scale,j*this._scale, this._scale, this._scale)
            }
        })
        if(this.doc.map_grid_visible) draw_grid(ctx,this.size(),this._scale)
    }

    input(e: CommonEvent): void {
        if(e.type === "mousedown" || e.type === "mousedrag") {
            let pt = e.pt.divide_floor(this._scale);
            if(!this.tilemap) return
            let sheet = this.doc.get_selected_sheet()
            let tile = this.doc.get_selected_tile();
            if(tile) {
                this.tilemap.set_pixel(pt.x,pt.y,tile.id)
                this.doc.mark_dirty()
                this.doc.fire('change', tile)
            }
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        if(!this.tilemap) {
            this.set_size(new Size(100,100))
        } else {
            this.set_size(new Size(this.scale()*this.tilemap.w,this.scale()*this.tilemap.h))
        }
        return this.size()
    }

    set_tilemap(selectedMap: Tilemap) {
        this.tilemap = selectedMap
    }
}

class PaletteChooser extends SuperChildView{
    palette: any;
    doc: Doc;
    scale:number;
    constructor(doc, palette) {
        super('palette chooser')
        this.doc = doc
        this.scale = 32;
        this.palette = palette
        this._name = 'palette-chooser'
    }

    draw(ctx: CanvasSurface) {
        if (this.palette) {
            ctx.fillBackgroundSize(this.size(),EMPTY_COLOR)
            for (let i=0; i<this.palette.length; i++) {
                ctx.fillRect(i*this.scale+0.5,0+0.5,this.scale,this.scale,this.palette[i]);
            }
            draw_grid(ctx,this.size(),this.scale)
            let i = this.doc.selected_color;
            let rect = new Rect(i*this.scale+1,1,this.scale-2,this.scale-2);
            draw_selection_rect(ctx,rect)
        }
    }

    input(e: CommonEvent): void {
        let val = e.pt.divide_floor(this.scale).x
        if (val >= 0 && val < this.palette.length) {
            this.doc.selected_color = val;
            this.doc.fire('change',this.doc.selected_color)
            e.ctx.repaint()
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let size = new Size(this.scale*this.palette.length,this.scale)
        this.set_size(size)
        return size
    }
}

function setup_toolbar(doc: Doc, surface: CanvasSurface, popup_layer:LayerView):HBox {
    let toolbar = new HBox();
    toolbar.pad = 0
    toolbar.fill = '#ccc'

    let new_button = new ActionButton('new')
    new_button.on('action',()=>{
        let sheet = new Sheet("sheetx", "the sheet")
        let sprite = new Sprite(gen_id('sprite'),'spritex',8,8, doc)
        sheet.add(sprite)
        let tilemap = new Tilemap(gen_id('tilemap'),'mapx', 16, 16);
        tilemap.set_pixel(0, 0, sprite.id);
        let font = new SpriteFont(gen_id('font'),'somefont',doc)
        let glyph = new SpriteGlyph(gen_id('glyph'),'a',8,8,doc)
        font.glyphs.push(glyph)
        let empty = {
            version:2,
            sheets:[sheet.toJsonObj()],
            maps:[tilemap.toJsonObj()],
            fonts:[font.toJsonObj()]
        }
        doc.reset_from_json(empty)
    })
    toolbar.add(new_button)
    let save_button = new ActionButton("save")
    save_button.on('action',()=>{
        let blob = jsonObjToBlob(doc.toJsonObj())
        forceDownloadBlob(`${doc.name}.json`,blob)
    });
    toolbar.add(save_button);

    let load_button = new ActionButton("load")
    load_button.on('action',()=>{
        console.log("trying to load")
        let input_element = document.createElement('input')
        input_element.setAttribute('type','file')
        input_element.style.display = 'none'
        document.body.appendChild(input_element)
        input_element.addEventListener('change',() => {
            console.log("user picked a file, we hope");
            let files = input_element.files;
            if(files.length <= 0) return;
            let file = files[0]
            console.log(file)
            fileToJSON(file).then(data => {
                doc.reset_from_json(data)
            })
        })
        input_element.click()
    });
    toolbar.add(load_button);

    let export_button = new ActionButton("export")
    export_button.on('action',() => {
        let canvas = document.createElement('canvas')
        let map = doc.get_selected_map()
        canvas.width = map.w*64
        canvas.height = map.h*64
        let ctx = canvas.getContext('2d')
        ctx.fillStyle = 'red'
        ctx.fillRect(0,0,canvas.width,canvas.height);
        map.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let sheet = doc.get_selected_sheet()
            let tile = sheet.sprites.find((t:Sprite) => t.id ===val);
            let x = i*64
            let y = j*64
            tile.forEachPixel((val: number, i: number, j: number) => {
                ctx.fillStyle = doc.palette()[val]
                ctx.fillRect(x+i*8, y+j*8, 8,8);
            });
        })
        canvasToPNGBlob(canvas).then((blob)=> forceDownloadBlob(`${doc.name}@8.png`,blob))
    })
    toolbar.add(export_button);

    let add_font_button = new ActionButton('+ font')
    add_font_button.on('action',()=>{
        let font = new SpriteFont(gen_id('font'),'somefont',doc)
        let glyph = new SpriteGlyph(gen_id('glyph'),'a glyph',8,8,doc)
        glyph.meta.codepoint = 300
        font.glyphs.push(glyph)
        doc.fonts.push(font)
        doc.mark_dirty()
        doc.fire('structure',font)
    })
    toolbar.add(add_font_button)
    let add_sheet_button = new ActionButton('+ sheet')
    add_sheet_button.on('action',()=>{
        let sheet = new Sheet("sheetx", "the sheet")
        let sprite = new Sprite(gen_id('sprite'),'spritex',8,8,doc)
        sheet.add(sprite)
        doc.sheets.push(sheet)
        doc.mark_dirty()
        doc.fire('structure',sheet)
    })
    toolbar.add(add_sheet_button)

    let add_tilemap_button = new ActionButton('+ tilemap')
    add_tilemap_button.on('action',()=>{
        let tilemap = new Tilemap(gen_id('tilemap'),'mapx', 16, 16);
        doc.maps.push(tilemap)
        doc.mark_dirty()
        doc.fire('structure',tilemap)
    })
    toolbar.add(add_tilemap_button)
    let dirty_label = new CustomLabel("initial-text",()=>{
        return doc.dirty()?"dirty":"clean"
    });
    toolbar.add(dirty_label)

    let change_palette_button = new ActionButton('palette')
    change_palette_button.on('action',()=>{

        let popup = new PopupContainer();
        let popup_box = new VBox()
        popup_box.vflex = false
        let grayscale_button = new ActionButton('grayscale')
        grayscale_button.on('action',()=>{
            doc.set_palette(GRAYSCALE_PALETTE)
            popup.hide()
        })
        popup_box.add(grayscale_button)

        let inverted_button = new ActionButton('inverted')
        inverted_button.on('action',()=>{
            doc.set_palette(INVERTED_PALETTE)
            popup.hide()
        })
        popup_box.add(inverted_button)

        let demichrome = new ActionButton('demichrome')
        demichrome.on('action',()=>{
            doc.set_palette(DEMI_CHROME)
            popup.hide()
        })
        popup_box.add(demichrome)

        let cherry_blossom = new ActionButton('cherry blossom')
        cherry_blossom.on('action',()=>{
            doc.set_palette(CHERRY_BLOSSOM)
            popup.hide()
        })
        popup_box.add(cherry_blossom)

        let dune = new ActionButton('dune')
        dune.on('action',()=>{
            doc.set_palette(DUNE)
            popup.hide()
        })
        popup_box.add(dune)

        popup.add(popup_box)
        popup_layer.add(popup)
        popup.open_at(500,50);
    })
    toolbar.add(change_palette_button)

    let doc_name_edit = new TextLine()
    doc_name_edit.set_pref_width(200)
    doc_name_edit.set_text('unknownprojectx')
    doc_name_edit.on('action',(text)=>{
        doc.name = text
    })
    toolbar.add(doc_name_edit)
    doc.addEventListener('reload',() => {
        doc_name_edit.set_text(doc.name)
    })

    return toolbar
}

//expands all children to fill the view
//choose one to be visible based on the selected-tree-item
class SinglePanel extends SuperParentView {
    private doc: Doc;
    private pad: number;
    constructor(doc:Doc) {
        super('panel-view')
        this.doc = doc
        this._name = 'single-panel'
        this.pad = 0
    }
    override draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),StandardPanelBackgroundColor)
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let av = available.shrink(this.pad)
        this._children.forEach(ch => {
            ch.layout2(g,av)
            ch.set_position(new Point(this.pad,this.pad))
        })
        let item = this.doc.selected_tree_item
        if(item) {
            this._children.forEach(ch => {
                // @ts-ignore
                ch._visible = false
                // @ts-ignore
                if (item instanceof Sheet && ch.name() === 'sheet-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
                // @ts-ignore
                if(item instanceof Tilemap && ch.name() === 'map-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
                if(item instanceof SpriteFont && ch.name() === 'font-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
            })
        }
        this.set_size(available)
        return available
    }
}

class TextLine extends SuperChildView {
    private text: string;
    private cursor: number;
    private pref_width: number;
    constructor() {
        super(gen_id("text-line"));
        this._name = '@text-line'
        this.text = "abc"
        this.pref_width = 100
        this.cursor = this.text.length
    }
    draw(g: CanvasSurface): void {
        let bg = '#ddd'
        if(g.is_keyboard_focus(this)) bg = 'white'
        g.fillBackgroundSize(this.size(),bg)
        g.strokeBackgroundSize(this.size(),'black')
        if(g.is_keyboard_focus(this)) {
            g.ctx.fillStyle = StandardTextColor
            g.ctx.font = StandardTextStyle
            let parts = this._parts()
            let bx = 5
            let ax = bx + g.measureText(parts.before,'base').w
            g.fillStandardText(parts.before,bx,20,'base')
            g.fillStandardText(parts.after,ax,20,'base')
            g.ctx.fillStyle = 'black'
            g.ctx.fillRect(ax, 2, 2, 20)
        } else {
            g.fillStandardText(this.text, 5, 20,'base');
        }
    }
    override input(event: CommonEvent) {
        if(event.type === 'mousedown') {
            event.ctx.set_keyboard_focus(this)
        }
        if(event.type === 'keydown') {
            let code = event.details.code
            let key = event.details.key
            // this.log("got a keypress",event.details)
            if(code === 'KeyD' && event.details.ctrl) return this.delete_right()
            if(code === 'Backspace') return this.delete_left()
            if(code === 'ArrowLeft') return this.cursor_left()
            if(code === 'ArrowRight') return this.cursor_right()
            if(code === 'Enter') {
                event.ctx.release_keyboard_focus(this)
                this.fire('action',this.text)
                return
            }
            if(key && key.length === 1) this.insert(key)
        }
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.pref_width,26))
        if(this.hflex) {
            this.size().w = available.w
        }
        return this.size()
    }

    private insert(key:string) {
        let parts = this._parts()
        this.text = `${parts.before}${key}${parts.after}`
        this.cursor_right()
    }

    private delete_left() {
        let parts = this._parts()
        this.text = `${parts.before.slice(0,parts.before.length-1)}${parts.after}`
        this.cursor_left()
    }
    private delete_right() {
        let parts = this._parts()
        this.text = `${parts.before}${parts.after.slice(1)}`
    }
    private cursor_left() {
        this.cursor -= 1
        if(this.cursor < 0) this.cursor = 0
    }
    private cursor_right() {
        this.cursor += 1
        if(this.cursor > this.text.length) this.cursor = this.text.length
    }
    private _parts() {
        return {
            before :this.text.slice(0,this.cursor),
            after : this.text.slice(this.cursor),
        }
    }
    set_text(name: string) {
        this.text = name
        this.cursor = this.text.length
    }
    set_pref_width(w: number) {
        this.pref_width = w
    }
}

function make_sheet_editor_view(doc: Doc) {
    let sheet_editor = new HBox()
    sheet_editor._name = 'sheet-editor-view'

    let vb1 = new VBox()
    let palette_chooser = new PaletteChooser(doc,doc.palette());
    vb1.add(palette_chooser);

    // tile editor, edits the current tile
    let tile_editor = new TileEditor(doc, doc.palette());
    vb1.add(tile_editor)
    let tile_name_editor = new TextLine()
    tile_name_editor.set_pref_width(200)
    vb1.add(tile_name_editor)
    tile_name_editor.on('action',(text) => {
        let tile = doc.get_selected_tile()
        if(tile) {
            tile.name = text
        }
    })
    doc.addEventListener('change',() => {
        let tile = doc.get_selected_tile()
        if(tile) {
            tile_editor.set_sprite(tile)
            tile_name_editor.set_text(tile.name)
        }
    })
    let bucket_button = new ActionButton('fill once')
    bucket_button.on('action',()=>{
        tile_editor.next_click_fill()
    })
    vb1.add(bucket_button)
    sheet_editor.add(vb1)

    let vb2 = new VBox()
    let add_tile_button = new ActionButton("add tile")
    add_tile_button.on('action',()=>{
        let sheet = doc.get_selected_sheet()
        sheet.add(new Sprite(gen_id("tile"), 'tilename',8, 8, doc));
        doc.mark_dirty()
        doc.fire('change', "added a tile");
    });


    let tb = new HBox()
    tb.hflex = false
    tb.add(add_tile_button)
    tb.add(new Label("   "))
    tb.add(new Label("name"))
    let sheet_name_edit = new TextLine()
    sheet_name_edit.set_pref_width(200)
    sheet_name_edit.set_text(doc.get_selected_sheet().name)
    tb.add(sheet_name_edit)
    sheet_name_edit.on("action",(name) => {
        doc.get_selected_sheet().name = name
    })
    vb2.add(tb);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector(doc)
    vb2.add(sprite_selector);
    sheet_editor.add(vb2)

    let vb3 = new VBox()
    let scratch_map = new MapEditor(doc, 32)
    let tm = new Tilemap(gen_id('scratch-tilemap'),'scratch',5,5)
    scratch_map.set_tilemap(tm)
    vb3.add(scratch_map)
    sheet_editor.add(vb3)

    doc.addEventListener('main-selection',() => {
        let sheet = doc.get_selected_sheet()
        if(sheet) sheet_name_edit.set_text(sheet.name)
    })

    return sheet_editor
}

function make_map_view(doc: Doc) {
    let map_view = new VBox()
    map_view._name = 'map-editor-view'
    map_view.hflex = true
    map_view.vflex = true

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor(doc, 16);
    map_editor.set_tilemap(doc.get_selected_map())

    let selector = new TileSelector(doc)
    selector.hflex = false

    let toolbar = new HBox()
    toolbar.fill = '#ccc'
    toolbar.hflex = true
    let grid_toggle = new ToggleButton("grid")
    grid_toggle.on('action',()=>{
        doc.map_grid_visible = !doc.map_grid_visible;
        grid_toggle.selected = doc.map_grid_visible;
        doc.fire("change", grid_toggle.selected);
    });
    toolbar.add(grid_toggle)

    let zoom = 6
    let zoom_in = new ActionButton('+')
    zoom_in.on('action',()=>{
        zoom += 1
        map_editor.set_scale(Math.pow(2,zoom))
    })
    toolbar.add(zoom_in)
    let zoom_out = new ActionButton('-')
    zoom_out.on('action',()=>{
        zoom -= 1
        map_editor.set_scale(Math.pow(2,zoom))
    })
    toolbar.add(zoom_out)


    toolbar.add(new Label("name"))
    let map_name_edit = new TextLine()
    map_name_edit.set_pref_width(200)
    if(doc.get_selected_map()) {
        map_name_edit.set_text(doc.get_selected_map().name)
    }
    map_name_edit.on("action",(name) => {
        if(doc.get_selected_map()) doc.get_selected_map().name = name
    })
    toolbar.add(map_name_edit)


    map_view.add(toolbar)
    let hb = new HBox()
    let scroll = new ScrollView()
    scroll.hflex = true
    scroll.vflex = true
    scroll.set_content(map_editor)
    hb.add(scroll)
    hb.add(selector)
    map_view.add(hb)

    doc.addEventListener('main-selection',() => {
        let map = doc.get_selected_map()
        if(map) {
            map_name_edit.set_text(map.name)
            map_editor.set_tilemap(map)
        }
    })

    return map_view
}

class GlyphChooser extends SuperChildView {
    private doc: Doc;
    private scale: number;
    private wrap: number;
    constructor(doc: Doc) {
        super('glyph-chooser')
        this.doc = doc
        this.scale = 32;
        this.wrap = 20
        this._name = 'glyph-chooser'
    }
    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(), EMPTY_COLOR);
        let font = this.doc.get_selected_font()
        if(font) {
            font.glyphs.forEach((glyph,s)=>{
                let pt = wrap_number(s, this.wrap);
                draw_sprite(glyph, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.font_palette)
            })
        }
        draw_grid(g,this.size(),this.scale);
        let pt = wrap_number(this.doc.selected_glyph,this.wrap);
        draw_selection_rect(g,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }
    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        let val = pt.x + pt.y * this.wrap;
        let font = this.doc.get_selected_font()
        if(val >= 0 && val < font.glyphs.length) {
            this.doc.selected_glyph = val;
            this.doc.fire('change', this.doc.selected_glyph)
        }
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.wrap*this.scale,6*this.scale))
        return this.size()
    }
}

class FontPreview extends SuperChildView {
    private text: string;
    private doc: any;
    constructor(doc) {
        super(gen_id('font-preview'))
        this.text = 'abc123'
        this.doc = doc
    }

    set_text(text: string) {
        this.text = text
    }

    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),'white')
        g.strokeBackgroundSize(this.size(),'black')
        let font = this.doc.get_selected_font()
        if(!font) return
        let x = 20
        let y = 20
        let s = 8*2
        g.ctx.imageSmoothingEnabled = false
        for(let i=0; i<this.text.length; i++) {
            let cp = this.text.codePointAt(i)
            let glyph = font.glyphs.find(g => g.meta.codepoint == cp)
            if(glyph) {
                let left = glyph.meta.left
                let right = glyph.meta.right
                let baseline = glyph.meta.baseline
                let w = glyph.w
                let h = glyph.h
                g.ctx.drawImage(glyph._img,
                    left,0,w-left-right,h,
                    x-left, y+baseline*2,
                    (w-left-right)*2,h*2)
                x += (w-left-right)*2 + 2
            } else {
                g.ctx.fillStyle = 'black'
                g.ctx.strokeRect(x, y, s,s)
                x += (s+2)
            }
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(500,100))
        return this.size()
    }

}

function make_font_view(doc: Doc) {
    let panel = new HBox()
    panel._name = 'font-editor-view'
    panel.fill = StandardPanelBackgroundColor
    panel.hflex = true
    panel.vflex = true

    let col1 = new VBox()
    col1.vflex = true
    col1.hflex = false
    //show number of glyphs
    let glyph_count_label = new CustomLabel("",()=>{
        let font = doc.get_selected_font()
        if(font) return font.glyphs.length+""
        return "?"
    })
    col1.add(glyph_count_label)


    let palette_chooser = new PaletteChooser(doc,doc.font_palette);
    col1.add(palette_chooser);

    let editor = new TileEditor(doc,doc.font_palette)
    col1.add(editor)


    let row1 = new HBox()
    row1.hflex = false
    //show id of the glyph
    row1.add(new Label("id"))
    let id_label = new CustomLabel("id",()=>{
        let glyph = doc.get_selected_glyph()
        if(glyph) return glyph.id
        return "???"
    })
    row1.add(id_label)
    col1.add(row1)

    let row2 = new HBox()
    row2.hflex = false
    row2.add(new Label("name"))
    //edit name of the glyph
    let name_box = new TextLine()
    name_box.on('action',(text) => {
        let glyph = doc.get_selected_glyph()
        if(glyph) glyph.name = text
    })
    row2.add(name_box)
    col1.add(row2)

    let row3 = new HBox()
    row3.hflex = false
    //edit codepoint of the glyph
    row3.add(new Label("codepoint"))
    let codepoint_edit = new TextLine()
    codepoint_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        if(glyph && parseInt(text)) glyph.meta.codepoint = parseInt(text)
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row3.add(codepoint_edit)
    col1.add(row3)

    let row4 = new HBox()
    row4.hflex = false
    row4.add(new Label("left"))
    let left_edit = new TextLine()
    left_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.left = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row4.add(left_edit)
    row4.add(new Label("right"))
    let right_edit = new TextLine()
    right_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.right = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row4.add(right_edit)
    col1.add(row4)

    let row5 = new HBox()
    row5.hflex = false
    row5.add(new Label('baseline'))
    let baseline_text = new TextLine()
    baseline_text.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.baseline = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row5.add(baseline_text)
    col1.add(row5)
    panel.add(col1)

    let col2 = new VBox()
    col2.vflex = true
    col2.hflex = false

    let toolbar = new HBox()
    toolbar.hflex = false
    let add_glyph_button = new ActionButton("add glyph")
    add_glyph_button.on('action',()=>{
        let font = doc.get_selected_font()
        let glyph = new SpriteGlyph(gen_id('glyph'),'glyphname',8,8, doc)
        glyph.meta.codepoint = 400
        font.add(glyph)
        doc.set_selected_glyph(glyph)
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(add_glyph_button)

    let sort_glyphs = new ActionButton('sort')
    sort_glyphs.on('action',()=>{
        let font = doc.get_selected_font()
        font.glyphs.sort((a,b)=>{
            return a.meta.codepoint - b.meta.codepoint
        })
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(sort_glyphs)


    toolbar.add(new Label("name"))
    let font_name_edit = new TextLine()
    font_name_edit.set_pref_width(200)
    if(doc.get_selected_font()) {
        font_name_edit.set_text(doc.get_selected_font().name)
    }
    font_name_edit.on("action",(name) => {
        if(doc.get_selected_font()) doc.get_selected_font().name = name
    })
    toolbar.add(font_name_edit)

    col2.add(toolbar)

    doc.addEventListener('change',() => {
        let glyph = doc.get_selected_glyph()
        if(glyph) {
            editor.set_sprite(glyph)
            name_box.set_text(glyph.name)
            codepoint_edit.set_text(glyph.meta.codepoint+"")
            left_edit.set_text(glyph.meta.left+"")
            right_edit.set_text(glyph.meta.right+"")
            baseline_text.set_text(glyph.meta.baseline+"")
        }
    })
    col2.add(new GlyphChooser(doc))

    let preview_box = new TextLine()
    preview_box.set_text('abc123')
    preview_box.hflex = false
    preview_box.set_pref_width(400)
    col2.add(preview_box)
    let preview_canvas = new FontPreview(doc)
    preview_canvas.set_text('abc123')
    col2.add(preview_canvas)
    preview_box.on("action",(text)=>{
        preview_canvas.set_text(text)
    })

    panel.add(col2)

    doc.addEventListener('main-selection',() => {
        let font = doc.get_selected_font()
        if(font) font_name_edit.set_text(font.name)
    })

    return panel
}


export function start() {
    let root = new LayerView('root-layer')
    let popup_layer = new LayerView('popup-layer')

    log("starting")
    let All = new Observable();

    let surface = new CanvasSurface(1200,700);
    surface.debug = false
    let doc = new Doc();
    doc.check_backup();
    let timeout_id = 0
    function check_dirty() {
        if(doc.dirty()) {
            doc.persist()
            surface.repaint()
        }
    }
    surface.on_input((e)=>{
        clearTimeout(timeout_id)
        timeout_id = setTimeout(check_dirty,2000)
    })
    //draws border
    let main_view = new VBox()
    main_view.pad = 0
    main_view._name = 'main-view'
    main_view.hflex = true
    main_view.vflex = true

    //label at the top
    let main_label = new Header('Tile Map Editor')
    main_view.add(main_label);

    let toolbar = setup_toolbar(doc, surface, popup_layer);
    toolbar.id = 'toolbar'
    main_view.add(toolbar);

    let hb = new HBox()
    hb._name = 'main-col'
    hb.vflex = true
    hb.hflex = true
    hb.fill = 'red'
    hb.pad = 0
    main_view.add(hb)

    function rebuild_data(doc) {
        let data = []
        doc.fonts.forEach(font => data.push(font))
        doc.sheets.forEach(sheet => data.push(sheet))
        doc.maps.forEach(map => data.push(map))
        return data
    }
    let data = rebuild_data(doc)
    let itemlist = new SelectList(data,(item)=>{
        if (item instanceof Sheet) {
            return (item as Sheet).name
        }
        if (item instanceof Sprite) {
            return (item as Sprite).id
        }
        if (item instanceof Tilemap) {
            return (item as Tilemap).name
        }
        if (item instanceof SpriteFont) {
            return(item as SpriteFont).name
        }
        return "???"
    })
    // @ts-ignore
    itemlist.on('change',(item,i)  => {
        doc.selected_tree_item = item
        doc.selected_tree_item_index = i
        if (item instanceof Sheet) {
            doc.set_selected_sheet(item as Sheet)
        }
        if (item instanceof Tilemap) {
            doc.set_selected_map(item as Tilemap)
        }
        if (item instanceof SpriteFont) {
            doc.set_selected_font(item as SpriteFont)
        }
    })
    hb.add(itemlist)

    let panel_view = new SinglePanel(doc);
    panel_view._name = 'single panel'
    hb.add(panel_view)

    let sheet_editor = make_sheet_editor_view(doc);
    panel_view.add(sheet_editor)


    let map_view = make_map_view(doc)
    panel_view.add(map_view)

    panel_view.add(make_font_view(doc))


    doc.addEventListener('change',() => {
        surface.repaint();
    });
    doc.addEventListener('reload',() => {
        let data = rebuild_data(doc)
        itemlist.set_data(data)
        surface.repaint()
    })
    doc.addEventListener('structure',() => {
        let data = rebuild_data(doc)
        itemlist.set_data(data)
        surface.repaint()
    })
    doc.addEventListener('main-selection',() => {
        console.log("main selection changed. refresh the view")
    })

    root.add(main_view)
    root.add(popup_layer)
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()
}
function draw_selection_rect(g: CanvasSurface, rect: Rect) {
    ['red', 'white', 'black'].forEach((color, i) => {
        g.ctx.strokeStyle = color
        g.ctx.strokeRect(rect.x + i + 0.5, rect.y + i + 0.5, rect.w - i * 2, rect.h - i * 2);
    })
}
function draw_grid(g: CanvasSurface, size: Size, step: number) {
    //draw the grid
    g.ctx.beginPath();
    for (let i = 0; i <= size.w; i += step) {
        g.ctx.moveTo(i + 0.5, 0);
        g.ctx.lineTo(i + 0.5, size.h);
    }
    for (let i = 0; i <= size.h; i += step) {
        g.ctx.moveTo(0, i + 0.5);
        g.ctx.lineTo(size.w, i + 0.5);
    }
    g.ctx.strokeStyle = 'black';
    g.ctx.lineWidth = 1;
    g.ctx.stroke();
}
