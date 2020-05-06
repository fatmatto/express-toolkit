const express = require('express')
const { asyncMiddleware } = require('./utils')
const Controller = require('./controller')
/**
 *
 * @param {Controller} resource
 * @param {String} eventName
 */
function runHooks (resource, eventName) {
  const hooks = resource.getHooks(eventName)
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
 * Endpoints enabled by default
 */
const defaultEndpoints = {
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

/**
 * Builds an expressjs router instance
 * @param {Object} config
 * @param {Object} config.controller
 * @param {Object} [config.endpoints] Map<String,Boolean>
 * @param {Object} [config.options] Express router options. As described in https://expressjs.com/en/api.html#express.router
 */
function buildRouter (config) {
  config.options = config.options || {}
  const router = express.Router(config.options)
  if (!(config.controller instanceof Controller)) {
    throw new Error('config.controller must be an instance of Controller')
  }

  if (Object.prototype.hasOwnProperty.call(config, 'endpoints') && typeof config.endpoints !== 'object') {
    throw new Error('config.endpoints must be an object')
  }

  const endpointsMap = Object.assign({}, defaultEndpoints, config.endpoints)

  const findByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.findById(req.params.id, req.query)
    req.toSend = resource
    return next()
  })

  const createMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.create(req.body)
    req.toSend = resource
    return next()
  })

  const updateByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.updateById(req.params.id, req.body)
    req.toSend = resource
    return next()
  })

  const updatebyQueryMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.updateByQuery(req.query, req.body)
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
    const query = req.query
    const count = await config.controller.count(query)
    req.toSend = { count: count }
    return next()
  })

  const findMiddleware = asyncMiddleware(async (req, res, next) => {
    const query = req.query
    const resources = await config.controller.find(query)
    req.toSend = resources
    return next()
  })

  const patchByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.patchById(req.params.id, req.body)
    req.toSend = resource
    return next()
  })

  const replaceByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.replaceById(req.params.id, req.body)
    req.toSend = resource
    return next()
  })

  const endpoints = {
    count: {
      method: 'get',
      path: '/count',
      middleware: countMiddleware
    },
    find: {
      method: 'get',
      path: '/',
      middleware: findMiddleware
    },
    findById: {
      method: 'get',
      path: '/:id',
      middleware: findByIdMiddleware
    },
    create: {
      method: 'post',
      path: '/',
      middleware: createMiddleware
    },
    updateById: {
      method: 'put',
      path: '/:id',
      middleware: updateByIdMiddleware
    },
    updateByQuery: {
      method: 'put',
      path: '/',
      middleware: updatebyQueryMiddleware
    },
    deleteById: {
      method: 'delete',
      path: '/:id',
      middleware: deleteByIdMiddleware
    },
    deleteByQuery: {
      method: 'delete',
      path: '/',
      middleware: deleteByQueryMiddleware
    },
    patchById: {
      method: 'patch',
      path: '/:id',
      middleware: patchByIdMiddleware
    },
    replaceById: {
      method: 'put',
      path: '/:id/replace',
      middleware: replaceByIdMiddleware
    }

  }

  for (let endpointName in endpoints) {
    /**
     * This is for reto-compatibility reasons, some hooks (due to a bug or a bad design decision)
     * did not match the middleware name, for example the pre:update hook is run before the updateByQuery
     * middleware. for this reason we must remap those hooks
     */
    let hookName = endpointName
    if (hookName === 'updateByQuery') {
      hookName = 'update'
    }
    if (hookName === 'deleteByQuery') {
      hookName = 'delete'
    }
    const endpoint = endpoints[endpointName]
    if (endpointsMap[endpointName]) {
      router[endpoint.method](
        endpoint.path,
        runHooks(config.controller, 'pre:*'),
        runHooks(config.controller, `pre:${hookName}`),
        endpoint.middleware,
        runHooks(config.controller, `post:${hookName}`),
        runHooks(config.controller, 'post:*'),
        runHooks(config.controller, 'pre:finalize'),
        finalize
      )
    }
  }

  return router
}

module.exports = buildRouter
