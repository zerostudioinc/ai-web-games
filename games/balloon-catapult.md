## Balloon Catapult
### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Balloon Catapult.

Requirements:
- Landscape support.
- 1 to 4 players.
- Bluetooth controller (more than one player) plus touch controls (one player only). Player one should always be able to use a bluetooth controller if they want instead of touch.
- 4 lanes of path for the bomb to walk.
- Catapult is always centered when game is played with 1 or 4 players.
- Dificulty Mode: After the number of players is selected, add a difficulty selection with the choice of:
  - Very Easy
    - Starting Bomb Speed: 24px/s
    - Speed Increment per Wave: 6px/s
    - Bomb only shows up in two lanes, lane 3 and lane 4.
  - Easy
    - Starting Bomb Speed: 36px/s
    - Speed Increment per Wave: 12px/s
  - Normal
    - Starting Bomb Speed: 60px/s
    - Speed Increment per Wave: 18px/s
  - Hard
    - Starting Bomb Speed: 84px/s
    - Speed Increment per Wave: 24px/s
- There will be 5 waves of bomb walking towards the player catapult.
- First wave will have 20 bombs, and the number grows by 5 after each wave, wave 2 will be 25, wave 3 will be 30 bombs and so on.
- Show the total number of bombs remaining in each wave until it goes down to 0.
- Players will get 1 point for every bomb they destroy.
- Prevent player from being able to fire water balloon in quick sucession, add a reload delay for each shot to make it more difficult to prevent buttom spamming.
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