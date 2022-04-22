import {CanvasSurface, SurfaceContext} from "../../lib/src/canvas";
import {LayerView} from "../../lib/src/containers";
import {GridModel} from "../../common/models";
import {
    BaseView,
    CoolEvent,
    POINTER_DOWN,
    PointerEvent,
    Size
} from "../../lib/src/core";

/*

20x20 model
place random mines
set the view of each to covered

the view draws each cell using different colors for each.

covered
flagged
uncovered empty
uncovered mine
uncovered with number of adjacent

if all mines are flagged and all other cells are uncovered then you win and next level
if mine uncovered then you lose


 */
class Cell {
    private covered: boolean;
    mine: boolean;
    adjacent:number
    constructor() {
        this.covered = true
        this.mine = false
        this.adjacent = 0
    }
}

class MinesweeperModel {
    grid: GridModel;
    constructor() {
        this.grid = new GridModel(new Size(20,20))
        this.grid.fill_all(()=>{
            return new Cell()
        })
    }

    reset(number: number) {
        this.grid.fill_all(()=>{
            return new Cell()
        })
        for (let i=0; i<number; i++) {
            let n = Math.floor(Math.random() * this.grid.w * this.grid.h)
            let x = n % this.grid.w;
            let y = Math.floor(n/this.grid.w)
            let cell = this.grid.get_xy(x,y)
            cell.mine = true
            // console.log("set mine at ",n,x,y);
        }
        this.grid.forEach((w,x,y)=>{
            w.adjacent = this.count_adjacent_mines(x, y)
        })
    }

    count_adjacent_mines(x, y) {
        let count = 0;
        let jstart = y-1
        if(jstart < 0) jstart = 0;
        let jend = y+1
        if(jend >= this.grid.h) jend = y

        let istart = x-1;
        if(istart < 0) istart = 0
        let iend = x+1
        if(iend >= this.grid.w) iend = y

        for(let j=jstart; j<=jend; j++) {
            for(let i=istart; i<=iend; i++) {
                let cell:Cell = this.grid.get_xy(i,j);
                if (cell.mine) {
                    count+=1
                }
            }
        }
        return count
    }
}

class MinesweeperView extends BaseView {
    private model: MinesweeperModel;
    private scale: number;
    constructor(model:MinesweeperModel) {
        super('minesweepr-view')
        this.model = model
        this.scale = 32
        this.set_size(new Size(this.model.grid.w*this.scale,this.model.grid.h*this.scale))
    }
    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(),'black')
        this.model.grid.forEach((w,x,y)=>{
            let color = '#ccc'
            if(w.mine) {
                color = 'black'
            }
            if(w.covered) {
                color = 'red'
            }
            // @ts-ignore
            g.fillRect(x*this.scale,y*this.scale,this.scale-1,this.scale-1,color)
            if(!w.covered) {
                // @ts-ignore
                g.ctx.fillStyle = 'black'
                // @ts-ignore
                g.ctx.fillText(`${w.adjacent}`, x * this.scale+8, y * this.scale+16)
            }
        })
        g.strokeBackgroundSize(this.size(),'black')
    }
    input(evt: CoolEvent): void {
        if(evt.type === POINTER_DOWN) {
            let e = evt as PointerEvent
            let pt = e.position.divide_floor(this.scale);
            let cell = this.model.grid.get_at(pt);
            console.log('cell is',cell);
            if (cell.covered === true) {
                cell.covered = false;
                e.ctx.repaint()
            }
        }
    }

    layout(g: SurfaceContext, available: Size): Size {
        return this.size()
    }
}

export function start() {

    let model = new MinesweeperModel()
    model.reset(20)

    let surface = new CanvasSurface(500,500);
    let root = new LayerView()
    let board_layer = new LayerView();
    board_layer.id = 'board'
    board_layer.add(new MinesweeperView(model))
    root.add(board_layer)

    surface.set_root(root)
    surface.start()
}
