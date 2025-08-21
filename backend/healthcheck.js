const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Success
  } else {
    process.exit(1); // Failure
  }
});

request.on('error', () => {
  process.exit(1); // Failure
});

request.on('timeout', () => {
  request.destroy();
  process.exit(1); // Failure
});

request.end();