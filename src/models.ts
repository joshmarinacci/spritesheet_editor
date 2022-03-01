import {Callback, Point} from "./util";
import {log} from "./canvas";

export class GridModel {
    w: number;
    h: number;
    private data: any[];

    constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.data = []
        for (let i = 0; i < this.w * this.h; i++) {
            this.data[i] = 0;
        }
    }

    get_xy(x: number, y: number): any {
        let n = this.xy_to_n(x, y);
        return this.data[n]
    }

    set_xy(x: number, y: number, value: any) {
        let n = this.xy_to_n(x, y);
        this.data[n] = value;
    }

    fill_all(cb: Callback) {
        this.data = this.data.map((v) => cb(v));
    }

    fill_row(row: number, cb: Callback) {
        for (let i = 0; i < this.h; i++) {
            this.set_xy(i, row, cb(this.get_xy(i, row)))
        }
    }

    fill_col(col: number, cb: Callback) {
        for (let v = 0; v < this.h; v++) {
            this.set_xy(col, v, cb(this.get_xy(col, v)))
        }
    }

    private xy_to_n(x: number, y: number) {
        return x + y * this.h;
    }

    forEach(cb: (w, x, y) => void) {
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                cb(this.get_xy(i, j), i, j);
            }
        }
    }

    dump() {
        log("grid model", this.w, this.h);
        log(this.data);
    }

    get_at(pt: Point) {
        return this.get_xy(pt.x, pt.y)
    }

    set_at(pt: Point, value: any) {
        return this.set_xy(pt.x, pt.y, value)
    }
}
