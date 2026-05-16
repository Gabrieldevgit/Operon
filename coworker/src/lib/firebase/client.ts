import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

// Prevent duplicate initialization in Next.js hot-reload
function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}

let _app:       FirebaseApp | null = null
let _firestore: Firestore   | null = null
let _rtdb:      Database    | null = null
let _auth:      Auth        | null = null

export function firebaseApp(): FirebaseApp {
  if (!_app) _app = getFirebaseApp()
  return _app
}

// Firestore — used for persistent memory, task history, project context
export function firestore(): Firestore {
  if (!_firestore) _firestore = getFirestore(firebaseApp())
  return _firestore
}

// Realtime Database — used for live agent status, step streaming
export function rtdb(): Database {
  if (!_rtdb) _rtdb = getDatabase(firebaseApp())
  return _rtdb
}

// Auth — optional, if you want Firebase Auth alongside Supabase Auth
export function firebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(firebaseApp())
  return _auth
}
