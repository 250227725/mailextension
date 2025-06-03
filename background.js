messenger.folders.onFolderInfoChanged.addListener(async (folder, folderInfo) => {
    console.log('Folder info has been changed');
    const newMessages = await getNewMessagesFromFolder(folder);
    await handleNewMessages(newMessages);

});


messenger.messages.onNewMailReceived.addListener(async (folder, newMessageList) => {
    console.log('New messages have been received');
    const newMessages = newMessageList.messages;
    await handleNewMessages(newMessages);
}, true);


async function handleNewMessages(newMessages) {
    const actions = await getActions();
    for (const newMessage of newMessages) {
        if (await lookupDuplicate(newMessage)) {
            for (const { action, option } of actions) {
                await updateNewMessage(newMessage, action, option);
            }
        }
    }
};


async function getActions() {
    const defaultPreferences = {
        mode: 'update',
        read: true,
        tag: '',
        folder: '',
    };
    const loadPreferences = await messenger.storage.local.get(['mode', 'read', 'tag', 'folder']);
    const preferences = { ...defaultPreferences, ...loadPreferences };
    const actions = [];
    if (preferences.mode === 'delete') {
        actions.push({ action: 'delete' });
    } else {
        if (preferences.read) actions.push({ action: 'markRead' });
        if (preferences.tag) actions.push({ action: 'addTag', option: preferences.tag });
        if (preferences.folder) actions.push({ action: 'move', option: preferences.folder });
    }
    return actions;
}


async function lookupDuplicate(newMessage) {
    const messages = await getMessagesFromDB(newMessage);
    if (messages.length > 0) {
        for (const message of messages) {
            if (checkMessageForDuplicate(newMessage, message)) {
                return true;
            }
        }
    }
    return false;
}


function getMessagesFromDB(message) {
    const TIME_OFFSET = 5 * 60 * 1000;
    return messenger.messages
        .query({
            accountId: message.folder.accountId,
            author: message.author,
            fromDate: new Date(message.date.getTime() - TIME_OFFSET),
            headerMessageId: message.headerMessageId,
            messagesPerPage: 2,
            subject: message.subject,
        })
        .then((savedMessages) => {
            return savedMessages.messages;
        })
        .catch((error) => {
            console.log('Error while find messages from DB:', error);
            return [];
        });
}


function getNewMessagesFromFolder(folder) {
    const TIME_OFFSET = 30 * 60 * 1000;
    return messenger.messages
        .query({
            accountId: folder.accountId,
            folderId: folder.id,
            fromDate: new Date(Date.now() - TIME_OFFSET),
            read: false,
            messagesPerPage: 30,
        })
        .then((savedMessages) => {
            return savedMessages.messages;
        })
        .catch((error) => {
            console.log('Error while find messages from DB:', error);
            return [];
        });
}


function checkMessageForDuplicate(newMessage, message) {
    return newMessage.id > message.id;
}


async function updateNewMessage(newMessage, action = 'skip', option = '') {
    if (action === 'addTag') {
        await messenger.messages.update(newMessage.id, { tags: [option] });
    } else if (action === 'delete') {
        await messenger.messages.update(newMessage.id, { read: true });
        await messenger.messages.delete([newMessage.id], false);
    } else if (action === 'move') {
        await messenger.messages.move([newMessage.id], option);
    } else if (action === 'markRead') {
        await messenger.messages.update(newMessage.id, { read: true });
    }
    console.log('New message (id:', newMessage.id, ') has been ', action);
}
