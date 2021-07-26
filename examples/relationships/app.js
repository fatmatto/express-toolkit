const express = require('express')
const bodyParser = require('body-parser')
const Controller = require('../../src/controller')
const buildRouter = require('../../src/router')
const mongoose = require('mongoose')

const authorSchema = new mongoose.Schema({
  uuid: String,
  name: String
})
const AuthorModel = mongoose.model('author', authorSchema, 'author')

const authorController = new Controller({
  id: 'uuid',
  model: AuthorModel
})

const commentSchema = new mongoose.Schema({
  uuid: String,
  text: String,
  time: Date
})
const CommentModel = mongoose.model('comment', commentSchema, 'comment')

const commentController = new Controller({
  id: 'uuid',
  model: CommentModel
})

const articleSchema = new mongoose.Schema({
  uuid: String,
  name: String,
  authorId: String
})
const ArticleModel = mongoose.model('article', articleSchema, 'article')

const articleController = new Controller({
  id: 'uuid',
  model: ArticleModel,
  relationships: [
    {
      name: 'authors',
      model: AuthorModel,
      innerField: 'authorId',
      outerField: 'uuid',
      alwaysInclude: true
    },
    {
      model: CommentModel,
      name: 'comments',
      innerField: 'uuid',
      outerField: 'articleId',
      alwaysInclude: false // false by default
    }
  ]
})

const articleRouter = buildRouter({ controller: articleController })
const authorRouter = buildRouter({ controller: authorController })
const commentRouter = buildRouter({ controller: commentController })

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const port = 3000

app.use('/articles', articleRouter)
app.use('/authors', authorRouter)
app.use('/comments', commentRouter)

mongoose.connect('mongodb://localhost:27018/blog', {})
  .then(() => {
    console.log('Connection to Mongodb Established')
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
  })
  .catch(error => {
    console.log('Unable to establish connection to Mongodb', error)
  })
