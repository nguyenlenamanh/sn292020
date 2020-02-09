const express = require('express');
const app = express();
const shortid = require('shortid');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');

require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var neo4j = require('neo4j-driver')

var driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', '123456')
)
var session = driver.session()

app.get('/', (req, res) => {
    res.send('Hello');
})

// Companies Queries

app.post('/companies/new', (req, res) => {

    var params = {
        rid: shortid.generate(),
        name: req.body.name,
        field: req.body.field,
        location: req.body.location,
        bio: req.body.bio,
        base_in: req.body.base_in,
        contact: req.body.contact,
        website: req.body.website,
        address: req.body.address,
        working_hours: req.body.working_hours
    };

    const cypher = 'CREATE (c:Company {rid: $rid, name: $name, bio: $bio, field: $field, location: $location, created: timestamp(), base_in: $base_in, contact: $contact, website: $website, followed: 0, address: $address, working_hours: $working_hours }) RETURN c'
    session.run(cypher,params)
        .then(result => {
            const re = result.records[0].get('c');
            console.log(re);
            res.sendStatus(200).end(re.properties);
        })
        .catch(e => {
            console.log(e);
        })
})

app.get('/companies/:rid', (req, res) => {
    var rid = req.params.rid;

    const cypher = 'MATCH (c:Company {rid: $rid}) RETURN c'
    session.run(cypher, {rid: rid})
        .then(result => {
            const re = result.records[0].get('c');
            console.log(re);
            res.send(re.properties);
        })
        .catch(e => {
            console.log(e);
        })
})

// Users Queries

app.post('/users/new', (req, res) => {

    var params = {
        rid: shortid.generate(),
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        location: req.body.location,
        about: req.body.about,
        interested_in: req.body.interested_in,
        job: req.body.job,
    };

    const cypher = 'CREATE (c:Person {rid: $rid, email: $email, password: $password, name: $name, location: $location, created: timestamp(), about: $about, interested_in: $interested_in, job: $job}) RETURN c'
    session.run(cypher,params)
        .then(result => {
            const re = result.records[0].get('c');
            console.log(re);
            res.sendStatus(200).end(re.properties);
        })
        .catch(e => {
            console.log(e);
        })
})

app.get('/users/:rid', (req, res) => {
    var rid = req.params.rid;

    const cypher = 'MATCH (c:Person {rid: $rid}) RETURN c'
    session.run(cypher, {rid: rid})
        .then(result => {
            const re = result.records[0].get('c');
            console.log(re);
            res.send(re.properties);
        })
        .catch(e => {
            console.log(e);
        })
        .then(() => {
            return session.close();
        })
        .then(() => {
            return driver.close();
        });
})

// Follow Queries

app.get('/follows/:fid',verifyToken, (req,res) => {
    var fid = req.params.fid;
    var userid = req.authData.rid;

    if(fid == userid) res.sendStatus(404);

    const cypher = 'MATCH (f:Person {rid: $fid}), (u:Person {rid: $userid}) MERGE (u)-[r:FOLLOWS]-(f) RETURN r';
    const params = {fid: fid, userid: userid};

    session.run(cypher,params)
    .then(result => {
        const re = result.records[0].get('r');
        console.log(re);
        res.sendStatus(200).end(re.properties);
    })
    .catch(e => {
        console.log(e);
        res.sendStatus(404);
    })

})

app.get('/unfollows/:fid',verifyToken, (req,res) => {
    var fid = req.params.fid;
    var userid = req.authData.rid;

    if(fid == userid) res.sendStatus(404);

    const cypher = 'MATCH (f:Person {rid: $fid}), (u:Person {rid: $userid}), (u)-[r:FOLLOWS]->(f) DELETE r';
    const params = {fid: fid, userid: userid};

    session.run(cypher,params)
    .then(result => {
        res.sendStatus(200);
    })
    .catch(e => {
        console.log(e);
        res.sendStatus(404);
    })
})

// Authentication Middleware

function verifyToken(req,res,next) {
    var bearerToken = req.headers['authorization'];

    if(typeof bearerToken === 'undefined') {
        res.sendStatus(403);
    }else {
        var token = bearerToken.split(' ')[1];

        jwt.verify(token,process.env.SERCET_TOKEN_KEY,(err,authData) => {
            if(err) res.sendStatus(403);
            else {
                req.authData = authData;
                next();
            }
        })
    }
}

// Authentication Login

app.get('/auth/login',(req,res) => {
    var email = req.body.email;
    var pw = req.body.password;

    //db check
    const cypher = 'MATCH (c:Person {email: $email}) RETURN c'
    session.run(cypher, {email: email})
        .then(result => {
            const re = result.records[0].get('c');
            console.log(re.properties);

            if(re.properties.password === pw) {
                var token = jwt.sign({rid: re.properties.rid, name: re.properties.name, email: re.properties.email}, process.env.SERCET_TOKEN_KEY);
                res.json(token);
            }
            else res.sendStatus(401);
        })
        .catch(e => {
            console.log(e);
            res.sendStatus(401);
        })
})


app.listen(3000, () => {
    console.log("App start at 3000");
})
