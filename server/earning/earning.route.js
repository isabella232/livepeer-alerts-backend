const express = require('express')
const { list } = require('./earning.controller')

const router = express.Router() // eslint-disable-line new-cap

router
  .route('/')
  /** GET /api/earning - Get list of earnings */
  .get(list)

module.exports = router
