# Web Games
This repo contains AI assisted 2D web based games. They are 2D browser-based games implemented using Vite, TypeScript, and Phaser 3.

## Water Balloon Bombardment
This is a simple 2D web based game that can have 1 to 4 players. The objective of the game is for the player to protect their catapult from oncoming wave of walking bombs, the players will fire water balloon from their catapult to stop the oncoming bombs.

The player can control an aim reticle and press shoot to fire their water ballon to. The player can connect a bluetooth controller to control the reticle using the directional pad and press any button to fire the balloon. Touch control to fire is allowed when there is only 1 player.

### Instruction
Create a browser-based 2D game using Vite, TypeScript, and Phaser 3. The name of the game is Water Balloon Bombardment.

Requirements:
- Landscape support
- 1 to 4 players.
- Bluetooth controller (more than one player) plus touch controls (one player only).
- 4 lanes of path for the bomb to walk.
- When there is only one player the catapult is centered.
- 10 waves of slow walking bomb walking towards the player catapult. The bomb walks faster gradually after each wave.
- First wave will have 20 bombs, and the number grows by 10 after each wave.
- Score, high score in localStorage, pause screen. Players will get 1 point for every bomb they destroy.
- Clean modular structure: src/scenes, src/entities, src/systems, src/assets
- Include npm scripts for dev, build, test, and preview