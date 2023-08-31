"use strict"
import { SchemaCompiler } from "./compiler.js"
import { DataInitialiser, DataReleaser } from "./data.js"
import { isArray, isObject, isComposed, isPrimitive, toPath, typeOf, default_abstract, toKey } from "./utils.js"

const rePointer = /^\d*([/][^/]+)*$/    // absolute or relative pointer
const reAPointer = /^([/][^/]+)*$/      // absolute pointer
const reRPointer = /^\d+([/][^/]+)*$/   // relative pointer
/**
 * split string pointer into structure 
 *  - relative true if jspointer is a relative pointer (false for absolute)
 *  - path represent the sucessive key to traverse the path
 *  - popcount the number of keys to pop 
 * @param {string} jspointer 
 * @returns { {relative: boolean, path: string[], popcount: number}}
 */
function split(jspointer) {
    if (!rePointer.test(jspointer)) throw Error(`invalid JSON DynPointer "${jspointer}"`)
    const path = toPath(jspointer)
    let popcount = path.shift()
    const relative = (typeof popcount == "number")
    if (!relative) popcount = 0
    return { relative, path, popcount }
}
/**
 * 
 * @param {string[]} current base path for relative positionning 
 * @param {string} jspointer target json pointer   
 * @returns 
 */
function move(current, jspointer) {
    const s = split(jspointer)
    const path = s.relative ? [...current] : []
    for (let i = 0; i < s.popcount; i++) {
        if (path.length === 0) throw Error("Pointer reference out of limit")
        path.pop()
    }
    // descent 
    for (const key of s.path) path.push(key)
    return path
}

/**
 * represent a DynPointer on a Dynamik property value
 * @private {Dynamik} dyn Dynamik to point to 
 * @private {Array<string|number>} path array of keys from root to specific sub property in dyn
 */
export class DynPointer {
    /**
     * @param {Dynamik} dyn 
     */
    constructor(dyn, path = []) {
        if (typeof path === "string" && reAPointer.test(path)) path = split(path).path
        if (!isArray(path)) throw Error(`DynPointer.constructor(): <path> must be an absolute path (string | string|number[]) => ${JSON.stringify(path)}`)
        this.path = path
        this.dyn = dyn
    }
    /**
     * return a pointer to the value of a given pointer relatively(or not) to this pointer
     * @param {string} jspointer JSON Pointer relative or absolute to this pointer
     * @returns {DynPointer}
     */
    to(jspointer = '0') {
        const path = move(this.path, jspointer)
        const pointer = new DynPointer(this.dyn)
        pointer.path = path
        return pointer
    }
    watch(p, l) { return this.dyn.watch(p, l) }
    unwatch(p, l) { return this.dyn.unwatch(p, l) }
    get jspointer() { return this.path.length == 0 ? "" : `/${this.path.join("/")}` }
    toString() { return this.jspointer }
    toJSON() { return this.jspointer }
    get root() { return this.dyn.root }
    get key() { return this.path.length ? this.path[this.path.length - 1] : undefined }
    get context() { return this.dyn.context }
    get parent() { return this.to("1") }
    get schema() {
        const path = this.path
        let schema = this.dyn.schema
        for (const key of path) {
            if (schema == null) break
            switch (schema._type) {
                case "array":
                    schema = schema.items
                    break
                case "object":
                    schema = schema.properties[key]
                    break
                default: return undefined
            }
        }
        return schema
    }
    get type() { return typeOf(this.value) }
    get value() {
        let value = this.dyn.root
        for (const key of this.path) {
            if (isComposed(value)) value = value[key]
            else return undefined
        }
        return value
    }
    set value(value) {
        const parent = this.parent
        const key = this.key
        if (isComposed(base)) parent[key] = value
    }
    /**
     * return a tag function relative to this pointer to get/set pointed value
     * @example _`/x/y/z` : get x.y.z value 
     * @example _`/x/y/z${2}` : set x.y.z  to 2
     */
    get tag() {
        return (arr, ...args) => args.length > 0 ? (this.to(arr[0]).value = args[0]) : this.to(arr[0]).value
    }
    get abstract() {
        // return dynamic abstract if defined in schema
        const f = this.schema?._abstract
        return (typeof f == "function") ? f(this.value, this, this.tag) : default_abstract(this.value, this)
    }
    get hidden() {
        // true if value hidden (form / display)
        const f = this.schema?._hidden
        return (typeof f == "function") ? f(this.value, this, this.tag) : false
    }
    get minimized() {
        // true if value minimized (form / display)
        const f = this.schema?._minimized
        return (typeof f == "function") ? f(this.value, this, this.tag) : false
    }
    get readonly() {
        // true if readonly
        const f = this.schema?._readonly
        return (typeof f == "function") ? f(this.value, this, this.tag) : false
    }
    get mandatory() {
        // true if mandatory
        if (this.schema?._parent?.required?.includes(`${this.key}`)) return true
        const f = this.schema?._mandatory
        return (typeof f == "function") ? f(this.value, this, this.tag) : false
    }
    get only() {
        // true validate filter (form/display)
        const f = this.schema?._only
        return (typeof f == "function") ? f(this.value, this, this.tag) : true
    }
    get kind() {
        // true validate filter (form/display)
        const f = this.schema?._kind
        return (typeof f == "function") ? f(this.value, this, this.tag) : true
    }
    get rank() {
        // return value to order by
        const f = this.schema?._rank
        return typeof f == "function" ? () => f(this.value, this, this.tag) : undefined
    }
    get change() {
        const f = this.schema?._change
        return typeof f == "function" ? () => f(this.value, this, this.tag) : undefined
    }
    get expression() {
        const f = this.schema?._expression
        return typeof f == "function" ? () => f(this.value, this, this.tag) : undefined
    }
    get init() {
        const f = this.schema?._init
        return typeof f == "function" ? () => f(this.value, this, this.tag) : undefined
    }
    get match() {
        const f = this.schema?._match
        return typeof f == "function" ? () => f(this.value, this, this.tag) : undefined
    }
}

class DynProxy {
    constructor(target, dyn, jspointer) {
        this.dyn = dyn
        this.jspointer = jspointer
        return new Proxy(target, this)
    }
    set(target, property, value, proxy) {
        const child_pointer = `${this.jspointer}/${property}`
        const ptr = new DynPointer(this.dyn, child_pointer)
        if (!ptr.readonly) {
            const child_schema = this.dyn._getSchemaFor(ptr, property, value)
            const oldVal = target[property]
            const child_target = isPrimitive(value) ? value : isArray(value) ? [] : {}
            const child_proxy = isPrimitive(value) ? value : new DynProxy(child_target, this, child_pointer)
            this.dyn._proxify(child_proxy, child_target, value, child_schema, child_pointer, target)
            const newVal = child_proxy
            DataReleaser.apply(target, property, child_schema, ptr)
            const res = Reflect.set(target, property, newVal)
            DataInitialiser.apply(target, property, child_schema, ptr)
            this.dyn.change(ptr, oldVal, newVal)
            return res
        }
        return true
    }
    get(target, property) {
        if (property === 'toJSON') return () => target
        if (property === '$') return new DynPointer(this.dyn, this.jspointer)
        const value = Reflect.get(target, property)
        //Dynamik.debug && console.log(`---- GET ptr=${this.jspointer} key=${String(property)} val=${JSON.stringify(value)}`)
        return value
    }
}

export class Dynamik {
    static debug = false
    context = {}
    listeners = new Map()
    constructor(value, schema = true, context = {}) {
        if (typeof value === "string") value = JSON.parse(value)
        if (isPrimitive(value)) throw Error("Dynamik root must be array | object")
        this.context = context
        const target = isArray(value) ? [] : {}
        this.schema = new SchemaCompiler(schema).compile()
        this.root = new DynProxy(target, this, "")
        this._proxify(this.root, target, value, this.schema, "")
        return this.root
    }

    _getSchemaFor(parent_schema, property, value) {
        if ((parent_schema ?? true) === true) return {} // if parent null,undefined or true => true
        if (parent_schema._type == "array") return parent_schema.items ?? true
        if (parent_schema._type == "object") return parent_schema.properties?.[property] ?? true
        return {}
    }

    _proxify(parent_proxy, parent_target, parent_value, parent_schema, parent_jspointer) {
        // proxyfy must set metadata to parent then proxyfy non primitive object
        if (isPrimitive(parent_value)) return
        if (isArray(parent_value)) {

            for (const [child_property, child_value] of Object.entries(parent_value)) {
                const child_pointer = `${parent_jspointer}/${child_property}`
                const child_target = isPrimitive(child_value) ? child_value : isArray(child_value) ? [] : {}
                const child_proxy = isPrimitive(child_value) ? child_value : new DynProxy(child_target, this, child_pointer)
                const child_schema = this._getSchemaFor(parent_schema, child_property, child_value)
                parent_target.push(child_proxy)
                this._proxify(child_proxy, child_target, child_value, child_schema, child_pointer)
            }
        }
        if (isObject(parent_value)) {
            for (const [child_property, child_value] of Object.entries(parent_value)) {
                const child_pointer = `${parent_jspointer}/${child_property}`
                const child_target = isPrimitive(child_value) ? child_value : isArray(child_value) ? [] : {}
                const child_proxy = isPrimitive(child_value) ? child_value : new DynProxy(child_target, this, child_pointer)
                const child_schema = this._getSchemaFor(parent_schema, child_property, child_value)
                parent_target[child_property] = child_proxy
                this._proxify(child_proxy, child_target, child_value, child_schema, child_pointer)
            }
        }
    }
    change(pointer, oldValue, newValue) {
        //console.log(`[${jspointer}] (${oldValue} => ${newValue})`)
        const listeners = this.listeners.get(`${pointer}`) ?? []
        listeners.forEach(listener => listener({ $: pointer, oldValue, newValue }))
    }

    watch(pointer, listener) {
        const listeners = this.listeners.get(`${pointer}`) ?? []
        if (listeners.length == 0) this.listeners.set(`${pointer}`, listeners)
        listeners.push(listener)
    }

    unwatch(pointer, listener) {
        const listeners = this.listeners.get(`${pointer}`) ?? []
        const index = listeners.indexOf(listener)
        if (index !== -1) listeners.splice(index, 1)
    }
}
