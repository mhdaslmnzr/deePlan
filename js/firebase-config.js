// Firebase Configuration
// This file contains the Firebase configuration for the DeepPlan app
// Project: deeplan-41bda
// Database: https://deeplan-41bda-default-rtdb.firebaseio.com

const firebaseConfig = {
    apiKey: "AIzaSyAX8R_kTUe5EnrTDfzP5PsaqaIrxwNzpXk",
    authDomain: "deeplan-41bda.firebaseapp.com",
    databaseURL: "https://deeplan-41bda-default-rtdb.firebaseio.com",
    projectId: "deeplan-41bda",
    storageBucket: "deeplan-41bda.appspot.com",
    messagingSenderId: "690954571128",
    appId: "1:690954571128:web:3880e1b5cf0758624c0c8d",
    measurementId: "G-31DJ0LL3MT"
};

// Export the configuration
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { firebaseConfig };
} else {
    // Browser environment
    window.firebaseConfig = firebaseConfig;
} 