import {
    ActionButton,
    CustomLabel,
    DropdownButton,
    HBox,
    Header,
    KeystrokeCaptureView,
    Label,
    LayerView,
    SelectList,
    VBox
} from "../../lib/src/components";
import {canvasToPNGBlob, fileToJSON, forceDownloadBlob, jsonObjToBlob} from "../../common/util";
import {
    CHERRY_BLOSSOM,
    DEMI_CHROME,
    Doc,
    draw_sprite,
    DUNE,
    GRAYSCALE_PALETTE,
    INVERTED_PALETTE,
    Sheet,
    Sprite,
    SpriteFont,
    SpriteGlyph,
    Tilemap
} from "./app-model";
import {CanvasSurface, log,} from "../../lib/src/canvas";
import {StandardPanelBackgroundColor} from "../../lib/src/style";
import {gen_id, Point, Rect, Size} from "../../lib/src/common";
import {BaseParentView, BaseView, CoolEvent, POINTER_DOWN, PointerEvent, with_props} from "../../lib/src/core";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {TileEditor} from "./tile_editor";
import {draw_grid, TextLine, wrap_number} from "./common";
import {draw_selection_rect, PaletteChooser} from "./palette_chooser";
import {TileSelector} from "./tile_selector";
import {make_map_view, MapEditor} from "./map_editor";

export const EMPTY_COLOR = '#62fcdc'

function setup_toolbar(doc: Doc):HBox {
    let toolbar = new HBox();
    toolbar.pad = 0
    toolbar.set_fill('#ccc')

    let new_button = new ActionButton({caption:'new'})
    new_button.on('action',()=>{
        let sheet = new Sheet("sheetx", "the sheet")
        let sprite = new Sprite(gen_id('sprite'),'spritex',8,8, doc)
        sheet.add(sprite)
        let tilemap = new Tilemap(gen_id('tilemap'),'mapx', 16, 16);
        tilemap.set_pixel(0, 0, sprite.id);
        let font = new SpriteFont(gen_id('font'),'somefont',doc)
        let glyph = new SpriteGlyph(gen_id('glyph'),'a',8,8,doc)
        font.glyphs.push(glyph)
        let empty = {
            version:2,
            sheets:[sheet.toJsonObj()],
            maps:[tilemap.toJsonObj()],
            fonts:[font.toJsonObj()]
        }
        doc.reset_from_json(empty)
    })
    toolbar.add(new_button)
    let save_button = with_props(new ActionButton(),{caption:"save"})
    save_button.on('action',()=>{
        let blob = jsonObjToBlob(doc.toJsonObj())
        forceDownloadBlob(`${doc.name}.json`,blob)
    });
    toolbar.add(save_button);

    let load_button = with_props(new ActionButton(),{caption:"load"})
    load_button.on('action',()=>{
        console.log("trying to load")
        let input_element = document.createElement('input')
        input_element.setAttribute('type','file')
        input_element.style.display = 'none'
        document.body.appendChild(input_element)
        input_element.addEventListener('change',() => {
            console.log("user picked a file, we hope");
            let files = input_element.files;
            if(files.length <= 0) return;
            let file = files[0]
            console.log(file)
            fileToJSON(file).then(data => {
                doc.reset_from_json(data)
            })
        })
        input_element.click()
    });
    toolbar.add(load_button);

    let export_button = with_props(new ActionButton(),{caption:"export"})
    export_button.on('action',() => {
        let canvas = document.createElement('canvas')
        let map = doc.get_selected_map()
        canvas.width = map.w*64
        canvas.height = map.h*64
        let ctx = canvas.getContext('2d')
        ctx.fillStyle = 'red'
        ctx.fillRect(0,0,canvas.width,canvas.height);
        map.forEachPixel((val,i,j) => {
            if (!val || val === 0) return;
            let sheet = doc.get_selected_sheet()
            let tile = sheet.sprites.find((t:Sprite) => t.id ===val);
            let x = i*64
            let y = j*64
            tile.forEachPixel((val: number, i: number, j: number) => {
                ctx.fillStyle = doc.get_color_palette()[val]
                ctx.fillRect(x+i*8, y+j*8, 8,8);
            });
        })
        canvasToPNGBlob(canvas).then((blob)=> forceDownloadBlob(`${doc.name}@8.png`,blob))
    })
    toolbar.add(export_button);

    let add_font_button = with_props(new ActionButton(),{caption:'+ font'})
    add_font_button.on('action',()=>{
        let font = new SpriteFont(gen_id('font'),'somefont',doc)
        let glyph = new SpriteGlyph(gen_id('glyph'),'a glyph',8,8,doc)
        glyph.meta.codepoint = 300
        font.glyphs.push(glyph)
        doc.fonts.push(font)
        doc.mark_dirty()
        doc.fire('structure',font)
    })
    toolbar.add(add_font_button)
    let add_sheet_button = with_props(new ActionButton(),{caption:'+ sheet'})
    add_sheet_button.on('action',()=>{
        let sheet = new Sheet("sheetx", "the sheet")
        let sprite = new Sprite(gen_id('sprite'),'spritex',8,8,doc)
        sheet.add(sprite)
        doc.sheets.push(sheet)
        doc.mark_dirty()
        doc.fire('structure',sheet)
    })
    toolbar.add(add_sheet_button)

    let add_tilemap_button = with_props(new ActionButton(),{caption:'+ tilemap'})
    add_tilemap_button.on('action',()=>{
        let tilemap = new Tilemap(gen_id('tilemap'),'mapx', 16, 16);
        doc.maps.push(tilemap)
        doc.mark_dirty()
        doc.fire('structure',tilemap)
    })
    toolbar.add(add_tilemap_button)
    let dirty_label = new CustomLabel("initial-text",()=>{
        return doc.dirty()?"dirty":"clean"
    });
    toolbar.add(dirty_label)

    let change_palette_button = with_props(new DropdownButton(), {
        caption:'palette',
        actions:[
            {caption:'Grayscale',fun:()=>doc.set_palette(GRAYSCALE_PALETTE)},
            {caption:'Inverted' ,fun:()=>doc.set_palette(INVERTED_PALETTE)},
            {caption:'Demi-chrome' ,fun:()=>doc.set_palette(DEMI_CHROME)},
            {caption:'Cherry Blossom' ,fun:()=>doc.set_palette(CHERRY_BLOSSOM)},
            {caption:'Dune' ,fun:()=>doc.set_palette(DUNE)},
        ]
    })
    toolbar.add(change_palette_button)

    let doc_name_edit = new TextLine()
    doc_name_edit.set_pref_width(200)
    doc_name_edit.set_text('unknownprojectx')
    doc_name_edit.on('action',(text)=>{
        doc.name = text
    })
    toolbar.add(doc_name_edit)
    doc.addEventListener('reload',() => {
        doc_name_edit.set_text(doc.name)
    })

    return toolbar
}

//expands all children to fill the view
//choose one to be visible based on the selected-tree-item
class SinglePanel extends BaseParentView {
    private doc: Doc;
    private pad: number;
    constructor(doc:Doc) {
        super('panel-view')
        this.doc = doc
        this._name = 'single-panel'
        this.pad = 0
    }
    override draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),StandardPanelBackgroundColor)
    }

    layout(g: CanvasSurface, available: Size): Size {
        let av = available.shrink(this.pad)
        this._children.forEach(ch => {
            ch.layout(g,av)
            ch.set_position(new Point(this.pad,this.pad))
        })
        let item = this.doc.selected_tree_item
        if(item) {
            this._children.forEach(ch => {
                // @ts-ignore
                ch._visible = false
                // @ts-ignore
                if (item instanceof Sheet && ch.name() === 'sheet-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
                // @ts-ignore
                if(item instanceof Tilemap && ch.name() === 'map-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
                if(item instanceof SpriteFont && ch.name() === 'font-editor-view') {
                    // @ts-ignore
                    ch._visible = true
                }
            })
        }
        this.set_size(available)
        return available
    }
}

function make_sheet_editor_view(doc: Doc) {
    let sheet_editor = new HBox()
    sheet_editor.set_name('sheet-editor-view')

    let vb1 = new VBox()
    let palette_chooser = new PaletteChooser(doc,doc.get_color_palette());
    vb1.add(palette_chooser);

    // tile editor, edits the current tile
    let tile_editor = new TileEditor(doc, doc.get_color_palette());
    vb1.add(tile_editor)
    let tile_name_editor = new TextLine()
    tile_name_editor.set_pref_width(200)
    vb1.add(tile_name_editor)
    tile_name_editor.on('action',(text) => {
        let tile = doc.get_selected_tile()
        if(tile) {
            tile.name = text
        }
    })
    doc.addEventListener('change',() => {
        let tile = doc.get_selected_tile()
        if(tile) {
            tile_editor.set_sprite(tile)
            tile_name_editor.set_text(tile.name)
        }
    })
    let bucket_button = with_props(new ActionButton(),{caption:'fill once'})
    bucket_button.on('action',()=>tile_editor.next_click_fill())
    vb1.add(bucket_button)
    sheet_editor.add(vb1)

    let vb2 = new VBox()
    let add_tile_button = with_props(new ActionButton(),{caption:"add tile"})
    add_tile_button.on('action',()=>{
        let sheet = doc.get_selected_sheet()
        sheet.add(new Sprite(gen_id("tile"), 'tilename',8, 8, doc));
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
    sheet_name_edit.on("action",(name) => {
        doc.get_selected_sheet().name = name
    })
    vb2.add(tb);


    // lets you see all N tiles and choose one to edit
    let sprite_selector = new TileSelector(doc)
    vb2.add(sprite_selector);
    sheet_editor.add(vb2)

    let vb3 = new VBox()
    let scratch_map = new MapEditor(doc, 32)
    let tm = new Tilemap(gen_id('scratch-tilemap'),'scratch',5,5)
    scratch_map.set_tilemap(tm)
    vb3.add(scratch_map)
    sheet_editor.add(vb3)

    doc.addEventListener('main-selection',() => {
        let sheet = doc.get_selected_sheet()
        if(sheet) sheet_name_edit.set_text(sheet.name)
    })

    return sheet_editor
}

class GlyphChooser extends BaseView {
    private doc: Doc;
    private scale: number;
    private wrap: number;
    constructor(doc: Doc) {
        super('glyph-chooser')
        this.doc = doc
        this.scale = 32;
        this.wrap = 20
        this._name = 'glyph-chooser'
    }
    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(), EMPTY_COLOR);
        let font = this.doc.get_selected_font()
        if(font) {
            font.glyphs.forEach((glyph,s)=>{
                let pt = wrap_number(s, this.wrap);
                draw_sprite(glyph, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.get_font_palette())
            })
        }
        draw_grid(g,this.size(),this.scale);
        let pt = wrap_number(this.doc.get_selected_glyph_index(),this.wrap);
        draw_selection_rect(g,new Rect(pt.x*this.scale,pt.y*this.scale,this.scale,this.scale));
    }
    input(evt: CoolEvent): void {
        if(evt.type === POINTER_DOWN) {
            let e = evt as PointerEvent
            let pt = e.position.divide_floor(this.scale);
            let val = pt.x + pt.y * this.wrap;
            let font = this.doc.get_selected_font()
            if (val >= 0 && val < font.glyphs.length) {
                this.doc.set_selected_glyph_index(val);
            }
        }
    }
    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.wrap*this.scale,6*this.scale))
        return this.size()
    }
}

class FontPreview extends BaseView {
    private text: string;
    private doc: any;
    constructor(doc) {
        super(gen_id('font-preview'))
        this.text = 'abc123'
        this.doc = doc
    }

    set_text(text: string) {
        this.text = text
    }

    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(),'white')
        g.strokeBackgroundSize(this.size(),'black')
        let font = this.doc.get_selected_font()
        if(!font) return
        let x = 20
        let y = 20
        let s = 8*2
        g.ctx.imageSmoothingEnabled = false
        for(let i=0; i<this.text.length; i++) {
            let cp = this.text.codePointAt(i)
            let glyph = font.glyphs.find(g => g.meta.codepoint == cp)
            if(glyph) {
                let left = glyph.meta.left
                let right = glyph.meta.right
                let baseline = glyph.meta.baseline
                let w = glyph.w
                let h = glyph.h
                g.ctx.drawImage(glyph._img,
                    left,0,w-left-right,h,
                    x-left, y+baseline*2,
                    (w-left-right)*2,h*2)
                x += (w-left-right)*2 + 2
            } else {
                g.ctx.fillStyle = 'black'
                g.ctx.strokeRect(x, y, s,s)
                x += (s+2)
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(500,100))
        return this.size()
    }

}

function make_font_view(doc: Doc) {
    let panel = new HBox()
    panel.set_name('font-editor-view')
    panel.set_fill(StandardPanelBackgroundColor)
    panel.set_hflex(true)
    panel.set_vflex(true)

    let col1 = new VBox()
    col1.set_vflex(true)
    col1.set_hflex(false)
    //show number of glyphs
    let glyph_count_label = new CustomLabel("",()=>{
        let font = doc.get_selected_font()
        if(font) return font.glyphs.length+""
        return "?"
    })
    col1.add(glyph_count_label)


    let palette_chooser = new PaletteChooser(doc,doc.get_font_palette());
    col1.add(palette_chooser);

    let editor = new TileEditor(doc,doc.get_font_palette())
    col1.add(editor)


    let row1 = new HBox()
    row1.set_hflex(false)
    //show id of the glyph
    row1.add(new Label("id"))
    let id_label = new CustomLabel("id",()=>{
        let glyph = doc.get_selected_glyph()
        if(glyph) return glyph.id
        return "???"
    })
    row1.add(id_label)
    col1.add(row1)

    let row2 = new HBox()
    row2.set_hflex(false)
    row2.add(new Label("name"))
    //edit name of the glyph
    let name_box = new TextLine()
    name_box.on('action',(text) => {
        let glyph = doc.get_selected_glyph()
        if(glyph) glyph.name = text
    })
    row2.add(name_box)
    col1.add(row2)

    let row3 = new HBox()
    row3.set_hflex(false)
    //edit codepoint of the glyph
    row3.add(new Label("codepoint"))
    let codepoint_edit = new TextLine()
    codepoint_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        if(glyph && parseInt(text)) glyph.meta.codepoint = parseInt(text)
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row3.add(codepoint_edit)
    col1.add(row3)

    let row4 = new HBox()
    row4.set_hflex(false)
    row4.add(new Label("left"))
    let left_edit = new TextLine()
    left_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.left = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row4.add(left_edit)
    row4.add(new Label("right"))
    let right_edit = new TextLine()
    right_edit.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.right = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row4.add(right_edit)
    col1.add(row4)

    let row5 = new HBox()
    row5.set_hflex(false)
    row5.add(new Label('baseline'))
    let baseline_text = new TextLine()
    baseline_text.on('action',(text)=>{
        let glyph = doc.get_selected_glyph()
        let parsed = parseInt(text)
        if(glyph && !isNaN(parsed)) glyph.meta.baseline = parsed
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    row5.add(baseline_text)
    col1.add(row5)
    panel.add(col1)

    let col2 = new VBox()
    col2.set_vflex(true)
    col2.set_hflex(false)

    let toolbar = new HBox()
    toolbar.set_hflex(false)
    let add_glyph_button = with_props(new ActionButton(),{caption:"add glyph"})
    add_glyph_button.on('action',()=>{
        let font = doc.get_selected_font()
        let glyph = new SpriteGlyph(gen_id('glyph'),'glyphname',8,8, doc)
        glyph.meta.codepoint = 400
        font.add(glyph)
        doc.set_selected_glyph(glyph)
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(add_glyph_button)

    let sort_glyphs = with_props(new ActionButton(),{caption:'sort'})
    sort_glyphs.on('action',()=>{
        let font = doc.get_selected_font()
        font.glyphs.sort((a,b)=>{
            return a.meta.codepoint - b.meta.codepoint
        })
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(sort_glyphs)


    toolbar.add(new Label("name"))
    let font_name_edit = new TextLine()
    font_name_edit.set_pref_width(200)
    if(doc.get_selected_font()) {
        font_name_edit.set_text(doc.get_selected_font().name)
    }
    font_name_edit.on("action",(name) => {
        if(doc.get_selected_font()) doc.get_selected_font().name = name
    })
    toolbar.add(font_name_edit)

    col2.add(toolbar)

    doc.addEventListener('change',() => {
        let glyph = doc.get_selected_glyph()
        if(glyph) {
            editor.set_sprite(glyph)
            name_box.set_text(glyph.name)
            codepoint_edit.set_text(glyph.meta.codepoint+"")
            left_edit.set_text(glyph.meta.left+"")
            right_edit.set_text(glyph.meta.right+"")
            baseline_text.set_text(glyph.meta.baseline+"")
        }
    })
    col2.add(new GlyphChooser(doc))

    let preview_box = new TextLine()
    preview_box.set_text('abc123')
    // preview_box.hflex = false
    preview_box.set_pref_width(400)
    col2.add(preview_box)
    let preview_canvas = new FontPreview(doc)
    preview_canvas.set_text('abc123')
    col2.add(preview_canvas)
    preview_box.on("action",(text)=>{
        preview_canvas.set_text(text)
    })

    panel.add(col2)

    doc.addEventListener('main-selection',() => {
        let font = doc.get_selected_font()
        if(font) font_name_edit.set_text(font.name)
    })

    return panel
}


export function start() {
    let root = new LayerView('root-layer')
    let popup_layer = new LayerView('popup-layer')

    log("starting")

    let surface = new CanvasSurface(1200,700);
    surface.debug = false
    let doc = new Doc();
    doc.check_backup();
    let timeout_id = 0
    function check_dirty() {
        if(doc.dirty()) {
            doc.persist()
            surface.repaint()
        }
    }
    surface.on_input((e)=>{
        clearTimeout(timeout_id)
        timeout_id = setTimeout(check_dirty,2000)
    })
    //draws border
    let main_view = new VBox()
    main_view.pad = 0
    main_view.set_name('main-view')
    main_view.set_hflex(true)
    main_view.set_vflex(true)

    //label at the top
    let main_label = new Header('Tile Map Editor')
    main_view.add(main_label);

    let toolbar = setup_toolbar(doc);
    toolbar.id = 'toolbar'
    main_view.add(toolbar);

    let hb = new HBox()
    hb.set_name('main-col')
    hb.set_vflex(true)
    hb.set_hflex(true)
    hb.set_fill('red')
    hb.pad = 0
    main_view.add(hb)

    function rebuild_data(doc) {
        let data = []
        doc.fonts.forEach(font => data.push(font))
        doc.sheets.forEach(sheet => data.push(sheet))
        doc.maps.forEach(map => data.push(map))
        return data
    }
    let data = rebuild_data(doc)
    let itemlist = new SelectList(data,(item)=>{
        if (item instanceof Sheet) {
            return (item as Sheet).name
        }
        if (item instanceof Sprite) {
            return (item as Sprite).id
        }
        if (item instanceof Tilemap) {
            return (item as Tilemap).name
        }
        if (item instanceof SpriteFont) {
            return(item as SpriteFont).name
        }
        return "???"
    })
    // @ts-ignore
    itemlist.on('change',(e)  => {
        doc.set_selected_tree_item(e.item)
        // doc.set_selected_tree_item_index(e.y)
        if (e.item instanceof Sheet) {
            doc.set_selected_sheet(e.item as Sheet)
        }
        if (e.item instanceof Tilemap) {
            doc.set_selected_map(e.item as Tilemap)
        }
        if (e.item instanceof SpriteFont) {
            doc.set_selected_font(e.item as SpriteFont)
        }
    })
    hb.add(itemlist)

    let panel_view = new SinglePanel(doc);
    panel_view.set_name('single panel')
    hb.add(panel_view)

    let sheet_editor = make_sheet_editor_view(doc);
    panel_view.add(sheet_editor)


    let map_view = make_map_view(doc)
    panel_view.add(map_view)

    panel_view.add(make_font_view(doc))


    doc.addEventListener('change',() => {
        surface.repaint();
    });
    doc.addEventListener('reload',() => {
        let data = rebuild_data(doc)
        itemlist.set_data(data)
        surface.repaint()
    })
    doc.addEventListener('structure',() => {
        let data = rebuild_data(doc)
        itemlist.set_data(data)
        surface.repaint()
    })
    doc.addEventListener('main-selection',() => {
        console.log("main selection changed. refresh the view")
    })

    root.add(new KeystrokeCaptureView(main_view))
    root.add(popup_layer)
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()
}
