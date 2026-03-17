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
from '/fb/fb_io.mjs';

/**************************************************************/
// Game State variables/constents
/**************************************************************/

//displayname of the user 
const displayName = sessionStorage.getItem("displayName");  
//photo url of the user 
const photo = sessionStorage.getItem("photo");     
//uid of the user 
const uid = sessionStorage.getItem("uid");     

//gameRole tracks whether the person is gameOwner or Player
let gameRole;
//gameID is a unique key for the current game 
let gameID;
//game number: secret number this client needs to guess set when player joins the lobby
let gameNumber;
//guess: players guess
let guess;

/**************************************************************/
// Startup
// Initialize Firebase, then wait for auth before doing anything.
// fb_onAuthStateChanged will call startup() once the user is confirmed.
/**************************************************************/
fb_initialise();
fb_onAuthStateChanged((uid) => {
 // Auth is confirmed — uid is the logged-in user's ID
 console.log('Auth state: Logged in', uid);
});
/************************/
//createGame
//creates the game 
/************************/
export function createGame() {
console.log("create game");
gameRole = "gameOwner";     
gameID = uid;   

const db = fb_gamedb 
set(ref(db,'/waitingGames', + gameID), displayName);
}
//makes the number random 
gameNumber = Math.floor(Math.random() * 10) + 1;

console.log(gameNumber)

//guess the number logic  
 if (guess < gameNumber){
   console.log("lower");     
  }else if (guess > gameNumber){
    console.log('higher');     
  }else{
    console.log("win"); 
}    

