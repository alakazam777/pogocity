# Intégration Discord

Pour activer la connexion avec Discord, vous devez créer une application Discord et configurer les identifiants.

## 1. Créer une Application Discord

1. Allez sur le [Portail Développeur Discord](https://discord.com/developers/applications).
2. Cliquez sur **"New Application"**.
3. Donnez un nom à votre application (ex: "PogoPoitiers").
4. Allez dans l'onglet **"OAuth2"**.
5. Notez le **Client ID**.
6. Cliquez sur **"Reset Secret"** pour générer un **Client Secret**. Notez-le.

## 2. Configurer les Redirections

1. Dans l'onglet **"OAuth2"**, ajoutez une **Redirect URI**.
2. Pour le développement local, ajoutez : `http://localhost:3000/api/auth/callback/discord`
3. Pour la production, ajoutez : `https://votre-domaine.fr/api/auth/callback/discord`

## 3. Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env.local` :

```env
DISCORD_CLIENT_ID=1445799441436250194
DISCORD_CLIENT_SECRET=NbB21j_asV0-WjVW0joEyDsmmIMpHHXk
NEXTAUTH_URL=https://pogopoitiers.fr
NEXTAUTH_SECRET=hJ8/s9L+x3K1mN5pQ2rT4vW6bZ0yX7cE
```

## 4. Implémentation (NextAuth.js)

Le projet est prêt à être configuré avec `next-auth`.

1. Installez next-auth : `npm install next-auth`
2. Créez le fichier `src/app/api/auth/[...nextauth]/route.js`.
3. Configurez le provider Discord.

### Exemple de configuration :

```javascript
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Ajoutez l'ID Discord à la session si besoin
      session.user.id = token.sub;
      return session;
    }
  }
})

export { handler as GET, handler as POST }
```

## 5. Utilisation

- Utilisez `signIn('discord')` pour connecter l'utilisateur.
- Utilisez `useSession()` pour vérifier l'état de connexion.
- Pour lier le compte Discord au profil Dresseur, vous devrez créer une API qui associe l'ID Discord de la session à l'utilisateur dans `pokemon_users.json`.
