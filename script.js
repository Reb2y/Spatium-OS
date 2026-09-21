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
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isTyping) return; // Блокируем отправку пока терминал печатает
                    const commandToExecute = currentInput;
                    currentInput = '';
                    hiddenInput.value = '';
                    if (commandInputText) commandInputText.textContent = '';
                    if (commandToExecute.trim() !== '') {
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
                hiddenInput.focus();
            }
        });

        const commands = {
            help: `ДОСТУПНЫЕ КОМАНДЫ:
  help               - Показать список команд
  clear              - Очистить экран консоли
  time               - Текущее время системы
  date               - Текущая дата
  echo               - Вывести свой текст
  color [знач]       - Сменить цвет
  hacker             - Запустить режим хакера
  off                - Выключение терминала`,
            time: () => `ВРЕМЯ: ${new Date().toLocaleTimeString('ru-RU')}`,
            date: () => `ДАТА: ${new Date().toLocaleDateString('ru-RU')}`
        };

        const hackerPhrases = [
            "BYPASSING FIREWALL... [OK]", "ACCESS GRANTED TO ROOT DIRECTORY", "DECRYPTING RSA-4096 BIT KEY..."
        ];

        function startHackerMode() {
            if (isHackerMode) return;
            if (hiddenInput) hiddenInput.blur(); // Прячем клаву на мобилках
            isHackerMode = true;
            isTyping = true;
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
                printTextTyped(`ЦВЕТОВАЯ СХЕМА ИЗМЕНЕНА: ${target.toUpperCase()}`);
            } else {
                printTextTyped(`Неизвестный цвет: "${colorParam}"`);
            }
        }

        function triggerPowerOff() {
            if (!screen) return;
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

        function handleSpatiLogic(fullInput) {
            const cleanText = fullInput.toLowerCase().replace(/[^a-zа-я0-9\s]/gi, '').trim();
            if (cleanText.includes('кто такой зенит')) {
                printTextTyped("СПАТИ: Зенит это не человек это мо", () => {
                    setTimeout(triggerSystemCrash, 300);
                });
                return;
            }
            const textAfterSpati = fullInput.replace(/^спати\s*/i, '').trim();
            if (!textAfterSpati) {
                const randomIndex = Math.floor(Math.random() * spatiSingleReplies.length);
                printTextTyped(spatiSingleReplies[randomIndex]);
            } else {
                printTextTyped("СПАТИ: Отсутствует подключение к интернету Spatium OS");
            }
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
                    printTextTyped("[СПАТИ АКТИВИРОВАН]");
                } else if (echoText === '0') {
                    isSpatiEnabled = false;
                    printTextTyped("[СПАТИ ДЕАКТИВИРОВАН]");
                } else {
                    printTextTyped(echoText);
                }
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

        scheduleGlitch();
    });
})();