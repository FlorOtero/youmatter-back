const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("youmatter", "youmatter"));
const session = driver.session();

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    session
        .run('MATCH(n:User) RETURN n')
        .then(function (result) {
            let nodes = [];
            result.records.forEach(function (record) {
                nodes.push(record.get(0).properties);
            })
            session.close();
            driver.close();
            res.send(nodes);
        })
        .catch(function (error) {
            console.log(error);
        });
});

/* GET single user by username */
router.get('/:username', function (req, res) {
    session
        .run('MATCH(n:User) WHERE n.username = $username RETURN n', {username: req.params.username})
        .then(function (result) {
            if (result.records.length == 0) {
                res.send(null);
            } else {
                let singleRecord = result.records[0];
                let node = singleRecord.get(0);
                res.send(node.properties);
            }
            session.close();
            driver.close();
        })
        .catch(function (error) {
            console.log(error);
        });
});

/* PUT user registration
* Registra un usuario. Recibe username, name, surname, email, password y tags
*/
//todo validar que el usuario y los tags no existan previamente y si existen asociarlos
router.put('/', function (req, res){

    let user = req.body;

    session
        .run('CREATE (u:User {username:$username, name:$name, lastName:$lastName, email:$email, password:$password}) return ID(u)',
            {username:user.username, name: user.name, lastName: user.lastName, email: user.email, password: user.password})
        .then(function (result) {
            let singleRecord = result.records[0];
            let node = singleRecord.get(0);
            console.log(node.properties);
            session.close();
            driver.close();
        })
        .catch(function (error) {
            console.log(error);
        })

    user.tags.forEach(function(tag){
        console.log(tag);
        session
            .run('MATCH (u:User {username: $username}), (t:Tag {name: $tag}) MERGE (u)-[:Interests]->(t)', {username: user.username, tag:tag})
            .then(function () {
                session.close();
                driver.close();
            });
    });

});

/*
* PUT /users/{username}/publication
Crea publicación. Tiene type, tags, title, body
*/
router.put('/:username/publication', function (req, res) {

    let user = req.params.username;
    let publication = req.body;

    console.log(user);
    console.log(publication);

    session
        .run('CREATE (p:Publication {type: $type, title:$title, body:$body}) return ID(p)', {type: publication.type, title:publication.title, body:publication.body})
        .then(function (result) {
            let singleRecord = result.records[0];
            const node = singleRecord.get(0);
            console.log(node);
            session.close();
            driver.close();
        })
        .catch(function (error) {
            console.log(error);
        })

    //todo matchear por el id
    publication.tags.forEach(function (tag) {
        session
            .run('MATCH (p:Publication {title:$title}), (t:Tag {name: $tag}) MERGE (p)-[:HAS]->(t)', {title: publication.title, tag: tag})
            .then(function () {
                session.close();
                driver.close();
            });
    })

    //todo optimizar queries
    session.run('MATCH (u:User {username: $username}), (p:Publication {title: $title}) MERGE (u)-[:WRITES]->(p)', {username: user, title: publication.title})
        .then(function () {
            session.close();
            driver.close();
        });

    session.run('MATCH (p:Publication {title: $title}), (u:User {username: $username}) MERGE (p)-[:WRITED_BY]->(u)', {title: publication.title, username: user})
        .then(function () {
            session.close();
            driver.close();
        });

})

/*
* GET /users/{username}/publication
* Obtiene las publicaciones realizadas por un usuario
*/

router.get('/:username/publication', function (req, res) {

    let user = req.params.username;

    session
        .run('MATCH (u:User)-[:WRITES]->(p:Publication) WHERE u.username = $username RETURN p', {username: user})
        .then(function (result) {
            if (result.records.length == 0) {
                res.send(null);
            } else {
                let nodes = [];
                result.records.forEach(function (record) {
                    nodes.push(record.get(0).properties);
                })
                res.send(nodes);
            }
            session.close();
            driver.close();
        })
        .catch(function (error) {
            console.log(error);
        })
});

/*
* GET /users/{username}/related
* Obtiene publicaciones recientes relacionadas con los intereses del usuario
*/

router.get('/:username/related', function (req, res) {

    let user = req.params.username;
    const nodes = [];

    session
        .run('MATCH (u:User)-[:Interests]->(t:Tag) WHERE u.username = $username RETURN t', {username: user})
        .then(function (result) {
            if (result.records.length == 0) {
                res.send(null);
            } else {
                result.records.forEach(function (record) {
                    nodes.push(record.get(0).properties.name);
                })
            }

            session.run('MATCH (p:Publication)-[:HAS]->(t:Tag) WHERE t.name IN $nodes RETURN p', {nodes: nodes})
                .then(function (result) {
                    if (result.records.length == 0) {
                        res.send(null);
                    } else {
                        let related = [];
                        result.records.forEach(function (record) {
                            related.push(record.get(0).properties);
                        })
                        console.log(related);
                        res.send(related);
                    }
                    session.close();
                    driver.close();
                })

        })
        .catch(function (error) {
            console.log(error);
        });

});

module.exports = router;
