# Contribuindo

Obrigado por ajudar a melhorar o template!

1. Abra uma issue descrevendo o problema ou a ideia (com a saída do `npm run diagnostico`, que não tem segredos).
2. Faça um fork, crie uma branch e mantenha a mudança pequena.
3. Antes do PR, rode:
   ```bash
   npm run lint
   ```
   ```bash
   npx tsc --noEmit
   ```
   ```bash
   npm run check:leaks
   ```
4. Siga `AGENTS.md` e `docs/11-seguranca.md` (segredos só no servidor, RLS, migrations novas em vez de editar as antigas).
5. Textos em português do Brasil, sem travessão na interface.

Nunca inclua chaves, `.env.local`, materiais de clientes ou dados pessoais em issues e PRs.
