import {CanvasSurface,} from "../../lib/src/canvas";
import {gen_id, Point, Size} from "../../lib/src/common";
import {BaseView, CoolEvent, FOCUS_CATEGORY, KEYBOARD_DOWN, POINTER_DOWN} from "../../lib/src/core";
import {StandardTextColor, StandardTextStyle} from "../../lib/src/style";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";

export function draw_grid(g: CanvasSurface, size: Size, step: number) {
    //draw the grid
    g.ctx.beginPath();
    for (let i = 0; i <= size.w; i += step) {
        g.ctx.moveTo(i + 0.5, 0);
        g.ctx.lineTo(i + 0.5, size.h);
    }
    for (let i = 0; i <= size.h; i += step) {
        g.ctx.moveTo(0, i + 0.5);
        g.ctx.lineTo(size.w, i + 0.5);
    }
    g.ctx.strokeStyle = 'black';
    g.ctx.lineWidth = 1;
    g.ctx.stroke();
}

export class TextLine extends BaseView {
    private text: string;
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
    }

    private delete_left() {
        let parts = this._parts()
        this.text = `${parts.before.slice(0, parts.before.length - 1)}${parts.after}`
        this.cursor_left()
    }

    private delete_right() {
        let parts = this._parts()
        this.text = `${parts.before}${parts.after.slice(1)}`
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
    }

    set_pref_width(w: number) {
        this.pref_width = w
    }
}

export function wrap_number(num: number, width: number): Point {
    return new Point(
        num % width,
        Math.floor(num / width)
    )
}