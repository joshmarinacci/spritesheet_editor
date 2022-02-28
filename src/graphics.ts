const DEBUG_VIEW_BOUNDS = false;
const CLEAR_COLOR = '#f0f0f0'
export const EMPTY_COLOR = '#62fcdc'
// export const BUTTON_COLOR = '#ecd7ac';
export const BUTTON_COLOR = '#e3e3e0';
export const BUTTON_BORDER_COLOR = '#949492';

export type PEvt = {
    type: "mousedown" | "mousedrag" | "mouseup" | "wheel"
    pt: Point
    button: number,
    ctx:Ctx,
    details?:any

}
function translate(e:PEvt, x: number, y: number) {
    let e2: PEvt = {
        type: e.type,
        pt: e.pt.translate(x,y),
        button:e.button,
        ctx:e.ctx,
        details:e.details,
    }
    return e2;
}
export class Ctx {
    private canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    root: View;

    constructor(canvas: HTMLCanvasElement, root:View) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.ctx.scale(2,2);
        this.w = this.canvas.width/2
        this.h = this.canvas.height/2
        this.ctx.fillStyle = CLEAR_COLOR
        this.ctx.fillRect(0, 0, this.w, this.h)
        this.root = root
    }

    clear() {
        this.ctx.fillStyle = CLEAR_COLOR
        this.ctx.fillRect(0, 0, this.w, this.h)
    }

    fillBounds(bounds: Rect, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }

    fillRect(x: number, y: number, w: number, h: number, fill: string) {
        this.ctx.fillStyle = fill;
        this.ctx.fillRect(x, y, w, h);
    }

    strokeRect(x: number, y: number, w: number, h: number, fill: string) {
        this.ctx.strokeStyle = fill;
        this.ctx.strokeRect(x, y, w, h);
    }

    draw_view(view: View) {
        this.ctx.save()
        this.ctx.translate(view.bounds.x, view.bounds.y);
        view.draw(this)
        if (view.clip_children) {
            this.ctx.beginPath()
            this.ctx.rect(0,0,view.bounds.w,view.bounds.h);
            this.ctx.clip()
        }
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
        this.ctx.fillRect(0, 0, bounds.w, bounds.h);
    }
    strokeBackground(bounds: Rect, fill: string) {
        this.ctx.strokeStyle = fill;
        this.ctx.strokeRect(0+0.5, 0+0.5, bounds.w-1, bounds.h-1);
    }

    dispatch(view: View, e: PEvt): View | null {
        if (view.bounds.contains(e.pt)) {
            for (let i = 0; i < view.children.length; i++) {
                let ch = view.children[i]
                let e2: PEvt = {
                    type: e.type,
                    pt: e.pt.translate(view.bounds.x, view.bounds.y),
                    button:e.button,
                    ctx:this,
                }
                let picked = this.dispatch(ch, e2)
                if (picked) return picked;
            }
            if (view.mouse_down) {
                let e2: PEvt = {
                    type: e.type,
                    pt: e.pt.translate(view.bounds.x, view.bounds.y),
                    button:e.button,
                    ctx:this,
                }
                view.mouse_down(e2)
                return view;
            }
        }
        return null;
    }
    dispatch_wheel(view:View, e:PEvt):View | null {
        if (view.bounds.contains(e.pt)) {
            for (let i = 0; i < view.children.length; i++) {
                let ch = view.children[i]
                let e2 = translate(e,view.bounds.x,view.bounds.y);
                let picked = this.dispatch_wheel(ch, e2)
                if (picked) return picked;
            }

            if (view.wheel_down && e.type === 'wheel') {
                let e2 = translate(e,view.bounds.x,view.bounds.y);
                view.wheel_down(e2)
                return view;
            }
        }
    }

    redraw() {
        console.time("repaint");
        this.clear();
        this.draw_view(this.root)
        console.timeEnd("repaint");
    }
}

export class Point {
    x: number
    y: number

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    translate(x: number, y: number) {
        return new Point(this.x - x, this.y - y)
    }

    divide_floor(scale: number) {
        return new Point(
            Math.floor(this.x/scale),
            Math.floor(this.y/scale)
        )
    }

    add(pt:Point) {
        return new Point(
            this.x + pt.x,
            this.y + pt.y,
        )
    }
    set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class Rect {
    x: number;
    y: number;
    w: number;
    h: number;

    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    contains(pt: Point): boolean {
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

export interface View {
    bounds: Rect;
    id: string,
    children: View[];
    mouse_down?: any;
    wheel_down?: any;
    clip_children?:boolean,

    draw(ctx: Ctx);
}

export function draw_selection_rect(ctx: Ctx, rect: Rect) {
    ['red', 'white', 'black'].forEach((color, i) => {
        ctx.strokeRect(rect.x + i + 0.5, rect.y + i + 0.5, rect.w - i * 2, rect.h - i * 2, color);
    })
}

export function draw_grid(ctx: Ctx, bounds: Rect, step: number) {
    //draw the grid
    ctx.ctx.beginPath();
    for (let i = 0; i <= bounds.w; i += step) {
        ctx.ctx.moveTo(i + 0.5, 0);
        ctx.ctx.lineTo(i + 0.5, bounds.h);
    }
    for (let i = 0; i <= bounds.w; i += step) {
        ctx.ctx.moveTo(0, i + 0.5);
        ctx.ctx.lineTo(bounds.w, i + 0.5);
    }
    ctx.ctx.strokeStyle = 'black';
    ctx.ctx.lineWidth = 1;
    ctx.ctx.stroke();
}
