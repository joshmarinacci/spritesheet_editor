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

let doc = {
    palette:{
        0:'#ff00ff',
        1:'#f0f0f0',
        2:'#d0d0d0',
        3:'#909090',
        4:'#404040',
    },
    tiles:[
        {
            id:'sprite1',
            width:8,
            height:8,
            data:null,
        },
        {
            id:'sprite2',
            width:8,
            height:8,
            data:null,
        }
    ],
    maps:[
        {
            id:'map1',
            width:8,
            height:8,
            data:null,
        }

    ]
}

console.log("hi from typescript");

export const foo = 'baz';

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

    fillBounds(bounds:Rect, fill:string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
    }
    fillRect(x: number, y: number, w:number, h:number, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(x,y,w,h);
    }

    draw_view(view: View) {

        this.ctx.save()
        this.ctx.translate(view.bounds.x,view.bounds.y);
        view.draw(this)
        view.children.forEach(ch => {
            this.draw_view(ch);
        })
        this.ctx.strokeStyle = 'green'
        this.ctx.strokeRect(0,0,view.bounds.w,view.bounds.h);
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = 'green'
        this.ctx.fillText(view.id, 2,2+12)
        this.ctx.restore()
    }

    fillBackground(bounds: Rect, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(0,0,bounds.w,bounds.h);
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
}

interface View {
    bounds:Rect;
    id:string,
    children: View[];
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
        log(this.id,"drawing to context");
    }

    add(view: View) {
        this.children.push(view);
    }
}

class TileEditor implements View {
    bounds: Rect;
    children: View[];
    id: string;
    constructor() {
        this.id = 'tile editor'
        this.bounds = new Rect(0,0,32*8 + 1, 32*8 + 1)
        this.children = []
    }
    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds,'white');
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
    constructor() {
        this.bounds = new Rect(0,0,256,64)
        this.children = []
        this.id = 'tile selector'
    }

    draw(ctx: Ctx) {
        ctx.fillBounds(new Rect(0,0,64,64),'black')
        ctx.fillBounds(new Rect(64,0,64,64),'red')
        ctx.fillBounds(new Rect(64*2,0,64,64),'black')
    }
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


class MapEditor implements  View {
    bounds: Rect;
    children: View[];
    id: string;

    constructor() {
        this.id = 'map editor'
        this.children = []
        this.bounds = new Rect(0,0,8*8*8,8*8*8)
    }

    draw(ctx: Ctx) {
    }

}

export function start() {
    let canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    document.body.appendChild(canvas);

    //draws border
    let mainview = new StandardView("main",canvas.width,canvas.height);

    //label at the top
    let main_label = new Label("tile map editor");
    main_label.bounds.y = 0
    mainview.add(main_label);

    // pixel editor, edits the current tile
    let pixeleditor = new TileEditor();
    pixeleditor.bounds.y = 30
    pixeleditor.bounds.x = 0
    mainview.add(pixeleditor)


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector()
    sprite_selector.bounds.y = 300;
    mainview.add(sprite_selector);

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor();
    map_editor.bounds.x = 300;
    mainview.add(map_editor);

    let ctx = new Ctx(canvas);
    ctx.draw_view(mainview);
}
