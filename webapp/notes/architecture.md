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


TODO: check if refresh allows player to go twice in a row
- hit and refresh --> player goes again, turns not recorded 

TODO: remove delete button and delete the gameId when the game is over 