

We decided to transition to a darker color scheme to be easier on the eyes. We also removed the enemy marking misses as this was unnecessary. We show the enemy hits, player hits, and player misses only to simplify our UI. We also got rid of the attack indicator and show the enemy and player attacking directly from their boards. 

3/26/25

added restful endpoints for CRUD in app.ts

tested these endpoints in test/api.test.js and all tests pass

changed game-board.js to create a new game id with the create endpoint
and stores it into DynamoDB


3/29/25 

implemented GET endpoint in game-board.js to retrieve game state from DynamoDB based on gameId 

implemented PUT endpoint in game-board.js to update game state in DynamoDB based on gameId 

update GET and PUT endpoints to have functionality instead of just logging to console 

Added delete button to delete gameId from DynamoDB for testing purposes 

updated updateGame function to record player hits, enemy hits, and ships placed in DynamoDB  

updated game-board.js to reflect updateGame function changes in frontend UI 

updated updateGame function to record misses on the enemy board in DynamoDB 

Brainstorming about turn state issue: 
- hit and refresh --> player goes again, turns not recorded 
- its a delay in the switchTurn call in handleEnemyCellClick and handlePlayerCellClick. Moved the switchTurn call higher up out of the setTimeout function to call it directly after hit or miss is displayed 
- on refresh, it is always player's turn, so the constructor is the problem. Make sure to set isPlayerTurn is not set in the constructor so that the correct turn is recorded in the backend even after refresh
- isPlayerTurn must be set to null in the constructor so that the updateGame function can set it to the correct value, otherwise it will not be able to find it and the update will fail to work 
- isPlayerTurn is only needed in the constructor when we create a gameId, so have a simple if statement to check if needed: if(!gameId) this.isPlayerTurn = null; 
- inital assumption that createGame sets isPlayerTurn to true when it does not exist in constructor is incorrect. This was what was causing error with updateGame function call... 


We are calling an extra switchTurn call, which is offsetting the turns by 1. We need to figure out why this is happening and fix it.  

    - the switchTurn call was also being called in the enemyMove function, so I removed it and only called in in the handleEnemyCellClick function. The handleEnemyCellclick function calls the enemyMove function so we were double calling when we had switchTurn in both functions 

    - Need to fix CORS issues. The cors errors were caused by the navbar file trying to load ionicons? Fixed with local import from dist folder? removed the ionicons import and used simple emoji icons instead, we can change this later

    - GET 404 when gameId does not exist in DynamoDB. The gameId is only cleared when the delete button is clicked, so remember to click the delete button until the gameId is cleared out completely  

    - placed switchTurn in the handleEnemyCellClick in the setTimeout if and else statement to ensure that the enemy goes after the player and that the turn state is recorded in DynamoDB. I also added a check in the connectedCallback function to ensure the enemy goes if it is their turn on page load. SwitchTurn is called in the enemyMove function as well in the if and else statements so that turns switch. 

    - had to add a check in the connectedCallback function to ensure the enemy goes if it is their turn on page load. Had to not enter the if statement if the gameId is not set, so that the enemy does not go in the placeship phase. Later this could be changed to check if the player has placed their four ships since that is more logical, but it wasn't working when I tried it... 

    - Removed the delete button and assigned its functioanlity to the restart button. The restart button deletes the gameId from DynamoDB and resets the game-board. Added a custom event to the nav-bar component to reset the game-board when the restart button is clicked. Added an event listener in the game-board component to listen for the custom event and call the resetGame function in the connectedCallback function 

    - navbar buttons work on single click

3/30/25 

Contemplated adding a PATCH endpoint to update one field at a time, but instead we could add optimistic locking to the updateGame function later. This optimistic locking would check if the game state has changed since the last update and if so, it would return a conflict error to the client. The client would then have to refresh the page and try again. 

fixed the profile button displaying the profile. Profile button event listener and login.js event dispatching added to profile-lit.js and login.js respectively

 

Fixed victory and defeat sounds by adding sounds.initAudioContext() in game-board.js and sounds.Victory() and sounds.Defeat() in game-board.js when the game is over 

3/31/25 

Display wins/losses on profile page -- when winning or losing a game, update the wins/losses in profile page. Use events in game-board.js and profile-lit.js to update the profile page with wins/losses when the game is over. Added load profile function to profile-lit.js to load the profile data from DynamoDB when the profile page is loaded, which includes the wins and losses 

    - issue is that dynamoDB object does not have its wins/losses updated when the game is over 

    - use our existing RESTFUL API endpoints to update the wins/losses in the profile page and make a new lambda function to handle the update --> add win and loss fields to createGame lambda and update them with this.wins and this.losses in game-board.js when the game is over
    


take over the profile backend logic from user-exp branch and use it for our profile button 

    - make sure the wins and losses exist after the restart button is clicked ... this means they cannot be linked to the createGame lambda or they have to not be wiped after game restart .... When the user logs out, then the wins and losses should be wiped? What is good user exp? 
    - reading wins and losses from localStorage instead of DynamoDB to send from game-board.js to profile-lit.js. Local storage works and keeps consistent between restarts 

Now lets make the logout button work and reset the wins/losses from localStorage when the user logs out. We can use a direct URL approach to logout from cognito and still keep the game page to redirect to after logout 

Style sign in button when clicking profile 

TODO: 


style help page to the same as the game page --> bring over mixer in game-board.js from user-exp branch to get game-boards to appear on help page? 

Style chat box and make AI chat at the end of the game 


fix mobile formatting by removing border so that it fits on phone cleanly 

Make sure winner-popup.js is being used 

Work on general flow between logging in, winning/losing, logging out, etc. 

look at cleaning the code by moving the RESTFUL API functions out of game-board.js etc. 

diagram the architecture in draw.io and share it with the team --> connector and component diagram, at least 10 components 

Clean up branches and move on to event bus arch. 
