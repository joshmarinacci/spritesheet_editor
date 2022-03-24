import {BaseParentView, BaseView, CommonEvent, ParentView, View} from "./core";
import {gen_id, Point, Size} from "./common";
import {CanvasSurface} from "./canvas";
import {LayerView, ToggleButton, VBox} from "./components";

export class DebugLensGlass extends BaseView {
    private draw_names: boolean;
    private draw_sizes: boolean;
    private draw_bounds: boolean;

    constructor(size: Size) {
        super(gen_id('debug-glass'));
        this.set_size(size)
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }

    override draw(g: CanvasSurface) {
        let root = g.get_root()
        g.ctx.save()
        g.ctx.beginPath()
        let size = this.size()
        g.ctx.rect(0, 0, size.w, size.h);
        g.ctx.clip()
        let trans = g.view_to_local(new Point(0, 0), this)
        g.ctx.translate(-trans.x, -trans.y)
        this.draw_outline(g, root)
        g.ctx.restore()
    }

    private draw_outline(g: CanvasSurface, view: View) {
        if (view.name() === 'debug-layer') return
        let pos = view.position()
        let size = view.size()
        g.ctx.save()
        if (this.draw_bounds) {
            g.ctx.strokeStyle = 'black'
            g.ctx.lineWidth = 1
            let s = 3
            g.ctx.beginPath()
            g.ctx.rect(pos.x + s, pos.y + s, size.w - s * 2, size.h - s * 2)
            g.ctx.moveTo(pos.x, pos.y)
            g.ctx.lineTo(pos.x + size.w, pos.y + size.h)
            g.ctx.moveTo(pos.x + size.w, pos.y)
            g.ctx.lineTo(pos.x, pos.y + size.h)
            g.ctx.stroke()
        }

        function draw_debug_text(g, pos, text) {
            let metrics = g.measureText(text, 'base')
            g.ctx.save()
            g.ctx.translate(pos.x, pos.y)
            g.ctx.fillStyle = 'white'
            g.ctx.fillRect(0, 0, metrics.w + 4, 10 + 4 + 4)
            g.ctx.strokeStyle = 'black'
            g.ctx.lineWidth = 1
            g.ctx.strokeRect(0, 0, metrics.w + 4, 10 + 4 + 4)
            g.ctx.fillStyle = 'black'
            g.fillStandardText(text, 4, 10 + 4 + 4, 'base')
            g.ctx.restore()

        }

        if (this.draw_names) {
            draw_debug_text(g, pos.add(new Point(5, 5)), view.name())
        }
        if (this.draw_sizes) {
            let size = view.size()
            let text = `${size.w.toFixed(1)} x ${size.h.toFixed(1)}`
            draw_debug_text(g, pos.add(new Point(5, 25)), text)
        }

        function is_parent(view: View) {
            // @ts-ignore
            return view.is_parent_view && view.is_parent_view()
        }

        function as_parent(view: View): ParentView {
            return view as unknown as ParentView
        }

        if (is_parent(view)) {
            let parent = as_parent(view)
            g.ctx.save()
            g.ctx.translate(pos.x, pos.y)
            parent.get_children().forEach((ch: View) => {
                this.draw_outline(g, ch)
            })
            g.ctx.restore()
        }
        g.ctx.restore()
    }


    set_draw_names(selected: boolean) {
        this.draw_names = selected
    }

    set_draw_sizes(selected: boolean) {
        this.draw_sizes = selected
    }

    set_draw_bounds(selected: boolean) {
        this.draw_bounds = selected
    }
}

export class ResizeHandle extends BaseView {
    private lens: DebugLens;

    constructor(lens: DebugLens) {
        super(gen_id('debug-lense'))
        this.lens = lens
        this.set_size(new Size(20, 20))
    }

    override input(event: CommonEvent) {
        if (event.type === 'mousedrag') {
            this.lens.set_size(this.lens.size().add(event.delta))
            event.ctx.repaint()
        }
    }

    draw(g: CanvasSurface): void {
        g.fillBackgroundSize(this.size(), '#888')
        g.draw_glyph(2921, 2, 0, 'base', 'black')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        return this.size()
    }

}

export class DebugLens extends BaseParentView {
    private vbox: VBox;
    private glass: DebugLensGlass;
    private resize_handle: ResizeHandle;

    constructor() {
        super(gen_id('debug-window'));
        this._name = 'debug-window'
        this.set_size(new Size(400, 300))
        let vbox = new VBox()
        this.vbox = vbox
        let names = new ToggleButton('names')
        vbox.add(names)
        names.on('action', () => this.glass.set_draw_names(names.selected))
        let sizes = new ToggleButton('sizes')
        vbox.add(sizes)
        sizes.on('action', () => this.glass.set_draw_sizes(sizes.selected))
        let bounds = new ToggleButton('bounds')
        vbox.add(bounds)
        bounds.on('action', () => this.glass.set_draw_bounds(bounds.selected))
        this.add(vbox)
        this.glass = new DebugLensGlass(this.size())
        this.add(this.glass)
        this.resize_handle = new ResizeHandle(this)
        this.add(this.resize_handle)
    }

    input(event: CommonEvent) {
        if (event.type === 'mousedown') {
            // console.log('starting at',event)
        }
        if (event.type === 'mousedrag') {
            this.set_position(this.position().add(event.delta))
            event.ctx.repaint()
        }
    }

    override draw(g: CanvasSurface) {
        g.ctx.save()
        g.ctx.fillStyle = '#888'
        let s = this.size()
        g.ctx.fillRect(0, 0, s.w, 20)
        g.ctx.fillRect(0, 0, 80, s.h)
        g.ctx.fillRect(s.w - 20, 0, 20, s.h)
        g.ctx.fillRect(0, s.h - 20, s.w, 20)
        g.ctx.strokeStyle = '#444'
        g.ctx.strokeRect(0, 0, this.size().w, this.size().h)
        g.fillStandardText('debug lens', 10, 15, 'base')
        g.ctx.restore()

        // g.fillBackgroundSize(this.size(),'#ccc')
    }

    layout2(g: CanvasSurface, available: Size): Size {
        this.get_children().forEach(ch => {
            ch.layout2(g, available)
        })
        let s = this.size()
        this.vbox.set_position(new Point(0, 20))
        this.glass.set_position(new Point(80, 20))
        this.glass.set_size(new Size(s.w - 80 - 20, s.h - 20 - 20))
        this.resize_handle.set_position(new Point(s.w - 20, s.h - 20))
        return this.size()
    }

}

export class DebugLayer extends LayerView {
    constructor() {
        super("debug-layer");
        this._name = 'debug-layer'
        this.add(new DebugLens())
    }
}