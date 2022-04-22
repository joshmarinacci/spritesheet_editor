import {Doc} from "./app-model";
import {BaseView, CoolEvent, POINTER_DOWN, PointerEvent, Rect, Size} from "../../lib/src/core";
import {CanvasSurface, SurfaceContext} from "../../lib/src/canvas";
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

    draw(ctx: SurfaceContext) {
        if (this.palette) {
            ctx.fillBackgroundSize(this.size(), EMPTY_COLOR)
            for (let i = 0; i < this.palette.length; i++) {
                let color = this.palette[i]
                // @ts-ignore
                ctx.fillRect(i * this.scale + 0.5, 0 + 0.5, this.scale, this.scale, color);
                if(color === 'transparent') {
                    let r = new Rect(i*this.scale+0.5,0.5,this.scale,this.scale);
                    ctx.fill(r,'black')
                    ctx.fill(r.shrink(4),'white')
                    ctx.fill(r.shrink(8),'black')
                }
            }
            draw_grid(ctx as CanvasSurface, this.size(), this.scale)
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

    layout(g: SurfaceContext, available: Size): Size {
        let size = new Size(this.scale * this.palette.length, this.scale)
        this.set_size(size)
        return size
    }

    set_palette(colorPalette: string[]) {
        this.palette = colorPalette
    }
}

export function draw_selection_rect(g: SurfaceContext, rect: Rect) {
    ['red', 'white', 'black'].forEach((color, i) => {
        // @ts-ignore
        g.ctx.strokeStyle = color
        // @ts-ignore
        g.ctx.strokeRect(rect.x + i + 0.5, rect.y + i + 0.5, rect.w - i * 2, rect.h - i * 2);
    })
}