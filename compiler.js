"use strict"
import { isArray, isObject, isPrimitive, copy, default_abstract } from "./utils"
import Ajv2020 from "ajv/dist/2020"

const ajv = new Ajv2020()
export class SchemaCompiler {
    constructor(schema) {
        const valid = ajv.validateSchema(schema)
        if (!valid) throw Error(`schema is not valid => \n ${ajv.errorsText(ajv.errors)}`)

        this.root = isObject(schema) ? copy(schema) : {}
        this.passes = [
            [
                // pass ONE
                new CompileDefs(this.root),
                new CompileType(),
                new CompileInit(this.root),
                //this.solveenumref.bind(this), // reference externe TBD
                new CompileEnum(),
                new CompileUniform(),
                new CompileField(),
                new CompileOrder(),
            ], [
                // pass TWO
                // this.solverefto.bind(this), // reference into the data
                new CompileValidate(),
                new CompileExpr('_abstract', "string"),     // return an abstract version of value (summary)
                new CompileExpr('_hidden', "boolean"),      // indicate if property is hidden on display (form/prettyprint ...) 
                new CompileExpr('_readonly', "boolean"),    // indicates if property can be updated during process (form)
                new CompileExpr('_mandatory', "boolean"),   // indicates if property is mandatory in that dynamic context (used for dynamic required)
                new CompileExpr('_minimized', "boolean"),   // minimized indicates if value may be displayed minimized (only abstract displayed)
                new CompileExpr('_only', "boolean"),        // used filter values for ...
                new CompileExpr('_rank', "any"),            // used to order values 
                new CompileExpr('_kind', "boolean"),        // used filter schemas (xxxOf)
                new CompileExpr('_change', "any"),          // change called for each update of property
                new CompileExpr('_expression', "any"),      // property is setted to expression dynamicly and updated when dependencies changes
                new CompileExpr('_init', "any"),            // property is setted to init at value initialisation
                new CompileExpr('_match', "boolean"),       // return true if given schema match the current value for xxxOf schemas discrimination
                // bind MBZ-TBD
            ]
        ]
    }
    /**
     * performs the compilation of the schema applying compile steps passes for each pass
     * @returns 
     */
    compile() {
        this.passes.forEach(pass => this.applySteps(this.root, undefined, undefined, pass))
        return this.root
    }
    /**
     * walk throught the schema to apply the compile steps
     * @param {Schema} schema to apply current pass steps
     * @param {Schema} parent of schema
     * @param {string} property 
     * @param {CompileStep} steps 
     */
    applySteps(schema, parent, property, steps) {
        if (schema == null) return

        // apply all the steps to the current schema
        for (const step of steps) {
            try { schema && step.condition(schema, parent, property) && step.apply(schema, parent, property) }
            catch (e) {
                step.error(e, schema, parent, property)
                throw e
            }
        }
        // recursive apply over properties of current schema (object)
        if (schema.properties) {
            for (const [child_property, child_schema] of Object.entries(schema.properties)) {
                this.applySteps(child_schema, schema, child_property, steps)
            }
        }
        // recursive apply over items of current schema (array)
        if (schema.items) {
            this.applySteps(schema.items, schema, property, steps)
        }
        // recursive apply over compositions (oneOf,anyOf,allOf)
        const childs = [schema.oneOf, schema.allOf, schema.anyOf].filter(x => x != null)
        childs.forEach(schema_list => schema_list.forEach(child_schema => this.applySteps(child_schema, schema, property, steps)))
    }

}
/**
 * base class for schema compilation step , to add steps in SchemaCompiler
 * - implement a new CompileStep inherited class
 * - add a new instance of your compile step in SchemaCompiler constructor in this.passes list initialisation
 * - if you use "compile time properties" be carefull about the order
 */
class CompileStep {
    name = "No operation"
    constructor(name = `No name}`) { this.name = name }
    /** condition must be truthy to apply the step */
    condition(schema, parent, property) { return true }
    /** step to apply on the current schema  */
    apply(schema, parent, property) { /* No operation */ }
    /** call error() to log errors during apply */
    error(error, schema) {
        const msg = `compile error :\n    - at:${schema._pointer}\n    - message: ${String(error)}\n    - step:${this.name}`
        console.error(msg)
        return msg
    }
}
/**
 * this step initialize main schema properties
 * _root : the root schema for current schema
 * _pointer : the JSON absolute pointer starting from _root property
 * _parent : the schema parent of current schema
 * _watchers : the absolute pointers of the schema that are "observing" current schema 
 * _deref() : the function to dereference a pointer relatively to current schema
 */
ajv.addVocabulary(["_root", "_pointer", "_parent", "_watchers", "_deref"])
class CompileInit extends CompileStep {
    constructor(root) {
        super("Init compilation")
        this.root = root
    }
    apply(schema, parent, property) {
        Object.defineProperty(schema, "_root", { // avoid cycle for JSON stringify
            configurable: false,
            enumerable: false,
            value: this.root,
            writable: false
        })
        Object.defineProperty(schema, "_parent", {// avoid cycle for JSON stringify
            configurable: false,
            enumerable: false,
            value: parent,
            writable: false
        })
        schema._pointer = parent == null ? "" : `${parent._pointer}/${property}`
        schema._watchers = []
        schema._deref = (pointer) => this.deref(this.root, schema, pointer)
    }
    deref(root, current, pointer) {
        const tokens = pointer.split(/\//)
        const relative = /^\d+$/.test(tokens[0])
        let base = relative ? current : root
        if (relative) {
            const count = parseInt(tokens[0])
            for (let i = 0; i < count; i++) base = base._parent
            if (!base) {
                console.error(`for ptr:${current._pointer} enable to dereference ptr:${pointer} (not enough ascendant')`)
                return undefined
            }
        }
        tokens.shift()
        for (const token of tokens) {
            const prev = base
            base = (token === '*') ? base.items : base.properties[token]
            if (!base) {
                console.error(`for ptr:${current._pointer} enable to dereference pointer ptr:${pointer}(property '${token}' not found in ${prev.pointer})`)
                return undefined
            }
        }
        return base
    }

}

ajv.addVocabulary(["_uniform"])
class CompileUniform extends CompileStep {
    constructor() {
        super("Uniform compilation")
    }
    condition(schema, parent, property) { return schema._type == "array" && this._uniform == null }
    apply(schema, parent, property) {
        schema._uniform = (schema.items.oneOf || schema.items.anyOf || schema.items.allOf) ? false : true
    }
}

class CompileDefs extends CompileStep {
    definitions = new Map()
    constructor(root = {}) {
        super("Definition compilation")
        const id = root.$id
        for (const [k, v] of Object.entries(root.$defs ?? {})) {
            this.definitions.set(`${id}#/$defs/${k}`, v)
        }
    }
    apply(schema, parent, property) {
        const properties = schema.properties
        if (properties) {
            for (const [pname, pschema] of Object.entries(properties)) {
                properties[pname] = this.solve(pschema)
            }
        }
        if (schema.items) schema.items = this.solve(schema.items)
        if (schema.items?.oneOf) schema.items.oneOf = schema.items.oneOf.map((schema) => schema.$ref ? this.solve(schema) : schema)
        if (schema?.items?.anyOf) schema.items.anyOf = schema.items.anyOf.map((schema) => schema.$ref ? this.solve(schema) : schema)
        if (schema?.items?.allOf) schema.items.allOf = schema.items.allOf.map((schema) => schema.$ref ? this.solve(schema) : schema)
    }
    definition(pointer) {
        if (this.definitions.has(pointer)) return copy(this.definitions.get(pointer))
        return undefined
    }
    solve(schema) {
        if (schema?.$ref != null) {
            const deforig = this.definition(schema.$ref)
            if (deforig == null) throw this.error(`Definition not found for ${schema.$ref}`)
            const defcopy = Object.assign({}, deforig)
            Object.entries(schema).forEach(([n, v]) => (n !== '$ref') && (defcopy[n] = v))
            return defcopy
        }
        return schema
    }
}

ajv.addVocabulary(["_type", "_nullable"])
class CompileType extends CompileStep {
    constructor() { super("Type compilation") }
    condition(schema, parent, property) { return !("_type" in schema) }
    apply(schema, parent, property) {
        const types = isArray(schema.type) ? schema.type : [schema.type ?? "string"]
        switch (types.length) {
            case 1:
                schema._type = types[0]
                schema._nullable = schema._type == "null"
                break
            case 2:
                if (!types.includes("null")) throw this.error("One type must be 'null'", schema, parent, property)
                schema._type = types.find(t => t !== "null") ?? "null"
                schema._nullable = true
                break
            default:
                throw this.error("multiple types not implemented", schema, parent, property)
        }
    }
}

ajv.addVocabulary(["_isenum", "_isenumarray"])
class CompileEnum extends CompileStep {
    constructor() { super("Enum compilation") }
    condition(schema, parent, property) { return !("_isenum" in schema) }
    apply(schema, parent, property) {
        schema._isenum = false;
        schema._isenumarray = false;
        switch (true) {
            case this.isArrayOfEnum(schema):
                schema._isenumarray = true
                break
            case this.isEnum(schema):
                schema._only = schema._only ?? (() => true)
                schema._isenum = true;
                break
        }
    }
    /**
     * true if schema type is array of enumeration
     * @param {any} schema
     * @returns 
     */
    isArrayOfEnum(schema) {
        if (schema._type !== 'array' || schema.items == null || schema.uniqueItems != true) return false
        const xoflist = [schema.items.oneOf, schema.items.anyOf, schema.items.allOf].filter(x => x)
        const isconstlist = xoflist.map(xof => xof.every((schema) => 'const' in schema))
        return isconstlist.every(isconst => isconst)
    }
    /**
     * true if schema type is an enumeration
     * - described as "enum" list
     * - or described as list of "const" values
     * @param {any} schema
     * @returns
     */
    isEnum(schema) {
        switch (true) {
            case schema.enum != null:
            case schema.oneOf?.every((sch) => 'const' in sch):
            case schema.anyOf?.every((sch) => 'const' in sch):
                return true
        }
        return false
    }

}

ajv.addVocabulary(["_field"])
class CompileField extends CompileStep {
    constructor() { super("Field compilation") }
    condition(schema, parent, property) { return !schema._field }
    apply(schema, parent, property) {
        schema._field = 'class FIELD for rendering TBD'
    }
}

ajv.addVocabulary(["_order"])
class CompileOrder extends CompileStep {
    constructor() { super("Field compilation") }
    condition(schema, parent, property) { return schema._type === 'object' && schema.properties && !schema._order }
    apply(schema, parent, property) {
        const properties = schema.properties
        const groupmap = new Map()
        const tabmap = new Map()
        // order properties with tab and grouping
        let fieldnum = 0
        const fields = Object.entries(properties).map(([fieldname, schema]) => {
            // get or affect tab number
            if (schema._tab && !tabmap.has(schema._tab)) tabmap.set(schema._tab, fieldnum)
            const tabnum = schema._tab ? tabmap.get(schema._tab) : fieldnum
            // get or affect group number
            if (schema._group && !groupmap.has(schema._group)) groupmap.set(schema._group, fieldnum)
            const groupnum = schema._group ? groupmap.get(schema._group) : fieldnum

            return { tabnum, groupnum, fieldnum: fieldnum++, fieldname, schema, tabname: schema._tab, groupname: schema._group }
        })
        // sort all the schema fields by tabnum/groupnum/fieldnum
        fields.sort((fa, fb) => {
            const diff = Math.min(fa.tabnum, fa.groupnum, fa.fieldnum) - Math.min(fb.tabnum, fb.groupnum, fb.fieldnum)
            return (diff === 0) ? fa.fieldnum - fb.fieldnum : diff
        })
        schema._order = fields
    }

}

ajv.addVocabulary(["_abstract", "_match", "_hidden", "_readonly", "_minimized", "_mandatory", "_only", "_kind", "_rank", "_expression", "_init", "_change"])
class CompileExpr extends CompileStep {
    static count = 1
    static types = ["string", "boolean", "any"]

    constructor(target, type) {
        super(`Compile String ${target}`)
        this.target = target
        this.type = CompileExpr.types.includes(type) ? type : "any"
    }
    condition(schema, parent, property) {
        return this.target in schema && typeof schema[this.target] != "function"
    }

    apply(schema, parent, property) {
        const expression = schema[this.target]
        if (typeof expression == "string" || isArray(expression)) {
            schema[this.target] = this[`compile_${this.type}`](schema, expression)
        }
    }

    compile_string(schema, expression) {
        let compiled
        const code = `
        //# sourceURL=${this.target}_${schema._pointer.replace(/[#/]+/g, "_")}.js
        try { 
            const result = (\`${expression}\`);
            return String(result ?? '')
        } catch(e) { 
            console.error(\`Fail to eval expr\n    - property=${this.target}\n    - pointer=${schema._pointer}\n    - error:\${e.toString()}\`)
        }
        return ''; \n`
        try {
            this.solveWatch(schema, expression)
            compiled = new Function("value", "$", "_", code);
            compiled.expression = expression
        } catch (e) {
            console.error(`Fail to compile expr\n - property=${this.target}\n    - pointer=${schema._pointer}\n    - error:${String(e)}`)
        }
        return compiled
    }
    compile_boolean(schema, expression) {
        let compiled
        if (typeof expression == 'boolean' || expression === null) {
            compiled = expression === null ? () => null : () => expression
        } else if (typeof expression == 'string') {
            const code = `
            //# sourceURL=${this.target}_${schema._pointer.replace(/[#/]+/g, "_")}.js
            try {  
                    const result = (${expression}) 
                    return result === null ? result : !!result
                }
                catch(e) {  
                    console.error(\`Fail to eval expr\n    - property=${this.target}\n    - pointer=${schema._pointer}\n    - error:\${e.toString()}\`)
                }
                return true; \n`
            try {
                this.solveWatch(schema, expression)
                compiled = new Function("value", "$", "_", code);
                compiled.expression = expression
            } catch (e) {
                console.error(`Fail to compile expr\n - property=${this.target}\n    - pointer=${schema._pointer}\n    - error:${String(e)}`)
            }
        }
        return compiled
    }
    compile_any(schema, expression) {
        let compiled = undefined
        let code = "return null"
        switch (true) {
            case typeof expression == 'boolean':
                code = expression ? `return true ;` : `return false ;`
                break
            case typeof expression == 'string':
                code = `return (${expression}) ;`
                break
            case Array.isArray(expression):
                const lines = expression.map((expr, i) => `    const cst${i} = \`${expr}\n\``)
                lines.push(`return ( ${expression.map((_e, i) => `cst${i}`).join(' + ')} );`)
                code = lines.join(';\n')
                break
        }
        const body = `
            //# sourceURL=${this.target}_${schema._pointer.replace(/[#/]+/g, "_")}.js
            try {  
                ${code} 
            } catch(e) {  
                console.error(\`Fail to eval expr\n    - property=${this.target}\n    - pointer=${schema._pointer}\n    - error:\${e.toString()}\`)
            }
            return null; \n`
        try {
            if (Array.isArray(expression)) expression.forEach((expr) => this.solveWatch(schema, expr))
            if (typeof expression == 'string') this.solveWatch(schema, expression)
            compiled = new Function("value", "$", "_", code);
            compiled.expression = expression
        } catch (e) {
            console.error(`unable to compile ${this.target} expression "${expression}" due to ::\n\t=>${String(e)}`)
        }
        return compiled
    }
    solveWatch(schema, expr) {
        // extract all pointers used in expr
        for (const matches of expr?.matchAll(/_`((#?|\d+)(\/[^`]+)+)`/g) ?? []) {
            const pointer = matches[1]
            const watched = schema._deref(pointer)
            if (watched && !watched._watchers.includes(schema._pointer)) {
                watched._watchers.push(schema.pointer)
            }
        }
    }
}


ajv.addVocabulary(["_validate"])
class CompileValidate extends CompileStep {
    constructor() { super("Validate compilation") }
    condition(schema, parent, property) { return schema._validate == null }
    apply(schema, parent, property) {
        schema._validate = ajv.compile(schema ?? true)
    }
}

