## Water Balloon Bombardment
### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Water Balloon Bombardment.

Requirements:
- Landscape support.
- 1 to 4 players.
- Bluetooth controller (more than one player) plus touch controls (one player only). Player one should always be able to use a bluetooth controller if they want instead of touch.
- 4 lanes of path for the bomb to walk.
- When there is only one player the catapult is centered.
- After the number of players is selected, add a difficulty selection with the choice of easy, normal, hard. Where the bomb walks at 36px/s for easy, 60px/s for normal and 84px/s at hard in wave 1.
- Every wave will increment the speed by 12px/s for easy, 18px/s for normal and 24px/s for hard.
- There will be 5 waves of bomb walking towards the player catapult.
- First wave will have 20 bombs, and the number grows by 5 after each wave, wave 2 will be 25, wave 3 will be 30 bombs and so on.
- Show the total number of bombs remaining in each wave until it goes down to 0.
- Players will get 1 point for every bomb they destroy.
- Prevent player from being able to fire water balloon in quick sucession, add a reload delay for each shot to make it more difficult to prevent buttom spamming.
- The catapult will have a reload animation to indicate when it is ready to fire again.
- Score, high score in localStorage, pause screen.
- Game menu should have a return to home page button on the top right corner.
- Clean modular structure: src/scenes, src/entities, src/systems, src/assets.
- Include npm scripts for dev, build, test, and preview.

Style:
- Overall make the game look nicer, the menu should look pretty.
- Generate a nice looking catapult and bomb graphic for them.
- Make the game background a grassland with nice grass graphic.