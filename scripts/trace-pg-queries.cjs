const pg = require('pg')

const originalQuery = pg.Pool.prototype.query
let sequence = 0

function label(args) {
  const input = typeof args[0] === 'string' ? args[0] : args[0]?.text
  const sql = String(input ?? '').replace(/\s+/g, ' ').trim()
  const operation = sql.split(' ', 1)[0]?.toUpperCase() || 'QUERY'
  const relation = sql.match(/\b(?:from|into|update)\s+"?([a-zA-Z0-9_]+)"?/i)?.[1] || 'unknown'
  return `${operation}:${relation}`
}

pg.Pool.prototype.query = function tracedQuery(...args) {
  const id = ++sequence
  const started = performance.now()
  const queryLabel = label(args)
  const callbackIndex = typeof args.at(-1) === 'function' ? args.length - 1 : -1

  if (callbackIndex >= 0) {
    const callback = args[callbackIndex]
    args[callbackIndex] = function tracedCallback(error, result) {
      console.log(`[db-trace] ${id} ${queryLabel} ${(performance.now() - started).toFixed(1)}ms ${error ? 'error' : 'ok'}`)
      return callback(error, result)
    }
    return originalQuery.apply(this, args)
  }

  const result = originalQuery.apply(this, args)
  if (!result || typeof result.then !== 'function') return result
  return result.then(
    (value) => {
      console.log(`[db-trace] ${id} ${queryLabel} ${(performance.now() - started).toFixed(1)}ms ok`)
      return value
    },
    (error) => {
      console.log(`[db-trace] ${id} ${queryLabel} ${(performance.now() - started).toFixed(1)}ms error`)
      throw error
    },
  )
}
