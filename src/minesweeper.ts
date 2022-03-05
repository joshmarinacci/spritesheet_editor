import {CanvasSurface, CommonEvent, EVENTS, View} from "./canvas";
import {GridModel} from "./models";
import {LayerView} from "./components";
import {Rect} from "./util";

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
        this.grid = new GridModel(20,20)
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

class MinesweeperView implements View {
    private model: MinesweeperModel;
    private bounds: Rect;
    private scale: number;
    private id: string;
    constructor(model:MinesweeperModel) {
        this.id = 'minesweepr-view'
        this.model = model
        this.scale = 32
        this.bounds = new Rect(0,0,this.model.grid.w*this.scale,this.model.grid.h*this.scale);
    }
    layout(g: CanvasSurface, parent: View): void {
    }
    visible(): boolean {
        return true
    }
    draw(g: CanvasSurface): void {
        g.fillBackground(this.bounds,'black')
        this.model.grid.forEach((w,x,y)=>{
            let color = '#ccc'
            if(w.mine) {
                color = 'black'
            }
            if(w.covered) {
                color = 'red'
            }
            g.fillRect(x*this.scale,y*this.scale,this.scale-1,this.scale-1,color)
            if(!w.covered) {
                g.ctx.fillStyle = 'black'
                g.ctx.fillText(`${w.adjacent}`, x * this.scale+8, y * this.scale+16)
            }
        })
        g.strokeBackground(this.bounds,'black')
    }
    get_bounds(): Rect {
        return this.bounds
    }
    input(e: CommonEvent): void {
        if(e.type === 'mousedown') {
            let pt = e.pt.divide_floor(this.scale);
            let cell = this.model.grid.get_at(pt);
            console.log('cell is',cell);
            if (cell.covered === true) {
                cell.covered = false;
                e.ctx.repaint()
            }
        }
    }
}

export function start() {

    let model = new MinesweeperModel()
    model.reset(20)

    let surface = new CanvasSurface(500,500);
    let root = new LayerView()
    root.bounds.w = 500
    root.bounds.h = 500
    let board_layer = new LayerView();
    board_layer.bounds.w = 500;
    board_layer.bounds.h = 500;
    board_layer.id = 'board'
    board_layer.add(new MinesweeperView(model))
    root.add(board_layer)

    surface.setup_mouse_input()
    surface.set_root(root)
    surface.addToPage()
    surface.debug = false
    surface.repaint()
}
