

<div align="center">

# Express Toolkit

Tiny little utilities for reducing expressjs boilerplate code when building simple, mongodb backed, http apis

</div>

[![Build Status](https://travis-ci.org/fatmatto/express-toolkit.svg?branch=master)](https://travis-ci.org/fatmatto/express-toolkit)
[![Maintainability](https://api.codeclimate.com/v1/badges/40cff05fa81b87114ae2/maintainability)](https://codeclimate.com/github/fatmatto/express-toolkit/maintainability)
[![codecov](https://codecov.io/gh/fatmatto/express-toolkit/branch/master/graph/badge.svg)](https://codecov.io/gh/fatmatto/express-toolkit)


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
  },
  type: {
    type: String,
    required: true
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
```

## Hooks

Every resource endpoint can have multiple *pre* and *post* hooks.

#### List of hooks
- pre:find
- post:find
- pre:findById
- post:findById
- pre:create
- post:create
- pre:updateById
- post:updateById
- pre:update
- post:update
- pre:delete
- post:delete
- pre:deleteById
- post:delete
- pre:count
- post:count

#### Examples
```javascript
const { Controller } = require('express-toolkit')
const { DinosaurModel } = require('./path/to/dinosaur.model.js')

const myController = new Controller({
  model: DinosaurModel,
  name: 'dinosaurs'
})

// Force all find queries to look for velociraptor type
myController.registerHook('pre:find', (req,res,next) => {
  req.query.type = 'velociraptor'
  next()
})

// Before returning dinosaurs to the client we convert timestamps to date strings
myController.registerHook('post:find', (req,res,next) => {
  req.toSend = req.toSend.map(dinosaur => {
    let dino = Object.assign({},dinosaur)
    dino.createdAt = String(new Date(dino.createdAt))
    return dino
  })
  next()
})

module.exports = myController
```