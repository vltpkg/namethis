import fetch from 'node-fetch'
async function exists(pkg) {
  const encoded = encodeURIComponent(pkg)
  async function isPublic () {
    const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`)
    return (res.status === 200)
  }
  async function isPrivate () {
    const res = await fetch(`https://www.npmjs.com/package/${encoded}/visibility`)
    const data = await res.json()
    return (data && !data.public)
  }
  return (await isPublic()) ? true : await isPrivate()
}

export default exists
