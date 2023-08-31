import { Dynamik } from "./dynamik.js"
function logDyn(dyn) {
    console.log(JSON.stringify(dyn))
}
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

const dyn = new Dynamik(object)
let $,oldVal,newVal
dyn.$.watch("/b/b", (evt) =>{ $ = evt.$; oldVal =  evt.oldValue; newVal = evt.newValue } )
console.log(oldVal,newVal)
dyn.b.b = 22
