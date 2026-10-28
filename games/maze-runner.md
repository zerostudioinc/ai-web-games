## Maze Runner
Version: 1.1

### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Maze Runner.

Requirements:
- Landscape support.
- Bluetooth controller or keyboard directional (up/down/left/right or WASD) or touch directional pad.
- One player or two players versus to compete who escapes first with the highest score.
  - When there is one player, the player can use any controller mode.
  - When there are two players, both players can use bluetooth controller if there is more than one or touch or keyboard where player one will be using WASD and player two will be using up/down/left/right direction.
- About the maze:
  - it is overlay on a hidden grid
  - there are 10 levels of maze
  - the maze is randomly generated, starting from small maze to larger maze as the level progresses.
- The player:
  - always starts in the middle of the maze and will need to find a way to get to the exit that can be random in any edge of the maze.
  - has 3 lives to escape the maze, the 3 lives will be restore after each level.
  - move in the direction of the directional pad input and each press move one square.
- The game:
  - When a player move thru the maze and head into a dead-end path, if the player continue to move down the path, the path behind them will be blocked and they will be trap and lose a live.
  - The player will need to restart again at the starting point and loses a live.
  - When the player manage to escape the maze via the exit, the pass the level and move on to the next level.
  - The player wins when they completed all 10 levels.
- The game in two players versus mode:
  - When player in versus mode, the screen will be split with player one on the left, player two on the right.
  - Both player will have the same maze.
  - Both player will have the same rule and difficulty mode.
  - Both player will have their own score and will compete to see who escape first.
  - When one player loses all their live, the other player wins. If both players completes all the levels, the player with the highest score wins.
  - Both player scores will be tracked and can be store into the high score chart if their score makes it.
- Scoring:
  - The player is time on how long it takes to escape the maze, the quicker they escape the higher the score.
  - Figure out a way to calculate the score to give the player a score after each level, and the final score will be the sum of all score from each level.
  - There will be a high-score chart store for the top 5 scores for each difficulty mode.
- Dificulty Mode: Player have a difficulty selection with the choice of:
  - Easy
    - A player can continue to move forward 6 steps into a dead-end path before they are trap and loses a live.
    - Player get warning when the path is about to seal when they move one more step.
    - The sealed corridor will stay blocked on the maze so player will not repeat the same path.
  - Normal
    - A player can continue to move forward 4 steps into a dead-end path before they are trap and loses a live.
    - There are no player warning when the path is about to seal.
    - The sealed corridor will stay blocked on the maze so player will not repeat the same path.
  - Hard
    - A player can continue to move forward 2 steps into a dead-end path before they are trap and loses a live.
    - There are no player warning when the path is about to seal.
    - The sealed corridor will stay blocked on the maze so player will not repeat the same path.
  - Very Hard
    - A player can continue to move forward 2 steps into a dead-end path before they are trap and loses a live.
    - There are no player warning when the path is about to seal.
    - The sealed corridor will not stay blocked to make it more difficult so player need to remember their route.
- Score, high score in localStorage, pause screen.
  - Keep a top 5 high score for each difficulty mode.
  - Show the top high score for each difficulty mode in the main menu.
  - Add a high score button on the top left of the screen to display the high scores for each difficulty mode.
- Game menu should have a return to home page button on the top right corner. The size of both high score and home button should be the same size.
- Clean modular structure: src/scenes, src/entities, src/systems, src/assets.
- Include npm scripts for dev, build, test, and preview.

Style:
- Overall make the game look nicer, the menu should look pretty.
- Generate a nice player figure with movement animation.
- Randomise the game background for each level with the option of:
  - grassland with nice grass graphic.
  - desert with sand graphic.
  - dungeon with spooky graphic.
  - spaceship with spaceship graphic.
  - mountain with hill and mountain graphic.