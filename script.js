(function initSpatiumOS() {
    document.addEventListener('DOMContentLoaded', () => {
        // --- ДВИЖЕНИЕ И ИНТЕРАКТИВНОСТЬ КАСТОМНОГО КУРСОРA ---
        const customCursor = document.getElementById('custom-cursor');
        const cursorFollower = document.getElementById('cursor-follower');

        let mouseX = 0, mouseY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (customCursor) {
                customCursor.style.left = `${mouseX}px`;
                customCursor.style.top = `${mouseY}px`;
            }
        });

        function animateCursorFollower() {
            followerX += (mouseX - followerX) * 0.2;
            followerY += (mouseY - followerY) * 0.2;
            if (cursorFollower) {
                cursorFollower.style.left = `${followerX}px`;
                cursorFollower.style.top = `${followerY}px`;
            }
            requestAnimationFrame(animateCursorFollower);
        }
        animateCursorFollower();

        document.addEventListener('mousedown', () => document.body.classList.add('active'));
        document.addEventListener('mouseup', () => document.body.classList.remove('active'));

        const interactiveSelector = 'button, a, input, .desktop-icon, .start-item, .cal-day-cell, .cal-nav-btn, .start-btn, .taskbar-time, .window-close-btn, .kb-key';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactiveSelector)) {
                document.body.classList.add('hovered');
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(interactiveSelector)) {
                document.body.classList.remove('hovered');
            }
        });

        // --- ЭЛЕМЕНТЫ СИСТЕМЫ ---
        const screen = document.getElementById('screen');
        const glitchLine = document.getElementById('glitchLine');
        const bootContainer = document.getElementById('bootContainer');
        const progressFill = document.getElementById('progressFill');
        const terminalContainer = document.getElementById('terminalContainer');
        const desktopContainer = document.getElementById('desktopContainer');
        const animBgLayer = document.getElementById('animBgLayer');
        const winBootScreen = document.getElementById('winBootScreen');
        const sleepOverlay = document.getElementById('sleepOverlay');
        const startMenu = document.getElementById('startMenu');
        
        const terminalOutput = document.getElementById('terminalOutput');
        const commandInputText = document.getElementById('commandInputText');
        
        const openTerminalBtn = document.getElementById('openTerminalBtn');
        const menuTerminalBtn = document.getElementById('menuTerminalBtn');
        
        const openSettingsBtn = document.getElementById('openSettingsBtn');
        const menuSettingsBtn = document.getElementById('menuSettingsBtn');
        const settingsWindow = document.getElementById('settingsWindow');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingsHeader = document.getElementById('settingsHeader');

        const settingsMainPage = document.getElementById('settingsMainPage');
        const settingsColorPage = document.getElementById('settingsColorPage');
        const settingsWallpaperPage = document.getElementById('settingsWallpaperPage');
        const settingsAnimWallpaperPage = document.getElementById('settingsAnimWallpaperPage');
        const settingsCursorPage = document.getElementById('settingsCursorPage');
        const settingsTypingSpeedPage = document.getElementById('settingsTypingSpeedPage');
        const settingsFontSizePage = document.getElementById('settingsFontSizePage');
        const settingsAboutPage = document.getElementById('settingsAboutPage');

        const goToColorPageBtn = document.getElementById('goToColorPageBtn');
        const goToWallpaperPageBtn = document.getElementById('goToWallpaperPageBtn');
        const goToAnimWallpaperPageBtn = document.getElementById('goToAnimWallpaperPageBtn');
        const goToCursorPageBtn = document.getElementById('goToCursorPageBtn');
        const goToTypingSpeedPageBtn = document.getElementById('goToTypingSpeedPageBtn');
        const goToFontSizePageBtn = document.getElementById('goToFontSizePageBtn');
        const goToAboutPageBtn = document.getElementById('goToAboutPageBtn');

        const resetColorBtn = document.getElementById('resetColorBtn');

        const fontSlider = document.getElementById('fontSlider');
        const fontSliderVal = document.getElementById('fontSliderVal');
        const speedSlider = document.getElementById('speedSlider');
        const speedSliderVal = document.getElementById('speedSliderVal');

        const startBtn = document.getElementById('startBtn');
        const taskbarTime = document.getElementById('taskbarTime');

        const btnSleep = document.getElementById('btnSleep');
        const btnReboot = document.getElementById('btnReboot');
        const btnShutdown = document.getElementById('btnShutdown');

        const calendarWindow = document.getElementById('calendarWindow');
        const calDayName = document.getElementById('calDayName');
        const calFullDate = document.getElementById('calFullDate');
        const calMonthYear = document.getElementById('calMonthYear');
        const calendarDaysGrid = document.getElementById('calendarDaysGrid');
        const calPrevMonth = document.getElementById('calPrevMonth');
        const calNextMonth = document.getElementById('calNextMonth');

        const holidaysData = {
            "01-01": "Новый год", "01-07": "Рождество Христово", "02-23": "День защитника Отечества",
            "03-08": "Международный женский день", "04-12": "День космонавтики", "05-01": "Праздник Весны и Труда",
            "05-09": "День Победы", "06-12": "День России", "08-22": "День Государственного флага РФ",
            "09-01": "День знаний", "10-05": "День учителя", "11-04": "День народного единства",
            "12-12": "День Конституции РФ", "12-31": "Канун Нового года"
        };

        let isBooted = false;
        let isTyping = false;
        let isSleeping = false;
        let currentInput = '';
        
        const commandHistory = [];
        let historyIndex = -1;

        let isSpatiEnabled = false;
        let isHackerMode = false;
        let hackerInterval = null;

        let currentTypingTimeout = null;
        let currentTypingCallback = null;
        let activeTypingLine = null;
        let fullTypingText = '';

        let currentTypingDelay = 50;
        let viewDate = new Date();

        // --- ЛОГИКА РЕТРО ЭКРАННОЙ КЛАВИАТУРЫ ---
        const kbLayouts = {
            ru: [
                ['Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х','Ъ'],
                ['Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э'],
                ['Я','Ч','С','М','И','Т','Ь','Б','Ю']
            ],
            en: [
                ['Q','W','E','R','T','Y','U','I','O','P'],
                ['A','S','D','F','G','H','J','K','L'],
                ['Z','X','C','V','B','N','M']
            ]
        };

        let currentKbLang = 'ru';

        function renderVirtualKeyboard() {
            const row1 = document.getElementById('kbRow1');
            const row2 = document.getElementById('kbRow2');
            const row3 = document.getElementById('kbRow3');
            if (!row1 || !row2 || !row3) return;

            row1.innerHTML = ''; row2.innerHTML = ''; row3.innerHTML = '';

            kbLayouts[currentKbLang][0].forEach(char => {
                row1.appendChild(createKbKey(char));
            });
            kbLayouts[currentKbLang][1].forEach(char => {
                row2.appendChild(createKbKey(char));
            });
            kbLayouts[currentKbLang][2].forEach(char => {
                row3.appendChild(createKbKey(char));
            });
        }

        function createKbKey(char) {
            const btn = document.createElement('button');
            btn.className = 'kb-key';
            btn.textContent = char;
            btn.setAttribute('data-key', char.toLowerCase());
            return btn;
        }

        const virtualKeyboard = document.getElementById('virtualKeyboard');
        const kbLangBtn = document.getElementById('kbLangBtn');

        if (kbLangBtn) {
            kbLangBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentKbLang = currentKbLang === 'ru' ? 'en' : 'ru';
                renderVirtualKeyboard();
            });
        }

        if (virtualKeyboard) {
            virtualKeyboard.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetKey = e.target.closest('.kb-key');
                if (!targetKey) return;

                const keyVal = targetKey.getAttribute('data-key');
                if (!keyVal) return;

                handleKeyPress(keyVal);
            });
        }

        renderVirtualKeyboard();

        const colorPalette = {
            green: { color: '#33ff33', glow: 'rgba(51, 255, 51, 0.6)', bg: '#001100' },
            matrix: { color: '#00ff66', glow: 'rgba(0, 255, 102, 0.7)', bg: '#000f05' },
            amber: { color: '#ffb000', glow: 'rgba(255, 176, 0, 0.6)', bg: '#140c00' },
            orange: { color: '#ff6600', glow: 'rgba(255, 102, 0, 0.6)', bg: '#140800' },
            red: { color: '#ff3333', glow: 'rgba(255, 51, 51, 0.6)', bg: '#110000' },
            crimson: { color: '#dc143c', glow: 'rgba(220, 20, 60, 0.6)', bg: '#110005' },
            pink: { color: '#ff66cc', glow: 'rgba(255, 102, 204, 0.6)', bg: '#14000e' },
            cyberpunk: { color: '#ff0055', glow: 'rgba(255, 0, 85, 0.7)', bg: '#140005' },
            purple: { color: '#cc33ff', glow: 'rgba(204, 51, 255, 0.6)', bg: '#0e0011' },
            violet: { color: '#8a2be2', glow: 'rgba(138, 43, 226, 0.6)', bg: '#090014' },
            blue: { color: '#3388ff', glow: 'rgba(51, 136, 255, 0.6)', bg: '#000811' },
            cyan: { color: '#33ffff', glow: 'rgba(51, 255, 255, 0.6)', bg: '#001111' },
            teal: { color: '#008080', glow: 'rgba(0, 128, 128, 0.6)', bg: '#000d0d' },
            gold: { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.6)', bg: '#141100' },
            lime: { color: '#a6ff00', glow: 'rgba(166, 255, 0, 0.6)', bg: '#0a1400' },
            white: { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)', bg: '#111111' }
        };

        const spatiSingleReplies = [
            "СПАТИ: Я тут", "СПАТИ: На связи", "СПАТИ: Чего?", "СПАТИ: Слушаю", "СПАТИ: Звал?",
            "СПАТИ: Да?", "СПАТИ: Внимание на экран", "СПАТИ: Готов к работе", "СПАТИ: Я здесь", "СПАТИ: На месте!"
        ];

        desktopContainer.classList.add('wp-classic');

        setInterval(() => {
            if (taskbarTime) {
                taskbarTime.textContent = new Date().toLocaleTimeString('ru-RU');
            }
        }, 1000);

        function updateCalendarHeader() {
            const now = new Date();
            const dayName = now.toLocaleDateString('ru-RU', { weekday: 'long' });
            const fullDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

            if (calDayName) calDayName.textContent = dayName.toUpperCase();
            if (calFullDate) calFullDate.textContent = fullDate.toUpperCase();
        }

        function renderCalendarDays() {
            if (!calendarDaysGrid) return;
            calendarDaysGrid.innerHTML = '';

            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();

            const monthName = viewDate.toLocaleDateString('ru-RU', { month: 'long' });
            if (calMonthYear) {
                calMonthYear.textContent = `${monthName.toUpperCase()} ${year}`;
            }

            const firstDayIndex = new Date(year, month, 1).getDay();
            const shift = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();
            const today = new Date();

            for (let i = shift; i > 0; i--) {
                const cell = document.createElement('div');
                cell.className = 'cal-day-cell other-month';
                cell.textContent = prevMonthDays - i + 1;
                calendarDaysGrid.appendChild(cell);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const cell = document.createElement('div');
                cell.className = 'cal-day-cell';
                cell.textContent = day;

                if (
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()
                ) {
                    cell.classList.add('today');
                }

                const formattedMonth = String(month + 1).padStart(2, '0');
                const formattedDay = String(day).padStart(2, '0');
                const dateKey = `${formattedMonth}-${formattedDay}`;

                if (holidaysData[dateKey]) {
                    cell.classList.add('has-holiday');
                    const tooltip = document.createElement('div');
                    tooltip.className = 'holiday-tooltip';
                    tooltip.textContent = holidaysData[dateKey];
                    cell.appendChild(tooltip);
                }

                calendarDaysGrid.appendChild(cell);
            }
        }

        if (taskbarTime) {
            taskbarTime.addEventListener('click', (e) => {
                e.stopPropagation();
                if (startMenu) startMenu.classList.add('hidden');
                if (calendarWindow) {
                    const isHidden = calendarWindow.classList.contains('hidden');
                    if (isHidden) {
                        viewDate = new Date();
                        updateCalendarHeader();
                        renderCalendarDays();
                        calendarWindow.classList.remove('hidden');
                    } else {
                        calendarWindow.classList.add('hidden');
                    }
                }
            });
        }

        if (calPrevMonth) {
            calPrevMonth.addEventListener('click', (e) => {
                e.stopPropagation();
                viewDate.setMonth(viewDate.getMonth() - 1);
                renderCalendarDays();
            });
        }

        if (calNextMonth) {
            calNextMonth.addEventListener('click', (e) => {
                e.stopPropagation();
                viewDate.setMonth(viewDate.getMonth() + 1);
                renderCalendarDays();
            });
        }

        if (calendarWindow) {
            calendarWindow.addEventListener('click', (e) => e.stopPropagation());
        }

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
                        }, 400);
                    }, 150);
                }
            }, intervalTime);
        }

        startBootSequence();

        function switchToDesktop() {
            if (startMenu) startMenu.classList.add('hidden');
            if (terminalContainer) terminalContainer.classList.add('hidden');
            if (winBootScreen) winBootScreen.classList.remove('hidden');

            setTimeout(() => {
                if (winBootScreen) winBootScreen.classList.add('hidden');
                if (desktopContainer) desktopContainer.classList.remove('hidden');
                document.body.classList.add('show-cursor');
            }, 1500);
        }

        function switchToTerminal() {
            document.body.classList.remove('show-cursor');
            if (startMenu) startMenu.classList.add('hidden');
            if (calendarWindow) calendarWindow.classList.add('hidden');
            if (desktopContainer) desktopContainer.classList.add('hidden');
            if (terminalContainer) terminalContainer.classList.remove('hidden');
        }

        function openSettings() {
            if (startMenu) startMenu.classList.add('hidden');
            if (settingsWindow) settingsWindow.classList.remove('hidden');
            showPage(settingsMainPage);
        }

        function closeSettings() {
            if (settingsWindow) settingsWindow.classList.add('hidden');
        }

        function showPage(pageElem) {
            const pages = [
                settingsMainPage, settingsColorPage, settingsWallpaperPage,
                settingsAnimWallpaperPage, settingsCursorPage, settingsTypingSpeedPage,
                settingsFontSizePage, settingsAboutPage
            ];
            pages.forEach(p => { if (p) p.classList.add('hidden'); });
            if (pageElem) pageElem.classList.remove('hidden');
        }

        if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);
        if (menuSettingsBtn) menuSettingsBtn.addEventListener('click', openSettings);
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

        if (goToColorPageBtn) goToColorPageBtn.addEventListener('click', () => showPage(settingsColorPage));
        if (goToWallpaperPageBtn) goToWallpaperPageBtn.addEventListener('click', () => showPage(settingsWallpaperPage));
        if (goToAnimWallpaperPageBtn) goToAnimWallpaperPageBtn.addEventListener('click', () => showPage(settingsAnimWallpaperPage));
        if (goToCursorPageBtn) goToCursorPageBtn.addEventListener('click', () => showPage(settingsCursorPage));
        if (goToTypingSpeedPageBtn) goToTypingSpeedPageBtn.addEventListener('click', () => showPage(settingsTypingSpeedPage));
        if (goToFontSizePageBtn) goToFontSizePageBtn.addEventListener('click', () => showPage(settingsFontSizePage));
        if (goToAboutPageBtn) goToAboutPageBtn.addEventListener('click', () => showPage(settingsAboutPage));

        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => showPage(settingsMainPage));
        });

        document.querySelectorAll('.color-palette-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const colorKey = e.target.getAttribute('data-color');
                applyColorTheme(colorKey);
            });
        });

        if (resetColorBtn) resetColorBtn.addEventListener('click', () => applyColorTheme('reset'));

        document.querySelectorAll('#settingsWallpaperPage .opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#settingsWallpaperPage .opt-btn, #settingsAnimWallpaperPage .opt-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                if (animBgLayer) animBgLayer.className = 'anim-bg-layer';
                const wallpaper = e.target.getAttribute('data-wallpaper');
                desktopContainer.className = 'desktop-container';
                desktopContainer.classList.add(`wp-${wallpaper}`);
            });
        });

        document.querySelectorAll('#settingsAnimWallpaperPage .opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#settingsWallpaperPage .opt-btn, #settingsAnimWallpaperPage .opt-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                desktopContainer.className = 'desktop-container';
                const animWallpaper = e.target.getAttribute('data-anim-wallpaper');
                if (animBgLayer) {
                    animBgLayer.className = 'anim-bg-layer';
                    animBgLayer.classList.add(`anim-${animWallpaper}`);
                }
            });
        });

        // ЛОГИКА ВЫБОРА КУРСОРОВ
        document.querySelectorAll('#settingsCursorPage .opt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#settingsCursorPage .opt-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const cursorStyle = e.target.getAttribute('data-cursor');
                
                document.body.classList.remove(
                    'cursor-default', 'cursor-crosshair', 'cursor-arrow',
                    'cursor-square', 'cursor-dot', 'cursor-block'
                );
                document.body.classList.add(`cursor-${cursorStyle}`);
            });
        });

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                currentTypingDelay = Math.round(120 - (val * 1.2));
                if (speedSliderVal) {
                    if (val === 100) {
                        speedSliderVal.textContent = 'Мгновенно (0 ms)';
                    } else {
                        speedSliderVal.textContent = `${val}% (${currentTypingDelay} ms)`;
                    }
                }
            });
        }

        if (fontSlider) {
            fontSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                const scale = val / 100;
                document.documentElement.style.setProperty('--font-scale', scale);
                if (fontSliderVal) fontSliderVal.textContent = `${val}%`;
            });
        }

        if (settingsHeader && settingsWindow) {
            let isDragging = false;
            let offsetX = 0, offsetY = 0;

            const startDrag = (clientX, clientY) => {
                isDragging = true;
                offsetX = clientX - settingsWindow.offsetLeft;
                offsetY = clientY - settingsWindow.offsetTop;
            };

            const doDrag = (clientX, clientY) => {
                if (!isDragging) return;
                settingsWindow.style.left = `${clientX - offsetX}px`;
                settingsWindow.style.top = `${clientY - offsetY}px`;
            };

            settingsHeader.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => doDrag(e.clientX, e.clientY));
            window.addEventListener('mouseup', () => { isDragging = false; });

            settingsHeader.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    startDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
            });
            window.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1) {
                    doDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
            });
            window.addEventListener('touchend', () => { isDragging = false; });
        }

        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (calendarWindow) calendarWindow.classList.add('hidden');
                if (startMenu) startMenu.classList.toggle('hidden');
            });
        }

        if (openTerminalBtn) openTerminalBtn.addEventListener('click', switchToTerminal);
        if (menuTerminalBtn) menuTerminalBtn.addEventListener('click', switchToTerminal);

        function enterSleepMode() {
            if (startMenu) startMenu.classList.add('hidden');
            if (calendarWindow) calendarWindow.classList.add('hidden');
            if (sleepOverlay) sleepOverlay.classList.remove('hidden');
            isSleeping = true;
        }

        function wakeUp() {
            if (!isSleeping) return;
            if (sleepOverlay) sleepOverlay.classList.add('hidden');
            isSleeping = false;
        }

        if (btnSleep) btnSleep.addEventListener('click', enterSleepMode);
        if (sleepOverlay) sleepOverlay.addEventListener('click', wakeUp);

        function rebootSystem() {
            if (startMenu) startMenu.classList.add('hidden');
            if (screen) screen.classList.add('crt-off');
            setTimeout(() => { window.location.reload(); }, 700);
        }

        if (btnReboot) btnReboot.addEventListener('click', rebootSystem);

        function shutdownSystem() {
            if (startMenu) startMenu.classList.add('hidden');
            if (screen) screen.classList.add('crt-off');
            setTimeout(() => {
                document.body.innerHTML = '<div style="background:#000;width:100vw;height:100vh;display:flex;justify-content:center;align-items:center;color:#00ff00;font-family:sans-serif;text-align:center;padding:20px;">ПИТАНИЕ КОМПЬЮТЕРА ОТКЛЮЧЕНО. МОЖНО ЗАКРЫТЬ ВКЛАДКУ.</div>';
            }, 800);
        }

        if (btnShutdown) btnShutdown.addEventListener('click', shutdownSystem);

        window.addEventListener('click', (e) => {
            if (isSleeping) { wakeUp(); return; }

            if (startMenu && !startMenu.classList.contains('hidden') && !e.target.closest('#startMenu') && !e.target.closest('#startBtn')) {
                startMenu.classList.add('hidden');
            }

            if (calendarWindow && !calendarWindow.classList.contains('hidden') && !e.target.closest('#calendarWindow') && !e.target.closest('#taskbarTime')) {
                calendarWindow.classList.add('hidden');
            }

            if (!screen || screen.classList.contains('crt-off')) return;
            if (e.target.closest('#desktopContainer') || e.target.closest('#virtualKeyboard')) return;

            if (isTyping && currentTypingTimeout) {
                clearTimeout(currentTypingTimeout);
                if (activeTypingLine) { activeTypingLine.textContent = fullTypingText; }
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

            if (isHackerMode) { stopHackerMode(); return; }

            screen.classList.remove('shake');
            void screen.offsetWidth; 
            screen.classList.add('shake');
        });

        const commands = {
            help: `ДОСТУПНЫЕ КОМАНДЫ:
  help               - Показать список команд
  clear              - Очистить экран консоли
  time               - Текущее время системы
  date               - Текущая дата
  echo               - Вывести свой текст
  color [название]   - Сменить цвет (color help - список)
  hacker             - Запустить режим хакера
  exit               - Выйти на рабочий стол
  off                - Выключение терминала`,
            time: () => `ВРЕМЯ: ${new Date().toLocaleTimeString('ru-RU')}`,
            date: () => `ДАТА: ${new Date().toLocaleDateString('ru-RU')}`
        };

        function startHackerMode() {
            if (isHackerMode) return;
            isHackerMode = true;
            isTyping = true;
            printTextInstant(">>> РЕЖИМ ХАКЕРА АКТИВИРОВАН. ДЛЯ ОСТАНОВКИ НАЖМИТЕ НА ЭКРАН <<<");

            hackerInterval = setInterval(() => {
                const hackerPhrases = [
                    "BYPASSING FIREWALL... [OK]", "ACCESS GRANTED TO ROOT DIRECTORY", "DECRYPTING RSA-4096 BIT KEY...",
                    "INJECTING PAYLOAD INTO /DEV/SDA...", "CONNECTING TO PENTAGON MAINMAINFRAME..."
                ];
                const randomPhrase = hackerPhrases[Math.floor(Math.random() * hackerPhrases.length)];
                const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
                printTextInstant(`[0x${randomHex}] ${randomPhrase}`);
            }, 60);
        }

        function stopHackerMode() {
            if (!isHackerMode) return;
            isHackerMode = false;
            isTyping = false;
            clearInterval(hackerInterval);
            printTextInstant(">>> РЕЖИМ ХАКЕРА ОСТАНОВЛЕН <<<");
        }

        function applyColorTheme(colorName) {
            const root = document.documentElement;
            const target = colorName.toLowerCase().trim();

            if (target === 'clear' || target === 'reset' || target === 'сброс') {
                root.style.removeProperty('--crt-color');
                root.style.removeProperty('--crt-glow');
                root.style.removeProperty('--crt-bg');
                return true;
            } else if (colorPalette[target]) {
                const scheme = colorPalette[target];
                root.style.setProperty('--crt-color', scheme.color);
                root.style.setProperty('--crt-glow', scheme.glow);
                root.style.setProperty('--crt-bg', scheme.bg);
                return true;
            }
            return false;
        }

        function changeTerminalColor(colorParam) {
            const param = colorParam.trim().toLowerCase();

            if (param === 'help' || param === 'помощь' || param === '?') {
                const availableColors = Object.keys(colorPalette).join(', ');
                printTextTyped(`ДОСТУПНЫЕ ЦВЕТА:\n${availableColors}\n\nСБРОС:\nreset, clear, сброс\n\nПример: color matrix`);
                return;
            }

            if (!param) {
                printTextTyped('Укажите цвет. Пример: color red или color help');
                return;
            }

            if (applyColorTheme(param)) {
                printTextTyped(`ЦВЕТОВАЯ СХЕМА ИЗМЕНЕНА: ${param.toUpperCase()}`);
            } else {
                printTextTyped(`Неизвестный цвет: "${param}". Введите 'color help' для списка всех цветов.`);
            }
        }

        function triggerPowerOff() {
            if (!screen) return;
            isBooted = false;
            printTextTyped("ВЫКЛЮЧЕНИЕ СИСТЕМЫ...", () => { setTimeout(shutdownSystem, 400); });
        }

        function triggerSystemCrash() {
            if (!screen || !terminalOutput) return;
            isBooted = false; 

            screen.classList.add('crash-glitch');
            terminalOutput.classList.add('text-crash');
            if (glitchLine) glitchLine.classList.add('glitch-active');

            setTimeout(() => {
                screen.classList.remove('crash-glitch');
                terminalOutput.classList.remove('text-crash');
                screen.classList.add('crt-off');
                setTimeout(() => { window.location.reload(); }, 750);
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

            if (currentTypingDelay === 0) {
                printTextInstant(text);
                if (onComplete) onComplete();
                return;
            }

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
                    currentTypingTimeout = setTimeout(typeNextChar, Math.floor(Math.random() * 15) + currentTypingDelay);
                } else {
                    isTyping = false;
                    currentTypingTimeout = null;
                    activeTypingLine = null;
                    currentTypingCallback = null;
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

            commandHistory.push(rawCmd);
            historyIndex = commandHistory.length;

            if (mainCmd === 'exit') {
                switchToDesktop();
            } else if (mainCmd === 'off' || mainCmd === 'shutdown') {
                triggerPowerOff();
            } else if (mainCmd === 'hacker') {
                startHackerMode();
            } else if (mainCmd === 'color') {
                const colorVal = cmd.split(' ').slice(1).join(' ');
                changeTerminalColor(colorVal);
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

        // ОБРАБОТЧИК КЛАВИШ (ДЛЯ ФИЗИЧЕСКОЙ И ВИРТУАЛЬНОЙ КЛАВИАТУР)
        function handleKeyPress(key) {
            if (isSleeping) { wakeUp(); return; }
            if (isHackerMode) { stopHackerMode(); return; }

            if (isTyping && currentTypingTimeout && (key === 'Enter' || key === ' ')) {
                clearTimeout(currentTypingTimeout);
                if (activeTypingLine) { activeTypingLine.textContent = fullTypingText; }
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

            if (!isBooted || isTyping || desktopContainer.classList.contains('hidden') === false) return;

            if (key === 'ArrowUp') {
                if (commandHistory.length > 0 && historyIndex > 0) {
                    historyIndex--;
                    currentInput = commandHistory[historyIndex];
                    if (commandInputText) commandInputText.textContent = currentInput;
                }
                return;
            }

            if (key === 'ArrowDown') {
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    currentInput = commandHistory[historyIndex];
                    if (commandInputText) commandInputText.textContent = currentInput;
                } else if (historyIndex === commandHistory.length - 1) {
                    historyIndex = commandHistory.length;
                    currentInput = '';
                    if (commandInputText) commandInputText.textContent = '';
                }
                return;
            }

            if (key === 'Enter') {
                const commandToExecute = currentInput;
                currentInput = '';
                if (commandInputText) commandInputText.textContent = currentInput;
                handleCommand(commandToExecute);
            } else if (key === 'Backspace') {
                currentInput = currentInput.slice(0, -1);
                if (commandInputText) commandInputText.textContent = currentInput;
            } else if (key.length === 1) {
                currentInput += key;
                if (commandInputText) commandInputText.textContent = currentInput;
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey || e.key.startsWith('F')) return;
            handleKeyPress(e.key);
        });

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
