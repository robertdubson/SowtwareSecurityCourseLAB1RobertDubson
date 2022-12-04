const uuid = require('uuid');
const express = require('express');
const cookieParser = require('cookie-parser');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const SESSION_KEY = 'session';

// defining of the session class
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
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8'); // writing session to json file
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
        res.set('Set-Cookie', `${SESSION_KEY}=${sessionId}; HttpOnly`);
        this.set(sessionId); // we send info about session inside a cookie file which will be stored in our browser

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
        res.set('Set-Cookie', `${SESSION_KEY}=; HttpOnly`); // we delete session 
    }
}

const sessions = new Session(); // creating new session object

app.use((req, res, next) => {
    let currentSession = {};
    let sessionId;

    if (req.cookies[SESSION_KEY]) {
        sessionId = req.cookies[SESSION_KEY];
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});

app.get('/', (req, res) => {
    console.log(req.session);

    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html')); // we send index.html as a response
})

app.get('/logout', (req, res) => { // if we send logout request we destrou the session
    sessions.destroy(req, res);
    res.redirect('/');
});

// define list of our users
const users = [
    {
        login: 'Robert',
        password: 'Dubson',
        username: 'Username',
    },
    {
        login: 'IT93',
        password: 'FICT',
        username: 'Username1',
    }
]

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    const user = users.find((user) => {
        if (user.login == login && user.password == password) {
            return true; // we return true if password and ligin are correct
        }
        return false
    });

    if (user) {
        req.session.username = user.username;
        req.session.login = user.login; // if user logs in succeffully we write his info into json

        res.json({ username: login });
    }

    res.status(401).send(); // we send 401 code which means that user is authorised
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`) // we define a port which has to be listened to by our server
})
