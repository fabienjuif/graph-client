# @fabienjuif/graph-client
> light zero dependency graphql-client, supporting cache and SSR

![CircleCI](https://img.shields.io/circleci/build/github/fabienjuif/graph-client.svg) ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@fabienjuif/graph-client.svg) ![npm (scoped)](https://img.shields.io/npm/v/@fabienjuif/graph-client.svg) ![GitHub](https://img.shields.io/github/license/fabienjuif/graph-client.svg)

## Features
- Light (bundlesize)
- Supports browser and Node (SSR compatible)
- Supports cache (via third party library, or your own code)

## Install
`npm install --save @fabienjuif/graph-client`

## Usage
```js
import LRU from 'lru'
import createClient from '@fabienjuif/graph-client'

// 1. create a client
const graphql = createClient({
  // [url]
  // this is your graphql endpoint
  url: 'http://my-domain.com/graphql', // [required]
  // [fetch]
  // you can give your own implementation of fetch, the default one is globalThis.fetch (if found)
  fetch, // [optional, default: globalThis.fetch]
  // [cache]
  // you can omit this option, in which case the client will not use any cache
  // if you give an implementation of cache, it should have these signatures accessibles:
  // - get(key: string): object
  // - set(key: string, value: object): any
  cache: new LRU(100), // [optional, default: undefined]
  // [logger]
  // you can give a logger implementation, in which case it will be called to trace unexpected errors
  // if you give a logger implementation it should respect one of this implementation:
  // - logger(type: string, message: any)
  // - or logger.trace(message: any)
  logger: console, // [optional, default: console]
})

// 2. calls your request
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
```

## Usage minimum options
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
