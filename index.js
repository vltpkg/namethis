async function exists(pkg) {
  const fetch = require('node-fetch')
  const encoded = encodeURIComponent(pkg)
  const registry = 'https://registry.npmjs.org'
  async function isScope () {
    const scope = pkg.split('/').shift().replace('@', '')
    const res = await fetch(`${registry}/-/org/${scope}/user`)
    const data = await res.json()
    return !data.error
  }
  async function isPublic () {
    const res = await fetch(`${registry}/${encoded}/latest`)
    return res.status === 200
  }
  return !!(await isPublic() || await isScope())
}

module.exports = exists
