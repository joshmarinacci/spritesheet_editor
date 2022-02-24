import {Ctx, PEvt, Point, Rect, View} from "./graphics";
import {Button, HBox, Label} from "./components";
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
    constructor() {
        this.id = 'tile editor'
        this.bounds = new Rect(0,0,32*8 + 1, 32*8 + 1)
        this.children = []
        this.mouse_down = (e:PEvt) => {
            let x = Math.floor(e.pt.x/32);
            let y = Math.floor(e.pt.y/32);
            let tile = this.doc.tiles[this.doc.selected_tile]
            if (e.button == 2) {
                if(e.type === "mousedown") {
                    let value = tile.get_pixel(x, y);
                    if (typeof value === 'number') {
                        this.doc.selected_color = value
                        this.doc.fire('change', "tile edited");
                    }
                }
                return
            }
            tile.set_pixel(x, y, this.doc.selected_color);
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
                ctx.fillRect(i*32,j*32,32,32,palette[val]);
            });
        }

        draw_grid(ctx,this.bounds,32)
    }
}

function draw_grid(ctx: Ctx, bounds: Rect, step: number) {
    //draw the grid
    ctx.ctx.beginPath();
    for(let i=0; i<=bounds.w; i+=step) {
        ctx.ctx.moveTo(i+0.5,0);
        ctx.ctx.lineTo(i+0.5,bounds.h);
    }
    for(let i=0; i<=bounds.w; i+=step) {
        ctx.ctx.moveTo(0,i+0.5);
        ctx.ctx.lineTo(bounds.w,i+0.5);
    }
    ctx.ctx.strokeStyle = 'black';
    ctx.ctx.lineWidth = 1;
    ctx.ctx.stroke();
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
            let x = Math.floor(e.pt.x / this.scale);
            let y = Math.floor(e.pt.y / this.scale);
            let val = x + y * 8;
            if(val >= 0 && val < this.doc.tiles.length) {
                this.doc.selected_tile = val;
                this.doc.fire('change', this.doc.selected_color)
            }
        }
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'cyan');
        this.doc.tiles.forEach((sprite,s)=>{
            let x = s % 8;
            let y = Math.floor(s/8);
            ctx.fillBounds(new Rect(x*this.scale+1,y,this.scale,this.scale),'black');
            draw_sprite(sprite,ctx,x*this.scale,y*this.scale,4, this.doc)
        })
        draw_grid(ctx,this.bounds,this.scale);
        let x = this.doc.selected_tile % 8;
        let y = Math.floor(this.doc.selected_tile/8);
        draw_selection_rect(ctx,new Rect(x*this.scale,y*this.scale,this.scale,this.scale));
    }
}

class MapEditor implements  View {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    mouse_down: (e: PEvt) => void;

    constructor() {
        this.id = 'map editor'
        this.children = []
        this.bounds = new Rect(0,0,8*8*8,8*8*8)
        this.mouse_down = (e:PEvt) => {
            if(e.type === "mousedown" || e.type === "mousedrag") {
                let x = Math.floor(e.pt.x/64);
                let y = Math.floor(e.pt.y/64);
                let tile = this.doc.tiles[this.doc.selected_tile];
                this.doc.tilemap.set_pixel(x,y,tile.id)
                this.doc.fire('change',tile)
            }
        }
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'goldenrod')
        this.doc.tilemap.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let tile = this.doc.tiles.find((t:Sprite) => t.id ===val);
            draw_sprite(tile,ctx,i*64,j*64,8,this.doc)
        })
    }

}

function draw_selection_rect(ctx: Ctx, rect: Rect) {
    ['red','white','black'].forEach((color,i)=>{
        ctx.strokeRect(rect.x+i+0.5,rect.y+i+0.5,rect.w-i*2,rect.h-i*2,color);
    })
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
            let val = Math.floor(e.pt.x / this.scale);
            if (val >= 0 && val < this.doc.palette.length) {
                this.doc.selected_color = val;
                this.doc.fire('change',this.doc.selected_color)
            }
        }
    }

    draw(ctx: Ctx) {
        if (this.palette) {
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
    canvas.width = 900*window.devicePixelRatio;
    canvas.height = 600*window.devicePixelRatio;
    canvas.style.width = '900px';
    canvas.style.height = '600px';
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
