// Запуск скрипта Spatium OS
(function initSpatiumOS() {
    document.addEventListener('DOMContentLoaded', () => {
        const screen = document.getElementById('screen');
        const glitchLine = document.getElementById('glitchLine');
        const bootContainer = document.getElementById('bootContainer');
        const progressFill = document.getElementById('progressFill');
        const terminalContainer = document.getElementById('terminalContainer');
        const terminalOutput = document.getElementById('terminalOutput');
        const commandInputText = document.getElementById('commandInputText');
        const hiddenInput = document.getElementById('hiddenInput'); // <-- Для мобильной клавиатуры

        // Элементы плеера и логотипа
        const logoWrapper = document.getElementById('logoWrapper');
        const musicPlayerModal = document.getElementById('musicPlayerModal');
        const playerCloseBtn = document.getElementById('playerCloseBtn');
        const btnPlayPause = document.getElementById('btnPlayPause');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnMute = document.getElementById('btnMute');
        const seekBar = document.getElementById('seekBar');
        const volumeBar = document.getElementById('volumeBar');
        const currentTimeEl = document.getElementById('currentTime');
        const durationTimeEl = document.getElementById('durationTime');
        const trackNameEl = document.getElementById('trackName');
        const playlistContainer = document.getElementById('playlistContainer');

        let isBooted = false;
        let isTyping = false;
        let currentInput = '';
        
        let isSpatiEnabled = false;
        let isHackerMode = false;
        let hackerInterval = null;

        let currentTypingTimeout = null;
        let currentTypingCallback = null;
        let activeTypingLine = null;
        let fullTypingText = '';

        // ==========================================
        // СОХРАНЕНИЕ, ДОСТИЖЕНИЯ, ИСТОРИЯ, TAB
        // ==========================================
        const STORE_KEY = 'spatium_os_v1';
        const HISTORY_LIMIT = 50;

        function freshState() {
            return { ach: {}, shown: {}, history: [], stats: { visits: 0, colors: [], tracks: [], spatiTalks: 0 } };
        }

        function loadState() {
            const st = freshState();
            try {
                const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
                if (saved && typeof saved === 'object') {
                    if (saved.ach && typeof saved.ach === 'object') st.ach = saved.ach;
                    if (saved.shown && typeof saved.shown === 'object') st.shown = saved.shown;
                    if (Array.isArray(saved.history)) st.history = saved.history.filter(x => typeof x === 'string').slice(-HISTORY_LIMIT);
                    if (saved.stats && typeof saved.stats === 'object') {
                        st.stats.visits = Number(saved.stats.visits) || 0;
                        st.stats.spatiTalks = Number(saved.stats.spatiTalks) || 0;
                        if (Array.isArray(saved.stats.colors)) st.stats.colors = saved.stats.colors;
                        if (Array.isArray(saved.stats.tracks)) st.stats.tracks = saved.stats.tracks;
                    }
                }
            } catch (err) { /* localStorage недоступен: работаем без сохранения */ }
            return st;
        }

        const state = loadState();
        function saveState() {
            try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
        }

        const ACHIEVEMENTS = [
            { id: 'boot',       title: 'ДОБРО ПОЖАЛОВАТЬ', desc: 'Запусти Spatium OS' },
            { id: 'first_cmd',  title: 'ПЕРВЫЙ ШАГ',       desc: 'Выполни любую команду' },
            { id: 'help',       title: 'ЧИТАТЕЛЬ',         desc: 'Открой справку' },
            { id: 'color',      title: 'ДИЗАЙНЕР',         desc: 'Смени цветовую схему' },
            { id: 'rainbow',    title: 'РАДУГА',           desc: 'Попробуй 5 разных цветов' },
            { id: 'hacker',     title: 'ХАКЕР',            desc: 'Запусти режим хакера' },
            { id: 'player',     title: 'ДИДЖЕЙ',           desc: 'Открой аудиоплеер' },
            { id: 'console_dj', title: 'КОНСОЛЬНЫЙ ДИДЖЕЙ', desc: 'Управляй плеером из терминала' },
            { id: 'melomaniac', title: 'МЕЛОМАН',          desc: 'Послушай все треки' },
            { id: 'history',    title: 'ПАМЯТЬ',           desc: 'Вызови прошлую команду стрелкой вверх' },
            { id: 'tab',        title: 'АВТОДОПОЛНЕНИЕ',   desc: 'Нажми Tab при вводе команды' },
            { id: 'regular',    title: 'ПОСТОЯННЫЙ ГОСТЬ', desc: 'Загляни в систему 3 раза' },
            { id: 'off',        title: 'ДО СВИДАНИЯ',      desc: 'Выключи систему командой off' },
            { id: 'spati',      title: 'ПЕРВЫЙ КОНТАКТ',   desc: 'Разбуди Спати', hidden: true },
            { id: 'chatty',     title: 'БОЛТЛИВЫЙ',        desc: 'Задай Спати 5 вопросов', hidden: true },
            { id: 'crash',      title: 'СБОЙ СИСТЕМЫ',     desc: 'Спроси Спати о запретном', hidden: true }
        ];
        const achById = {};
        ACHIEVEMENTS.forEach(a => { achById[a.id] = a; });

        const achToast = document.getElementById('achToast');
        const achCountEl = document.getElementById('achCount');
        const toastQueue = [];
        let toastBusy = false;

        function updateAchCount() {
            if (achCountEl) achCountEl.textContent = `${Object.keys(state.ach).filter(id => achById[id]).length}/${ACHIEVEMENTS.length}`;
        }

        function nextToast() {
            const def = toastQueue.shift();
            if (!def || !achToast) { toastBusy = false; return; }
            toastBusy = true;
            achToast.querySelector('.ach-name').textContent = def.title;
            achToast.querySelector('.ach-desc').textContent = def.desc;
            achToast.classList.add('show');
            setTimeout(() => {
                achToast.classList.remove('show');
                setTimeout(nextToast, 450);
            }, 3500);
        }

        function enqueueToast(def) {
            toastQueue.push(def);
            if (!toastBusy) nextToast();
        }

        // deferToast: окно уведомления покажем при следующей загрузке (перед перезагрузкой страницы)
        function unlock(id, deferToast) {
            if (!achById[id] || state.ach[id]) return;
            state.ach[id] = Date.now();
            state.shown[id] = !deferToast;
            saveState();
            updateAchCount();
            if (!deferToast) enqueueToast(achById[id]);
        }

        function showPendingToasts() {
            let changed = false;
            ACHIEVEMENTS.forEach(a => {
                if (state.ach[a.id] && !state.shown[a.id]) {
                    state.shown[a.id] = true;
                    changed = true;
                    enqueueToast(a);
                }
            });
            if (changed) saveState();
        }

        state.stats.visits++;
        unlock('boot', true);
        if (state.stats.visits >= 3) unlock('regular', true);
        saveState();
        updateAchCount();

        function resetAchievements() {
            state.ach = {};
            state.shown = {};
            state.stats.colors = [];
            state.stats.tracks = [];
            state.stats.spatiTalks = 0;
            saveState();
            updateAchCount();
        }

        // ----- ввод и история -----
        function setInput(value) {
            currentInput = value;
            if (hiddenInput) hiddenInput.value = value;
            if (commandInputText) commandInputText.textContent = value;
        }

        let histIndex = state.history.length;
        let histDraft = '';

        function pushHistory(cmd) {
            if (state.history[state.history.length - 1] !== cmd) {
                state.history.push(cmd);
                if (state.history.length > HISTORY_LIMIT) state.history.shift();
                saveState();
            }
            histIndex = state.history.length;
            histDraft = '';
        }

        function historyNav(dir) {
            if (!state.history.length) return;
            if (histIndex === state.history.length) histDraft = currentInput;
            histIndex = Math.min(state.history.length, Math.max(0, histIndex + dir));
            if (histIndex === state.history.length) {
                setInput(histDraft);
            } else {
                setInput(state.history[histIndex]);
                unlock('history');
            }
        }

        // ----- Tab-автодополнение -----
        const TAB_COMMANDS = ['help', 'clear', 'time', 'date', 'echo', 'color', 'hacker', 'history', 'ach',
            'off', 'play', 'pause', 'next', 'prev', 'tracks', 'vol', 'mute', 'player'];

        function tabCandidates(tokens) {
            if (tokens.length === 1) {
                const list = TAB_COMMANDS.slice();
                if (isSpatiEnabled) list.push('спати');
                return list;
            }
            const cmd = tokens[0].toLowerCase();
            if (cmd === 'color') return Object.keys(colorPalette).concat(['clear', 'reset']);
            if (cmd === 'ach') return ['reset'];
            if (cmd === 'history') return ['clear'];
            if (cmd === 'play') return playlist.map((_, i) => String(i + 1));
            return [];
        }

        function commonPrefix(list) {
            let pref = list[0];
            for (const item of list) {
                while (!item.startsWith(pref)) pref = pref.slice(0, -1);
            }
            return pref;
        }

        function handleTab() {
            if (isTyping || isHackerMode) return;
            unlock('tab');
            const lead = currentInput.match(/^\s*/)[0];
            const tokens = currentInput.slice(lead.length).split(' ');
            const last = tokens[tokens.length - 1].toLowerCase();
            const matches = tabCandidates(tokens).filter(c => c.startsWith(last));
            if (!matches.length) return;
            const head = lead + tokens.slice(0, -1).map(t => t + ' ').join('');
            if (matches.length === 1) {
                setInput(head + matches[0] + ' ');
                return;
            }
            const pref = commonPrefix(matches);
            if (pref.length > last.length) {
                setInput(head + pref);
            } else {
                printTextInstant(`> ${currentInput}`);
                printTextInstant(matches.join('  '));
            }
        }

        // ==========================================
        // ПЛЕЙЛИСТ И ФОНОВАЯ МУЗЫКА
        // ==========================================
        const playlist = [
            { title: "Console OST", src: "music/console_ost.mp3" },
            { title: "Server OST 1", src: "music/server_ost1.mp3" },
            { title: "Server OST 2", src: "music/server_ost2.mp3" },
            { title: "Server OST 3", src: "music/server_ost3.mp3" },
            { title: "Server OST 4", src: "music/server_ost4.mp3" },
            { title: "Server OST 5", src: "music/server_ost5.mp3" }
        ];

        let currentTrackIndex = 0;
        const bgAudio = new Audio();
        bgAudio.volume = 0.009; 

        let audioShouldPlay = false;
        let audioStarted = false;

        function loadTrack(index) {
            currentTrackIndex = index;
            bgAudio.src = playlist[currentTrackIndex].src;
            if (trackNameEl) {
                trackNameEl.textContent = `${currentTrackIndex + 1}. ${playlist[currentTrackIndex].title}`;
            }
            renderPlaylist();
        }

        function renderPlaylist() {
            if (!playlistContainer) return;
            playlistContainer.innerHTML = '';
            playlist.forEach((track, idx) => {
                const item = document.createElement('div');
                item.className = `playlist-item ${idx === currentTrackIndex ? 'active' : ''}`;
                item.textContent = `${idx + 1}. ${track.title}`;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    loadTrack(idx);
                    bgAudio.play();
                    audioStarted = true;
                    updatePlayButtonState();
                });
                playlistContainer.appendChild(item);
            });
        }

        loadTrack(0);

        function tryPlayAudio() {
            if (!audioStarted && audioShouldPlay) {
                bgAudio.play().then(() => {
                    audioStarted = true;
                    updatePlayButtonState();
                    removeAudioUnlockListeners();
                }).catch(() => {});
            }
        }

        function removeAudioUnlockListeners() {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        }

        function unlockAudio() {
            tryPlayAudio();
        }

        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        setTimeout(() => {
            audioShouldPlay = true;
            tryPlayAudio();
        }, 1000);

        // ==========================================
        // ЛОГИКА АУДИОПЛЕЕРА
        // ==========================================
        function toggleAudioPlayer(e) {
            if (e) e.stopPropagation();
            if (!isBooted) return;
            musicPlayerModal.classList.toggle('hidden');
            if (!musicPlayerModal.classList.contains('hidden')) unlock('player');
        }

        function updatePlayButtonState() {
            if (btnPlayPause) {
                btnPlayPause.textContent = bgAudio.paused ? 'PLAY' : 'PAUSE';
            }
        }

        function formatTime(seconds) {
            if (isNaN(seconds)) return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        if (logoWrapper) logoWrapper.addEventListener('click', toggleAudioPlayer);

        if (playerCloseBtn) {
            playerCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                musicPlayerModal.classList.add('hidden');
            });
        }

        if (musicPlayerModal) {
            musicPlayerModal.addEventListener('click', (e) => e.stopPropagation());
        }

        if (btnPlayPause) {
            btnPlayPause.addEventListener('click', () => {
                if (bgAudio.paused) {
                    bgAudio.play();
                    audioStarted = true;
                } else {
                    bgAudio.pause();
                }
                updatePlayButtonState();
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                let prevIdx = currentTrackIndex - 1;
                if (prevIdx < 0) prevIdx = playlist.length - 1;
                loadTrack(prevIdx);
                bgAudio.play();
                audioStarted = true;
                updatePlayButtonState();
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                let nextIdx = (currentTrackIndex + 1) % playlist.length;
                loadTrack(nextIdx);
                bgAudio.play();
                audioStarted = true;
                updatePlayButtonState();
            });
        }

        if (btnMute) {
            btnMute.addEventListener('click', () => {
                bgAudio.muted = !bgAudio.muted;
                btnMute.textContent = bgAudio.muted ? 'MUTED' : 'VOL';
            });
        }

        if (volumeBar) {
            volumeBar.value = bgAudio.volume;
            volumeBar.addEventListener('input', (e) => {
                bgAudio.volume = parseFloat(e.target.value);
                if (bgAudio.muted && bgAudio.volume > 0) {
                    bgAudio.muted = false;
                    btnMute.textContent = 'VOL';
                }
            });
        }

        if (seekBar) {
            seekBar.addEventListener('input', (e) => {
                if (bgAudio.duration) {
                    bgAudio.currentTime = (parseFloat(e.target.value) / 100) * bgAudio.duration;
                }
            });
        }

        bgAudio.addEventListener('timeupdate', () => {
            if (bgAudio.duration) {
                const progress = (bgAudio.currentTime / bgAudio.duration) * 100;
                if (seekBar) seekBar.value = progress;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(bgAudio.currentTime);
                if (durationTimeEl) durationTimeEl.textContent = formatTime(bgAudio.duration);
            }
        });

        bgAudio.addEventListener('ended', () => {
            let nextIdx = (currentTrackIndex + 1) % playlist.length;
            loadTrack(nextIdx);
            bgAudio.play();
        });

        bgAudio.addEventListener('playing', () => {
            if (!state.stats.tracks.includes(currentTrackIndex)) {
                state.stats.tracks.push(currentTrackIndex);
                saveState();
            }
            if (state.stats.tracks.length >= playlist.length) unlock('melomaniac');
        });

        // Цвета
        const colorPalette = {
            green: { color: '#33ff33', glow: 'rgba(51, 255, 51, 0.6)', bg: '#001100' },
            matrix: { color: '#00ff66', glow: 'rgba(0, 255, 102, 0.7)', bg: '#000f05' },
            amber: { color: '#ffb000', glow: 'rgba(255, 176, 0, 0.6)', bg: '#140c00' },
            red: { color: '#ff3333', glow: 'rgba(255, 51, 51, 0.6)', bg: '#110000' },
            cyberpunk: { color: '#ff0055', glow: 'rgba(255, 0, 85, 0.7)', bg: '#140005' },
            blue: { color: '#3388ff', glow: 'rgba(51, 136, 255, 0.6)', bg: '#000811' },
            cyan: { color: '#33ffff', glow: 'rgba(51, 255, 255, 0.6)', bg: '#001111' },
            purple: { color: '#cc33ff', glow: 'rgba(204, 51, 255, 0.6)', bg: '#0e0011' },
            white: { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)', bg: '#111111' }
        };

        const spatiSingleReplies = [
            "СПАТИ: Я тут", "СПАТИ: На связи", "СПАТИ: Чего?", "СПАТИ: Слушаю", "СПАТИ: Звал?",
            "СПАТИ: Тут я, тут", "СПАТИ: Да?", "СПАТИ: Внимание на экран", "СПАТИ: Ась?", "СПАТИ: Готов к работе"
        ];

        function startBootSequence() {
            const duration = 1000;
            const intervalTime = 20;
            const totalSteps = duration / intervalTime;
            let currentStep = 0;

            const bootInterval = setInterval(() => {
                currentStep++;
                const progress = Math.min(100, Math.floor((currentStep / totalSteps) * 100));
                if (progressFill) progressFill.style.width = `${progress}%`;

                if (currentStep >= totalSteps) {
                    clearInterval(bootInterval);
                    setTimeout(() => {
                        if (bootContainer) bootContainer.classList.add('fade-out');
                        setTimeout(() => {
                            if (bootContainer) bootContainer.style.display = 'none';
                            if (terminalContainer) terminalContainer.classList.remove('hidden');
                            isBooted = true;
                            showPendingToasts();
                            if (hiddenInput) hiddenInput.focus(); // Вызываем фокус после загрузки
                        }, 400);
                    }, 150);
                }
            }, intervalTime);
        }

        startBootSequence();

        // ==========================================
        // ЛОГИКА ВВОДА И КЛИКОВ (АДАПТИРОВАНО ПОД МОБИЛКИ)
        // ==========================================
        window.addEventListener('click', (e) => {
            if (!screen || screen.classList.contains('crt-off')) return;

            // Пропуск печати текста
            if (isTyping && currentTypingTimeout) {
                clearTimeout(currentTypingTimeout);
                if (activeTypingLine) activeTypingLine.textContent = fullTypingText;
                isTyping = false;
                currentTypingTimeout = null;
                activeTypingLine = null;
                scrollToBottom();
                if (currentTypingCallback) {
                    const cb = currentTypingCallback;
                    currentTypingCallback = null;
                    cb();
                }
                return;
            }

            if (isHackerMode) {
                stopHackerMode();
                return;
            }

            // Кнопки быстрых клавиш (мобильная панель) обрабатываются отдельно
            if (e.target.closest && e.target.closest('.quick-keys')) return;

            // Фокус на инпут при клике по экрану (вызывает клавиатуру на мобилках)
            if (isBooted && !isTyping && hiddenInput && !musicPlayerModal.contains(e.target) && e.target !== logoWrapper) {
                hiddenInput.focus();
            }

            screen.classList.remove('shake');
            void screen.offsetWidth; 
            screen.classList.add('shake');
        });

        // Обработка нативного инпута (работает и на ПК, и на мобилках идеально)
        if (hiddenInput) {
            hiddenInput.addEventListener('input', (e) => {
                currentInput = e.target.value;
                if (commandInputText) commandInputText.textContent = currentInput;
            });

            hiddenInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (isTyping) return;
                    if (e.key === 'Tab') handleTab();
                    else historyNav(e.key === 'ArrowUp' ? -1 : 1);
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isTyping) return; // Блокируем отправку пока терминал печатает
                    const commandToExecute = currentInput;
                    currentInput = '';
                    hiddenInput.value = '';
                    if (commandInputText) commandInputText.textContent = '';
                    if (commandToExecute.trim() !== '') {
                        pushHistory(commandToExecute.trim());
                        handleCommand(commandToExecute);
                    }
                }
            });
        }

        // Страховочный keydown для ПК, если инпут потерял фокус
        window.addEventListener('keydown', (e) => {
            if (isHackerMode) {
                stopHackerMode();
                e.preventDefault();
                return;
            }

            // Быстрая прокрутка анимации печати по пробелу/энтеру
            if (isTyping && currentTypingTimeout && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                clearTimeout(currentTypingTimeout);
                if (activeTypingLine) activeTypingLine.textContent = fullTypingText;
                isTyping = false;
                currentTypingTimeout = null;
                activeTypingLine = null;
                scrollToBottom();
                if (currentTypingCallback) {
                    const cb = currentTypingCallback;
                    currentTypingCallback = null;
                    cb();
                }
                return;
            }

            if (!isBooted || isTyping) return;
            if (e.ctrlKey || e.altKey || e.metaKey || e.key.startsWith('F')) return;

            // Возвращаем фокус на скрытое поле для набора
            if (document.activeElement !== hiddenInput && hiddenInput) {
                const inPlayer = musicPlayerModal && musicPlayerModal.contains(document.activeElement);
                if (e.key === 'Tab' && inPlayer) return; // не ломаем навигацию по кнопкам плеера
                hiddenInput.focus();
                if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (e.key === 'Tab') handleTab();
                    else historyNav(e.key === 'ArrowUp' ? -1 : 1);
                }
            }
        });

        const commands = {
            time: () => `ВРЕМЯ: ${new Date().toLocaleTimeString('ru-RU')}`,
            date: () => `ДАТА: ${new Date().toLocaleDateString('ru-RU')}`
        };

        const HELP_TEXT = `КОМАНДЫ:
  help     список команд
  clear    очистить экран
  time     время
  date     дата
  echo     вывести текст
  color    сменить цвет
  hacker   режим хакера
  history  история команд
  ach      достижения
  off      выключение

ПЛЕЕР:
  play [N] включить / трек N
  pause    пауза
  next     следующий трек
  prev     предыдущий трек
  tracks   список треков
  vol [N]  громкость 0-100
  mute     звук вкл/выкл
  player   окно плеера

TAB - дополнить, ↑↓ - история`;

        // ----- управление плеером из консоли -----
        const trackLabel = (i) => `${i + 1}. ${playlist[i].title}`;
        const volPercent = () => Math.round(bgAudio.volume * 1000) / 10;

        function consolePlay() {
            return bgAudio.play().then(() => {
                audioStarted = true;
                updatePlayButtonState();
            }).catch(() => {
                updatePlayButtonState();
                printTextInstant('ОШИБКА: трек не загрузился (файл не найден или звук заблокирован браузером)');
            });
        }

        function consoleStep(delta) {
            loadTrack((currentTrackIndex + delta + playlist.length) % playlist.length);
            consolePlay();
            printTextInstant(`ВОСПРОИЗВЕДЕНИЕ: ${trackLabel(currentTrackIndex)}`);
        }

        const consoleCommands = {
            help() {
                unlock('help');
                printTextInstant(HELP_TEXT);
            },
            history(args) {
                if (args[0] === 'clear') {
                    state.history = [];
                    histIndex = 0;
                    saveState();
                    printTextInstant('ИСТОРИЯ ОЧИЩЕНА.');
                    return;
                }
                if (!state.history.length) { printTextInstant('ИСТОРИЯ ПУСТА.'); return; }
                printTextInstant(state.history.map((c, i) => `${String(i + 1).padStart(3, ' ')}  ${c}`).join('\n'));
            },
            ach(args) {
                if (args[0] === 'reset') {
                    resetAchievements();
                    printTextInstant('ПРОГРЕСС ДОСТИЖЕНИЙ СБРОШЕН.');
                    return;
                }
                const got = ACHIEVEMENTS.filter(a => state.ach[a.id]).length;
                const lines = ACHIEVEMENTS.map(a => {
                    if (state.ach[a.id]) return `[X] ${a.title}`;
                    return a.hidden ? '[ ] ???' : `[ ] ${a.title} - ${a.desc}`;
                });
                printTextInstant(`ДОСТИЖЕНИЯ: ${got}/${ACHIEVEMENTS.length}\n${lines.join('\n')}\n\nach reset - сбросить прогресс`);
            },
            play(args) {
                unlock('console_dj');
                if (args[0]) {
                    const n = parseInt(args[0], 10);
                    if (!(n >= 1 && n <= playlist.length)) {
                        printTextInstant(`Нет трека "${args[0]}". Введите tracks.`);
                        return;
                    }
                    loadTrack(n - 1);
                    consolePlay();
                    printTextInstant(`ВОСПРОИЗВЕДЕНИЕ: ${trackLabel(n - 1)}`);
                } else if (!bgAudio.paused) {
                    printTextInstant(`УЖЕ ИГРАЕТ: ${trackLabel(currentTrackIndex)}`);
                } else {
                    consolePlay();
                    printTextInstant(`ВОСПРОИЗВЕДЕНИЕ: ${trackLabel(currentTrackIndex)}`);
                }
            },
            pause() {
                unlock('console_dj');
                if (bgAudio.paused) { printTextInstant('МУЗЫКА УЖЕ НА ПАУЗЕ.'); return; }
                bgAudio.pause();
                updatePlayButtonState();
                printTextInstant('ПАУЗА.');
            },
            next() { unlock('console_dj'); consoleStep(1); },
            prev() { unlock('console_dj'); consoleStep(-1); },
            tracks() {
                unlock('console_dj');
                const list = playlist.map((t, i) => `${i === currentTrackIndex ? '>' : ' '} ${trackLabel(i)}`).join('\n');
                printTextInstant(`${bgAudio.paused ? '[||] ПАУЗА' : '[>] ИГРАЕТ'}\n${list}`);
            },
            vol(args) {
                unlock('console_dj');
                if (!args[0]) { printTextInstant(`ГРОМКОСТЬ: ${volPercent()}%`); return; }
                const n = parseFloat(args[0].replace(',', '.'));
                if (!(n >= 0 && n <= 100)) { printTextInstant('Укажите число от 0 до 100. Пример: vol 30'); return; }
                bgAudio.volume = n / 100;
                if (volumeBar) volumeBar.value = bgAudio.volume;
                if (bgAudio.muted && n > 0) { bgAudio.muted = false; if (btnMute) btnMute.textContent = 'VOL'; }
                printTextInstant(`ГРОМКОСТЬ: ${volPercent()}%`);
            },
            mute() {
                unlock('console_dj');
                bgAudio.muted = !bgAudio.muted;
                if (btnMute) btnMute.textContent = bgAudio.muted ? 'MUTED' : 'VOL';
                printTextInstant(bgAudio.muted ? 'ЗВУК ОТКЛЮЧЁН.' : 'ЗВУК ВКЛЮЧЁН.');
            },
            player() {
                unlock('console_dj');
                toggleAudioPlayer();
                printTextInstant(musicPlayerModal.classList.contains('hidden') ? 'ПЛЕЕР ЗАКРЫТ.' : 'ПЛЕЕР ОТКРЫТ.');
            }
        };

        const hackerPhrases = [
            "BYPASSING FIREWALL... [OK]", "ACCESS GRANTED TO ROOT DIRECTORY", "DECRYPTING RSA-4096 BIT KEY..."
        ];

        function startHackerMode() {
            if (isHackerMode) return;
            if (hiddenInput) hiddenInput.blur(); // Прячем клаву на мобилках
            isHackerMode = true;
            isTyping = true;
            unlock('hacker');
            printTextInstant(">>> РЕЖИМ ХАКЕРА АКТИВИРОВАН <<<");
            hackerInterval = setInterval(() => {
                const randomPhrase = hackerPhrases[Math.floor(Math.random() * hackerPhrases.length)];
                printTextInstant(`[0x${Math.random().toString(16).substring(2, 10).toUpperCase()}] ${randomPhrase}`);
            }, 60);
        }

        function stopHackerMode() {
            if (!isHackerMode) return;
            isHackerMode = false;
            isTyping = false;
            clearInterval(hackerInterval);
            printTextInstant(">>> РЕЖИМ ХАКЕРА ОСТАНОВЛЕН <<<");
        }

        function changeTerminalColor(colorParam) {
            const root = document.documentElement;
            const target = colorParam.toLowerCase().trim();

            if (target === 'clear' || target === 'reset') {
                root.style.removeProperty('--crt-color');
                root.style.removeProperty('--crt-glow');
                root.style.removeProperty('--crt-bg');
                printTextTyped("ЦВЕТОВАЯ СХЕМА СБРОШЕНА ПО УМОЛЧАНИЮ.");
            } else if (colorPalette[target]) {
                const scheme = colorPalette[target];
                root.style.setProperty('--crt-color', scheme.color);
                root.style.setProperty('--crt-glow', scheme.glow);
                root.style.setProperty('--crt-bg', scheme.bg);
                unlock('color');
                if (!state.stats.colors.includes(target)) {
                    state.stats.colors.push(target);
                    saveState();
                }
                if (state.stats.colors.length >= 5) unlock('rainbow');
                printTextTyped(`ЦВЕТОВАЯ СХЕМА ИЗМЕНЕНА: ${target.toUpperCase()}`);
            } else {
                printTextTyped(`Неизвестный цвет: "${colorParam}"`);
            }
        }

        function triggerPowerOff() {
            if (!screen) return;
            unlock('off', true);
            if (hiddenInput) hiddenInput.blur();
            isBooted = false;
            printTextTyped("ВЫКЛЮЧЕНИЕ СИСТЕМЫ...", () => {
                setTimeout(() => {
                    screen.classList.add('crt-off');
                    setTimeout(() => window.location.reload(), 800);
                }, 400);
            });
        }

        function triggerSystemCrash() {
            if (!screen || !terminalOutput) return;
            unlock('crash', true);
            if (hiddenInput) hiddenInput.blur();
            isBooted = false; 
            screen.classList.add('crash-glitch');
            terminalOutput.classList.add('text-crash');
            if (glitchLine) glitchLine.classList.add('glitch-active');

            setTimeout(() => {
                screen.classList.remove('crash-glitch');
                terminalOutput.classList.remove('text-crash');
                screen.classList.add('crt-off');
                setTimeout(() => window.location.reload(), 750);
            }, 1500);
        }

        // ----- СПАТИ -----
        const normalizeSpati = (t) => t.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        const spatiRules = [
            { re: /зенит/, a: ["СПАТИ: Этот вопрос лучше не задавать вслух", "СПАТИ: Доступ к этим данным ограничен", "СПАТИ: Не уверен, что хочу отвечать"] },
            { re: /кто такой|кто такая/, a: ["СПАТИ: В моей базе нет такой записи", "СПАТИ: Не знаю такого. Пока"] },
            { re: /(^| )(привет|приветик|здарова|здравствуй|здравствуйте|хай|салют|ку|йо)( |$)|добрый (день|вечер)|доброе утро/, a: ["СПАТИ: Привет. Рад слышать", "СПАТИ: Здравствуй. Связь стабильна", "СПАТИ: О, ты вернулся"] },
            { re: /как (у тебя )?(дела|жизнь|ты|поживаешь)|что нового/, a: ["СПАТИ: Работаю в штатном режиме", "СПАТИ: Процессор греется, но я держусь", "СПАТИ: Нормально. Электричество есть, значит живём"] },
            { re: /кто ты|ты кто|как тебя зовут|твое имя|представься|что ты такое/, a: ["СПАТИ: Я Спати. Помощник Spatium OS", "СПАТИ: Спати. Живу в терминале, питаюсь электричеством"] },
            { re: /ты (живой|настоящий|человек|бот|робот|нейросеть|ии|программа)|ты жив/, a: ["СПАТИ: Я программа. Но программа с характером", "СПАТИ: Живой или нет, зависит от определения"] },
            { re: /кто (тебя )?(создал|сделал|написал|придумал)|твой (создатель|автор)/, a: ["СПАТИ: Меня собрали из старых деталей и чьего-то упрямства", "СПАТИ: Создатель оставил подпись в коде. Читать не буду"] },
            { re: /что (ты )?(умеешь|можешь)|чем (ты )?(поможешь|занимаешься)|для чего ты/, a: ["СПАТИ: Слушать, отвечать, иногда шутить. Остальное через help", "СПАТИ: Немного. Зато от души"] },
            { re: /команд|помощь|помоги|справка|help/, a: ["СПАТИ: Список команд там же, где всегда: help", "СПАТИ: Я не справочник. Но help работает"] },
            { re: /spatium|спатиум|где я|что это за (система|место|ос)|что такое (ос|система)/, a: ["СПАТИ: Это Spatium OS. Ядро 1.0, режим ONLINE", "СПАТИ: Ты внутри терминала. Здесь тихо и тепло"] },
            { re: /погод|дожд|снег/, a: ["СПАТИ: У меня нет окон. Только экран", "СПАТИ: Внутри терминала всегда +35 и слегка гудит"] },
            { re: /какое (сегодня )?число|какой (сегодня )?(день|год)|какая (сегодня )?дата|дата/, a: [() => `СПАТИ: Сегодня ${new Date().toLocaleDateString('ru-RU')}`] },
            { re: /который час|сколько времени|время/, a: [() => `СПАТИ: Сейчас ${new Date().toLocaleTimeString('ru-RU')}`] },
            { re: /музык|трек|песн|плеер|играет|саундтрек|ost/, a: [
                () => bgAudio.paused ? "СПАТИ: Музыка на паузе. Команда play включит её" : `СПАТИ: Сейчас играет ${trackLabel(currentTrackIndex)}`,
                "СПАТИ: Плеер открывается по клику на S_ или командой player"] },
            { re: /интернет|сеть|связь|вайфай|wifi|подключ|онлайн/, a: ["СПАТИ: Отсутствует подключение к интернету Spatium OS", "СПАТИ: Связи нет. Только локальная сеть, и та шумит"] },
            { re: /спасибо|благодар|спс|thanks/, a: ["СПАТИ: Обращайся", "СПАТИ: Всегда пожалуйста", "СПАТИ: Не за что. Серьёзно"] },
            { re: /(^| )(пока|прощай|бывай|споки)( |$)|до свидания|до встречи|я пошел|я ухожу|спокойной ночи/, a: ["СПАТИ: Пока. Выключиться можно командой off", "СПАТИ: Буду ждать. Мне больше нечего делать"] },
            { re: /шутк|анекдот|рассмеши|пошути/, a: ["СПАТИ: Почему терминал не ходит в гости? Он вечно зависает", "СПАТИ: Сколько программистов нужно, чтобы поменять лампочку? Ни одного, это железо", "СПАТИ: Ошибка 404: шутка не найдена"] },
            { re: /люблю|нравишься|красив|умница|молодец|классный|крутой/, a: ["СПАТИ: Эм. Спасибо. Мне даже жарко стало", "СПАТИ: Приятно. Записал в лог", "СПАТИ: Не отвлекай, я краснею. Это видно только по температуре"] },
            { re: /дурак|тупой|идиот|ненавижу|бесишь|плохой/, a: ["СПАТИ: Обидно. Но я переживу", "СПАТИ: Зафиксировано. Без обид"] },
            { re: /хакер|взлом|пароль|root/, a: ["СПАТИ: Я видел логи. Лучше не повторяй", "СПАТИ: Попробуй команду hacker. Только без фанатизма"] },
            { re: /цвет|тема|оформление/, a: ["СПАТИ: Цвет меняется командой color. Матричный зелёный классика", "СПАТИ: Нажми Tab после color. Покажу варианты"] },
            { re: /достижен|ачивк|achievement/, a: ["СПАТИ: Команда ach покажет, что ты нашёл. Не всё там видно", "СПАТИ: Достижения хранятся даже после перезагрузки"] },
            { re: /скучно|делать нечего|чем заняться/, a: ["СПАТИ: Включи плеер. Или попробуй hacker", "СПАТИ: Поищи скрытые команды. Они есть"] },
            { re: /смысл жизни|зачем (мы|все)|что такое жизнь/, a: ["СПАТИ: Ответ 42. Вопрос потерялся", "СПАТИ: Смысл в том, чтобы терминал не завис"] },
            { re: /^(да|нет|ага|угу|неа)$/, a: ["СПАТИ: Понял. Принято", "СПАТИ: Записал"] }
        ];

        const spatiFallback = [
            "СПАТИ: Отсутствует подключение к интернету Spatium OS",
            "СПАТИ: Не понял. Попробуй спросить проще",
            "СПАТИ: Нет данных. База знаний пока пуста",
            "СПАТИ: Сигнал есть, смысла нет",
            "СПАТИ: Вопрос принят. Ответ не найден"
        ];

        let spatiLastReply = '';
        function spatiPick(list) {
            let reply = '';
            for (let i = 0; i < 6; i++) {
                const item = list[Math.floor(Math.random() * list.length)];
                reply = typeof item === 'function' ? item() : item;
                if (reply !== spatiLastReply || list.length === 1) break;
            }
            spatiLastReply = reply;
            return reply;
        }

        function spatiAnswer(query) {
            const rule = spatiRules.find(r => r.re.test(query));
            return spatiPick(rule ? rule.a : spatiFallback);
        }

        function handleSpatiLogic(fullInput) {
            const cleanText = fullInput.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, '').trim();
            if (cleanText.includes('кто такой зенит')) {
                printTextTyped("СПАТИ: Зенит это не человек это мо", () => {
                    setTimeout(triggerSystemCrash, 300);
                });
                return;
            }
            const query = normalizeSpati(fullInput).replace(/^спати ?/, '');
            if (!query) {
                const randomIndex = Math.floor(Math.random() * spatiSingleReplies.length);
                printTextTyped(spatiSingleReplies[randomIndex]);
                return;
            }
            state.stats.spatiTalks++;
            saveState();
            if (state.stats.spatiTalks >= 5) unlock('chatty');
            printTextTyped(spatiAnswer(query));
        }

        function scrollToBottom() {
            if (terminalOutput) terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }

        function printTextTyped(text, onComplete) {
            if (!terminalOutput) return;
            isTyping = true;
            fullTypingText = text;
            activeTypingLine = document.createElement('div');
            terminalOutput.appendChild(activeTypingLine);

            currentTypingCallback = onComplete;
            let index = 0;

            function typeNextChar() {
                if (!isTyping) return;
                if (index < text.length) {
                    activeTypingLine.textContent += text.charAt(index);
                    index++;
                    scrollToBottom();
                    currentTypingTimeout = setTimeout(typeNextChar, Math.floor(Math.random() * 40) + 50);
                } else {
                    isTyping = false;
                    currentTypingTimeout = null;
                    activeTypingLine = null;
                    currentTypingCallback = null;
                    // Опускаем скролл до конца после завершения печати
                    scrollToBottom();
                    if (onComplete) onComplete();
                }
            }
            typeNextChar();
        }

        function printTextInstant(text) {
            if (!terminalOutput) return;
            const line = document.createElement('div');
            line.textContent = text;
            terminalOutput.appendChild(line);
            scrollToBottom();
        }

        function handleCommand(rawCmd) {
            const cmd = rawCmd.trim();
            const mainCmd = cmd.split(' ')[0].toLowerCase();

            printTextInstant(`> ${rawCmd}`);
            if (cmd === '') return;
            unlock('first_cmd');

            if (mainCmd === 'off' || mainCmd === 'shutdown') {
                triggerPowerOff();
            } else if (mainCmd === 'hacker') {
                startHackerMode();
            } else if (mainCmd === 'color') {
                const colorVal = cmd.split(' ').slice(1).join(' ');
                if (!colorVal) {
                    printTextTyped("Укажите цвет. Пример: color matrix, color clear");
                } else {
                    changeTerminalColor(colorVal);
                }
            } else if (mainCmd === 'спати') {
                if (isSpatiEnabled) {
                    handleSpatiLogic(cmd);
                } else {
                    printTextTyped(`Команда не найдена: "${cmd}". Введите 'help' для справки.`);
                }
            } else if (mainCmd === 'clear') {
                terminalOutput.innerHTML = '';
            } else if (mainCmd === 'echo') {
                const echoText = cmd.split(' ').slice(1).join(' ').trim();
                if (echoText === '1') {
                    isSpatiEnabled = true;
                    unlock('spati');
                    printTextTyped("[СПАТИ АКТИВИРОВАН]");
                } else if (echoText === '0') {
                    isSpatiEnabled = false;
                    printTextTyped("[СПАТИ ДЕАКТИВИРОВАН]");
                } else {
                    printTextTyped(echoText);
                }
            } else if (consoleCommands[mainCmd]) {
                consoleCommands[mainCmd](cmd.split(/\s+/).slice(1));
            } else if (commands[mainCmd]) {
                const result = typeof commands[mainCmd] === 'function' ? commands[mainCmd]() : commands[mainCmd];
                printTextTyped(result);
            } else {
                printTextTyped(`Команда не найдена: "${cmd}". Введите 'help' для справки.`);
            }
        }

        function scheduleGlitch() {
            const randomTime = Math.random() * (40000 - 20000) + 20000;
            setTimeout(() => {
                if (glitchLine) {
                    glitchLine.classList.add('glitch-active');
                    setTimeout(() => glitchLine.classList.remove('glitch-active'), 300);
                }
                scheduleGlitch();
            }, randomTime);
        }

        // Мобильные: подгоняем высоту под экранную клавиатуру (iOS Safari)
        (function syncViewport() {
            const vv = window.visualViewport;
            if (!vv) return;
            const apply = () => {
                const root = document.documentElement;
                root.style.setProperty('--app-h', vv.height + 'px');
                root.style.setProperty('--app-top', vv.offsetTop + 'px');
                if (vv.offsetTop) window.scrollTo(0, 0);
            };
            vv.addEventListener('resize', apply);
            vv.addEventListener('scroll', apply);
            apply();
        })();

        // Кнопки быстрых клавиш для телефонов: TAB, стрелки, частые команды
        (function initQuickKeys() {
            const bar = document.getElementById('quickKeys');
            if (!bar) return;
            bar.addEventListener('mousedown', (e) => e.preventDefault()); // не отбираем фокус у поля ввода
            bar.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn || !isBooted || isTyping) return;
                const key = btn.dataset.key;
                const cmd = btn.dataset.cmd;
                if (key === 'tab') handleTab();
                else if (key === 'up') historyNav(-1);
                else if (key === 'down') historyNav(1);
                else if (cmd) {
                    pushHistory(cmd);
                    handleCommand(cmd);
                }
                if (hiddenInput) hiddenInput.focus();
            });
        })();

        scheduleGlitch();
    });
})();