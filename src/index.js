const client = (options = {}) => {
  const {
    cache = undefined,
    url = undefined,
    logger = undefined,
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

  return async (query, variables, queryOptions = {}) => {
    const body = JSON.stringify({ query, variables })
    const {
      noCache = false,
    } = queryOptions

    if (!noCache) {
      const data = cache ? cache.get(body) : undefined
      if (data) return data
    }

    return new Promise((resolve, reject) => {
      fetch(
        url,
        {
          body,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
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
    })
  }
}

module.exports = client
