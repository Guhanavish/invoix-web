'use strict';

const { createApp } = require('./app');

const app = createApp();
const { PORT, WEB_DIR } = require('./config');

app.listen(PORT, () => {
  console.log(`Invoix web server running at http://localhost:${PORT}`);
  console.log(`Web build dir: ${WEB_DIR}`);
  console.log(`Downloads dir: ${require('./config').DOWNLOADS_DIR}`);
});
