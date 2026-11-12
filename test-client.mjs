// dsh-session-delete-menu — minimal offline harness for the client bundle.
// Loads lib/client.js the way the web ModuleLoader does, then exercises the
// registered context-menu action against a fake ctx (no browser needed).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, 'lib/client.js'), 'utf8')

function loadClientBundle({ confirmAnswer = true } = {}) {
  const calls = { registered: [], alerts: [], fetches: [], refreshed: 0 }
  const window = {
    confirm: () => confirmAnswer,
    alert: (message) => calls.alerts.push(message),
    __ModuleLoader__: { load: (entry) => { calls.entry = entry } },
  }
  const sandbox = {
    window,
    fetch: async (url, init) => {
      calls.fetches.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ ok: true }) }
    },
    console,
    setTimeout,
  }
  vm.runInNewContext(source, sandbox, { filename: 'lib/client.js' })
  assert.ok(calls.entry, 'bundle must call window.__ModuleLoader__.load')
  assert.equal(calls.entry.id, 'dsh-session-delete-menu')
  const exports = calls.entry.factory((name) => {
    throw new Error(`unexpected require(${name})`)
  })
  assert.deepEqual([...exports.inject], ['contextMenus', 'sessions'])
  const ctx = {
    effect: (fn) => fn(),
    contextMenus: { register: (input) => { calls.registered.push(input); return () => {} } },
    sessions: { refresh: async () => { calls.refreshed += 1 } },
  }
  exports.apply(ctx)
  return { calls, exports, ctx }
}

// 1. registration shape
{
  const { calls } = loadClientBundle()
  assert.equal(calls.registered.length, 1)
  const item = calls.registered[0]
  assert.equal(item.target, 'session')
  assert.equal(item.id, 'plugin.sessionDelete')
  assert.equal(item.order, 700)
}
// 2. resolve hides the item without a session id
{
  const { calls } = loadClientBundle()
  const item = calls.registered[0]
  assert.deepEqual([...item.resolve({})], [])
  assert.deepEqual([...item.resolve({ sessionId: '' })], [])
}
// 3. resolve yields the dangerous delete action
{
  const { calls } = loadClientBundle()
  const item = calls.registered[0]
  const actions = [...item.resolve({ sessionId: 'session-x', displayTitle: 'demo' })]
  assert.equal(actions.length, 1)
  const action = actions[0]
  assert.equal(action.label, '删除会话')
  assert.equal(action.danger, true)
  assert.equal(action.separatorBefore, true)
  assert.equal(typeof action.run, 'function')
  assert.equal(action.icon, undefined)
  assert.equal(calls.fetches.length, 0)
}
// 4. confirm -> POST with the right body, then refresh the session list
{
  const { calls } = loadClientBundle({ confirmAnswer: true })
  const item = calls.registered[0]
  item.resolve({ sessionId: 'session-x', displayTitle: 'demo' })[0].run()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(calls.fetches.length, 1)
  assert.equal(calls.fetches[0].url, '/api/mobile-nav.session.delete')
  assert.equal(calls.fetches[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls.fetches[0].init.body), { sessionId: 'session-x' })
  assert.equal(calls.refreshed, 1)
  assert.deepEqual(calls.alerts, [])
}
// 5. cancel -> no request at all
{
  const { calls } = loadClientBundle({ confirmAnswer: false })
  const item = calls.registered[0]
  item.resolve({ sessionId: 'session-x' })[0].run()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(calls.fetches.length, 0)
  assert.equal(calls.refreshed, 0)
  assert.deepEqual(calls.alerts, [])
}
console.log('client bundle harness: 5 checks passed')
