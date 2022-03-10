import {CanvasSurface} from "./canvas";
import {
    ButtonBackgroundColor,
    ButtonBackgroundColor_active,
    ButtonBorderColor,
    StandardLeftPadding,
    StandardSelectionColor,
    StandardTextColor,
    StandardTextHeight,
    StandardTextStyle
} from "../style";
import {Callback, gen_id, Point, Size} from "./common";
import {CommonEvent, SuperChildView, SuperParentView, View} from "./core";

export class Label extends SuperChildView {
    protected caption: string

    constructor(caption: string) {
        super(gen_id("label"))
        this._name = 'label'
        this.caption = caption
        this.hflex = false
        this.vflex = false
    }

    draw(g: CanvasSurface): void {
        g.fillStandardText(this.caption, StandardLeftPadding, StandardTextHeight);
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(g.measureText(this.caption).grow(StandardLeftPadding))
        return this.size()
    }
}

export class CustomLabel extends Label {
    private cb: Callback;
    constructor(text:string,cb:Callback) {
        super(text);
        this.cb = cb
    }
    override draw(ctx: CanvasSurface) {
        this.caption = this.cb({})
        super.draw(ctx);
    }
}
export class ActionButton extends SuperChildView {
    private caption: string
    constructor(button1: string) {
        super(gen_id("button2"))
        this._name = 'button2'
        this.caption = button1
        this.hflex = false
        this.vflex = false
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), ButtonBackgroundColor)
        g.strokeBackgroundSize(this.size(), ButtonBorderColor)
        g.fillStandardText(this.caption, StandardLeftPadding, StandardTextHeight);
    }
    input(event: CommonEvent): void {
        if (event.type === "mousedown") {
            this.fire('action', {})
        }
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(g.measureText(this.caption).grow(StandardLeftPadding))
        return this.size()
    }
}

export class ToggleButton extends SuperChildView {
    title: string
    selected:boolean
    constructor(title: string) {
        super(gen_id("toggle-button"))
        this.title = title
        this.selected = false;
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackgroundSize(this.size(), this.selected?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackgroundSize(this.size(),ButtonBorderColor)
        ctx.ctx.fillStyle = StandardTextColor
        ctx.ctx.font = StandardTextStyle
        ctx.ctx.fillText(this.title, StandardLeftPadding, StandardTextHeight);
    }

    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            this.fire('action',event)
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let size = g.measureText(this.title).grow(StandardLeftPadding)
        this.set_size(size)
        return size
    }
}

export class SelectList extends SuperChildView {
    private data: any[];
    private renderer: any;
    private selected_index: number;

    constructor(data:any[], renderer) {
        super('tree')
        this.data = data
        this.renderer = renderer
        this.selected_index = -1
        this.vflex = true
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ddd')
        this.data.forEach((item,i) => {
            if (i === this.selected_index) {
                g.fillRect(0,30*i,this.size().w,25, StandardSelectionColor)
            }
            g.ctx.fillStyle = StandardTextColor
            g.ctx.font = StandardTextStyle
            let str = this.renderer(item)
            g.ctx.fillText(str, StandardLeftPadding, i*30 + 20)
        })
    }
    input(event: CommonEvent): void {
        if(event.type === 'mousedown') {
            let pt = event.pt;
            let y = Math.floor(pt.y / 30)
            let item = this.data[y]
            this.selected_index = y
            // @ts-ignore
            this._listeners.get('change').forEach(cb => cb(item,y))
            event.ctx.repaint()
        }
    }
    set_data(data: any[]) {
        this.data = data
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(200,available.h))
        return this.size()
    }
}

export class LayerView extends SuperParentView {
    constructor() {
        super(gen_id('layer'))
    }
    draw(g: CanvasSurface): void {
    }
    layout2(g:CanvasSurface, available:Size):Size {
        this._children.forEach(ch => ch.layout2(g,available))
        this.set_size(available)
        return available
    }
}

export class Header extends SuperChildView {
    private caption: string
    private fill: string;

    constructor(caption: string) {
        super(gen_id("header"))
        this._name = 'header'
        this.fill = 'white'
        this.caption = caption
        this.hflex = true
        this.vflex = false
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),this.fill)
        let size = g.measureText(this.caption)
        let x = (this.size().w - size.w) / 2
        g.fillStandardText(this.caption, x, StandardTextHeight);
    }
    layout2(g: CanvasSurface, available: Size): Size {
        let text_size = g.measureText(this.caption).grow(StandardLeftPadding)
        this.set_size(new Size(available.w, text_size.h))
        return this.size()
    }
}

export class HBox extends SuperParentView {
    fill: string;
    pad: number;

    constructor() {
        super(gen_id('hbox'));
        this.hflex = true
        this.vflex = false
        this.pad = 0
        this.fill = null
    }

    layout2(g: CanvasSurface, real_available: Size): Size {
        // this.log("start avail",real_available)
        let available = real_available.shrink(this.pad);
        //split out flex and non-flex children
        // @ts-ignore
        let yes_flex = this._children.filter(ch => ch.hflex)
        // @ts-ignore
        let non_flex = this._children.filter(ch => !ch.hflex)
        //call layout on the non-flex children first
        let sizes: Map<View, Size> = new Map()
        let total_w = 0
        non_flex.map(ch => {
            let ch2 = ch as unknown as View
            let size = ch2.layout2(g, available)
            total_w += size.w
            sizes.set(ch2, size)
        })
        if (yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size((available.w - total_w) / yes_flex.length, available.h)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as View
                let size = ch2.layout2(g, flex_avail)
                total_w += size.w
                sizes.set(ch2, size)
            })
        }
        //place all children (they've already set their width and height)
        let nx = this.pad
        let ny = this.pad
        let maxh = 0
        this._children.forEach(ch => {
            let size = sizes.get(ch as unknown as View)
            ch.set_position(new Point(nx,ny))
            nx += ch.size().w
            maxh = Math.max(ch.size().h, maxh)
        })
        //return own size
        this.set_size(new Size(nx+this.pad*2, maxh+this.pad*2))
        if (this.vflex) {
            this.size().h = real_available.h
        }
        if (this.hflex) {
            this.size().w = real_available.w
        }
        return this.size()
    }

    draw(g: CanvasSurface) {
        if (this.fill) g.fillBackgroundSize(this.size(), this.fill)
    }
}

export class VBox extends SuperParentView {
    fill: string;
    pad: number;

    constructor() {
        super(gen_id('vbox'));
        this.fill = null
        this.hflex = false
        this.vflex = true
        this.pad = 0
    }

    layout2(g: CanvasSurface, real_available: Size): Size {
        // this.log("start avail",real_available)
        let available = real_available.shrink(this.pad);

        // @ts-ignore
        let yes_flex = this.get_children().filter(ch => ch.vflex)
        // @ts-ignore
        let non_flex = this.get_children().filter(ch => !ch.vflex)
        //call layout on the non-flex children first
        let sizes: Map<View, Size> = new Map()
        let total_h = 0
        non_flex.map(ch => {
            let ch2 = ch as unknown as View
            let size = ch2.layout2(g, available)
            total_h += size.h
            sizes.set(ch2, size)
        })
        if (yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size(available.w, (available.h - total_h) / yes_flex.length)
            //call layout on the flex children
            yes_flex.map(ch => {
                let ch2 = ch as unknown as View
                let size = ch2.layout2(g, flex_avail)
                total_h += size.h
                sizes.set(ch2, size)
            })
        }
        //place all children (they've already set their width and height)
        let nx = this.pad
        let ny = this.pad
        let maxw = 0
        this.get_children().forEach(ch => {
            let size = sizes.get(ch as unknown as View)
            ch.set_position(new Point(nx,ny))
            ch.set_size(size)
            ny += ch.size().h
            maxw = Math.max(ch.size().w, maxw)
        })
        //return own size
        this.size().w = maxw + this.pad * 2
        this.size().h = ny + this.pad * 2
        if(this.hflex) {
            this.size().w = available.w
        }
        if(this.vflex) {
            this.size().h = available.h
        }
        return this.size()
    }

    draw(g: CanvasSurface) {
        if (this.fill) g.fillBackgroundSize(this.size(), this.fill)
    }
}

export class HSpacer extends SuperChildView {
    constructor() {
        super("h-spacer");
        this.hflex = true
        this.vflex = false
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(available.w, 0))
        return this.size()
    }

    draw(g: CanvasSurface) {
    }
}

export class GrowPanel extends SuperParentView {
    private fill: string

    constructor() {
        super(gen_id('grow'));
        this.fill = null
        this.hflex = true
        this.vflex = true
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

    draw(g: CanvasSurface) {
        if (this.fill) g.fillBackgroundSize(this.size(), this.fill)
    }

    with_fill(fill: string) {
        this.fill = fill
        return this
    }
}

class ScrollWrapper extends SuperParentView {
    xoff: number
    yoff: number
    constructor() {
        super("scroll-wrapper");
        this.xoff = 0
        this.yoff = 0
    }
    clip_children(): boolean {
        return true
    }
    layout2(g: CanvasSurface, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout2(g,available)
            ch.set_position(new Point(this.xoff,this.yoff))
        })
        this.set_size(available)
        return available
    }

}
export class ScrollView extends SuperParentView {
    private left: ActionButton
    private right: ActionButton
    private hbar: ActionButton
    private content: View
    private wrapper: ScrollWrapper;
    private up: ActionButton;
    private down: ActionButton;
    private vbar: ActionButton;
    constructor() {
        super(gen_id("scroll-view"))
        this._name = 'scroll-view'
        this.hflex = false
        this.vflex = false

        this.left = new ActionButton('left')
        this.add(this.left)
        this.right = new ActionButton('right')
        this.add(this.right)
        this.hbar = new ActionButton('hhh')
        this.add(this.hbar)

        this.up = new ActionButton('u')
        this.down = new ActionButton('d')
        this.vbar = new ActionButton('v')
        this.add(this.up)
        this.add(this.down)
        this.add(this.vbar)

        this.wrapper = new ScrollWrapper()
        this.left.on('action',() => {
            this.wrapper.xoff += 20
        })
        this.right.on('action',() => {
            this.wrapper.xoff -= 20
        })
        this.up.on('action',() => {
            this.wrapper.yoff += 20
        })
        this.down.on('action',() => {
            this.wrapper.yoff -= 20
        })
        this.add(this.wrapper)
    }


    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), 'blue')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let ws = new Size(280,280)
        this.get_children().forEach(ch => {
            if(ch == this.wrapper) {
                ch.layout2(g,ws)
            } else {
                ch.layout2(g, available)
            }
        })
        this.set_size(new Size(300,300))

        this.left.set_position(new Point(0,this.size().h-this.left.size().h))
        this.right.set_position(new Point(this.size().w - this.right.size().w -20,
            this.size().h - this.right.size().h - 0))

        this.hbar.set_position(new Point(this.left.size().w, this.size().h-this.hbar.size().h))
        this.hbar.set_size(new Size(
            this.size().w - this.right.size().w - this.left.size().w - 20,
            this.hbar.size().h ))
        this.up.set_position(new Point(this.size().w-this.up.size().w,0))
        this.down.set_position(new Point(this.size().w - this.down.size().w,
            this.size().h - this.down.size().h - 20))
        this.vbar.set_position(new Point(this.size().w - this.vbar.size().w,
            this.up.size().h ))
        this.vbar.set_size(new Size(
            this.vbar.size().w,
            this.size().h - this.up.size().h - this.down.size().h - 20
        ))
        return this.size()
    }

    set_content(view: View) {
        this.content = view
        this.wrapper.add(view)
    }
}