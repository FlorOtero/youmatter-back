const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("youmatter", "youmatter"));
const session = driver.session();

var express = require('express');
var router = express.Router();

/* GET tags. */
router.get('/tags', function (req, res) {
    session
        .run('MATCH (t:Tag) RETURN t')
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

/* GET publication types. */
router.get('/types', function (req, res) {
    session
        .run('MATCH (p:Publication) RETURN collect(distinct p.type)')
        .then(function (result) {
            let nodes = [];
            result.records.forEach(function (record) {
                nodes.push(record.get(0));
            })
            session.close();
            driver.close();
            res.send(nodes);
        })
        .catch(function (error) {
            console.log(error);
        });
});

module.exports = router;
