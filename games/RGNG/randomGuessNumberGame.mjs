/**************************************************************/
// randomGuessNumberGame.mjs
// Main game logic for randomGuessNumberGame 
// Written by Artem Rakhimov, Term 1 2026
/**************************************************************/
/**************************************************************/
// Imports from firebase
/**************************************************************/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, set, get, update, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

/**************************************************************/
// Imports from fb_io.mjs
/**************************************************************/
import {fb_initialise, fb_onAuthStateChanged, fb_gamedb, userDetails} 
from '/fb/fb_io.mjs';

/**************************************************************/
// Game State variables
/**************************************************************/

//gameRole tracks whether the person is gameOwner or Player
let gameRole;
//gameId
let gameID;

let gameNumber;

function randomNumberGame(){



};