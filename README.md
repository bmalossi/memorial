# Memorial — App Mobile

Aplicativo de Memórias Espirituais com Inteligência Bíblica.  
Companion app do [Bíblia Vive](https://bibliavive.com.br) — conta Supabase compartilhada.

## Stack

- **React Native** + **Expo** (managed workflow)
- **TypeScript** — type-safe em todo o projeto
- **React Navigation** v6 — navegação nativa
- **Supabase** — auth e banco de dados (mesma conta do Bíblia Vive)
- **Gemini API** — análise de conexões bíblicas por registro

## Como rodar

### 1. Instalar dependências

```bash
cd memorial-app
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz de `memorial-app/`:

```env
EXPO_PUBLIC_SUPABASE_URL=<copie do projeto Bíblia Vive>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<copie do projeto Bíblia Vive>
EXPO_PUBLIC_GEMINI_API_KEY=<sua chave Gemini API>
```

As credenciais do Supabase estão no arquivo `.env` do projeto `biblia-vive-leitura-main`.

### 3. Rodar o app

```bash
# Com Expo Go (mais rápido para desenvolvimento)
npx expo start

# Android (emulador ou device físico)
npx expo run:android

# iOS (apenas macOS)
npx expo run:ios
```

### 4. Escanear o QR Code

Com o app **Expo Go** no celular, escaneie o QR Code que aparece no terminal.

## Estrutura do projeto

```
memorial-app/
├── assets/
│   └── images/
│       ├── logo.png            # Logotipo fundo transparente
│       └── logo-full.png       # Logotipo completo
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   └── LoginScreen.tsx    ✅ Concluída
│   │   └── main/
│   │       ├── LinhasagradaScreen.tsx  🔜 Próxima
│   │       ├── DetalheMarcoScreen.tsx  🔜
│   │       ├── BibliaScreen.tsx        🔜
│   │       └── PerfilScreen.tsx        🔜
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx       ✅ Concluído
│   │   │   └── InputField.tsx   ✅ Concluído
│   │   └── memorial/
│   │       ├── MemorialCard.tsx        🔜
│   │       ├── LinhasagradaAxis.tsx    🔜
│   │       └── NovoRegistroSheet.tsx   🔜
│   ├── navigation/
│   │   └── RootNavigator.tsx    ✅ Concluído
│   ├── lib/
│   │   └── supabase.ts          ✅ Concluído
│   └── theme/
│       ├── tokens.ts            ✅ Concluído
│       └── index.ts             ✅ Concluído
├── App.tsx                      ✅ Concluído
└── app.json                     ✅ Configurado
```

## Telas MVP

| Tela | Status |
|------|--------|
| Login | ✅ Concluída |
| Linha Sagrada (Home) | 🔜 Próxima |
| Novo Registro (Bottom Sheet) | 🔜 |
| Detalhe do Marco + Conexões Bíblicas | 🔜 |
| Bíblia (Reader) | 🔜 |
| Perfil / Configurações | 🔜 |
