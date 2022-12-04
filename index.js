const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())
const ACCESS_TOKEN_SECRET = require('crypto').randomBytes(64).toString('hex')
dotenv.config();
const SESSION_KEY = 'Authorization';



class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8'); // method for storing a session
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) { 
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session(); // creating new session object


app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res); // if there were not any sessions before, we call init method of session class
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession); // after session is finished we write session info into session.json
    });

    next();
});

app.get('/', (req, res) => {
    if (req.session.username) { // if username is not empty we set variables of username and logout request
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html')); // to send index.html as a response
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res); // if server revceives logout request we destroy current session and redirect user to login page
    res.redirect('/');
});

// here we define list of users
const users = [
    {
        login: 'Robert',
        password: 'Dubson',
        username: 'Robert_Dubson',
    },
    {
        login: 'IT93',
        password: 'FICT',
        username: 'Username1',
    }
]

// what happens we tru to log in
app.post('/api/login', (req, res) => {
    const { login, password } = req.body; // here we get login and password from the request body

    const user = users.find((user) => {
        if (user.login == login && user.password == password) {
            return true; // return true if inserted login and password are correct
        }
        return false
    });
    // if login was successfull we set variables into session information and sign JW token
    if (user) {
        req.session.username = user.username; 
        req.session.login = user.login;
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {

            expiresIn: '24h' // expires in 24 hours

             })
        res.json({ token: accessToken }); // here we are sending our token inside response body
    }

    res.status(401).send();
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
