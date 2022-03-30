const Controller = require('../src/controller')
const router = require('../src/router')
const { CatModel, makeModel, makeModelWithCustomId } = require('./helpers/mockmodel.helper')
const sinon = require('sinon')
const test = require('ava')
const request = require('supertest')
const express = require('express')
const bodyParser = require('body-parser')
const mongooseSetup = require('./helpers/mongoose.helper')
const { makeApp } = require('./helpers/app.helper')

test.before('setup', async () => {
  await mongooseSetup()
})

test.beforeEach(t => {
  t.context.app = express()
  t.context.app.use(bodyParser.json())
})

test('Should throw error when given a non controller argument', t => {
  const err = t.throws(() => {
    router({
      controller: 1
    })
  })
  t.true(err instanceof Error)
})
test('Should throw error when the endpoints parameter is not an object', t => {
  const err = t.throws(() => {
    router({
      endpoints: 0,
      controller: new Controller({
        name: 'cats',
        defaultLimitValue: 20,
        defaultSkipValue: 0,
        model: CatModel
      })
    })
  })
  t.true(err instanceof Error)
})
test('Should run all post:find hooks', async t => {
  const ctrl = new Controller({
    name: 'cats',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })

  ctrl.registerHook('post:find', (req, res, next) => {
    req.toSend = 'Hello'
    next()
  })

  ctrl.registerHook('post:find', (req, res, next) => {
    req.toSend += ' World'
    next()
  })

  const _router = router({
    controller: ctrl
  })

  t.context.app.use('/', _router)
  const res = await request(t.context.app)
    .get('/')

  t.is(res.body.data, 'Hello World')
})

test('Should return 404 for disabled endpoints', async t => {
  const ctrl = new Controller({
    name: 'dogs',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('pandas')
  })
  const _router = router({
    controller: ctrl,
    endpoints: {
      find: false
    }
  })
  t.context.app.use('/', _router)

  const response = await request(t.context.app)
    .get('/')

  t.is(404, response.status)
})

test('Should run all *:count hooks', async t => {
  const ctrl = new Controller({
    name: 'cats',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })

  const spies = {
    pre: sinon.spy(),
    post: sinon.spy()
  }

  ctrl.registerHook('pre:count', (req, res, next) => {
    spies.pre()
    next()
  })

  ctrl.registerHook('post:count', (req, res, next) => {
    spies.post()
    next()
  })

  const _router = router({
    controller: ctrl
  })

  t.context.app.use('/', _router)
  await request(t.context.app)
    .get('/count')

  t.true(spies.pre.called)
  t.true(spies.post.called)
})

test('Should run all *:deleteById hooks', async t => {
  const ctrl = new Controller({
    name: 'dogs',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('dogs')
  })

  const spies = {
    pre: sinon.spy(),
    post: sinon.spy()
  }

  ctrl.registerHook('pre:deleteById', (req, res, next) => {
    spies.pre()
    next()
  })

  ctrl.registerHook('post:deleteById', (req, res, next) => {
    spies.post()
    next()
  })

  const _router = router({
    controller: ctrl
  })

  const doggo = await ctrl.create({ name: 'Bobby' })

  t.context.app.use('/', _router)
  await request(t.context.app)
    .delete('/' + doggo._id)

  t.true(spies.pre.called)
  t.true(spies.post.called)
})

test('Should support custom routes', async t => {
  const app = makeApp()
  const ctrl = new Controller({
    name: 'dogs',
    id: 'uuid',
    model: makeModel('doggos')
  })
  const _router = router({
    controller: ctrl
  })
  _router.get('/foo/bar', (req, res, next) => {
    res.send({ bar: 'baz' })
  })

  app.use('/doggos', _router)

  const response = await request(app)
    .get('/doggos/foo/bar')

  t.is(200, response.status)
  t.is('baz', response.body.bar)
})

test('Should run all hooks', async t => {
  const ctrl = new Controller({
    name: 'dogs',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('dogs2')
  })

  const spies = {
    preFindById: sinon.spy(),
    postFindById: sinon.spy(),
    preDeleteByQuery: sinon.spy(),
    postDeleteByQuery: sinon.spy(),
    preUpdateByQuery: sinon.spy(),
    postUpdateByQuery: sinon.spy(),
    preCreate: sinon.spy(),
    postCreate: sinon.spy(),
    preFinalize: sinon.spy(),
    prePatch: sinon.spy(),
    postPatch: sinon.spy(),
    preReplaceById: sinon.spy(),
    postReplaceById: sinon.spy()
  }

  ctrl.registerHook('pre:create', (req, res, next) => {
    spies.preCreate()
    next()
  })

  ctrl.registerHook('post:create', (req, res, next) => {
    spies.postCreate()
    next()
  })

  ctrl.registerHook('pre:delete', (req, res, next) => {
    spies.preDeleteByQuery()
    next()
  })

  ctrl.registerHook('post:delete', (req, res, next) => {
    spies.postDeleteByQuery()
    next()
  })

  ctrl.registerHook('pre:update', (req, res, next) => {
    spies.preUpdateByQuery()
    next()
  })
  ctrl.registerHook('post:update', (req, res, next) => {
    spies.postUpdateByQuery()
    next()
  })

  // findById
  ctrl.registerHook('pre:findById', (req, res, next) => {
    spies.preFindById()
    next()
  })
  ctrl.registerHook('post:findById', (req, res, next) => {
    spies.postFindById()
    next()
  })
  ctrl.registerHook('pre:finalize', (req, res, next) => {
    spies.preFinalize()
    next()
  })

  ctrl.registerHook('pre:patchById', (req, res, next) => {
    spies.prePatch()
    next()
  })

  ctrl.registerHook('post:patchById', (req, res, next) => {
    spies.postPatch()
    next()
  })

  ctrl.registerHook('pre:replaceById', (req, res, next) => {
    spies.preReplaceById()
    next()
  })

  ctrl.registerHook('post:replaceById', (req, res, next) => {
    spies.postReplaceById()
    next()
  })

  const _router = router({
    controller: ctrl
  })

  const doggo = await ctrl.create({ name: 'Bobby' })

  t.context.app.use('/', _router)
  t.context.app.use((err, req, res, next) => {
    console.log(err)
    throw err
  })

  await request(t.context.app)
    .get(`/${doggo._id}`)

  // test create hooks
  await request(t.context.app)
    .post('/')
    .send({ name: 'Doggo, the super dog' })
    .set('Accept', 'application/json')

  // test updateByQuery Hooks
  await request(t.context.app)
    .put('/')
    .query({ name: doggo.name })
    .send({ name: 'Doggo, the usurper' })

  // test updateById hooks
  await request(t.context.app)
    .put(`/${doggo._id}`)
    .send({ name: 'Doggo, the usurper' })

  // test create hooks
  await request(t.context.app)
    .patch(`/${doggo._id}`)
    .send([{ op: 'replace', path: '/name', value: 'Doggo the patched eye' }])
    .set('Accept', 'application/json')

  // test create hooks
  await request(t.context.app)
    .put(`/${doggo._id}/replace`)
    .send({ name: 'Doggerino the calm' })
    .set('Accept', 'application/json')

  // Test deleteByQuery
  await request(t.context.app)
    .delete('/')

  t.true(spies.preFindById.called)
  t.true(spies.postFindById.called)
  t.true(spies.preCreate.called)
  t.true(spies.postCreate.called)
  t.true(spies.preDeleteByQuery.called)
  t.true(spies.postDeleteByQuery.called)
  t.true(spies.preUpdateByQuery.called)
  t.true(spies.postUpdateByQuery.called)
  t.true(spies.preFinalize.called)
  t.true(spies.prePatch.called)
  t.true(spies.postPatch.called)
  t.true(spies.preReplaceById.called)
  t.true(spies.postReplaceById.called)
})

test('Should be able to use a customized id route param', async t => {
  const app = makeApp()
  const UserModel = makeModelWithCustomId('users')
  const SettingModel = makeModelWithCustomId('settings')
  const userController = new Controller({
    name: 'users',
    id: 'uuid',
    model: UserModel
  })
  const userSettingsController = new Controller({
    name: 'settings',
    id: 'uuid',
    model: SettingModel
  })

  const user = new UserModel({ name: 'MARIO', age: 32, uuid: 'user123' })
  const setting = new SettingModel({ name: 'CONFIG_GENERALI', owner: 'user123', uuid: 'setting123' })

  await user.save()
  await setting.save()

  userSettingsController.registerHook('pre:findById', (req, res, next) => {
    return next()
  })

  userSettingsController.registerHook('post:findById', (req, res, next) => {
    req.toSend = { params: req.params }
    return next()
  })

  const settingsRouter = router({
    controller: userSettingsController,
    id: 'settingId', // We use a custom name for the path param
    options: { mergeParams: true } // We have to use mergeParams in order to obtain params from all routers
  })

  const userRouter = router({
    controller: userController
  })

  userRouter.use('/:id/settings', settingsRouter)

  app.use('/users', userRouter)

  const response = await request(app)
    .get('/users/user123/settings/setting123')

  const result = response.body

  t.is(result.data.params.id, 'user123')
  t.is(result.data.params.settingId, 'setting123')
})
