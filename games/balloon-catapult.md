## Balloon Catapult
Version: 1.1

### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Balloon Catapult.

Requirements:
- Landscape support.
- 1 to 4 players.
- Bluetooth controller (more than one player) plus touch controls (one player only). Player one should always be able to use a bluetooth controller if they want instead of touch.
- A maximum of 4 lanes of path for the bomb to walk. Number lane 1 to 4 in the requirements.
- Catapult is always centered when game is played with 1 or 4 players. To achieve this:
  - 1 player is playing: 3 bomb lanes and the player is in lane 2
  - 2 players is playing: 4 bomb lanes and the player is in lane 2 and 3
  - 3 players is playing: 3 bomb lanes and the player is in lane 1, 2 and 3
  - 4 players is playing: 4 bomb lanes and the player is in lane 1, 2, 3 and 4
- When playing with 2 or more players, the player will be hit by the bomb closest to them, when all players are out and left with one player, all bombs that lands will hit the player.
- Dificulty Mode: After the number of players is selected, add a difficulty selection with the choice of:
  - Very Easy
    - Starting Bomb Speed: 24px/s
    - Speed Increment per Wave: 6px/s
    - Bomb only shows up in two lanes when playing in one player game, bombs on lane 2 and 3.
    - When playing with two or more players, bombs will show up in all lanes.
  - Easy
    - Starting Bomb Speed: 36px/s
    - Speed Increment per Wave: 12px/s
    - Bomb comes from all lanes.
  - Normal
    - Starting Bomb Speed: 60px/s
    - Speed Increment per Wave: 18px/s
    - Bomb comes from all lanes.
  - Hard
    - Starting Bomb Speed: 84px/s
    - Speed Increment per Wave: 24px/s
    - Bomb comes from all lanes.
- There will be 5 waves of bomb walking towards the player catapult.
- First wave will have 20 bombs, and the number grows by 5 after each wave, wave 2 will be 25, wave 3 will be 30 bombs and so on.
- Show the total number of bombs remaining in each wave until it goes down to 0.
- Players will get 1 point for every bomb they destroy.
- Prevent player from being able to fire water balloon in quick sucession, add a reload delay for each shot to make it more difficult to prevent buttom spamming.
  - The control need to be smooth, as the fire button can be trigger while the reticle is moving.
- The catapult will have a reload animation to indicate when it is ready to fire again.
- Score, high score in localStorage, pause screen.
  - Keep a top 3 high score for each difficulty mode.
  - Show the top high score for each difficulty mode in the main menu.
  - Add a high score button on the top left of the screen to display the high scores for each difficulty mode.
- Game menu should have a return to home page button on the top right corner. The size of both high score and home button should be the same size.
- Clean modular structure: src/scenes, src/entities, src/systems, src/assets.
- Include npm scripts for dev, build, test, and preview.

Style:
- Overall make the game look nicer, the menu should look pretty.
- Generate a nice looking catapult and bomb graphic for them.
- Make the game background a grassland with nice grass graphic.