# 🎉 Bolão · Copa Junina Grupo W3G

Sistema de bolão para o jogo **Escócia × Brasil** no evento Copa Junina. Os corretores
fazem o palpite pelo celular; você acompanha tudo num painel, com os palpites iguais
agrupados juntos. Não há cobrança de entrada — é só confirmar o palpite, e quem acertar
o placar leva o prêmio (revelado na hora).

---

## O que cada pessoa vê

### 📱 Tela do corretor — `/` (página inicial)
O corretor abre o link no celular e preenche:
- **Nome completo**
- **Telefone / WhatsApp**
- **Supervisor**
- **Placar** (Escócia × Brasil, com os escudos, usando os botões + e −)

Ao confirmar, recebe um comprovante na tela. Sem pagamento — só participação.

### 🔐 Seu painel — `/admin.html`
Protegido por senha. Foco total nos resultados:
- **Palpites agrupados por placar** — cada placar mostra só os corretores que escolheram
  aquele resultado (nome, supervisor e telefone com link direto pro WhatsApp).
- O placar **mais apostado** aparece primeiro, com barra de proporção.
- Total de palpites, número de placares diferentes e status das apostas.
- Botão para **abrir/fechar as apostas** nas configurações.
- **Baixar lista completa (CSV)** com todos os palpites, pra abrir no Excel.

> 🔑 **Senha padrão do painel: `w3g2026`** — troque antes de publicar (veja abaixo).

---

## ▶️ Como rodar no seu computador (teste rápido)

Precisa do [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
npm install
npm start
```

Depois abra no navegador:
- Corretores: **http://localhost:3000**
- Seu painel: **http://localhost:3000/admin.html**

---

## ☁️ Como colocar no ar (para os corretores acessarem)

Para centenas de pessoas acessarem pelo celular, publique em um serviço de hospedagem.

### Opção recomendada — Render.com (grátis)
1. Crie uma conta em [render.com](https://render.com).
2. Suba esta pasta para um repositório no GitHub.
3. No Render: **New + → Web Service** → conecte o repositório.
4. Ele detecta o `render.yaml` automaticamente. Em **Environment**, defina:
   - `ADMIN_PASSWORD` = a senha que você quiser para o painel.
5. Clique em **Deploy**. Em ~2 minutos você recebe um link público.

> ⚠️ **Sobre o plano gratuito do Render:** ele não tem disco persistente pago, então
> **não defina a variável `DB_PATH`** — deixe o sistema usar o caminho padrão. Atenção:
> no plano free, o servidor pode reiniciar de tempos em tempos, e quando isso acontece o
> banco de dados é reiniciado também (os palpites são perdidos). Por isso, é fundamental
> usar o botão **"Apagar todos os palpites"** para limpar testes antes do evento, e no
> dia do evento evitar ficar muito tempo sem nenhum acesso (o "sono" por inatividade pode
> levar a uma reinicialização). Se quiser dados 100% permanentes mesmo com reinícios,
> é necessário um plano pago do Render com disco.

### Outras opções
- **Railway.app** — detecta o `Procfile`/`Dockerfile` e publica em poucos cliques.
- **Fly.io** ou qualquer serviço que rode Docker — use o `Dockerfile` incluído.

---

## 🔧 Configuração (variáveis de ambiente)

| Variável         | Para que serve                                  | Padrão        |
|------------------|-------------------------------------------------|---------------|
| `ADMIN_PASSWORD` | Senha do painel administrativo                  | `w3g2026`     |
| `PORT`           | Porta do servidor                               | `3000`        |
| `DB_PATH`        | (deixe em branco no plano free) Caminho do banco de dados | `./bolao.db`  |

O time adversário, a bandeira e abrir/fechar as apostas você ajusta direto pelo painel.

---

## 💡 Dicas para o evento
- Gere um **QR Code** apontando para o link público e projete no telão — os corretores
  escaneiam e palpitam na hora.
- Deixe as apostas abertas até o início do jogo; depois é só **fechar** no painel.
- No fim do jogo, abra o painel e veja quem acertou o placar para entregar o prêmio.

---

Feito com tema da Copa Junina 🇧🇷 · Grupo W3G
