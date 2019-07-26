// TODO https://github.com/nodkz/mongodb-memory-server
import test from 'ava'
import Controller from '../src/controller'
import { CatModel, makeModel } from './helpers/mockmodel.helper'
const mongooseSetup = require('./helpers/mongoose.helper')

const ctrl = new Controller({
  name: 'cats',
  defaultLimitValue: 20,
  defaultSkipValue: 0,
  model: CatModel
})

const cats = [{ name: 'Snowball I' }, { name: 'Snowball II' }, { name: 'Snowball III' }, { name: 'Snowball V' }]

test.before('setup', async () => {
  await mongooseSetup()
  for (let cat of cats) {
    await ctrl.create(cat)
  }
})

test('Should use the custom id key', async t => {
  const c = new Controller({
    name: 'cats',
    id: 'name',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })
  let cat = await c.findById('Snowball I')
  t.is(cat.name, 'Snowball I')
})

test('Reject invalid resource', async t => {
  const err = await t.throwsAsync(async () => {
    let p = await ctrl.create({})
  })
  t.is(err.name, 'BadRequest')
})

test('Reject updateById on non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.updateById('nothingtosee')
  })
  t.is(err.name, 'NotFound')
})
test('Reject updateOne on non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.updateByQuery({ name: 'nothingtosee' })
  })
  t.is(err.name, 'NotFound')
})
test('Reject updateOne on invalid data', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.updateByQuery({ name: 'Snowball I' }, { age: ['a', 'b', null] })
  })
  t.is(err.name, 'BadRequest')
})
test('Reject updateById on invalid data', async t => {
  let cat = await ctrl.findOne({ name: 'Snowball I' })
  const err = await t.throwsAsync(async () => {
    let res = await ctrl.updateById(cat._id, { age: ['a', 'b', null] })
  })
  t.is(err.name, 'BadRequest')
})
test('Reject findOne non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.findOne({ name: 'nothingtosee' })
  })
  t.is(err.name, 'NotFound')
})
test('Reject findById non existing resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.findById('non-existing')
  })
  t.is(err.name, 'NotFound')
})

test('list resources', async t => {
  let cats = await ctrl.find({})
  t.is(cats.length, cats.length)
})

test('list resources with limit', async t => {
  let cats = await ctrl.find({ limit: 1 })
  t.is(cats.length, 1)
})

test('Create a resource', async t => {
  let cat = await ctrl.create({ name: 'Snowball IV' })
  t.is(cat.name, 'Snowball IV')
})

test('Find one resource', async t => {
  let cat = await ctrl.findOne({ name: 'Snowball I' })
  t.is(cat.name, 'Snowball I')
})

test('Update one resource', async t => {
  let cat = await ctrl.updateByQuery({ name: 'Snowball III' }, { name: 'Snowball III+' })
  t.is(cat.name, 'Snowball III+')
})

test('Update by id', async t => {
  let cat = await ctrl.findOne({ name: 'Snowball V' })
  let updatedCat = await ctrl.updateById(cat._id, { name: 'Snowball V+' })
  t.is(updatedCat.name, 'Snowball V+')
})
test('Delete a resource by id', async t => {
  let cat = await ctrl.create({ name: 'Snowball Joe' })
  await ctrl.deleteById(cat._id)
  const err = await t.throwsAsync(async () => {
    await ctrl.findById(cat._id)
  })
  t.is(err.name, 'NotFound')
})

test('Delete a resource by query', async t => {
  await ctrl.deleteByQuery({ name: 'Snowball II' })
  const err = await t.throwsAsync(async () => {
    await ctrl.findOne({ name: 'Snowball II' })
  })
  t.is(err.name, 'NotFound')
})

test('Should handle the skip parameter', async t => {
  const c = new Controller({
    name: 'catz',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })
  await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  const allCats = await c.find({ sortby: 'name' })
  const someCats = await c.find({ skip: 1, sortby: 'name' })

  t.is(someCats.length, allCats.length - 1)
})

test('Should return the resource count', async t => {
  const c = new Controller({
    name: 'dogs',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('dog')
  })
  await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  const count = await c.count({})

  t.is(count, 3)
})

test('Should throw a type error when passing a non-function argument to registerHook', async t => {
  const err = await t.throws(() => {
    ctrl.registerHook('post:create', null)
  })
  t.true(err instanceof TypeError)
})
