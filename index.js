// Setup basic express server
const express = require("express");
const app = express();
const path = require("path");
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const moment = require("moment");

const configfile = require("./.config/config.json");
const runmode = configfile.runmode;
const config = configfile[runmode];

const esService = require("./utils/elasticsearch.service");

const port = process.env.PORT || config.EXPRESS_PORT;

server.listen(port, () => {
    console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static(path.join(__dirname, "public")));

//moment().format("MM-DD-YYYY");

app.post("/chat_log", async (req, res) => {
    const indexName = "chat_log";
    const docType = "_doc";
    const payload = {
        size: 10000,
        query: {
            term: {
                timestamp: {
                    value: moment().format("YYYY-MM-DD"),
                },
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
});
let numUsers = 0;

io.on("connection", async (socket) => {
    // elasticSearch.ping();
    let addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on("new message", async (message, time) => {
        // we tell the client to execute 'new message'

        const indexName = "chat_log";
        const docType = "_doc";
        const payload = {
            user_name: socket.username,
            message: message,
            timestamp: time,
        };

        await esService.addDocument(indexName, docType, payload);

        socket.broadcast.emit("new message", {
            username: socket.username,
            message: message,
            time: time,
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on("add user", async (username) => {
        if (addedUser) return;

        console.log(username);
        if (username == "remove") {
            const indexName = "chat_log";
            const docType = "_doc";
            const payload = {
                query: {
                    match_all: {},
                },
            };

            await esService.deletebyquery(indexName, docType, payload);
        }

        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit("login", {
            numUsers: numUsers,
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit("user joined", {
            username: socket.username,
            numUsers: numUsers,
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on("typing", () => {
        socket.broadcast.emit("typing", {
            username: socket.username,
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on("stop typing", () => {
        socket.broadcast.emit("stop typing", {
            username: socket.username,
        });
    });

    // when the user disconnects.. perform this
    socket.on("disconnect", () => {
        if (addedUser) {
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit("user left", {
                username: socket.username,
                numUsers: numUsers,
            });
        }
    });
});
