/* eslint-env jest */
/* eslint-disable no-console */
const createClient = require('./index')

const consoleImpl = console
beforeEach(() => {
  global.console = consoleImpl
})

it('should throw an error if no fetch implementation available', () => {
  expect(() => createClient())
    .toThrow('You must provide a fetch implementation, either in globalThis, or in options.')
})

it('should throw an error if url is not specified', () => {
  expect(() => createClient({ fetch: jest.fn() }))
    .toThrow('You must provide an API URL (options.url).')
})

it('should query the api and not cache the response', async () => {
  const user = { id: 2, name: 'test' }
  const json = jest.fn(() => Promise.resolve({ data: { user } }))
  const fetch = jest.fn(() => Promise.resolve({ json }))
  const graphql = createClient({
    fetch,
    url: 'http://localhost/graphql',
  })

  const QUERY = `query GetUser($id: String!) {
    user (id: $id) {
      id
      name
    }
  }`
  const res = await graphql(QUERY, { id: '3' })
  expect(res.user).toEqual(user)

  await graphql(QUERY, { id: '3' })
  expect(fetch).toBeCalledTimes(2)
  expect(fetch.mock.calls[0]).toEqual([
    'http://localhost/graphql',
    {
      body: JSON.stringify({ query: QUERY, variables: { id: '3' } }),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
    },
  ])
})

it('should cache results', async () => {
  const fetch = jest.fn((_, options) => Promise.resolve({
    json: () => {
      const { variables } = JSON.parse(options.body)
      return Promise.resolve({
        data: {
          user: {
            id: variables.id,
            name: 'test',
          },
        },
      })
    },
  }))
  const cache = new Map()
  const graphql = createClient({
    fetch,
    url: 'http://localhost/graphql',
    cache,
  })

  const QUERY = `query GetUser($id: String!) {
    user (id: $id) {
      id
      name
    }
  }`
  let res = await graphql(QUERY, { id: '3' })
  expect(res.user).toEqual({ id: '3', name: 'test' })
  res = await graphql(QUERY, { id: '3' })
  expect(res.user).toEqual({ id: '3', name: 'test' })
  res = await graphql(QUERY, { id: '4' })
  expect(res.user).toEqual({ id: '4', name: 'test' })

  expect(cache.size).toEqual(2)
  expect(fetch).toBeCalledTimes(2)
})

it('should handle errors and not cache them', async () => {
  const user = { id: 2, name: 'test' }
  const json = jest.fn()
  const fetch = jest.fn(() => Promise.resolve({ json }))
  const cache = new Map()
  const graphql = createClient({
    fetch,
    url: 'http://localhost/graphql',
    cache,
  })

  const QUERY = `query GetUser($id: String!) {
    user (id: $id) {
      id
      name
    }
  }`

  // mock error
  json.mockResolvedValue({ errors: [{ code: 'mocked-error' }] })
  // mock console
  global.console = {
    trace: jest.fn(),
  }

  // error
  let error = false
  try {
    await graphql(QUERY, { id: '2' })
  } catch (ex) {
    error = true
    expect(ex).toEqual([{ code: 'mocked-error' }])
  }
  expect(error).toBeTruthy()
  expect(cache.size).toEqual(0)
  expect(console.trace).toBeCalledTimes(1)
  expect(console.trace).toHaveBeenCalledWith([{ code: 'mocked-error' }])

  // ok
  json.mockResolvedValue({ data: { user } })
  const res = await graphql(QUERY, { id: '2' })
  expect(res.user).toEqual(user)
  expect(cache.size).toEqual(1)
})

it('should be possible to override the error logger [function]', async () => {
  const logger = jest.fn()
  const graphql = createClient({
    url: 'http://localhost/graphql',
    logger,
    fetch: jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        errors: ['error-code'],
      }),
    }),
  })

  let error = false
  try {
    await graphql('QUERY')
  } catch (ex) {
    error = true
    expect(logger).toHaveBeenCalledWith(
      'error',
      ['error-code'],
    )
  }
  expect(error).toBeTruthy()
})

it('should be possible to override the error logger [object]', async () => {
  const logger = {
    trace: jest.fn(),
  }
  const graphql = createClient({
    url: 'http://localhost/graphql',
    logger,
    fetch: jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        errors: ['error-code'],
      }),
    }),
  })

  let error = false
  try {
    await graphql('QUERY')
  } catch (ex) {
    error = true
    expect(logger.trace).toHaveBeenCalledWith(
      ['error-code'],
    )
  }
  expect(error).toBeTruthy()
})


it('should not use cache for mutations', async () => {
  const json = jest.fn(() => Promise.resolve({ data: { addUser: { id: '3' } } }))
  const fetch = jest.fn(() => Promise.resolve({ json }))
  const cache = new Map()
  const graphql = createClient({
    fetch,
    url: 'http://localhost/graphql',
  })

  const QUERY = `mutation AddUser ($user: InputUser!) {
    addUser (user: $user) {
      id
    }
  }`
  const res = await graphql(QUERY, { id: '3', name: 'test' })
  expect(res.addUser).toEqual({ id: '3' })
  expect(cache.size).toEqual(0)
})
