# 0003 — Tabela Dedicada para Contatos Pastorais (`pastoral_contacts`)

## Contexto e Decisão
Em vez de adicionar colunas de contato de cuidado diretamente na tabela compartilhada `profiles` (que armazena estado de leitura bíblica do Bíblia Vive), decidimos criar a tabela dedicada `pastoral_contacts` (`id`, `user_id`, `name`, `email`, `role`, `status`, `token`, `verified_at`, `revoked_at`, `created_at`). A tabela impõe no máximo um contato em estado `active` por Leitor por meio de índice parcial único.

## Motivação
A tabela dedicada isola as políticas de segurança (RLS) do Atalaia, mantém a tabela `profiles` limpa de dados pastorais sensíveis e preserva a integridade referencial dos alertas enviados no passado (`pastoral_alerts.contact_id`) caso o Leitor substitua ou revogue um contato.
