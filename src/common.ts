/*

- [ ] datastructure has tile is pixels, sheet is tiles, tilemap is tile ids
- [ ] left pane edits single tile
- [ ] right pane edits tile map
- [ ] bottom pane is selected tile in list of all tiles
- [ ] exports big JSON file
- [ ] four colors to choose from
- [ ] just draw directly into canvas
- [ ] view is a subset of a canvas that you can pick against



*/

const DEBUG_VIEW_BOUNDS = false;

class Sprite {
    id:string;
    private w: number;
    private h: number;
    private data: number[];
    constructor(id,w,h) {
        this.id = id;
        this.w = w;
        this.h = h;
        this.data = []
        for(let i=0; i<this.w*this.h; i++) {
            this.data[i] = 0;
        }
    }

    forEachPixel(cb: (val: any, i: number, j: number) => void) {
        for(let j = 0; j<this.h; j++) {
            for(let i=0; i<this.w; i++) {
                let n = j*this.w + i;
                let v = this.data[n];
                cb(v,i,j);
            }
        }
    }

    set_pixel(x: number, y: number, color: any) {
        let n = y*this.w + x;
        this.data[n] = color;
    }

    fromJSONObj(obj) {
        let sprite = new Sprite(obj.id,obj.w,obj.h);
        sprite.data = obj.data;
        return sprite;

    }
}

type CB = (any) => void;

type Evt = {
    type:"mousedown" | "mousedrag" | "mouseup"
    pt:Point
}
type Etype = "change"
class Observable {
    listeners:Map<Etype,Array<CB>>
    constructor() {
        this.listeners = new Map<Etype, Array<CB>>();
    }
    addEventListener(etype:Etype,cb:CB) {
        if(!this.listeners.has(etype)) this.listeners.set(etype, new Array<CB>());
        this.listeners.get(etype).push(cb);
    }
    fire(etype:Etype,payload:any) {
        if(!this.listeners.has(etype)) this.listeners.set(etype, new Array<CB>());
        this.listeners.get(etype).forEach(cb => cb(payload))
    }
}

class Doc extends Observable {
    selected_color: number;
    palette: string[];
    tiles:Sprite[]
    selected_tile:number;
    tilemap: Sprite;

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
        this.tiles = [
            new Sprite('sprite1',8,8)
        ]
        this.selected_tile = 0;
        this.tilemap = new Sprite('mainmap',8,8);
        this.tilemap.set_pixel(0,0,'sprite1');
    }
}
/*
doc.palette = {
        0:'#ff00ff',
        1:'#f0f0f0',
        2:'#d0d0d0',
        3:'#909090',
        4:'#404040',
    },
    tiles:[
        new Sprite('sprite1',8,8)
    ],
    maps:[
        {
            id:'map1',
            width:8,
            height:8,
            // data: new Sprite(8,8),
        }

    ]
}
*/

console.log("hi from typescript");

const log = (...args) => console.log("LOG: ", ...args)

class Ctx {
    private canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    constructor(canvas:HTMLCanvasElement) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.w = this.canvas.width
        this.h = this.canvas.height
        this.ctx.fillStyle = 'white'
        this.ctx.fillRect(0,0,this.w,this.h)
    }

    clear() {
        this.ctx.fillStyle = 'white'
        this.ctx.fillRect(0,0,this.w,this.h)
    }
    fillBounds(bounds:Rect, fill:string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
    }
    fillRect(x: number, y: number, w:number, h:number, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(x,y,w,h);
    }
    strokeRect(x: number, y: number, w:number, h:number, fill: string) {
        this.ctx.strokeStyle = fill;
        this.ctx.strokeRect(x,y,w,h);
    }

    draw_view(view: View) {

        this.ctx.save()
        this.ctx.translate(view.bounds.x,view.bounds.y);
        view.draw(this)
        view.children.forEach(ch => {
            this.draw_view(ch);
        })
        if (DEBUG_VIEW_BOUNDS) {
            this.ctx.strokeStyle = 'green'
            this.ctx.strokeRect(0, 0, view.bounds.w, view.bounds.h);
            this.ctx.font = '12px sans-serif';
            this.ctx.fillStyle = 'green'
            this.ctx.fillText(view.id, 2, 2 + 12)
        }
        this.ctx.restore()
    }

    fillBackground(bounds: Rect, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(0,0,bounds.w,bounds.h);
    }

    dispatch(view:View, e:Evt):View|null {
        if(view.bounds.contains(e.pt)) {
            // console.log("inside of the view",view);
            for (let i =0; i<view.children.length; i++) {
                let ch = view.children[i]
                let e2:Evt = {
                    type:e.type,
                    pt:e.pt.translate(view.bounds.x,view.bounds.y)
                }
                let picked = this.dispatch(ch,e2)
                if (picked) return picked;
            }
            // if we get here it means this view was picked but no children were
            if (view.mouse_down) {
                let e2:Evt = {
                    type:e.type,
                    pt:e.pt.translate(view.bounds.x,view.bounds.y)
                }
                view.mouse_down(e2)
            }
            return view;
        }
        return null;
    }

}

class Point {
    x:number
    y:number
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }

    translate(x: number, y: number) {
        return new Point(this.x-x,this.y-y)
    }
}

class Rect {
    x:number;
    y:number;
    w:number;
    h:number;
    constructor(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    contains(pt: Point):boolean {
        if (pt.x < this.x) return false;
        if (pt.y < this.y) return false;
        if (pt.x >= this.x + this.w) return false;
        if (pt.y >= this.y + this.h) return false;
        return true;
    }

    bottom() {
        return this.y + this.h;
    }

    right() {
        return this.x + this.w;
    }
}

interface View {
    bounds:Rect;
    id:string,
    children: View[];
    mouse_down?: any;
    draw(ctx:Ctx);
}

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
    mouse_down: (pt) => void;
    doc: Doc;
    constructor() {
        this.id = 'tile editor'
        this.bounds = new Rect(0,0,32*8 + 1, 32*8 + 1)
        this.children = []
        this.mouse_down = (e:Evt) => {
            // console.log("this sprite is",this.sprite);
            let x = Math.floor(e.pt.x/32);
            let y = Math.floor(e.pt.y/32);
            this.doc.tiles[this.doc.selected_tile].set_pixel(x,y,this.doc.selected_color);
            this.doc.fire('change',"tile edited");
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

        //draw the grid
        ctx.ctx.beginPath();
        for(let i=0; i<=this.bounds.w; i+=32) {
            ctx.ctx.moveTo(i+0.5,0);
            ctx.ctx.lineTo(i+0.5,this.bounds.h);
        }
        for(let i=0; i<=this.bounds.w; i+=32) {
            ctx.ctx.moveTo(0,i+0.5);
            ctx.ctx.lineTo(this.bounds.w,i+0.5);
        }
        ctx.ctx.strokeStyle = 'black';
        ctx.ctx.lineWidth = 1;
        ctx.ctx.stroke();

    }
}

class TileSelector implements View{
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    mouse_down: (pt) => void;
    constructor() {
        this.bounds = new Rect(0,0,256,64)
        this.children = []
        this.id = 'tile selector'
        this.mouse_down = (e:Evt) => {
            this.doc.selected_tile = Math.floor(e.pt.x / 64);
            this.doc.fire('change',this.doc.selected_color)
        }
    }

    draw(ctx: Ctx) {
        this.doc.tiles.forEach((sprite,s)=>{
            ctx.fillBounds(new Rect(s*64+1,0,64,64),'black');
            draw_sprite(sprite,ctx,s*64,0,8, this.doc)
            if (s === this.doc.selected_tile) {
                ctx.strokeRect(s*64,0,64,64,'red');
            }
        })
    }
}

function draw_sprite(sprite: Sprite, ctx: Ctx, x:number,y:number, scale: number, doc:Doc) {
    sprite.forEachPixel((val:number,i:number,j:number) => {
        ctx.fillRect(x+i*scale,y+j*scale,scale,scale,doc.palette[val]);
    });
}


class Label implements View {
    bounds: Rect;
    id: string;
    private text: string;
    children: View[];
    constructor(text:string) {
        this.id = 'a label'
        this.bounds = new Rect(0,0,100,30);
        this.text = text;
        this.children = []
    }
    draw(ctx: Ctx) {
        // ctx.fillRect(0,0,this.bounds.w,this.bounds.h);
        // ctx.fillBounds(this.bounds,'#f0f0f0');
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.text,0,20);
    }
}
class Button implements View {
    bounds: Rect;
    children: View[];
    id: string;
    mouse_down: any;
    private title: string;
    constructor(title:string) {
        this.title = title;
        this.id = "a button";
        this.bounds = new Rect(0,0,100,30);
        this.children = []
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'aqua')
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.title,5,20);
    }

}

class MapEditor implements  View {
    bounds: Rect;
    children: View[];
    id: string;
    doc: Doc;
    mouse_down: (e: Evt) => void;

    constructor() {
        this.id = 'map editor'
        this.children = []
        this.bounds = new Rect(0,0,8*8*8,8*8*8)
        this.mouse_down = (e:Evt) => {
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

class PaletteChooser implements View{
    bounds: Rect;
    children: View[];
    id: string;
    palette: any;
    mouse_down: (pt) => void;
    doc: Doc;
    constructor() {
        this.id = 'palette chooser';
        this.children = [];
        this.bounds = new Rect(0,0,32*8,32);
        this.mouse_down = (e:Evt) => {
            this.doc.selected_color = Math.floor(e.pt.x / 32);
            this.doc.fire('change',this.doc.selected_color)
        }
    }

    draw(ctx: Ctx) {
        if (this.palette) {
            for (let i=0; i<5; i++) {
                ctx.fillRect(i*32+0.5,0+0.5,32-1,32-1,this.palette[i]);
                ctx.strokeRect(i*32+0.5,0+0.5,32-1,32-1,i === this.doc.selected_color?'red':'black');
            }
        }
    }

}

function gen_id(prefix: string) {
    return `${prefix}_${Math.floor(Math.random()*100000)}`
}

export function start() {
    let canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    document.body.appendChild(canvas);

    let doc = new Doc();
    //draws border
    let main_view = new StandardView("main",canvas.width,canvas.height);

    //label at the top
    let main_label = new Label("tile map editor");
    main_label.bounds.y = 0
    main_view.add(main_label);

    let palette_chooser = new PaletteChooser();
    palette_chooser.doc = doc;
    palette_chooser.palette = doc.palette;
    palette_chooser.bounds.y = main_label.bounds.bottom() + 10;
    main_view.add(palette_chooser);


    // tile editor, edits the current tile
    let tile_editor = new TileEditor();
    tile_editor.doc = doc;
    tile_editor.bounds.y = palette_chooser.bounds.bottom() + 10;
    tile_editor.bounds.x = 0
    main_view.add(tile_editor)


    let add_tile_button = new Button("add tile");
    add_tile_button.mouse_down = (evt:Evt) => {
        if(evt.type === 'mousedown') {
            doc.tiles.push(new Sprite(gen_id("tile"), 8, 8));
            doc.fire('change', "added a tile");
        }
    }
    add_tile_button.bounds.y = tile_editor.bounds.bottom() + 10;
    main_view.add(add_tile_button);

    let save_button = new Button("save");
    save_button.mouse_down = (evt:Evt) => {
        if(evt.type === 'mousedown') {
            let str = JSON.stringify(doc,null, '  ');
            console.log(str);
            localStorage.setItem("doc",str);
        }
    }
    save_button.bounds.x = add_tile_button.bounds.right() + 10;
    save_button.bounds.y = add_tile_button.bounds.y
    main_view.add(save_button)

    let load_button = new Button("load");
    load_button.mouse_down = (evt:Evt) => {
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
    load_button.bounds.x = save_button.bounds.right() + 10;
    load_button.bounds.y = save_button.bounds.y
    main_view.add(load_button)

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
    canvas.addEventListener('mousedown',(evt)=>{
        down = true;
        let rect = canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        ctx.dispatch(main_view,{type:'mousedown', pt:pt});
    })
    canvas.addEventListener('mousemove',(evt)=>{
        if(down) {
            let rect = canvas.getBoundingClientRect();
            let pt = new Point(evt.x - rect.x, evt.y - rect.y);
            let view = ctx.dispatch(main_view, {type:'mousedrag', pt:pt});
        }
    })
    canvas.addEventListener('mouseup',(evt)=>{
        down = false;
        let rect = canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        let view = ctx.dispatch(main_view,{type:'mouseup',pt:pt});
    })

}
