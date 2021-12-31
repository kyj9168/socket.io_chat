$(function () {
    const FADE_TIME = 150; // ms
    const TYPING_TIMER_LENGTH = 400; // ms
    const COLORS = ['#a26360', '#d8dfcb', '#6d7d7b', '#d4a29c', '#edcc8b'];

    // Initialize variables
    const $window = $(window);
    const $usernameInput = $('.usernameInput'); // Input for username
    const $messages = $('.messages'); // Messages area
    const $inputMessage = $('.inputMessage'); // Input message input box

    const $loginPage = $('.login.page'); // The login page
    const $chatPage = $('.chat.page'); // The chatroom page

    const socket = io();

    // Prompt for setting a username
    let username;
    let connected = false;
    let typing = false;
    let lastTypingTime;
    let $currentInput = $usernameInput.focus();

    $.ajax({
        url: '/chat_log', // 클라이언트가 요청을 보낼 서버의 URL 주소
        data: { data: 'data' }, // HTTP 요청과 함께 서버로 보낼 데이터
        type: 'POST', // HTTP 요청 방식(GET, POST)
        dataType: 'json', // 서버에서 보내줄 데이터의 타입
    })
        .done(function (json) {
            let html = ``;
            for (let val of json) {
                html += `<li class="message left"">
                <span class="username" style="color: #ccc;">${val.user_name}</span>
                <span class="messageBody left">${val.message}</span>
                <p class="time left">${moment(val.timestamp).format('a hh:mm')}</p></li>`;
            }

            $('.messages').append(html);

            console.log(json);
        })
        .fail(function (xhr, status, errorThrown) {});

    const addParticipantsMessage = (data) => {
        let message = '';
        if (data.numUsers === 1) {
            message += `1명 접속중`;
        } else {
            message += `${data.numUsers}명 접속중`;
        }
        log(message);
    };

    // Sets the client's username
    const setUsername = () => {
        username = cleanInput($usernameInput.val().trim());

        // If the username is valid
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        }
    };

    // Sends a chat message
    const sendMessage = () => {
        let message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            addChatMessageRight({ username, message });
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', message, moment().format('YYYY-MM-DD HH:mm:ss'));
        }
    };

    // Log a message
    const log = (message, options) => {
        const $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    };

    const addChatMessageRight = (data, options = {}) => {
        // Don't fade the message in if there is an 'X was typing'
        const $typingMessages = getTypingMessages(data);
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        const $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        const $messageBodyDiv = $('<span class="messageBody right">').text(data.message);

        const typingClass = data.typing ? 'typing' : '';
        const $messageDiv = $('<li class="message right"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv, `<p class="time right">${date()}</p>`);

        addMessageElement($messageDiv, options);
    };

    // Adds the visual chat message to the message list
    const addChatMessageLeft = (data, options = {}) => {
        // Don't fade the message in if there is an 'X was typing'
        const $typingMessages = getTypingMessages(data);
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        const $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        const $messageBodyDiv = $('<span class="messageBody left">').html(data.message);

        const typingClass = data.typing ? 'typing' : '';
        const $messageDiv = $('<li class="message left"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv, `<p class="time left">${moment(data.time).format('a hh:mm')}</p>`);

        addMessageElement($messageDiv, options);
    };

    // Adds the visual chat typing message
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = `<div class="loader">
        <div></div>
        <div></div>
        <div></div>
      </div>`;
        addChatMessageLeft(data);
    };

    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    };

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    const addMessageElement = (el, options) => {
        const $el = $(el);
        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }

        // $messages.stop().animate(
        //     {
        //         scrollTop: $messages[0].scrollHeight,
        //     },
        //     100
        // );

        $messages[0].scrollTop = $messages[0].scrollHeight;
    };

    // Prevents input from having injected markup
    const cleanInput = (input) => {
        return $('<div/>').text(input).html();
    };

    // Updates the typing event
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = new Date().getTime();

            setTimeout(() => {
                const typingTimer = new Date().getTime();
                const timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    };

    const date = () => {
        return moment().format('a hh:mm');
    };

    // Gets the 'X is typing' messages of a user
    const getTypingMessages = (data) => {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    };

    // Gets the color of a username through our hash function
    const getUsernameColor = (username) => {
        // Compute hash code
        let hash = 7;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        const index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    };

    // Keyboard events

    $window.keydown((event) => {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });

    // Click events

    // Focus input when clicking anywhere on login page
    $loginPage.click(() => {
        $currentInput.focus();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(() => {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        const message = '이슈 토론방에 오신걸 환영합니다.';
        log(message, {
            prepend: false,
        });
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', (data) => {
        addChatMessageLeft(data);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', (data) => {
        log(`${data.username}님 입장`);
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', (data) => {
        log(`${data.username}님이 떠났습니다.`);
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', (data) => {
        addChatTyping(data);
    });
    socket.on('keyword', (data) => {
        let buckets = data.result.aggregations.myagg.buckets;
        let resultArr = '';
        let num = 1;
        for (let i in buckets) {
            if (buckets[i].messageAggs.buckets[0].key == 'true') {
                resultArr += num + '.' + buckets[i].key + ':' + buckets[i].doc_count + '<br>';
                num++;
            }

            if (i == 10) break;
        }
        // console.log(resultArr);
        $('.pop_keyword_div').html(resultArr);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });

    socket.on('disconnect', () => {
        log('연결이 끊겼습니다.');
    });

    socket.on('reconnect', () => {
        log('다시 연결되었습니다.');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', () => {
        log('재연결이 실패하였습니다.');
    });
});
