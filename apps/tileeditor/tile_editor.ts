import {Doc, Sprite} from "./app-model";
import {BaseView, CoolEvent, POINTER_CATEGORY, POINTER_DOWN, PointerEvent, SECONDARY_BUTTON} from "../../lib/src/core";
import {CanvasSurface,} from "../../lib/src/canvas";
import {Point, Size} from "../../lib/src/common";
import {draw_grid} from "./common";


export class TileEditor extends BaseView {
    private doc: Doc;
    private scale: number
    private sprite: Sprite
    private palette: string[];
    private _next_click_fill: boolean;

    constructor(doc, palette) {
        super('tile editor')
        this.doc = doc
        this.palette = palette
        this.scale = 32;
        this.sprite = null
        this._next_click_fill = false
    }

    draw(g: CanvasSurface) {
        //clear the background
        g.fillBackgroundSize(this.size(), 'white');
        //draw each pixel in the tile as a rect
        let palette = this.palette
        if (this.sprite) {
            this.sprite.forEachPixel((val: number, i: number, j: number) => {
                g.ctx.fillStyle = palette[val]
                g.ctx.fillRect(i * this.scale, j * this.scale, this.scale, this.scale)
            });
        }

        draw_grid(g, this.size(), this.scale)
    }

    input(event: CoolEvent): void {
        if (event.category !== POINTER_CATEGORY) return
        let e = event as PointerEvent
        let pt = e.position.divide_floor(this.scale);
        if (!this.sprite) return
        let tile = this.sprite
        if (e.button === SECONDARY_BUTTON) {
            if (e.type === POINTER_DOWN) {
                let value = tile.get_pixel(pt.x, pt.y);
                if (typeof value === 'number') {
                    this.doc.set_selected_color(value)
                }
            }
            return
        }
        if (this._next_click_fill && e.type === POINTER_DOWN) {
            let v = tile.get_pixel(pt.x, pt.y)
            this.bucket_fill(tile, v, this.doc.get_selected_color(), pt)
            this._next_click_fill = false
        } else {
            tile.set_pixel(pt.x, pt.y, this.doc.get_selected_color());
        }
        this.doc.mark_dirty()
        this.doc.fire('change', "tile edited");
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(32 * 8 + 1, 32 * 8 + 1))
        return this.size()
    }

    set_sprite(sprite: Sprite) {
        this.sprite = sprite
    }

    next_click_fill() {
        this._next_click_fill = true
    }

    private bucket_fill(tile: Sprite, target: number, replace: number, pt: Point) {
        let v = tile.get_pixel(pt.x, pt.y)
        if (v !== target) return
        if (v === target) {
            tile.set_pixel(pt.x, pt.y, replace)
        } else {
            return
        }
        if (pt.x > 0) this.bucket_fill(tile, target, replace, pt.add(new Point(-1, 0)))
        if (pt.x < tile.w - 1) this.bucket_fill(tile, target, replace, pt.add(new Point(+1, 0)))
        if (pt.y > 0) this.bucket_fill(tile, target, replace, pt.add(new Point(0, -1)))
        if (pt.y < tile.h - 1) this.bucket_fill(tile, target, replace, pt.add(new Point(0, +1)))
    }
}