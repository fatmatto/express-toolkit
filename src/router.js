
const express = require('express')
const { asyncMiddleware } = require('./utils')
const Errors = require('throwable-http-errors')
/**
 * Builds an expressjs router instance
 * @param {Object} config
 * @param {Object} config.controller
 */
function buildRouter (config) {
  const router = express.Router()
  router.get('/count', asyncMiddleware(async (req, res, next) => {
    let query = req.query
    let count = await config.controller.count(query)
    res.send({ status: true, data: { count: count } })
  }))

  router.get('/', asyncMiddleware(async (req, res, next) => {
    let query = req.query
    let resources = await config.controller.find(query)
    res.send({ status: true, data: resources })
  }))

  router.get('/:id', asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.findById(req.params.id)

    if (resource === null) { throw new Errors.NotFound('Cannot find resource with id ' + req.params.id) }

    res.send({ status: true, data: resource })
  }))

  router.post('/', asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.create(req.body)
    res.send({ status: true, data: resource })
  }))

  router.put('/:id', asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.updateById(req.params.id, req.body)
    res.send({ status: true, data: resource })
  }))

  router.put('/', asyncMiddleware(async (req, res, next) => {
    let resource = await config.controller.updateByQuery(req.query, req.body)
    res.send({ status: true, data: resource })
  }))

  router.delete('/:id', asyncMiddleware(async (req, res, next) => {
    await config.controller.deleteById(req.params.id)
    res.send({ status: true })
  }))

  router.delete('/', asyncMiddleware(async (req, res, next) => {
    await config.controller.deleteByQuery(req.query)
    res.send({ status: true })
  }))

  return router
}

module.exports = buildRouter
