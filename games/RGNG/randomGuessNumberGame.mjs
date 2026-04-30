/**************************************************************/
// randomGuessNumberGame.mjs
//
// Written by Artem Rakhimov, Term 1 2026
// RGNG (Random Guess Number Game) lobby module:
//   Subscribes to the /rgngLobby path with onValue so the list
//   updates in real time whenever someone creates or cancels a game
//   Handles creating a new game lobby entry (player 1)
//   Handles joining an existing game (player 2)
//
// v1 - basic lobby, no timer on waiting games yet
/**************************************************************/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, push, set, remove, onValue, onDisconnect }
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, onAuthStateChanged }
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

/**************************************************************/
// Constants
/**************************************************************/
const RGNG_COL_C = 'white';
const RGNG_COL_B = '#2c7a2c';
console.log('%c randomGuessNumberGame.mjs', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B};`);

const FB_GAMECONFIG = {
    apiKey: "AIzaSyCJJ8-ZerBC53qhRMzinJiPty2vk9tSsKc",
    authDomain: "artem-rakhimov-13comp-c7551.firebaseapp.com",
    databaseURL: "https://artem-rakhimov-13comp-c7551-default-rtdb.firebaseio.com",
    projectId: "artem-rakhimov-13comp-c7551",
    storageBucket: "artem-rakhimov-13comp-c7551.firebasestorage.app",
    messagingSenderId: "902104968011",
    appId: "1:902104968011:web:2cf4178eeb8c04428796ce"
};

const app = initializeApp(FB_GAMECONFIG);
const database = getDatabase(app);
const auth = getAuth(app);

/**************************************************************/
// Module-level state
/**************************************************************/
let myUid = sessionStorage.getItem('uid');
let myGameName = sessionStorage.getItem('gameName') || 'Player';
let myLobbyKey = null;    // set if we are player 1 waiting in lobby
let lobbyUnsubscribe = null;  // holds the onValue unsubscribe fn

/**************************************************************/
// setup()
// Called on window load - waits for auth then subscribes to lobby
// Input:  none
// Return: none
/**************************************************************/
function setup() {
    console.log('%c setup(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // wait for auth so we have the uid sorted out before doing anything
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // if not logged in at all, send them back
            window.location.href = '../../index.html';
            return;
        }
        myUid = user.uid;
        myGameName = sessionStorage.getItem('gameName') || user.displayName || 'Player';

        rgng_subscribeLobby();
    });

    document.getElementById('b_createGame').addEventListener('click', rgng_createGame);
}

/**************************************************************/
// rgng_subscribeLobby()
// Called by setup() once auth is confirmed
// Subscribes to /rgngLobby with onValue so any change triggers a re-render
// Checks if a new game we are in has started (lobby entry removed = game active)
// Input:  none
// Return: none
/**************************************************************/
function rgng_subscribeLobby() {
    console.log('%c rgng_subscribeLobby(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const lobbyRef = ref(database, 'rgngLobby');

    // onValue fires immediately and every time the lobby changes - low key this is the cool part
    lobbyUnsubscribe = onValue(lobbyRef, (snapshot) => {
        console.log('%c rgng_subscribeLobby(): lobby changed', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
        const data = snapshot.val();

        // if we were player 1 waiting and our lobby entry is gone, player 2 joined
        // the lobby key IS the active game key since p2 writes rgngActive using the same push key
        if (myLobbyKey && (!data || !data[myLobbyKey])) {
            sessionStorage.setItem('rgngActiveKey', myLobbyKey);
            window.location.href = `./randomGuessNumberGamePage.html`;
            return;
        }

        rgng_renderLobby(data);
    });
}

/**************************************************************/
// rgng_renderLobby(_games)
// Called by the onValue callback whenever lobby data changes
// Clears and rebuilds the lobby list in the DOM
// Input:  _games - snapshot.val() object or null
// Return: none
/**************************************************************/
function rgng_renderLobby(_games) {
    console.log('%c rgng_renderLobby(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const listDiv = document.getElementById('lobbyList');
    const statusMsg = document.getElementById('statusMsg');
    listDiv.innerHTML = '';

    // snapshot is null = lobby is empty rn, just show the "no games" msg
    if (!_games) {
        statusMsg.textContent = 'No games waiting right now. Create one!';
        listDiv.appendChild(statusMsg);
        return;
    }

    statusMsg.textContent = '';
    let gameCount = 0;

    // loop through lobby entries and build a row for each
    for (const key in _games) {
        const game = _games[key];
        gameCount++;

        const row = document.createElement('div');
        row.className = 'game-row';

        const info = document.createElement('span');
        info.textContent = `${game.player1Name}'s game`;

        const btnArea = document.createElement('span');

        if (game.player1Uid === myUid) {
            // this is our own game - show cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => rgng_cancelGame(key));
            btnArea.appendChild(cancelBtn);
        } else {
            // someone else's game - show join button
            const joinBtn = document.createElement('button');
            joinBtn.textContent = 'Join';
            joinBtn.addEventListener('click', () => rgng_joinGame(key, game));
            btnArea.appendChild(joinBtn);
        }

        row.appendChild(info);
        row.appendChild(btnArea);
        listDiv.appendChild(row);
    }

    if (gameCount === 0) {
        statusMsg.textContent = 'No games waiting right now. Create one!';
        listDiv.appendChild(statusMsg);
    }
}

/**************************************************************/
// rgng_createGame()
// Called by the Create New Game button click
// Pushes a new lobby entry for player 1 to wait in
// Sets up onDisconnect so the lobby entry is cleaned up if we leave
// Input:  none
// Return: none
/**************************************************************/
async function rgng_createGame() {
    console.log('%c rgng_createGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // if we are already waiting in a lobby, ngl no need to create another
    if (myLobbyKey) {
        alert('You are already waiting in a game!');
        return;
    }

    const lobbyRef = ref(database, 'rgngLobby');
    const newGameRef = push(lobbyRef);
    myLobbyKey = newGameRef.key;
    sessionStorage.setItem('rgngLobbyKey', myLobbyKey);

    // write our lobby record
    await set(newGameRef, {
        player1Uid:  myUid,
        player1Name: myGameName,
        createdAt:   Date.now()
    });

    // low key need to delete the lobby entry if we disconnect so no ghost games sit around
    onDisconnect(newGameRef).remove();

    document.getElementById('b_createGame').textContent = 'Waiting for player 2...';
    document.getElementById('b_createGame').disabled = true;

    console.log('Created lobby entry:', myLobbyKey);
}

/**************************************************************/
// rgng_cancelGame(_key)
// Called by the Cancel button on our own lobby row
// Removes our lobby entry and re-enables the create button
// Input:  _key - the firebase push key of our lobby entry
// Return: none
/**************************************************************/
async function rgng_cancelGame(_key) {
    console.log('%c rgng_cancelGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    // cancel the onDisconnect so it doesn't fire after we manually removed the entry
    onDisconnect(ref(database, `rgngLobby/${_key}`)).cancel();
    await remove(ref(database, `rgngLobby/${_key}`));
    myLobbyKey = null;
    sessionStorage.removeItem('rgngLobbyKey');
    document.getElementById('b_createGame').textContent = 'Create New Game';
    document.getElementById('b_createGame').disabled = false;
}

/**************************************************************/
// rgng_joinGame(_key, _game)
// Called by the Join button on another player's lobby row
// Generates the target number, writes rgngActive record, deletes lobby entry
// Sends both players to the game page via sessionStorage
// Input:  _key - push key of the lobby entry to join
//         _game - the lobby record object { player1Uid, player1Name, createdAt }
// Return: none
/**************************************************************/
async function rgng_joinGame(_key, _game) {
    console.log('%c rgng_joinGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // generate the secret number - player 2 does this when they join
    const targetNumber = Math.floor(Math.random() * 100) + 1;

    // write the active game record
    const activeRef = ref(database, `rgngActive/${_key}`);
    await set(activeRef, {
        player1Uid:   _game.player1Uid,
        player1Name:  _game.player1Name,
        player2Uid:   myUid,
        player2Name:  myGameName,
        targetNumber: targetNumber,
        currentTurn:  _game.player1Uid,  // player 1 guesses first
        lastGuess:    null,
        lastHint:     null,
        status:       'active',
        winnerUid:    null,
        startedAt:    Date.now(),
        lastUpdated:  Date.now()
    });

    // low key need to delete the lobby entry once p2 joins so no one else tries to jump in
    await remove(ref(database, `rgngLobby/${_key}`));

    // store the game key so both players can find it on the game page
    sessionStorage.setItem('rgngActiveKey', _key);

    window.location.href = './randomGuessNumberGamePage.html';
}

window.onload = setup;
