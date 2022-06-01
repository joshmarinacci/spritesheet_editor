import {
    CanvasSurface,
    BaseView,
    CoolEvent,
    POINTER_DOWN,
    Size,
    with_props,
    VBox,
    HBox,
    PointerEvent,
    ActionButton,
    TextLine,
    Label,
    SpriteFont,
    Rect,
    CustomLabel,
    gen_id,
    SpriteGlyph, StandardPanelBackgroundColor,
} from "thneed-gfx";
import {Doc, draw_sprite} from "./app-model";
import {draw_grid, wrap_number} from "./common";
import {draw_selection_rect, PaletteChooser} from "./palette_chooser";
import {TileEditor} from "./tile_editor";

export const EMPTY_COLOR = '#62fcdc'

export class GlyphChooser extends BaseView {
    private doc: Doc;
    private scale: number;
    private wrap: number;
    private _font: SpriteFont;
    public selected_glyph_index: number

    constructor(doc: Doc) {
        super('glyph-chooser')
        this.doc = doc
        this.scale = 32;
        this.wrap = 20
        this._name = 'glyph-chooser'
        this.selected_glyph_index = 0
    }

    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(), EMPTY_COLOR);
        let font = this._font
        if (font) {
            font.glyphs.forEach((glyph, s) => {
                let pt = wrap_number(s, this.wrap);
                draw_sprite(glyph, g, pt.x * this.scale, pt.y * this.scale, 4, this.doc.get_font_palette())
            })
            draw_grid(g, this.size(), this.scale);
            let pt = wrap_number(this.selected_glyph_index, this.wrap);
            draw_selection_rect(g, new Rect(pt.x * this.scale, pt.y * this.scale, this.scale, this.scale));
        }
    }

    input(evt: CoolEvent): void {
        if (evt.type === POINTER_DOWN) {
            let e = evt as PointerEvent
            let pt = e.position.divide_floor(this.scale);
            let val = pt.x + pt.y * this.wrap;
            let font = this._font
            if(font) {
                if (val >= 0 && val < font.glyphs.length) {
                    this.selected_glyph_index = val;
                    this.doc.fire('change', this.selected_glyph_index)
                }
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(this.wrap * this.scale, 6 * this.scale))
        return this.size()
    }

    set_font(font: SpriteFont) {
        this._font = font
    }

    get_selected_glyph() {
        if(!this._font) return null
        return this._font.glyphs[this.selected_glyph_index]
    }

    set_selected_glyph(glyph: SpriteGlyph) {
        this.selected_glyph_index = this._font.glyphs.indexOf(glyph)
    }
}

export class FontPreview extends BaseView {
    private text: string;
    private doc: any;
    private _font: SpriteFont;

    constructor(doc) {
        super(gen_id('font-preview'))
        this.text = 'abc123'
        this.doc = doc
    }

    set_text(text: string) {
        this.text = text
    }

    draw(g: CanvasSurface) {
        g.fillBackgroundSize(this.size(), 'white')
        g.strokeBackgroundSize(this.size(), 'black')
        let font = this._font
        if (!font) return
        let x = 20
        let y = 20
        let s = 8 * 2
        g.ctx.imageSmoothingEnabled = false
        for (let i = 0; i < this.text.length; i++) {
            let cp = this.text.codePointAt(i)
            let glyph = font.glyphs.find(g => g.meta.codepoint == cp)
            if (glyph) {
                let left = glyph.meta.left
                let right = glyph.meta.right
                let baseline = glyph.meta.baseline
                let w = glyph.w
                let h = glyph.h
                g.ctx.drawImage(glyph._img,
                    left, 0, w - left - right, h,
                    x - left, y + baseline * 2,
                    (w - left - right) * 2, h * 2)
                x += (w - left - right) * 2 + 2
            } else {
                g.ctx.fillStyle = 'black'
                g.ctx.strokeRect(x, y, s, s)
                x += (s + 2)
            }
        }
    }

    layout(g: CanvasSurface, available: Size): Size {
        this.set_size(new Size(500, 100))
        return this.size()
    }

    font() {
        return this._font
    }
    set_font(font: SpriteFont) {
        this._font = font;
    }
}

export function make_font_view(doc: Doc) {
    let glyph_chooser = new GlyphChooser(doc)

    let panel = new HBox()
    panel.set_name('font-editor-view')
    panel.set_fill(StandardPanelBackgroundColor)
    panel.set_hflex(true)
    panel.set_vflex(true)

    let col1 = new VBox()
    col1.set_vflex(true)
    col1.set_hflex(false)
    //show number of glyphs
    let glyph_count_label = new CustomLabel("", () => {
        let font = doc.get_selected_font()
        if (font) return font.glyphs.length + ""
        return "?"
    })
    col1.add(glyph_count_label)


    let palette_chooser = new PaletteChooser(doc, doc.get_font_palette());
    col1.add(palette_chooser);

    let editor = new TileEditor(doc, doc.get_font_palette())
    col1.add(editor)


    let row1 = new HBox()
    row1.set_hflex(false)
    //show id of the glyph
    row1.add(new Label("id"))
    let id_label = new CustomLabel("id", () => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            if (glyph) return glyph.id
        }
        return "???"
    })
    row1.add(id_label)
    col1.add(row1)

    let row2 = new HBox()
    row2.set_hflex(false)
    row2.add(new Label("name"))
    //edit name of the glyph
    let name_box = new TextLine()
    name_box.on('action', (text) => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            if (glyph) glyph.name = text
        }
    })
    row2.add(name_box)
    col1.add(row2)

    let row3 = new HBox()
    row3.set_hflex(false)
    //edit codepoint of the glyph
    row3.add(new Label("codepoint"))
    let codepoint_edit = new TextLine()
    codepoint_edit.on('action', (text) => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            if (glyph && parseInt(text)) glyph.meta.codepoint = parseInt(text)
            doc.mark_dirty()
            doc.fire('change', "added a glyph");
        }
    })
    row3.add(codepoint_edit)
    col1.add(row3)

    let row4 = new HBox()
    row4.set_hflex(false)
    row4.add(new Label("left"))
    let left_edit = new TextLine()
    left_edit.on('action', (text) => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            let parsed = parseInt(text)
            if (glyph && !isNaN(parsed)) glyph.meta.left = parsed
            doc.mark_dirty()
            doc.fire('change', "added a glyph");
        }
    })
    row4.add(left_edit)
    row4.add(new Label("right"))
    let right_edit = new TextLine()
    right_edit.on('action', (text) => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            let parsed = parseInt(text)
            if (glyph && !isNaN(parsed)) glyph.meta.right = parsed
            doc.mark_dirty()
            doc.fire('change', "added a glyph");
        }
    })
    row4.add(right_edit)
    col1.add(row4)

    let row5 = new HBox()
    row5.set_hflex(false)
    row5.add(new Label('baseline'))
    let baseline_text = new TextLine()
    baseline_text.on('action', (text) => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            let parsed = parseInt(text)
            if (glyph && !isNaN(parsed)) glyph.meta.baseline = parsed
            doc.mark_dirty()
            doc.fire('change', "added a glyph");
        }
    })
    row5.add(baseline_text)
    col1.add(row5)
    panel.add(col1)

    let col2 = new VBox()
    col2.set_vflex(true)
    col2.set_hflex(false)

    let toolbar = new HBox()
    toolbar.set_hflex(false)
    let add_glyph_button = with_props(new ActionButton(), {caption: "add glyph"})
    add_glyph_button.on('action', () => {
        let font = doc.get_selected_font()
        let glyph = new SpriteGlyph(gen_id('glyph'), 'glyphname', 8, 8, doc)
        glyph.meta.codepoint = 400
        font.add(glyph)
        glyph_chooser.set_selected_glyph(glyph)
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(add_glyph_button)

    let sort_glyphs = with_props(new ActionButton(), {caption: 'sort'})
    sort_glyphs.on('action', () => {
        let font = doc.get_selected_font()
        font.glyphs.sort((a, b) => {
            return a.meta.codepoint - b.meta.codepoint
        })
        doc.mark_dirty()
        doc.fire('change', "added a glyph");
    })
    toolbar.add(sort_glyphs)


    toolbar.add(new Label("name"))
    let font_name_edit = new TextLine()
    font_name_edit.set_pref_width(200)
    if (doc.get_selected_font()) {
        font_name_edit.set_text(doc.get_selected_font().name)
    }
    font_name_edit.on("action", (name) => {
        if (doc.get_selected_font()) doc.get_selected_font().name = name
    })
    toolbar.add(font_name_edit)

    col2.add(toolbar)

    doc.addEventListener('change', () => {
        let font = doc.get_selected_font()
        if(font) {
            let glyph = glyph_chooser.get_selected_glyph()
            if (glyph) {
                editor.set_sprite(glyph)
                name_box.set_text(glyph.name)
                codepoint_edit.set_text(glyph.meta.codepoint + "")
                left_edit.set_text(glyph.meta.left + "")
                right_edit.set_text(glyph.meta.right + "")
                baseline_text.set_text(glyph.meta.baseline + "")
            }
        }
    })
    col2.add(glyph_chooser)

    let preview_box = new TextLine()
    preview_box.set_text('abc123')
    // preview_box.hflex = false
    preview_box.set_pref_width(400)
    col2.add(preview_box)
    let preview_canvas = new FontPreview(doc)
    preview_canvas.set_text('abc123')
    col2.add(preview_canvas)
    preview_box.on("action", (text) => {
        preview_canvas.set_text(text)
    })

    panel.add(col2)

    doc.addEventListener('main-selection', () => {
        let font = doc.get_selected_font()
        if (font) {
            font_name_edit.set_text(font.name)
            preview_canvas.set_font(font)
            glyph_chooser.set_font(font)
            let glyph = glyph_chooser.get_selected_glyph()
            if (glyph) {
                editor.set_sprite(glyph)
            }
        }
    })

    return panel
}