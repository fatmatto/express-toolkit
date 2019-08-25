

<div align="center">

# Express Toolkit

Tiny little utilities for reducing expressjs boilerplate code when building simple, mongodb backed, http apis

</div>

[![Build Status](https://travis-ci.org/fatmatto/express-toolkit.svg?branch=master)](https://travis-ci.org/fatmatto/express-toolkit)
[![Maintainability](https://api.codeclimate.com/v1/badges/40cff05fa81b87114ae2/maintainability)](https://codeclimate.com/github/fatmatto/express-toolkit/maintainability)
[![codecov](https://codecov.io/gh/fatmatto/express-toolkit/branch/master/graph/badge.svg)](https://codecov.io/gh/fatmatto/express-toolkit)


- [Express Toolkit](#express-toolkit)
  - [Getting started](#getting-started)
  - [Default methods](#default-methods)
  - [Custom primary key](#custom-primary-key)
  - [Hooks](#hooks)
      - [List of hooks](#list-of-hooks)
    - [Examples](#examples)

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
## Default methods

In the following table, every path showed in the Path column is meant to be appended to the resource base path which simply is `/<resourcename>`. Following the dinosaurs examples, would be `/dinosaurs`


| Name | Http verb | Path | Description |
| ---- | --------- | ---- | ----------  |
| Create | POST | / | Creates a new resource and returns it |
| List | GET | / | Get a paginated and filtered list of resources of the given type |
| Update | PUT | /{uuid} | Updates a resource |
| UpdateByQuery | PUT | / | Updates a resource that matches query parameters |



## Custom primary key

By defaults, resources are handled as if their primary key is the `_id` field, which is automatically added by mongodb. Sometimes you might want to provide your own key such as an `uuid` field added to the model. For such cases you can provide the id attribute to the controller's config:

```javascript
const myController = new Controller({
  model: MyModel,
  name: 'dinosaurs',
  id: 'uuid'
})
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
- pre:finalize

Note, `pre:finalize` is called on every endpoint, just before sending the response payload to the client.
Here you can hijack `req.toSend` and update it as you need.

For example, you might want to check the `Accept` HTTP header and convert the response from JSON to YAML, or XML.

### Examples
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

