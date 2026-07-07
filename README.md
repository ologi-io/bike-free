# Play Bike Free

Standalone Node/Express app for `playbike.free`.

## Local

Use Node `25.9.0`; `.nvmrc` pins the local version.

```bash
nvm use
npm install
npm run dev
```

Open `http://localhost:5177`.

`npm run dev` starts Express and watches `public/game/js/**`, rebuilding `public/game/dist/bikefree.js` from `public/game/js/main.js`.

## Credits

Bike Free's game engine is adapted from [basicallydan/skifree.js](https://github.com/basicallydan/skifree.js), created by Dan Hough and contributors.
