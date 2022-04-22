import {HBox, ScrollView, VBox} from "../../lib/src/containers";
import {ActionButton, Label, TextLine, ToggleButton} from "../../lib/src/components";
import {CanvasSurface,} from "../../lib/src/canvas";
import {
    BaseView,
    Callback,
    CoolEvent,
    POINTER_DOWN,
    POINTER_DRAG,
    PointerEvent,
    Size,
    with_props
} from "../../lib/src/core";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {Doc, Sprite, Tilemap} from "./app-model";
import {draw_grid} from "./common";
import {TileSelector} from "./tile_selector";
import {EMPTY_COLOR} from "./font_editor";

export class MapEditor extends BaseView {
    private doc: Doc;
    private _scale: number;
    private tilemap: Tilemap | null;
    private _zoom :number;

    constructor(doc: Doc, zoom: number) {
        super("map-editor")
        this._name = 'map-editor'
        this.doc = doc
        this.tilemap = null
        this.set_zoom(zoom)
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

    zoom():number {
        return this._zoom
    }
    set_zoom(zoom: number) {
        this._zoom = zoom
        this._scale = Math.pow(2,zoom);
    }
}

function make_button(caption: string, cb: Callback) {
    let button = with_props(new ActionButton(), {caption: caption})
    button.on('action', cb)
    return button
}

function make_textline(width: number, value:string, callback: Callback) {
    let map_name_edit = new TextLine()
    map_name_edit.set_pref_width(200)
    map_name_edit.set_text(value)
    map_name_edit.on("action", callback)
    return map_name_edit
}

export function make_map_view(doc: Doc) {
    let map_view = with_props(new VBox(), {
        name:'map-editor-view',
        hflex:true,
        vflex:true,
    }) as VBox

    // lets you edit an entire tile map, using the currently selected tile
    let map_editor = new MapEditor(doc, 5);
    map_editor.set_tilemap(doc.get_selected_map())

    let toolbar = with_props(new HBox(), { fill:'#ccc', hflex:true }) as HBox
    let grid_toggle = new ToggleButton("grid")
    grid_toggle.on('action', () => {
        doc.set_map_grid_visible(!doc.get_map_grid_visible());
        grid_toggle.set_selected(doc.get_map_grid_visible());
    });
    toolbar.add(grid_toggle)

    toolbar.add(make_button("+",()=> map_editor.set_zoom(map_editor.zoom()+1)))
    toolbar.add(make_button("-",()=> map_editor.set_zoom(map_editor.zoom()-1)))
    toolbar.add(new Label("name"))
    let name = doc.get_selected_map()?doc.get_selected_map().name:""
    let map_name_edit = make_textline(200, name, (name)=>{
        if (doc.get_selected_map()) doc.get_selected_map().name = name
    })
    toolbar.add(map_name_edit)
    map_view.add(toolbar)

    let toolbar2 = new HBox()
    toolbar2.add(make_button('+ width',()=>{
        let tm = doc.get_selected_map()
        tm.expand_width(1);
        doc.fire("change", {})
    }))
    map_view.add(toolbar2)


    let hb = new HBox()
    let scroll = new ScrollView()
    scroll.set_hflex(true)
    scroll.set_vflex(true)
    scroll.set_content(map_editor)
    hb.add(scroll)
    let selector = new TileSelector(doc)
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