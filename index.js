const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const { port, env } = require('./config')

// Configure the server to respond to all requests with a string
const server = http.createServer((req, res) => {
  const trimmedPath = trimPath(req.url)

  // consume any data that's given and return it in the payload
  const decoder = new StringDecoder('utf-8')
  let buffer = ''

  // Read data into the buffer
  req.on('data', data => (buffer += decoder.write(data)))

  // until we reach the end of it
  req.on('end', () => {
    buffer += decoder.end()

    // Attempt to get handler
    // Use notFound handler if we can't find a handler
    const chosenHandler =
      typeof router[trimmedPath] !== 'undefined'
        ? router[trimmedPath]
        : handlers.notFound

    // pass in the given data and a callback to handle the response
    chosenHandler(buffer, (statusCode, message) => {
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

const trimPath = reqUrl => {
  const parsedUrl = url.parse(reqUrl, true)
  const path = parsedUrl.pathname
  return path.replace(/^\/+|\/+$/g, '')
}

const handlers = {}

handlers.notFound = (data, callback) => callback(404, 'Not Found')

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

handlers.hello = (data, callback) => {
  let string = JSON.stringify(JSON.parse(data))
  string = string.slice(1, -1);
  string = string.replace('"Mobile"', 'Mobile').replace('"SessionId"', 'SessionId')
  string = string.replace('"ServiceCode"', 'ServiceCode').replace('"Message"', 'Message')
  string = string.replace('"Operator"', 'Operator').replace('"Sequence"', 'Sequence')
  string = string.replace('"ClientState"', 'ClientState').replace('"Type"', 'Type')
  string = string.replaceAll(':', ': ')
  string = string.replaceAll(',', ', ')
  string = string.replaceAll('"', '\\"')
  string = '{"query":"query getInitiationResponse {getInitiationResponse(' + string + ')}"}'

  /*
  Construct a string like this:
  '{"query":"query getInitiationResponse {getInitiationResponse(Sequence: 1, Mobile: \"233542751610\", SessionId: \"aeb67d5e6e6b48409ad19a43eaa62b91\", ServiceCode: \"711*78\", Operator: \"MTN\", Message: \"*711*78#\", ClientState: false, Type: \"Initiation\")}"}'
  from this:
  {
    "Type":"Initiation",
    "Mobile":"233244123456",
    "SessionId":"bb3aece1deb543009c9f35b943c74b7f",
    "ServiceCode":"714",
    "Message":"*714#",
    "Operator":"Vodafone",
    "Sequence":1,
    "ClientState":null
  }
  and send as body in post request.
  */

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

const router = {
  hello: handlers.hello
}