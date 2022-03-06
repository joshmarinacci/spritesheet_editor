import {Callback, Observable} from "./uilib/common";

export function on(target: Observable, event_type: string, cb: Callback) {
    target.addEventListener(event_type, cb);
}

function wait(msec: number, cb: Callback) {
    setTimeout(() => {
        cb({})
    }, msec)
}

export function randi(min: number, max: number) {
    return Math.floor(min + Math.random() * (max - min))
}


export function canvasToPNGBlob(canvas) {
    return new Promise((res,rej)=>{
        canvas.toBlob((blob)=>{
            res(blob)
        },'image/png')
    })
}

export function forceDownloadBlob(title,blob) {
    console.log("forcing download of",title)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = title
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export function jsonObjToBlob(toJsonObj: any) {
    let str = JSON.stringify(toJsonObj,null, '   ');
    return new Blob([str]);
}

export async function fileToJSON(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader()
        // @ts-ignore
        fileReader.onload = event => resolve(JSON.parse(event.target.result))
        fileReader.onerror = error => reject(error)
        fileReader.readAsText(file)
    })
}


