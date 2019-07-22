const client = (options = {}) => {
  const {
    cache = undefined,
    url = undefined,
    logger = undefined,
    token = undefined,
    headers = {},
  } = options

  let {
    fetch,
  } = options

  if (fetch === undefined) {
    if (globalThis.fetch) fetch = globalThis.fetch // eslint-disable-line prefer-destructuring
    throw new Error('You must provide a fetch implementation, either in globalThis, or in options.')
  }

  if (url === undefined) {
    throw new Error('You must provide an API URL (options.url).')
  }

  let innerHeaders = { ...headers }
  const setHeaders = (callback) => {
    if (typeof callback === 'function') {
      innerHeaders = callback(innerHeaders)
    } else {
      innerHeaders = callback
    }
  }

  const graphql = async (query, variables, queryOptions = {}) => {
    const body = JSON.stringify({ query, variables })
    const {
      noCache = false,
    } = queryOptions

    if (!noCache) {
      const data = cache ? cache.get(body) : undefined
      if (data) return data
    }

    return new Promise((resolve, reject) => {
      const call = ({ token: innerToken = undefined } = {}) => {
        const callHeaders = {
          'content-type': 'application/json',
          ...innerHeaders,
        }

        if (innerToken) callHeaders.authorization = `Bearer ${innerToken}`

        return fetch(
          url,
          {
            body,
            method: 'POST',
            headers: callHeaders,
          },
        )
          .then(res => res.json())
          .then((res) => {
            if (res.errors) {
              if (logger && logger.trace) logger.trace(res.errors)
              else if (logger && typeof logger === 'function') logger('error', res.errors)
              else console.trace(res.errors) // eslint-disable-line no-console

              reject(res.errors)
              return
            }

            if (!noCache && cache && !query.trim().startsWith('mutation')) cache.set(body, res.data)
            resolve(res.data)
          })
      }

      if (token) {
        if (typeof token === 'function') {
          const innerToken = token()
          if (innerToken.then) {
            return innerToken.then(newToken => call({ token: newToken }))
          }
          return call({ token: innerToken })
        }
        return call({ token })
      }

      return call()
    })
  }

  return Object.assign(
    graphql,
    { setHeaders },
  )
}

module.exports = client
