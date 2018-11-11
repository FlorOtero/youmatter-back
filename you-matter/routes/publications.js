const { close, driver } = require('./../neo4j');

var express = require('express');
var router = express.Router();

router.get('/:id', function (req, res) {
  const session = driver.session();
  session.run(`MATCH (p:Publication) WHERE id(p) = ${req.params.id} RETURN p`)
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

module.exports = router;
