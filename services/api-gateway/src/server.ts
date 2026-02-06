import app from './app';

const port = process.env.API_GATEWAY_PORT || 3000;

app.listen(port, () => {
  console.log('Gateway Service is running on port ' + port);
});
