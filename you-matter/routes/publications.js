const { close, driver } = require('./../neo4j');

var express = require('express');
var router = express.Router();

router.get('/:id', function (req, res) {
  const session = driver.session();
  session.run(`MATCH (t:Tag)<-[h:HAS]-(p:Publication)-[w:WRITED_BY]->(u:User) WHERE id(p) = ${req.params.id} RETURN p,u,t`)
    .then(function (result) {
      session.close();
      res.send({
        ...result.records[0].get("p").properties,
        writedBy: result.records[0].get("u").properties,
        tags: result.records.map(record => record.get("t").properties),
      });
    })
    .catch(function (error) {
      res.status(500).send("error");
    });
});

/**
 * GET /publications/:id/rates
 * Devuelve todas las reseñas realizadas a una publicacion
 * */
router.get('/:id/rates', function (req, res) {
  const session = driver.session();
  session.run(`MATCH (p:Publication)<-[r:RATES]-(u:User) WHERE id(p) = ${req.params.id} RETURN r,u`)
    .then(function (result) {
      session.close();
      res.send(result.records.map(record => ({
        message: record.get("r").properties.message,
        value: record.get("r").properties.value.low + record.get("r").properties.value.high,
        user: `${record.get("u").properties.name} ${record.get("u").properties.lastName}`,
      })))
    })
    .catch(function (error) {
      res.status(500).send("error");
    });
});

/**
* PUT /publications/:id/rates
* Crea una relacion de tipo rate que permite puntuar la publicacion
* Recibe
* - id: id de publicacion
* - uid: id de usuario
* - value: puntaje otorgado
* - message: comentario
* */
router.put('/:id/rates', function (req, res) {
    const session = driver.session();
    const { username, id, message, value } = req.body;

    session.run(`MATCH (p:Publication), (u:User{username:"${username}"}) WHERE id(p) = ${id} MERGE (u)-[r:RATES{value:${value}, message: "${message}"}]->(p) RETURN r`)
        .then(function (result) {
            session.close();
            res.send(result.records.map(record => record.get("r").properties))
        })
        .catch(function (error) {
            res.status(500).send("error");
        });
});

/**
* GET /publications/:id/rating
* Devuelve el puntaje total de una publicación
* */
router.get('/:id/rating', function (req, res) {
    const session = driver.session();
    session.run(`MATCH (p:Publication)<-[r:RATES]-(:User) WHERE id(p) = ${req.params.id} RETURN AVG(r.value)`)
        .then(function (result) {
            session.close();
            res.send({value: result.records[0].get(0)});
        })
        .catch(function (error) {
            res.status(500).send("error");
        });
});

module.exports = router;
