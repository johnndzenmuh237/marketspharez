/* ==========================================================================
   FIREBASE CONFIG — swiftchain-827f2 (Marketsphare job marketplace)
   ========================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyB4zLVvw6SVuFa7TxU4Ee7Ic7381K6Kz0s",
  authDomain: "swiftchain-827f2.firebaseapp.com",
  projectId: "swiftchain-827f2",
  storageBucket: "swiftchain-827f2.firebasestorage.app",
  messagingSenderId: "709059558659",
  appId: "1:709059558659:web:7c3eb1d6ddba07bb14bd36"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();