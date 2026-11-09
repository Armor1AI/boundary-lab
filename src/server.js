import { app } from './app.js';

const port = Number(process.env.PORT || 4300);
app.listen(port, '127.0.0.1', () => {
  console.log(`Dispatch manifest at http://127.0.0.1:${port}/shipments`);
});
