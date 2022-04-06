import {Doc} from "./app-model";
import {BaseView, CoolEvent, POINTER_DOWN, PointerEvent} from "../../lib/src/core";
import {CanvasSurface,} from "../../lib/src/canvas";
import {Rect, Size} from "../../lib/src/common";
import {draw_grid} from "./common";
import {EMPTY_COLOR} from "./font_editor";

export class PaletteChooser extends BaseView {
    private palette: any;
    private doc: Doc;
    private scale: number;

    constructor(doc, palette) {
        super('palette chooser')
        this.doc = doc
        this.scale = 32;
        this.palette = palette
        this._name = 'palette-chooser'
    }

    draw(ctx: CanvasSurface) {
        if (this.palette) {
            ctx.fillBackgroundSize(this.size(), EMPTY_COLOR)
            for (let i = 0; i < this.palette.length; i++) {
                ctx.fillRect(i * this.scale + 0.5, 0 + 0.5, this.scale, this.scale, this.palette[i]);
            }
            draw_grid(ctx, this.size(), this.scale)
            let i = this.doc.get_selected_color()
            let rect = new Rect(i * this.scale + 1, 1, this.scale - 2, this.scale - 2);
            draw_selection_rect(ctx, rect)
        }
    }

    input(evt: CoolEvent): void {
        if (evt.type === POINTER_DOWN) {
            let e = evt as PointerEvent
            let val = e.position.divide_floor(this.scale).x
            if (val >= 0 && val < this.palette.length) {
                this.doc.set_selected_color(val);
                this.doc.fire('change', this.doc.get_selected_color())
                e.ctx.repaint()
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        let size = new Size(this.scale * this.palette.length, this.scale)
        this.set_size(size)
        return size
    }
}

export function draw_selection_rect(g: CanvasSurface, rect: Rect) {
    ['red', 'white', 'black'].forEach((color, i) => {
        g.ctx.strokeStyle = color
        g.ctx.strokeRect(rect.x + i + 0.5, rect.y + i + 0.5, rect.w - i * 2, rect.h - i * 2);
    })
}