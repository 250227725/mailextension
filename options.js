document.addEventListener('DOMContentLoaded', async () => {
    // get saved preferences
    const preference = await getPreference();

    // const optionsForm = document.getElementById('options-form');
    const workModeRadios = document.getElementsByName('work-mode');
    const updateOptions = document.getElementById('update-options');
    const tagList = document.getElementById('tag-list');
    const folderList = document.getElementById('folder-list');
    const saveOptionsButton = document.getElementById('save-options');
    const markReadCheckbox = document.getElementById('mark-read');
    const addTagCheckbox = document.getElementById('add-tag');
    const moveCheckbox = document.getElementById('move');

    // Init interface
    workModeRadios.forEach((radio) => {
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
    });

    if (preference.mode === 'update') {
        showAndInitUpdateOptions();
    }

    // populate tags and folders lists
    
    const tags = await browser.messages.tags.list();
    const accounts = await browser.accounts.list(true); // true — включает вложенные папки
    const folders = await getFolderListFromAccounts(accounts);

    tags.forEach((tag) => {
        const option = document.createElement('option');
        option.value = tag.key;
        option.textContent = tag.tag;
        option.selected = tag.key === preference.tag;
        tagList.appendChild(option);
    });


    folders.forEach((folder) => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name + ' (' + accounts.find((a) => a.id === folder.account).name + ')';
        option.selected = folder.id === preference.folder;
        folderList.appendChild(option);
    });

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

    // save options
    saveOptionsButton.addEventListener('click', async () => {
        if (validation()) {
            await savePreference();
            alert('Options saved successfully!');
        }        

        async function savePreference() {
            // await browser.storage.local.set({
            //     workMode,
            //     addTag,
            //     move,
            //     read,
            //     selectedTag,
            //     selectedFolder,
            // });
            // console.log('Данные сохранены', workMode,
            //     addTag,
            //     move,
            //     read,
            //     selectedTag,
            //     selectedFolder);
        }

        function validation() {
            // validation
            // if (workMode === 'update' && !(addTag || move || read)) {
            //     alert('Please select at least one action type');
            //     return;
            // }
            // if (addTag && !selectedTag) {
            //     alert('Please select a tag');
            //     return;
            // }
            // if (move && !selectedFolder) {
            //     alert('Please select a folder');
            //     return;
            // }            
            return true;
        }
    });

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
        tag: 'duplicate',
        folder: '1',
    };
    const savedPreferences = await browser.storage.local.get(['mode', 'read', 'tag', 'folder']);
    return { ...savedPreferences, ...defaultPreferences };
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
