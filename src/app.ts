import {
    ActionButton,
    HBox,
    Label,
    ToggleButton,
    SelectList,
    CustomLabel,
    VBox,
    Header,
    ScrollView
} from "./uilib/components";
import {
    canvasToPNGBlob, fileToJSON,
    forceDownloadBlob,
    jsonObjToBlob,
    on
} from "./util";
import {Doc, draw_sprite, Sheet, Sprite, SpriteFont, SpriteGlyph, Tilemap} from "./app-model";
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

export const EMPTY_COLOR = '#62fcdc'

class TileEditor extends SuperChildView {
    doc: Doc;
    scale: number
    sprite: Sprite
    private palette: string[];
    constructor(doc, palette) {
        super('tile editor')
        this.doc = doc
        this.palette = palette
        this.scale = 32;
        this.sprite = null
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
        tile.set_pixel(pt.x, pt.y, this.doc.selected_color);
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
                draw_sprite(sprite, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.palette)
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

    constructor(doc:Doc) {
        super("map-editor")
        this._name = 'map-editor'
        this._scale = 16;
        this.doc = doc
    }

    scale() {
        return this._scale
    }
    set_scale(scale) {
        this._scale = scale
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackgroundSize(this.size(),EMPTY_COLOR)
        let map = this.doc.get_selected_map()
        if (!map) return;
        map.forEachPixel((val,i,j) => {
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
            let map = this.doc.get_selected_map()
            if(!map) return
            let sheet = this.doc.get_selected_sheet()
            let tile = this.doc.get_selected_tile();
            if(tile) {
                map.set_pixel(pt.x,pt.y,tile.id)
                this.doc.mark_dirty()
                this.doc.fire('change', tile)
            }
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let map = this.doc.get_selected_map()
        if(!map) {
            this.set_size(new Size(100,100))
        } else {
            this.set_size(new Size(this.scale()*map.w,this.scale()*map.h))
        }
        return this.size()
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

function setup_toolbar(doc: Doc, surface: CanvasSurface):HBox {
    let toolbar = new HBox();
    toolbar.pad = 0
    toolbar.fill = '#ccc'

    let new_button = new ActionButton('new')
    new_button.on('action',()=>{
        let sheet = new Sheet("sheetx", "the sheet")
        let sprite = new Sprite(gen_id('sprite'),'spritex',8,8)
        sheet.add(sprite)
        let tilemap = new Tilemap(gen_id('tilemap'),'mapx', 16, 16);
        tilemap.set_pixel(0, 0, sprite.id);
        let font = new SpriteFont(gen_id('font'),'somefont')
        let glyph = new SpriteGlyph(gen_id('glyph'),'a',8,8)
        glyph.meta.codepoint = 65
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
        forceDownloadBlob('project.json',blob)
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
                ctx.fillStyle = doc.palette[val]
                ctx.fillRect(x+i*8, y+j*8, 8,8);
            });
        })
        canvasToPNGBlob(canvas).then((blob)=> forceDownloadBlob(`tileset@1.png`,blob))
    })
    toolbar.add(export_button);

    let dirty_label = new CustomLabel("initial-text",()=>{
        return doc.dirty()?"dirty":"clean"
    });
    toolbar.add(dirty_label)

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
    constructor() {
        super(gen_id("text-line"));
        this._name = '@text-line'
        this.text = "abc"
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
            let ax = bx + g.measureText(parts.before).w
            g.ctx.fillText(parts.before, bx,15)
            g.ctx.fillText(parts.after, ax,15)
            g.ctx.fillRect(ax, 2, 1, 16)
        } else {
            g.fillStandardText(this.text, 5, 15);
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
        this.set_size(new Size(100,20))
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
}

function make_sheet_editor_view(doc: Doc) {
    let sheet_editor = new HBox()
    sheet_editor._name = 'sheet-editor-view'

    let vb1 = new VBox()
    let palette_chooser = new PaletteChooser(doc,doc.palette);
    vb1.add(palette_chooser);

    // tile editor, edits the current tile
    let tile_editor = new TileEditor(doc, doc.palette);
    vb1.add(tile_editor)
    doc.addEventListener('change',() => {
        tile_editor.set_sprite(doc.get_selected_tile())
    })
    sheet_editor.add(vb1)

    let vb2 = new VBox()
    let add_tile_button = new ActionButton("add tile")
    add_tile_button.on('action',()=>{
        let sheet = doc.get_selected_sheet()
        sheet.add(new Sprite(gen_id("tile"), 'tilename',8, 8));
        doc.mark_dirty()
        doc.fire('change', "added a tile");
    });


    let tb = new HBox()
    tb.add(add_tile_button)
    tb.add(new Label("   "))
    tb.add(new Label("id"))
    let tl = new TextLine()
    tl.set_text(doc.get_selected_sheet().name)
    tb.add(tl)
    tl.on("action",(name) => {
        doc.get_selected_sheet().name = name
    })
    vb2.add(tb);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector(doc)
    vb2.add(sprite_selector);
    sheet_editor.add(vb2)
    return sheet_editor
}

function make_map_view(doc: Doc) {
    let map_view = new VBox()
    map_view._name = 'map-editor-view'
    map_view.hflex = true
    map_view.vflex = true

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor(doc);

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


    let tl = new TextLine()
    if(doc.get_selected_map()) {
        tl.set_text(doc.get_selected_map().name)
    }
    toolbar.add(tl)
    tl.on("action",(name) => {
        if(doc.get_selected_map()) doc.get_selected_map().name = name
    })


    map_view.add(toolbar)
    let hb = new HBox()
    let scroll = new ScrollView()
    scroll.hflex = true
    scroll.vflex = true
    scroll.set_content(map_editor)
    hb.add(scroll)
    hb.add(selector)
    map_view.add(hb)
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
        this.text = 'ABsdfasdf'
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
                g.ctx.drawImage(glyph._img, x, y, s,s)
            } else {
                g.ctx.fillStyle = 'black'
                g.ctx.strokeRect(x, y, s,s)
            }
            x += (s+2)
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
    let codepoint_label = new TextLine()
    codepoint_label.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        if(glyph && parseInt(text)) glyph.meta.codepoint = parseInt(text)
    })
    row3.add(codepoint_label)
    col1.add(row3)

    panel.add(col1)

    let col2 = new VBox()
    col2.vflex = true
    col2.hflex = false

    let toolbar = new HBox()
    toolbar.hflex = false
    let add_glyph_button = new ActionButton("add glyph")
    add_glyph_button.on('action',()=>{
        let font = doc.get_selected_font()
        let glyph = new SpriteGlyph(gen_id('glyph'),'glyphname',8,8)
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
    col2.add(toolbar)

    doc.addEventListener('change',() => {
        let glyph = doc.get_selected_glyph()
        if(glyph) {
            editor.set_sprite(glyph)
            name_box.set_text(glyph.name)
            codepoint_label.set_text(glyph.meta.codepoint+"")
        }
    })
    col2.add(new GlyphChooser(doc))

    let preview_box = new TextLine()
    preview_box.set_text('The Lazy Fox')
    preview_box.hflex = true
    col2.add(preview_box)
    let preview_canvas = new FontPreview(doc)
    preview_canvas.set_text('abc123')
    col2.add(preview_canvas)
    preview_box.on("action",(text)=>{
        preview_canvas.set_text(text)
    })

    panel.add(col2)
    return panel
}


export function start() {
    log("starting")
    let All = new Observable();

    let surface = new CanvasSurface(1200,700);
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

    let toolbar = setup_toolbar(doc, surface);
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

    surface.set_root(main_view)
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
