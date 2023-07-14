const Controller = require('../src/controller')
const mongoose = require('mongoose')
const test = require('ava')
const express = require('express')
const bodyParser = require('body-parser')
const mongooseSetup = require('./helpers/mongoose.helper')

test.before('setup', async () => {
  await mongooseSetup()
})

test.beforeEach(t => {
  t.context.app = express()
  t.context.app.use(bodyParser.json())
})

test('Should include subResources', async t => {
  const AuthorSchema = new mongoose.Schema({
    name: String,
    uuid: String
  })
  const AuthorModel = mongoose.model('authors', AuthorSchema, 'authors')
  const BookSchema = new mongoose.Schema({
    title: String,
    uuid: String,
    authorId: String
  })
  const BookModel = mongoose.model('books', BookSchema, 'books')
  const BookController = new Controller({
    name: 'books',
    id: 'uuid',
    model: BookModel,
    relationships: [
      {
        resource: 'authors',
        localField: 'authorId',
        foreignField: 'uuid'
      }
    ]
  })
  const AuthorController = new Controller({
    name: 'authors',
    id: 'uuid',
    model: AuthorModel,
    relationships: [
      {
        resource: 'books',
        foreignField: 'authorId',
        localField: 'uuid'
      }
    ]
  })

  await BookModel.insertMany([
    { title: 'it', authorId: 'stephen-king', uuid: 'book-it' },
    { title: 'dark tower', authorId: 'stephen-king', uuid: 'book-dark-tower' },
    { title: 'lorrd of the things', authorId: 'jrr-tolkien', uuid: 'book-rrrjrj' }
  ])

  await AuthorModel.insertMany([{
    name: 'Stephen King',
    uuid: 'stephen-king'
  }, { name: 'Luigi Pirandello', uuid: 'luigi-pirandello' }])

  const result = await BookController.find({ includes: 'authors' })
  t.is(result.length, 3)
  t.is(result[1].included.authors[0].name, 'Stephen King')

  const result2 = await AuthorController.find({ includes: 'books' })
  t.is(result2.length, 2)
  const pirandello = result2.find(i => i.name === 'Luigi Pirandello')
  const king = result2.find(i => i.name === 'Stephen King')
  t.is(true, !!pirandello)
  t.is(true, !!king)
  t.is(king.included.books.length, 2)
  t.is(pirandello.included.books.length, 0)

  // Testing findOne methods
  const findOneResult = await AuthorController.findOne({ name: 'Stephen King', includes: 'books' })

  t.is(findOneResult.name, 'Stephen King')
  t.is(findOneResult.included.books.length, 2)

  // Testing findById methods
  const findByIdResult = await AuthorController.findById('stephen-king', { includes: 'books' })

  t.is(findByIdResult.name, 'Stephen King')
  t.is(findByIdResult.included.books.length, 2)
})

test('Should throw BadRequest when requesting a subresource not listed as a relationship', async t => {
  const BookSchema = new mongoose.Schema({
    title: String,
    uuid: String,
    authorId: String
  })
  const BookModel = mongoose.model('books2', BookSchema, 'books2')
  const BookController = new Controller({
    name: 'books',
    id: 'uuid',
    model: BookModel,
    relationships: [
      {
        resource: 'authors',
        localField: 'authorId',
        foreignField: 'uuid'
      }
    ]
  })

  const err = await t.throwsAsync(async () => {
    await BookController.find({ includes: 'non-existing-resource' })
  })
  t.is(err.name, 'BadRequest')
})

test('Should allow to project and paginate subresources', async t => {
  const AuthorSchema = new mongoose.Schema({
    name: String,
    uuid: String
  })
  const AuthorModel = mongoose.model('authors3', AuthorSchema, 'authors3')
  const BookSchema = new mongoose.Schema({
    title: String,
    uuid: String,
    authorId: String
  })
  const BookModel = mongoose.model('books3', BookSchema, 'books3')
  const AuthorController = new Controller({
    name: 'authors3',
    id: 'uuid',
    model: AuthorModel,
    relationships: [
      {
        resource: 'books3',
        foreignField: 'authorId',
        localField: 'uuid'
      }
    ]
  })

  await BookModel.insertMany([
    { title: 'it', authorId: 'stephen-king', uuid: 'book-it' },
    { title: 'dark tower', authorId: 'stephen-king', uuid: 'book-dark-tower' },
    { title: 'shining', authorId: 'stephen-king', uuid: 'book-shining' },
    { title: 'lord of the things', authorId: 'jrr-tolkien', uuid: 'book-rrrjrj' }
  ])

  await AuthorModel.insertMany([{
    name: 'Stephen King',
    uuid: 'stephen-king'
  }, { name: 'Luigi Pirandello', uuid: 'luigi-pirandello' }])

  // Testing findOne
  const findOneResult = await AuthorController.findOne({
    authorId: 'stephen-king',
    includes: 'books3',
    fields: { books3: 'title' },
    limit: { books3: 2 },
    skip: { books3: 1 },
    sortby: { books3: 'title' },
    sortorder: { books3: 'ASC' }
  })
  t.is(findOneResult.included.books3.length, 2)

  // Verify sort order and skip=1
  t.is(findOneResult.included.books3[0].title, 'it')
  t.is(findOneResult.included.books3[1].title, 'shining')

  // Verify projection
  t.is(Object.prototype.hasOwnProperty.call(findOneResult.included.books3[0], 'uuid'), false)

  // Testing findById
  const findByIdResult = await AuthorController.findById('stephen-king', {
    includes: 'books3',
    fields: { books3: 'title' },
    limit: { books3: 2 },
    skip: { books3: 1 },
    sortby: { books3: 'title' },
    sortorder: { books3: 'ASC' }
  })
  t.is(findByIdResult.included.books3.length, 2)

  // Verify sort order and skip=1
  t.is(findByIdResult.included.books3[0].title, 'it')
  t.is(findByIdResult.included.books3[1].title, 'shining')

  // Verify projection
  t.is(Object.prototype.hasOwnProperty.call(findByIdResult.included.books3[0], 'uuid'), false)

  // Testing find
  const findResult = await AuthorController.find({
    uuid: 'stephen-king',
    includes: 'books3',
    fields: { books3: 'title' },
    limit: { books3: 2 },
    skip: { books3: 1 },
    sortby: { books3: 'title' },
    sortorder: { books3: 'ASC' }
  })
  t.is(findResult.length, 1)
  t.is(findResult[0].included.books3.length, 2)

  // Verify sort order and skip=1
  t.is(findResult[0].included.books3[0].title, 'it')
  t.is(findResult[0].included.books3[1].title, 'shining')

  // Verify projection
  t.is(Object.prototype.hasOwnProperty.call(findResult[0].included.books3[0], 'uuid'), false)
})
