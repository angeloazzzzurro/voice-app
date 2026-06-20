import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ⚠️  Sostituisci con la tua config Firebase
const firebaseConfig = {
  apiKey: "INSERISCI_QUI",
  authDomain: "INSERISCI_QUI",
  projectId: "INSERISCI_QUI",
  storageBucket: "INSERISCI_QUI",
  messagingSenderId: "INSERISCI_QUI",
  appId: "INSERISCI_QUI"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
