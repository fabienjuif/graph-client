# @fabienjuif/graph-client
> light zero dependency graphql-client, supporting cache and SSR

![CircleCI](https://img.shields.io/circleci/build/github/fabienjuif/graph-client.svg) ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@fabienjuif/graph-client.svg) ![npm (scoped)](https://img.shields.io/npm/v/@fabienjuif/graph-client.svg) ![GitHub](https://img.shields.io/github/license/fabienjuif/graph-client.svg) ![Coveralls github](https://img.shields.io/coveralls/github/fabienjuif/graph-client.svg)

## Features
- Light (bundlesize)
- Supports browser and Node (SSR compatible)
- Supports cache (via third party library, or your own code)
  * cache is not used for mutations
  * cache can be disabled per request with `noCache: true` option

## Install
`npm install --save @fabienjuif/graph-client`

## API
`import createClient from '@fabienjuif/graph-client'`
- `createClient(options: object): Client`: creates and returns a new graphql client
  * `options.url`: **(required)**, the graphql endpoint to query
  * `options.cache`: **(optional, default = undefined)**, the cache implementation to use, it must implement `set(key: string, value: object)` and `get(key: string): object` to be compatible. You can use a `Map` or `lru` package for example.
  * `options.token`: **(optional, default = undefined)** will be used to add an `authorization` header, can be:
    - a ̀`string`: in which cache it will the client will add `Bearer ` in front of it
    - a `function`:
        * if the function returns a `Promise`, the client will wait the promise to resolve, then add `Bearer ` before the returned value. **Attention**, your query will not be send to your graphql API until the promise is resolved!
        * in other cases, the `Bearer ` is added to the returned value
  * `options.logger`: **(optional, default = console)**, the logger to user, it can implement `logger.trace(value: any)` or `logger('trace', value: any)` and will be used to log errors if found
  * `options.headers`: **(optional; default = {})**, the headers to set to http requests

`const graphql = createClient(**options**)`
- `graphql.setHeaders(param: function|object)`:
  * if param is a `function` it will be called with the previous headers and the returned value will be used as new headers
  * in other cases param will be used as new headers
- `graphql(query: string, variables: object, options: object): Promise`: will query your endpoint and returns the `data` part
  * if cache is set it will be used, and if an entry is found it will be returned without calling the API
  * if the `query` is a mutation, the cache will not be used
  * if `options.noCache` is set to `true` the cache, even if it exists, will not be used

## Usage / Examples
### Minimum
This is minimal informations you have to give to use this lib.
In this case, the client does not use cache.

```js
import createClient from '@fabienjuif/graph-client'

const graphql = createClient({
  url: 'https://my-domain/graphql',
})

const QUERY = `
query GetUser($id: String!) {
  user (id: $id) {
    id
    name
    email
  }
}
`

graphql(QUERY, { id: '2' })
  .then(data => console.log(data))
```

### LRU cache
In this example, the client will use a cache from an external library (here `lru`).

```js
import LRU from 'lru'
import createClient from '@fabienjuif/graph-client'

const graphql = createClient({
  url: 'http://my-domain.com/graphql'
  cache: new LRU(100), // max 100 items
})

const QUERY = `
query getUser($id: String!) {
  user(id: $id) {
    id
    name
    email
  }
}
`
const run = async () => {
  // first call will set the result into the cache
  // the cache key is a composition of your query and variables
  // both should be serializable
  const { user } = await graphql(QUERY, { id: '2' })
  console.log(user)

  // second call will use cache instead of quering the database
  const { user: user2 } = await graphql(QUERY, { id: '2' })
  console.log(user2)

  // third call will call your endpoint because variables are differents
  // a new entry will be added to the cache
  const { user: user3 } = await graphql(QUERY, { id: '3' })
  console.log(user3)
}
run()
```

### Map cache
In this example, the client will use a javascript `Map` as a cache.

```js
import createClient from '@fabienjuif/graph-client'

const graphql = createClient({
  url: 'http://my-domain.com/graphql'
  cache: new Map(),
})

const QUERY = `
query getUser($id: String!) {
  user(id: $id) {
    id
    name
    email
  }
}
`
const run = async () => {
  // first call will set the result into the cache
  // the cache key is a composition of your query and variables
  // both should be serializable
  const { user } = await graphql(QUERY, { id: '2' })
  console.log(user)

  // second call will use cache instead of quering the database
  const { user: user2 } = await graphql(QUERY, { id: '2' })
  console.log(user2)

  // third call will call your endpoint because variables are differents
  // a new entry will be added to the cache
  const { user: user3 } = await graphql(QUERY, { id: '3' })
  console.log(user3)
}
run()
```

### Disable cache for specific queries
In this example cache is set from a javascript `Map`.
The cache will not be used for one of the request, even if the cache is set and the query is a graphql query (not a mutation).

```js
import createClient from '@fabienjuif/graph-client'

const graphql = createClient({
  url: 'https://my-domain/graphql',
  cache: new Map(), // use a Javascript map as cache
})

const CACHED_QUERY = `
query GetUser($id: String!) {
  user (id: $id) {
    id
    name
    email
  }
}
`

// this request will be cached
graphql(CACHED_QUERY, { id: '2' })
  .then(data => console.log(data))

const QUERY = `
query GetTopics($max: Int!) {
  topics (max: $max) {
    id
    title
  }
}
`

// this request will NOT be cached because we ask not to use it in request scope
// even if the cache is specified in the factory
graphql(QUERY, { max: 10 }, { noCache: true })
  .then(data => console.log(data))
```

### Set a token
In this example the token is retrieved from the localStorage for each request.
If the token does not exists then the `Authorization` header will not be set

```js
import createClient from '@fabienjuif/graph-client'

const getToken = () => localStorage.getItem('token')

const graphql = createClient({
  url: 'https://my-domain/graphql',
  token: getToken, // token can also be a string, or a function that returns a promise
})

const run = async () => {
  // set a token
  localStorage.setItem('token', 'my-token')

  // first call the Authorization header is set:
  //  - Authorization: Bearer my-token
  const { user } = await graphql(QUERY, { id: '2' })
  console.log(user)

  // remove the token
  localStorage.removeItem('token')

  // second call the Authorization header is not set
  const { user: user2 } = await graphql(QUERY, { id: '2' })
  console.log(user2)
}
run()
```
