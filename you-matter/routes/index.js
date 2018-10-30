const { close, driver } = require('./../neo4j');

var express = require('express');
var router = express.Router();

/* GET tags. */
router.get('/tags', function (req, res) {
    const session = driver.session();
    session
        .run('MATCH (t:Tag) RETURN t')
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

/* GET publication types. */
router.get('/types', function (req, res) {
    const session = driver.session();
    session
        .run('MATCH (p:Publication) RETURN collect(distinct p.type)')
        .then(function (result) {
            let response = [];
            result.records.forEach(function (record) {
              response = record.get(0);
            })
            session.close();
            res.send(response);
        })
        .catch(function (error) {
            console.log(error);
        });
});

module.exports = router;
