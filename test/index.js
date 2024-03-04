(async () => {
  const tap = require('tap')
  const exists = require('../index.js')
  tap.equal(await exists('darcyclarke-non-existant-package'), false)
  tap.equal(await exists('@darcyclarke/non-existant-package'), true)
  tap.equal(await exists('@darcyclarke/test'), true)
  tap.equal(await exists('darcy'), true)
})()
