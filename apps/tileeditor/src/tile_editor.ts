import {
    Sprite,
    Rect,
    POINTER_CATEGORY,
    Point,
    SECONDARY_BUTTON,
    CanvasSurface,
    BaseView,
    SurfaceContext,
    CoolEvent,
    POINTER_DOWN,
    Size,
    PointerEvent, POINTER_DRAG,
} from "thneed-gfx";
import {Doc} from "./app-model";
import {draw_grid} from "./common";
import {ChangeBuffer} from "./sheet_editor";


export class TileEditor extends BaseView {
    private doc: Doc;
    private scale: number
    private sprite: Sprite
    private palette: string[];
    private _next_click_fill: boolean;
    private undobuffer: ChangeBuffer;

    constructor(doc, palette, change:ChangeBuffer) {
        super('tile editor')
        this.doc = doc
        this.palette = palette
        this.scale = 32;
        this.sprite = null
        this._next_click_fill = false
        this.undobuffer = change
    }

    draw(g: SurfaceContext) {
        //clear the background
        g.fillBackgroundSize(this.size(), 'white');
        //draw each pixel in the tile as a rect
        let palette = this.palette
        if (this.sprite) {
            this.sprite.forEachPixel((val: number, i: number, j: number) => {
                g.fill(new Rect(i * this.scale, j * this.scale, this.scale, this.scale), palette[val])
            });
        }

        draw_grid(g as CanvasSurface, this.size(), this.scale)
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
        if(e.type === POINTER_DOWN) {
            if (this._next_click_fill) {
                let v = tile.get_pixel(pt.x, pt.y)
                this.bucket_fill(tile, v, this.doc.get_selected_color(), pt)
                this._next_click_fill = false
            } else {
                let new_color = this.doc.get_selected_color()
                this.set_pixel(new_color,pt,tile)
            }
        }
        if(e.type === POINTER_DRAG) {
            let new_color = this.doc.get_selected_color()
            this.set_pixel(new_color,pt,tile)
        }
        this.doc.mark_dirty()
        this.doc.fire('change', "tile edited");
    }

    layout(g: SurfaceContext, available: Size): Size {
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
            this.set_pixel(replace,pt,tile)
            tile.set_pixel(pt.x, pt.y, replace)
        } else {
            return
        }
        if (pt.x > 0) this.bucket_fill(tile, target, replace, pt.add(new Point(-1, 0)))
        if (pt.x < tile.w - 1) this.bucket_fill(tile, target, replace, pt.add(new Point(+1, 0)))
        if (pt.y > 0) this.bucket_fill(tile, target, replace, pt.add(new Point(0, -1)))
        if (pt.y < tile.h - 1) this.bucket_fill(tile, target, replace, pt.add(new Point(0, +1)))
    }

    set_palette(colorPalette: string[]) {
        this.palette = colorPalette
    }

    private set_pixel(new_color: number, pt: Point, tile: Sprite) {
        let old_color = tile.get_pixel(pt.x,pt.y)
        if(old_color === new_color) {
            return
        }
        this.undobuffer.push_change(
            "set_pixel",
            ()=>{
                console.log("re setting pixel")
                //redo
                tile.set_pixel(pt.x,pt.y,new_color)
            },()=>{
                //undo
                console.log("un setting pixel")
                tile.set_pixel(pt.x,pt.y,old_color)
            })
        tile.set_pixel(pt.x, pt.y, new_color);
    }
}