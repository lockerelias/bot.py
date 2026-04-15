const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Roblox Account Generator Bot is running!');
});

app.listen(port, () => {
  console.log(`✅ Web server listening on port ${port}`);
});
