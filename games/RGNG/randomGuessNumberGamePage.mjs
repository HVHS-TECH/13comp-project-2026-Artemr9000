/**************************************************************/
// randomGuessNumberGamePage.mjs
// Main game logic for randomGuessNumberGame page
// Written by Artem Rakhimov, Term 1 2026
/**************************************************************/
console.log("loaded page.mjs")
function page_updateGameList(gameList){
    console.log(gameList)
    if(gameList == null){
    gameDisplay.innerHTML = 
    `No Games here, you can wait or you can create your own game! :(
    <br><button onclick="createGame()">Create a game</button>
    `
}else{}
    gameDisplay.innerHTML = 'Games available:<br>'; 
}