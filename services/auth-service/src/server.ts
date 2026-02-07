import app from './app';

const port = process.env.AUTH_SERVICE_PORT || 3001;

app.listen(port, () => {
  console.log('Auth service is running on port ' + port);
});
