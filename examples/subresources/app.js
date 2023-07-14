const express = require('express')
const Resource = require('../../src/resource')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const AuthorSchema = new mongoose.Schema({
  uuid: {type:String,required:true},
  name: {type:String,required:true}
})
const Author = new Resource({
  name: 'authors',
  id: 'uuid',
  model: mongoose.model('authors', AuthorSchema, 'authors')
})

const BookSchema = new mongoose.Schema({
  uuid: {type:String,required:true},
  authorId:{type:String,required:true},
  title: {type:String,required:true}
})
const Books = new Resource({
  name: 'books',
  id: 'uuid',
  model: mongoose.model('books', BookSchema, 'books')
})

const app = express()
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
const port = 3000

app.get('/', (req, res) => res.send('Hello World!'))
Author.mount('/authors', app)
Books.mount('/books', app)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.statusCode || 500).send(err)
})

mongoose.connect('mongodb://localhost:27017/bookshop', {})
  .then(() => {
    console.log('Connection to Mongodb Established')
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
  })
  .catch(error => {
    console.log('Unable to establish connection to Mongodb', error)
  })
