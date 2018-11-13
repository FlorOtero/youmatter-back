const { driver, close } = require('./../neo4j');

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    const session = driver.session();
    session.run('MATCH(n:User) RETURN n')
        .then(function (result) {
            let nodes = [];
            result.records.forEach(function (record) {
                nodes.push(record.get(0).properties);
            })
            session.close();
            res.send(nodes);
        })
        .catch(function (error) {
            console.log(error);
        });
});

/* GET single user by username */
router.get('/:username', function (req, res) {
    const session = driver.session();
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
        })
        .catch(function (error) {
            console.log(error);
        });
});

/* GET interest of username */
router.get('/:username/interests', function (req, res) {
    const session = driver.session();
    session
      .run('MATCH(n:User)-[:INTERESTED_IN]-(t:Tag) WHERE n.username = $username RETURN t', {username: req.params.username})
      .then(function (result) {
          let nodes = [];
          result.records.forEach(function (record) {
              nodes.push(record.get(0).properties);
          })
          session.close();
          res.send(nodes);
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

    console.log(user);

    const session = driver.session();
    session
        .run('CREATE (u:User {username:$username, name:$name, lastName:$lastName, email:$email, password:$password}) return ID(u)',
            {username:user.username, name: user.name, lastName: user.lastName, email: user.email, password: user.password})
        .then(function (result) {
            let singleRecord = result.records[0];
            let node = singleRecord.get(0);

            const relations = user.tags.map((tag) => 
              session.run('MATCH (u:User {username: $username}), (t:Tag {name: $tag}) MERGE (u)-[:INTERESTED_IN]->(t)', {username: user.username, tag:tag})
            );

            Promise.all(relations).then(values => { 
              res.send(user);
              session.close();
            }, reason => {
              console.log(reason)
            });
        })
        .catch(function (error) {
            console.log(error);
        })

});

/*
* PUT /users/{username}/publication
Crea publicación. Tiene type, tags, title, body
*/
router.put('/:username/publication', function (req, res) {
  const session = driver.session();
  let user = req.params.username;
  let publication = req.body;
  const promises = [];

  console.log(user);
  console.log(publication);
    
  promises.push(session.run('CREATE (p:Publication {type: $type, title:$title, body:$body}) return ID(p)', {type: publication.type, title:publication.title, body:publication.body}));

  //todo matchear por el id
  publication.tags.forEach(function (tag) {
    promises.push(session.run('MATCH (p:Publication {title:$title}), (t:Tag {name: $tag}) MERGE (p)-[:HAS]->(t)', {title: publication.title, tag: tag}));
  })

  //todo optimizar queries
  promises.push(session.run('MATCH (u:User {username: $username}), (p:Publication {title: $title}) MERGE (u)-[:WRITES]->(p)', {username: user, title: publication.title}));
  promises.push(session.run('MATCH (p:Publication {title: $title}), (u:User {username: $username}) MERGE (p)-[:WRITED_BY]->(u)', {title: publication.title, username: user}));

  Promise.all(promises).then(() => { 
    res.status(200).send('Ok');
  }).catch(() => {
    res.status(500).send('Algo salió mal');
  });
})

/*
* GET /users/{username}/publication
* Obtiene las publicaciones realizadas por un usuario
*/

router.get('/:username/publication', function (req, res) {

    let user = req.params.username;

    const session = driver.session();
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
    const tag = req.query.tag;
    const nodes = [];

    const session = driver.session();
        session.run(`MATCH (u:User{username:$username})-[:INTERESTED_IN]->(t:Tag)<-[:HAS]-(p:Publication${tag ? '{type:$tag}': ''}) RETURN p.title,p.body,p.type,id(p),collect(distinct t.name) AS tags`, {username: user, tag})
            .then(function (result) {
                if (result.records.length == 0) {
                    res.send(null);
                } else {
                    let related = [];
                    result.records.forEach(function (record) {
                        related.push({
                          id: record.get('id(p)').low,
                          title: record.get('p.title'),
                          body: record.get('p.body'),
                          type: record.get('p.type'),
                          tags: record.get('tags').join(', '),
                        });
                    })
                    session.close();
                    res.send(related);
                }
                
            }).catch(function (error) {
              console.log(error);
            })
});

router.get('/:username/search/:search', function (req, res) {

  let user = req.params.username;
  let search = req.params.search;
  const tag = req.query.tag;
  const nodes = [];

  const session = driver.session();
      session.run(`MATCH (u:User{username:$username})-[:INTERESTED_IN]->(t:Tag)<-[:HAS]-(p:Publication${tag ? '{type:$tag}': ''}) where lower(p.title) contains lower($search) or lower(p.body) contains lower($search) RETURN p.title,p.body,p.type,id(p),collect(distinct t.name) AS tags`, {username: user, search, tag})
          .then(function (result) {
              if (result.records.length == 0) {
                  res.send(null);
              } else {
                  let related = [];
                  result.records.forEach(function (record) {
                      related.push({
                        title: record.get('p.title'),
                        body: record.get('p.body'),
                        type: record.get('p.type'),
                        tags: record.get('tags').join(', '),
                      });
                  })
                  session.close();
                  res.send(related);
              }
              
          }).catch(function (error) {
            console.log(error);
          })
});

module.exports = router;
