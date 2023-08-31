import { isArray, isObject } from "./utils.js"
class DataCompiler {
    constructor(steps) {
        this.steps = steps
    }
        /**
     * 
     * 
     * @returns 
     */
    /**
     * performs the compilation of the data applying compile steps
     * @param {*} parent 
     * @param {*} key 
     * @param {*} schema 
     */
    apply(parent, key, schema) {
        this.applySteps(parent, key, schema)
    }
    /**
     * walk throught the parent[key]/schema to apply the data transformation steps
     * @param {any} parent containing key property
     * @param {string|number} key to apply current pass steps
     * @param {Schema} schema schema of the value parent[key]
     * @param {DynPointer} pointer schema of the value parent[key]
     */
    applySteps(schema, parent, key, pointer) {
        if (schema == null) return
        this.steps
            .filter(step => step.condition(schema, parent, key, pointer))
            .forEach(step => step.acton(schema, parent, key, pointer))
        parent = parent[key]
        switch (true) {
            case parent == null:
                break
            case isArray(parent) && schema._uniform:
                parent.forEach((_, i) => this.applySteps(parent, i, schema.items, pointer.to(`0/${i}`)))
                break
            case isArray(parent) && !schema._uniform:
                parent.forEach((item, i) => {
                    const xofs = [schema.items?.oneOf, schema.items?.anyOf, schema.items?.allOf]
                    xofs.forEach(xof => {
                        xof && xof.forEach((schema) => {
                            if (schema._match && schema._match(item, /** pointer and tag ??? */))
                                this.applySteps(parent, i, schema, pointer.to(`0/${i}`))
                        })
                    })
                })
                break
            case isObject(parent):
                Object.entries(schema.properties).forEach(([property, schema]) => {
                    this.applySteps(parent, property, schema, pointer.to(`0/${property}`))
                })
                break
        }
    }
}
class InitStep {
    condition(schema, parent, key, _pointer) { return schema._init != null && parent[key] === undefined }
    action(schema, parent, key, pointer) { 
        parent[key] = schema._init(parent[key], pointer, pointer.tag) 
    }
}
class ExprStep {
    condition(schema, _parent, _key, _pointer) { return schema._expression != null }
    action(schema, parent, key, pointer) { 
        parent[key] = schema._expression(parent[key], pointer, pointer.tag)
        pointer.dyn
    }
}

// this class is intended to initialize data structure affected to a dynproxy   
export const DataInitialiser = new class extends DataCompiler {
    constructor() {
        super([new InitStep(), new ExprStep()])
    }
}()

// this class is intended to free data structure unseted from a dynproxy (replaced by a new value)  
export const DataReleaser = new class extends DataCompiler {
    constructor() {
        super([]) // actually nothing to do (coming soon document, references, ...)
    }
}()

