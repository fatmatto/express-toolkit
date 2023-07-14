const express = require('express')
const { asyncMiddleware, getProjection } = require('./utils')
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
  const output = { status: true, data: req.toSend }
  return res.send(output)
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
 * @param {String} [config.id] The named route parameter to use as id. Defaults to "id"
 * @param {Object} [config.options] Express router options. As described in https://expressjs.com/en/api.html#express.router
 */
function buildRouter (config) {
  config.options = config.options || {}
  config.id = config.id || 'id'
  const router = express.Router(config.options)
  if (!(config.controller instanceof Controller)) {
    throw new Error('config.controller must be an instance of Controller')
  }

  if (Object.prototype.hasOwnProperty.call(config, 'endpoints') && typeof config.endpoints !== 'object') {
    throw new Error('config.endpoints must be an object')
  }

  const endpointsMap = Object.assign({}, defaultEndpoints, config.endpoints)

  const findByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.findById(req.params[config.id], req.query)
    req.toSend = resource
    return next()
  })

  const createMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.create(req.body)
    req.toSend = resource
    return next()
  })

  const updateByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.updateById(req.params[config.id], req.body, req.query)
    req.toSend = resource
    return next()
  })

  const updatebyQueryMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.updateByQuery(req.query, req.body)
    req.toSend = resource
    return next()
  })

  const deleteByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    await config.controller.deleteById(req.params[config.id])
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
    const resources = await config.controller.find(query, req.__parsedOptions)
    req.toSend = resources
    return next()
  })

  const patchByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.patchById(req.params[config.id], req.body)
    req.toSend = resource
    return next()
  })

  const replaceByIdMiddleware = asyncMiddleware(async (req, res, next) => {
    const resource = await config.controller.replaceById(req.params[config.id], req.body)
    req.toSend = resource
    return next()
  })

  /**
   *
   * This middleware handles all the non filter operators
   */
  // function preOperatorsHandler (req, res, next) {
  //   const parsedOptions = {
  //     limit: config.controller.defaultLimitValue,
  //     skip: config.controller.defaultSkipValue,
  //     projection: { default: {} }
  //   }
  //   if (req.query.includes) {
  //     parsedOptions.includes = req.query.includes.split(',')
  //     delete req.query.includes
  //   }
  //   if (req.query.fields) {
  //     parsedOptions.projection = getProjection(req.query)
  //     delete req.query.fields
  //   }

  //   if (req.query.sortby) {
  //     parsedOptions.sortby = req.query.sortby
  //     delete req.query.sortby
  //   }

  //   if (req.query.sortorder) {
  //     parsedOptions.sortorder = req.query.sortorder
  //     delete req.query.sortorder
  //   }

  //   if (req.query.skip) {
  //     parsedOptions.skip = Number(req.query.skip)
  //     delete req.query.skip
  //   }

  //   if (req.query.limit) {
  //     parsedOptions.limit = Number(req.query.limit)
  //     delete req.query.limit
  //   }

  //   req.__parsedOptions = parsedOptions

  //   return next()
  // }

  // async function postIncludeHandler (req, res, next) {
  //   if (req.__parsedOptions.includes) {
  //     req.__included = await config.controller.fetchSubresources(req.toSend, req.__parsedOptions.includes, config.relationships)
  //   }

  //   return next()
  // }

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
      path: `/:${config.id}`,
      middleware: findByIdMiddleware
    },
    create: {
      method: 'post',
      path: '/',
      middleware: createMiddleware
    },
    updateById: {
      method: 'put',
      path: `/:${config.id}`,
      middleware: updateByIdMiddleware
    },
    updateByQuery: {
      method: 'put',
      path: '/',
      middleware: updatebyQueryMiddleware
    },
    deleteById: {
      method: 'delete',
      path: `/:${config.id}`,
      middleware: deleteByIdMiddleware
    },
    deleteByQuery: {
      method: 'delete',
      path: '/',
      middleware: deleteByQueryMiddleware
    },
    patchById: {
      method: 'patch',
      path: `/:${config.id}`,
      middleware: patchByIdMiddleware
    },
    replaceById: {
      method: 'put',
      path: `/:${config.id}/replace`,
      middleware: replaceByIdMiddleware
    }

  }

  for (const endpointName in endpoints) {
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
        // preOperatorsHandler,
        endpoint.middleware,
        // asyncMiddleware(postIncludeHandler),
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
