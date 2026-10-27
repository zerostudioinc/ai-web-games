## Water Balloon Bombardment
### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Water Balloon Bombardment.

Requirements:
- Landscape support.
- 1 to 4 players.
- Bluetooth controller (more than one player) plus touch controls (one player only). Player one should always be able to use a bluetooth controller if they want instead of touch.
- 4 lanes of path for the bomb to walk.
- When there is only one player the catapult is centered.
- 10 waves of slow walking bomb walking towards the player catapult. The bomb walks faster gradually after each wave.
- First wave will have 20 bombs, and the number grows by 5 after each wave, wave 2 will be 25, wave 3 will be 30 bombs and so on.
- Prevent player from being able to fire water balloon in quick sucession, add a reload delay for each shot to make it more difficult to prevent buttom spamming.
- The catapult will have a reload animation to indicate when it is ready to fire again.
- Score, high score in localStorage, pause screen. Players will get 1 point for every bomb they destroy.
- Clean modular structure: src/scenes, src/entities, src/systems, src/assets.
- Include npm scripts for dev, build, test, and preview.

Style:
- Overall make the game look nicer, the menu should look pretty.
- Generate a nice looking catapult and bomb graphic for them.
- Make the game background a grassland with nice grass graphic.