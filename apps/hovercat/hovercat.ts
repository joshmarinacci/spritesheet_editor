import {
    BaseView,
    CanvasSurface,
    KEYBOARD_DOWN, KEYBOARD_UP,
    LayerView,
    Point,
    Rect,
    Sheet,
    Size,
    Sprite,
    SurfaceContext,
    Tilemap
} from "thneed-gfx"
import {
    Doc, PICO8,
} from "../tileeditor/app-model";
import {do_physics, Physics, Player} from "./physics";
// @ts-ignore
import hovercat_json from "./hovercat.json";


const SCALE = 5
const CANVAS_SIZE = new Size(20,16)
const TILE_SIZE = 8

function log(...args) {
    console.log(...args)
}


class TilemapView extends BaseView {
    map: Tilemap;
    private sheet: Sheet;
    // scroll: Point;
    private cache: Map<string, Sprite>;
    private player: Player;

    constructor(map: Tilemap, sheet: Sheet, player: Player) {
        super('dialog-view');
        this.player = player
        this.map = map
        this.sheet = sheet
        // this.scroll = new Point(0,0)
        log('size is',this.map.w,this.map.h)
        this.cache = new Map()
    }
    draw(g: SurfaceContext): void {
        let tile_w = TILE_SIZE
        let w = this.size().w/SCALE/tile_w
        let h = this.size().h/SCALE/tile_w
        let view_w_tiles = w
        let map_w_pixels = this.map.w * SCALE * tile_w

        g.fillBackgroundSize(this.size(),'rgba(255,255,255,0.7)')
        // @ts-ignore
        g.ctx.imageSmoothingEnabled = false
        let tile_x_off = Math.floor(this.player.scroll.x/tile_w/SCALE)
        let scroll_x =  (tile_x_off*tile_w*SCALE)- this.player.scroll.x

        for(let i=0; i<w+1; i++) {
            for(let j=0; j<h; j++) {
                let x = i*tile_w*SCALE + scroll_x
                let y = j*tile_w*SCALE
                // g.fillRect(x,y,8,8, 'red');
                let tile_id = this.map.get_pixel(i+tile_x_off,j)
                if(!this.cache.has(tile_id)) {
                    let tile = this.sheet.sprites.find((t:Sprite) => t.id === tile_id);
                    this.cache.set(tile_id,tile)
                }
                let tile = this.cache.get(tile_id)
                let scale = tile_w*SCALE
                if(tile) {
                    // @ts-ignore
                    g.ctx.drawImage(tile._img,x,y, scale, scale)
                }
            }
        }
    }
    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(available)
        return this.size()
    }
    set_visible(visible: boolean) {
        this._visible = visible
    }
}

class PlayerView extends BaseView {
    private player: any;
    private sprite1: Sprite
    private sprite2: Sprite
    test_point: Point;
    constructor(model: any, spritesheet: Sheet) {
        super('sprite-view')
        this.player = model;
        this.sprite1 = spritesheet.sprites.find(sp => sp.name === 'cat1')
        this.sprite2 = spritesheet.sprites.find(sp => sp.name === 'cat2')
        this.set_size(new Size(TILE_SIZE,TILE_SIZE))
        this.test_point = new Point(0,0)
    }
    draw(g: SurfaceContext): void {
        // @ts-ignore
        g.ctx.imageSmoothingEnabled = false
        // g.draw_sprite(0,0,this.sprite1,SCALE)
        let x = 0 - this.player.scroll.x;
        let y = 0;
        // @ts-ignore
        g.draw_sprite(x,0,this.sprite2,SCALE)
        //draw the bounds
        g.stroke(new Rect(x,0,this.player.size.w*SCALE,this.player.size.h*SCALE), 'red')
        g.stroke(new Rect(
            x + this.test_point.x*SCALE-this.position().x,
            this.test_point.y*SCALE-this.position().y,5,5),'green')
    }
    position(): Point {
        return new Point(
            this.player.position.x*SCALE,
            this.player.position.y*SCALE,
        )
    }

    layout(g: SurfaceContext, available: Size): Size {
        return this.size()
    }
}

function do_scroll(player: Player) {
    if(player.position.x > 100) {
        player.scroll.x = (player.position.x - 100)*SCALE
    } else {
        player.scroll.x = 0
    }
    if(player.position.x < 0) {
        player.position.x = 0
    }
}

export async function start() {
    let doc = new Doc()
    doc.reset_from_json(hovercat_json)
    doc.set_palette(PICO8)
    log(doc)


    let level1 = doc.find_tilemap_by_name('level1')
    log("level1 is", level1)
    let level1_sheet = doc.find_sheet_by_name('base-sheet');
    console.log("sheet is", level1_sheet)
    let surface = new CanvasSurface(CANVAS_SIZE.w * 8 * SCALE, CANVAS_SIZE.h * 8 * SCALE);
    // surface.load_jsonfont(doc,'base','base')


    let root = new LayerView()

    let player = new Player();
    let tile_view = new TilemapView(level1, level1_sheet, player)
    root.add(tile_view)

    let player_view = new PlayerView(player, level1_sheet)
    root.add(player_view)

    surface.set_root(root);
    surface.start()

    let key_map = new Map<string,boolean>();
    surface.on_input((evt) => {
        if (evt.type === KEYBOARD_UP) {
            let e = evt as KeyboardEvent
            key_map.set(e.code,false)
        }
        if (evt.type === KEYBOARD_DOWN) {
            let e = evt as KeyboardEvent
            key_map.set(e.code,true)
            // if (e.code === 'Space') {
            //     if (player.standing) {
            //         player.vel.y = -3.5
            //         player.standing = false
            //     }
            // }
        }
    })

    let clock = 0
    // let max_vel = new Point(1, 10)
    player.position.y = 4
    player.vel.y = 0

    let ground:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'ground')
    let block1:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block1')
    let block2:Sprite = level1_sheet.sprites.find((t: Sprite) => t.name === 'block2')
    Physics.BLOCKS_FALLING.push(ground)
    Physics.BLOCKS_FALLING.push(block1)
    Physics.BLOCKS_FALLING.push(block2)
    Physics.BLOCKS_SIDEWAYS.push(block1)
    Physics.BLOCKS_SIDEWAYS.push(block2)

    function is_down(name: string) {
        if(!key_map.has(name)) key_map.set(name,false)
        return key_map.get(name)
    }

    function do_input() {
        if(is_down('ArrowLeft')) player.vel.x = -1
        if(is_down('ArrowRight')) player.vel.x = +1
        if(is_down('Space') && player.standing === true) {
            player.vel.y = -3.5
            player.standing = false
        }
    }

    function process_tick() {
        clock += 1
        do_input();
        do_physics(player, tile_view.map)
        do_scroll(player);
    }

    function restart() {
        log("restarting")
    }
    restart()

    // draw background layer
    // draw foreground layer
    // draw enmies
    // draw draw player sprite

    function refresh() {
        process_tick()
        surface.repaint()
        requestAnimationFrame(refresh)
    }
    requestAnimationFrame(refresh)
}
