document.addEventListener('DOMContentLoaded', async () => {
    const preference = await getPreference();

    const workModeRadios = document.getElementsByName('work-mode');
    const updateOptions = document.getElementById('update-options');
    const tagList = document.getElementById('tag-list');
    const folderList = document.getElementById('folder-list');
    const saveOptionsButton = document.getElementById('save-options');
    const markReadCheckbox = document.getElementById('mark-read');
    const addTagCheckbox = document.getElementById('add-tag');
    const moveCheckbox = document.getElementById('move');

    for (const radio of workModeRadios) {
        if (radio.value === preference.mode) {
            radio.checked = true;
        }
        radio.addEventListener('change', () => {
            if (radio.value === 'update') {
                showAndInitUpdateOptions();
            } else {
                updateOptions.style.display = 'none';
            }
        });
    }

    if (preference.mode === 'update') {
        showAndInitUpdateOptions();
    }

    const tags = await messenger.messages.tags.list();
    const accounts = await messenger.accounts.list(true); // true — включает вложенные папки
    const folders = await getFolderListFromAccounts(accounts);

    for (const tag of tags) {
        const option = document.createElement('option');
        option.value = tag.key;
        option.textContent = tag.tag;
        option.selected = tag.key === preference.tag;
        tagList.appendChild(option);
    }


    for (const folder of folders) {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name + ' (' + accounts.find((a) => a.id === folder.account).name + ')';
        option.selected = folder.id === preference.folder;
        folderList.appendChild(option);
    }

    addTagCheckbox.addEventListener('change', () => {
        if (addTagCheckbox.checked) {
            tagList.style.display = 'block';
        } else {
            tagList.style.display = 'none';
        }
    });

    moveCheckbox.addEventListener('change', () => {
        if (moveCheckbox.checked) {
            folderList.style.display = 'block';
        } else {
            folderList.style.display = 'none';
        }
    });

    saveOptionsButton.addEventListener('click', async (event) => {
        event.preventDefault();

        if (validateFormData()) {
            try {
                const newPreference = getNewPreference();
                await savePreference(newPreference);
            } catch (error) {
                console.error(error);
            }
        }



        async function savePreference(newPreference) {
            try {
                await messenger.storage.local.set(newPreference);
                showStatusMessage("Options saved!", "green");
            } catch (error) {
                console.error(error);
                showStatusMessage("Error: " + error.message, "red");
            }            
        }

        function validateFormData() {
            if (!document.querySelector('input[name="work-mode"]:checked')) {
                showStatusMessage('Work mode should be defined', "red");
                return false;
            }
            if (document.querySelector('input[name="work-mode"]:checked').value === 'update') {
                if (!markReadCheckbox.checked && !addTagCheckbox.checked && !moveCheckbox.checked) {
                    showStatusMessage('Action should be defined', "red");
                    return false;
                }    

                if (addTagCheckbox.checked && !document.getElementById('tag-list')) {
                    showStatusMessage('Tag should be defined', "red");
                    return false;
                }

                if (moveCheckbox.checked && !document.getElementById('folder-list')) {
                    showStatusMessage('Folder should be defined', "red");
                    return false;
                }
            }
            return true;
        }
    });

    function getNewPreference() {
        let mode = preference.mode;
        const selectedWorkMode = document.querySelector('input[name="work-mode"]:checked');
        if (selectedWorkMode) {
            mode = selectedWorkMode.value;
        }

        let read = false;
        if (mode === 'update' && markReadCheckbox.checked) {
            read = true;
        }

        let tag = '';
        if (mode === 'update' && addTagCheckbox.checked) {
            tag = document.getElementById('tag-list').value;
        }

        let folder = '';
        if (mode === 'update' && moveCheckbox.checked) {
            folder = document.getElementById('folder-list').value;
        }

        return {
            mode,
            read,
            tag,
            folder
        };
    }

    function showAndInitUpdateOptions() {
        updateOptions.style.display = 'block';
        if (preference.read) {
            markReadCheckbox.checked = true;
        }
        if (preference.tag) {
            addTagCheckbox.checked = true;
            tagList.style.display = 'block';
            tagList.value = preference.tag;
        }
        if (preference.folder) {
            moveCheckbox.checked = true;
            folderList.style.display = 'block';
            folderList.value = preference.folder;
        }
    }
});

async function getPreference() {
    const defaultPreferences = {
        mode: 'update',
        read: true,
        tag: '',
        folder: '',
    };
    const savedPreferences = await messenger.storage.local.get(['mode', 'read', 'tag', 'folder']);
    return { ...defaultPreferences, ...savedPreferences };
}

async function getFolderListFromAccounts(accounts) {
    const folders = [];
    for (const account of accounts) {
        folders.push(... (await addAccountFolders(account.rootFolder)));
    }
    return folders;
}

async function addAccountFolders(folder) {
    const folderList = [];
    if (!folder.isRoot) {
        folderList.push({ id: folder.id, name: folder.name, account: folder.accountId });
    }
    if (folder.subFolders && folder.subFolders.length > 0) {
        for (const subFolder of folder.subFolders) {
            folderList.push(...(await addAccountFolders(subFolder)));
        }
    }
    return folderList;
}

function showStatusMessage(text, color) {
    const statusEl = document.getElementById("status-message");
    statusEl.textContent = text;
    statusEl.style.color = color;
    statusEl.style.display = "block";
    setTimeout(() => {
        statusEl.style.display = "none";
    }, 2000);
}
