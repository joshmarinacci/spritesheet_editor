import {CanvasSurface} from "./canvas";
import {
    ButtonBackgroundColor,
    ButtonBackgroundColor_active,
    ButtonBackgroundColor_selected,
    ButtonBorderColor,
    StandardLeftPadding,
    StandardSelectionColor,
    StandardTextColor,
    StandardTextHeight,
    StandardTextStyle
} from "./style";
import {
    BaseParentView,
    BaseView, Callback,
    COMMAND_ACTION,
    COMMAND_CATEGORY, COMMAND_CHANGE,
    CommandEvent,
    CoolEvent,
    FOCUS_CATEGORY, gen_id,
    KEYBOARD_CATEGORY,
    KEYBOARD_DOWN,
    KeyboardEvent, Point,
    POINTER_CATEGORY,
    POINTER_DOWN,
    POINTER_DRAG,
    POINTER_UP,
    PointerEvent, Rect,
    SCROLL_EVENT,
    ScrollEvent, Size,
    View
} from "./core";

export class Label extends BaseView {
    protected _caption: string

    constructor(caption?: string) {
        super(gen_id("label"))
        this._name = 'label'
        this._caption = caption || "no caption"
    }
    caption():string {
        return this._caption
    }
    set_caption(caption:string) {
        this._caption = caption
    }

    draw(g: CanvasSurface): void {
        g.fillStandardText(this._caption, StandardLeftPadding, StandardTextHeight,'base');
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(g.measureText(this._caption,'base').grow(StandardLeftPadding))
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
        this._caption = this.cb({})
        super.draw(ctx);
    }
}
export class ActionButton extends BaseView {
    protected caption: string
    private active: boolean
    constructor(props?:any) {
        super(gen_id("button2"))
        this._name = 'button2'
        this.caption = 'no caption'
        if(props && props.caption) this.caption = props.caption
        this.active = false
    }
    set_caption(caption:string) {
        this.caption = caption
    }
    draw(g: CanvasSurface): void {
        if(this.active) {
            g.fillBackgroundSize(this.size(), ButtonBackgroundColor_active)
        } else {
            g.fillBackgroundSize(this.size(), ButtonBackgroundColor)
        }
        g.strokeBackgroundSize(this.size(), ButtonBorderColor)
        g.fillStandardText(this.caption, StandardLeftPadding, StandardTextHeight, 'base');
    }
    input(event:CoolEvent) {
        if(event.category !== POINTER_CATEGORY) return
        if(event.type === POINTER_DOWN) {
            this.active = true
        }
        if(event.type === POINTER_UP) {
            this.active = false
            let ae = new CommandEvent()
            ae.ctx = event.ctx
            ae.type = COMMAND_ACTION
            ae.category = COMMAND_CATEGORY
            ae.target = this
            this.fire(ae.type, ae)
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(g.measureText(this.caption,'base').grow(StandardLeftPadding))
        return this.size()
    }
}
export class ToggleButton extends BaseView {
    _caption: string
    selected:boolean
    private active: boolean
    constructor(caption?: string) {
        super(gen_id("toggle-button"))
        this._caption = caption || "no caption"
        this.selected = false;
    }
    caption() {
        return this._caption
    }
    set_caption(caption:string) {
        this._caption = caption
    }

    draw(ctx: CanvasSurface) {
        let bg = ButtonBackgroundColor
        if(this.selected) {
            bg = ButtonBackgroundColor_selected
        }
        if(this.active) {
            bg = ButtonBackgroundColor_active
        }
        ctx.fillBackgroundSize(this.size(), bg)
        ctx.strokeBackgroundSize(this.size(),ButtonBorderColor)
        ctx.fillStandardText(this._caption, StandardLeftPadding, StandardTextHeight, 'base')
    }

    input(event: CoolEvent): void {
        if (event.type === POINTER_DOWN) {
            this.active = true
        }
        if (event.type === POINTER_UP) {
            this.selected = !this.selected
            this.active = false
            let ae = new CommandEvent()
            ae.type = COMMAND_ACTION
            ae.category = COMMAND_CATEGORY
            ae.target = this
            this.fire(ae.type, ae)
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        let size = g.measureText(this._caption,'base').grow(StandardLeftPadding)
        this.set_size(size)
        return size
    }
}

abstract class BaseSelectButton extends BaseView {
    _caption: string
    _selected:boolean
    selected_icon: number;
    icon: number;
    constructor() {
        super(gen_id("base-button"))
        this._caption = 'no caption'
        this._selected = false;
        this.icon = 65
        this.selected_icon = 66
    }

    selected():boolean {
        return this._selected
    }
    set_selected(sel:boolean) {
        this._selected = sel
    }
    caption() {
        return this._caption
    }
    set_caption(caption:string) {
        this._caption = caption
    }
    draw(g: CanvasSurface) {
        let x = StandardLeftPadding
        let y = StandardLeftPadding
        g.draw_glyph(this._selected?this.selected_icon:this.icon,x,y,'base','black')
        x += 16
        x += StandardLeftPadding
        g.fillStandardText(this._caption, x, y+StandardTextHeight-2, 'base')
    }
    input(event: CoolEvent): void {
        if (event.type === POINTER_DOWN) {
        }
        if (event.type === POINTER_UP) {
            this._selected = !this._selected
            let ae = new CommandEvent()
            ae.type = COMMAND_CHANGE
            ae.category = COMMAND_CATEGORY
            ae.target = this
            this.fire(ae.type, ae)
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        let size = g.measureText(this._caption,'base').grow(StandardLeftPadding)
        size.w += 16
        size.w += StandardLeftPadding // gap between icon and texst
        this.set_size(size)
        return size
    }

}
export class CheckButton extends BaseSelectButton {
    constructor() {
        super();
        this.icon = 800
        this.selected_icon = 801
    }
}
export class RadioButton extends BaseSelectButton {
    constructor() {
        super();
        this.icon = 802
        this.selected_icon = 803
    }
}
export class IconButton extends BaseView {
    private active: boolean
    private _icon:number
    constructor() {
        super(gen_id("glyph-button"))
        this._name = 'glyph-button'
        this.active = false
        this._icon = 0
    }
    draw(g: CanvasSurface): void {
        if(this.active) {
            g.fillBackgroundSize(this.size(), ButtonBackgroundColor_active)
        } else {
            g.fillBackgroundSize(this.size(), ButtonBackgroundColor)
        }
        g.strokeBackgroundSize(this.size(), ButtonBorderColor)
        if(this._icon !== 0) {
            let x = StandardLeftPadding
            let y = StandardLeftPadding
            g.draw_glyph(this._icon,x,y,'base','black')
        }
    }
    input(event:CoolEvent) {
        if(event.category !== POINTER_CATEGORY) return
        if(event.type === POINTER_DOWN) {
            this.active = true
        }
        if(event.type === POINTER_UP) {
            this.active = false
            let ae = new CommandEvent()
            ae.ctx = event.ctx
            ae.type = COMMAND_ACTION
            ae.category = COMMAND_CATEGORY
            ae.target = this
            this.fire(ae.type, ae)
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(16,16).grow(StandardLeftPadding))
        return this.size()
    }

    icon():number {
        return this._icon
    }
    set_icon(icon: number) {
        this._icon = icon
    }
}

export class SelectList extends BaseView {
    private data: any[];
    private renderer: any;
    private selected_index: number;

    constructor(data:any[], renderer) {
        super('tree')
        this.data = data
        this.renderer = renderer
        this.selected_index = -1
        this._vflex = true
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),'#ddd')
        this.data.forEach((item,i) => {
            if (i === this.selected_index) {
                g.fillRect(0,30*i,this.size().w,25, StandardSelectionColor)
            }
            let str = this.renderer(item)
            g.fillStandardText(str,StandardLeftPadding,i*30 + 20, 'base')
        })
    }
    input(event:CoolEvent) {
        if(event.category !== POINTER_CATEGORY) return
        if(event.type === POINTER_DOWN) {
            let evt = event as PointerEvent
            let pt = evt.position
            let y = Math.floor(pt.y / 30)
            let item = this.data[y]
            this.selected_index = y
            this.fire('change',{item:item,y:y})
        }
    }
    set_data(data: any[]) {
        this.data = data
    }
    layout(g: CanvasSurface, available: Size): Size {
        if(this.hflex()) {
            this.set_size(new Size(available.w, available.h))
        } else {
            this.set_size(new Size(200, available.h))
        }
        return this.size()
    }
}

export class LayerView extends BaseParentView {
    _type:string
    constructor(name?:string) {
        super(gen_id('layer'))
        this._type = 'layer-view'
        if(name) {
            this._name = name
        }
    }
    draw(g: CanvasSurface): void {
    }
    layout(g:CanvasSurface, available:Size):Size {
        this._children.forEach(ch => ch.layout(g,available))
        this.set_size(available)
        return available
    }
    set_visible(visible:boolean) {
        this._visible = visible
    }
}

export class Header extends BaseView {
    private _caption: string
    private fill: string;

    constructor(caption?: string) {
        super(gen_id("header"))
        this._name = 'header'
        this.fill = 'white'
        this._caption = caption || "no caption"
        this._hflex = true
    }
    caption():string {
        return this._caption
    }
    set_caption(caption:string) {
        this._caption = caption
    }
    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(),this.fill)
        let size = g.measureText(this._caption,'base')
        let x = (this.size().w - size.w) / 2
        g.fillStandardText(this._caption, x, StandardTextHeight,'base');
    }
    layout(g: CanvasSurface, available: Size): Size {
        let text_size = g.measureText(this._caption,'base').grow(StandardLeftPadding)
        this.set_size(new Size(available.w, text_size.h))
        return this.size()
    }
}

export type VAlign = "top"|"center"|"bottom"|"stretch"
export class HBox extends BaseParentView {
    private _fill: string;
    pad: number;
    private _valign: VAlign;

    constructor() {
        super(gen_id('hbox'));
        this._valign = 'top'
        this.pad = 0
        this._fill = null
    }

    set_fill(fill:string) {
        this._fill = fill
    }
    set_valign(valign:VAlign) {
        this._valign = valign
    }
    layout(g: CanvasSurface, real_available: Size): Size {
        let available = real_available.shrink(this.pad);
        //split out flex and non-flex children
        let yes_flex = this._children.filter(ch => ch.hflex())
        let non_flex = this._children.filter(ch => !ch.hflex())
        //call layout on the non-flex children first
        let total_w = 0
        let leftover_w = available.w
        non_flex.map((ch:View) => {
            let size = ch.layout(g, new Size(leftover_w,available.h))
            total_w += size.w
            leftover_w -= size.w
        })
        if (yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size((available.w - total_w) / yes_flex.length, available.h)
            //call layout on the flex children
            yes_flex.map((ch:View) => {
                let size = ch.layout(g, flex_avail)
                total_w += size.w
            })
        }
        let maxh = 0
        //find the max height
        this.get_children().forEach(ch => maxh = Math.max(ch.size().h,maxh))
        let nx = this.pad
        let ny = this.pad
        //place all children (they've already set their width and height)
        this._children.forEach(ch => {
            if(this._valign === 'top')    ch.set_position(new Point(nx, ny))
            if(this._valign === 'center') ch.set_position(new Point(nx, (maxh-ch.size().h)/2))
            if(this._valign === 'bottom') ch.set_position(new Point(nx,  maxh-ch.size().h))
            if(this._valign === 'stretch') {
                ch.set_position(new Point(nx, ny))
                ch.size().h = maxh
            }
            nx += ch.size().w
        })
        //return own size
        this.set_size(new Size(nx+this.pad*2, maxh+this.pad*2))
        if (this.vflex()) this.size().h = real_available.h
        if (this.hflex()) this.size().w = real_available.w
        return this.size()
    }

    draw(g: CanvasSurface) {
        if (this._fill) g.fillBackgroundSize(this.size(), this._fill)
    }
}

export type HAlign = "left"|"center"|"right"|"stretch"
export class VBox extends BaseParentView {
    private _fill: string;
    pad: number;
    halign: HAlign;
    constructor() {
        super(gen_id('vbox'));
        this._fill = null
        this.halign = "left"
        this.pad = 0
    }
    fill():string {
        return this._fill
    }
    set_fill(fill:string) {
        this._fill = fill
    }
    layout(g: CanvasSurface, real_available: Size): Size {
        let available = real_available.shrink(this.pad);

        let yes_flex = this.get_children().filter(ch =>  ch.vflex())
        let non_flex = this.get_children().filter(ch => !ch.vflex())
        //call layout on the non-flex children first
        let total_h = 0
        let leftover_h = available.h
        non_flex.map(ch => {
            let size = ch.layout(g, new Size(available.w,leftover_h))
            total_h += size.h
            leftover_h -= size.h
        })
        if (yes_flex.length > 0) {
            //allocate the rest of the space equally to the flex children
            let flex_avail = new Size(available.w, (available.h - total_h) / yes_flex.length)
            //call layout on the flex children
            yes_flex.map((ch:View) => {
                let size = ch.layout(g, flex_avail)
                total_h += size.h
            })
        }
        //place all children (they've already set their width and height)
        let nx = this.pad
        let ny = this.pad
        let maxw = 0
        this.get_children().forEach(ch => maxw = Math.max(ch.size().w,maxw))
        this.get_children().forEach(ch => {
            if(this.halign === 'left')    ch.set_position(new Point(nx, ny))
            if(this.halign === 'center')  ch.set_position(new Point((maxw-ch.size().w)/2, ny))
            if(this.halign === 'right')   ch.set_position(new Point(maxw-ch.size().w, ny))
            if(this.halign === 'stretch') {
                ch.set_position(new Point(nx, ny))
                ch.size().w = maxw
            }
            ny += ch.size().h
        })
        //return own size
        this.size().w = maxw + this.pad * 2
        this.size().h = ny + this.pad * 2
        if(this.hflex()) {
            this.size().w = available.w
        }
        if(this.vflex()) {
            this.size().h = available.h
        }
        return this.size()
    }
    draw(g: CanvasSurface) {
        if (this._fill) g.fillBackgroundSize(this.size(), this._fill)
    }
    clear_children() {
        this._children = []
    }
}

export class HSpacer extends BaseView {
    constructor() {
        super("h-spacer");
        this._hflex = true
        this._name = 'h-spacer'
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(available.w, 0))
        return this.size()
    }

    draw(g: CanvasSurface) {
    }
}

export class GrowPanel extends BaseParentView {
    private fill: string

    constructor() {
        super(gen_id('grow'));
        this.fill = null
        this._hflex = true
        this._vflex = true
    }

    layout(g: CanvasSurface, available: Size): Size {
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

class ScrollWrapper extends BaseParentView {
    xoff: number
    yoff: number
    constructor() {
        super("scroll-wrapper");
        this.xoff = 0
        this.yoff = 0
        this._name = 'scroll-wrapper'
    }
    clip_children(): boolean {
        return true
    }
    layout(g: CanvasSurface, available: Size): Size {
        if(this.yoff > 0) this.yoff = 0
        if(this.xoff > 0) this.xoff = 0
        this.set_size(available)

        this.get_children().forEach(ch => {
            let size = ch.layout(g,available)
            if(size.w+this.xoff < available.w) {
                this.xoff = available.w - size.w
            }
            if(size.h+this.yoff < available.h) {
                this.yoff = available.h - size.h
            }
            if(size.w < available.w) {
                this.xoff = (available.w - size.w)/2
            }
            if(size.h < available.h) {
                this.yoff = (available.h - size.h)/2
            }
            ch.set_position(new Point(this.xoff,this.yoff))
        })
        return available
    }
    input(event: CoolEvent) {
        if(event.type === SCROLL_EVENT && event.direction === "up") {
            let e = event as ScrollEvent
            this.xoff -= e.delta.x
            this.yoff -= e.delta.y
            e.stopped = true
            e.ctx.repaint()
        }
    }

}
/*
scroll bar math

viewport size / content size = thumb length / gutter length
(vs/cs) * gl = tl

viewport size / content size = scale
viewport offset * scale = thumb offset

 */
class ScrollBar extends BaseView {
    private vert: boolean;
    private wrapper: ScrollWrapper;
    constructor(vert:boolean, wrapper:ScrollWrapper) {
        super(gen_id("scroll-bar"));
        this.wrapper = wrapper
        this.vert = vert
        if(this.vert) {
            this.set_size(new Size(20,100))
        } else {
            this.set_size(new Size(100,20))
        }
    }
    draw(g: CanvasSurface): void {
        //draw the gutter
        g.fillBackgroundSize(this.size(),'#888')
        //draw the thumb
        if(this.wrapper.get_children().length == 1) {
            let viewport_size = this.wrapper.size()
            let content_size = this.wrapper.get_children()[0].size()
            // this.log("content",content,'vs',wsize)
            if(this.vert) {
                let gutter_length = this.size().h - 40
                let fract = viewport_size.h / content_size.h
                let s = gutter_length * fract
                let thumb_off = this.wrapper.yoff*fract
                g.fill(new Rect(0,20-thumb_off,20,s), '#ccc');
            } else {
                let gutter_length = this.size().w - 50
                let fract = viewport_size.w / content_size.w
                let s = gutter_length * fract
                let thumb_off = this.wrapper.xoff*fract
                g.fill(new Rect(20-thumb_off,0,s,20), '#ccc');
            }
        }
        //draw the arrows
        if(this.vert) {
            g.fill(new Rect(0,0,20,20),'#999')
            g.draw_glyph(8593,0,0,'base','black',1)
            g.fill(new Rect(0,this.size().h-20,20,20),'#999')
            g.draw_glyph(8595,0,this.size().h-20,'base','black',1)
        } else {
            g.fill(new Rect(0,0,20,20),'#999')
            g.draw_glyph(8592,0,0,'base','black',1)
            g.fill(new Rect(this.size().w-20,0,20,20),'#999')
            g.draw_glyph(8594,this.size().w-20,0,'base','black',1)
        }
    }
    input(e: CoolEvent) {
        if(e.category !== POINTER_CATEGORY) return
        let event = e as PointerEvent
        if(event.type === POINTER_DOWN) {
            if(this.vert) {
                if(event.position.y < 20) {
                    this.wrapper.yoff += 20
                }
                if(event.position.y > this.size().h-20) {
                    this.wrapper.yoff -= 20
                }
            } else {
                if(event.position.x < 20) {
                    this.wrapper.xoff += 20
                }
                if(event.position.x > this.size().w - 20) {
                    this.wrapper.xoff -= 20
                }
            }
        }
        if(event.type === POINTER_DRAG) {
            let viewport_size = this.wrapper.size()
            let content_size = this.wrapper.get_children()[0].size()
            if(this.vert) {
                let fract = viewport_size.h / content_size.h
                this.wrapper.yoff -= event.delta.y / fract
            } else {
                let fract = viewport_size.w / content_size.w
                this.wrapper.xoff -= event.delta.x / fract
            }
            event.ctx.repaint()
        }
        if(event.type === 'wheel') {
            let viewport_size = this.wrapper.size()
            let content_size = this.wrapper.get_children()[0].size()
            if(this.vert) {
                let fract = viewport_size.h / content_size.h
                this.wrapper.yoff -= event.delta.y / fract
            } else {
                let fract = viewport_size.w / content_size.w
                this.wrapper.xoff -= event.delta.x / fract
            }
            event.ctx.repaint()
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        return this.size()
    }
}
export class ScrollView extends BaseParentView {
    private hbar: ScrollBar;
    private vbar: ScrollBar
    private content: View
    private wrapper: ScrollWrapper;
    private up: ActionButton;
    private down: ActionButton;
    private _pref_width: number
    constructor() {
        super(gen_id("scroll-view"))
        this._name = 'scroll-view'
        this._pref_width = 300

        this.wrapper = new ScrollWrapper()
        this.add(this.wrapper)

        this.hbar = new ScrollBar(false,this.wrapper)
        // @ts-ignore
        this.hbar._name = 'h-scroll-bar'
        this.add(this.hbar)
        this.vbar = new ScrollBar(true,this.wrapper)
        // @ts-ignore
        this.vbar._name = 'v-scroll-bar'
        this.add(this.vbar)

    }


    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), '#aaa')
    }

    set_pref_width(num:number) {
        this._pref_width = num
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this._pref_width,300))
        if(this.hflex()) {
            this.size().w = available.w
        }
        if(this.vflex()) {
            this.size().h = available.h
        }
        let ws = this.size().shrink(10)
        this.get_children().forEach(ch => {
            if(ch == this.wrapper) {
                ch.layout(g,ws)
            } else {
                ch.layout(g, available)
            }
        })
        this.hbar.set_size(new Size(this.size().w-20,20))
        this.hbar.set_position(new Point(0,this.size().h-this.hbar.size().h))
        this.vbar.set_size(new Size(20,this.size().h-20))
        this.vbar.set_position(new Point(this.size().w-this.vbar.size().w,0))
        return this.size()
    }

    set_content(view: View) {
        this.content = view
        this.wrapper.add(view)
    }
}

export class PopupContainer extends BaseParentView {
    constructor() {
        super(gen_id("popupcontainer"))
        this._name = "popup_container"
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), 'gray')
    }

    layout(g: CanvasSurface, available: Size): Size {
        let box = this._children[0]
        let size = box.layout(g, new Size(1000, 1000))
        this.set_size(size)
        return new Size(size.w, size.h)
    }

    open_at(position:Point) {
        this.set_position(position)
    }

    hide() {
        this._visible = false
        console.log("hiding",this._visible)
    }
}

export class PopupLayer extends LayerView {
    constructor() {
        super(gen_id('popup-layer'))
        this._name = 'popup-layer'
    }

    draw(g: CanvasSurface) {
        if (this._children.length > 0) g.fillBackgroundSize(this.size(), 'rgba(255,255,255,0.7)')
    }
    input(event: CoolEvent) {
        if(event.type === POINTER_DOWN) {
            this._children = []
            event.stopped = true
        }
    }

    override can_receive_mouse(): boolean {
        if(this.get_children().length > 0) return true
        return false
    }
}

export class DialogLayer extends LayerView {
    constructor() {
        super(gen_id('dialog-layer'))
        this._name = 'dialog-layer'
    }

    draw(g: CanvasSurface) {
        if (this._children.length > 0) g.fillBackgroundSize(this.size(), 'rgba(255,255,255,0.7)')
    }
}

export class DialogContainer extends BaseParentView {
    constructor() {
        super("dialog-container")
        this._name = 'dialog-container'
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), 'gray')
    }

    layout(g: CanvasSurface, available: Size): Size {
        let box = this._children[0]
        let size = box.layout(g, new Size(600, 600))
        this.set_size(size)
        this.set_position(new Point(
            (g.w - size.w) / 2,
            (g.h - size.h) / 2
        ))
        return new Size(size.w, size.h)
    }
}

export class KeystrokeCaptureView extends LayerView {
    constructor(main_view: View) {
        super(gen_id("keystroke_capture_view"))
        this._name = 'keystroke-capture-view'
        this.add(main_view)
    }

    override input(event: CoolEvent) {
        if (event.category === KEYBOARD_CATEGORY) {
            let kb = event as KeyboardEvent
            // this.log("got kb", kb)
            if (kb.key === 's' && kb.modifiers.meta === true) {
                // console.log("intercepting save")
                // @ts-ignore
                event.domEvent.preventDefault()
                kb.stopped = true
            }
            if (kb.key === 'd' && kb.modifiers.meta === true && kb.modifiers.ctrl === true) {
                // console.log("toggling debug")
            }
        }
        super.input(event);
    }
}

export class FontIcon extends BaseView {
    private codepoint: number

    constructor(codepoint: number) {
        super(gen_id('fonticon'))
        this.codepoint = codepoint
    }

    draw(g: CanvasSurface): void {
        g.draw_glyph(this.codepoint, 0, 0, 'base', 'black')
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(16, 16))
        return this.size()
    }
}

type Action = { caption: string }

export class DropdownButton extends ActionButton {
    actions: Action[]

    constructor() {
        super();
        this.actions = []
        this.on('action', (e) => {
            let popup = new PopupContainer();
            let popup_box = new VBox()
            popup_box.set_vflex(false)
            this.actions.forEach(act => {
                let button = new ActionButton(act.caption)
                button.set_caption(act.caption)
                button.on('action', () => {
                    // @ts-ignore
                    act.fun();
                    popup.hide()
                })
                popup_box.add(button)
            })
            popup.add(popup_box)
            let popup_layer = e.ctx.find_by_name('popup-layer')
            popup_layer.add(popup)
            let off = e.ctx.view_to_local(new Point(0, 0), this)
            popup.open_at(off.add(new Point(0, this.size().h)));
        })
    }

    set_actions(actions: Action[]) {
        this.actions = actions
    }
}

export class TextLine extends BaseView {
    text: string;
    private cursor: number;
    private pref_width: number;

    constructor() {
        super(gen_id("text-line"));
        this._name = '@text-line'
        this.text = "abc"
        this.pref_width = 100
        this.cursor = this.text.length
    }

    draw(g: CanvasSurface): void {
        let bg = '#ddd'
        if (g.is_keyboard_focus(this)) bg = 'white'
        g.fillBackgroundSize(this.size(), bg)
        g.strokeBackgroundSize(this.size(), 'black')
        if (g.is_keyboard_focus(this)) {
            g.ctx.fillStyle = StandardTextColor
            g.ctx.font = StandardTextStyle
            let parts = this._parts()
            let bx = 5
            let ax = bx + g.measureText(parts.before, 'base').w
            g.fillStandardText(parts.before, bx, 20, 'base')
            g.fillStandardText(parts.after, ax, 20, 'base')
            g.ctx.fillStyle = 'black'
            g.ctx.fillRect(ax, 2, 2, 20)
        } else {
            g.fillStandardText(this.text, 5, 20, 'base');
        }
    }

    input(event: CoolEvent) {
        if (event.category === FOCUS_CATEGORY) {
            // this.log("got keyboard focus change",event.category)
        }
        if (event.type === POINTER_DOWN) {
            event.ctx.set_keyboard_focus(this)
        }
        if (event.type === KEYBOARD_DOWN) {
            let code = event.details.code
            let key = event.details.key
            // this.log("got a keypress",event.details)
            if (code === 'KeyD' && event.details.ctrl) return this.delete_right()
            if (code === 'Backspace') return this.delete_left()
            if (code === 'ArrowLeft') return this.cursor_left()
            if (code === 'ArrowRight') return this.cursor_right()
            if (code === 'Enter') {
                event.ctx.release_keyboard_focus(this)
                this.fire('action', this.text)
                return
            }
            if (key && key.length === 1) this.insert(key)
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.pref_width, 26))
        if (this._hflex) {
            this.size().w = available.w
        }
        return this.size()
    }

    private insert(key: string) {
        let parts = this._parts()
        this.text = `${parts.before}${key}${parts.after}`
        this.cursor_right()
        this.fire('change',this.text)
    }

    private delete_left() {
        let parts = this._parts()
        this.text = `${parts.before.slice(0, parts.before.length - 1)}${parts.after}`
        this.cursor_left()
        this.fire('change',this.text)
    }

    private delete_right() {
        let parts = this._parts()
        this.text = `${parts.before}${parts.after.slice(1)}`
        this.fire('change',this.text)
    }

    private cursor_left() {
        this.cursor -= 1
        if (this.cursor < 0) this.cursor = 0
    }

    private cursor_right() {
        this.cursor += 1
        if (this.cursor > this.text.length) this.cursor = this.text.length
    }

    private _parts() {
        return {
            before: this.text.slice(0, this.cursor),
            after: this.text.slice(this.cursor),
        }
    }

    set_text(name: string) {
        this.text = name
        this.cursor = this.text.length
        this.fire('change',this.text)
    }

    set_pref_width(w: number) {
        this.pref_width = w
    }
}

export class NumberTextLine extends HBox {
    private _value:number
    private text_line: TextLine;
    private up_button: IconButton;
    private down_button: IconButton;
    constructor() {
        super()
        this.pad = 1
        this._value = 0
        this.text_line = new TextLine()
        this.add(this.text_line)
        this.text_line.on('change',() => {
            let v = parseInt(this.text_line.text,10);
            if(Number.isInteger(v)) {
                this._value = v
            } else {
                this.log("invalid!")
            }
        })
        this.up_button = new IconButton()
        this.up_button.set_icon(8593)
        this.up_button.on('action',() => {
            this.set_value(this.value()+1)
        })
        this.down_button = new IconButton()
        this.down_button.set_icon(8595)
        this.down_button.on('action',() => {
            this.set_value(this.value()-1)
        })
        this.add(this.up_button)
        this.add(this.down_button)
    }
    override draw(g):void {
        super.draw(g)
        if(!this.is_valid()) {
            g.strokeBackgroundSize(this.size(),'red')
        }
    }

    public set_value(value:number) {
        this._value = value
        this.text_line.set_text(''+value)
    }

    private is_valid() {
        let v = parseInt(this.text_line.text)
        return Number.isInteger(v)
    }

    value():number {
        return this._value
    }
}