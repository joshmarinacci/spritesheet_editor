import {Callback, Point, Rect, Size} from "./common";
import {StandardTextColor, StandardTextHeight, StandardTextStyle} from "./style";
import {
    CommonEvent, KEYBOARD_CATEGORY, KEYBOARD_DOWN, KeyboardEvent,
    ParentView,
    POINTER_CATEGORY,
    POINTER_DOWN,
    POINTER_DRAG,
    POINTER_UP,
    PointerEvent,
    View
} from "./core";
import {Sheet, Sprite, SpriteGlyph, Tilemap} from "../../apps/tileeditor/app-model";

export function log(...args) {
    console.log('SNAKE:', ...args);
}

const CLEAR_COLOR = '#f0f0f0'

function rect_from_pos_size(point: Point, size: Size) {
    return new Rect(
        point.x,
        point.y,
        size.w,
        size.h
    )
}

class MouseInputService {
    private surface: CanvasSurface;
    private down: boolean;
    private path: [];
    private last_point: Point;
    private target: never;
    constructor(surface: CanvasSurface) {
        this.surface = surface
        this.down = false
        this.surface.canvas.addEventListener('mousedown',(domEvent)=>{
            this.down = true;
            let position = this.surface.screen_to_local(domEvent)
            this.last_point = position
            this.path = this.scan_path(position)
            this.target = this.path[this.path.length-1] // last
            let evt = new PointerEvent()
            evt.type = POINTER_DOWN
            evt.category = POINTER_CATEGORY
            evt.position = position
            evt.ctx = this.surface
            evt.direction = "down"
            evt.target = this.target
            this.propagate(evt,this.path)
            this.surface.repaint()
        })
        this.surface.canvas.addEventListener('mousemove',(domEvent)=>{
            if(this.down) {
                let position = this.surface.screen_to_local(domEvent)
                let delta = position.subtract(this.last_point)
                this.last_point = position.clone()

                let evt = new PointerEvent()
                evt.type = POINTER_DRAG
                evt.category = POINTER_CATEGORY
                evt.position = position
                evt.ctx = this.surface
                evt.target = this.path[this.path.length - 1] // last
                evt.direction = "down"
                evt.delta = delta
                this.propagate(evt, this.path)
                this.surface.repaint()
            }
        })
        this.surface.canvas.addEventListener('mouseup',(domEvent)=>{
            this.down = false
            let position = this.surface.screen_to_local(domEvent)
            let evt = new PointerEvent()
            evt.type = POINTER_UP
            evt.category = POINTER_CATEGORY
            evt.position = position
            evt.ctx = this.surface
            evt.target = this.path[this.path.length-1] // last
            evt.direction = "down"
            this.propagate(evt,this.path)
            this.surface.repaint()
        })

    }

    private calculate_path_to_cursor(view: View, position: Point, path:View[]):boolean {
        // this.log('searching for',position,'on',view.name())
        if(!view) return false
        if (!view.visible()) return false
        let bounds = rect_from_pos_size(view.position(),view.size())
        if (bounds.contains(position)) {
            // @ts-ignore
            if (view.is_parent_view && view.is_parent_view()) {
                let parent = view as unknown as ParentView;
                // go in reverse order to the top drawn children are picked first
                for (let i = parent.get_children().length-1; i >= 0; i--) {
                    let ch = parent.get_children()[i]
                    let pos = position.subtract(view.position())
                    let picked = this.calculate_path_to_cursor(ch,pos,path)
                    if(picked) {
                        path.unshift(ch)
                        return true
                    }
                }
            } else {
                return true
            }
        }
        return false
    }

    private log(...args) {
        console.log('MouseService:',...args)
    }

    private scan_path(position: Point) {
        let path:[] = []
        this.calculate_path_to_cursor(this.surface.get_root(),position,path)
        this.log("final path is",path)
        return path
    }

    private propagate(evt: PointerEvent, path: []) {
        let stopped = false
        let pt = evt.position

        path.forEach((view:View) => {
            if(stopped) {
                this.log("done")
                return
            }
            // this.log("down: view",view.name())
            evt.position = evt.position.subtract(view.position())
            view.input(evt)
            if(evt.stopped) {
                stopped = true
            }
        })
        if(this.surface._input_callback) this.surface._input_callback(evt)
    }
}

class KeyboardInputService {
    private surface: CanvasSurface;
    private log(...args) {
        console.log('KeyboardService:',...args)
    }
    constructor(surface:CanvasSurface) {
        this.surface = surface
        document.addEventListener('keydown', (e) => {
            let evt = new KeyboardEvent()
            evt.category = KEYBOARD_CATEGORY
            evt.type = KEYBOARD_DOWN
            evt.key = e.key
            evt.code = e.code
            evt.modifiers = {
                alt: e.altKey,
                ctrl: e.ctrlKey,
                meta: e.metaKey,
                shift: e.shiftKey
            }
            evt.ctx = this.surface

            evt.details = {
                key:e.key,
                code:e.code,
                shift:e.shiftKey,
                alt:e.altKey,
                ctrl:e.ctrlKey,
            }
            this.surface.dispatch_keyboard_event(evt)
            this.surface.repaint()
            if(!e.altKey && !e.metaKey) e.preventDefault()
            // if (e.key === 'ArrowLeft') KBD.fire(EVENTS.LEFT, {});
            // if (e.key === 'ArrowRight') KBD.fire(EVENTS.RIGHT, {});
            // if (e.key === 'ArrowDown') KBD.fire(EVENTS.DOWN, {});
            // if (e.key === 'ArrowUp') KBD.fire(EVENTS.UP, {});
            // KBD.fire(EVENTS.KEYDOWN,e)
            // e.preventDefault()
        })
    }

}

export class CanvasSurface {
    w: number;
    h: number;
    canvas: HTMLCanvasElement;
    private root: View;
    ctx: CanvasRenderingContext2D;
    debug: boolean;
    private scale: number;
    _input_callback: Callback;
    private _keyboard_focus: View;
    private fonts:Map<string,CanvasFont>
    private global_smoothing = true
    private _pointer_target: View|null;
    private last_point: Point;
    private mouse: MouseInputService;
    private keyboard: KeyboardInputService;

    constructor(w: number, h: number, scale?:number) {
        this.log("making canvas ",w,h)
        this.w = w;
        this.h = h;
        this.scale = this.scale || 1
        this.canvas = document.createElement('canvas');
        this.canvas.width = w * window.devicePixelRatio * this.scale
        this.canvas.height = h * window.devicePixelRatio * this.scale
        this.log("real canvas is",this.canvas.width,this.canvas.height)
        this.canvas.setAttribute('tabindex', '0');
        //turn this on for high-dpi support
        this.canvas.style.width = `${this.w * this.scale}px`
        this.canvas.style.height = `${this.h * this.scale}px`
        this.log("canvas style = ", this.canvas.style)
        this.ctx = this.canvas.getContext('2d');
        this.debug = false;
        this.clear()
        this.fonts = new Map()
        this._pointer_target = null
    }

    addToPage() {
        document.body.appendChild(this.canvas);
    }

    set_root(root: View) {
        this.root = root;
    }
    get_root():View {
        return this.root
    }

    repaint() {
        if(this.debug) console.time("repaint");
        this.layout_stack();
        this.clear();
        this.draw_stack()
        if(this.debug) console.timeEnd("repaint");
    }

    clear() {
        this.ctx.fillStyle = CLEAR_COLOR
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    private layout_stack() {
        if(!this.root) {
            console.warn("root is null")
        } else {
            let available_size = new Size(this.w,this.h)
            // this.log("layout_stack with size",available_size)
            let size = this.root.layout(this, available_size)
            // console.log("canvas, root requested",size)
        }
    }
    private draw_stack() {
        this.ctx.imageSmoothingEnabled = this.global_smoothing
        this.ctx.save();
        this.ctx.translate(0.5, 0.5);
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        this.ctx.scale(this.scale, this.scale)
        this.debug_draw_rect(new Rect(0, 0, this.w - 1, this.h - 1), 'canvas')
        if(this.root) this.draw_view(this.root)
        this.ctx.restore()
    }

    private draw_view(view: View) {
        this.ctx.save();
        let pos = view.position()
        this.ctx.translate(pos.x, pos.y)
        // @ts-ignore
        // console.log("drawing",view.id,view.name())
        if(view.visible()) {
            view.draw(this);
        }
        // @ts-ignore
        if (view.is_parent_view && view.is_parent_view() && view.visible()) {
            let parent = view as unknown as ParentView;
            if(parent.clip_children()) {
                this.ctx.beginPath()
                let size = view.size()
                this.ctx.rect(0,0,size.w,size.h);
                this.ctx.clip()
            }
            parent.get_children().forEach(ch => {
                if (this.debug) {
                    this.ctx.save();
                }
                this.draw_view(ch);
                if (this.debug) {
                    this.ctx.restore()
                }
            })
        }
        let bds = rect_from_pos_size(view.position(),view.size())
        // @ts-ignore
        this.debug_draw_rect(bds, view.name())
        this.ctx.restore()
    }

    fill(rect: Rect, color: string) {
        this.ctx.fillStyle = color
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    stroke(rect: Rect, color: string) {
        this.ctx.strokeStyle = color
        this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    fillBackgroundSize(size:Size, color: string) {
        this.ctx.fillStyle = color
        this.ctx.fillRect(0, 0, size.w, size.h);
    }
    strokeBackgroundSize(size: Size, color: string) {
        this.ctx.strokeStyle = color
        this.ctx.strokeRect(0,0, size.w, size.h);
    }

    private debug_draw_rect(bds: Rect, title: string) {
        if (!this.debug) return
        this.ctx.strokeStyle = 'black'
        this.ctx.lineWidth = 0.5;
        let cx = bds.x + bds.w/2
        let cy = bds.y + bds.h/2
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath()
            this.ctx.strokeStyle = (i % 2 === 1) ? 'red' : 'black'
            this.ctx.rect(bds.x + i, bds.y + i, bds.w - i * 2, bds.h - i * 2);
            this.ctx.stroke()
        }
        let str = `${title} (${bds.x.toFixed(1)},${bds.y.toFixed(1)}) (${bds.w.toFixed(1)}x${bds.h.toFixed(1)})`
        for (let i = 0; i < 3; i++) {
            this.ctx.font = '10px sans-serif';
            this.ctx.fillStyle = 'white'
            this.ctx.fillText(str, cx+3 + i, cy+3 + i)
        }
        for (let i = 0; i < 1; i++) {
            this.ctx.font = '10px sans-serif';
            this.ctx.fillStyle = 'black'
            this.ctx.fillText(str, cx+3 + i + 1, cy+3 + i + 1)
        }
    }

    async load_spritesheet(img_url: any):Promise<SpriteSheet> {
        let ss = new SpriteSheet(img_url,this);
        await ss.load()
        return ss;
    }

    draw_slice(x: number, y: number, slice: SpriteSlice, scale: number) {
        if (!slice.sheet.is_loaded()) log("not loaded yet", slice.sheet.url)
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(slice.sheet.img,
            slice.rect.x, slice.rect.y, slice.rect.w, slice.rect.h,
            x, y, slice.rect.w * scale, slice.rect.h * scale
        )
    }

    fillRect(x: number, y: number, w: number, h: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x,y,w,h)
    }

    screen_to_local(evt:MouseEvent):Point {
        let rect = this.canvas.getBoundingClientRect();
        let pt = new Point(evt.x-rect.x,evt.y-rect.y);
        pt.x /= this.scale
        pt.y /= this.scale
        return pt
    }
    setup_keyboard_input() {
        this.keyboard = new KeyboardInputService(this)
    }
    setup_mouse_input() {
        this.mouse = new MouseInputService(this)
        /*
        this.canvas.addEventListener('contextmenu',(e)=>{
            e.preventDefault();
            return false;
        })
        this.canvas.addEventListener('wheel',(evt)=>{
            let pt = this.screen_to_local(evt)
            let e = new CommonEvent('wheel',pt,this)
            e.delta = new Point(evt.deltaX, evt.deltaY)
            this.dispatch_pointer_event(this.root,e);
            // evt.stopPropagation();
            evt.preventDefault()
        });
         */
    }

    dispatch_keyboard_event(evt: KeyboardEvent) {
        // this.log("dispatching keyboard event",evt.details)
        // this.log('target is',this._keyboard_focus)
        if(this._keyboard_focus) this._keyboard_focus.input(evt)
        if(this._input_callback) this._input_callback(evt)
    }

    set_keyboard_focus(view:View) {
        this._keyboard_focus = view
        // this.log("set keyboard focus to",this._keyboard_focus)
    }
    is_keyboard_focus(view:View) {
        return view === this._keyboard_focus
    }

    release_keyboard_focus(view:View) {
        this._keyboard_focus = null
    }

    on_input(cb: Callback) {
        this._input_callback = cb
    }

    measureText(caption: string, font_name?:string):Size {
        if(font_name && this.fonts.has(font_name)) {
            let font = this.fonts.get(font_name)
            if(font) {
                return font.measureText(caption)
            }
        }
        this.ctx.font = StandardTextStyle
        let metrics = this.ctx.measureText(caption)
        if('fontBoundingBoxAscent' in metrics) {
            return new Size(metrics.width, metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent);
        }
        return new Size(metrics.width, 16);
    }

    fillStandardText(caption: string, x: number, y: number, font_name?:string, scale?:number) {
        if(!scale) scale = 1
        if(font_name && this.fonts.has(font_name)) {
            let font = this.fonts.get(font_name)
            if(font) {
                font.fillText(this.ctx,caption,x,y-StandardTextHeight,scale)
                return
            }
        }
        this.ctx.fillStyle = StandardTextColor
        this.ctx.font = StandardTextStyle
        this.ctx.fillText(caption,x, y)
    }

    draw_glyph(codepoint: number, x:number, y:number, font_name: string, fill: string, scale?:number) {
        if(!scale) scale = 1
        this.ctx.fillStyle = fill
        if(font_name && this.fonts.has(font_name)) {
            let font = this.fonts.get(font_name)
            if(font) {
                font.draw_glpyh(this.ctx,codepoint,x,y,scale)
            }
        }
    }

    dispatch_fake_mouse_event(type: string, pos: Point) {
        let e = new CommonEvent('mousedown',pos,this)
        e.button = 0;
        // this.dispatch_pointer_event(this.root,e)
    }

    private log(...args) {
        console.log("CANVAS: ", ...args)
    }

    load_jsonfont(basefont_data: any, name:string, ref_name: string) {
        let fnt = basefont_data.fonts.find(ft => ft.name === name)
        this.fonts.set(ref_name,new CanvasFont(fnt))
    }

    draw_sprite(x: number, y: number, sprite: Sprite, scale: number) {
        this.ctx.drawImage(sprite._img,x,y,sprite._img.width*scale,sprite._img.height*scale)
    }

    draw_tilemap(tilemap: Tilemap, sheet:Sheet, x: number, y: number, scale: number) {
        tilemap.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            // let sheet = this.doc.get_selected_sheet()
            let tile = sheet.sprites.find((t:Sprite) => t.id ===val);
            this.ctx.imageSmoothingEnabled = false
            if(tile) {
                this.ctx.drawImage(tile._img,x+i*scale,y+j*scale, scale, scale)
            }
        })

    }

    find_by_name(name: string):View|null {
        return this.find_by_name_view(this.root,name)
    }

    private find_by_name_view(view: View, name: string):View|null {
        if (view.name() === name) return view
        // @ts-ignore
        if (view.is_parent_view && view.is_parent_view()) {
            let parent = view as unknown as ParentView;
            // go in reverse order to the top drawn children are picked first
            for (let i = parent.get_children().length - 1; i >= 0; i--) {
                let ch = parent.get_children()[i]
                let res = this.find_by_name_view(ch,name)
                if(res) return res
            }
        }
        return null
    }

    public local_to_view(pt: Point, view: View) {
        let trans = this.calculate_transform_to(this.root,view)
        let f = pt.subtract(trans)
        return f
    }
    private calculate_transform_to(root:View,view:View):Point {
        if(root === view) {
            return root.position().clone()
        }
        // @ts-ignore
        if (root.is_parent_view && root.is_parent_view()) {
            let parent = root as unknown as ParentView;
            for(let i=0; i<parent.get_children().length; i++) {
                let ch = parent.get_children()[i]
                let ptx = this.calculate_transform_to(ch,view)
                if(ptx) {
                    return ptx.add(root.position())
                }
            }
        }
        return null
    }

    view_to_local(pt: Point, view: View) {
        let trans = this.calculate_transform_to(this.root,view)
        return pt.add(trans)
    }
}

export class SpriteSheet {
    img: HTMLImageElement;
    loaded: boolean
    url: any;
    private can: CanvasSurface;

    constructor(url: any, can: CanvasSurface) {
        this.url = url
        this.img = new Image()
        this.loaded = false
        this.can = can
    }
    load() {
        return new Promise<void>((res,rej)=>{
            this.img.addEventListener('load', () => {
                log('loaded', this.url)
                this.loaded = true
                this.can.repaint()
                res()
            })
            this.img.src = this.url
        })
    }

    is_loaded() {
        return this.loaded
    }

    get_slice(numb: number): SpriteSlice {
        let w = this.img.width/8
        let x = numb%w;
        let y = Math.floor(numb/w)
        return new SpriteSlice(this, new Rect(x*8, y*8, 8, 8))
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
    UP:'up',
    KEYDOWN:'keydown'
}


class CanvasFont {
    private data: any;
    private metas:Map<number,SpriteGlyph>
    private scale = 2;
    constructor(data) {
        this.data = data
        this.metas = new Map()
        this.data.glyphs.forEach(gl => {
            this.generate_image(gl)
            this.metas.set(gl.meta.codepoint,gl)
        })
    }
    measureText(text) {
        let xoff = 0
        let h = 0
        for(let i=0; i<text.length; i++) {
            let cp = text.codePointAt(i)
            if(this.metas.has(cp)) {
                let glyph = this.metas.get(cp)
                let sw = glyph.w - glyph.meta.left - glyph.meta.right
                xoff += sw + 1
                h = Math.max(h,glyph.h)
            }
        }
        return new Size(xoff*this.scale,h*this.scale)
    }

    fillText(ctx:CanvasRenderingContext2D, text:string,x:number,y:number, scale?:number) {
        if(!scale) scale = 1
        ctx.fillStyle = 'red'
        let size = this.measureText(text)
        let xoff = 0
        let yoff = 2
        // ctx.fillRect(x+xoff, y+yoff, size.w, size.h)
        for (let i = 0; i < text.length; i++) {
            let cp = text.codePointAt(i)
            if (this.metas.has(cp)) {
                let glyph = this.metas.get(cp)
                ctx.imageSmoothingEnabled = false
                //@ts-ignore
                let img = glyph.img
                let sx = glyph.meta.left
                let sy = 0
                let sw = glyph.w - glyph.meta.left - glyph.meta.right
                let sh = glyph.h //- glyph.meta.baseline
                let dx = x + xoff*this.scale*scale
                let dy = y + (yoff+glyph.meta.baseline-1)*this.scale*scale
                let dw = sw*this.scale*scale
                let dh = sh*this.scale*scale
                ctx.drawImage(img, sx,sy,sw,sh, dx,dy, dw,dh)
                xoff += sw + 1
            }
        }
    }

    draw_glpyh(ctx:CanvasRenderingContext2D, cp:number, x:number, y:number, scale?:number) {
        let xoff = 0
        let yoff = 2
        if(this.metas.has(cp)) {
            let glyph = this.metas.get(cp)
            ctx.imageSmoothingEnabled = false
            //@ts-ignore
            let img = glyph.img
            let sx = glyph.meta.left
            let sy = 0
            let sw = glyph.w - glyph.meta.left - glyph.meta.right
            let sh = glyph.h //- glyph.meta.baseline
            let dx = x + xoff*this.scale*scale
            let dy = y + (yoff+glyph.meta.baseline-1)*this.scale*scale
            let dw = sw*this.scale*scale
            let dh = sh*this.scale*scale
            ctx.drawImage(img, sx,sy,sw,sh, dx,dy, dw,dh)
        }
    }

    private generate_image(gl) {
        gl.img = document.createElement('canvas')
        gl.img.width = gl.w
        gl.img.height = gl.h
        let c = gl.img.getContext('2d')
        c.fillStyle = 'green'
        c.fillRect(0,0,gl.img.width,gl.img.height)
        for (let j = 0; j < gl.h; j++) {
            for (let i = 0; i < gl.w; i++) {
                let n = j * gl.w + i;
                let v = gl.data[n];
                if(v %2 === 0) {
                    c.fillStyle = 'white'
                    // c.fillRect(i, j, 1, 1)
                    c.clearRect(i,j,1,1)
                }
                if(v%2 === 1) {
                    c.fillStyle = 'black'
                    c.fillRect(i, j, 1, 1)
                }
            }
        }
    }
}
