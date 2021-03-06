import {
    Sprite,
    Tilemap,
    gen_id,
    HBox,
    VBox,
    with_props,
    Label,
    TextLine,
    COMMAND_CHANGE,
    ActionButton, COMMAND_ACTION,
} from "thneed-gfx";
import {Doc} from "./app-model";
import {TileSelector} from "./tile_selector";
import {MapEditor} from "./map_editor";
import {PaletteChooser} from "./palette_chooser";
import {TileEditor} from "./tile_editor";


type Change = {
    name:string,
    undo:()=>void,
    redo:()=>void,
}

export class ChangeBuffer {
    private changes: Change[];
    private current: number;
    constructor() {
        this.changes = []
        this.current = -1
    }
    undo() {
        if(this.current <= -1) {
            return
        }
        let change = this.changes[this.current]
        change.undo()
        this.current--
        if(this.current < -1) this.current = -1
    }
    redo() {
        this.current++
        if(this.current > this.changes.length-1) {
            this.current = this.changes.length-1
            return
        }
        let change = this.changes[this.current]
        change.redo()
    }

    push_change(name:string, redo: () => void, undo: () => void) {
        this.changes = this.changes.slice(0,this.current+1)
        this.changes.push({
            name:name,
            undo:undo,
            redo:redo,
        })
        this.current += 1
    }
}

export function make_sheet_editor_view(doc: Doc) {
    let change_buffer = new ChangeBuffer()
    let sheet_editor = new HBox()
    sheet_editor.set_name('sheet-editor-view')

    let vb1 = new VBox()
    let palette_chooser = new PaletteChooser(doc, doc.get_color_palette());
    vb1.add(palette_chooser);

    // tile editor, edits the current tile
    let tile_editor = new TileEditor(doc, doc.get_color_palette(), change_buffer);
    vb1.add(tile_editor)
    let label = with_props(new Label("name"),{caption:'name'});
    vb1.add(label)
    let tile_name_editor = new TextLine()
    tile_name_editor.set_pref_width(200)
    vb1.add(tile_name_editor)
    tile_name_editor.on(COMMAND_CHANGE, (text) => {
        let tile = doc.get_selected_tile()
        if (tile) {
            tile.name = text
        }
    })
    doc.addEventListener('change', () => {
        let tile = doc.get_selected_tile()
        if (tile) {
            tile_editor.set_sprite(tile)
            tile_name_editor.set_text(tile.name)
        }
    })
    let bucket_button = with_props(new ActionButton(), {caption: 'fill once'})
    bucket_button.on('action', () => tile_editor.next_click_fill())
    vb1.add(bucket_button)
    let undo_button = with_props(new ActionButton(),{caption:"undo"}) as ActionButton
    undo_button.on(COMMAND_ACTION,() => change_buffer.undo())
    let redo_button = with_props(new ActionButton(),{caption:"redo"})
    redo_button.on(COMMAND_ACTION, () => change_buffer.redo())
    vb1.add(undo_button)
    vb1.add(redo_button)
    sheet_editor.add(vb1)

    let vb2 = new VBox()
    let add_tile_button = with_props(new ActionButton(), {caption: "add tile"})
    add_tile_button.on('action', () => {
        let sheet = doc.get_selected_sheet()
        sheet.add(new Sprite(gen_id("tile"), 'tilename', 8, 8, doc));
        doc.mark_dirty()
        doc.fire('change', "added a tile");
    });


    let tb = new HBox()
    tb.set_hflex(false)
    tb.add(add_tile_button)
    tb.add(new Label("   "))
    tb.add(new Label("name"))
    let sheet_name_edit = new TextLine()
    sheet_name_edit.set_pref_width(200)
    sheet_name_edit.set_text(doc.get_selected_sheet().name)
    tb.add(sheet_name_edit)
    sheet_name_edit.on("action", (name) => {
        doc.get_selected_sheet().name = name
    })
    vb2.add(tb);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector(doc)
    vb2.add(sprite_selector);
    sheet_editor.add(vb2)

    let vb3 = new VBox()
    let scratch_map = new MapEditor(doc, 32)
    let tm = new Tilemap(gen_id('scratch-tilemap'), 'scratch', 5, 5)
    scratch_map.set_tilemap(tm)
    vb3.add(scratch_map)
    sheet_editor.add(vb3)

    doc.addEventListener('main-selection', () => {
        let sheet = doc.get_selected_sheet()
        if (sheet) sheet_name_edit.set_text(sheet.name)
    })
    doc.addEventListener('palette-change', () => {
        palette_chooser.set_palette(doc.get_color_palette())
        tile_editor.set_palette(doc.get_color_palette());
    })

    return sheet_editor
}