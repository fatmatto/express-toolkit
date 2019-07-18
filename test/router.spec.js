import test from 'ava'

import Controller from '../src/controller'
import router from '../src/router'
import { CatModel } from './helpers/mockmodel.helper'
const request = require('supertest')
const express = require('express')
const mongooseSetup = require('./helpers/mongoose.helper')

test.before('setup', async () => {
  await mongooseSetup()
})

test.beforeEach(t => {
  t.context.app = express()
})

test('Should throw exception because of wrong controller instance', async t => {
  const err = await t.throwsAsync(async () => {
    let _router = router({
      controller: {}
    })
  })
  t.is(err.message, 'config.controller must be an instance of Controller')
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

  let _router = router({
    controller: ctrl
  })

  t.context.app.use('/', _router)
  const res = await request(t.context.app)
    .get('/')

  t.is(res.body.data, 'Hello World')
})
