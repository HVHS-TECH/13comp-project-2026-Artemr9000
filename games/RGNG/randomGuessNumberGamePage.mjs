/**************************************************************/
// randomGuessNumberGamePage.mjs
//
// Written by Artem Rakhimov, Term 1 2026
// Two-player Random Guess Number Game logic:
//   Subscribes to the active game record via onValue so both
//   players see changes in real time
//   Handles turn validation + guess submission + hint display
//   Marks winner + each player saves their OWN win/loss to the leaderboard
//   Rematch button so both players can play again without going back to lobby
//   Guess counter so everyone can see how many attempts have been made
//
// v2 - added rematch, guess counter, fixed loss saving
/**************************************************************/

import { initializeApp } 
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
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
let myGameName = sessionStorage.getItem('gameName') || 'Player';
const gameId = sessionStorage.getItem('rgngActiveKey');

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
        const userPath = `userDetails/${myUid}`;
                const userRef = ref(database, userPath);
                    get(userRef).then((snapshot) => {
                        if (snapshot.exists()) {
                         myGameName = snapshot.val().gameName;
                         if(!myGameName){
                            myGameName = sessionStorage.getItem('gameName')|| 'Player';
                     
                         }
                        }
                    });

        rgng_subscribeGame();
        rgng_setupDisconnect();
    });

    document.getElementById('b_submitGuess').addEventListener('click', rgng_submitGuess);
}

/**************************************************************/
// rgng_subscribeGame()
// Called by setup() once auth is confirmed
// Subscribes to /rgngActive/{gameId} with onValue
// Redraws the UI every time the game state changes in firebase
// Input:  none
// Return: none
/**************************************************************/
function rgng_subscribeGame() {
    console.log('%c rgng_subscribeGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    const gameRef = ref(database, `rgngActive/${gameId}`);

    // onValue fires once immediately (to load the current state) and then again
    // every time anything in the game record changes — low key this is what keeps
    // both screens in sync without any polling or page refreshes
    onValue(gameRef, (snapshot) => {
        console.log('%c rgng_subscribeGame(): game state changed', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

        // if the snapshot doesn't exist, the game record got deleted (both players probably left)
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
// Updates ALL the UI — whose turn, last hint, guess count, winner banner,
// and rematch buttons. Everything on screen is driven from _game, not local state
// Input:  _game - the current game state object from firebase
// Return: none
/**************************************************************/
function rgng_renderGame(_game) {
    console.log('%c rgng_renderGame(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // figure out who the opponent is based on which player slot we're in
    const oppUid  = (_game.player1Uid === myUid) ? _game.player2Uid  : _game.player1Uid;
    const oppName = (_game.player1Uid === myUid) ? _game.player2Name : _game.player1Name;

    document.getElementById('opponentInfo').textContent = `Playing against: ${oppName}`;

    // update the guess count display — show 0 if the field doesn't exist yet (old games)
    const count = _game.guessCount || 0;
    document.getElementById('guessCount').textContent = `Guesses so far: ${count}`;

    // show last hint if there is one, otherwise give players a nudge to start
    if (_game.lastHint) {
        document.getElementById('hintMsg').textContent =
            `Last guess: ${_game.lastGuess} → ${_game.lastHint.toUpperCase()}`;
    } else {
        document.getElementById('hintMsg').textContent = 'No guesses yet. Pick a number 1-100!';
    }

    // if the game is over, hand off to the winner display and stop here
    if (_game.status === 'won') {
        rgng_showWinner(_game, oppUid, oppName);
        return;
    }

    // still active — make sure the end-of-game stuff is hidden
    document.getElementById('winBanner').style.display = 'none';
    document.getElementById('rematchPanel').style.display = 'none';
    document.getElementById('b_backLobby').style.display = 'none';

    // check if the opponent disconnected mid-game — if so we win by default
    if (_game.disconnects && _game.disconnects[oppUid]) {
        document.getElementById('gameStatus').textContent = `${oppName} disconnected. You win by default!`;
        rgng_handleWin(_game, myUid);
        return;
    }

    // show whose turn it is and show/hide the input box accordingly
    if (_game.currentTurn === myUid) {
        document.getElementById('gameStatus').textContent = 'Your turn! Guess the number.';
        document.getElementById('guessArea').style.display = 'block';
    } else {
        document.getElementById('gameStatus').textContent = `${oppName}'s turn...`;
        document.getElementById('guessArea').style.display = 'none';
    }
}

/**************************************************************/
// rgng_showWinner(_game, _oppUid, _oppName)
// Called by rgng_renderGame when status === 'won'
// Shows the winner banner, hides the guess area, shows the rematch panel
// Also handles saving THIS player's win/loss to the leaderboard (once only)
// Input:  _game    - current game state object
//         _oppUid  - the opponent's uid
//         _oppName - the opponent's display name
// Return: none
/**************************************************************/
function rgng_showWinner(_game, _oppUid, _oppName) {
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

    // save this player's win or loss to their own leaderboard row
    // we do it here (not in handleWin) because firebase only lets you write
    // to YOUR OWN leaderboard entry — so each player has to do it for themselves
    rgng_saveSelfScore(_game, isMeWinner);

    // now figure out what the rematch panel should look like
    rgng_renderRematchPanel(_game, _oppUid, _oppName);
}

/**************************************************************/
// rgng_saveSelfScore(_game, _isWinner)
// Called by rgng_showWinner after a game ends
// Updates THIS player's own win/loss count in the leaderboard
// Each player calls this for themselves — firebase rules don't let you write
// to someone else's leaderboard entry, so we can't have one person do it for both
// Input:  _game     - current game state (used to check scoredFor flag)
//         _isWinner - true if the local player won, false if they lost
// Return: none
/**************************************************************/
async function rgng_saveSelfScore(_game, _isWinner) {
    console.log('%c rgng_saveSelfScore(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // we store a "scoredFor" flag inside the game record so that if this
    // player refreshes the page while still on the result screen, it won't
    // add another win/loss. ngl this one caught me out — a local variable
    // resets on refresh so you'd end up with infinite wins lol
    if (_game.scoredFor && _game.scoredFor[myUid]) {
        console.log('%c rgng_saveSelfScore(): already scored for this player, skipping', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
        return;
    }

    // write the flag first so even if the leaderboard update is slow,
    // a second render won't try to write again
    const flagUpdate = {};
    flagUpdate[`scoredFor/${myUid}`] = true;
    await update(ref(database, `rgngActive/${gameId}`), flagUpdate);

    // now do the actual leaderboard update for just this player
    await rgng_updateLeaderboard(myUid, myGameName, _isWinner);
}

/**************************************************************/
// rgng_renderRematchPanel(_game, _oppUid, _oppName)
// Called by rgng_showWinner to update the rematch button state
// The button changes depending on whether nobody asked yet, we asked,
// or the opponent asked. all driven from the game record so both screens
// see the same thing automatically via the onValue listener
// Input:  _game    - current game state (has rematchRequestedBy field)
//         _oppUid  - the opponent's uid
//         _oppName - the opponent's display name
// Return: none
/**************************************************************/
function rgng_renderRematchPanel(_game, _oppUid, _oppName) {
    console.log('%c rgng_renderRematchPanel(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    const panel       = document.getElementById('rematchPanel');
    const btn         = document.getElementById('b_rematch');
    const statusMsg   = document.getElementById('rematchStatus');

    // check if the opponent has disconnected — if they have, rematch isn't possible
    // because they're not on the page anymore to accept
    if (_game.disconnects && _game.disconnects[_oppUid]) {
        panel.style.display = 'block';
        btn.style.display = 'none';
        statusMsg.textContent = 'Opponent left — no rematch possible.';
        return;
    }

    panel.style.display = 'block';
    btn.style.display = 'inline-block';
    btn.disabled = false;

    // remove any old click listeners before adding a new one — otherwise
    // you'd stack up multiple listeners and it'd fire multiple times (not it)
    const freshBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(freshBtn, btn);

    if (!_game.rematchRequestedBy) {
        // nobody has asked for a rematch yet — show the default button
        statusMsg.textContent = '';
        freshBtn.textContent = 'Rematch';
        freshBtn.disabled = false;
        freshBtn.addEventListener('click', rgng_requestRematch);

    } else if (_game.rematchRequestedBy === myUid) {
        // we asked, waiting for the other player to accept
        statusMsg.textContent = `Waiting for ${_oppName} to accept...`;
        freshBtn.textContent = 'Waiting...';
        freshBtn.disabled = true;

    } else {
        // the opponent asked — we need to accept or ignore
        statusMsg.textContent = `${_oppName} wants a rematch!`;
        freshBtn.textContent = 'Accept Rematch';
        freshBtn.disabled = false;
        freshBtn.addEventListener('click', () => rgng_acceptRematch(_game));
    }
}

/**************************************************************/
// rgng_requestRematch()
// Called when the local player clicks the Rematch button first
// Just writes our uid to rematchRequestedBy in the game record —
// the other player's onValue listener will see it and flip their button to "Accept"
// Input:  none
// Return: none
/**************************************************************/
async function rgng_requestRematch() {
    console.log('%c rgng_requestRematch(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // we don't start a new game right away — we just write WHO asked
    // so the other player's onValue listener sees it and their button
    // flips to "Accept Rematch". fr the whole rematch flow is driven
    // by the game record, not by local state
    await update(ref(database, `rgngActive/${gameId}`), {
        rematchRequestedBy: myUid,
        lastUpdated:        Date.now()
    });
}

/**************************************************************/
// rgng_acceptRematch(_game)
// Called when the local player clicks Accept Rematch
// The person who accepts is the one who generates the new secret number
// and resets the whole game record back to a fresh active state
// Input:  _game - current game state (need player details to keep same matchup)
// Return: none
/**************************************************************/
async function rgng_acceptRematch(_game) {
    console.log('%c rgng_acceptRematch(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);
    await rgng_startRematch(_game);
}

/**************************************************************/
// rgng_startRematch(_game)
// Called by rgng_acceptRematch to actually reset the game
// Overwrites the existing game record with fresh values so both players
// see the game restart automatically via their onValue listeners
// Input:  _game - current game state (used to keep the same two players)
// Return: none
/**************************************************************/
async function rgng_startRematch(_game) {
    console.log('%c rgng_startRematch(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // pick a new secret number for the rematch
    const newTarget = Math.floor(Math.random() * 100) + 1;

    // we wipe the game record back to a fresh active state instead of
    // creating a brand new one with a different key. that way both players
    // are already on the right page (same gameId), so the onValue listener
    // just re-renders and we don't have to navigate anywhere. bet.
    await set(ref(database, `rgngActive/${gameId}`), {
        player1Uid:         _game.player1Uid,
        player1Name:        _game.player1Name,
        player2Uid:         _game.player2Uid,
        player2Name:        _game.player2Name,
        targetNumber:       newTarget,
        currentTurn:        _game.player1Uid,  // player 1 always goes first again
        lastGuess:          null,
        lastHint:           null,
        guessCount:         0,                 // reset the counter for the new game
        status:             'active',
        winnerUid:          null,
        rematchRequestedBy: null,
        // clearing scoredFor and disconnects so the new game starts clean
        scoredFor:          null,
        disconnects:        null,
        startedAt:          Date.now(),
        lastUpdated:        Date.now()
    });

    // both players' onValue fires now, sees status = 'active',
    // and rgng_renderGame hides the banner + shows the guess area again
    // no navigation needed — low key this is my fav part of this approach
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

    // bump the count by 1 every guess, doesn't matter if it was right or wrong
    // — low key it's just the total number of attempts the two players made together
    const newCount = (game.guessCount || 0) + 1;

    guessInput.value = '';
    document.getElementById('b_submitGuess').disabled = true;

    if (guess === target) {
        // we got it - mark as won (the count goes up one more for the winning guess)
        await rgng_handleWin(game, myUid, newCount);
    } else {
        // wrong guess — figure out the hint and flip the turn to the other player
        const hint = (guess < target) ? 'higher' : 'lower';

        await update(ref(database, `rgngActive/${gameId}`), {
            lastGuess:   guess,
            lastHint:    hint,
            guessCount:  newCount,   // save the updated guess count to firebase
            currentTurn: oppUid,     // flip the turn so the other player gets a go
            lastUpdated: Date.now()
        });
    }

    document.getElementById('b_submitGuess').disabled = false;
}

/**************************************************************/
// rgng_handleWin(_game, _winnerUid, _finalCount)
// Called when a winner is detected (correct guess or opponent disconnect)
// Marks the game as won in firebase so both players see it via onValue
// Does NOT update the leaderboard here — each player does that themselves
// in rgng_saveSelfScore when they see status = 'won' in rgng_showWinner
// Input:  _game        - current game state object
//         _winnerUid   - uid of the player who won
//         _finalCount  - the total guess count to save (including the winning guess)
// Return: Promise
/**************************************************************/
async function rgng_handleWin(_game, _winnerUid, _finalCount) {
    console.log('%c rgng_handleWin(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    // the count might be undefined if called from the disconnect handler
    // (there's no new guess being submitted), so fall back to whatever is in the game
    const countToSave = _finalCount !== undefined ? _finalCount : (_game.guessCount || 0);

    // mark the game as won in firebase — this triggers both players' onValue
    // listeners, which call rgng_showWinner, which each saves their own score
    await update(ref(database, `rgngActive/${gameId}`), {
        status:      'won',
        winnerUid:   _winnerUid,
        guessCount:  countToSave,
        lastUpdated: Date.now()
    });
}

/**************************************************************/
// rgng_updateLeaderboard(_uid, _gameName, _isWinner)
// Called by rgng_saveSelfScore to bump win or loss count
// Reads the existing record first so we don't overwrite the total wins/losses
// then saves the updated numbers back to firebase
// Input:  _uid      - player's uid (we only call this for ourselves now)
//         _gameName - player's game name (for display in leaderboard)
//         _isWinner - true = increment wins, false = increment losses
// Return: Promise
/**************************************************************/
async function rgng_updateLeaderboard(_uid, _gameName, _isWinner) {
    console.log('%c rgng_updateLeaderboard(): ', `color: ${RGNG_COL_C}; background-color: ${RGNG_COL_B}`);

    const lbRef = ref(database, `leaderboard/RGNG/${_uid}`);
    const snapshot = await get(lbRef);

    let wins   = 0;
    let losses = 0;

    // if there is already a record, grab the existing counts so we can add to them
    // (not just overwrite with 1 every time lol)
    if (snapshot.exists()) {
        wins   = snapshot.val().wins   || 0;
        losses = snapshot.val().losses || 0;
    }

    if (_isWinner) {
        wins++;
    } else {
        losses++;
    }

    // just bump our own leaderboard row — the other player will do theirs from their browser
    // score = wins because that's what the leaderboard sorts by (more wins = higher rank)
    await set(lbRef, {
        gameName:  _gameName,
        uid:       _uid,
        score:     wins,   // score = total wins for sorting purposes
        wins:      wins,
        losses:    losses,
        timestamp: Date.now()
    });
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
    // — the other player's onValue will pick it up and handle the forfeit
    onDisconnect(disconnectRef).set(true);
}

window.onload = setup;
