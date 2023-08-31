"use strict"
const reInt = /^\d+$/

export function copy(value) { return JSON.parse(JSON.stringify(value)) }
export function isArray(value) { return Array.isArray(value) }
export function isObject(value) { return !isArray(value) && typeof (value ?? 0) == "object" }
export function isComposed(value) { return (typeof value === "object" && value !== null) }
export function isPrimitive(value) { return !isComposed(value) }
export function isKey(property) {
    if (typeof property == 'number' || typeof property == 'string') return true
    return false
}

export function toKey(property) {
    if (typeof property == 'number') return property
    const key = `${property}`
    return reInt.test(key) ? parseInt(key, 10) : key
}
export function toPath(jspointer) {
    return jspointer.split("/").map(p => toKey(p))
}

export function typeOf(value) {
    switch (true) {
        case value === null: return 'null'
        case value === undefined: return 'undefined'
        case isArray(value): return 'array'
        case isObject(value): return 'object'
    }
    return typeof value
}

export function default_abstract(value, $, dynamik) {
    if (value == null) return "~"
    if (isComposed(value)) return Object.values(value).map(item => default_abstract(item)).join(",")
    return String(value)
}
