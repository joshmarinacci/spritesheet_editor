import {Ctx, Rect, View} from "./graphics";
import {gen_id} from "./util";

export class Label implements View {
    bounds: Rect;
    id: string;
    private text: string;
    children: View[];

    constructor(text: string) {
        this.id = 'a label'
        this.bounds = new Rect(0, 0, 100, 30);
        this.text = text;
        this.children = []
    }

    draw(ctx: Ctx) {
        // ctx.fillRect(0,0,this.bounds.w,this.bounds.h);
        // ctx.fillBounds(this.bounds,'#f0f0f0');
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.text, 0, 20);
    }
}

export class Button implements View {
    bounds: Rect;
    children: View[];
    id: string;
    mouse_down: any;
    private title: string;

    constructor(title: string) {
        this.title = title;
        this.id = "a button";
        this.bounds = new Rect(0, 0, 100, 30);
        this.children = []
    }

    draw(ctx: Ctx) {
        ctx.fillBackground(this.bounds, 'aqua')
        ctx.ctx.fillStyle = '#404040';
        ctx.ctx.font = '20px sans-serif';
        ctx.ctx.fillText(this.title, 5, 20);
    }

}

export class HBox implements View {
    bounds: Rect;
    children: View[];
    id: string;
    constructor() {
        this.id = gen_id('hbox')
        this.children = []
        this.bounds = new Rect(0,0,100,100);
    }
    add(view: View) {
        this.children.push(view);
    }
    layout() {
        let x = 0;
        let y = 0;
        let my = 0;
        this.children.forEach(ch => {
            ch.bounds.x = x;
            ch.bounds.y = y;
            x += ch.bounds.right() + 5
            my = Math.max(my,ch.bounds.h)
        })
        this.bounds.w = x;
        this.bounds.h = my;
    }


    draw(ctx: Ctx) {
    }

}
