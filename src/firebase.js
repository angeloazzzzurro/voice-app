import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyA8l4YwDFgD5X6LsmTiYZ8CV7nAsCx0kOY",
  authDomain: "voice-app-ea13b.firebaseapp.com",
  projectId: "voice-app-ea13b",
  storageBucket: "voice-app-ea13b.firebasestorage.app",
  messagingSenderId: "272160973497",
  appId: "1:272160973497:web:a926add95121e47b97f168"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const auth = getAuth(app)
