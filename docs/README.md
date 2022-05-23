

<div align="center">

# Express Toolkit

Tiny little utilities for reducing expressjs boilerplate code when building simple, mongodb backed, http apis

</div>

[![Build Status](https://travis-ci.org/fatmatto/express-toolkit.svg?branch=master)](https://travis-ci.org/fatmatto/express-toolkit)
[![Maintainability](https://api.codeclimate.com/v1/badges/40cff05fa81b87114ae2/maintainability)](https://codeclimate.com/github/fatmatto/express-toolkit/maintainability)
[![codecov](https://codecov.io/gh/fatmatto/express-toolkit/branch/master/graph/badge.svg)](https://codecov.io/gh/fatmatto/express-toolkit)


- [Express Toolkit](#express-toolkit)
  - [TL;DR](#tldr)
  - [Models, Controllers and Routers](#models-controllers-and-routers)
  - [Default endpoints](#default-endpoints)
  - [Disable endpoints](#disable-endpoints)
  - [Sorting](#sorting)
  - [Pagination](#pagination) 
  - [Projection](#projection)
  - [Custom primary key](#custom-primary-key)
  - [Hooks](#hooks)
      - [List of hooks](#list-of-hooks)
    - [Examples](#examples)
## TL;DR

With express-toolkit you can easily create a basic REST resource and mount it into an express application. The app will provide basic CRUD methods:

```javascript
const express = require('express')
const Resource = require('../../src/resource')
const mongoose = require('mongoose')

// Let's create our Model with Mongoose
const schema = new mongoose.Schema({
  name: String
})

const PetsResource = new Resource({
  name: 'pets',
  id: 'uuid',
  model: mongoose.model('pets', schema, 'pets')
})


PetsResource.registerHook('pre:find', (req, res, next) => {
  console.log('Looking for Pets')
  next()
})

// Remember to extend the router AFTER adding hooks,
// otherwise the router will be overwritten without this route
PetsResource.router.get('/actions/eat',(req,res) => {
  return res.send('Om nom nom')
})

// Now the Express related stuff
const app = express()
const port = 3000

app.get('/', (req, res) => res.send('Hello World!'))

// Here we mount the Pets resource under the /pets path
PetsResource.mount('/pets', app)

// After mongoose is ready, we start listening on the TCP port
mongoose.connect('mongodb://localhost:27017/pets', {})
  .then(() => {
    console.log('Connection to Mongodb Established')
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
  })
  .catch(error => {
    console.log('Unable to establish connection to Mongodb', error)
  })

```

Under the hood, the resource object uses three other objects: Model, Controller and Router.

- Routers are plain express routers to which the library mounts some default REST routes
- Controllers implement CRUD methods
- Models define a mongoose model

When you create a resource object, the library will create a model a controller and a router for you, if you need to add custom logic to those components you can retrieve them as properties of the resource:
```javascript
// Let's create our Model with Mongoose
const schema = new mongoose.Schema({
  name: String
})

const PetsResource = new Resource({
  name: 'pets',
  id: 'uuid',
  model: mongoose.model('pets', schema, 'pets')
})

// Let's add a hook to the controller
const ctrl = PetsResource.controller

// more on this method later in this document
ctrl.registerHook('post:create',(req,res,next) => {
  console.log("Hello I created a resource")
  next()
})


// Let's add a custom route to the router
const router = PetsResource.router

router.get('/hello/world',(req,res,next) => {
  res.send("Hello")
})
```

## Models, Controllers and Routers

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
  controller: DinosaurController,
  options: {} // See expressJS router options
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
## Default endpoints

In the following table, every path showed in the Path column is meant to be appended to the resource base path which simply is `/<resourcename>`. Following the dinosaurs examples, would be `/dinosaurs`


| Name          | Http verb | Path            | Description                                                                            |
| ------------- | --------- | --------------- | -------------------------------------------------------------------------------------- |
| Create        | POST      | /               | Creates a new resource and returns it.                                                 |
| List          | GET       | /               | Get a paginated and filtered list of resources of the given type                       |
| GetById       | GET       | /{uuid}         | Get a resource by id                                                                   |
| UpdateById    | PUT       | /{uuid}         | Updates a resource                                                                     |
| UpdateByQuery | PUT       | /               | Updates resources that matches query parameters                                        |
| PatchById     | PATCH     | /{uuid}         | Updates a resource by id using PATCH semantics                                         |
| ReplaceById   | PUT       | /{uuid}/replace | Replaces a resource by id. Primary id field (and _id if not the same) are not replaced |
| DeleteById    | DELETE    | /{uuid}         | Deletes a resource                                                                     |
| DeleteByQuery | DELETE    | /               | Deletes resources matching filters in the querystring                                  |
| Count         | GET       | /               | Count resources in collection matching filters in the querysting                       |

## Disable endpoints

By default, all endpoints are enabled, to control which endpoints should be disabled, you can use the `endpoints` router parameter

```javascript
// Default behaviour, endpoints is an optional parameter
const router = buildRouter({
  controller: require('./mycontroller.js'),
  endpoints: {
    find: true,
    findById: true,
    create: true,
    updateById: true,
    updateByQuery: true,
    deleteById: true,
    deleteByQuery: true,
    count: true,
    patchById: true,
    replaceById: true
  }
})
// Default resource deletion
const router = buildRouter({
  controller: require('./mycontroller.js'),
  endpoints: {
    deleteById: true,
    deleteByQuery: true
  }
})
```

## Sorting

GET endpoints support result sorting thanks to two query string parameters:
- `sortorder <String>` that can only have two values: `DESC` for descending sorting and `ASC` for ascending order.
- `sortby <String>` can be used to select the sorting parameter.

For example, the following request would sort dinosaurs by age, oldest to youngest:

```http
GET /dinosaurs?sortby=age&sortorder=DESC
```
## Pagination
GET endpoints support result pagination through `skip` and `limit` parameters:
- `skip <Number>` tells the endpoint how many results to skip
- `limit <Number` tells the endpoint how many results to include in the response

To implement a pagination scheme, you can leverage these two parameters in the following way: Suppose you want to return `R` results per page and you want to return page number `P`, you just need to set limit to `R` and skip to `(P-1)*R`

## Projection

Sometimes you don't need the whole resource object but just some of its attributes, in these cases you can use the `fields` query string parameter.

Suppose the dinosaur resource has name, type and age attributes, but we just want names and age:

```http
GET /dinosaurs?fields=name,age
```

Or just names

```http
GET /dinosaurs?fields=name
```

Or every field but the age and the name

```http
GET /dinosaurs?fields=-age,-name
```

If you don't specify a `fields` parameter, every attribute will be returned.

## Custom primary key

By defaults, resources are handled as if their primary key is the `_id` field, which is automatically added by mongodb. Sometimes you might want to provide your own key such as an `uuid` field added to the model. For such cases you can provide the id attribute to the controller's config:

```javascript
const myController = new Controller({
  model: MyModel,
  name: 'dinosaurs',
  id: 'uuid'
})
```




## Hooks

Every resource endpoint can have multiple *pre* and *post* hooks. These hooks will be run by the router before and after the related controller method.

Typically, in `pre` hooks you will want to manually edit requests or do some kind of prior validation on the request, while on `post` hooks you would fetch/add more data or generate other actions such as logging business logic events.

#### List of hooks

- pre:count
- post:count
- pre:find
- post:find
- pre:findById
- post:findById
- pre:create
- post:create
- pre:updateById
- post:updateById
- pre:updateByQuery
- post:updateByQuery
- pre:deleteById
- post:deleteById
- pre:deleteByQuery
- post:deleteByQuery
- pre:patchById
- post:patchById
- pre:replaceById
- post:replaceById
- pre:*
- post:*
- pre:finalize

`pre:finalize` is called on every endpoint, just before sending the response payload to the client.
Here you can hijack `req.toSend` and update it as you need.

`pre:*` if defined, is called on every endpoint of that resource before any other "pre" hook, in the same way `post:*` is called after any other post hook. For every endpoint the order is:

- `pre:*`
- `pre:<methodName>`
- `middleware`
- `post:<methodname>`
- `post:*`
- `pre:finalize`
- `finalize`


For example, you might want to check the `Accept` HTTP header and convert the response from JSON to YAML, or XML.

### Examples
```javascript
const { Controller } = require('express-toolkit')
const { DinosaurModel } = require('./path/to/dinosaur.model.js')

const myController = new Controller({
  model: DinosaurModel,
  name: 'dinosaurs'
})

// Check authorization on all dinosaurs routes:
myController.registerHook('pre:*', (req,res,next) => {
  //This is just an example, a bad auth example.
  if (req.headers.authorization !== "supersecret") {
    return res.sendStatus(401)
  }
  next()
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

