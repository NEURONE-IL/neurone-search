import express from 'express';

const app = express();
const port = 3001;
app.get('/', (req, res) => {
    res.send(`This is the neurone-search backend on port ${port}!`);
});
app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});