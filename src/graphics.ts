const DEBUG_VIEW_BOUNDS = false;
export type PEvt = {
    type: "mousedown" | "mousedrag" | "mouseup"
    pt: Point
    button: number
}

export class Ctx {
    private canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.ctx.scale(2,2);
        this.w = this.canvas.width/2
        this.h = this.canvas.height/2
        this.ctx.fillStyle = 'white'
        this.ctx.fillRect(0, 0, this.w, this.h)
    }

    clear() {
        this.ctx.fillStyle = 'white'
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

    dispatch(view: View, e: PEvt): View | null {
        if (view.bounds.contains(e.pt)) {
            // console.log("inside of the view",view);
            for (let i = 0; i < view.children.length; i++) {
                let ch = view.children[i]
                let e2: PEvt = {
                    type: e.type,
                    pt: e.pt.translate(view.bounds.x, view.bounds.y),
                    button:e.button,
                }
                let picked = this.dispatch(ch, e2)
                if (picked) return picked;
            }
            // if we get here it means this view was picked but no children were
            if (view.mouse_down) {
                let e2: PEvt = {
                    type: e.type,
                    pt: e.pt.translate(view.bounds.x, view.bounds.y),
                    button:e.button,
                }
                view.mouse_down(e2)
            }
            return view;
        }
        return null;
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

    draw(ctx: Ctx);
}
