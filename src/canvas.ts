import {Observable, Rect} from "./util";

export function log(...args) {
    console.log('SNAKE:', ...args);
}

const CLEAR_COLOR = '#f0f0f0'
export interface View {
    get_bounds():Rect
    draw(g:CanvasSurface):void;
}
export interface ParentView {
    is_parent_view():boolean,
    get_children():View[]
}

export class CanvasSurface {
    private w: number;
    private h: number;
    canvas: HTMLCanvasElement;
    private root: View;
    ctx: CanvasRenderingContext2D;
    private debug: boolean;
    private scale: number;

    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.scale = 2.0;
        this.canvas = document.createElement('canvas');
        this.canvas.width = w * window.devicePixelRatio * this.scale
        this.canvas.height = h * window.devicePixelRatio * this.scale
        this.canvas.setAttribute('tabindex', '0');
        //turn this on for high-dpi support
        this.canvas.style.width = `${this.w * this.scale}px`
        this.canvas.style.height = `${this.h * this.scale}px`
        this.ctx = this.canvas.getContext('2d');
        this.debug = false;
        this.clear()
    }

    addToPage() {
        document.body.appendChild(this.canvas);
    }

    set_root(root: View) {
        this.root = root;
    }

    repaint() {
        console.time("repaint");
        this.clear();
        this.draw_stack()
        console.timeEnd("repaint");
    }

    clear() {
        this.ctx.fillStyle = CLEAR_COLOR
        this.ctx.fillRect(0, 0, this.w, this.h)
    }

    private draw_stack() {
        this.ctx.save();
        this.ctx.translate(0.5, 0.5);
        this.ctx.scale(this.scale, this.scale)
        this.debug_draw_rect(new Rect(0, 0, this.w - 1, this.h - 1), 'canvas')
        this.draw_view(this.root)
        this.ctx.restore()
    }

    private draw_view(view: View) {
        this.ctx.save();
        let bds = view.get_bounds();
        this.ctx.translate(bds.x, bds.y)
        view.draw(this);
        // @ts-ignore
        if (view.is_parent_view && view.is_parent_view()) {
            let parent = view as unknown as ParentView;
            parent.get_children().forEach(ch => {
                if (this.debug) {
                    this.ctx.save();
                    this.ctx.translate(20, 20)
                }
                this.draw_view(ch);
                if (this.debug) {
                    this.ctx.restore()
                }
            })
        }
        // @ts-ignore
        this.debug_draw_rect(bds, (view.id) ? (view.id) : "view");
        this.ctx.restore()
    }

    fill(bounds: Rect, color: string) {
        this.ctx.fillStyle = color
        this.ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    }

    private debug_draw_rect(bds: Rect, title: string) {
        if (!this.debug) return
        this.ctx.strokeStyle = 'black'
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath()
            this.ctx.strokeStyle = (i % 2 === 1) ? 'red' : 'black'
            this.ctx.rect(bds.x + i, bds.y + i, bds.w - i * 2, bds.h - i * 2);
            this.ctx.stroke()
        }
        let str = `${title} (${bds.x},${bds.y}) (${bds.w}x${bds.h})`
        for (let i = 0; i < 3; i++) {
            this.ctx.font = '16px sans-serif';
            this.ctx.fillStyle = 'white'
            this.ctx.fillText(str, 3 + i, 3 + i + 12)
        }
        for (let i = 0; i < 1; i++) {
            this.ctx.font = '16px sans-serif';
            this.ctx.fillStyle = 'black'
            this.ctx.fillText(str, 3 + i + 1, 3 + i + 1 + 12)
        }
    }

    load_spritesheet(img_url: any) {
        return new SpriteSheet(img_url, this)
    }

    draw_slice(x: number, y: number, slice: SpriteSlice, scale: number) {
        if (!slice.sheet.is_loaded()) log("not loaded yet", slice.sheet.url)
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(slice.sheet.img,
            slice.rect.x, slice.rect.y, slice.rect.w, slice.rect.h,
            x, y, slice.rect.w * scale, slice.rect.h * scale
        )
    }
}

export class SpriteSheet {
    img: HTMLImageElement;
    loaded: boolean
    url: any;

    constructor(url: any, can: CanvasSurface) {
        this.url = url
        this.img = new Image()
        this.loaded = false
        this.img.addEventListener('load', () => {
            log('loaded', url)
            this.loaded = true
            can.repaint()
        })
        this.img.src = url
    }

    is_loaded() {
        return this.loaded
    }

    get_slice(numb: number): SpriteSlice {
        return new SpriteSlice(this, new Rect(numb * 8, 0, 8, 8))
    }
}

export class SpriteSlice {
    sheet: SpriteSheet;
    rect: Rect;

    constructor(param: SpriteSheet, rect: Rect) {
        this.sheet = param
        this.rect = rect
    }
}
export const EVENTS = {
    START:'start',
    LEFT:'left',
    RIGHT:'right',
    DOWN:'down',
    UP:'up'
}

export function setup_keyboard_input() {
    let KBD = new Observable()
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') KBD.fire(EVENTS.LEFT, {});
        if (e.key === 'ArrowRight') KBD.fire(EVENTS.RIGHT, {});
        if (e.key === 'ArrowDown') KBD.fire(EVENTS.DOWN, {});
        if (e.key === 'ArrowUp') KBD.fire(EVENTS.UP, {});
    })

    return KBD
}
