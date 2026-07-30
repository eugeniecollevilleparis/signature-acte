# SIGNATURE — signatureacte.com

Site de l'événement **SIGNATURE No. 01** (26–27 septembre 2026, Château Laffitte
Carcasset). Astro, déployé sur Vercel.

Les pages restent statiques. Seules les routes `/api/*` tournent côté serveur,
sur une fonction Vercel.

---

## Mise en service — à faire une fois

Sans ces trois étapes, le formulaire de réservation renverra une erreur.

### 1. Créer un mot de passe d'application Google

Les emails partent depuis `signatureacte@gmail.com`. Google refuse le mot de
passe habituel du compte pour ce genre d'envoi : il faut un mot de passe
d'application dédié.

1. Activer la validation en deux étapes sur le compte Google, si ce n'est pas
   déjà fait : <https://myaccount.google.com/security>
2. Créer le mot de passe : <https://myaccount.google.com/apppasswords>
3. Garder les 16 caractères affichés — ils ne seront plus jamais réaffichés.

### 2. Générer une clé de signature

Elle sert à signer les liens de confirmation et les QR codes, pour que
personne ne puisse en fabriquer. Dans un terminal :

```
openssl rand -base64 32
```

### 3. Renseigner les variables sur Vercel

Projet → **Settings** → **Environment Variables**. À ajouter pour les trois
environnements (Production, Preview, Development) :

| Variable | Valeur |
| --- | --- |
| `SMTP_USER` | `signatureacte@gmail.com` |
| `SMTP_PASS` | le mot de passe d'application de l'étape 1 |
| `BOOKING_SECRET` | la clé de l'étape 2 |
| `ADMIN_EMAILS` | `signatureacte@gmail.com` (séparer par des virgules pour en ajouter) |
| `PUBLIC_SITE_URL` | `https://signatureacte.com` |
| `REVOLUT_CHECKOUT_URL` | le lien de paiement Revolut |
| `TICKET_ON_BOOKING` | `false` |

Redéployer ensuite pour que les variables soient prises en compte.

`.env.example` liste les mêmes clés pour le développement local (copier en
`.env`, qui n'est jamais versionné).

---

## Le parcours d'une réservation

1. L'invité clique sur **Become Part of Edition No. 01** et remplit le
   formulaire : prénom, nom, email, téléphone, acceptation des CGV.
2. `POST /api/book` valide les champs, puis envoie **deux emails** :
   - à `ADMIN_EMAILS` — les coordonnées de la personne, plus un bouton
     « Paiement reçu — envoyer le billet » ;
   - à l'invité — un email de bienvenue avec sa référence, précisant que le
     billet suivra une fois le paiement confirmé.
3. L'invité est redirigé vers la page de paiement Revolut.
4. Après vérification que l'argent est bien arrivé, un clic sur le bouton de
   l'email ouvre `/api/ticket`, qui envoie à l'invité **son billet avec le QR
   code**, et rappelle le lien vers les CGV.

### Pourquoi cette étape de confirmation manuelle

Un lien de paiement Revolut simple ne prévient pas le site quand quelqu'un a
payé. Sans cette vérification, n'importe qui pourrait remplir le formulaire,
ne jamais payer, et repartir avec un QR code valable.

Pour envoyer le billet immédiatement malgré tout, passer
`TICKET_ON_BOOKING` à `true`. Le billet part alors dès l'envoi du formulaire,
sans attendre le paiement.

Le jour où un **compte Revolut Merchant API** sera disponible, son webhook
pourra appeler `/api/ticket` automatiquement à l'encaissement, et l'étape
manuelle disparaîtra.

### Newsletter

`POST /api/subscribe` prévient `ADMIN_EMAILS` et envoie un email de bienvenue à
la personne inscrite.

Les adresses ne sont stockées nulle part : **la boîte
`signatureacte@gmail.com` est le registre**. Pour constituer la liste de
diffusion, filtrer les emails dont l'objet commence par `Newsletter —`.

---

## Ce qui n'existe pas encore

- **Aucune base de données.** Les réservations n'existent que sous forme
  d'emails. Les liens de confirmation sont autoporteurs : ils contiennent la
  réservation, signée. Rien à sauvegarder, mais aucune liste consultable non
  plus.
- **Aucun contrôle à l'entrée.** Les QR codes sont signés et
  `verifyQrPayload()` (dans `src/lib/booking.ts`) sait vérifier une signature,
  mais il n'existe pas encore d'écran de scan, ni de garde-fou contre un même
  billet présenté deux fois.
- **Aucun décompte des places.** Rien n'empêche de vendre au-delà de la
  capacité.
- **Les CGV comportent des mentions à compléter**, signalées en surbrillance
  sur `/conditions-generales` : identité juridique de l'organisateur et
  médiateur de la consommation. Elles n'ont pas été relues par un juriste.

---

## Développement local

```
npm install
cp .env.example .env      # puis remplir les valeurs
npm run dev
```

Pour tester les emails sans rien envoyer pour de vrai, pointer `SMTP_HOST` sur
un serveur SMTP local et mettre `SMTP_PORT=2525`.

```
npm run build     # vérifie que la fonction Vercel se construit
npx astro check   # typage
```
