import {ActionButton, HBox, Label, ScrollView, ToggleButton, VBox} from "../../lib/src/components";
import {CanvasSurface,} from "../../lib/src/canvas";
import {Size} from "../../lib/src/common";
import {BaseView, CoolEvent, POINTER_DOWN, POINTER_DRAG, PointerEvent, with_props} from "../../lib/src/core";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {Doc, Sprite, Tilemap} from "./app-model";
import {draw_grid, TextLine} from "./common";
import {TileSelector} from "./tile_selector";
import {EMPTY_COLOR} from "./font_editor";

export class MapEditor extends BaseView {
    private doc: Doc;
    private _scale: number;
    private tilemap: Tilemap | null;

    constructor(doc: Doc, scale: number) {
        super("map-editor")
        this._name = 'map-editor'
        this._scale = scale;
        this.doc = doc
        this.tilemap = null
    }

    scale() {
        return this._scale
    }

    set_scale(scale) {
        this._scale = scale
    }

    draw(ctx: CanvasSurface) {
        ctx.fillBackgroundSize(this.size(), EMPTY_COLOR)
        if (!this.tilemap) return
        this.tilemap.forEachPixel((val, i, j) => {
            if (!val || val === 0) return;
            let sheet = this.doc.get_selected_sheet()
            let tile = sheet.sprites.find((t: Sprite) => t.id === val);
            ctx.ctx.imageSmoothingEnabled = false
            if (tile) {
                ctx.ctx.drawImage(tile._img, i * this._scale, j * this._scale, this._scale, this._scale)
            }
        })
        if (this.doc.get_map_grid_visible()) draw_grid(ctx, this.size(), this._scale)
    }

    input(evt: CoolEvent): void {
        if (evt.type === POINTER_DOWN || evt.type === POINTER_DRAG) {
            let e = evt as PointerEvent
            let pt = e.position.divide_floor(this._scale);
            if (!this.tilemap) return
            this.doc.get_selected_sheet();
            let tile = this.doc.get_selected_tile();
            if (tile) {
                this.tilemap.set_pixel(pt.x, pt.y, tile.id)
                this.doc.mark_dirty()
                this.doc.fire('change', tile)
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        if (!this.tilemap) {
            this.set_size(new Size(100, 100))
        } else {
            this.set_size(new Size(this.scale() * this.tilemap.w, this.scale() * this.tilemap.h))
        }
        return this.size()
    }

    set_tilemap(selectedMap: Tilemap) {
        this.tilemap = selectedMap
    }
}

export function make_map_view(doc: Doc) {
    let map_view = new VBox()
    map_view.set_name('map-editor-view')
    map_view.set_hflex(true)
    map_view.set_vflex(true)

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor(doc, 16);
    map_editor.set_tilemap(doc.get_selected_map())

    let selector = new TileSelector(doc)

    let toolbar = new HBox()
    toolbar.set_fill('#ccc')
    toolbar.set_hflex(true)
    let grid_toggle = new ToggleButton("grid")
    grid_toggle.on('action', () => {
        doc.set_map_grid_visible(!doc.get_map_grid_visible());
        grid_toggle.selected = doc.get_map_grid_visible();
    });
    toolbar.add(grid_toggle)

    let zoom = 6
    let zoom_in = with_props(new ActionButton(), {caption: '+'})
    zoom_in.on('action', () => {
        zoom += 1
        map_editor.set_scale(Math.pow(2, zoom))
    })
    toolbar.add(zoom_in)
    let zoom_out = with_props(new ActionButton(), {caption: '-'})
    zoom_out.on('action', () => {
        zoom -= 1
        map_editor.set_scale(Math.pow(2, zoom))
    })
    toolbar.add(zoom_out)


    toolbar.add(new Label("name"))
    let map_name_edit = new TextLine()
    map_name_edit.set_pref_width(200)
    if (doc.get_selected_map()) {
        map_name_edit.set_text(doc.get_selected_map().name)
    }
    map_name_edit.on("action", (name) => {
        if (doc.get_selected_map()) doc.get_selected_map().name = name
    })
    toolbar.add(map_name_edit)


    map_view.add(toolbar)
    let hb = new HBox()
    let scroll = new ScrollView()
    scroll.set_hflex(true)
    scroll.set_vflex(true)
    scroll.set_content(map_editor)
    hb.add(scroll)
    hb.add(selector)
    map_view.add(hb)

    doc.addEventListener('main-selection', () => {
        let map = doc.get_selected_map()
        if (map) {
            map_name_edit.set_text(map.name)
            map_editor.set_tilemap(map)
        }
    })

    return map_view
}