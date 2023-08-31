import { expect, test } from '@jest/globals';
import { copy,isArray,isObject,isComposed,isPrimitive,isKey,toKey,toPath,typeOf } from '../utils'
const alltypes =  [{}, [], 12 ,"abcdef", false, null, undefined]
const object = { 
    a:[1,2,3] , 
    b: { a:1, b:2, c:3} , 
    c:{ num : 12, bool: true, str: "abcdef" }, 
    d: [12, true, "abcdef"]
}
    
test('create empty Dynamik Object', () => {
    expect(copy(object)).toStrictEqual(object)
    expect(alltypes.map( x => isArray(x))).toStrictEqual([false,true,false,false,false,false,false])
    expect(alltypes.map( x => isObject(x))).toStrictEqual([true,false,false,false,false,false,false])
    expect(alltypes.map( x => isPrimitive(x))).toStrictEqual([false,false,true,true,true,true,true])
    expect(alltypes.map( x => isComposed(x))).toStrictEqual([true,true,false,false,false,false,false])
    expect(isKey("abcdef")).toBeTruthy()
    expect(isKey(12)).toBeTruthy()
    expect(isKey(null)).toBeFalsy()
    expect(isKey(false)).toBeFalsy()
    expect(toKey("abcdef")).toBe("abcdef")
    expect(toKey("12")).toBe(12)
    expect(toKey(12)).toBe(12)
    expect(toPath("/1/a/12/b")).toStrictEqual(["",1,"a",12,"b"])
    expect(alltypes.map( x => typeOf(x))).toStrictEqual(["object","array","number","string","boolean","null","undefined"])
})
