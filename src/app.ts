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
    toolbar.bounds.x = 0;//add_tile_button.bounds.right()
    toolbar.bounds.y = main_label.bounds.bottom();//add_tile_button.bounds.y;

    let save_button = new Button("save");
    save_button.mouse_down = (evt:PEvt) => {
        if(evt.type === 'mousedown') {
            let str = JSON.stringify(doc,null, '  ');
            console.log(str);
            localStorage.setItem("doc",str);
        }
    }
    toolbar.add(save_button);

    let load_button = new Button("load");
    load_button.mouse_down = (evt:PEvt) => {
        console.log("load button event")
        if(evt.type === 'mousedown') {
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
        }
    }
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


    let add_tile_button = new Button("add tile");
    add_tile_button.mouse_down = (evt:PEvt) => {
        if(evt.type === 'mousedown') {
            doc.tiles.push(new Sprite(gen_id("tile"), 8, 8));
            doc.fire('change', "added a tile");
        }
    }
    add_tile_button.bounds.y = tile_editor.bounds.bottom() + 10;
    main_view.add(add_tile_button);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector()
    sprite_selector.doc = doc;
    sprite_selector.bounds.y = add_tile_button.bounds.bottom() + 10;
    main_view.add(sprite_selector);


    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor();
    map_editor.doc = doc
    map_editor.bounds.x = 300;
    main_view.add(map_editor);

    let grid_toggle = new ToggleButton("grid")
    grid_toggle.mouse_down = (evt:PEvt) => {
        if (evt.type === "mousedown") {
            doc.map_grid_visible = !doc.map_grid_visible;
            grid_toggle.selected = doc.map_grid_visible;
            doc.fire("change", grid_toggle.selected);
        }
    }
    grid_toggle.bounds.x = map_editor.bounds.right() + 5;
    main_view.add(grid_toggle)

    let ctx = new Ctx(canvas);
    ctx.draw_view(main_view);

    doc.addEventListener('change',() => {
        console.time("repaint");
        ctx.clear();
        ctx.draw_view(main_view)
        console.timeEnd("repaint");
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
        ctx.dispatch(main_view,{type:'mousedown', pt:pt, button:button});
    })
    canvas.addEventListener('mousemove',(evt)=>{
        if(down) {
            let rect = canvas.getBoundingClientRect();
            let pt = new Point(evt.x - rect.x, evt.y - rect.y);
            ctx.dispatch(main_view, {type:'mousedrag', pt:pt, button:button});
        }
    })
    canvas.addEventListener('mouseup',(evt)=>{
        down = false;
        let rect = canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        ctx.dispatch(main_view,{type:'mouseup',pt:pt, button:button});
    })

}
