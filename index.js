const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const { port, env } = require('./config')

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

const handler = (data, callback) => {
  let string = JSON.stringify(JSON.parse(data)).slice(1, -1)

  string = string.replace('"Mobile"', 'Mobile')
    .replace('"SessionId"', 'SessionId')
    .replace('"ServiceCode"', 'ServiceCode')
    .replace('"Message"', 'Message')
    .replace('"Operator"', 'Operator')
    .replace('"Sequence"', 'Sequence')
    .replace('"ClientState"', 'ClientState')
    .replace('"Type"', 'Type')

  string = string.replaceAll(':', ': ')
    .replaceAll(',', ', ')
    .replaceAll('"', '\\"')

  string = '{"query":"query getInitiationResponse {getInitiationResponse(' + string + ')}"}'

  const https = require('https')

  const options = {
    hostname: 'graphql-meteor-deone.c9users.io',
    port: 443,
    path: '/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': string.length
    }
  }

  const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`)
  
    res.on('data', (d) => {
      // process.stdout.write(d)
      callback(200, `${d}`)
    })
  })
  
  req.on('error', (error) => {
    console.error(error)
  })
  
  req.write(string)
  req.end()
}

// Configure the server to respond to all requests with a string
const server = http.createServer((req, res) => {
  // consume any data that's given and return it in the payload
  const decoder = new StringDecoder('utf-8')
  let buffer = ''

  // Read data into the buffer
  req.on('data', data => (buffer += decoder.write(data)))

  // until we reach the end of it
  req.on('end', () => {
    buffer += decoder.end()

    // pass in the given data and a callback to handle the response
    handler(buffer, (statusCode, message) => {
      // set a default status code
      statusCode = typeof statusCode === 'number' ? statusCode : 200

      let obj = JSON.parse(message)

      // send a JSON response with the status code and the given message
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(obj.data['getInitiationResponse'])
    })
  })
})

// Start the server
server.listen(port, () =>
  console.log(`Running on ${env} environment on port ${port}`)
)