const test = require('ava')
const mongoose = require('mongoose')
const { makeApp } = require('./helpers/app.helper')
const Resource = require('../src/resource')
const request = require('supertest')
const schema = new mongoose.Schema({
  name: String
})
const petsModel = mongoose.model('pets', schema, 'pets')
const mongooseSetup = require('./helpers/mongoose.helper')
test.before('setup', async () => {
  await mongooseSetup()
})
test('Should mount a resource to a basic express application', async t => {
  const app = makeApp()

  const PetsResource = new Resource({
    name: 'pets',
    id: 'uuid',
    model: petsModel
  })

  PetsResource.mount('/pets', app)

  const resp = await request(app)
    .post('/pets')
    .send({ name: 'Wiskers' })

  t.is(resp.status, 200)
})

test('Should pass endpoints config to the router', async t => {
  const app = makeApp()

  const PetsResource = new Resource({
    name: 'pets',
    endpoints: {
      deleteById: false
    },
    id: 'uuid',
    model: petsModel
  })

  PetsResource.mount('/pets', app)

  const resp = await request(app)
    .post('/pets')
    .send({ name: 'Wiskers' })

  t.is(resp.status, 200)

  const uuid = resp.body.data.uuid
  const deleteResponse = await request(app)
    .delete('/pets/' + uuid)

  t.is(deleteResponse.status, 404)
})

test('The router getter should return the private _router property', t => {
  const PetsResource = new Resource({
    name: 'pets',
    endpoints: {
      deleteById: false
    },
    id: 'uuid',
    model: petsModel
  })
  t.is(PetsResource.router, PetsResource._router)
})

test('Hooks should work with resources', async t => {
  const app = makeApp()

  const PetsResource = new Resource({
    name: 'pets',
    endpoints: {
      deleteById: false
    },
    id: 'uuid',
    model: petsModel
  })

  PetsResource.controller.registerHook('pre:*', (req, res, next) => {
    return res.send({ hooked: true })
  })
  // This is necessary with resources since the controller changed and the router needs to be rebuilt
  PetsResource.rebuildRouter()
  PetsResource.mount('/pets', app)

  const resp = await request(app)
    .post('/pets')
    .send({ name: 'Wiskers' })

  t.is(resp.status, 200)
  t.is(resp.body.hooked, true)
})

test('Custom routes should work with resources', async t => {
  const app = makeApp()

  const PetsResource = new Resource({
    name: 'pets',
    endpoints: {
      deleteById: false
    },
    id: 'uuid',
    model: petsModel
  })

  PetsResource.router.get('/foo/bar', (req, res, next) => {
    res.send({ bar: 'baz' })
  })

  PetsResource.mount('/pets', app)

  const resp = await request(app)
    .get('/pets/foo/bar')

  t.is(resp.status, 200)
  t.is(resp.body.bar, 'baz')
})

test('getRouter should return the router instance', async t => {
  const PetsResource = new Resource({
    name: 'pets',
    endpoints: {
      deleteById: false
    },
    id: 'uuid',
    model: petsModel
  })

  t.deepEqual(PetsResource._router, PetsResource.getRouter())
})
