const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const { port, env } = require('./config')

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

const sequenceActionMap = {
  1: "query initiate"
}

const composeRequest = (data) => {
  const json = JSON.parse(data)
  console.log(json)

  const seq = json['Sequence']
  let string = JSON.stringify(json).slice(1, -1)

  string = string.replace('"Mobile"', 'Mobile')
    .replace('"SessionId"', 'SessionId')
    .replace('"ServiceCode"', 'ServiceCode')
    .replace('"Message"', 'Message')
    .replace('"Operator"', 'Operator')
    .replace('"Sequence"', 'Sequence')
    .replace('"ClientState"', 'ClientState')
    .replace('"Type"', 'Type')
    // .replace('""', 'null')

  if (string.includes('""'))
    string = string.replace('""', 'null')

  string = string.replaceAll(':', ': ')
    .replaceAll(',', ', ')
    .replaceAll('"', '\\"')

  let actionType, action
  [actionType, action] = sequenceActionMap[seq].split(' ')

  return `{"query":"${actionType} ${action} {${action}(${string})}"}`
}

const objToArray = (obj) => {
  let arr = []
  for(var i in obj)
    arr.push(obj[i][0])
    arr.push(obj[i][1])
    arr.push(obj[i][2])
  return arr
}

const handler = (data, callback) => {
  // {"Type":"Initiation","Mobile":"233542751610","SessionId":"ed38b7e7b0ca4c11af699b63da1aa1ae",
  // "ServiceCode":"711*79","Message":"*711*79#","Operator":"mtn","Sequence":1,"ClientState":""}
  const string = composeRequest(data)
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

      const obj = JSON.parse(message)
      let r, rType, ClientState
      [r, rType, ClientState] = objToArray(obj.data)

      const response = {
        'Message': r,
        'Type': rType,
        'ClientState': ClientState
      }

      // send a JSON response with the status code and the given message
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(JSON.stringify(response))
    })
  })
})

// Start the server
server.listen(port, () =>
  console.log(`Running on ${env} environment on port ${port}`)
)