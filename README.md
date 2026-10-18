# Airship PvP

A browser-based multiplayer airship combat game. Crew up, fly your plane, build
stations, and compete for the capture point.

## Run locally

1. Install [Node.js](https://nodejs.org/) and npm.
2. In a terminal, go to the project directory and install dependencies:

   ```sh
   npm install
   ```

3. Start the game server:

   ```sh
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

To play with others, they need to connect to the same running server. Enter
your crew's invite code in the **Team code** field to join that crew; leave it
blank to start a new crew. The invite code is shown in the team banner after
joining.

## How to play

- Enter a pilot name and select **Join game**.
- Walk around your plane with **WASD**.
- Press **E** near the pilot seat or a turret to use it. Press **E** again to
  leave your current station.
- While piloting, hold **W** to accelerate and use **A/D** to turn. **S**
  applies reverse thrust.
- While mounted at a turret, aim with the mouse and click to fire.
- While walking, select a tile from the build menu (or press **1** for turret,
  **2** for wall, or **3** for generator). Point at an empty spot on your plane
  and press **F** to build it. Building costs resources; your balance and plane
  health are shown in the status bar.
- Fly into the marked capture area and hold it to earn crew score. Enemy ship
  collisions cause impact damage to both planes, with harder impacts dealing
  more damage. Avoid enemy fire and watch the crew leaderboard.
- If your plane is destroyed, use the **Respawn** button on the game-over
  screen. Your crew and score are kept, but crew members return to the fresh
  plane's deck and its resources and installed tiles reset.
- The generator powers flight controls and weapons. If it breaks, the plane
  stops and turrets cannot fire; walk to the generator and press **E** to
  repair it. Crew can still walk around the deck while power is offline.

Each plane's deck appearance is randomly selected from the three available
skins.

## Tests

Run the automated test suite with:

```sh
npm test
```
