import {
    ActionButton,
    CustomLabel,
    DropdownButton,
    HBox,
    Header,
    KeystrokeCaptureView,
    LayerView,
    SelectList,
    VBox,
} from "../../lib/src/components";
import {DebugLayer} from "../../lib/src/debug";
import {canvasToPNGBlob, fileToJSON, forceDownloadBlob, jsonObjToBlob} from "../../common/util";
import {
    CHERRY_BLOSSOM,
    DEMI_CHROME,
    Doc,
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
import {gen_id, Point, Size} from "../../lib/src/common";
import {BaseParentView, with_props} from "../../lib/src/core";
// @ts-ignore
import basefont_data from "../../lib/src/base_font.json";
import {TextLine} from "./common";
import {make_map_view} from "./map_editor";
import {make_font_view} from "./font_editor";
import {make_sheet_editor_view} from "./sheet_editor";

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
    root.add(new DebugLayer())
    surface.set_root(root)
    surface.load_jsonfont(basefont_data,'somefont','base')
    surface.addToPage();
    surface.setup_mouse_input()
    surface.setup_keyboard_input()
    surface.repaint()
}
