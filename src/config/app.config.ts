/*
 * ============================================================
 *  CONFIGURAÇÃO DO SEU HUB
 *  Troque os valores abaixo pelos do seu projeto. Tudo o que é
 *  "marca" (nome, textos, PDF, e-mails, PWA) sai daqui.
 *  Cores e fontes ficam em src/app/globals.css (design system).
 * ============================================================
 */

export const appConfig = {
  /* Nome completo e curto (aparece na aba do navegador, no PWA e no PDF) */
  name: "Hub de Agentes",
  shortName: "Hub",

  /* Uma frase: o que o hub faz e para quem */
  description: "Agentes de IA treinados no nosso método, disponíveis 24 horas.",

  /*
   * Contexto usado pelos agentes e pelo classificador de temas.
   * Ex.: "um curso de confeitaria", "uma mentoria de vendas", "uma comunidade de fotógrafos".
   */
  context: "um programa de formação online",

  /*
   * Como você chama quem usa a plataforma.
   * gender: "m" (aluno, membro, cliente) ou "f" (aluna, mentorada).
   */
  audience: {
    singular: "aluno",
    plural: "alunos",
    gender: "m" as "m" | "f",
  },

  /* Cores do navegador/PWA (barra do celular). Use as mesmas do seu design system. */
  themeColor: { light: "#ffffff", dark: "#212121" },

  /* Fuso e idioma usados em datas, limites diários e no "Data de hoje" dos agentes */
  timeZone: "America/Sao_Paulo",
  timeZoneLabel: "horário de Brasília",
  locale: "pt-BR",

  /* E-mail que aparece na página de acesso bloqueado */
  supportEmail: "",
} as const

export type AppConfig = typeof appConfig
