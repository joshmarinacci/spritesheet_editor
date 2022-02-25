import {
    Ctx,
    draw_grid,
    draw_selection_rect,
    EMPTY_COLOR,
    PEvt,
    Point,
    Rect,
    View
} from "./graphics";
import {Button, HBox, Label, ToggleButton} from "./components";
import {gen_id} from "./util";
import {Doc, draw_sprite, Sprite} from "./model";

class StandardView implements View {
    bounds: Rect;
    id:string;
    children: View[];
    constructor(id,w,h) {
        this.id = id
        this.bounds = new Rect(0,0,w,h);
        this.children = []
    }
    draw(ctx:Ctx) {
        // log(this.id,"drawing to context");
    }

    add(view: View) {
        this.children.push(view);
    }
}

class TileEditor implements View {
    bounds: Rect;
    children: View[];
    id: string;
    mouse_down: (evt:PEvt) => void;
    doc: Doc;
    scale:number
    constructor() {
        this.id = 'tile editor'
        this.scale = 32;
        this.bounds = new Rect(0,0,this.scale*8 + 1, this.scale*8 + 1)
        this.children = []
        this.mouse_down = (e:PEvt) => {
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
    }
    draw(ctx: Ctx) {
        //clear the background
        ctx.fillBackground(this.bounds,'white');
        //draw each pixel in the tile as a rect
        let sprite = this.doc.tiles[this.doc.selected_tile];
        let palette = this.doc.palette;
        if (sprite !== null) {
            sprite.forEachPixel((val:number,i:number,j:number) => {
                ctx.fillRect(i*this.scale,j*this.scale,this.scale,this.scale,palette[val]);
            });
        }

        draw_grid(ctx,this.bounds,this.scale)
    }
}

class TileSelector implements View{
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    mouse_down: (pt) => void;
    scale:number;
    constructor() {
        this.scale = 32;
        this.bounds = new Rect(0,0,8*this.scale,8*this.scale)
        this.children = []
        this.id = 'tile selector'
        this.mouse_down = (e:PEvt) => {
            let pt = e.pt.divide_floor(this.scale);
            let val = pt.x + pt.y * 8;
            if(val >= 0 && val < this.doc.tiles.length) {
                this.doc.selected_tile = val;
                this.doc.fire('change', this.doc.selected_color)
            }
        }
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,EMPTY_COLOR);
        this.doc.tiles.forEach((sprite,s)=>{
            let pt = wrap_number(s,8);
            draw_sprite(sprite,ctx,pt.x*this.scale,pt.y*this.scale,4, this.doc)
        })
        draw_grid(ctx,this.bounds,this.scale);
        let pt = wrap_number(this.doc.selected_tile,8);
        draw_selection_rect(ctx,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }
}

function wrap_number(num:number,width:number):Point {
    return new Point(
        num % width,
        Math.floor(num/8)
    )
}

class MapEditor implements  View {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    mouse_down: (e: PEvt) => void;
    scale:number;

    constructor() {
        this.id = 'map editor'
        this.scale = 64;
        this.children = []
        this.bounds = new Rect(0,0,8*this.scale,8*this.scale)
        this.mouse_down = (e:PEvt) => {
            if(e.type === "mousedown" || e.type === "mousedrag") {
                let pt = e.pt.divide_floor(this.scale);
                let tile = this.doc.tiles[this.doc.selected_tile];
                this.doc.tilemap.set_pixel(pt.x,pt.y,tile.id)
                this.doc.fire('change',tile)
            }
        }
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,EMPTY_COLOR)
        this.doc.tilemap.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let tile = this.doc.tiles.find((t:Sprite) => t.id ===val);
            draw_sprite(tile,ctx,i*this.scale,j*this.scale,8,this.doc)
        })
        if(this.doc.map_grid_visible) draw_grid(ctx,this.bounds,this.scale)
    }

}

class PaletteChooser implements View{
    bounds: Rect;
    children: View[];
    id: string;
    palette: any;
    mouse_down: (pt) => void;
    doc: Doc;
    scale:number;
    constructor() {
        this.id = 'palette chooser';
        this.children = [];
        this.scale = 32;
        this.bounds = new Rect(0,0,this.scale*8,this.scale);
        this.mouse_down = (e:PEvt) => {
            let val = e.pt.divide_floor(this.scale).x
            if (val >= 0 && val < this.doc.palette.length) {
                this.doc.selected_color = val;
                this.doc.fire('change',this.doc.selected_color)
            }
        }
    }

    draw(ctx: Ctx) {
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

}

class WrapperView implements View {
    bounds: Rect;
    children: View[];
    id: string;
    clip_children: boolean;
    constructor() {
        this.id = 'wrapper-view'
        this.children = []
        this.bounds = new Rect(0,0,200,200)
        this.clip_children = true;
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'green')
    }

    scroll_by(x: number, y: number) {
        let ch = this.children[0].bounds;
        ch.x += x;
        ch.y += y;
        if(ch.x >= 0) ch.x = 0;
        if(ch.y >= 0) ch.y = 0;
    }
}

class ScrollView implements View {
    bounds: Rect;
    children: View[];
    id: string;
    clip_children:boolean
    private wrapper: WrapperView;
    constructor() {
        this.id = 'scroll-view'
        this.children = []
        this.bounds = new Rect(0,0,300,300)

        this.wrapper = new WrapperView()
        this.children.push(this.wrapper)
        this.wrapper.bounds.w = 270;
        this.wrapper.bounds.h = 270;

        let step = 20;

        let up = new Button("u",(evt:PEvt)=>{
            this.wrapper.scroll_by(0,+step);
            evt.ctx.redraw()
        });
        up.bounds = new Rect(this.bounds.w-30,0,30,30);
        this.children.push(up)

        let down = new Button("d",(evt:PEvt)=>{
            this.wrapper.scroll_by(0,-step);
            evt.ctx.redraw()
        });
        down.bounds = new Rect(this.bounds.w-30,this.bounds.h-30-30,30,30);
        this.children.push(down);

        let left = new Button('l',(evt:PEvt)=>{
            this.wrapper.scroll_by(+step,-0);
            evt.ctx.redraw()
        })
        left.bounds = new Rect(0,this.bounds.h-30,30,30);
        this.children.push(left);


        let right = new Button('r',(evt:PEvt)=>{
            this.wrapper.scroll_by(-step,-0);
            evt.ctx.redraw()
        })
        right.bounds = new Rect(this.bounds.w-30-30,this.bounds.h-30,30,30);
        this.children.push(right);
    }

    add(view: View) {
        this.wrapper.children.push(view);
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'red')
    }

}

export function start() {
    let canvas = document.createElement('canvas');
    canvas.width = 1024*window.devicePixelRatio;
    canvas.height = 768*window.devicePixelRatio;
    canvas.style.width = '1024px';
    canvas.style.height = '768px';
    document.body.appendChild(canvas);

    let doc = new Doc();
    //draws border
    let main_view = new StandardView("main",canvas.width,canvas.height);

    //label at the top
    let main_label = new Label("tile map editor");
    main_label.bounds.y = 0
    main_view.add(main_label);

    let toolbar = new HBox();
    toolbar.bounds.x = 0;
    toolbar.bounds.y = main_label.bounds.bottom();

    let save_button = new Button("save",()=>{
        let str = JSON.stringify(doc,null, '  ');
        localStorage.setItem("doc",str);
    });
    toolbar.add(save_button);

    let load_button = new Button("load",()=>{
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
    toolbar.add(load_button);

    toolbar.layout();
    main_view.add(toolbar);


    let palette_chooser = new PaletteChooser();
    palette_chooser.doc = doc;
    palette_chooser.palette = doc.palette;
    palette_chooser.bounds.y = toolbar.bounds.bottom() + 10;
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

    let scroll_view = new ScrollView();
    scroll_view.bounds.x = 300;
    scroll_view.bounds.y = 10;
    main_view.add(scroll_view);

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor();
    map_editor.doc = doc
    // map_editor.bounds.x = 300;
    scroll_view.add(map_editor);

    let grid_toggle = new ToggleButton("grid",()=>{
        doc.map_grid_visible = !doc.map_grid_visible;
        grid_toggle.selected = doc.map_grid_visible;
        doc.fire("change", grid_toggle.selected);
    });
    grid_toggle.bounds.x = scroll_view.bounds.right() + 5;
    main_view.add(grid_toggle)

    let ctx = new Ctx(canvas,main_view);
    ctx.redraw();

    doc.addEventListener('change',() => {
        ctx.redraw();
    });

    let down = false;
    let button = 1
    canvas.addEventListener('contextmenu',(e)=>{
        e.preventDefault();
        return false;
    })
    canvas.addEventListener('mousedown',(evt)=>{
        down = true;
        let rect = canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        button = evt.button as any
        ctx.dispatch(main_view,{type:'mousedown', pt:pt, button:button, ctx:ctx});
    })
    canvas.addEventListener('mousemove',(evt)=>{
        if(down) {
            let rect = canvas.getBoundingClientRect();
            let pt = new Point(evt.x - rect.x, evt.y - rect.y);
            ctx.dispatch(main_view, {type:'mousedrag', pt:pt, button:button, ctx:ctx});
        }
    })
    canvas.addEventListener('mouseup',(evt)=>{
        down = false;
        let rect = canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        ctx.dispatch(main_view,{type:'mouseup',pt:pt, button:button, ctx:ctx});
    })

}
