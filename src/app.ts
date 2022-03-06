import {BaseParentView, ActionButton, HBox, Label, ToggleButton, SelectList, CustomLabel, BaseView} from "./uilib/components";
import {
    canvasToPNGBlob, fileToJSON,
    forceDownloadBlob,
    jsonObjToBlob,
    on
} from "./util";
import {Doc, draw_sprite, Sheet, Sprite} from "./app-model";
import {
    CanvasSurface,
    CommonEvent,
    EVENTS,
    log,
    ParentView,
    setup_keyboard_input,
    View
} from "./uilib/canvas";
import {StandardPanelBackgroundColor, StandardSelectionColor} from "./style";
import {Callback, gen_id, Observable, Point, Rect} from "./uilib/common";

export const EMPTY_COLOR = '#62fcdc'

class TileEditor extends BaseView {
    children: View[];
    doc: Doc;
    scale: number

    constructor() {
        super(new Rect(0, 0, 32 * 8 + 1, 32 * 8 + 1))
        this.id = 'tile editor'
        this.scale = 32;
        this.children = []
    }

    draw(g: CanvasSurface) {
        //clear the background
        g.fillBackground(this._bounds, 'white');
        //draw each pixel in the tile as a rect
        let sprite = this.doc.get_selected_tile()
        let palette = this.doc.palette;
        if (sprite) {
            sprite.forEachPixel((val: number, i: number, j: number) => {
                g.ctx.fillStyle = palette[val]
                g.ctx.fillRect(i * this.scale, j * this.scale, this.scale, this.scale)
            });
        }

        draw_grid(g, this._bounds, this.scale)
    }

    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        let tile = this.doc.get_selected_tile()
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

    layout(g: CanvasSurface, parent: View): void {
    }
}

class TileSelector implements View {
    _bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    scale: number;

    constructor() {
        this.scale = 32;
        this._bounds = new Rect(0, 0, 8 * this.scale, 8 * this.scale)
        this.children = []
        this.id = 'tile selector'
    }

    on(type: string, cb: Callback): void {
        throw new Error("Method not implemented.");
    }
    off(type: string, cb: Callback): void {
        throw new Error("Method not implemented.");
    }
    name(): string {
        throw new Error("Method not implemented.");
    }

    draw(g: CanvasSurface) {
        g.fillBackground(this._bounds,EMPTY_COLOR);
        let sheet = this.doc.get_selected_sheet()
        if(sheet) {
            sheet.sprites.forEach((sprite, s) => {
                let pt = wrap_number(s, 8);
                draw_sprite(sprite, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc)
            })
        }
        draw_grid(g,this._bounds,this.scale);
        let pt = wrap_number(this.doc.selected_tile,8);
        draw_selection_rect(g,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }

    bounds(): Rect {
        return this._bounds
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


    layout(g: CanvasSurface, parent: View): void {
    }

    visible(): boolean {
        return true;
    }
}

function wrap_number(num:number,width:number):Point {
    return new Point(
        num % width,
        Math.floor(num/8)
    )
}

class MapEditor implements  View {
    _bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    _scale:number;

    constructor(doc:Doc) {
        this.doc = doc
        this.id = 'map-editor'
        this._scale = 64;
        this.children = []
        this._bounds = new Rect(0,0,8*this._scale,8*this._scale)
    }

    scale() {
        return this._scale
    }
    set_scale(scale) {
        this._scale = scale
        this._bounds.w = this._scale*8
        this._bounds.h = this._scale*8
    }

    visible(): boolean {
        return true;
    }
    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this._bounds,EMPTY_COLOR)
        let map = this.doc.get_selected_map()
        if (!map) return;
        map.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let sheet = this.doc.get_selected_sheet()
            let tile = sheet.sprites.find((t:Sprite) => t.id ===val);
            draw_sprite(tile,ctx,i*this._scale,j*this._scale,this._scale/8,this.doc)
        })
        if(this.doc.map_grid_visible) draw_grid(ctx,this._bounds,this._scale)
    }

    bounds(): Rect {
        return this._bounds
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

    layout(g: CanvasSurface, parent: View): void {
        let map = this.doc.get_selected_map()
        if(!map) {
            this._bounds.w = 100
            this._bounds.h = 100
            return
        }

        this._bounds.w = this._scale * map.w
        this._bounds.h = this._scale * map.h
    }

    name(): string {
        return "";
    }

    off(type: string, cb: Callback): void {
    }

    on(type: string, cb: Callback): void {
    }

}

class PaletteChooser implements View {
    _bounds: Rect;
    children: View[];
    id: string;
    palette: any;
    doc: Doc;
    scale:number;
    constructor() {
        this.id = 'palette chooser';
        this.children = [];
        this.scale = 32;
        this._bounds = new Rect(0,0,this.scale*8,this.scale);
    }

    visible(): boolean {
        return true;
    }

    draw(ctx: CanvasSurface) {
        if (this.palette) {
            ctx.fillBackground(this._bounds,EMPTY_COLOR)
            for (let i=0; i<5; i++) {
                ctx.fillRect(i*this.scale+0.5,0+0.5,this.scale,this.scale,this.palette[i]);
            }
            draw_grid(ctx,this._bounds,this.scale)
            let i = this.doc.selected_color;
            let rect = new Rect(i*this.scale+1,1,this.scale-2,this.scale-2);
            draw_selection_rect(ctx,rect)
        }
    }

    bounds(): Rect {
        return this._bounds
    }

    input(e: CommonEvent): void {
        let val = e.pt.divide_floor(this.scale).x
        if (val >= 0 && val < this.doc.palette.length) {
            this.doc.selected_color = val;
            this.doc.fire('change',this.doc.selected_color)
            e.ctx.repaint()
        }
    }

    layout(g: CanvasSurface, parent: View): void {
    }

    name(): string {
        return "";
    }

    off(type: string, cb: Callback): void {
    }

    on(type: string, cb: Callback): void {
    }

}

function setup_toolbar(doc: Doc, surface: CanvasSurface):HBox {
    let toolbar = new HBox();

    let new_button = new ActionButton('new',()=>{
        let sprite = new Sprite('spritex',8,8)
        let sheet = new Sheet("sheetx", "the sheet")
        sheet.add(new Sprite('spritex',8,8))
        let tilemap = new Sprite('mapx', 16, 16);
        tilemap.set_pixel(0, 0, 'spritex');
        let empty = {
            version:1,
            sheets:[
                sheet.toJsonObj(),
            ],
            maps:[
                tilemap.toJsonObj()
            ],
            fonts:[]
        }
        doc.reset_from_json(empty)
    })
    new_button._bounds.w = 50
    toolbar.add(new_button)
    let save_button = new ActionButton("save",()=>{
        let blob = jsonObjToBlob(doc.toJsonObj())
        forceDownloadBlob('project.json',blob)
    });
    save_button._bounds.w = 60
    toolbar.add(save_button);

    let load_button = new ActionButton("load",()=>{
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
    load_button._bounds.w = 60
    toolbar.add(load_button);

    let export_button = new ActionButton("export",() => {
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
    export_button._bounds.w = 70
    toolbar.add(export_button);

    let dirty_label = new CustomLabel("initial-text",()=>{
        return doc.dirty()?"dirty":"clean"
    });
    toolbar.add(dirty_label)

    return toolbar
}

class MainView extends BaseParentView {
    constructor() {
        super('main',new Rect(0,0,100,100));
    }
    override layout(g: CanvasSurface, parent: View) {
        this._bounds.x = 0;
        this._bounds.y = 0;
        this._bounds.w = g.canvas.width
        this._bounds.h = g.canvas.height


        let margin = 10
        this.children.forEach(ch => {
            // @ts-ignore
            if (ch.id === 'tree') {
                let b = ch.bounds()
                b.x = margin
                b.y = 50
                b.w = 150
                b.h = this._bounds.h - b.y - margin
            }
            // @ts-ignore
            if (ch.id === 'app-title') {
                let b = ch.bounds()
                b.x = margin
                b.y = margin
                // b.w = 100
                b.h = 30
            }
            // @ts-ignore
            if (ch.id === 'toolbar') {
                let b = ch.bounds()
                b.x = 150
                b.y = 10
            }
            // @ts-ignore
            if (ch.id === 'panel-view') {
                let b = ch.bounds()
                b.x = 160
                b.y = 50
                b.w = this._bounds.w - 160
                b.h = this._bounds.h - 50
            }
        })

    }
}

class SinglePanel extends BaseParentView {
    private doc: Doc;
    constructor(doc:Doc) {
        super('panel-view', new Rect(200,100,500,500));
        this.doc = doc
    }
    override draw(g: CanvasSurface) {
        g.fillBackground(this.bounds(),StandardPanelBackgroundColor)
    }

    override layout(g: CanvasSurface, parent: View) {
        this.children.forEach(ch => {
            ch.bounds().x = 0;
            ch.bounds().y = 0;
            ch.bounds().w = this.bounds().w
            ch.bounds().h = this.bounds().h
        })
        let item = this.doc.selected_tree_item
        if(item) {
            this.children.forEach(ch => {
                // @ts-ignore
                ch.set_visible(false)
                // @ts-ignore

                if (item instanceof Sheet && ch.id === 'sheet-editor-view') {
                    // @ts-ignore
                    ch.set_visible(true)
                }
                // @ts-ignore
                if(item instanceof Sprite && ch.id === 'map-editor-view') {
                    // @ts-ignore
                    ch.set_visible(true)
                }
            })
        }
    }
}
class SheetEditorView extends BaseParentView {
    constructor() {
        super('sheet-editor-view',new Rect(0,0,100,100));
    }
}
class MapEditorView extends BaseParentView {
    constructor() {
        super('map-editor-view',new Rect(0,0,100,100));
    }
}

function make_sheet_editor_view(doc: Doc) {
    let sheet_editor = new SheetEditorView();
    let palette_chooser = new PaletteChooser();
    palette_chooser.doc = doc;
    palette_chooser.palette = doc.palette;
    palette_chooser._bounds.y = 0
    sheet_editor.add(palette_chooser);

    // tile editor, edits the current tile
    let tile_editor = new TileEditor();
    tile_editor.doc = doc;
    tile_editor._bounds.y = palette_chooser._bounds.bottom() + 10;
    tile_editor._bounds.x = 0
    sheet_editor.add(tile_editor)

    let add_tile_button = new ActionButton("add tile",()=>{
        let sheet = doc.get_selected_sheet()
        sheet.add(new Sprite(gen_id("tile"), 8, 8));
        doc.mark_dirty()
        doc.fire('change', "added a tile");
    });
    add_tile_button._bounds.y = tile_editor._bounds.bottom() + 10;
    sheet_editor.add(add_tile_button);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector()
    sprite_selector.doc = doc;
    sprite_selector._bounds.y = add_tile_button._bounds.bottom() + 10;
    sheet_editor.add(sprite_selector);
    return sheet_editor
}

function make_map_view(doc: Doc) {
    let map_view = new MapEditorView()


    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor(doc);
    map_editor._bounds.x = 40
    map_editor._bounds.y = 40
    map_view.add(map_editor);

    let selector = new TileSelector()
    selector.doc = doc;
    selector._bounds.x = map_editor.bounds().right()
    map_view.add(selector)

    let toolbar = new HBox()
    let grid_toggle = new ToggleButton("grid",()=>{
        doc.map_grid_visible = !doc.map_grid_visible;
        grid_toggle.selected = doc.map_grid_visible;
        doc.fire("change", grid_toggle.selected);
    });
    toolbar.add(grid_toggle)

    let zoom = 6
    let zoom_in = new ActionButton('+',()=>{
        zoom += 1
        map_editor.set_scale(Math.pow(2,zoom))
    })
    toolbar.add(zoom_in)
    let zoom_out = new ActionButton('-',()=>{
        zoom -= 1
        map_editor.set_scale(Math.pow(2,zoom))
    })
    toolbar.add(zoom_out)

    toolbar._bounds.x = 0;
    toolbar._bounds.y = 0;
    map_view.add(toolbar)
    return map_view
}

export function start() {
    log("starting")
    let All = new Observable();

    let surface = new CanvasSurface(1024,768);
    let KeyboardInput = setup_keyboard_input()
    on(KeyboardInput,EVENTS.KEYDOWN,(e)=>{
        if(e.type === 'keydown' && e.key == 'D' && e.shiftKey) {
            surface.debug = !surface.debug
            surface.repaint()
        }
    })

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
    let main_view = new MainView()

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
        return "???"
    })
    // @ts-ignore
    itemlist.on('change',(item,i)  => {
        doc.selected_tree_item = item
        doc.selected_tree_item_index = i
        if (item instanceof Sheet) {
            doc.set_selected_sheet(item as Sheet)
        }
        if (item instanceof Sprite) {
            doc.set_selected_map(item as Sprite)
        }
    })
    main_view.add(itemlist)


    //label at the top
    let main_label = new Label("tile map editor");
    main_label.id = 'app-title'
    main_label._bounds.y = 0
    main_view.add(main_label);

    let toolbar = setup_toolbar(doc, surface);
    toolbar.id = 'toolbar'
    main_view.add(toolbar);

    let panel_view = new SinglePanel(doc);
    main_view.add(panel_view)

    let sheet_editor = make_sheet_editor_view(doc);
    panel_view.add(sheet_editor)


    let map_view = make_map_view(doc)
    panel_view.add(map_view)


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
    surface.repaint()
}
function draw_selection_rect(g: CanvasSurface, rect: Rect) {
    ['red', 'white', 'black'].forEach((color, i) => {
        g.ctx.strokeStyle = color
        g.ctx.strokeRect(rect.x + i + 0.5, rect.y + i + 0.5, rect.w - i * 2, rect.h - i * 2);
    })
}
function draw_grid(g: CanvasSurface, bounds: Rect, step: number) {
    //draw the grid
    g.ctx.beginPath();
    for (let i = 0; i <= bounds.w; i += step) {
        g.ctx.moveTo(i + 0.5, 0);
        g.ctx.lineTo(i + 0.5, bounds.h);
    }
    for (let i = 0; i <= bounds.w; i += step) {
        g.ctx.moveTo(0, i + 0.5);
        g.ctx.lineTo(bounds.w, i + 0.5);
    }
    g.ctx.strokeStyle = 'black';
    g.ctx.lineWidth = 1;
    g.ctx.stroke();
}
