// Screenshot driver: node e2e/look.mjs <port> <route> [w] [h] [out]
import { launch } from './cdp.mjs'
const [port, route, w = '1280', h = '800', out = 'ui-loops/l2/shots/look.png'] = process.argv.slice(2)
const page = await launch(9500 + Math.floor(Math.random() * 40))
try {
  await page.open(`http://localhost:${port}/${route}`, { w: +w, h: +h, scheme: 'dark' })
  await page.shot(out, { full: true })
  const errs = page.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).length
  console.log('shot', out, 'errors', errs, await page.eval('document.title'))
} finally { page.close() }
