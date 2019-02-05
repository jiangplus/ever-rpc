
let capnp = require("node-capnp")
let schema = require("./message.capnp")
let buf = capnp.serialize(schema.Person, {name: 'name', email: 'email'})
console.log(buf)
