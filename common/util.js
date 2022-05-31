var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function wait(msec, cb) {
    setTimeout(() => {
        cb({});
    }, msec);
}
export function randi(min, max) {
    return Math.floor(min + Math.random() * (max - min));
}
export function canvasToPNGBlob(canvas) {
    return new Promise((res, rej) => {
        canvas.toBlob((blob) => {
            res(blob);
        }, 'image/png');
    });
}
export function forceDownloadBlob(title, blob) {
    console.log("forcing download of", title);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
export function jsonObjToBlob(toJsonObj) {
    let str = JSON.stringify(toJsonObj, null, '   ');
    return new Blob([str]);
}
export function fileToJSON(file) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            // @ts-ignore
            fileReader.onload = event => resolve(JSON.parse(event.target.result));
            fileReader.onerror = error => reject(error);
            fileReader.readAsText(file);
        });
    });
}
