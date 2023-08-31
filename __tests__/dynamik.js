import { expect, test } from '@jest/globals';
import { Dynamik,DynPointer } from '../dynamik'
console.error = () => undefined

const object = { 
    a:[1,2,3] , 
    b: { a:1, b:2, c:3} , 
    c:{ num : 12, bool: true, str: "abcdef" }, 
    d: [12, true, "abcdef"]
}
const array = [
    [1,2,3] , 
    { a:1, b:2, c:3} , 
    { num : 12, bool: true, str: "abcdef" }, 
    [12, true, "abcdef"]
]


test('create empty Dynamik Object', () => {
    const dyn = new Dynamik({})
    expect(dyn).toBeInstanceOf(Object)
    expect(Object.keys(dyn)).toEqual([])
})

test('create Dynamik from primitive is error', () => {
    expect(() => new Dynamik(12) ).toThrow("Dynamik root must be array | object")
})


test('create Dynamik Object from JSON', () => {
    const dyn = new Dynamik(JSON.stringify(object))
    expect(dyn).toStrictEqual(object)
})

test('Dynamik Object access number property', () => {
    const dyn = new Dynamik({ a: 1 })
    expect(dyn.a).toBe(1)
    expect(typeof dyn.a).toBe("number")
})

test('Dynamik Object access string property', () => {
    const dyn = new Dynamik({ b: "a string" })
    expect(dyn.b).toBe("a string")
    expect(typeof dyn.b).toBe("string")
})

test('Dynamik Object access boolean property', () => {
    const dyn = new Dynamik({ c: false })
    expect(dyn.c).toBe(false)
    expect(typeof dyn.c).toBe("boolean")
})

test('Dynamik Object access undefined property', () => {
    const dyn = new Dynamik({})
    expect(dyn.d).toBe(undefined)
    expect(typeof dyn.d).toBe("undefined")
})

test('Dynamik Object update attributes', () => {
    const dyn = new Dynamik({ a: 1, b: "2", c: false })
    dyn.a = 11
    dyn.b = "22"
    dyn.c = true
    expect(dyn.a).toBe(11)
    expect(dyn.b).toBe("22")
    expect(dyn.c).toBe(true)
})

test('Dynamik Object delete attributes', () => {
    const dyn = new Dynamik({ a: 1, b: "2", c: false })
    delete dyn.a
    delete dyn.b
    delete dyn.c
    expect(Object.keys(dyn)).toStrictEqual([])
    expect(Object.values(dyn)).toStrictEqual([])
    expect(dyn.a).toBe(undefined)
    expect(dyn.b).toBe(undefined)
    expect(dyn.c).toBe(undefined)
})

test('Dynamik Object delete attributes', () => {
    const dyn = new Dynamik({ a: 1, b: "2", c: false })
    dyn.d = "defined"
    expect(Object.keys(dyn)).toStrictEqual(["a","b","c","d"])
    expect(Object.values(dyn)).toStrictEqual([1, "2", false,"defined" ])
})


test('create empty Dynamik Array', () => {
    const dyn = new Dynamik([])
    expect(dyn).toBeInstanceOf(Array)
    expect(dyn.length).toBe(0)
})

test('Dynamik Array access items', () => {
    const dyn = new Dynamik([1,2,3])
    expect(dyn.length).toBe(3)
    expect(Object.values(dyn)).toStrictEqual([1, 2, 3])
    expect(dyn[0]).toBe(1)
    expect(dyn[1]).toBe(2)
    expect(dyn[2]).toBe(3)
})
test('Dynamik Array update items', () => {
    const dyn = new Dynamik([1,2,3])
    dyn[0] = 11
    dyn[1] = 22
    dyn[2] = 33
    expect(dyn.length).toBe(3)
    expect(dyn).toStrictEqual([11,22,33])
    expect(dyn[0]).toBe(11)
    expect(dyn[1]).toBe(22)
    expect(dyn[2]).toBe(33)
})

// semantic of delete is bad in this case
test('Dynamik Array delete items', () => {
    const dyn = new Dynamik([1,2,3])
    delete dyn[0]
    delete dyn[1]
    delete dyn[2]
    expect(dyn.length).toBe(3)
    expect(dyn[0]).toBe(undefined)
    expect(dyn[1]).toBe(undefined)
    expect(dyn[2]).toBe(undefined)
})

test('Dynamik Array push/pop', () => {
    const dyn = new Dynamik([1,2])
    expect(dyn.length).toBe(2)
    dyn.push(3)
    expect(dyn).toStrictEqual([1,2,3])
    expect(dyn.length).toBe(3)
    const value = dyn.pop()
    expect(value).toBe(3)
    expect(dyn.length).toBe(2)
    expect(dyn).toStrictEqual([1,2])
})

test('Dynamik Object nested access', () => {
    const dyn = new Dynamik(object)
    expect(dyn).toStrictEqual(object)
    expect(dyn.a[1]).toBe(2)
    expect(dyn.b.c).toBe(3)
    expect(dyn.c.str).toBe("abcdef")
})

test('Dynamik Array nested access ', () => {
    const obj = [[1,2,3],{c:3},{str:"abcdef"} ]
    const dyn = new Dynamik(obj)
    expect(dyn).toStrictEqual(obj)
    expect(dyn[0][1]).toBe(2)
    expect(dyn[1].c).toBe(3)
    expect(dyn[2].str).toBe("abcdef")
})

test('Dynamik Object nested updates', () => {
    const dyn = new Dynamik(object)
    dyn.a[1] = 22
    dyn.b.c = 33
    dyn.c.str = "uvwxyz"
    expect(dyn.a[1]).toBe(22)
    expect(dyn.b.c).toBe(33)
    expect(dyn.c.str).toBe("uvwxyz")
})

test('Dynamik Array nested updates', () => {
    const dyn = new Dynamik(array)
    dyn[0][1] = 22
    dyn[1].c = 33
    dyn[2].str = "uvwxyz"
    expect(dyn[0][1]).toBe(22)
    expect(dyn[1].c).toBe(33)
    expect(dyn[2].str).toBe("uvwxyz")
})


test('Dynamik Object support JSON.stringyfy', () => {
    const dyn = new Dynamik(object)
    expect(JSON.stringify(dyn)).toEqual(JSON.stringify(dyn))
})


test('Dynamik Object have $ metadata property', () => {
    const context = { "data" : "My application context ..."}
    const dyn = new Dynamik(object,true,context)
    expect(dyn.$).toBeInstanceOf(DynPointer)
    expect(dyn.$.key).toBe(undefined)
    expect(dyn.$.context).toBe(context)
    expect(typeof dyn.$.watch).toBe("function")
    expect(typeof dyn.$.unwatch).toBe("function")
})

test('Dynamik are watchable with absolute pointer', () => {
    const dyn = new Dynamik(object)
    let $,oldVal,newVal
    dyn.$.watch("/b/b", (evt) =>{ $ = evt.$; oldVal =  evt.oldValue; newVal = evt.newValue } )
    dyn.b.b = 22
    expect($).toBeInstanceOf(DynPointer)
    expect(oldVal).toBe(2)
    expect(newVal).toBe(22)
})

test('Dynamik unwatchable with absolute pointer', () => {
    const dyn = new Dynamik(object)
    let $,oldVal,newVal
    const handler = (evt) =>{ $ = evt.$; oldVal =  evt.oldValue; newVal = evt.newValue }
    dyn.b.$.watch("/b/b", handler )
    dyn.b.$.unwatch("/b/b", handler )
    dyn.b.b = 22
    expect($).toBeUndefined()
    expect(oldVal).toBeUndefined()
    expect(newVal).toBeUndefined()
})

/*
test('Dynamik are watchable (relative pointer)', () => {
    const dyn = new Dynamik(object)
    let $,oldVal,newVal
    dyn.b.$.watch("0/b", (evt) =>{ $ = evt.$; oldVal =  evt.oldValue; newVal = evt.newValue } )
    dyn.b.b = 22
    expect($).not.toBeNull()
    expect($.pointer).toBeInstanceOf(DynPointer)
    expect(oldVal).toBe(2)
    expect(newVal).toBe(22)
})

// */