browser.messages.onNewMailReceived.addListener(async (folder, newMessageList) => {
    const actions = await getActionSettings();

    for (const newMessage of newMessageList.messages) {
        if (await lookupDuplicate(newMessage)) {
            for (const { action, option } of actions) {
                updateNewMessage(newMessage, action, option);
            }
        }
    }
});

async function getActionSettings() {
    const savedPreferences = await browser.storage.local.get(['mode', 'read', 'tag', 'folder']);
    if (!savedPreferences) {
        return;
    }

    const actions = [];
    if (savedPreferences.mode === 'delete') {
        actions.push({ action: 'delete' });
    } else {
        if (savedPreferences.read) {
            actions.push({ action: 'markRead' });
        }
        if (savedPreferences.tag) {
            actions.push({ action: 'addTag', option: savedPreferences.tag });
        }
        if (savedPreferences.folder) {
            actions.push({ action: 'move', option: savedPreferences.folder });
        }
    }
    return actions;
}

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
    return browser.messages
        .query({
            accountId: message.folder.accountId,
            author: message.author,
            fromDate: new Date(message.date.getTime() - 5 * 60 * 1000),
            headerMessageId: message.headerMessageId,
            messagesPerPage: 10,
            subject: message.subject,
        })
        .then((savedMessages) => {
            return savedMessages.messages;
        })
        .catch((error) => {
            console.log('Error while find messages from DB:', error);
        });
}

function checkMessageForDuplicate(newMessage, message) {
    return newMessage.id > message.id;
}

function updateNewMessage(newMessage, action = 'skip', option = '') {
    if (action === 'addTag') {
        browser.messages.update(newMessage.id, { tags: [option] });
    } else if (action === 'delete') {
        browser.messages.update(newMessage.id, { read: true });
        browser.messages.delete([newMessage.id], false);
    } else if (action === 'move') {
        browser.messages.move([newMessage.id], option);
    } else if (action === 'markRead') {
        browser.messages.update(newMessage.id, { read: true });
    }

    console.log('New message (id:', newMessage.id, ') has been ', action);
}

