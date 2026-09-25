import { appConfig } from "./app.config"

/*
 * TEXTOS SOBRE O PÚBLICO
 * Monta "aluno/aluna/membro/cliente" a partir de app.config.ts, com o
 * gênero certo. Use nos textos em vez de escrever o termo fixo:
 *   `Adicionar ${pub.um}`        -> "Adicionar aluno"
 *   `${pub.Os} ${pub.varios}`    -> "Os alunos"
 *   `Oculto ${pub.dos} ${pub.varios}` -> "Oculto dos alunos"
 *   g("bloqueado", "bloqueada")  -> conforme o gênero
 */

const { singular, plural, gender } = appConfig.audience
const f = gender === "f"
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const g = (masc: string, fem: string) => (f ? fem : masc)

export const pub = {
  um: singular,
  Um: cap(singular),
  varios: plural,
  Varios: cap(plural),
  o: g("o", "a"),
  O: g("O", "A"),
  os: g("os", "as"),
  Os: g("Os", "As"),
  do: g("do", "da"),
  dos: g("dos", "das"),
  ao: g("ao", "à"),
  aos: g("aos", "às"),
  nenhum: g("Nenhum", "Nenhuma"),
  ele: g("ele", "ela"),
  removido: g("removido", "removida"),
}
