import { expect, test } from '@jest/globals';
import { Dynamik } from '../dynamik';
console.error = () => undefined

test('dynamic readonly ignore change', () => {
    const schema = {
        type: "object",
        properties: {
            first: { type: "string" },
            second: { type: "string", "_readonly": "true" }
        }
    }
    const obj = { first: "the value", second: "stay same" }
    const dyn = new Dynamik(obj, schema)
    expect(dyn.first).toBe("the value")
    expect(dyn.second).toBe("stay same")
    dyn.first = "another value"
    dyn.second = "dummy"
    expect(dyn.first).toBe("another value")
    expect(dyn.second).toBe("stay same")
})

test('dynamic readonly switch  to false', () => {
    const schema = {
        type: "object",
        properties: {
            first: { type: "string" },
            second: { type: "string", "_readonly": " _`1/first`  == 'the value' " }
        }
    }
    const obj = { first: "the value", second: "stay same" }
    const dyn = new Dynamik(obj, schema)
    dyn.second = "dummy"
    expect(dyn.first).toBe("the value")
    expect(dyn.second).toBe("stay same")
    dyn.first = "another value"
    dyn.second = "changed value"
    expect(dyn.first).toBe("another value")
    expect(dyn.second).toBe("changed value")
})
