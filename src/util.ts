export function gen_id(prefix: string) {
    return `${prefix}_${Math.floor(Math.random() * 100000)}`
}
