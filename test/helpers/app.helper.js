function makeApp () {
  const express = require('express')

  const app = express()

  app.get('/', (req, res) => res.sendStatus(200))

  return app
}

module.exports = {
  makeApp
}
