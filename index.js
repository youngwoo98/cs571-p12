
// You MUST have a file called "token.secret" in the same directory as this file!
// This should be the secret token found in https://dashboard.ngrok.com/
// Make sure it is on a single line with no spaces!
// It will NOT be committed.

// TO START
//   1. Open a terminal and run 'npm start'
//   2. Open another terminal and run 'npm run tunnel'
//   3. Copy/paste the ngrok HTTPS url into the DialogFlow fulfillment.
//
// Your changes to this file will be hot-reloaded!

import fetch from 'node-fetch';
import fs from 'fs';
import ngrok from 'ngrok';
import morgan from 'morgan';
import express from 'express';

// Read and register with secret ngrok token.
ngrok.authtoken(fs.readFileSync("token.secret").toString().trim());

// Start express on port 53705
const app = express();
const port = 53705;

// Accept JSON bodies and begin logging.
app.use(express.json());
app.use(morgan(':date ":method :url" :status - :response-time ms'));

// "Hello World" endpoint.
// You should be able to visit this in your browser
// at localhost:53705 or via the ngrok URL.
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({
    msg: 'Express Server Works!'
  }))
})

// Dialogflow will POST a JSON body to /.
// We use an intent map to map the incoming intent to
// its appropriate async functions below.
// You can examine the request body via `req.body`
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_request
app.post('/', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  // A map of intent names to callback functions.
  // The "HelloWorld" is an example only -- you may delete it.
  const intentMap = {
    "HelloWorld": doHelloWorld,
    "Number of Users": doNumUsers,
    "Number of Posts": doNumPosts,
    "Get Posts": doGetPosts,
  }

  if (intent in intentMap) {
    // Call the appropriate callback function
    intentMap[intent](req, res);
  } else {
    // Uh oh! We don't know what to do with this intent.
    // There is likely something wrong with your code.
    // Double-check your names.
    console.error(`Could not find ${intent} in intent map!`)
    res.status(404).send(JSON.stringify({ msg: "Not found!" }));
  }
})

// Open for business!
app.listen(port, () => {
  console.log(`DialogFlow Handler listening on port ${port}. Use 'npm run tunnel' to expose this.`)
})

// Your turn!
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_response
// Use `res` to send your response; don't return!

async function doHelloWorld(req, res) {
  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            `I didn't get that. Do you want to get a number of users or posts?`
          ]
        }
      }
    ]
  })
}

async function doNumUsers(req, res) {
  const resp = await fetch('https://www.cs571.org/s23/hw12/api/numUsers', { headers: { "X-CS571-ID": "bid_c49825b5bd469d794555" } });
  const num = await resp.json();

  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            `There are ${num.users} users registered on BadgerChat!`
          ]
        }
      }
    ]
  })
}

async function doNumPosts(req, res) {
  const params = req.body.queryResult.parameters;
  let result = "";
  if (params.chatroom) {
    const resp = await fetch(`https://www.cs571.org/s23/hw12/api/chatroom/${params.chatroom}/numMessages`, { headers: { "X-CS571-ID": "bid_c49825b5bd469d794555" } });
    const num = await resp.json();
    result = `There are ${num.messages} messages in ${params.chatroom}!`;
  } else {
    const resp = await fetch('https://www.cs571.org/s23/hw12/api/numMessages', { headers: { "X-CS571-ID": "bid_c49825b5bd469d794555" } });
    const num = await resp.json();
    result = `There are ${num.messages} messages on BadgerChat!`;
  }


  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            result
          ]
        }
      }
    ]
  })
}

async function doGetPosts(req, res) {
  const params = req.body.queryResult.parameters;
  const resp = await fetch(`https://www.cs571.org/s23/hw12/api/chatroom/${params.chatroom}/messages`, { headers: { "X-CS571-ID": "bid_c49825b5bd469d794555" } });
  const message = await resp.json();
  const cards = [];
  let num = 1;
  if (params.number) {
    if (params.number <= 5) {
      num = params.number;
    }
    else if (params.number > 5) {
      num = 5;
    }
  }

  cards.push({
    text: {
      text: [
        `Here are the latest ${num} messages from ${params.chatroom}!`
      ]
    }
  })
  for (let i = 0; i < num; i++) {
    cards.push({
      card: {
        title: `${message.messages[i].title}`,
        subtitle: `${message.messages[i].content}`,
        buttons: [
          {
            text: "READ MORE",
            postback: `https://cs571.org/s23/badgerchat/chatrooms/${params.chatroom}/messages/${message.messages[i].id}`
          }
        ]
      }
    })
  }


  console.log(message.messages[0].title);
  res.status(200).send({
    fulfillmentMessages: cards
  })

}