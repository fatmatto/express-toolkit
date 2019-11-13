// TODO https://github.com/nodkz/mongodb-memory-server
import test from 'ava'
import Controller from '../src/controller'
import { CatModel, makeModel } from './helpers/mockmodel.helper'
const mongooseSetup = require('./helpers/mongoose.helper')
const Errors = require('throwable-http-errors')
const ctrl = new Controller({
  name: 'cats',
  defaultLimitValue: 20,
  defaultSkipValue: 0,
  model: CatModel
})

const cats = [{ name: 'Snowball I' }, { name: 'Snowball II' }, { name: 'Snowball III' }, { name: 'Snowball V' }]

test.before('setup', async () => {
  await mongooseSetup()
  for (const cat of cats) {
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
  const cat = await c.findById('Snowball I')
  t.is(cat.name, 'Snowball I')
})

test('Reject invalid resource', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.create({})
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
  const cat = await ctrl.findOne({ name: 'Snowball I' })
  const err = await t.throwsAsync(async () => {
    await ctrl.updateById(cat._id, { age: ['a', 'b', null] })
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
  const cats = await ctrl.find({})
  t.is(cats.length, cats.length)
})

test('list resources with limit', async t => {
  const cats = await ctrl.find({ limit: 1 })
  t.is(cats.length, 1)
})

test('Default limit should be set to 100', async t => {
  const c = new Controller({
    name: 'fishes',
    model: makeModel('fishes')
  })
  const fishes = []
  for (let i = 0; i < 105; i++) {
    fishes.push({ name: `Fish ${i}` })
  }

  await c.bulkCreate(fishes)

  const fishedFishes = await c.find({})

  t.is(fishedFishes.length, 100)
})

test('Create a resource', async t => {
  const cat = await ctrl.create({ name: 'Snowball IV' })
  t.is(cat.name, 'Snowball IV')
})

test('Creates multiple resources', async t => {
  const cats = await ctrl.create([{ name: 'Snowball IX' }, { name: 'Snowball X' }])
  t.is(true, Array.isArray(cats))
})

test('Bulk Create should validate resources', async t => {
  const err = await t.throwsAsync(async () => {
    await ctrl.create([{ name: 'Snowball IX' }, {}])
  })
  t.is(err.name, 'BadRequest')
})

test('Bulk update should update all documents', async t => {
  const c = new Controller({
    name: 'koalas',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('koalas')
  })
  const documents = await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  t.is(documents.length, 3)

  await c.bulkUpdate(documents.map(k => {
    k.name = k.name + ' Junior'
    return k
  }))

  const updatedDocuments = await c.find({})
  t.is(true, updatedDocuments.every(doc => {
    return doc.name.indexOf('Junior') > -1
  }))
})

test('Find one resource', async t => {
  const cat = await ctrl.findOne({ name: 'Snowball I' })
  t.is(cat.name, 'Snowball I')
})

test('Update one resource', async t => {
  const cat = await ctrl.updateByQuery({ name: 'Snowball III' }, { name: 'Snowball III+' })
  t.is(cat.name, 'Snowball III+')
})

test('Update by id', async t => {
  const cat = await ctrl.findOne({ name: 'Snowball V' })
  const updatedCat = await ctrl.updateById(cat._id, { name: 'Snowball V+' })
  t.is(updatedCat.name, 'Snowball V+')
})
test('Delete a resource by id', async t => {
  const cat = await ctrl.create({ name: 'Snowball Joe' })
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
    name: 'kangaroos',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('kangaroos')
  })
  await Promise.all([
    c.create({ name: 'Roger' }),
    c.create({ name: 'Kettle' }),
    c.create({ name: 'Spike' })
  ])

  const allKangaroos = await c.find({ sortby: 'name' })
  const someKangaroos = await c.find({ skip: 1, sortby: 'name' })

  t.not(someKangaroos[0].name, allKangaroos[0].name)
})

test('Should handle the sortorder parameter', async t => {
  const c = new Controller({
    name: 'butterflies',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('butterflies')
  })
  await Promise.all([
    c.create({ name: 'Fiona' }),
    c.create({ name: 'Andrew' }),
    c.create({ name: 'Zoe' })
  ])

  const ZAbutterflies = await c.find({ sortby: 'name', sortorder: 'DESC' })
  const AZbutterflies = await c.find({ sortby: 'name', sortorder: 'ASC' })

  t.is(ZAbutterflies[0].name, 'Zoe')
  t.is(AZbutterflies[0].name, 'Andrew')
})

test('Should handle the fields parameter', async t => {
  const c = new Controller({
    name: 'bees',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('bees')
  })
  await c.create({ name: 'Fiona', age: 7 })

  const result = await c.findOne({ name: 'Fiona', fields: 'age' })

  t.is(!result.hasOwnProperty('name'), true)
  t.is(result.age, 7)
})

test('Bulk update should reject updates without id', async t => {
  const c = new Controller({
    name: 'cats',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: CatModel
  })
  await t.throwsAsync(async () => {
    await c.bulkUpdate([{ Hello: 'World' }])
  })
})

test('Should reject a wrong sortorder parameter', async t => {
  const c = new Controller({
    name: 'donkeys',
    defaultLimitValue: 20,
    defaultSkipValue: 0,
    model: makeModel('donkeys')
  })
  const err = await t.throwsAsync(async () => {
    await c.find({ sortorder: 'FOOBAR' })
  })
  t.true(err instanceof Errors.BadRequest)
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


test('UpdateById Should use partial updates correctly', async t => {
  const c = new Controller({
    name: 'Zebras',
    id:'name',
    model: makeModel('zebra'),
    usePartialUpdates:true
  })
  const c2 = new Controller({
    name: 'Zebras',
    id: 'name',
    model: makeModel('zebra2'),
    usePartialUpdates: false
  })
  const ginger = await c.create({ name: 'Ginger' })
  const roger = await c2.create({name: 'Roger'})
  t.is(ginger.features.color,'purple')
  t.is(roger.features.color,'purple')
  const updatedGinger = await c.updateById(ginger.name,{features:{length:'1cm'}})
  t.is(updatedGinger.features.color, 'purple')
  t.is(updatedGinger.features.length, '1cm')
  const updatedRoger = await c2.updateById(roger.name,{features:{length:'1cm'}})
  t.falsy(updatedRoger.features.color)
  t.is(updatedRoger.features.length, '1cm')
  
})


test('UpdateByQuery Should use partial updates correctly', async t => {
  const c = new Controller({
    name: 'Zebras',
    id: 'name',
    model: makeModel('zebra3'),
    usePartialUpdates: true
  })
  const ginger = await c.create({ name: 'Ginger' })
  t.is(ginger.features.color, 'purple')
  const updatedGinger = await c.updateByQuery({name:ginger.name}, { features: { length: '1cm' } })
  t.is(updatedGinger.features.color, 'purple')
  t.is(updatedGinger.features.length, '1cm')
})
