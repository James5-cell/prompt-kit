## Admin-only write access (Firestore + Google Login)

This project is configured so that:

- Anyone can **read** prompts from Firestore.
- Only users with Firebase Auth **Custom Claims** `admin: true` can **create / update / delete** prompts.

### 1) Enable Google Sign-in (Firebase Console)

1. Open Firebase Console for the project in `.firebaserc` (default: `prompt-kit-7a67e`).
2. Go to **Build → Authentication → Sign-in method**.
3. Enable **Google** provider and save.

### 2) Deploy Firestore Rules

Option A (recommended, reproducible):

```bash
firebase deploy --only firestore:rules
```

Option B (quick):

- Firebase Console → **Build → Firestore Database → Rules**
- Paste the content of `firestore.rules`
- Click **Publish**

### 3) Set `admin: true` Custom Claim

You must set the claim from a trusted environment (server or local script). Do not do this from the browser.

#### Option A: Local Node script (one-time)

1. Create a Firebase **Service Account** key:
   - Firebase Console → Project settings → Service accounts
   - Generate new private key (download JSON)
2. Keep the JSON file **private** (do not commit to GitHub).
3. Install Admin SDK (once):

```bash
npm install firebase-admin
```

4. Run this one-liner to set admin claim (replace placeholders):

```bash
node -e "import('firebase-admin').then(async ({default:admin})=>{admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.SA_JSON))}); await admin.auth().setCustomUserClaims(process.env.TARGET_UID,{admin:true}); console.log('done'); process.exit(0);}).catch(e=>{console.error(e);process.exit(1);});"
```

Then provide env vars:

```bash
export SA_JSON='(paste the service account JSON content here)'
export TARGET_UID='(the user UID you want to make admin)'
```

Get `TARGET_UID`:
- Firebase Console → Authentication → Users → select the user → UID.

#### Option B: Cloud Functions (admin endpoint)

Create a Cloud Function that runs with Admin SDK and sets the claim for a given UID.
This is useful if you want repeatable admin management without running local scripts.

High-level steps:
- Create Firebase Functions project
- Add an HTTPS callable function `setAdmin(uid)`
- Restrict who can call it (e.g., only existing admins)
- Deploy functions, then call once to promote initial admin

### 4) Verify it works

1. Open the app, click **Login with Google**.
2. If your account has `admin: true`, the UI will show **Admin**.
3. As admin, you should be able to add/edit/delete prompts.
4. As non-admin / signed out, you should not see Add/Delete, and Save will be disabled.

### Notes / Common issues

- **Claim doesn't apply immediately**: sign out and sign in again, or force refresh token (`user.getIdToken(true)`).
- **Permission denied**: check Firestore Rules deployment and that your user actually has `admin: true`.

