import {CanvasSurface,} from "../../lib/src/canvas";
import {gen_id, Rect, Size} from "../../lib/src/common";
import {
    BaseView,
    CoolEvent,
    FOCUS_CATEGORY, KEYBOARD_DOWN,
    POINTER_CATEGORY,
    POINTER_DOWN,
    PointerEvent,
    SECONDARY_BUTTON
} from "../../lib/src/core";
import {StandardPanelBackgroundColor, StandardTextColor, StandardTextStyle} from "../../lib/src/style";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {Doc, draw_sprite} from "./app-model";
import {draw_grid, wrap_number} from "./common";
import {draw_selection_rect} from "./palette_chooser";
import {EMPTY_COLOR} from "./app";

export class TileSelector extends BaseView {
    private doc: Doc;
    private scale: number;

    constructor(doc) {
        super('tile-selector')
        this.doc = doc
        this.scale = 32;
        this._name = 'tile-selector'
        this._hflex = false
    }

    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(), EMPTY_COLOR);
        let sheet = this.doc.get_selected_sheet()
        if (sheet) {
            sheet.sprites.forEach((sprite, s) => {
                let pt = wrap_number(s, 8);
                draw_sprite(sprite, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.get_color_palette())
            })
        }
        draw_grid(g, this.size(), this.scale);
        let pt = wrap_number(this.doc.get_selected_tile_index(), 8);
        draw_selection_rect(g, new Rect(pt.x * this.scale, pt.y * this.scale, this.scale, this.scale));
    }

    input(evt: CoolEvent): void {
        if (evt.type === POINTER_DOWN) {
            let e = evt as PointerEvent
            let pt = e.position.divide_floor(this.scale);
            let val = pt.x + pt.y * 8;
            let sheet = this.doc.get_selected_sheet()
            if (val >= 0 && val < sheet.sprites.length) {
                this.doc.set_selected_tile_index(val);
                this.doc.fire('change', this.doc.get_selected_color())
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(8 * this.scale, 8 * this.scale))
        return this.size()
    }
}