browser.messages.onNewMailReceived.addListener(async (folder, newMessageList) => {
    for (const newMessage of newMessageList.messages) {
        if (await lookupDuplicate(newMessage)) {
            updateNewMessage(newMessage);
        } else {
            skipNewMessage(newMessage);
        }
    }
 });

async function lookupDuplicate(newMessage) {
    const messages = await getMessagesFromBD(newMessage);
    if (Array.isArray(messages) && messages.length > 0) {
        for (const message of messages) {
            if (checkMessageForDuplicate(newMessage, message)) {
                 return true;
            }
        }
    }
    return false;
}

function getMessagesFromBD(message) {
    return browser.messages.query({
        accountId: message.folder.accountId,
        author: message.author,
        fromDate: new Date(message.date.getTime() - 5 * 60 * 1000),
        headerMessageId: message.headerMessageId,
        messagesPerPage: 10,
        subject: message.subject,
    }).then((savedMessages) => {
        return savedMessages.messages;
    }).catch((error) => {
        console.log('Error while find messages from DB:', error)
    });    
}

function checkMessageForDuplicate(newMessage, message) {
    return newMessage.id > message.id;
}

function updateNewMessage(newMessage, actionType = 'skip', option = '') {
    actionType = 'skip'; //debug
    option = newMessage.folder.accountId + '://Archive'; //debug
    option = 'duplicate';

    if (actionType === 'addTag') {
        browser.messages.update(newMessage.id, { tags: [option] });
    }
    else if (actionType === 'delete') {
        browser.messages.update(newMessage.id, { read: true });
        browser.messages.delete([newMessage.id], false);
    }
    else if (actionType === 'move') {
        browser.messages.move([newMessage.id], option);
    }
    else if (actionType === 'markRead') {
        browser.messages.update(newMessage.id, { read: true });
    }

    console.log('New message (id:', newMessage.id, ') has been ', actionType);
}

function skipNewMessage(newMessage) {
    console.log('New message (id:', newMessage.id, ') has been skipped');
}
