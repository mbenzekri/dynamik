import { expect, test } from '@jest/globals';
import { SchemaCompiler } from '../compiler'
import { Dynamik } from '../dynamik';
console.error = () => undefined

const object = {
    a: [1, 2, 3],
    b: { a: 1, b: 2, c: 3 },
    c: { num: 12, bool: true, str: "abcdef" },
    d: [12, true, "abcdef"]
}

test('create always true compiled schema', () => {
    const c_schema = new SchemaCompiler(true).compile()
    expect(c_schema._validate(object)).toBeTruthy()
})

test('erroneous schema must fail to compile', () => {
    const schema = {
        type: "dummy"
    }
    expect(() => new SchemaCompiler(schema).compile()).toThrow()
})

test('create compiled schema with valid number', () => {
    const obj = { a: 12 }
    const schema = { type: "object", properties: { a: { type: "number" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
})

test('create compiled schema with valid string', () => {
    const obj = { a: "12" }
    const schema = { type: "object", properties: { a: { type: "string" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
})

test('create compiled schema with valid boolean', () => {
    const obj = { a: false }
    const schema = { type: "object", properties: { a: { type: "boolean" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
})

test('create compiled schema with valid null', () => {
    const obj = { a: null }
    const schema = { type: "object", properties: { a: { type: "null" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
})

test('create compiled schema with invalid number', () => {
    const obj = { a: 12 }
    const schema = { type: "object", properties: { a: { type: "string" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
})

test('create compiled schema with invalid string', () => {
    const obj = { a: "12" }
    const schema = { type: "object", properties: { a: { type: "number" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
})

test('create compiled schema with invalid boolean', () => {
    const obj = { a: true }
    const schema = { type: "object", properties: { a: { type: "string" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
})

test('create compiled schema with invalid null', () => {
    const obj = { a: null }
    const schema = { type: "object", properties: { a: { type: "string" } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
})

test('create compiled schema with valid enum', () => {
    const obj = { a: "cat" }
    const schema = { type: "object", properties: { a: { enum: ["dog", "cat", "goldfish"] } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})

test('create compiled schema with invalid enum', () => {
    const obj = { a: "monkey" }
    const schema = { type: "object", properties: { a: { enum: ["dog", "cat", "goldfish"] } } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})

test('create compiled schema with nullabe', () => {
    const obj = { a: null, b: "monkey" }
    const schema = {
        type: "object",
        properties: {
            a: { type: ["string", "null"] },
            b: { type: ["null", "string"] }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema.properties.a._type).toBe("string")
    expect(c_schema.properties.b._type).toBe("string")
})

test('create compiled schema with multitypes without null must throw', () => {
    const obj = { a: null }
    const schema = {
        type: "object",
        properties: {
            a: { type: ["string", "integer"] },
        }
    }
    expect(() => new SchemaCompiler(schema).compile()).toThrow("One type must be 'null'")
})

test('create compiled schema with > 2 type must throw', () => {
    const obj = { a: null }
    const schema = {
        type: "object",
        properties: {
            a: { type: ["string", "integer", "object"] },
        }
    }
    expect(() => new SchemaCompiler(schema).compile()).toThrow("multiple types not implemented")
})

test('create compiled schema with valid enum as oneOf const list', () => {
    const obj = { a: "cat" }
    const schema = {
        type: "object", properties: {
            a: {
                oneOf: [
                    { const: "dog" },
                    { const: "cat" },
                    { const: "goldfish" },
                ]
            }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})

test('create compiled schema with invalid enum as oneOf const list', () => {
    const obj = { a: "monkey" }
    const schema = {
        type: "object", properties: {
            a: {
                oneOf: [
                    { const: "dog" },
                    { const: "cat" },
                    { const: "goldfish" },
                ]
            }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})

test('create compiled schema with valid enum as anyOf const list', () => {
    const obj = { a: "cat" }
    const schema = {
        type: "object", properties: {
            a: {
                anyOf: [
                    { const: "dog" },
                    { const: "cat" },
                    { const: "goldfish" },
                ]
            }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})

test('create compiled schema with invalid enum as anyOf const list', () => {
    const obj = { a: "monkey" }
    const schema = {
        type: "object", properties: {
            a: {
                anyOf: [
                    { const: "dog" },
                    { const: "cat" },
                    { const: "goldfish" },
                ]
            }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
    expect(c_schema._isenum).toBe(false)
    expect(c_schema.properties.a._isenum).toBe(true)
})



test('create compiled schema with valid enum array', () => {
    const obj = ["cat", "goldfish"]
    const schema = { type: "array", uniqueItems: true, items: { enum: ["dog", "cat", "goldfish"] } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema._isenumarray).toBe(true)
})

test('create compiled schema with invalid enum array', () => {
    const obj = ["cat", "monkey"]
    const schema = { type: "array", uniqueItems: true, items: { enum: ["dog", "cat", "goldfish"] } }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
    expect(c_schema._isenumarray).toBe(true)
})

test('create compiled schema with valid enum array as const list', () => {
    const obj = ["cat", "goldfish"]
    const schema = {
        type: "array", uniqueItems: true, items: {
            oneOf: [
                { const: "dog" },
                { const: "cat" },
                { const: "goldfish" },
            ]
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeTruthy()
    expect(c_schema._isenumarray).toBe(true)
})

test('create compiled schema with invalid enum as const list', () => {
    const obj = ["cat", "monkey"]
    const schema = {
        type: "array", uniqueItems: true, items: {
            oneOf: [
                { const: "dog" },
                { const: "cat" },
                { const: "goldfish" },
            ]
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    expect(c_schema._validate(obj)).toBeFalsy()
    expect(c_schema._isenumarray).toBe(true)
})

test('pointer deref test', () => {
    const schema = {
        type: "object", properties: {
            a: { const: "dog" },
            b: { const: "cat" },
            c: { const: "goldfish" }
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    const found = c_schema._deref("/a")
    expect(found).toBe(c_schema.properties.a)
    expect(found._deref("1")).toBe(c_schema)
})

test('test reference support def/ref', () => {
    const schema = {
        "$id": "test",
        $defs: {
            pet: {
                enum: ["dog", "cat", "goldfish"]
            }
        },
        type: "object",
        properties: {
            first: { $ref: "test#/$defs/pet" },
            second: { $ref: "test#/$defs/pet" },
        }
    }
    const c_schema = new SchemaCompiler(schema).compile()
    const enumeration = c_schema.properties.first.enum
    expect(enumeration).toStrictEqual(schema.$defs.pet.enum)
})

test('test reference $ref absent must throw', () => {
    const schema = {
        "$id": "test2",
        $defs: { pet: { enum: ["dog", "cat", "goldfish"] } },
        type: "object",
        properties: {
            first: { $ref: "test#/$defs/zzz" },
        }
    }
    expect(() => new SchemaCompiler(schema).compile()).toThrow()
})

test('dynamic values defaults', () => {
    const schema = {
        type: "object",
        properties: { first: { type: "string" }, second: { type: "string" } }
    }
    const obj = { first: "the value" }
    const dyn = new Dynamik(obj, schema, "the context")
    expect(dyn.$.abstract).toBe("the value")
    expect(dyn.$.hidden).toBe(false)
    expect(dyn.$.readonly).toBe(false)
    expect(dyn.$.mandatory).toBe(false)
    expect(dyn.$.minimized).toBe(false)
    expect(dyn.$.only).toBe(true)
    expect(dyn.$.kind).toBe(true)
    expect(dyn.$.change).toBe(undefined)
    expect(dyn.$.rank).toBe(undefined)
    expect(dyn.$.expression).toBe(undefined)
    expect(dyn.$.init).toBe(undefined)
    expect(dyn.$.match).toBe(undefined)
})

test('dynamic values', () => {
    const schema = {
        type: "object",
        _abstract: "${value.first}/${$.key}/${$.context}",
        _hidden: "  true ",
        _readonly: " true",
        _mandatory: " true",
        _minimized: " true",
        _only: " false",
        _kind: " false",
        _rank: " 1 ",
        _change: " 2 ",
        _expression: " 3 ",
        _init: " 4 ",
        properties: { first: { type: "string" } }
    }
    const obj = { first: "the value" }
    const dyn = new Dynamik(obj, schema, "the context")
    expect(dyn.$.abstract).toBe("the value/undefined/the context")
    expect(dyn.$.hidden).toBe(true)
    expect(dyn.$.readonly).toBe(true)
    expect(dyn.$.mandatory).toBe(true)
    expect(dyn.$.minimized).toBe(true)
    expect(dyn.$.only).toBe(false)
    expect(dyn.$.kind).toBe(false)
    expect(typeof dyn.$.rank).toBe("function")
    expect(dyn.$.rank()).toBe(1)
    expect(typeof dyn.$.change).toBe("function")
    expect(dyn.$.change()).toBe(2)
    expect(typeof dyn.$.expression).toBe("function")
    expect(dyn.$.expression()).toBe(3)
    expect(typeof dyn.$.init).toBe("function")
    expect(dyn.$.init()).toBe(4)
    //expect(typeof dyn.$.bind).toBe("function")
    //expect(dyn.$.bind()).toBe(5)
})

test('dynamic expression multiline', () => {
    const schema = {
        type: "object",
        _change: ["${value.first}", "${$.key}", "${$.context}",],
        properties: { first: { type: "string" } }
    }
    const obj = { first: "the value" }
    const dyn = new Dynamik(obj, schema, "the context")
    expect(dyn.$.change().replace(/\n/g, ' ')).toStrictEqual("the value undefined the context ")
})


test('dynamic mandatory', () => {
    const schema = {
        type: "object",
        properties: {
            first: { type: "string" },
            second: { type: "string" },
            third: { type: "string", _mandatory: " true " },
            fourth: { type: "string", _mandatory: " false " },
            fifth: { type: "string", _mandatory: " true " },
        },
        required: ["second", "fourth"]
    }
    const obj = { first: "first value", second: "second value", third: "third value", fourth: "fourth value" }
    const pointer = new Dynamik(obj, schema).$
    expect(pointer.to("/first").mandatory).toBe(false)
    expect(pointer.to("/second").mandatory).toBe(true)
    expect(pointer.to("/third").mandatory).toBe(true)
    expect(pointer.to("/fourth").mandatory).toBe(true)
    expect(pointer.to("/fifth").mandatory).toBe(true)
})

test('dynamic using tag _', () => {
    const schema = {
        type: "object",
        _abstract: "${ _`0/a` + _`0/b` }",
        _rank: "_`0/b` + _`0/c`",
        properties: {
            a: {
                _abstract: "${_`1/a` + _`1/c`}", 
                type: "number" 
            },
            b: { type: "number" },
            c: { type: "number" },
        },
    }
    const obj = { a: 1, b: 2, c: 3}
    const pointer = new Dynamik(obj, schema).$
    expect(pointer.rank).toBeInstanceOf(Function)
    expect(pointer.rank()).toBe(5)
    expect(pointer.abstract).toBe("3")
    expect(pointer.to("/a").abstract).toBe("4")
})




