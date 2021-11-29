/**
 * User Controller
 * 사용자 정보 컨트롤러
 * */

const approot = require("app-root-path");
const esService = require(`${approot}/utils/elasticsearch.service`);

const moment = require("moment");
const chat_log = async (req, res, next) => {
    const indexName = "chat_log";
    const docType = "_doc";
    const payload = {
        size: 10000,
        query: {
            match: {
                time: moment().format("YYYY-MM-DD"),
            },
        },
        sort: [
            {
                timestamp: {
                    order: "asc",
                },
            },
        ],
    };
    const scrollTime = "1m";
    const total = [];
    const result = await esService.scrollSearch(
        indexName,
        docType,
        payload,
        scrollTime
    );

    for (let i = 0; i < result.hits.hits.length; i++) {
        total.push(result.hits.hits[i]._source);
    }
    if (total.length < result.hits.total) {
        const scrollResult = await esService.scroll(
            scrollTime,
            result._scroll_id
        );
        for (let i = 0; i < scrollResult.hits.hits.length; i++) {
            total.push(scrollResult.hits.hits[i]._source);
        }
    }

    res.send(total);
};
module.exports = {
    chat_log,
};
