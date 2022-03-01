import {BaseParentView, Button, HBox, Label, ToggleButton} from "./components";
import {canvasToPNGBlob, forceDownloadBlob, gen_id, Observable, on, Point, Rect} from "./util";
import {Doc, draw_sprite, Sprite} from "./app-model";
import {
    CanvasSurface,
    CommonEvent,
    EVENTS,
    InputView,
    log,
    ParentView,
    setup_keyboard_input,
    View
} from "./canvas";

export const EMPTY_COLOR = '#62fcdc'

class TileEditor implements View, InputView {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    scale:number
    constructor() {
        this.id = 'tile editor'
        this.scale = 32;
        this.bounds = new Rect(0,0,this.scale*8 + 1, this.scale*8 + 1)
        this.children = []
    }
    draw(g: CanvasSurface) {
        //clear the background
        g.fillBackground(this.bounds,'white');
        //draw each pixel in the tile as a rect
        let sprite = this.doc.tiles[this.doc.selected_tile];
        let palette = this.doc.palette;
        if (sprite !== null) {
            sprite.forEachPixel((val:number,i:number,j:number) => {
                g.ctx.fillStyle = palette[val]
                g.ctx.fillRect(i*this.scale,j*this.scale,this.scale,this.scale)
            });
        }

        draw_grid(g,this.bounds,this.scale)
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        let tile = this.doc.tiles[this.doc.selected_tile]
        if (e.button == 2) {
            if(e.type === "mousedown") {
                let value = tile.get_pixel(pt.x,pt.y);
                if (typeof value === 'number') {
                    this.doc.selected_color = value
                    this.doc.fire('change', "tile edited");
                }
            }
            return
        }
        tile.set_pixel(pt.x, pt.y, this.doc.selected_color);
        this.doc.fire('change', "tile edited");
    }

    is_input_view(): boolean {
        return true;
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

class TileSelector implements View, InputView {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    scale:number;
    constructor() {
        this.scale = 32;
        this.bounds = new Rect(0,0,8*this.scale,8*this.scale)
        this.children = []
        this.id = 'tile selector'
    }

    draw(g: CanvasSurface) {
        g.fillBackground(this.bounds,EMPTY_COLOR);
        this.doc.tiles.forEach((sprite,s)=>{
            let pt = wrap_number(s,8);
            draw_sprite(sprite,g,pt.x*this.scale,pt.y*this.scale,4, this.doc)
        })
        draw_grid(g,this.bounds,this.scale);
        let pt = wrap_number(this.doc.selected_tile,8);
        draw_selection_rect(g,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(e: CommonEvent): void {
        let pt = e.pt.divide_floor(this.scale);
        let val = pt.x + pt.y * 8;
        if(val >= 0 && val < this.doc.tiles.length) {
            this.doc.selected_tile = val;
            this.doc.fire('change', this.doc.selected_color)
        }
    }

    is_input_view(): boolean {
        return true;
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

function wrap_number(num:number,width:number):Point {
    return new Point(
        num % width,
        Math.floor(num/8)
    )
}

class MapEditor implements  View, InputView {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    // mouse_down: (e: PEvt) => void;
    scale:number;

    constructor() {
        this.id = 'map editor'
        this.scale = 64;
        this.children = []
        this.bounds = new Rect(0,0,16*this.scale,16*this.scale)
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds,EMPTY_COLOR)
        this.doc.tilemap.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let tile = this.doc.tiles.find((t:Sprite) => t.id ===val);
            draw_sprite(tile,ctx,i*this.scale,j*this.scale,8,this.doc)
        })
        if(this.doc.map_grid_visible) draw_grid(ctx,this.bounds,this.scale)
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(e: CommonEvent): void {
        if(e.type === "mousedown" || e.type === "mousedrag") {
            let pt = e.pt.divide_floor(this.scale);
            let tile = this.doc.tiles[this.doc.selected_tile];
            this.doc.tilemap.set_pixel(pt.x,pt.y,tile.id)
            this.doc.fire('change',tile)
        }
    }

    is_input_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }

}

class PaletteChooser implements View, InputView {
    bounds: Rect;
    children: View[];
    id: string;
    palette: any;
    doc: Doc;
    scale:number;
    constructor() {
        this.id = 'palette chooser';
        this.children = [];
        this.scale = 32;
        this.bounds = new Rect(0,0,this.scale*8,this.scale);
    }

    draw(ctx: CanvasSurface) {
        if (this.palette) {
            ctx.fillBackground(this.bounds,EMPTY_COLOR)
            for (let i=0; i<5; i++) {
                ctx.fillRect(i*this.scale+0.5,0+0.5,this.scale,this.scale,this.palette[i]);
            }
            draw_grid(ctx,this.bounds,this.scale)
            let i = this.doc.selected_color;
            let rect = new Rect(i*this.scale+1,1,this.scale-2,this.scale-2);
            draw_selection_rect(ctx,rect)
        }
    }

    get_bounds(): Rect {
        return this.bounds
    }

    input(e: CommonEvent): void {
        let val = e.pt.divide_floor(this.scale).x
        if (val >= 0 && val < this.doc.palette.length) {
            this.doc.selected_color = val;
            this.doc.fire('change',this.doc.selected_color)
        }
    }

    is_input_view(): boolean {
        return true
    }

    layout(g: CanvasSurface, parent: View): void {
    }

}

class WrapperView implements View, ParentView {
    bounds: Rect;
    children: View[];
    id: string;
    constructor(bounds:Rect) {
        this.id = 'wrapper-view'
        this.children = []
        this.bounds = bounds
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds,'green')
    }

    scroll_by(x: number, y: number) {
        let ch = this.children[0].get_bounds();
        ch.x += x;
        ch.y += y;
        if(ch.x >= 0) ch.x = 0;
        if(ch.y >= 0) ch.y = 0;
        let maxy = ch.h - this.bounds.h
        if(maxy < -ch.y) ch.y = - (maxy)
        let maxx = ch.w - this.bounds.w
        if(maxx < -ch.x) ch.x = - (maxx)
    }

    get_bounds(): Rect {
        return this.bounds
    }

    get_children(): View[] {
        return this.children
    }

    is_parent_view(): boolean {
        return true
    }

    clip_children(): boolean {
        return true;
    }

    layout(g: CanvasSurface, parent: View): void {
    }
}

class ScrollView implements View, ParentView, InputView {
    bounds: Rect;
    children: View[];
    id: string;
    private wrapper: WrapperView;
    constructor(bounds:Rect) {
        this.id = 'scroll-view'
        this.children = []
        this.bounds = bounds


        this.wrapper = new WrapperView(new Rect(0,0,this.bounds.w-30,this.bounds.h-30));
        this.children.push(this.wrapper)

        let step = 20;

        let up = new Button("u",(evt:CommonEvent)=>{
            this.wrapper.scroll_by(0,+step);
            evt.ctx.repaint()
        });
        up.bounds = new Rect(this.bounds.w-30,0,30,30);
        this.children.push(up)

        let down = new Button("d",(evt:CommonEvent)=>{
            this.wrapper.scroll_by(0,-step);
            evt.ctx.repaint()
        });
        down.bounds = new Rect(this.bounds.w-30,this.bounds.h-30-30,30,30);
        this.children.push(down);

        let left = new Button('l',(evt:CommonEvent)=>{
            this.wrapper.scroll_by(+step,-0);
            evt.ctx.repaint()
        })
        left.bounds = new Rect(0,this.bounds.h-30,30,30);
        this.children.push(left);


        let right = new Button('r',(evt:CommonEvent)=>{
            this.wrapper.scroll_by(-step,-0);
            evt.ctx.repaint()
        })
        right.bounds = new Rect(this.bounds.w-30-30,this.bounds.h-30,30,30);
        this.children.push(right);
    }

    add(view: View) {
        this.wrapper.children.push(view);
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackground(this.bounds,'red')
    }

    get_bounds(): Rect {
        return this.bounds
    }

    get_children(): View[] {
        return this.children
    }

    is_parent_view(): boolean {
        return true;
    }

    clip_children(): boolean {
        return false
    }
    is_input_view(): boolean {
        return true
    }
    input(evt: CommonEvent) {
        if(evt.type === 'wheel') {
            this.wrapper.scroll_by(-evt.details.deltaX, -evt.details.deltaY);
            evt.ctx.repaint()
        }
    }

    layout(g: CanvasSurface, parent: View): void {
    }

}

function setup_toolbar(doc:Doc):HBox {
    let toolbar = new HBox();

    let save_button = new Button("save",()=>{
        let str = JSON.stringify(doc,null, '  ');
        localStorage.setItem("doc",str);
    });
    save_button.bounds.w = 60
    toolbar.add(save_button);

    let load_button = new Button("load",()=>{
        console.log("trying to load")
        let str = localStorage.getItem("doc");
        if(str) {
            try {
                let doc_obj = JSON.parse(str);
                console.log("parsed the obj",doc_obj)
                doc.palette = doc_obj.palette
                doc.selected_tile = doc_obj.selected_tile
                doc.selected_color = doc_obj.selected_color
                doc.map_grid_visible = doc_obj.map_grid_visible || false;
                doc.tiles = doc_obj.tiles.map(tile => {
                    return new Sprite('foo', 8, 8).fromJSONObj(tile);
                });
                doc.tilemap = new Sprite("foo",8,8).fromJSONObj(doc_obj.tilemap);
                doc.fire('change',doc_obj)
            } catch (e) {
                console.log("error parsing",str)
            }
        }
    });
    load_button.bounds.w = 60
    toolbar.add(load_button);

    let export_button = new Button("export",() => {
        console.log("exporting");
        let canvas = document.createElement('canvas')
        let size = 8
        canvas.width = 8*size
        canvas.height = 8*size
        let ctx = canvas.getContext('2d')
        // ctx.fillStyle = 'red'
        // ctx.fillRect(0,0,canvas.width,canvas.height);
        doc.tiles.forEach((sprite,s)=>{
            let pt = wrap_number(s,8);
            console.log("exporting tile",sprite)
            let x = pt.x * size
            let y = pt.y * size
            sprite.forEachPixel((val: number, i: number, j: number) => {
                ctx.fillStyle = doc.palette[val]
                ctx.fillRect(x + i, y + j, 1,1);
            });
        })

        canvasToPNGBlob(canvas).then((blob)=> forceDownloadBlob(`tileset@1.png`,blob))
    })
    export_button.bounds.w = 70
    toolbar.add(export_button);

    return toolbar
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
    //draws border
    let main_view = new BaseParentView("main",new Rect(0,0,surface.canvas.width,surface.canvas.height))

    //label at the top
    let main_label = new Label("tile map editor");
    main_label.bounds.y = 0
    main_view.add(main_label);

    let toolbar = setup_toolbar(doc);
    toolbar.bounds.x = 0;
    toolbar.bounds.y = main_label.bounds.bottom();

    main_view.add(toolbar);


    let palette_chooser = new PaletteChooser();
    palette_chooser.doc = doc;
    palette_chooser.palette = doc.palette;
    palette_chooser.bounds.y = toolbar.bounds.bottom() + 10;
    palette_chooser.bounds.y = 80
    main_view.add(palette_chooser);


    // tile editor, edits the current tile
    let tile_editor = new TileEditor();
    tile_editor.doc = doc;
    tile_editor.bounds.y = palette_chooser.bounds.bottom() + 10;
    tile_editor.bounds.x = 0
    main_view.add(tile_editor)


    let add_tile_button = new Button("add tile",()=>{
        doc.tiles.push(new Sprite(gen_id("tile"), 8, 8));
        doc.fire('change', "added a tile");
    });
    add_tile_button.bounds.y = tile_editor.bounds.bottom() + 10;
    main_view.add(add_tile_button);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector()
    sprite_selector.doc = doc;
    sprite_selector.bounds.y = add_tile_button.bounds.bottom() + 10;
    main_view.add(sprite_selector);

    let grid_toggle = new ToggleButton("grid",()=>{
        doc.map_grid_visible = !doc.map_grid_visible;
        grid_toggle.selected = doc.map_grid_visible;
        doc.fire("change", grid_toggle.selected);
    });
    grid_toggle.bounds.x = 300;
    grid_toggle.bounds.y = 30;
    main_view.add(grid_toggle)

    let scroll_view = new ScrollView(new Rect(300,70,600,600));
    main_view.add(scroll_view);

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor();
    map_editor.doc = doc
    scroll_view.add(map_editor);

    doc.addEventListener('change',() => {
        surface.repaint();
    });

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
