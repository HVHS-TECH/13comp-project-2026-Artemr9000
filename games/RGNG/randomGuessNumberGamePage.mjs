/**************************************************************/
// randomGuessNumberGamePage.mjs
//
// Written by Artem Rakhimov, Term 1 2026
// Two-player Random Guess Number Game logic:
//   Subscribes to the active game record via onValue so both
//   players see changes in real time
//   Handles turn validation + guess submission + hint display
//   Marks winner + updates wins/losses leaderboard when game ends
//
// v1 - basic 2 player RGNG, no rematch yet
/**************************************************************/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, get, set, update, onValue, onDisconnect }
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';
import { getAuth, onAuthStateChanged }
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';

/**************************************************************/
// Constants
/**************************************************************/
const RGNG_COL_C = 'white';
const RGNG_COL_B = '#2c7a2c';
console.log('%c randomGuessNumberGamePage.mjs', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B};`);

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
let myUid = null;
let myGameName = 'Player';
// NOTE: wrong key name here - should be rgngActiveKey not rgngKey
const gameId = sessionStorage.getItem('rgngKey');
console.log('TEST gameId from sessionStorage:', gameId);

/**************************************************************/
// setup()
// Called on window load - waits for auth then subscribes to game
// Input:  none
// Return: none
/**************************************************************/
function setup() {
    console.log('%c setup(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    if (!gameId) {
        document.getElementById('gameStatus').textContent = 'Error: no game found. Go back to lobby.';
        document.getElementById('b_backLobby').style.display = 'inline-block';
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '../../index.html';
            return;
        }
        myUid = user.uid;
        myGameName = sessionStorage.getItem('gameName') || user.displayName || 'Player';

        rgng_subscribeGame();
        rgng_setupDisconnect();
    });

    document.getElementById('b_submitGuess').addEventListener('click', rgng_submitGuess);
}

/**************************************************************/
// rgng_subscribeGame()
// Called by setup() once auth is confirmed
// Subscribes to /rgngActive/{gameId} with onValue
// Redraws the UI every time the game state changes
// Input:  none
// Return: none
/**************************************************************/
function rgng_subscribeGame() {
    console.log('%c rgng_subscribeGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const gameRef = ref(database, `rgngActive/${gameId}`);

    onValue(gameRef, (snapshot) => {
        console.log('%c rgng_subscribeGame(): game state changed', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

        // snapshot null = game was deleted (maybe both players left)
        if (!snapshot.exists()) {
            document.getElementById('gameStatus').textContent = 'Game ended or not found.';
            document.getElementById('b_backLobby').style.display = 'inline-block';
            return;
        }

        const game = snapshot.val();
        rgng_renderGame(game);
    });
}

/**************************************************************/
// rgng_renderGame(_game)
// Called by the onValue callback every time game state changes
// Updates the UI to show whose turn, last hint, or winner
// Input:  _game - the current game state object from firebase
// Return: none
/**************************************************************/
function rgng_renderGame(_game) {
    console.log('%c rgng_renderGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // figure out who the opponent is
    const oppUid = (_game.player1Uid === myUid) ? _game.player2Uid : _game.player1Uid;
    const oppName = (_game.player1Uid === myUid) ? _game.player2Name : _game.player1Name;

    document.getElementById('opponentInfo').textContent = `Playing against: ${oppName}`;

    // show last hint if there is one
    if (_game.lastHint) {
        document.getElementById('hintMsg').textContent =
            `Last guess: ${_game.lastGuess} → ${_game.lastHint.toUpperCase()}`;
    } else {
        document.getElementById('hintMsg').textContent = 'No guesses yet. Pick a number 1-100!';
    }

    if (_game.status === 'won') {
        rgng_showWinner(_game);
        return;
    }

    // check if the opponent disconnected - if so let our player know
    if (_game.disconnects && _game.disconnects[oppUid]) {
        document.getElementById('gameStatus').textContent = `${oppName} disconnected. You win by default!`;
        rgng_handleWin(_game, myUid);
        return;
    }

    // show whose turn it is and enable/disable input
    if (_game.currentTurn === myUid) {
        document.getElementById('gameStatus').textContent = 'Your turn! Guess the number.';
        document.getElementById('guessArea').style.display = 'block';
    } else {
        document.getElementById('gameStatus').textContent = `${oppName}'s turn...`;
        document.getElementById('guessArea').style.display = 'none';
    }
}

/**************************************************************/
// rgng_submitGuess()
// Called by the Submit Guess button click
// Reads the guess input, validates it, then writes to firebase
// If guess is correct - marks winner + updates both leaderboards
// If wrong - flips turn + writes the higher/lower hint
// Input:  none (reads from DOM)
// Return: none
/**************************************************************/
async function rgng_submitGuess() {
    console.log('%c rgng_submitGuess(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    const guessInput = document.getElementById('guessInput');
    const guess = parseInt(guessInput.value);

    if (isNaN(guess) || guess < 1 || guess > 100) {
        alert('Please guess a number between 1 and 100.');
        return;
    }

    // guard against the stale closure - re-read before we declare a winner ngl
    const snapshot = await get(ref(database, `rgngActive/${gameId}`));
    if (!snapshot.exists()) return;

    const game = snapshot.val();

    // double-check it is actually our turn (could have changed between renders)
    if (game.currentTurn !== myUid) {
        alert('Hold on - it is not your turn!');
        return;
    }

    const target = game.targetNumber;
    const oppUid = (game.player1Uid === myUid) ? game.player2Uid : game.player1Uid;

    guessInput.value = '';
    document.getElementById('b_submitGuess').disabled = true;

    if (guess === target) {
        // we got it - mark as won
        await rgng_handleWin(game, myUid);
    } else {
        // wrong guess - figure out the hint and flip the turn
        const hint = (guess < target) ? 'higher' : 'lower';

        // flip the turn so the other player gets a go
        await update(ref(database, `rgngActive/${gameId}`), {
            lastGuess:   guess,
            lastHint:    hint,
            currentTurn: oppUid,
            lastUpdated: Date.now()
        });
    }

    document.getElementById('b_submitGuess').disabled = false;
}

/**************************************************************/
// rgng_handleWin(_game, _winnerUid)
// Called when a winner is detected (correct guess or opponent disconnect)
// Updates /rgngActive with win status + bumps leaderboard scores
// Input:  _game - current game state object
//         _winnerUid - uid of the player who won
// Return: Promise
/**************************************************************/
async function rgng_handleWin(_game, _winnerUid) {
    console.log('%c rgng_handleWin(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    const loserUid = (_game.player1Uid === _winnerUid) ? _game.player2Uid : _game.player1Uid;
    const winnerName = (_game.player1Uid === _winnerUid) ? _game.player1Name : _game.player2Name;

    // mark the game as won in firebase so both players see it via onValue
    await update(ref(database, `rgngActive/${gameId}`), {
        status:      'won',
        winnerUid:   _winnerUid,
        lastUpdated: Date.now()
    });

    // update the leaderboard for winner - bump their wins score
    await rgng_updateLeaderboard(_winnerUid, winnerName, true);
    // update loser's record too
    const loserName = (_game.player1Uid === loserUid) ? _game.player1Name : _game.player2Name;
    await rgng_updateLeaderboard(loserUid, loserName, false);
}

/**************************************************************/
// rgng_updateLeaderboard(_uid, _gameName, _isWinner)
// Called by rgng_handleWin to bump win or loss count
// Reads existing record first so we don't overwrite total wins
// Input:  _uid - player's uid
//         _gameName - player's game name (for display in leaderboard)
//         _isWinner - boolean, true = increment wins, false = increment losses
// Return: Promise
/**************************************************************/
async function rgng_updateLeaderboard(_uid, _gameName, _isWinner) {
    console.log('%c rgng_updateLeaderboard(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    const lbRef = ref(database, `leaderboard/RGNG/${_uid}`);
    const snapshot = await get(lbRef);

    let wins   = 0;
    let losses = 0;

    // if there is already a record, read the existing win/loss counts
    if (snapshot.exists()) {
        wins   = snapshot.val().wins   || 0;
        losses = snapshot.val().losses || 0;
    }

    if (_isWinner) {
        wins++;
    } else {
        losses++;
    }

    await set(lbRef, {
        gameName:  _gameName,
        uid:       _uid,
        score:     wins,  // score = total wins for sorting
        wins:      wins,
        losses:    losses,
        timestamp: Date.now()
    });
}

/**************************************************************/
// rgng_showWinner(_game)
// Called by rgng_renderGame when status === 'won'
// Shows the winner banner and the back button
// Input:  _game - current game state object
// Return: none
/**************************************************************/
function rgng_showWinner(_game) {
    console.log('%c rgng_showWinner(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const winnerName = (_game.player1Uid === _game.winnerUid) ? _game.player1Name : _game.player2Name;
    const isMeWinner = (_game.winnerUid === myUid);

    document.getElementById('gameStatus').textContent = '';
    document.getElementById('guessArea').style.display = 'none';

    const banner = document.getElementById('winBanner');
    banner.style.display = 'block';
    banner.textContent = isMeWinner
        ? `You won! The number was ${_game.targetNumber}.`
        : `${winnerName} won! The number was ${_game.targetNumber}.`;

    document.getElementById('b_backLobby').style.display = 'inline-block';
}

/**************************************************************/
// rgng_setupDisconnect()
// Called by setup() once auth is confirmed
// Sets up onDisconnect handler so firebase knows if we leave mid-game
// The opponent's onValue listener checks disconnects[oppUid] to handle forfeit
// Input:  none
// Return: none
/**************************************************************/
function rgng_setupDisconnect() {
    console.log('%c rgng_setupDisconnect(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const disconnectRef = ref(database, `rgngActive/${gameId}/disconnects/${myUid}`);
    // when we disconnect firebase will set this to true automatically
    onDisconnect(disconnectRef).set(true);
}

window.onload = setup;
