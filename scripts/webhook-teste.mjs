/*
 * TESTA O WEBHOOK DE PAGAMENTO NO SEU COMPUTADOR
 *
 *   npm run webhook:teste -- liberar voce+teste@gmail.com   simula uma compra
 *   npm run webhook:teste -- revogar voce+teste@gmail.com   simula reembolso/cancelamento
 *
 * Use um e-mail SEU (o "+teste" cria um endereço extra no Gmail): o convite
 * de verdade chega nele. Precisa do app rodando (npm run dev) e de
 * HUBLA_WEBHOOK_TOKEN no .env.local.
 */
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { c, fail, loadEnv } from "./lib/env.mjs"

loadEnv()
const action = process.argv[2] === "revogar" ? "revogar" : "liberar"
const email = process.argv[3]
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Informe um e-mail seu para o teste.", "Ex.: npm run webhook:teste -- liberar voce+teste@gmail.com")
}
const token = process.env.HUBLA_WEBHOOK_TOKEN
if (!token) fail("HUBLA_WEBHOOK_TOKEN não está no .env.local.", `Gere com: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" e cole lá. Veja docs/08-pagamento.md.`)

const base = (process.env.WEBHOOK_TEST_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "")
const url = `${base}/api/webhooks/hubla`
const payload = JSON.parse(readFileSync(`scripts/fixtures/hubla-${action}.json`, "utf8"))
payload.event.user.email = email
const body = JSON.stringify(payload)

console.log(c.step(`Enviando aviso de "${action}" para ${url}`))
let res
try {
  res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hubla-token": token, "x-hubla-idempotency": randomUUID(), "x-hubla-sandbox": "true" },
    body,
  })
} catch {
  fail(`Não consegui conectar em ${base}.`, "O app está rodando? Abra outro terminal e rode `npm run dev`.")
}
const text = await res.text()
if (res.ok) console.log(c.ok(`${res.status} ${text}`))
else fail(`${res.status} ${text}`, res.status === 401 ? "O token do .env.local não bate com o que o app carregou. Reinicie o `npm run dev`." : undefined)
console.log(c.dim(`Confira em /admin/usuarios: ${email} deve aparecer ${action === "liberar" ? "com acesso liberado (e o convite chega no e-mail)" : "bloqueado"}.`))
