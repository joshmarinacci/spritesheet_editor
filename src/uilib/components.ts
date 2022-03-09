import {CanvasSurface} from "./canvas";
import {
    ButtonBackgroundColor,
    ButtonBackgroundColor_active,
    ButtonBorderColor,
    StandardLeftPadding,
    StandardSelectionColor,
    StandardTextColor,
    StandardTextHeight,
    StandardTextStyle,
    StandardVerticalMargin
} from "../style";
import {Callback, gen_id, Rect, Size} from "./common";
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
        return g.measureText(this.caption).grow(StandardLeftPadding)
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
        g.fillBackground(this._bounds, ButtonBackgroundColor)
        g.strokeBackground(this._bounds, ButtonBorderColor)
        g.fillStandardText(this.caption, StandardLeftPadding, StandardTextHeight);
    }

    input(event: CommonEvent): void {
        if (event.type === "mousedown") {
            this.fire('action', {})
        }
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return g.measureText(this.caption).grow(StandardLeftPadding)
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
        ctx.fillBackground(this._bounds, this.selected?ButtonBackgroundColor_active:ButtonBackgroundColor)
        ctx.strokeBackground(this._bounds,ButtonBorderColor)
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
        return g.measureText(this.title).grow(StandardLeftPadding)
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
        g.fillBackground(this._bounds,'#ddd')
        this.data.forEach((item,i) => {
            if (i === this.selected_index) {
                g.fillRect(0,30*i,this.bounds().w,25, StandardSelectionColor)
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
        return new Size(200,available.h)
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
        this._bounds.w = available.w
        this._bounds.h = available.h
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
        g.fillBackground(this.bounds(),this.fill)
        let size = g.measureText(this.caption)
        let x = (this.bounds().w - size.w) / 2
        g.fillStandardText(this.caption, x, StandardTextHeight);
    }

    layout2(g: CanvasSurface, available: Size): Size {
        let text_size = g.measureText(this.caption).grow(StandardLeftPadding)
        return new Size(available.w, text_size.h)
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
            ch.bounds().x = nx
            ch.bounds().h = size.h
            ch.bounds().w = size.w
            nx += ch.bounds().w
            ch.bounds().y = ny
            maxh = Math.max(ch.bounds().h, maxh)
        })
        //return own size
        this.bounds().w = nx + this.pad * 2
        this.bounds().h = maxh + this.pad * 2
        if (this.vflex) {
            this.bounds().h = real_available.h
        }
        if (this.hflex) {
            this.bounds().w = real_available.w
        }
        return new Size(this.bounds().w, this.bounds().h)
    }

    draw(g: CanvasSurface) {
        if (this.fill) {
            g.fillBackground(this.bounds(), this.fill)
        }
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
            ch.bounds().x = nx
            ch.bounds().y = ny
            ch.bounds().w = size.w
            ch.bounds().h = size.h
            ny += ch.bounds().h
            maxw = Math.max(ch.bounds().w, maxw)
        })
        //return own size
        this.bounds().w = maxw + this.pad * 2
        this.bounds().h = ny + this.pad * 2
        if(this.hflex) {
            this.bounds().w = available.w
        }
        if(this.vflex) {
            this.bounds().h = available.h
        }
        return new Size(this.bounds().w, this.bounds().h)
    }

    draw(g: CanvasSurface) {
        if (this.fill) {
            g.fillBackground(this.bounds(), this.fill)
        }
    }
}

export class HSpacer extends SuperChildView {
    constructor() {
        super("h-spacer");
        this.hflex = true
        this.vflex = false
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return new Size(available.w, 0)
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
        return available
    }

    draw(g: CanvasSurface) {
        if (this.fill) {
            g.fillBackground(this.bounds(), this.fill)
        }
    }

    with_fill(fill: string) {
        this.fill = fill
        return this
    }
}

