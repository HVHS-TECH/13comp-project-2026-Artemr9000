/**************************************************************/
// randomGuessNumberGame.mjs
// Main game logic for randomGuessNumberGame 
// Written by Artem Rakhimov, Term 1 2026
/**************************************************************/
console.log("loaded game.mjs")
/**************************************************************/
// Imports from firebase
/**************************************************************/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, set, get, update, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

/**************************************************************/
// Imports from fb_io.mjs 
/**************************************************************/
import {fb_initialise, fb_onAuthStateChanged, fb_gamedb, userDetails, fb_write, fb_read} 
from '../../fb/fb_io.mjs';

/**************************************************************/
// common questions  
/**************************************************************/

/**************************************************************/
// Game State variables/constents
/**************************************************************/

//displayname of the user 
const displayName = sessionStorage.getItem("displayName");  
//photo url of the user 
const photo = sessionStorage.getItem("photo");     
//uid of the user 
const uid = sessionStorage.getItem("uid");     

