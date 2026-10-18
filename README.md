# Portfólio pessoal

Site de portfólio responsivo com uma área privada para publicar, editar e excluir projetos. O conteúdo dos projetos fica no Supabase; apenas a conta proprietária pode alterá-lo. Não coloque a senha da sua conta nem uma chave `service_role` no site.

## Personalizar seu perfil

Edite `config.js`:

- `PROFILE.name`: seu nome.
- `PROFILE.description`: uma breve apresentação.
- `PROFILE.email`: seu e-mail para contato.
- `PROFILE.whatsapp`: link público do WhatsApp, começando com `https://`.
- `PROFILE.discord`: link de convite ou perfil do Discord, começando com `https://`. O atalho fica oculto enquanto estiver vazio.
- `PROFILE.instagram` e `PROFILE.tiktok`: links completos dos seus perfis, começando com `https://`.
- `OWNER_EMAIL`: e-mail da conta proprietária autorizada.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `OWNER_USER_ID`: conexão pública e UID proprietário já configurados neste projeto.

Os atalhos de contato e redes sociais sem endereço ficam ocultos.

## Ativar o painel privado de projetos

O site estático não guarda os projetos apenas no navegador: ele usa o plano gratuito do Supabase para que os projetos publicados apareçam para todos os visitantes. A chave `anon` do Supabase é pública por definição; as políticas de segurança do banco, e não um segredo no JavaScript, impedem que visitantes alterem os projetos.

1. No projeto Supabase já configurado em `config.js`, mantenha habilitado **Authentication → Settings → User Signups** para que visitantes possam criar contas opcionais. O portfólio continua público e não exige login para visualização. Contas comuns não recebem acesso de gerenciamento.
2. Em **Authentication → Users**, confirme que o usuário proprietário tem o e-mail definido em `OWNER_EMAIL` e que o UID dele corresponde a `OWNER_USER_ID` em `config.js`. Use uma senha forte e exclusiva; não reutilize credenciais que já tenham sido compartilhadas.
3. Abra o **SQL Editor** e execute `supabase/schema.sql`. Esse passo cria a tabela `public.projects` e suas políticas RLS. Elas exigem tanto o UID proprietário quanto o e-mail `OWNER_EMAIL` para inserir, editar ou excluir; outras contas continuam sem permissão.
4. Se o login exigir confirmação de e-mail, adicione os endereços do site em **Authentication → URL Configuration → Redirect URLs**.
5. Abra `index.html` por um servidor local para testar. Como os arquivos usam módulos JavaScript, não teste clicando duas vezes no HTML. Por exemplo, se tiver Python instalado, rode `py -m http.server 8000` nesta pasta e acesse `http://localhost:8000`.
6. Clique em **Área do proprietário**, entre com a conta proprietária e gerencie seus projetos. O e-mail sozinho não concede permissões: a autorização é baseada no UID da conta e nas políticas RLS do Supabase.

Para o cadastro opcional funcionar, mantenha os cadastros de usuários habilitados no Supabase Auth. O site não exige login para visualizar projetos e não oferece a contas comuns qualquer permissão de publicação.

O campo de imagem aceita um link público de imagem iniciado por `https://`; o campo de link do projeto também é opcional. A chave publicável e o User UID não são senhas. Com cadastros públicos habilitados, é essencial manter as políticas RLS do `schema.sql` aplicadas: apenas o UID proprietário com o e-mail permitido pode alterar projetos.

## Publicar grátis, sem comprar domínio

Uma opção simples para este site é o **GitHub Pages**, que publica páginas estáticas gratuitamente em um endereço `seu-usuario.github.io/nome-do-repositorio`:

1. Crie uma conta no [GitHub](https://github.com/) e um repositório público novo.
2. Envie os arquivos deste projeto e mantenha `index.html` na raiz do repositório.
3. No repositório, abra **Settings → Pages**. Em **Build and deployment**, selecione **Deploy from a branch**, escolha `main` e `/ (root)`, e salve.
4. Aguarde a publicação indicada nessa página e abra o endereço `https://seu-usuario.github.io/nome-do-repositorio`.

Não é necessário comprar um domínio. O endereço gratuito do GitHub Pages funciona com o Supabase, que continua guardando os projetos. Depois de alterar o site, envie as alterações ao repositório para publicar a nova versão. Não publique senhas; a chave `anon` é apropriada para uso público somente com as políticas de segurança acima ativas.
