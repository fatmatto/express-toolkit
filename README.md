<div align="center">

# Express Toolkit

Tiny little utilities for reducing expressjs boilerplate code when building simple, mongodb backed, http apis

</div>


## Getting started

Suppose we need to build an http microservice for handling dinosaurs (tired of cats).

First of all we will need a model file, powered by mongoose
```javascript
const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Dinosaurs are simple
const DinosaurSchema = new Schema({
  name: {
    type: String,
    required:true
  }
})

const DinosaurModel = mongoose.model('Dinosaur', DinosaurSchema, 'dinosaurs')

module.exports = {DinosaurSchema, DinosaurModel}
```

Then the controller file

```javascript
const { Controller } = require('express-toolkit')
const { DinosaurModel } = require('./path/to/dinosaur.model.js')

const myController = new Controller({
  model: DinosaurModel,
  name: 'dinosaurs'
})
module.exports = myController
```

Finally the router file

```javascript
const { buildRouter } = require('express-toolkit')
const DinosaurController = require('./dinosaur.controller.js')

module.exports = buildRouter({
  controller: DinosaurController
})
```


Then, somewehere in your express app, where you mount routes:
```javascript
const express = require('express')
const app = express()
const dinosaursResource = require('./path/to/dinosaur.router.js')
//...
app.use('/dinosaurs',dinosaursResource)
// ...
app.listen(1337)