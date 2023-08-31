import { expect, test } from '@jest/globals';
import { Dynamik, DynPointer } from '../dynamik'
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
const dynobj = new Dynamik(object)
const dynarr = new Dynamik(array)


test('create DynPointer with arg error', () => {
    expect(() => new DynPointer(object,12)).toThrow()
    expect(() => new DynPointer(object,"toto")).toThrow()
})


test('get base pointer from Dynamik object', () => {
    const ptr = dynobj.$
    expect(ptr).toBeInstanceOf(DynPointer)
    expect(ptr == "").toBeTruthy()
    expect(ptr.value).toBeInstanceOf(Object)
    expect(ptr.value).toEqual(dynobj)
})

test('get base pointer from Dynamik array', () => {
    const ptr = dynarr.$
    expect(ptr).toBeInstanceOf(DynPointer)
    expect(ptr == "").toBeTruthy()
    expect(ptr.value).toBeInstanceOf(Object)
    expect(Array.isArray(ptr.value)).toBe(true)
    expect(ptr.value).toEqual(dynarr)
})

test('deref pointer from absolute path', () => {
    const ptr = dynobj.$
    expect(ptr.to("/a/1").value).toBe(2)
    expect(ptr.to("/b/b").value).toBe(2)
    expect(ptr.to("/c/bool").value).toBe(true)
    expect(ptr.to("/d/2").value).toBe("abcdef")
    expect(ptr.to("/d/xxx").value).toBe(undefined)
    expect(ptr.to("").value).toStrictEqual(object)
})

test('get pointer from relative path', () => {
    const objpointer = dynobj.$
    const ptr = objpointer.to("/b/b")
    expect(ptr.key).toBe("b")
    expect(JSON.stringify(ptr)).toBe(JSON.stringify("/b/b"))
    expect(ptr.value).toBe(2)
    expect(ptr.to('1').value).toStrictEqual({ a:1, b:2, c:3})
    expect(ptr.parent.value).toStrictEqual({ a:1, b:2, c:3})
    expect(ptr.to('2').value).toStrictEqual(object)
    expect(ptr.to('2/d/2').value).toStrictEqual("abcdef")
})


test('get pointer from relative path errors', () => {
    const objpointer = dynobj.$
    const ptr = objpointer.to("/b/b")
    expect(() => ptr.to("5")).toThrow("Pointer reference out of limit") // exceed parent ascent
    expect(() => ptr.to("5")).toThrow("Pointer reference out of limit") // exceed parent ascent
    expect(ptr.to("/b/b/C/D").value).toBe(undefined) // exceed child ascent => undefined
})


test('get metadata from pointer', () => {
    const dynobj = new Dynamik({a:1 , b:true, c:"xyz" })
    const ptr = dynobj.$.to("0/b")
    expect(ptr.type).toEqual("boolean")
})