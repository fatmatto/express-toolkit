const express = require('express')
const { asyncMiddleware } = require('./utils')
const Errors = require('throwable-http-errors')
const Controller = require('./controller')
/**
 *
 * @param {Controller} resource
 * @param {String} eventName
 */
function runHooks (resource, eventName) {
  let hooks = resource.getHooks(eventName)
  if (!hooks) {
    return (req, res, next) => {
      next()
    }
  } else {
    return hooks
  }
}

/**
 * Flushes data to the http client
 * @param {*} req
 * @param {*} res
 * @param {function} next
 */
function finalize (req, res, next) {
  return res.send({ status: true, data: req.toSend })
}

/**
 * Builds an expressjs router instance
 * @param {Object} config
 * @param {Object} config.controller
 */
function buildRouter (config) {
  const router = express.Router()
  if (!(config.controller instanceof Controller)) {
    throw new Error('config.controller must be an instance of Controller')
  }

  const findByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.findById(req.params.id)

    if (resource === null) { throw new Errors.NotFound('Cannot find resource with id ' + req.params.id) }

    req.toSend = resource
    return next()
  })

  const createMiddleware = asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.create(req.body)
    req.toSend = resource
    return next()
  })

  const createViaUpsertMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.createViaUpsert(req.body.search, req.body.data)
    req.toSend = resource
    return next()
  })

  const updateByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.updateById(req.params.id, req.body)
    req.toSend = resource
    return next()
  })

  const updatebyQueryMiddleware = asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.updateByQuery(req.query, req.body)
    req.toSend = resource
    return next()
  })

  const deleteByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    await config.controller.deleteById(req.params.id)
    req.toSend = null
    return next()
  })

  const deleteByQueryMiddleware = asyncMiddleware(async (req, res, next) => {
    await config.controller.deleteByQuery(req.query)
    req.toSend = null
    return next()
  })

  const countMiddleware = asyncMiddleware(async (req, res, next) => {
    let query = req.query
    let count = await config.controller.count(query)
    req.toSend = { count: count }
    return next()
  })

  const findMiddleware = asyncMiddleware(async (req, res, next) => {
    console.log('findMiddleware')
    let query = req.query
    let resources = await config.controller.find(query)
    req.toSend = resources
    return next()
  })

  router.get('/count', runHooks(config.controller, 'pre:count'), countMiddleware, runHooks(config.controller, 'post:count'), finalize)

  router.get('/', runHooks(config.controller, 'pre:find'), findMiddleware, runHooks(config.controller, 'post:find'), finalize)

  router.get('/:id',
    runHooks(config.controller, 'pre:findById'),
    findByIdMiddleware,
    runHooks(config.controller, 'post:findById'),
    finalize)

  router.post('/',
    runHooks(config.controller, 'pre:create'),
    createMiddleware,
    runHooks(config.controller, 'post:create'),
    finalize
  )

  router.post('/upsert',
    runHooks(config.controller, 'pre:upsert'),
    createViaUpsertMiddleware,
    runHooks(config.controller, 'post:upsert'),
    finalize
  )

  router.put('/:id', runHooks(config.controller, 'pre:updateById'), updateByIdMiddleware, runHooks(config.controller, 'post:updateById'), finalize)

  router.put('/', runHooks(config.controller, 'pre:update'), updatebyQueryMiddleware, runHooks(config.controller, 'post:update'), finalize)

  router.delete('/:id', runHooks(config.controller, 'pre:deleteById'), deleteByIdMiddleware, runHooks(config.controller, 'post:deleteById'), finalize)

  router.delete('/', runHooks(config.controller, 'pre:delete'), deleteByQueryMiddleware, runHooks(config.controller, 'post:delete'), finalize)

  return router
}

module.exports = buildRouter
