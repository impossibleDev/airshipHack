# Skybound showdown

A browser-based multiplayer airship combat game. Crew up, fly your plane, build
stations, and compete for the capture point.

## Live Game Server
https://skybound-showdown.onrender.com/

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

## Tests

Run the automated test suite with:

```sh
npm test
```
