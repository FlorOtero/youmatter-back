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

router.get('/:id/rates', function (req, res) {
  const session = driver.session();
  session.run(`MATCH (p:Publication)<-[r:RATES]-(:User) WHERE id(p) = ${req.params.id} RETURN r`)
    .then(function (result) {
      session.close();
      res.send(result.records.map(record => record.get("r").properties))
    })
    .catch(function (error) {
      res.status(500).send("error");
    });
});

module.exports = router;
