# 12 · Checklist de lançamento

> Marque tudo antes de abrir para o público.

## Configuração
- [ ] `npm run setup:check` todo verde (ou só avisos opcionais)
- [ ] Cadastro público **desligado** no Supabase
- [ ] Site URL e Redirect URLs do Supabase com o domínio de produção
- [ ] E-mails de convite e senha com o nome do seu hub
- [ ] SMTP próprio configurado no Supabase (evita limite de e-mails)
- [ ] `NEXT_PUBLIC_SITE_URL` de produção na Vercel
- [ ] Limites diários ajustados em **Admin > Configurações**
- [ ] Crédito e limite mensal na OpenAI

## Agentes
- [ ] Cada agente passou nos 3 testes (material, lacuna, conflito)
- [ ] Atalhos (perguntas prontas) fazem sentido
- [ ] Temas em `agentes/_topicos.json` refletem o seu material
- [ ] Agente de exemplo removido ou inativo

## Venda
- [ ] Webhook cadastrado na plataforma de pagamento
- [ ] Compra de teste libera e reembolso de teste bloqueia
- [ ] Admin não é bloqueado por reembolso (conferido)

## Experiência
- [ ] Testado em um iPhone e um Android reais
- [ ] Áudio, anexo e "Baixar em PDF" funcionando
- [ ] "Adicionar à tela inicial" com o ícone certo
- [ ] `/setup` responde 404 em produção

## Segurança
- [ ] `npm run check:leaks` sem problemas
- [ ] Repositório privado (se tiver materiais ou dados do cliente)

---

[← Segurança](11-seguranca.md) · [Índice](README.md) · [Problemas comuns →](13-problemas-comuns.md)
