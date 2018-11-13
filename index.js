const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const { port, env } = require('./config')

String.prototype.replaceAll = function(search, replacement) {
  var target = this
  return target.replace(new RegExp(search, 'g'), replacement)
}

const getActionActionType = (seq, clientState, message) => {
  if (seq === 1)
    return ['query', 'initiate']

  let action, actionType
  actionType = 'mutation'

  if (!clientState) {
    // At this point,
    // message ==== menuOption === clientState
    // set message as menuOption in app and send same
    // to Hubtel as clientState so we can know
    // what menu to send next request to.
    if (message === '2')
      return [actionType, 'vote']

    // Handle invalid messages (or menu options)
    // e.g. 3, 4, 7 in this mutation
    return [actionType, 'joinTeam']
  }

  if (clientState === '2')
    return [actionType, 'vote']

  // Handle invalid options
  // e.g. 3, 4, 7 in this mutation
  return [actionType, 'joinTeam']
}

const composeRequest = (data) => {
  const json = JSON.parse(data)
  console.log(json)

  const type = json['Type']

  if (type !== 'Timeout') {
    let string = JSON.stringify(json).slice(1, -1)
  
    string = string.replace('"Mobile"', 'phoneNumber')
      .replace('"SessionId"', 'sessionId')
      .replace('"ServiceCode"', 'serviceCode')
      .replace('"Message"', 'message')
      .replace('"Operator"', 'operator')
      .replace('"Sequence"', 'sequence')
      .replace('"ClientState"', 'clientState')
      .replace('"Type"', 'type')
  
    string = string.replaceAll(':', ': ')
      .replaceAll(',', ', ')
      .replaceAll('"', '\\"')

    const seq = json['Sequence']
    const message = json['Message']
    const clientState = json['ClientState']

    let [actionType, action] = getActionActionType(seq, clientState, message)

    console.log('Action type:', actionType)
    console.log('Action:', action)
  
    return `{"query":"${actionType} ${action} {${action}(${string})}"}`
  }
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
      console.log(`${d}`)
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
  // req.on('data', data => (buffer += decoder.write(data)))
  req.on('data', data => {
    buffer += decoder.write(data)
  })

  // until we reach the end of it
  req.on('end', () => {
    buffer += decoder.end()

    // pass in the given data and a callback to handle the response
    handler(buffer, (statusCode, message) => {
      // set a default status code
      statusCode = typeof statusCode === 'number' ? statusCode : 200

      const obj = JSON.parse(message)

      let key
      for (let i in obj.data) {
        key = i
      }

      let r, rType, ClientState
      [r, rType, ClientState] = obj.data[key]

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