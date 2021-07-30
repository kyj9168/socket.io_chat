const approot = require("app-root-path");
const express = require("express");
const path = require("path");
const router = express.Router();
const apiController = require(`${approot}/routes/controller/api.controller`);
const esService = require(`${approot}/utils/elasticsearch.service`);

router.post("/chat_log", apiController.chat_log);

router.all("/", function (req, res, next) {
    res.render("index");
});
module.exports = router;
