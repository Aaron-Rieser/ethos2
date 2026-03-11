// Mention suggestions helper
(function () {
    let mentionDropdown;
    let activeInput = null;
    let suggestions = [];
    let selectedIndex = -1;
    let fetchTimeout = null;

    function ensureDropdown() {
        if (!mentionDropdown) {
            mentionDropdown = document.createElement('div');
            mentionDropdown.className = 'mention-dropdown';
            mentionDropdown.style.position = 'absolute';
            mentionDropdown.style.zIndex = '2000';
            mentionDropdown.style.background = '#111';
            mentionDropdown.style.border = '1px solid #333';
            mentionDropdown.style.borderRadius = '6px';
            mentionDropdown.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
            mentionDropdown.style.padding = '4px 0';
            mentionDropdown.style.minWidth = '160px';
            mentionDropdown.style.display = 'none';
            document.body.appendChild(mentionDropdown);
        }
    }

    function hideDropdown() {
        if (mentionDropdown) {
            mentionDropdown.style.display = 'none';
        }
        activeInput = null;
        suggestions = [];
        selectedIndex = -1;
    }

    function positionDropdown(input) {
        ensureDropdown();
        const rect = input.getBoundingClientRect();
        mentionDropdown.style.left = rect.left + window.scrollX + 'px';
        mentionDropdown.style.top = rect.bottom + window.scrollY + 4 + 'px';
        mentionDropdown.style.width = rect.width + 'px';
    }

    function renderDropdown() {
        ensureDropdown();
        if (!suggestions.length || !activeInput) {
            hideDropdown();
            return;
        }

        mentionDropdown.innerHTML = '';

        suggestions.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'mention-item';
            item.textContent = user.username;
            item.style.padding = '6px 10px';
            item.style.cursor = 'pointer';
            item.style.fontSize = '14px';
            item.style.color = '#fff';
            item.style.background = index === selectedIndex ? '#3388ff' : 'transparent';

            item.addEventListener('mouseenter', () => {
                selectedIndex = index;
                renderDropdown();
            });

            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                applyMention(user.username);
            });

            mentionDropdown.appendChild(item);
        });

        mentionDropdown.style.display = 'block';
    }

    function findMentionFragment(input) {
        const value = input.value;
        const caret = input.selectionStart;
        const textBefore = value.slice(0, caret);
        const atIndex = textBefore.lastIndexOf('@');

        if (atIndex === -1) return null;

        // Ensure there is no whitespace between @ and caret
        const fragment = textBefore.slice(atIndex);
        if (/\s/.test(fragment)) return null;

        const query = fragment.slice(1); // without @
        return {
            start: atIndex,
            end: caret,
            query
        };
    }

    async function fetchSuggestions(query) {
        try {
            if (!window.auth0Client || !await window.auth0Client.isAuthenticated()) {
                return [];
            }
            const token = await window.auth0Client.getTokenSilently();
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                console.error('Mention search failed', await response.text());
                return [];
            }
            return await response.json();
        } catch (err) {
            console.error('Error fetching mention suggestions:', err);
            return [];
        }
    }

    function applyMention(username) {
        if (!activeInput) return;
        const fragment = findMentionFragment(activeInput);
        if (!fragment) return;

        const value = activeInput.value;
        const before = value.slice(0, fragment.start);
        const after = value.slice(fragment.end);
        const insertion = '@' + username + ' ';

        const newValue = before + insertion + after;
        activeInput.value = newValue;

        const newCaret = before.length + insertion.length;
        activeInput.setSelectionRange(newCaret, newCaret);
        activeInput.focus();

        hideDropdown();
    }

    function handleKeyDown(e) {
        if (!mentionDropdown || mentionDropdown.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!suggestions.length) return;
            selectedIndex = (selectedIndex + 1) % suggestions.length;
            renderDropdown();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!suggestions.length) return;
            selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
            renderDropdown();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                e.preventDefault();
                applyMention(suggestions[selectedIndex].username);
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
        }
    }

    async function handleInput(e) {
        const input = e.target;
        activeInput = input;

        const fragment = findMentionFragment(input);
        if (!fragment || !fragment.query.length) {
            hideDropdown();
            return;
        }

        // Debounce requests
        if (fetchTimeout) {
            clearTimeout(fetchTimeout);
        }
        fetchTimeout = setTimeout(async () => {
            suggestions = await fetchSuggestions(fragment.query);
            selectedIndex = suggestions.length ? 0 : -1;
            if (!suggestions.length) {
                hideDropdown();
                return;
            }
            positionDropdown(input);
            renderDropdown();
        }, 200);
    }

    function attachMentionHandlers(input) {
        if (!input || input._mentionsBound) return;
        input._mentionsBound = true;

        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (!mentionDropdown || !mentionDropdown.contains(document.activeElement)) {
                    hideDropdown();
                }
            }, 150);
        });
    }

    // Expose a function to attach mention behavior
    window.enableMentionsForInput = attachMentionHandlers;
})();

