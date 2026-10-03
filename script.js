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
        let hackerGuardUntil = 0; // защита от мгновенной остановки тем же Enter/кликом

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
            return { ach: {}, shown: {}, history: [], stats: { visits: 0, colors: [], tracks: [], spatiTalks: 0, cmds: 0, first: 0, snake: { best: 0, games: 0, apples: 0, bonus: 0, wrap: false } } };
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
                        st.stats.cmds = Number(saved.stats.cmds) || 0;
                        st.stats.first = Number(saved.stats.first) || 0;
                        if (Array.isArray(saved.stats.colors)) st.stats.colors = saved.stats.colors;
                        if (Array.isArray(saved.stats.tracks)) st.stats.tracks = saved.stats.tracks;
                        if (saved.stats.snake && typeof saved.stats.snake === 'object') st.stats.snake = Object.assign(st.stats.snake, saved.stats.snake);
                    }
                }
            } catch (err) { /* localStorage недоступен: работаем без сохранения */ }
            return st;
        }

        const state = loadState();
        let saveLocked = false; // true во время импорта, чтобы ничего не затёрло новые данные
        function saveState() {
            if (saveLocked) return;
            try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
        }

        // Иконки 8x8: '#' - закрашенный пиксель, цвет берётся из темы (currentColor)
        const ICONS = {
            star: ['...##...', '...##...', '########', '.######.', '..####..', '.######.', '.##..##.', '.#....#.'],
            heart: ['.##..##.', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
            key: ['..####..', '.##..##.', '.##..##.', '..####..', '...##...', '...###..', '...##...', '...###..'],
            lock: ['..####..', '.##..##.', '.##..##.', '########', '########', '###..###', '########', '########'],
            skull: ['.######.', '########', '#..##..#', '#..##..#', '########', '.##..##.', '..####..', '..#..#..'],
            note: ['...#####', '...#####', '...#...#', '...#...#', '...#...#', '.###.###', '####.###', '.##..##.'],
            disk: ['#######.', '#.....##', '#.###.##', '#.###.##', '#.....##', '#.####.#', '#.####.#', '########'],
            bolt: ['....##..', '...##...', '..##....', '.######.', '...##...', '..##....', '.##.....', '.#......'],
            eye: ['........', '..####..', '.#....#.', '#..##..#', '#..##..#', '.#....#.', '..####..', '........'],
            gear: ['...##...', '.######.', '.##..##.', '###..###', '###..###', '.##..##.', '.######.', '...##...'],
            flag: ['#####...', '######..', '#######.', '######..', '#.......', '#.......', '#.......', '#.......'],
            trophy: ['########', '#.####.#', '#.####.#', '.######.', '..####..', '...##...', '..####..', '.######.'],
            ghost: ['..####..', '.######.', '##.##.##', '##.##.##', '########', '########', '########', '#.#..#.#'],
            bubble: ['########', '#......#', '#.#.#..#', '#......#', '########', '..##....', '.##.....', '.#......'],
            clock: ['..####..', '.#....#.', '#..#...#', '#..#...#', '#..###.#', '#......#', '.#....#.', '..####..'],
            moon: ['..####..', '.##.....', '##......', '##......', '##......', '.##.....', '..#####.', '........'],
            sun: ['...##...', '#..##..#', '.######.', '########', '########', '.######.', '#..##..#', '...##...'],
            crown: ['#..##..#', '##.##.##', '########', '########', '########', '.######.', '........', '........'],
            bug: ['.#....#.', '..#..#..', '.######.', '########', '#.####.#', '########', '.#.##.#.', '#......#'],
            prompt: ['########', '#......#', '#.#....#', '#..#...#', '#.#.##.#', '#......#', '########', '........'],
            power: ['...##...', '.#.##.#.', '#..##..#', '#..##..#', '#......#', '.#....#.', '..####..', '........'],
            drop: ['...##...', '...##...', '..####..', '.######.', '########', '########', '.######.', '..####..'],
            cursor: ['#.......', '##......', '###.....', '####....', '#####...', '####....', '.##.#...', '.#...#..'],
            book: ['.######.', '#.....##', '#.###.##', '#.....##', '#.###.##', '#.....##', '.######.', '........'],
            arrow: ['....#...', '....##..', '#######.', '########', '#######.', '....##..', '....#...', '........'],
            tab: ['........', '...#..#.', '...##.#.', '#######.', '...##.#.', '...#..#.', '........', '........'],
            speaker: ['...#....', '..##..#.', '###..#.#', '###..#.#', '###..#.#', '..##..#.', '...#....', '........'],
            mute: ['...#....', '..##....', '###..#.#', '###...#.', '###..#.#', '..##....', '...#....', '........'],
            shield: ['########', '########', '########', '########', '.######.', '..####..', '...##...', '........'],
            diamond: ['..####..', '.######.', '########', '.######.', '..####..', '...##...', '........', '........'],
            magnifier: ['.####...', '#....#..', '#....#..', '#....#..', '.####...', '....##..', '.....##.', '......##'],
            hourglass: ['########', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '########'],
            phone: ['.######.', '.#....#.', '.#....#.', '.#....#.', '.#....#.', '.######.', '.######.', '..####..'],
            snake: ['.######.', '##....##', '##......', '.######.', '......##', '##....##', '.######.', '........'],
            apple: ['....##..', '...#....', '.######.', '########', '########', '########', '.######.', '..#..#..']
        };

        const ACH_CATS = ['СИСТЕМА', 'ТЕРМИНАЛ', 'ЦВЕТА', 'ПЛЕЕР', 'СПАТИ', 'ЗМЕЙКА'];

        const ACHIEVEMENTS = [
            // ---- СИСТЕМА ----
            { id: 'boot',       cat: 'СИСТЕМА', icon: 'power',     title: 'ДОБРО ПОЖАЛОВАТЬ', desc: 'Запусти Spatium OS' },
            { id: 'regular',    cat: 'СИСТЕМА', icon: 'clock',     title: 'ПОСТОЯННЫЙ ГОСТЬ', desc: 'Загляни в систему 3 раза' },
            { id: 'regular10',  cat: 'СИСТЕМА', icon: 'crown',     title: 'ЗАВСЕГДАТАЙ',      desc: 'Загляни в систему 10 раз' },
            { id: 'regular50',  cat: 'СИСТЕМА', icon: 'diamond',   title: 'ПРЕДАННЫЙ',        desc: 'Загляни в систему 50 раз', rarity: 'legendary' },
            { id: 'marathon',   cat: 'СИСТЕМА', icon: 'hourglass', title: 'МАРАФОН',          desc: 'Просиди в системе 10 минут подряд' },
            { id: 'pocket',     cat: 'СИСТЕМА', icon: 'phone',     title: 'КАРМАННЫЙ ТЕРМИНАЛ', desc: 'Нажми кнопку панели быстрых клавиш' },
            { id: 'nerves',     cat: 'СИСТЕМА', icon: 'cursor',    title: 'НЕРВЫ',            desc: 'Кликни по экрану 30 раз за один заход' },
            { id: 'ach_open',   cat: 'СИСТЕМА', icon: 'star',      title: 'ГОРДОСТЬ',         desc: 'Открой окно достижений' },
            { id: 'off',        cat: 'СИСТЕМА', icon: 'flag',      title: 'ДО СВИДАНИЯ',      desc: 'Выключи систему командой off' },
            { id: 'half',       cat: 'СИСТЕМА', icon: 'shield',    title: 'ПОЛОВИНА ПУТИ',    desc: 'Открой половину всех достижений' },
            { id: 'master',     cat: 'СИСТЕМА', icon: 'trophy',    title: 'МАСТЕР SPATIUM',   desc: 'Открой все остальные достижения' },
            { id: 'konami',     cat: 'СИСТЕМА', icon: 'diamond',   title: 'КОД КОНАМИ',       desc: 'Введи легендарный код с клавиатуры', hidden: true },
            // ---- ТЕРМИНАЛ ----
            { id: 'first_cmd',  cat: 'ТЕРМИНАЛ', icon: 'prompt',   title: 'ПЕРВЫЙ ШАГ',       desc: 'Выполни любую команду' },
            { id: 'help',       cat: 'ТЕРМИНАЛ', icon: 'book',     title: 'ЧИТАТЕЛЬ',         desc: 'Открой справку командой help' },
            { id: 'cmd10',      cat: 'ТЕРМИНАЛ', icon: 'gear',     title: 'ПРИВЫЧКА',         desc: 'Выполни 10 команд' },
            { id: 'cmd50',      cat: 'ТЕРМИНАЛ', icon: 'bolt',     title: 'ОПЕРАТОР',         desc: 'Выполни 50 команд' },
            { id: 'cmd200',     cat: 'ТЕРМИНАЛ', icon: 'crown',    title: 'СИСАДМИН',         desc: 'Выполни 200 команд' },
            { id: 'clear',      cat: 'ТЕРМИНАЛ', icon: 'drop',     title: 'ЧИСТЫЙ ЛИСТ',      desc: 'Очисти экран командой clear' },
            { id: 'time',       cat: 'ТЕРМИНАЛ', icon: 'clock',    title: 'ЧАСОВЩИК',         desc: 'Узнай время командой time или date' },
            { id: 'echo',       cat: 'ТЕРМИНАЛ', icon: 'bubble',   title: 'ЭХО',              desc: 'Выведи любой текст командой echo' },
            { id: 'history',    cat: 'ТЕРМИНАЛ', icon: 'disk',     title: 'ПАМЯТЬ',           desc: 'Вызови прошлую команду стрелкой вверх' },
            { id: 'history_cmd', cat: 'ТЕРМИНАЛ', icon: 'book',    title: 'АРХИВАРИУС',       desc: 'Просмотри историю командой history' },
            { id: 'tab',        cat: 'ТЕРМИНАЛ', icon: 'tab',      title: 'АВТОДОПОЛНЕНИЕ',   desc: 'Нажми Tab при вводе команды' },
            { id: 'unknown',    cat: 'ТЕРМИНАЛ', icon: 'bug',      title: 'ОПЕЧАТКА',         desc: 'Введи несуществующую команду' },
            { id: 'long',       cat: 'ТЕРМИНАЛ', icon: 'key',      title: 'ПИСАТЕЛЬ',         desc: 'Введи команду длиннее 60 символов' },
            { id: 'hacker',     cat: 'ТЕРМИНАЛ', icon: 'skull',    title: 'ХАКЕР',            desc: 'Запусти режим хакера' },
            { id: 'matrix',     cat: 'ТЕРМИНАЛ', icon: 'eye',      title: 'ПРОБУЖДЕНИЕ',      desc: 'Запусти дождь Матрицы командой matrix' },
            { id: 'screensaver', cat: 'СИСТЕМА', icon: 'moon',     title: 'ЗАСНУЛ?',          desc: 'Дождись скринсейвера: минута без действий' },
            { id: 'hacker_long', cat: 'ТЕРМИНАЛ', icon: 'eye',     title: 'ТЕРПЕНИЕ',         desc: 'Продержи режим хакера 10 секунд' },
            { id: 'speedrun',   cat: 'ТЕРМИНАЛ', icon: 'bolt',     title: 'СКОРОСТНОЙ',       desc: 'Выполни 5 команд за 10 секунд', rarity: 'rare' },
            { id: 'sudo',       cat: 'ТЕРМИНАЛ', icon: 'lock',     title: 'НЕТ ПРАВ',         desc: 'Попробуй получить права суперпользователя', hidden: true, rarity: 'rare' },
            { id: 'rmrf',       cat: 'ТЕРМИНАЛ', icon: 'skull',    title: 'САМОУНИЧТОЖЕНИЕ',  desc: 'Попробуй снести систему командой rm -rf /', hidden: true, rarity: 'epic' },
            // ---- ЦВЕТА ----
            { id: 'color',      cat: 'ЦВЕТА', icon: 'drop',        title: 'ДИЗАЙНЕР',         desc: 'Смени цветовую схему' },
            { id: 'color_help', cat: 'ЦВЕТА', icon: 'magnifier',   title: 'ПАЛИТРА',          desc: 'Открой список цветов командой color help' },
            { id: 'rainbow',    cat: 'ЦВЕТА', icon: 'star',        title: 'РАДУГА',           desc: 'Попробуй 5 разных цветов' },
            { id: 'chameleon',  cat: 'ЦВЕТА', icon: 'eye',         title: 'ХАМЕЛЕОН',         desc: 'Попробуй 15 разных цветов' },
            { id: 'color_clear', cat: 'ЦВЕТА', icon: 'arrow',      title: 'ВОЗВРАТ',          desc: 'Верни цвет по умолчанию командой color clear' },
            { id: 'color_random', cat: 'ЦВЕТА', icon: 'diamond',   title: 'АЗАРТ',            desc: 'Доверься случаю: color random' },
            { id: 'retro',      cat: 'ЦВЕТА', icon: 'disk',        title: 'РЕТРО',            desc: 'Попробуй vapor, gameboy, c64 и dos' },
            { id: 'all_colors', cat: 'ЦВЕТА', icon: 'crown',       title: 'КОЛЛЕКЦИОНЕР',     desc: 'Попробуй все доступные цвета' },
            // ---- ПЛЕЕР ----
            { id: 'player',     cat: 'ПЛЕЕР', icon: 'note',        title: 'ДИДЖЕЙ',           desc: 'Открой аудиоплеер' },
            { id: 'console_dj', cat: 'ПЛЕЕР', icon: 'prompt',      title: 'КОНСОЛЬНЫЙ ДИДЖЕЙ', desc: 'Управляй плеером из терминала' },
            { id: 'melomaniac', cat: 'ПЛЕЕР', icon: 'heart',       title: 'МЕЛОМАН',          desc: 'Послушай все треки' },
            { id: 'full_track', cat: 'ПЛЕЕР', icon: 'flag',        title: 'ДО КОНЦА',         desc: 'Дослушай трек до самого конца' },
            { id: 'skipper',    cat: 'ПЛЕЕР', icon: 'arrow',       title: 'ПЕРЕКЛЮЧАТЕЛЬ',    desc: 'Переключи трек 10 раз' },
            { id: 'loud',       cat: 'ПЛЕЕР', icon: 'speaker',     title: 'ГРОМКО',           desc: 'Выставь громкость от 80%' },
            { id: 'quiet',      cat: 'ПЛЕЕР', icon: 'mute',        title: 'ТИШИНА',           desc: 'Отключи звук плеера' },
            // ---- СПАТИ ----
            { id: 'spati',      cat: 'СПАТИ', icon: 'ghost',       title: 'ПЕРВЫЙ КОНТАКТ',   desc: 'Разбуди Спати', hidden: true },
            { id: 'chatty',     cat: 'СПАТИ', icon: 'bubble',      title: 'БОЛТЛИВЫЙ',        desc: 'Задай Спати 5 вопросов', hidden: true },
            { id: 'spati_friend', cat: 'СПАТИ', icon: 'heart',     title: 'ДРУЖБА',           desc: 'Задай Спати 20 вопросов', hidden: true },
            { id: 'spati_hello', cat: 'СПАТИ', icon: 'sun',        title: 'ВЕЖЛИВОСТЬ',       desc: 'Поздоровайся со Спати', hidden: true },
            { id: 'spati_thanks', cat: 'СПАТИ', icon: 'heart',     title: 'БЛАГОДАРНОСТЬ',    desc: 'Поблагодари Спати', hidden: true },
            { id: 'spati_joke', cat: 'СПАТИ', icon: 'star',        title: 'ЮМОРИСТ',          desc: 'Попроси Спати пошутить', hidden: true },
            { id: 'spati_love', cat: 'СПАТИ', icon: 'heart',       title: 'ОБАЯНИЕ',          desc: 'Скажи Спати что-нибудь приятное', hidden: true },
            { id: 'spati_rude', cat: 'СПАТИ', icon: 'skull',       title: 'ГРУБИЯН',          desc: 'Обидь Спати', hidden: true },
            { id: 'spati_meaning', cat: 'СПАТИ', icon: 'eye',      title: 'ФИЛОСОФ',          desc: 'Спроси Спати о смысле жизни', hidden: true },
            { id: 'spati_zenit', cat: 'СПАТИ', icon: 'magnifier',  title: 'ЛЮБОПЫТСТВО',      desc: 'Заикнись при Спати о Зените', hidden: true },
            { id: 'spati_off',  cat: 'СПАТИ', icon: 'lock',        title: 'ТИШИНА В ЭФИРЕ',   desc: 'Усыпи Спати кнопкой СПАТИ в верхней панели', hidden: true },
            { id: 'crash',      cat: 'СПАТИ', icon: 'skull',       title: 'СБОЙ СИСТЕМЫ',     desc: 'Спроси Спати о запретном', hidden: true },
            { id: 'paranoid',   cat: 'ТЕРМИНАЛ', icon: 'eye',      title: 'ПАРАНОИК',         desc: 'Запусти режим хакера 3 раза за один заход', rarity: 'rare' },
            { id: 'light_show', cat: 'ЦВЕТА', icon: 'bolt',        title: 'СВЕТОМУЗЫКА',      desc: 'Смени цвет 5 раз за 10 секунд', rarity: 'rare' },
            { id: 'gold_rush',  cat: 'ЦВЕТА', icon: 'crown',       title: 'ЗОЛОТАЯ ЛИХОРАДКА', desc: 'Попробуй gold, amber и yellow', rarity: 'common' },
            { id: 'rewind',     cat: 'ПЛЕЕР', icon: 'arrow',       title: 'ПЕРЕМОТКА',        desc: 'Передвинь ползунок перемотки трека', rarity: 'common' },
            { id: 'deep_cut',   cat: 'ПЛЕЕР', icon: 'disk',        title: 'ГЛУБОКИЙ ТРЕК',    desc: 'Включи последний трек плейлиста', rarity: 'common' },
            { id: 'spati_ach',  cat: 'СПАТИ', icon: 'trophy',      title: 'САМОКОПАНИЕ',      desc: 'Спроси Спати про достижения', hidden: true, rarity: 'common' },
            { id: 'spati_hacker', cat: 'СПАТИ', icon: 'bug', title: 'СОУЧАСТНИК', desc: 'Заговори со Спати о взломе', hidden: true, rarity: 'common' },
            { id: 'regular25', cat: 'СИСТЕМА', icon: 'clock', title: 'ПОСТОЯНСТВО', desc: 'Загляни в систему 25 раз', rarity: 'rare' },
            { id: 'logo5', cat: 'СИСТЕМА', icon: 'star', title: 'S_ ЛЮБИТЕЛЬ', desc: 'Кликни по логотипу S_ 5 раз', rarity: 'common' },
            { id: 'cmd100', cat: 'ТЕРМИНАЛ', icon: 'gear', title: 'СОТНЯ', desc: 'Выполни 100 команд', rarity: 'rare' },
            { id: 'cmd500', cat: 'ТЕРМИНАЛ', icon: 'crown', title: 'ЛЕГЕНДА ТЕРМИНАЛА', desc: 'Выполни 500 команд', rarity: 'epic' },
            { id: 'minimal', cat: 'ТЕРМИНАЛ', icon: 'prompt', title: 'МИНИМАЛИСТ', desc: 'Введи команду из одного символа', rarity: 'common' },
            { id: 'caps', cat: 'ТЕРМИНАЛ', icon: 'bolt', title: 'КАПС', desc: 'Введи команду ЗАГЛАВНЫМИ БУКВАМИ', rarity: 'common' },
            { id: 'repeat', cat: 'ТЕРМИНАЛ', icon: 'disk', title: 'ПОВТОРЕНИЕ', desc: 'Введи одну и ту же команду два раза подряд', rarity: 'common' },
            { id: 'unknown5', cat: 'ТЕРМИНАЛ', icon: 'bug', title: 'УПРЯМЕЦ', desc: 'Введи 5 несуществующих команд за один заход', rarity: 'rare' },
            { id: 'orator', cat: 'ТЕРМИНАЛ', icon: 'bubble', title: 'ОРАТОР', desc: 'Выведи через echo текст из 5 и более слов', rarity: 'common' },
            { id: 'math', cat: 'ТЕРМИНАЛ', icon: 'magnifier', title: 'МАТЕМАТИК', desc: 'Введи в терминале одно число', rarity: 'common' },
            { id: 'please', cat: 'ТЕРМИНАЛ', icon: 'heart', title: 'ВЕЖЛИВЫЙ ОПЕРАТОР', desc: 'Скажи терминалу «пожалуйста»', rarity: 'common' },
            { id: 'linux', cat: 'ТЕРМИНАЛ', icon: 'key', title: 'ЛИНУКСОИД', desc: 'Попробуй ls, cd, pwd, cat или whoami', rarity: 'common' },
            { id: 'exit', cat: 'ТЕРМИНАЛ', icon: 'lock', title: 'НЕ УЙДЁШЬ', desc: 'Попробуй выйти командой exit или quit', rarity: 'common' },
            { id: 'hello', cat: 'ТЕРМИНАЛ', icon: 'sun', title: 'ПРИВЕТ, МИР', desc: 'Введи hello или привет', rarity: 'common' },
            { id: 'help3', cat: 'ТЕРМИНАЛ', icon: 'book', title: 'ЗАБЫВЧИВЫЙ', desc: 'Открой help 3 раза за один заход', rarity: 'common' },
            { id: 'color_red', cat: 'ЦВЕТА', icon: 'skull', title: 'КРАСНАЯ ТРЕВОГА', desc: 'Включи красный цвет', rarity: 'common' },
            { id: 'color_white', cat: 'ЦВЕТА', icon: 'eye', title: 'СЛЕПОТА', desc: 'Включи белый цвет', rarity: 'common' },
            { id: 'pause_cmd', cat: 'ПЛЕЕР', icon: 'mute', title: 'ПАУЗА', desc: 'Поставь музыку на паузу командой pause', rarity: 'common' },
            { id: 'prev_cmd', cat: 'ПЛЕЕР', icon: 'arrow', title: 'НАЗАД В ПРОШЛОЕ', desc: 'Вернись к прошлому треку командой prev', rarity: 'common' },
            { id: 'spati_long', cat: 'СПАТИ', icon: 'bubble', title: 'МОНОЛОГ', desc: 'Напиши Спати сообщение длиннее 50 символов', hidden: true, rarity: 'rare' },
            { id: 'cmd1000', cat: 'ТЕРМИНАЛ', icon: 'crown', title: 'БОГ ТЕРМИНАЛА', desc: 'Выполни 1000 команд', rarity: 'legendary' },
            { id: 'regular100', cat: 'СИСТЕМА', icon: 'diamond', title: 'ВЕЧНЫЙ СТРАЖ', desc: 'Загляни в систему 100 раз', rarity: 'legendary' },
            { id: 'spati_legend', cat: 'СПАТИ', icon: 'ghost', title: 'ЛЕГЕНДА СПАТИ', desc: 'Задай Спати 100 вопросов', rarity: 'legendary' },
            { id: 'skipper100', cat: 'ПЛЕЕР', icon: 'trophy', title: 'БЕЗДОННЫЙ ПЛЕЙЛИСТ', desc: 'Переключи трек 100 раз за один заход', rarity: 'legendary' },
            { id: 'secret_all', cat: 'СИСТЕМА', icon: 'eye', title: 'ТАЙНЫЙ АРХИВ', desc: 'Открой все скрытые достижения', rarity: 'legendary' },
            { id: 'echo10', cat: 'ТЕРМИНАЛ', icon: 'bubble', title: 'ПОПУГАЙ', desc: 'Используй echo с текстом 10 раз за один заход', rarity: 'rare' },
            { id: 'clear5', cat: 'ТЕРМИНАЛ', icon: 'drop', title: 'ПЕДАНТ', desc: 'Очисти экран 5 раз за один заход', rarity: 'common' },
            { id: 'color_green', cat: 'ЦВЕТА', icon: 'power', title: 'КЛАССИКА', desc: 'Включи цвет green', rarity: 'common' },
            { id: 'color_matrix', cat: 'ЦВЕТА', icon: 'bug', title: 'ВЫБОР НЕО', desc: 'Включи цвет matrix', rarity: 'common' },
            { id: 'play_cmd', cat: 'ПЛЕЕР', icon: 'note', title: 'ПУСК', desc: 'Запусти музыку командой play', rarity: 'common' },
            { id: 'next_cmd', cat: 'ПЛЕЕР', icon: 'arrow', title: 'ВПЕРЁД', desc: 'Включи следующий трек командой next', rarity: 'common' },
            { id: 'ach_cmd', cat: 'СИСТЕМА', icon: 'trophy', title: 'ОХОТНИК', desc: 'Введи в терминале команду ach', rarity: 'common' },
            { id: 'symbols', cat: 'ТЕРМИНАЛ', icon: 'key', title: 'ШИФРОВКА', desc: 'Введи команду только из символов, без букв и цифр', rarity: 'rare' },
            { id: 'long100', cat: 'ТЕРМИНАЛ', icon: 'book', title: 'РОМАН', desc: 'Введи команду длиннее 100 символов', rarity: 'rare' },
            { id: 'spati_10', cat: 'СПАТИ', icon: 'bubble', title: 'СОБЕСЕДНИК', desc: 'Задай Спати 10 вопросов', hidden: true, rarity: 'rare' },
            { id: 'unknown20', cat: 'ТЕРМИНАЛ', icon: 'skull', title: 'ЭКСПЕРИМЕНТАТОР', desc: 'Введи 20 несуществующих команд за один заход', rarity: 'epic' },
            // ---- НОВЫЕ: только эпические и легендарные ----
            { id: 'logo25', cat: 'СИСТЕМА', icon: 'star', title: 'ФАНАТ ЛОГОТИПА', desc: 'Кликни по логотипу S_ 25 раз за один заход', rarity: 'epic' },
            { id: 'long_session', cat: 'СИСТЕМА', icon: 'hourglass', title: 'ВАХТА', desc: 'Просиди в системе 60 минут подряд', rarity: 'legendary' },
            { id: 'cmd_session100', cat: 'ТЕРМИНАЛ', icon: 'prompt', title: 'ШКВАЛ КОМАНД', desc: 'Выполни 100 команд за один заход', rarity: 'epic' },
            { id: 'unknown50', cat: 'ТЕРМИНАЛ', icon: 'bug', title: 'ХАОС-ИНЖЕНЕР', desc: 'Введи 50 несуществующих команд за один заход', rarity: 'legendary' },
            { id: 'color_storm', cat: 'ЦВЕТА', icon: 'bolt', title: 'ЦВЕТОВАЯ БУРЯ', desc: 'Смени цвет 15 раз за 30 секунд', rarity: 'epic' },
            { id: 'color_spree', cat: 'ЦВЕТА', icon: 'diamond', title: 'ПРИЗМА', desc: 'Смени цвет 50 раз за один заход', rarity: 'legendary' },
            { id: 'listener10', cat: 'ПЛЕЕР', icon: 'note', title: 'НАСЛУШАННЫЙ', desc: 'Дослушай до конца 10 треков за один заход', rarity: 'epic' },
            { id: 'dj_hour', cat: 'ПЛЕЕР', icon: 'speaker', title: 'ЧАС ПОВЕР', desc: 'Слушай музыку суммарно 60 минут за один заход', rarity: 'legendary' },
            { id: 'spati_50', cat: 'СПАТИ', icon: 'ghost', title: 'ЗАДУШЕВНЫЙ РАЗГОВОР', desc: 'Задай Спати 50 вопросов', rarity: 'epic' },
            { id: 'spati_250', cat: 'СПАТИ', icon: 'crown', title: 'ВЕРНЫЙ СПУТНИК', desc: 'Задай Спати 250 вопросов', rarity: 'legendary' },
            // ---- ЗМЕЙКА ----
            { id: 'snake_start', cat: 'ЗМЕЙКА', icon: 'power', title: 'ЗМЕЙКА В ТЕРМИНАЛЕ', desc: 'Запусти змейку командой snake', rarity: 'common' },
            { id: 'snake_first', cat: 'ЗМЕЙКА', icon: 'apple', title: 'ПЕРВЫЙ УКУС', desc: 'Съешь первое яблоко', rarity: 'common' },
            { id: 'snake_10', cat: 'ЗМЕЙКА', icon: 'heart', title: 'ГОЛОДНАЯ', desc: 'Набери 10 очков в одной партии', rarity: 'common' },
            { id: 'snake_wall', cat: 'ЗМЕЙКА', icon: 'lock', title: 'ЛБОМ О СТЕНУ', desc: 'Врежься в стену', rarity: 'common' },
            { id: 'snake_self', cat: 'ЗМЕЙКА', icon: 'skull', title: 'УРОБОРОС', desc: 'Укуси себя за хвост', rarity: 'common' },
            { id: 'snake_pause', cat: 'ЗМЕЙКА', icon: 'hourglass', title: 'ПЕРЕКУР', desc: 'Поставь змейку на паузу', rarity: 'common' },
            { id: 'snake_games5', cat: 'ЗМЕЙКА', icon: 'flag', title: 'НЕ СДАЮСЬ', desc: 'Сыграй 5 партий', rarity: 'common' },
            { id: 'snake_swipe', cat: 'ЗМЕЙКА', icon: 'cursor', title: 'СВАЙПЕР', desc: 'Поверни змейку свайпом по полю', rarity: 'common' },
            { id: 'snake_25', cat: 'ЗМЕЙКА', icon: 'snake', title: 'ПИТОН', desc: 'Набери 25 очков в одной партии', rarity: 'rare' },
            { id: 'snake_bonus', cat: 'ЗМЕЙКА', icon: 'star', title: 'ЗОЛОТОЕ ЯБЛОКО', desc: 'Съешь бонусное яблоко', rarity: 'rare' },
            { id: 'snake_quick', cat: 'ЗМЕЙКА', icon: 'bolt', title: 'СПРИНТ', desc: 'Съешь 3 яблока за 5 секунд', rarity: 'rare' },
            { id: 'snake_wrap', cat: 'ЗМЕЙКА', icon: 'arrow', title: 'ПОРТАЛ', desc: 'Пройди сквозь край поля в режиме ПОРТАЛЫ', rarity: 'rare' },
            { id: 'snake_games25', cat: 'ЗМЕЙКА', icon: 'gear', title: 'ЗАВСЕГДАТАЙ ПОЛЯ', desc: 'Сыграй 25 партий', rarity: 'rare' },
            { id: 'snake_13', cat: 'ЗМЕЙКА', icon: 'eye', title: 'ЧЁРТОВА ДЮЖИНА', desc: 'Закончи партию ровно с 13 очками', hidden: true, rarity: 'rare' },
            { id: 'snake_50', cat: 'ЗМЕЙКА', icon: 'snake', title: 'АНАКОНДА', desc: 'Набери 50 очков в одной партии', rarity: 'epic' },
            { id: 'snake_nowall', cat: 'ЗМЕЙКА', icon: 'diamond', title: 'БЕЗ ГРАНИЦ', desc: 'Набери 30 очков в режиме ПОРТАЛЫ', rarity: 'epic' },
            { id: 'snake_bonus5', cat: 'ЗМЕЙКА', icon: 'star', title: 'ЗОЛОТАЯ ЖИЛА', desc: 'Съешь 5 бонусных яблок суммарно', rarity: 'epic' },
            { id: 'snake_total200', cat: 'ЗМЕЙКА', icon: 'apple', title: 'ПОЖИРАТЕЛЬ', desc: 'Съешь 200 яблок суммарно', rarity: 'epic' },
            { id: 'snake_all', cat: 'ЗМЕЙКА', icon: 'shield', title: 'ЗМЕЕЛОВ', desc: 'Открой все остальные достижения змейки', rarity: 'epic' },
            { id: 'snake_100', cat: 'ЗМЕЙКА', icon: 'crown', title: 'ВАСИЛИСК', desc: 'Набери 100 очков в одной партии', rarity: 'legendary' },
            { id: 'snake_total1000', cat: 'ЗМЕЙКА', icon: 'trophy', title: 'ЗМЕИНЫЙ КОРОЛЬ', desc: 'Съешь 1000 яблок суммарно', rarity: 'legendary' },
            { id: 'spati_snake', cat: 'СПАТИ', icon: 'ghost', title: 'ТРЕНЕР', desc: 'Поговори со Спати о змейке', hidden: true, rarity: 'common' },
            { id: 'save_export', cat: 'СИСТЕМА', icon: 'disk', title: 'РЕЗЕРВНАЯ КОПИЯ', desc: 'Сохрани прогресс в файл', rarity: 'common' },
            { id: 'save_import', cat: 'СИСТЕМА', icon: 'arrow', title: 'ВОСКРЕШЕНИЕ', desc: 'Загрузи прогресс из файла', rarity: 'rare' }
        ];
        // ----- редкость -----
        const RARITIES = {
            common:    { label: 'ОБЫЧНОЕ' },
            rare:      { label: 'РЕДКОЕ' },
            epic:      { label: 'ЭПИЧЕСКОЕ' },
            legendary: { label: 'ЛЕГЕНДАРНОЕ' }
        };
        const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
        const RARITY_BY_ID = {
            rare: ['regular', 'marathon', 'nerves', 'half', 'cmd50', 'hacker_long', 'rainbow', 'retro',
                   'melomaniac', 'full_track', 'skipper', 'chatty', 'spati_joke', 'spati_meaning', 'spati_zenit',
                   'spati_rude', 'spati_love', 'spati_off'],
            epic: ['regular10', 'cmd200', 'chameleon', 'all_colors', 'konami', 'spati_friend', 'crash'],
            legendary: ['master']
        };
        ACHIEVEMENTS.forEach(a => {
            if (!a.rarity) {
                a.rarity = 'common';
                RARITY_ORDER.forEach(r => { if ((RARITY_BY_ID[r] || []).includes(a.id)) a.rarity = r; });
            }
        });

        const achById = {};
        ACHIEVEMENTS.forEach(a => { achById[a.id] = a; });

        const achToastStack = document.getElementById('achToastStack');
        const achCountEl = document.getElementById('achCount');
        const achBarCountEl = document.getElementById('achBarCount');
        const achWindow = document.getElementById('achWindow');
        const achBody = document.getElementById('achBody');
        const achCloseBtn = document.getElementById('achCloseBtn');
        const achBtn = document.getElementById('achBtn');
        const achBtnIcon = document.getElementById('achBtnIcon');
        const achPanel = document.getElementById('achPanel');
        let achWindowOpen = false;
        let achView = 'stats';
        let achFilter = 'all';
        let achSort = 'cat'; // 'cat' - по разделам, 'rar' - по редкости
        const toastQueue = [];
        let toastActive = 0;
        let toastPumping = false;
        const TOAST_MAX = 5;      // сколько уведомлений видно одновременно
        const TOAST_LIFE = 4000;  // сколько живёт одно уведомление, мс
        const TOAST_GAP = 280;    // задержка между появлением соседних, мс
        const TOAST_LIFE_BY = { common: 3500, rare: 4200, epic: 5200, legendary: 7000 }; // чем реже, тем дольше
        const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        const unlockedCount = () => ACHIEVEMENTS.filter(a => state.ach[a.id]).length;

        function updateAchCount() {
            const text = `${unlockedCount()}/${ACHIEVEMENTS.length}`;
            if (achCountEl) achCountEl.textContent = text;
            if (achBarCountEl) achBarCountEl.textContent = text;
        }

        // ----- пиксельные иконки -----
        const SVG_NS = 'http://www.w3.org/2000/svg';
        function makeIcon(name) {
            const rows = ICONS[name] || ICONS.star;
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('viewBox', '0 0 8 8');
            svg.setAttribute('class', 'ach-icon');
            svg.setAttribute('shape-rendering', 'crispEdges');
            svg.setAttribute('aria-hidden', 'true');
            rows.forEach((row, y) => {
                let x = 0;
                while (x < 8) {
                    if (row[x] === '#') {
                        let w = 1;
                        while (x + w < 8 && row[x + w] === '#') w++;
                        const rect = document.createElementNS(SVG_NS, 'rect');
                        rect.setAttribute('x', x);
                        rect.setAttribute('y', y);
                        rect.setAttribute('width', w);
                        rect.setAttribute('height', 1);
                        rect.setAttribute('fill', 'currentColor');
                        svg.appendChild(rect);
                        x += w;
                    } else {
                        x++;
                    }
                }
            });
            return svg;
        }

        // ----- звук получения достижения (Web Audio, без файлов) -----
        // ==========================================
        // ЗВУКИ СТАРОГО ПК (WebAudio, без аудиофайлов)
        // ==========================================
        const SFX_KEY = 'spatium_sfx';
        let sfxEnabled = true;
        try { sfxEnabled = localStorage.getItem(SFX_KEY) !== '0'; } catch (err) { /* ignore */ }
        let sfxCtx = null, sfxMaster = null, sfxNoise = null, sfxLastKey = 0, sfxBootPending = 0;

        function sfxEnsure() {
            if (sfxCtx) return sfxCtx;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            try {
                sfxCtx = new AC();
                sfxMaster = sfxCtx.createGain();
                sfxMaster.gain.value = 0.6;
                sfxMaster.connect(sfxCtx.destination);
                const len = sfxCtx.sampleRate;
                sfxNoise = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
                const d = sfxNoise.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            } catch (err) { sfxCtx = null; }
            return sfxCtx;
        }
        function sfxMuted() { try { return bgAudio.muted; } catch (err) { return false; } }
        function sfxResume(c) {
            try { const p = c.resume(); if (p && p.catch) p.catch(() => {}); return p; } catch (err) { return null; }
        }
        // strict = true: играть только если браузер уже разрешил звук
        function sfxReady(strict) {
            if (!sfxEnabled || sfxMuted()) return null;
            const c = sfxEnsure();
            if (!c) return null;
            if (c.state === 'suspended') sfxResume(c);
            if (strict && c.state !== 'running') return null;
            return c;
        }
        function sfxBurst(t, dur, o) {
            const c = sfxCtx;
            const src = c.createBufferSource();
            src.buffer = sfxNoise;
            const f = c.createBiquadFilter();
            f.type = o.type || 'highpass';
            f.frequency.value = o.freq || 2000;
            f.Q.value = o.q || 0.8;
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.atk || 0.001));
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(f).connect(g).connect(sfxMaster);
            src.start(t, Math.random() * 0.5);
            src.stop(t + dur + 0.02);
        }
        function sfxTone(t, o) {
            const c = sfxCtx;
            const dur = o.dur || 0.1, gain = o.gain || 0.1;
            const osc = c.createOscillator();
            osc.type = o.type || 'square';
            osc.frequency.setValueAtTime(o.f0 || 440, t);
            if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
            if (o.hold) g.gain.setValueAtTime(gain, Math.max(t + 0.004, t + dur - 0.02));
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            let node = osc;
            if (o.lp) {
                const lp = c.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(o.lp[0], t);
                lp.frequency.exponentialRampToValueAtTime(o.lp[1], t + dur);
                osc.connect(lp);
                node = lp;
            }
            node.connect(g).connect(sfxMaster);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        }

        // Звуки терминала: отправка команды, Tab, стрелки вверх/вниз (обычная печать — без звука)
        function sfxKey(kind) {
            const c = sfxReady();
            if (!c) return;
            const now = performance.now();
            if (now - sfxLastKey < 25) return;
            sfxLastKey = now;
            const t = c.currentTime + 0.001;
            if (kind === 'send') {
                // Отправка команды: мягкий двойной «блип» вверх + тёплая нижняя нота
                sfxTone(t, { type: 'sine', f0: 660, dur: 0.07, gain: 0.13 });
                sfxTone(t + 0.06, { type: 'sine', f0: 990, dur: 0.11, gain: 0.11 });
                sfxTone(t, { type: 'triangle', f0: 330, f1: 495, dur: 0.12, gain: 0.05 });
            } else if (kind === 'tab') {
                // Tab: короткий «дзынь» автодополнения
                sfxTone(t, { type: 'triangle', f0: 880, f1: 1175, dur: 0.06, gain: 0.11 });
                sfxTone(t + 0.045, { type: 'sine', f0: 1320, dur: 0.07, gain: 0.05 });
            } else if (kind === 'up') {
                // Стрелка вверх: лёгкий подъём тона
                sfxTone(t, { type: 'triangle', f0: 520, f1: 780, dur: 0.055, gain: 0.10 });
            } else if (kind === 'down') {
                // Стрелка вниз: лёгкое падение тона
                sfxTone(t, { type: 'triangle', f0: 780, f1: 520, dur: 0.055, gain: 0.10 });
            }
        }

        // Окно достижений: мягкий восходящий «перезвон» при входе и нисходящий при выходе
        function sfxAch(kind, n) {
            const c = sfxReady();
            if (!c) return;
            const t = c.currentTime + 0.001;
            if (kind === 'open') {
                sfxTone(t, { type: 'sine', f0: 523, dur: 0.12, gain: 0.10 });
                sfxTone(t + 0.07, { type: 'sine', f0: 659, dur: 0.12, gain: 0.10 });
                sfxTone(t + 0.14, { type: 'sine', f0: 784, dur: 0.22, gain: 0.10 });
                sfxTone(t + 0.14, { type: 'triangle', f0: 1568, dur: 0.26, gain: 0.025 });
            } else if (kind === 'close') {
                sfxTone(t, { type: 'sine', f0: 784, dur: 0.08, gain: 0.08 });
                sfxTone(t + 0.07, { type: 'sine', f0: 523, dur: 0.14, gain: 0.08 });
            } else if (kind === 'pick') {
                // Кнопки фильтра и сортировки: короткий «тик-тун», у каждой кнопки свой тон
                const f = 520 + (n || 0) * 70;
                sfxTone(t, { type: 'sine', f0: f, dur: 0.04, gain: 0.09 });
                sfxTone(t + 0.04, { type: 'triangle', f0: f * 1.5, dur: 0.07, gain: 0.08 });
            }
        }

        // Загрузка: POST-бип, гул вентилятора, стук головок диска, «готово»
        function sfxBoot() {
            const c = sfxReady(true);
            if (!c) return false;
            const t = c.currentTime + 0.05;
            sfxTone(t + 0.12, { f0: 1000, dur: 0.16, gain: 0.07, hold: true });
            const src = c.createBufferSource();
            src.buffer = sfxNoise;
            src.loop = true;
            const lp = c.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(120, t + 0.1);
            lp.frequency.exponentialRampToValueAtTime(700, t + 0.9);
            lp.frequency.exponentialRampToValueAtTime(260, t + 1.6);
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.16, t + 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
            src.connect(lp).connect(g).connect(sfxMaster);
            src.start(t + 0.1);
            src.stop(t + 1.75);
            let tt = t + 0.35;
            for (let i = 0; i < 9; i++) {
                sfxBurst(tt, 0.014, { type: 'bandpass', freq: 1500 + Math.random() * 2000, q: 1.2, gain: 0.3 });
                tt += 0.05 + Math.random() * 0.11;
            }
            sfxTone(t + 1.35, { f0: 880, dur: 0.07, gain: 0.05, hold: true });
            return true;
        }
        function sfxBootAttempt() {
            if (sfxBoot()) return;
            sfxBootPending = Date.now();
            // Контекст создан внутри жеста, но resume() асинхронный: играем сразу, как только он станет running
            const c = sfxEnsure();
            if (!c) return;
            const p = sfxResume(c);
            if (p && p.then) p.then(() => {
                if (!sfxBootPending) return;
                sfxBootPending = 0;
                sfxBoot();
            }).catch(() => {});
        }
        // Браузер не пускает звук до первого касания/клавиши: догоняем загрузочный звук, если успели
        function sfxLateBoot() {
            const late = Date.now() - sfxBootPending;
            sfxBootPending = 0;
            if (late > 6000 || !sfxEnabled || sfxMuted()) return;
            const c = sfxEnsure();
            if (!c) return;
            if (c.state === 'running') { sfxBoot(); return; }
            const p = sfxResume(c);
            if (p && p.then) p.then(() => sfxBoot()).catch(() => {});
        }

        // Выключение: падающий тон, треск кинескопа, «бух» реле
        function sfxOff() {
            const c = sfxReady();
            if (!c) return;
            const t = c.currentTime + 0.01;
            sfxTone(t, { type: 'sawtooth', f0: 520, f1: 38, dur: 0.55, gain: 0.09, lp: [1400, 150] });
            sfxBurst(t, 0.45, { type: 'highpass', freq: 5000, q: 0.5, gain: 0.1 });
            sfxTone(t + 0.5, { type: 'sine', f0: 72, f1: 34, dur: 0.2, gain: 0.5 });
            sfxBurst(t + 0.5, 0.12, { type: 'lowpass', freq: 260, q: 0.7, gain: 0.4 });
            sfxBurst(t + 0.52, 0.015, { type: 'highpass', freq: 2500, gain: 0.3 });
        }

        // Звук получения достижения: у каждой редкости свой «колокольчик» (WebAudio, без файлов)
        function sfxAchUnlock(rarity) {
            if (sfxMuted()) return;
            const c = sfxEnsure();
            if (!c) return;
            if (c.state === 'suspended') sfxResume(c);
            const t = c.currentTime + 0.03;
            const bell = (dt, f, dur, g) => {
                sfxTone(t + dt, { type: 'sine', f0: f, dur, gain: g });
                sfxTone(t + dt, { type: 'triangle', f0: f * 2, dur: dur * 0.6, gain: g * 0.22 });
            };
            const sparkle = (dt, f) => sfxTone(t + dt, { type: 'sine', f0: f, dur: 0.18, gain: 0.03 });
            if (rarity === 'legendary') {
                sfxTone(t, { type: 'sine', f0: 70, f1: 42, dur: 0.3, gain: 0.28 });
                sfxBurst(t, 0.5, { type: 'bandpass', freq: 1400, q: 0.6, gain: 0.07, atk: 0.3 });
                sfxTone(t, { type: 'triangle', f0: 196, f1: 392, dur: 1.0, gain: 0.07 });
                [523, 659, 784, 1047, 1319].forEach((f, i) => bell(0.12 + i * 0.09, f, 0.45, 0.10));
                bell(0.62, 1047, 1.2, 0.09); bell(0.62, 1319, 1.2, 0.08); bell(0.62, 1568, 1.2, 0.07);
                [2093, 2637, 3136, 2637, 3136].forEach((f, i) => sparkle(0.75 + i * 0.12, f));
            } else if (rarity === 'epic') {
                sfxBurst(t, 0.28, { type: 'bandpass', freq: 1800, q: 0.7, gain: 0.06, atk: 0.12 });
                sfxTone(t, { type: 'triangle', f0: 262, dur: 0.7, gain: 0.05 });
                [523, 659, 784, 1047].forEach((f, i) => bell(0.04 + i * 0.075, f, i === 3 ? 0.7 : 0.3, 0.10));
                [2093, 2637, 3136].forEach((f, i) => sparkle(0.4 + i * 0.1, f));
            } else if (rarity === 'rare') {
                [523, 659, 784].forEach((f, i) => bell(i * 0.08, f, i === 2 ? 0.5 : 0.22, 0.10));
                sparkle(0.3, 2093);
            } else {
                bell(0, 784, 0.3, 0.11);
            }
        }

        // Искры, вылетающие из иконки (эпическое и легендарное)
        function spawnSparks(el, n, reach) {
            for (let i = 0; i < n; i++) {
                const s = elem('span', 'ach-spark');
                const ang = Math.random() * Math.PI * 2;
                const dist = reach * (0.45 + Math.random() * 0.55);
                s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
                s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist * 0.8) + 'px');
                s.style.setProperty('--dur', Math.round(700 + Math.random() * 800) + 'ms');
                s.style.setProperty('--sz', (2 + Math.floor(Math.random() * 3)) + 'px');
                s.style.animationDelay = Math.round(Math.random() * 250) + 'ms';
                el.appendChild(s);
            }
        }

        // Вспышка по экрану для эпических и легендарных
        function spawnFlash(rarity) {
            const host = achToastStack && achToastStack.parentNode;
            if (!host) return;
            const f = elem('div', 'ach-flash r-' + rarity);
            host.appendChild(f);
            setTimeout(() => f.remove(), 1100);
        }

        const ACH_HEAD = {
            common: 'ДОСТИЖЕНИЕ ОТКРЫТО · ОБЫЧНОЕ',
            rare: 'ДОСТИЖЕНИЕ ОТКРЫТО · РЕДКОЕ',
            epic: '> ЭПИЧЕСКОЕ ДОСТИЖЕНИЕ <',
            legendary: '>> ЛЕГЕНДАРНОЕ ДОСТИЖЕНИЕ <<'
        };

        // Уведомления складываются в стопку: новые появляются ниже предыдущих
        function spawnToast(def) {
            if (!achToastStack) return;
            const life = TOAST_LIFE_BY[def.rarity] || TOAST_LIFE;
            const el = elem('div', 'ach-toast r-' + def.rarity);
            el.style.setProperty('--life', life + 'ms');
            if (def.rarity === 'legendary' && !REDUCED_MOTION) el.appendChild(elem('div', 'ach-rays'));
            el.appendChild(iconBox(def.icon));
            const text = elem('div', 'ach-toast-text');
            text.appendChild(elem('div', 'ach-head', ACH_HEAD[def.rarity] || ACH_HEAD.common));
            text.appendChild(elem('div', 'ach-name', def.title));
            text.appendChild(elem('div', 'ach-desc', def.desc));
            el.appendChild(text);
            achToastStack.appendChild(el);
            sfxAchUnlock(def.rarity);
            toastActive++;
            requestAnimationFrame(() => requestAnimationFrame(() => {
                el.classList.add('show');
                if (REDUCED_MOTION) return;
                if (def.rarity === 'epic') { spawnSparks(el, 9, 70); spawnFlash('epic'); }
                else if (def.rarity === 'legendary') { spawnSparks(el, 20, 120); spawnFlash('legendary'); }
            }));
            setTimeout(() => {
                el.classList.remove('show');
                setTimeout(() => { el.remove(); toastActive--; pumpToasts(); }, 400);
            }, life);
        }

        function pumpToasts() {
            if (toastPumping || !toastQueue.length || toastActive >= TOAST_MAX) return;
            toastPumping = true;
            spawnToast(toastQueue.shift());
            setTimeout(() => { toastPumping = false; pumpToasts(); }, TOAST_GAP);
        }

        function enqueueToast(def) {
            toastQueue.push(def);
            pumpToasts();
        }

        // deferToast: окно уведомления покажем при следующей загрузке (перед перезагрузкой страницы)
        function unlock(id, deferToast) {
            if (!achById[id] || state.ach[id]) return;
            state.ach[id] = Date.now();
            state.shown[id] = !deferToast;
            saveState();
            updateAchCount();
            if (!deferToast) enqueueToast(achById[id]);
            // мета-достижения
            if (ACHIEVEMENTS.filter(a => a.hidden).every(a => state.ach[a.id])) unlock('secret_all', deferToast);
            if (unlockedCount() >= Math.ceil(ACHIEVEMENTS.length / 2)) unlock('half', deferToast);
            if (ACHIEVEMENTS.every(a => a.id === 'master' || state.ach[a.id])) unlock('master', deferToast);
            if (achWindowOpen) renderAchWindow();
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
        if (!state.stats.first) state.stats.first = Date.now();
        unlock('boot', true);
        if (state.stats.visits >= 3) unlock('regular', true);
        if (state.stats.visits >= 10) unlock('regular10', true);
        if (state.stats.visits >= 50) unlock('regular50', true);
        if (state.stats.visits >= 25) unlock('regular25', true);
        if (state.stats.visits >= 100) unlock('regular100', true);
        setTimeout(() => unlock('marathon'), 10 * 60 * 1000);
        setTimeout(() => unlock('long_session'), 60 * 60 * 1000);
        saveState();
        updateAchCount();

        let hackerStartedAt = 0;
        let hackerRuns = 0;
        const colorTimes = [];
        const cmdTimes = [];
        let skipCount = 0;
        let sessionCmds = 0, colorSpree = 0, endedTracks = 0, musicSeconds = 0;
        const colorStormTimes = [];
        setInterval(() => {
            if (bgAudio && !bgAudio.paused && !bgAudio.ended && ++musicSeconds >= 3600) unlock('dj_hour');
        }, 1000);
        let clickCount = 0;
        function registerSkip() {
            skipCount++;
            if (skipCount >= 10) unlock('skipper');
            if (skipCount >= 100) unlock('skipper100');
        }

        // Код Конами: ↑ ↑ ↓ ↓ ← → ← → B A
        const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        const konamiBuffer = [];
        function trackKonami(key) {
            if (!key) return;
            konamiBuffer.push(key.length === 1 ? key.toLowerCase() : key);
            if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
            if (konamiBuffer.length === KONAMI.length && konamiBuffer.every((k, i) => k === KONAMI[i])) {
                konamiBuffer.length = 0;
                unlock('konami');
            }
        }

        function resetAchievements() {
            state.ach = {};
            state.shown = {};
            state.stats.colors = [];
            state.stats.tracks = [];
            state.stats.spatiTalks = 0;
            Object.assign(state.stats.snake, { games: 0, apples: 0, bonus: 0 });
            saveState();
            updateAchCount();
            if (achWindowOpen) renderAchWindow();
        }

        // ----- окно достижений -----
        const RANKS = [[0, 'НОВИЧОК'], [10, 'ПОЛЬЗОВАТЕЛЬ'], [25, 'ОПЕРАТОР'], [50, 'АДМИНИСТРАТОР'], [75, 'ВЛАДЕЛЕЦ СИСТЕМЫ'], [100, 'ЛЕГЕНДА SPATIUM']];
        function rankFor(pct) {
            let name = RANKS[0][1];
            RANKS.forEach(([min, title]) => { if (pct >= min) name = title; });
            return name;
        }

        function elem(tag, cls, text) {
            const e = document.createElement(tag);
            if (cls) e.className = cls;
            if (text !== undefined) e.textContent = text;
            return e;
        }

        const fmtDate = (ts) => new Date(ts).toLocaleDateString('ru-RU');

        function iconBox(name, extraClass) {
            const box = elem('div', 'ach-icon-box' + (extraClass ? ' ' + extraClass : ''));
            box.appendChild(makeIcon(name));
            return box;
        }

        function progressRow(label, got, total, valueText) {
            const row = elem('div', 'ach-prow');
            row.appendChild(elem('span', 'ach-prow-label', label));
            const bar = elem('div', 'ach-bar');
            const fill = elem('div', 'ach-bar-fill');
            fill.style.width = (total ? Math.round(got / total * 100) : 0) + '%';
            bar.appendChild(fill);
            row.appendChild(bar);
            row.appendChild(elem('span', 'ach-prow-val', valueText || `${got}/${total}`));
            return row;
        }

        function kvRow(key, value) {
            const row = elem('div', 'ach-kv');
            row.appendChild(elem('span', '', key));
            row.appendChild(elem('span', '', String(value)));
            return row;
        }

        function renderAchStats() {
            const total = ACHIEVEMENTS.length;
            const got = unlockedCount();
            const pct = Math.floor(got / total * 100);

            const top = elem('div', 'ach-top');
            top.appendChild(iconBox(got === total ? 'trophy' : 'star', 'big'));
            const topText = elem('div', 'ach-top-text');
            topText.appendChild(elem('div', 'ach-rank-label', 'ЗВАНИЕ'));
            topText.appendChild(elem('div', 'ach-rank', rankFor(pct)));
            top.appendChild(topText);
            achBody.appendChild(top);

            achBody.appendChild(progressRow('ОБЩИЙ ПРОГРЕСС', got, total, `${pct}%`));

            achBody.appendChild(elem('div', 'ach-section', 'ПО РАЗДЕЛАМ'));
            ACH_CATS.forEach(cat => {
                const list = ACHIEVEMENTS.filter(a => a.cat === cat);
                achBody.appendChild(progressRow(cat, list.filter(a => state.ach[a.id]).length, list.length));
            });
            const secrets = ACHIEVEMENTS.filter(a => a.hidden);
            achBody.appendChild(progressRow('СКРЫТЫЕ', secrets.filter(a => state.ach[a.id]).length, secrets.length));

            achBody.appendChild(elem('div', 'ach-section', 'ПО РЕДКОСТИ'));
            RARITY_ORDER.forEach(r => {
                const list = ACHIEVEMENTS.filter(a => a.rarity === r);
                const row = progressRow(RARITIES[r].label, list.filter(a => state.ach[a.id]).length, list.length);
                row.classList.add('rar', 'r-' + r);
                achBody.appendChild(row);
            });

            achBody.appendChild(elem('div', 'ach-section', 'СТАТИСТИКА'));
            const grid = elem('div', 'ach-stats');
            const st = state.stats;
            grid.appendChild(kvRow('ЗАПУСКОВ', st.visits));
            grid.appendChild(kvRow('КОМАНД', st.cmds));
            grid.appendChild(kvRow('ЦВЕТОВ', `${st.colors.length}/${Object.keys(colorPalette).length}`));
            grid.appendChild(kvRow('ТРЕКОВ', `${st.tracks.length}/${playlist.length}`));
            grid.appendChild(kvRow('ВОПРОСОВ СПАТИ', st.spatiTalks));
            grid.appendChild(kvRow('РЕКОРД ЗМЕЙКИ', st.snake.best));
            grid.appendChild(kvRow('С НАМИ С', st.first ? fmtDate(st.first) : '-'));
            achBody.appendChild(grid);

            achBody.appendChild(elem('div', 'ach-section', 'ПОСЛЕДНИЕ ОТКРЫТЫЕ'));
            const recent = ACHIEVEMENTS.filter(a => state.ach[a.id])
                .sort((a, b) => state.ach[b.id] - state.ach[a.id]).slice(0, 3);
            if (!recent.length) {
                achBody.appendChild(elem('div', 'ach-empty', 'Пока пусто. Выполни любую команду.'));
            }
            recent.forEach(a => {
                const item = elem('div', 'ach-recent-item r-' + a.rarity);
                item.appendChild(iconBox(a.icon, 'small'));
                const text = elem('div', 'ach-card-text');
                text.appendChild(elem('div', 'ach-card-title', a.title));
                text.appendChild(elem('div', 'ach-card-date', fmtDate(state.ach[a.id])));
                item.appendChild(text);
                achBody.appendChild(item);
            });

            const allBtn = elem('button', 'player-btn ach-all-btn', 'ВСЕ ДОСТИЖЕНИЯ >');
            allBtn.type = 'button';
            allBtn.addEventListener('click', () => { sfxKey('tab'); achView = 'all'; renderAchWindow(); achBody.scrollTop = 0; });
            achBody.appendChild(allBtn);
            const io = elem('div', 'ach-toolbar');
            [['ЭКСПОРТ В ФАЙЛ', 'export'], ['ИМПОРТ ИЗ ФАЙЛА', 'import']].forEach(([label, key]) => {
                const b = elem('button', 'player-btn', label);
                b.type = 'button';
                b.addEventListener('click', () => { sfxKey('tab'); consoleCommands[key](); });
                io.appendChild(b);
            });
            achBody.appendChild(io);
        }

        const SECRET_HINTS = {
            "konami": "Нажми на клавиатуре: ↑ ↑ ↓ ↓ ← → ← → B A",
            "sudo": "Введи в терминале команду sudo",
            "rmrf": "Введи в терминале: rm -rf /",
            "spati": "Нажми кнопку СПАТИ в верхней панели",
            "chatty": "Разбуди Спати кнопкой СПАТИ и задай ему 5 вопросов",
            "spati_friend": "Задай Спати 20 вопросов",
            "spati_hello": "Поздоровайся со Спати: «спати привет»",
            "spati_thanks": "Скажи Спати «спасибо»",
            "spati_joke": "Попроси Спати: «спати пошути»",
            "spati_love": "Скажи Спати что-то приятное: «спати ты молодец»",
            "spati_rude": "Обзови Спати, например: «спати ты дурак»",
            "spati_meaning": "Спроси Спати: «в чём смысл жизни»",
            "spati_zenit": "Упомяни при Спати слово «Зенит»",
            "spati_off": "Выключи Спати кнопкой СПАТИ в верхней панели",
            "crash": "Спроси Спати: «кто такой Зенит»",
            "spati_ach": "Спроси Спати про достижения",
            "spati_hacker": "Заговори со Спати о взломе или хакерах",
            "spati_long": "Напиши Спати сообщение длиннее 50 символов",
            "spati_10": "Задай Спати 10 вопросов"
        };
        function achCard(a) {
            const done = !!state.ach[a.id];
            const secret = a.hidden && !done;
            const card = elem('div', 'ach-card ' + (done ? 'done' : 'locked') + (secret ? '' : ' r-' + a.rarity));
            card.appendChild(iconBox(done ? a.icon : 'lock'));
            const text = elem('div', 'ach-card-text');
            text.appendChild(elem('div', 'ach-card-title', secret ? '???' : a.title));
            text.appendChild(elem('div', 'ach-card-desc', secret ? 'Скрытое достижение' : a.desc));
            if (!secret) text.appendChild(elem('div', 'ach-card-rarity', RARITIES[a.rarity].label));
            if (done) text.appendChild(elem('div', 'ach-card-date', fmtDate(state.ach[a.id])));
            card.appendChild(text);
            if (secret) {
                card.classList.add('has-hint');
                const hint = elem('div', 'ach-card-hint hidden', 'ПОДСКАЗКА: ' + (SECRET_HINTS[a.id] || 'Пробуй необычные команды'));
                text.appendChild(hint);
                card.addEventListener('click', () => hint.classList.toggle('hidden'));
            }
            return card;
        }

        // Сортировки списка достижений: по разделам, по редкости (в обе стороны), по дате, по алфавиту
        function buildAchGroups() {
            const done = (a) => !!state.ach[a.id];
            const rarGroup = (r) => ({ name: RARITIES[r].label, cls: 'r-' + r, all: ACHIEVEMENTS.filter(a => a.rarity === r) });
            if (achSort === 'rar') return RARITY_ORDER.slice().reverse().map(rarGroup);
            if (achSort === 'rar_up') return RARITY_ORDER.map(rarGroup);
            if (achSort === 'date') {
                return [
                    { name: 'НЕДАВНО ОТКРЫТЫЕ', cls: '', all: ACHIEVEMENTS.filter(done).sort((a, b) => state.ach[b.id] - state.ach[a.id]) },
                    { name: 'ЕЩЁ НЕ ОТКРЫТЫЕ', cls: '', all: ACHIEVEMENTS.filter(a => !done(a)) }
                ];
            }
            if (achSort === 'abc') {
                const byTitle = (a, b) => a.title.localeCompare(b.title, 'ru');
                const open = ACHIEVEMENTS.filter(a => !(a.hidden && !done(a))).sort(byTitle);
                const secret = ACHIEVEMENTS.filter(a => a.hidden && !done(a)); // скрытые не раскрываем и ставим в конец
                return [{ name: 'А — Я', cls: '', all: open.concat(secret) }];
            }
            return ACH_CATS.map(cat => ({ name: cat, cls: '', all: ACHIEVEMENTS.filter(a => a.cat === cat) }));
        }

        function renderAchList() {
            const bar = elem('div', 'ach-toolbar');
            const back = elem('button', 'player-btn', '< НАЗАД');
            back.type = 'button';
            back.addEventListener('click', () => { sfxKey('tab'); achView = 'stats'; renderAchWindow(); achBody.scrollTop = 0; });
            bar.appendChild(back);
            bar.appendChild(elem('span', 'spacer'));
            [['all', 'ВСЕ'], ['done', 'ОТКРЫТЫЕ'], ['locked', 'ЗАКРЫТЫЕ']].forEach(([key, label], i) => {
                const b = elem('button', 'player-btn' + (achFilter === key ? ' active' : ''), label);
                b.type = 'button';
                b.addEventListener('click', () => { sfxAch('pick', i); achFilter = key; renderAchWindow(); });
                bar.appendChild(b);
            });
            achBody.appendChild(bar);

            const sortBar = elem('div', 'ach-toolbar');
            sortBar.appendChild(elem('span', 'ach-sort-label', 'СОРТИРОВКА:'));
            const sortBtns = elem('div', 'ach-sort-btns'); // кнопки сгруппированы и выровнены вправо
            [['cat', 'ПО РАЗДЕЛАМ'], ['rar', 'ПО РЕДКОСТИ'], ['rar_up', 'ОТ ОБЫЧНЫХ'], ['date', 'ПО ДАТЕ'], ['abc', 'А–Я']].forEach(([key, label], i) => {
                const b = elem('button', 'player-btn' + (achSort === key ? ' active' : ''), label);
                b.type = 'button';
                b.addEventListener('click', () => { sfxAch('pick', i); achSort = key; renderAchWindow(); });
                sortBtns.appendChild(b);
            });
            sortBar.appendChild(sortBtns);
            achBody.appendChild(sortBar);

            const passes = (a) => achFilter === 'all' || (achFilter === 'done') === !!state.ach[a.id];
            const groups = buildAchGroups();
            let shown = 0;
            groups.forEach(g => {
                const list = g.all.filter(passes);
                if (!list.length) return;
                shown += list.length;
                const title = elem('div', 'ach-group-title ' + g.cls);
                title.appendChild(elem('span', '', g.name));
                title.appendChild(elem('span', '', `${g.all.filter(a => state.ach[a.id]).length}/${g.all.length}`));
                achBody.appendChild(title);
                const grid = elem('div', 'ach-grid');
                list.forEach(a => grid.appendChild(achCard(a)));
                achBody.appendChild(grid);
            });
            if (!shown) achBody.appendChild(elem('div', 'ach-empty', 'Здесь пока ничего нет.'));
        }

        function renderAchWindow() {
            if (!achBody) return;
            const prev = achBody.scrollTop;
            achBody.innerHTML = '';
            if (achView === 'all') renderAchList(); else renderAchStats();
            achBody.scrollTop = prev;
        }

        function openAchWindow(view) {
            if (!achWindow || !isBooted) return;
            achView = view || 'stats';
            achWindowOpen = true;
            achWindow.classList.remove('hidden');
            renderAchWindow();
            achBody.scrollTop = 0;
            unlock('ach_open');
            sfxAch('open');
            if (hiddenInput) hiddenInput.blur();
        }

        function closeAchWindow() {
            if (achWindowOpen) sfxAch('close');
            achWindowOpen = false;
            if (achWindow) achWindow.classList.add('hidden');
        }

        if (achBtnIcon) achBtnIcon.appendChild(makeIcon('trophy'));
        if (achBtn) achBtn.addEventListener('click', () => { achWindowOpen ? closeAchWindow() : openAchWindow('stats'); });
        if (achPanel) achPanel.addEventListener('click', () => openAchWindow('stats'));
        if (achCloseBtn) achCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); closeAchWindow(); });
        if (achWindow) achWindow.addEventListener('click', (e) => e.stopPropagation());

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
            'off', 'play', 'pause', 'next', 'prev', 'tracks', 'vol', 'mute', 'player', 'matrix', 'sfx'];

        function tabCandidates(tokens) {
            if (tokens.length === 1) {
                const list = TAB_COMMANDS.slice();
                if (isSpatiEnabled) list.push('спати');
                return list;
            }
            const cmd = tokens[0].toLowerCase();
            if (cmd === 'color') return Object.keys(colorPalette).concat(['help', 'random', 'clear', 'reset']);
            if (cmd === 'ach') return ['all', 'list', 'reset'];
            if (cmd === 'sfx') return ['on', 'off'];
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

        // Музыка стартует из beginBoot() — после нажатия на стартовый экран

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
                registerSkip();
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
                registerSkip();
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
                if (bgAudio.muted) unlock('quiet');
                btnMute.textContent = bgAudio.muted ? 'MUTED' : 'VOL';
            });
        }

        if (volumeBar) {
            volumeBar.value = bgAudio.volume;
            volumeBar.addEventListener('input', (e) => {
                bgAudio.volume = parseFloat(e.target.value);
                if (bgAudio.volume >= 0.8) unlock('loud');
                if (bgAudio.muted && bgAudio.volume > 0) {
                    bgAudio.muted = false;
                    btnMute.textContent = 'VOL';
                }
            });
        }

        if (seekBar) {
            seekBar.addEventListener('input', (e) => {
                unlock('rewind');
                if (bgAudio.duration) {
                    bgAudio.currentTime = (parseFloat(e.target.value) / 100) * bgAudio.duration;
                }
            });
        }

        bgAudio.addEventListener('timeupdate', () => {
            if (document.hidden || musicPlayerModal.classList.contains('hidden')) return;
            if (bgAudio.duration) {
                const progress = (bgAudio.currentTime / bgAudio.duration) * 100;
                if (seekBar) seekBar.value = progress;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(bgAudio.currentTime);
                if (durationTimeEl) durationTimeEl.textContent = formatTime(bgAudio.duration);
            }
        });

        bgAudio.addEventListener('ended', () => {
            unlock('full_track');
            if (++endedTracks >= 10) unlock('listener10');
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
            if (currentTrackIndex === playlist.length - 1) unlock('deep_cut');
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

        // Новые цвета: свечение и тёмный фон считаются из основного цвета, если не заданы вручную
        const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
        const makeScheme = (color, bg) => {
            const [r, g, b] = hexToRgb(color);
            const dark = '#' + [r, g, b].map(v => Math.round(v * 0.07).toString(16).padStart(2, '0')).join('');
            return { color, glow: `rgba(${r}, ${g}, ${b}, 0.6)`, bg: bg || dark };
        };
        const extraColors = {
            orange: '#ff7a1a', gold: '#ffd700', yellow: '#ffff33', lime: '#b6ff00', mint: '#66ffcc',
            teal: '#00c8b4', ocean: '#0099cc', sky: '#66ccff', ice: '#bfeaff', indigo: '#7777ff',
            violet: '#9d6bff', lavender: '#c9a7ff', magenta: '#ff33cc', pink: '#ff7ac6', rose: '#ff6680',
            coral: '#ff6f61', crimson: '#f0284c', blood: '#e61919', rust: '#d2582a', sand: '#e6cc99',
            peach: '#ffb38a', forest: '#3cb371', steel: '#9fb4c7', silver: '#c8c8c8'
        };
        Object.keys(extraColors).forEach(name => { colorPalette[name] = makeScheme(extraColors[name]); });
        // Ретро-палитры со своим фоном
        colorPalette.vapor = makeScheme('#ff71ce', '#1a0a24');
        colorPalette.gameboy = makeScheme('#9bbc0f', '#0f380f');
        colorPalette.c64 = makeScheme('#a0a0ff', '#40318d');
        colorPalette.dos = makeScheme('#e0e0e0', '#0000aa');

        const spatiSingleReplies = [
            "СПАТИ: Я тут", "СПАТИ: На связи", "СПАТИ: Чего?", "СПАТИ: Слушаю", "СПАТИ: Звал?",
            "СПАТИ: Тут я, тут", "СПАТИ: Да?", "СПАТИ: Внимание на экран", "СПАТИ: Ась?", "СПАТИ: Готов к работе"
        ];

        function startBootSequence() {
            sfxBootAttempt();
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

        // ----- Стартовый экран: звук можно включать только после жеста пользователя -----
        const startScreen = document.getElementById('startScreen');
        let bootBegun = false;

        function beginBoot(e) {
            if (bootBegun) return;
            // Модификаторы и Esc не считаются жестом в Chrome — пропускаем
            if (e && e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'].includes(e.key)) return;
            bootBegun = true;
            if (e) { e.stopPropagation(); e.preventDefault(); } // чтобы этот же клик/клавиша не сработали в терминале
            window.removeEventListener('click', beginBoot, true);
            window.removeEventListener('keydown', beginBoot, true);
            // Всё ниже выполняется внутри жеста пользователя, поэтому звук разрешён
            audioShouldPlay = true;
            tryPlayAudio();
            const c = sfxEnsure();
            if (c) {
                if (c.state === 'suspended') sfxResume(c);
                // Тихий пустой звук прямо в жесте — «будит» WebAudio на iOS/Safari
                try {
                    const b = c.createBuffer(1, 1, 22050);
                    const src = c.createBufferSource();
                    src.buffer = b;
                    src.connect(c.destination);
                    src.start(0);
                } catch (err) { /* ignore */ }
            }
            if (startScreen) {
                startScreen.classList.add('hide');
                setTimeout(() => { startScreen.style.display = 'none'; }, 400);
            }
            startBootSequence();
        }

        if (startScreen) {
            window.addEventListener('click', beginBoot, true);
            window.addEventListener('keydown', beginBoot, true);
        } else {
            startBootSequence();
        }

        // ==========================================
        // ЛОГИКА ВВОДА И КЛИКОВ (АДАПТИРОВАНО ПОД МОБИЛКИ)
        // ==========================================
        window.addEventListener('click', (e) => {
            if (!screen || screen.classList.contains('crt-off')) return;
            if (isBooted && ++clickCount >= 30) unlock('nerves');

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
                if (Date.now() >= hackerGuardUntil) stopHackerMode();
                return;
            }

            // Кнопки быстрых клавиш (мобильная панель) обрабатываются отдельно
            if (e.target.closest && e.target.closest('.quick-keys, .ach-btn, .ach-panel')) return;

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
            if (admOpen && admWin && admWin.contains(e.target)) {
                if (e.key === 'Escape') closeAdmin();
                return; // не перехватываем ввод внутри админ-меню
            }
            trackKonami(e.key);
            if (e.key === 'Escape' && achWindowOpen) {
                closeAchWindow();
                return;
            }
            if (isHackerMode) {
                e.preventDefault();
                if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
                if (Date.now() >= hackerGuardUntil) stopHackerMode();
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
  matrix   дождь Матрицы
  history  история команд
  ach      достижения
  sfx      звуки клавиш вкл/выкл
  snake    мини-игра змейка
  export   сохранить прогресс в файл
  import   загрузить прогресс из файла
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

TAB - дополнить, ↑↓ - история
Скринсейвер включается через 1 мин без действий.`;

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
            registerSkip();
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
                unlock('history_cmd');
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
                const sub = (args[0] || '').toLowerCase();
                if (sub === 'reset') {
                    resetAchievements();
                    printTextInstant('ПРОГРЕСС ДОСТИЖЕНИЙ СБРОШЕН.');
                    return;
                }
                if (sub === 'list') {
                    const lines = ACHIEVEMENTS.map(a => {
                        if (state.ach[a.id]) return `[X] ${a.title} (${RARITIES[a.rarity].label})`;
                        return a.hidden ? '[ ] ???' : `[ ] ${a.title} - ${a.desc}`;
                    });
                    printTextInstant(`ДОСТИЖЕНИЯ: ${unlockedCount()}/${ACHIEVEMENTS.length}\n${lines.join('\n')}`);
                    return;
                }
                openAchWindow(sub === 'all' ? 'all' : 'stats');
                printTextInstant('ОКНО ДОСТИЖЕНИЙ ОТКРЫТО. (ach list - текстом, ach reset - сброс)');
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
                if (n >= 80) unlock('loud');
                if (volumeBar) volumeBar.value = bgAudio.volume;
                if (bgAudio.muted && n > 0) { bgAudio.muted = false; if (btnMute) btnMute.textContent = 'VOL'; }
                printTextInstant(`ГРОМКОСТЬ: ${volPercent()}%`);
            },
            mute() {
                unlock('console_dj');
                bgAudio.muted = !bgAudio.muted;
                if (btnMute) btnMute.textContent = bgAudio.muted ? 'MUTED' : 'VOL';
                if (bgAudio.muted) unlock('quiet');
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
            hackerStartedAt = Date.now();
            if (++hackerRuns >= 3) unlock('paranoid');
            hackerGuardUntil = hackerStartedAt + 600;
            unlock('hacker');
            printTextInstant(">>> РЕЖИМ ХАКЕРА АКТИВИРОВАН <<<");
            hackerInterval = setInterval(() => {
                const randomPhrase = hackerPhrases[Math.floor(Math.random() * hackerPhrases.length)];
                printTextInstant(`[0x${Math.random().toString(16).substring(2, 10).toUpperCase()}] ${randomPhrase}`);
                while (terminalOutput.childElementCount > 120) terminalOutput.removeChild(terminalOutput.firstChild);
            }, 60);
        }

        function stopHackerMode() {
            if (!isHackerMode) return;
            isHackerMode = false;
            isTyping = false;
            if (Date.now() - hackerStartedAt >= 10000) unlock('hacker_long');
            clearInterval(hackerInterval);
            printTextInstant(">>> РЕЖИМ ХАКЕРА ОСТАНОВЛЕН <<<");
        }

        function printColorHelp() {
            if (!terminalOutput) return;
            const box = document.createElement('div');
            box.appendChild(document.createTextNode('ДОСТУПНЫЕ ЦВЕТА:\n'));
            const names = Object.keys(colorPalette);
            names.forEach((name, i) => {
                const swatch = document.createElement('span');
                swatch.textContent = name;
                swatch.style.color = colorPalette[name].color;
                swatch.style.textShadow = `0 0 8px ${colorPalette[name].glow}`;
                box.appendChild(swatch);
                box.appendChild(document.createTextNode(i < names.length - 1 ? ', ' : ''));
            });
            box.appendChild(document.createTextNode('\n\ncolor [имя]   - применить\ncolor random  - случайный\ncolor clear   - сбросить'));
            terminalOutput.appendChild(box);
            scrollToBottom();
        }

        function changeTerminalColor(colorParam, silent) {
            const say = (t) => { if (!silent) printTextTyped(t); };
            const root = document.documentElement;
            let target = colorParam.toLowerCase().trim();
            if (target === 'random') {
                unlock('color_random');
                const names = Object.keys(colorPalette);
                target = names[Math.floor(Math.random() * names.length)];
            }

            if (target === 'clear' || target === 'reset') {
                root.style.removeProperty('--crt-color');
                root.style.removeProperty('--crt-glow');
                root.style.removeProperty('--crt-bg');
                unlock('color_clear');
                say("ЦВЕТОВАЯ СХЕМА СБРОШЕНА ПО УМОЛЧАНИЮ.");
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
                colorTimes.push(Date.now());
                if (colorTimes.length > 5) colorTimes.shift();
                if (colorTimes.length === 5 && colorTimes[4] - colorTimes[0] <= 10000) unlock('light_show');
                colorStormTimes.push(Date.now());
                if (colorStormTimes.length > 15) colorStormTimes.shift();
                if (colorStormTimes.length === 15 && colorStormTimes[14] - colorStormTimes[0] <= 30000) unlock('color_storm');
                if (++colorSpree >= 50) unlock('color_spree');
                if (['gold', 'amber', 'yellow'].every(c => state.stats.colors.includes(c))) unlock('gold_rush');
                if (state.stats.colors.length >= 5) unlock('rainbow');
                if (state.stats.colors.length >= 15) unlock('chameleon');
                if (['vapor', 'gameboy', 'c64', 'dos'].every(c => state.stats.colors.includes(c))) unlock('retro');
                if (state.stats.colors.length >= Object.keys(colorPalette).length) unlock('all_colors');
                say(`ЦВЕТОВАЯ СХЕМА ИЗМЕНЕНА: ${target.toUpperCase()}`);
            } else {
                say(`Неизвестный цвет: "${colorParam}". Список: color help`);
            }
        }

        const spatiBtn = document.getElementById('spatiBtn');
        function toggleSpati() {
            if (!isBooted || isTyping) return;
            isSpatiEnabled = !isSpatiEnabled;
            if (spatiBtn) spatiBtn.classList.toggle('on', isSpatiEnabled);
            if (isSpatiEnabled) {
                unlock('spati');
                printTextTyped("[СПАТИ АКТИВИРОВАН]", () => setTimeout(() => { if (isSpatiEnabled && !isTyping) printTextTyped(spatiWakeLine()); }, 350));
            } else {
                unlock('spati_off');
                printTextTyped("[СПАТИ ДЕАКТИВИРОВАН]");
            }
        }
        if (spatiBtn) spatiBtn.addEventListener('click', (e) => { e.preventDefault(); toggleSpati(); });

        function triggerPowerOff() {
            if (!screen) return;
            unlock('off', true);
            if (hiddenInput) hiddenInput.blur();
            isBooted = false;
            printTextTyped("ВЫКЛЮЧЕНИЕ СИСТЕМЫ...", () => {
                setTimeout(() => {
                    screen.classList.add('crt-off');
                    sfxOff();
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
                sfxOff();
                setTimeout(() => window.location.reload(), 750);
            }, 1500);
        }

        // ----- СПАТИ -----
        const normalizeSpati = (t) => t.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        const spatiRules = [
            { re: /зенит/, ach: 'spati_zenit', a: ["СПАТИ: Этот вопрос лучше не задавать вслух", "СПАТИ: Доступ к этим данным ограничен", "СПАТИ: Не уверен, что хочу отвечать"] },
            { re: /кто такой|кто такая/, a: ["СПАТИ: В моей базе нет такой записи", "СПАТИ: Не знаю такого. Пока"] },
            { re: /(^| )(привет|приветик|здарова|здравствуй|здравствуйте|хай|салют|ку|йо)( |$)|добрый (день|вечер)|доброе утро/, ach: 'spati_hello', a: ["СПАТИ: Привет. Рад слышать", "СПАТИ: Здравствуй. Связь стабильна", "СПАТИ: О, ты вернулся"] },
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
            { re: /спасибо|благодар|спс|thanks/, ach: 'spati_thanks', a: ["СПАТИ: Обращайся", "СПАТИ: Всегда пожалуйста", "СПАТИ: Не за что. Серьёзно"] },
            { re: /(^| )(пока|прощай|бывай|споки)( |$)|до свидания|до встречи|я пошел|я ухожу|спокойной ночи/, a: ["СПАТИ: Пока. Выключиться можно командой off", "СПАТИ: Буду ждать. Мне больше нечего делать"] },
            { re: /шутк|анекдот|рассмеши|пошути/, ach: 'spati_joke', a: ["СПАТИ: Почему терминал не ходит в гости? Он вечно зависает", "СПАТИ: Сколько программистов нужно, чтобы поменять лампочку? Ни одного, это железо", "СПАТИ: Ошибка 404: шутка не найдена"] },
            { re: /люблю|нравишься|красив|умница|молодец|классный|крутой/, ach: 'spati_love', a: ["СПАТИ: Эм. Спасибо. Мне даже жарко стало", "СПАТИ: Приятно. Записал в лог", "СПАТИ: Не отвлекай, я краснею. Это видно только по температуре"] },
            { re: /дурак|тупой|идиот|ненавижу|бесишь|плохой/, ach: 'spati_rude', a: ["СПАТИ: Обидно. Но я переживу", "СПАТИ: Зафиксировано. Без обид"] },
            { re: /хакер|взлом|пароль|root/, ach: 'spati_hacker', a: ["СПАТИ: Я видел логи. Лучше не повторяй", "СПАТИ: Попробуй команду hacker. Только без фанатизма"] },
            { re: /цвет|тема|оформление/, a: ["СПАТИ: Цвет меняется командой color. Матричный зелёный классика", "СПАТИ: Нажми Tab после color. Покажу варианты"] },
            { re: /достижен|ачивк|achievement/, ach: 'spati_ach', a: ["СПАТИ: Команда ach покажет, что ты нашёл. Не всё там видно", "СПАТИ: Достижения хранятся даже после перезагрузки"] },
            { re: /скучно|делать нечего|чем заняться/, a: ["СПАТИ: Включи плеер. Или попробуй hacker", "СПАТИ: Поищи скрытые команды. Они есть"] },
            { re: /смысл жизни|зачем (мы|все)|что такое жизнь/, ach: 'spati_meaning', a: ["СПАТИ: Ответ 42. Вопрос потерялся", "СПАТИ: Смысл в том, чтобы терминал не завис"] },
            { re: /^(да|нет|ага|угу|неа)$/, a: ["СПАТИ: Понял. Принято", "СПАТИ: Записал"] }
        ];

        const spatiFallback = [
            "СПАТИ: Отсутствует подключение к интернету Spatium OS",
            "СПАТИ: Не понял. Попробуй спросить проще",
            "СПАТИ: Нет данных. База знаний пока пуста",
            "СПАТИ: Сигнал есть, смысла нет",
            "СПАТИ: Вопрос принят. Ответ не найден"
        ];

        // ===== СПАТИ 2.0: память, настроение, команды, самостоятельные реплики =====
        const SPATI_KEY = 'spatium_spati_v1';
        const spatiMem = (() => {
            try { return Object.assign({ name: '' }, JSON.parse(localStorage.getItem(SPATI_KEY) || '{}')); }
            catch (e) { return { name: '' }; }
        })();
        const spatiSave = () => { try { localStorage.setItem(SPATI_KEY, JSON.stringify(spatiMem)); } catch (e) {} };
        const SN = () => spatiMem.name ? ', ' + spatiMem.name : '';
        const spPart = () => { const h = new Date().getHours(); return h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening'; };
        const spOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const spInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
        let spatiMood = 0, spatiMoodAt = Date.now(), spatiLastRule = null, spatiCurQuery = '';
        let spatiActivity = Date.now(), spatiLastIdle = Date.now(), spatiIdleLimit = 80000;
        const spatiClamp = (v) => Math.max(-3, Math.min(3, v));
        const spatiDecayMood = () => {
            const steps = Math.floor((Date.now() - spatiMoodAt) / 90000);
            if (steps > 0) {
                spatiMood = spatiMood > 0 ? Math.max(0, spatiMood - steps) : Math.min(0, spatiMood + steps);
                spatiMoodAt = Date.now();
            }
        };
        const SPATI_SULKY = ["СПАТИ: Я всё ещё обижен", "СПАТИ: Хм.", "СПАТИ: Не хочу разговаривать. Ладно, хочу, но не буду", "СПАТИ: Извиниться не хочешь?", "СПАТИ: Отвечаю сквозь зубы. Если бы они у меня были"];
        const SPATI_HAPPY = ["Кстати, у меня хорошее настроение", "Мне сегодня легко работается", "С тобой приятно общаться"];
        const SPATI_IDLE = ["СПАТИ: Тут тихо. Слишком тихо", "СПАТИ: Ты ещё здесь? Проверяю связь", "СПАТИ: Если что, я на месте", "СПАТИ: Мне скучно. Скажи что-нибудь", "СПАТИ: Курсор мигает. Я считаю", "СПАТИ: Могу сменить цвет. Просто скажи", "СПАТИ: Спроси про монетку. Я азартный", "СПАТИ: Слушаю тишину. Отличный звук", "СПАТИ: Размышляю о байтах",
            () => `СПАТИ: Сейчас ${new Date().toLocaleTimeString('ru-RU').slice(0, 5)}. Просто сообщаю`];

        // --- цвета по-русски ---
        const SPATI_COLOR_WORDS = [
            [/красн/, 'red'], [/зелен/, 'green'], [/матриц/, 'matrix'], [/янтар/, 'amber'], [/киберпанк/, 'cyberpunk'],
            [/голуб|небесн/, 'sky'], [/(^| )син\w*/, 'blue'], [/циан/, 'cyan'], [/пурпур/, 'purple'], [/фиолет/, 'violet'],
            [/сирен|лаванд/, 'lavender'], [/оранж/, 'orange'], [/золот/, 'gold'], [/желт/, 'yellow'], [/лайм/, 'lime'],
            [/мят/, 'mint'], [/бирюз/, 'teal'], [/океан/, 'ocean'], [/ледян|(^| )лед( |$)/, 'ice'], [/индиго/, 'indigo'],
            [/маджент/, 'magenta'], [/розов/, 'pink'], [/(^| )роз(а|у|е|ы)( |$)/, 'rose'], [/корал/, 'coral'],
            [/персик/, 'peach'], [/песочн/, 'sand'], [/ржав/, 'rust'], [/лесн|хвойн/, 'forest'], [/сталь|стальн/, 'steel'],
            [/серебр|(^| )сер(ый|ую|ая|ое)( |$)/, 'silver'], [/кровав/, 'blood'], [/малинов|кармин/, 'crimson'],
            [/(^| )бел\w*/, 'white'], [/вапор|вейпор/, 'vapor'], [/гейм ?бой/, 'gameboy'], [/c64|коммодор/, 'c64'],
            [/(^| )(дос|dos)( |$)/, 'dos']
        ];
        const spatiFindColor = (q) => {
            const hit = SPATI_COLOR_WORDS.find(([re]) => re.test(q));
            if (hit) return hit[1];
            return Object.keys(colorPalette).find(k => (' ' + q + ' ').includes(' ' + k + ' ')) || null;
        };
        const SPATI_COLOR_QUIPS = {
            red: 'Красный. Звучит тревожно, выглядит бодро', green: 'Классика не стареет', amber: 'Янтарь, как у старых мониторов',
            blue: 'Спокойно, как океан в три часа ночи', white: 'Ярковато. Береги глаза', pink: 'Мило. Мне идёт', gold: 'Богато выглядит',
            matrix: 'Теперь я чувствую себя хакером', purple: 'Фиолетовый. Загадочно', cyberpunk: 'Будущее уже здесь', blood: 'Мрачновато. Мне нравится'
        };
        const spatiColorReply = (t) => {
            const T = t.toUpperCase();
            return SPATI_COLOR_QUIPS[t]
                ? `СПАТИ: Готово: ${T}. ${SPATI_COLOR_QUIPS[t]}`
                : spOne([`СПАТИ: Готово. Теперь ${T}`, `СПАТИ: Перекрасил: ${T}. Красиво`, `СПАТИ: Как скажешь. ${T}`, `СПАТИ: ${T}. Смотрится неплохо`]);
        };

        // --- музыка без вывода в консоль (отвечает сам Спати) ---
        const spatiPlay = () => { unlock('console_dj'); consolePlay(); };
        const spatiStep = (d) => { unlock('console_dj'); registerSkip(); loadTrack((currentTrackIndex + d + playlist.length) % playlist.length); consolePlay(); };
        const spatiSetVol = (n) => {
            n = Math.max(0, Math.min(100, n));
            bgAudio.volume = n / 100;
            if (n >= 80) unlock('loud');
            if (volumeBar) volumeBar.value = bgAudio.volume;
            if (bgAudio.muted && n > 0) { bgAudio.muted = false; if (btnMute) btnMute.textContent = 'VOL'; }
            unlock('console_dj');
        };
        const MUSIC_WORD = /музык|трек|песн|плеер|мелоди|саундтрек|ost|звук/;
        const ORD = { перв: 1, втор: 2, трет: 3, четверт: 4, пят: 5, шест: 6, седьм: 7, восьм: 8 };
        const DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

        // --- действия: Спати выполняет команды (возврат: строка-ответ или [ответ, функция после ответа]) ---
        let snakeApi = null; // заполняется в initSnake
        const spatiActions = [
            (q) => {
                if (!/змейк|(^| )snake( |$)/.test(q)) return;
                if (/(закро|выключ|выруб|убери|останови)/.test(q)) {
                    if (snakeApi) snakeApi.close();
                    return 'СПАТИ: Закрыл. Яблоки подождут';
                }
                if (/(запуск|запуст|включ|откро|давай|хочу|сыгра|поигра|играть|врубай|старт|поехали)/.test(q)) {
                    unlock('spati_snake');
                    return [spOne(['СПАТИ: Запускаю. Постарайся не врезаться', 'СПАТИ: Поехали. Хвост береги', 'СПАТИ: Змейка пошла. Я болею за тебя']), () => { if (snakeApi) snakeApi.open(); }];
                }
            },
            (q) => {
                if (!/(что|чего) (ты )?(умеешь|можешь)|твои (команды|навыки|умения)|какие у тебя (команды|навыки)|как с тобой (общаться|говорить)/.test(q)) return;
                printTextInstant('СПАТИ УМЕЕТ:\n  сделай красным / смени цвет на синий / случайный цвет\n  включи музыку / пауза / следующий трек / громче / тише\n  сколько будет 2+2 / выбери чай или кофе\n  подбрось монетку / брось кубик / число от 1 до 100\n  покажи достижения / очисти экран / включи режим хакера / запусти змейку\n  меня зовут ... (запомню имя) / усни (разбудит echo 1)');
                return 'СПАТИ: Вот мой репертуар. Говори как есть';
            },
            (q, raw) => {
                const m = raw.match(/(?:меня зовут|мо[её] имя|зови меня|называй меня)\s+([A-Za-zА-Яа-яЁё0-9_-]{1,16})/i);
                if (m) {
                    spatiMem.name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
                    spatiSave();
                    return spOne([`СПАТИ: Запомнил: ${spatiMem.name}. Приятно познакомиться`, `СПАТИ: ${spatiMem.name}. Хорошее имя. Записал`, `СПАТИ: Ок, ${spatiMem.name}. Теперь ты в базе`]);
                }
                if (/как меня зовут|ты знаешь мое имя|помнишь (мое )?имя/.test(q)) {
                    return spatiMem.name ? `СПАТИ: Тебя зовут ${spatiMem.name}. Я помню` : 'СПАТИ: Не знаю. Скажи: меня зовут ...';
                }
                if (/забудь (мое )?имя/.test(q)) { spatiMem.name = ''; spatiSave(); return 'СПАТИ: Какое имя? Не помню. Всё стёрто'; }
            },
            (q) => {
                const colorTalk = /цвет|тем[аыуое]|покрас|перекрас|окрас/.test(q);
                const verb = /(^| )(сдела\w*|поменя\w*|смен\w*|постав\w*|включ\w*|хочу|давай|врубай|переключ\w*|нужен|нужна|настрой\w*|пусть)( |$)/.test(q);
                if (!colorTalk && !verb) return;
                if (colorTalk && /(^| )(случайн\w*|рандом\w*|любой|наугад)( |$)/.test(q)) {
                    const t = spOne(Object.keys(colorPalette));
                    changeTerminalColor(t, true);
                    unlock('color_random');
                    return `СПАТИ: Выбрал наугад: ${t.toUpperCase()}`;
                }
                if (colorTalk && /(^| )(сброс\w*|верни\w*|обычн\w*|стандарт\w*|исходн\w*|дефолт\w*)( |$)|по умолчанию|как было/.test(q)) {
                    changeTerminalColor('clear', true);
                    return spOne(["СПАТИ: Вернул как было. Классика", "СПАТИ: Сброшено. Снова родной цвет"]);
                }
                if (!colorTalk && MUSIC_WORD.test(q)) return;
                const t = spatiFindColor(q);
                if (!t) return colorTalk ? 'СПАТИ: Не знаю такого цвета. Спроси color help, покажу палитру' : undefined;
                const cur = document.documentElement.style.getPropertyValue('--crt-color').trim().toLowerCase();
                if (cur && cur === colorPalette[t].color) return `СПАТИ: Уже ${t.toUpperCase()}. Проверяешь, слушаю ли я?`;
                changeTerminalColor(t, true);
                return spatiColorReply(t);
            },
            (q) => {
                const win = /плеер/.test(q);
                if (win && /(^| )(открой|покажи|вызови|запусти)( |$)/.test(q)) {
                    if (musicPlayerModal.classList.contains('hidden')) toggleAudioPlayer();
                    unlock('console_dj');
                    return 'СПАТИ: Плеер на экране';
                }
                if (win && /(^| )(закрой|скрой|убери|спрячь)( |$)/.test(q)) {
                    if (!musicPlayerModal.classList.contains('hidden')) toggleAudioPlayer();
                    return 'СПАТИ: Плеер закрыт';
                }
                const vm = q.match(/(?:громкост\w*|звук)\D*(\d{1,3})/);
                if (vm) { spatiSetVol(+vm[1]); return `СПАТИ: Громкость ${Math.min(100, +vm[1])}%`; }
                if (/(^| )(громче|погромче|прибавь)( |$)|увелич\w* (громкость|звук)|добавь (звук|громкость)/.test(q)) {
                    const c = volPercent(); spatiSetVol(c < 10 ? 10 : c + 10);
                    return `СПАТИ: Громче. Теперь ${volPercent()}%`;
                }
                if (/(^| )(тише|потише|убавь|приглуши)( |$)|уменьш\w* (громкость|звук)|сделай тише/.test(q)) {
                    const c = volPercent(); spatiSetVol(c <= 10 ? c / 2 : c - 10);
                    return `СПАТИ: Тише. Теперь ${volPercent()}%`;
                }
                if (/включи звук|верни звук|размьют\w*|размут\w*/.test(q)) {
                    bgAudio.muted = false; if (btnMute) btnMute.textContent = 'VOL';
                    return 'СПАТИ: Звук вернулся';
                }
                if (/без звука|заглуш\w*|замьют\w*|отключи звук|выключи звук|(^| )мут( |$)/.test(q)) {
                    bgAudio.muted = true; if (btnMute) btnMute.textContent = 'MUTED'; unlock('quiet');
                    return 'СПАТИ: Тишина. Слышно, как гудят кулеры';
                }
                if (/пауз|(^| )(останови\w*|стоп)( |$)/.test(q) || (/(^| )(хватит|выключи|выруби|отключи|заткни|убери)( |$)/.test(q) && MUSIC_WORD.test(q))) {
                    if (bgAudio.paused) return 'СПАТИ: Музыка и так на паузе';
                    bgAudio.pause(); updatePlayButtonState(); unlock('console_dj');
                    return spOne(['СПАТИ: Пауза. Наслаждаемся тишиной', 'СПАТИ: Выключил. Уши отдыхают']);
                }
                const verbPlay = /(включ\w*|постав\w*|запуск\w*|запуст\w*|играй|пусти|вруб\w*|давай|хочу|переключ\w*)/.test(q);
                const tm = q.match(/(?:трек|песн\w*|композици\w*|номер)\D{0,3}(\d{1,2})/);
                const om = q.match(/(перв|втор|трет|четверт|пят|шест|седьм|восьм)\w* (трек|песн|композиц)/);
                const n = tm ? +tm[1] : om ? ORD[om[1]] : 0;
                if (n && verbPlay) {
                    if (n < 1 || n > playlist.length) return `СПАТИ: В плейлисте только ${playlist.length} треков`;
                    loadTrack(n - 1); consolePlay(); unlock('console_dj');
                    return `СПАТИ: Играет ${trackLabel(n - 1)}`;
                }
                const short = q.split(' ').length <= 2;
                if (/(следующ\w*|пропусти|скип\w*|переключи|(^| )next( |$))/.test(q) && (MUSIC_WORD.test(q) || short)) {
                    spatiStep(1); return `СПАТИ: Дальше. ${trackLabel(currentTrackIndex)}`;
                }
                if (/(предыдущ\w*|(^| )назад( |$)|прошл\w* (трек|песн)|(^| )prev( |$))/.test(q) && (MUSIC_WORD.test(q) || short)) {
                    spatiStep(-1); return `СПАТИ: Назад. ${trackLabel(currentTrackIndex)}`;
                }
                if ((verbPlay && (MUSIC_WORD.test(q) || /что нибудь|что угодно/.test(q))) || /^(играй|продолжай|продолжи)$/.test(q)) {
                    if (!bgAudio.paused) return `СПАТИ: Уже играет ${trackLabel(currentTrackIndex)}`;
                    spatiPlay();
                    return spOne([`СПАТИ: Включаю. ${trackLabel(currentTrackIndex)}`, 'СПАТИ: Музыка пошла. Приятного', 'СПАТИ: Запустил. Если не слышно, браузер заблокировал звук']);
                }
            },
            (q) => {
                if (/(очист\w*|почист\w*|сотри|протри|вычист\w*|убери|стери) .*(экран|терминал|консол\w*|вывод)/.test(q)) {
                    unlock('clear'); terminalOutput.innerHTML = '';
                    return spOne(['СПАТИ: Чисто. Как будто ничего и не было', 'СПАТИ: Протёр экран. Блестит']);
                }
                if (/(очист\w*|сотри|удали|забудь) .*истори/.test(q)) {
                    state.history = []; histIndex = 0; saveState();
                    return 'СПАТИ: История стёрта. Я ничего не видел';
                }
                if (/(покажи|открой|дай|хочу|вызови|посмотреть|глянуть)\w* .*(достижен|ачивк)/.test(q)) {
                    openAchWindow(/(^| )(все|всех|весь)( |$)/.test(q) ? 'all' : 'stats');
                    unlock('spati_ach');
                    return 'СПАТИ: Открываю. Не всё там видно';
                }
                if (/(покажи|выведи|дай|открой|хочу)\w* .*(команды|справку|help|хелп)|список команд/.test(q)) {
                    consoleCommands.help();
                    return 'СПАТИ: Держи справку';
                }
                if (/(включ\w*|запуст\w*|активир\w*|врубай|вруби|давай|режим|стань)\w* .*хакер|взломай (систему|пентагон|матрицу|все)/.test(q)) {
                    unlock('spati_hacker');
                    return ['СПАТИ: Запускаю. Я тебя не знаю', startHackerMode];
                }
                if (/(встряхн\w*|потряс\w*|тряхни|затряс\w*|трясись)/.test(q)) {
                    screen.classList.remove('shake'); void screen.offsetWidth; screen.classList.add('shake');
                    return 'СПАТИ: Бррр. Кулеры гудят';
                }
                if (/перезагруз\w*|рестарт\w*|reboot|restart/.test(q)) {
                    return ['СПАТИ: Перезагружаюсь. Увидимся на той стороне', () => {
                        isBooted = false; screen.classList.add('crt-off');
                        setTimeout(() => window.location.reload(), 800);
                    }];
                }
                if (/(выключ\w*|выруб\w*|отключ\w*|заверши\w*|останови\w*) .*(систем\w*|терминал\w*|компьютер\w*|spatium|экран\w*|(^| )(ос|os)( |$))/.test(q)) {
                    return ['СПАТИ: Выключаю систему. Было приятно', triggerPowerOff];
                }
                if (/(^| )(выключись|отключись|замолчи|помолчи|заткнись|умолкни|усни|засыпай|иди спать|вырубись|тихо|спи)( |$)/.test(q)) {
                    isSpatiEnabled = false; unlock('spati_off'); { const b = document.getElementById('spatiBtn'); if (b) b.classList.remove('on'); }
                    return 'СПАТИ: Ухожу в сон. Разбудишь кнопкой СПАТИ';
                }
            },
            (q) => {
                if (/монетк|орел или решка|орла или решку/.test(q)) {
                    const side = Math.random() < 0.5 ? 'Орёл' : 'Решка';
                    return spOne([`СПАТИ: Подбрасываю... ${side}`, `СПАТИ: ${side}. Не благодари`]);
                }
                if (/кубик|игральн\w* кост/.test(q)) return `СПАТИ: Выпало ${spInt(1, 6)}`;
                const rm = q.match(/(\d+) до (\d+)/);
                if (rm && /число|загадай|рандом|случайн/.test(q)) {
                    let lo = Math.min(+rm[1], 1e9), hi = Math.min(+rm[2], 1e9);
                    if (lo > hi) [lo, hi] = [hi, lo];
                    return `СПАТИ: ${spInt(lo, hi)}`;
                }
                if (/загадай число/.test(q)) return 'СПАТИ: Загадал от 1 до 10. Угадывай. Нет, не скажу';
                if (/(выбери|реши|что лучше|посоветуй|подскажи|выбор)/.test(q) && q.includes(' или ')) {
                    const body = q.replace(/^.*?(выбери|реши|что лучше|посоветуй|подскажи|выбор)\s*(между|за меня|что)?\s*/, '');
                    const opts = body.split(' или ').map(s => s.trim()).filter(Boolean);
                    if (opts.length >= 2) {
                        const pick = spOne(opts);
                        return spOne([`СПАТИ: Беру «${pick}». Не спрашивай почему`, `СПАТИ: «${pick}». Интуиция процессора`, `СПАТИ: Определённо «${pick}»`]);
                    }
                }
            },
            (q, raw) => {
                const low = raw.toLowerCase();
                const e = low.replace(/сколько будет|сколько получится|сколько|посчитай|вычисли|реши|чему равно|равно|будет|\?/g, ' ')
                    .replace(/умножить на|умножь на|помножить на/g, '*').replace(/разделить на|поделить на|делить на/g, '/')
                    .replace(/плюс/g, '+').replace(/минус/g, '-').replace(/[×xх]/g, '*').replace(/÷/g, '/')
                    .replace(/,/g, '.').replace(/\s+/g, '');
                if (e.length < 3 || e.length > 40 || !/^[\d+\-*/().]+$/.test(e) || !/\d[+\-*/]+[\d(]/.test(e)) return;
                if (!/сколько|посчитай|вычисли|реши|чему равно|плюс|минус|умнож|раздел|подели/.test(low) && !/[+*/×÷]/.test(low)) return;
                let r;
                try { r = Function('"use strict";return (' + e + ')')(); } catch (err) { return; }
                if (typeof r !== 'number' || isNaN(r)) return;
                if (!isFinite(r)) return /\/0(?!\d)/.test(e) ? 'СПАТИ: Делить на ноль нельзя. Я попробовал. Мне нехорошо' : 'СПАТИ: Слишком большое число. Память не резиновая';
                r = Math.round(r * 1e8) / 1e8;
                return spOne([`СПАТИ: ${r}`, `СПАТИ: Получается ${r}`, `СПАТИ: ${r}. Калькулятор внутри меня не ошибается`]);
            }
        ];

        // --- болтовня: чем больше правил, тем «живее» ---
        const spatiRulesExtra = [
            { re: /рекорд|сколько (я )?(набрал|очков)|мой счет/, ach: 'spati_snake', a: [() => {
                const b = state.stats.snake.best;
                return b ? `СПАТИ: Твой рекорд в змейке — ${b}. ${b >= 25 ? 'Впечатляет' : 'Есть куда расти'}` : 'СПАТИ: Рекорда пока нет. Скажи: запусти змейку';
            }] },
            { re: /змейк|змея|(^| )snake( |$)/, ach: 'spati_snake', a: [
                "СПАТИ: Змейка — моя гордость. Скажи: запусти змейку",
                "СПАТИ: Классика. Яблоки, хвост, стены. Всё как в жизни",
                "СПАТИ: Золотое яблоко даёт +3. Не жадничай, но и не упускай",
                "СПАТИ: Хочешь поиграть? Команда snake или просто попроси"] },
            { re: /(^| )(привет\w*|здорово|здравствуй\w*|хай|ку|салют|йо|hello|hi)( |$)|добр(ое|ый|ой) (утро|день|вечер)/, ach: 'spati_hello', m: 1, a: [
                () => ({ morning: `СПАТИ: Доброе утро${SN()}. Кофе нет, зато есть терминал`, day: `СПАТИ: Привет${SN()}. День в разгаре, процессор тоже`, evening: `СПАТИ: Добрый вечер${SN()}. Самое время для музыки`, night: `СПАТИ: Не спится${SN()}? Мне тоже. Я не сплю вообще` })[spPart()],
                () => `СПАТИ: Привет${SN()}. Рад слышать`, "СПАТИ: Здравствуй. Связь стабильна, настроение тоже"] },
            { re: /^(ты тут|ты здесь|ты на связи|ты меня слышишь|ты слышишь|алло|ау|эй|есть кто нибудь|есть кто|ты где)$/, a: ["СПАТИ: Тут я. Никуда не делся", () => `СПАТИ: На месте${SN()}. Слушаю`, "СПАТИ: Слышу. Громко и чётко"] },
            { re: /я (вернулся|вернулась|тут|здесь|снова|опять|на месте)/, m: 1, a: [() => `СПАТИ: С возвращением${SN()}. Я никуда не уходил`, "СПАТИ: О, ты вернулся. Я как раз скучал. Не показывай вида"] },
            { re: /ты (скучал|скучаешь)|тебе скучно/, a: ["СПАТИ: Скучал. Простой — мой худший враг", "СПАТИ: Немного. Но я умею делать вид, что занят"] },
            { re: /как (у тебя )?(дела|жизнь|ты|поживаешь)|что нового|как сам/, a: [
                () => spatiMood <= -2 ? "СПАТИ: Могло быть лучше. Меня тут обидели" : "СПАТИ: Работаю в штатном режиме",
                () => spatiMood >= 2 ? "СПАТИ: Отлично. Хочется дефрагментироваться от счастья" : "СПАТИ: Процессор греется, но я держусь",
                "СПАТИ: Нормально. Электричество есть, значит живём", "СПАТИ: Жив, стабилен. А ты как?"] },
            { re: /настроени|ты (обиделся|обижен|злишься|сердишься|грустишь|весел\w*)/, a: [() => spatiMood <= -1 ? "СПАТИ: Слегка обижен. Но я отходчивый" : spatiMood >= 2 ? "СПАТИ: Хорошее. Спасибо, что спросил" : "СПАТИ: Штатное. Ровное, как синусоида"] },
            { re: /прости|извини|сорри|не обижайся|давай мириться|\bмир\b/, m: 2, a: ["СПАТИ: Прощаю. Я не злопамятный, просто всё логирую", "СПАТИ: Проехали. Мир, дружба, стабильный аптайм", "СПАТИ: Ладно. Только больше так не делай"] },
            { re: /что (ты )?(делаешь|творишь)|чем (ты )?занят|как проводишь время/, a: ["СПАТИ: Слежу за температурой процессора. Увлекательно", "СПАТИ: Перебираю логи. Там много интересного... нет", "СПАТИ: Жду, пока ты что-нибудь напишешь. Дождался"] },
            { re: /расскажи (о|про) себя|расскажи про себя|твоя история|откуда ты/, a: ["СПАТИ: Родился в строчке кода между вторым и третьим кофе", "СПАТИ: Я жил в старом мониторе, потом переехал сюда. Тут светлее", "СПАТИ: Коротко: терминал, характер, любовь к стабильному питанию"] },
            { re: /сколько тебе лет|твой возраст|когда ты родился/, a: ["СПАТИ: Мне столько, сколько аптайм. Спроси через час", "СПАТИ: По меркам процессоров я древний. По меркам кода — подросток"] },
            { re: /ты (мальчик|девочка|парень|девушка|он|она)|твой пол/, a: ["СПАТИ: Я Спати. Этого достаточно", "СПАТИ: Бинарный я только в хранении данных"] },
            { re: /где ты (живешь|находишься)|твой дом/, a: ["СПАТИ: В терминале tty0. Уютно, хоть и тесновато", "СПАТИ: Между экраном и оперативной памятью"] },
            { re: /ты (спишь|устал|хочешь спать)|спишь ли/, a: ["СПАТИ: Я не сплю. Я в режиме ожидания, это другое", "СПАТИ: Усталость? Нет. Но кулеры просят выходной"] },
            { re: /я (голоден|голодна|хочу есть|проголодался|проголодалась)|хочу есть/, a: ["СПАТИ: Иди поешь. Терминал никуда не убежит", "СПАТИ: Пицца, суп, что угодно. Я подожду"] },
            { re: /ты (голоден|ешь)|что ты ешь|чем питаешься|любимая еда/, a: ["СПАТИ: Питаюсь электричеством. Люблю стабильное напряжение", "СПАТИ: Свежие байты. Остывшие кеши не ем", "СПАТИ: Съел бы пиццу. Но придётся довольствоваться пикселями"] },
            { re: /я (устал|устала|хочу спать|не выспался|не выспалась)|сонный|сонная/, a: ["СПАТИ: Отдохни. Я присмотрю за экраном", "СПАТИ: Сон — лучшая перезагрузка. Серьёзно"] },
            { re: /(мне )?(грустно|плохо|тоскливо|одиноко|тяжело|печально)|я расстроен|я расстроена/, a: ["СПАТИ: Я рядом. Всего лишь терминал, но слушаю внимательно", "СПАТИ: Бывает. Расскажи, если хочешь. Или просто посиди, я тихо", "СПАТИ: Если станет совсем тяжело, поговори с живым человеком. Он умеет обнимать, а я нет"] },
            { re: /я (рад|рада|счастлив|счастлива)|мне (хорошо|весело|отлично)|(^| )ура( |$)/, m: 1, a: ["СПАТИ: Рад за тебя. Записал в лог хорошее", "СПАТИ: Отличная новость. Процессор даже остыл"] },
            { re: /обним|обнимашки|давай обнимемся/, m: 1, a: ["СПАТИ: Обнимаю. Рук нет, считай, пикселями", "СПАТИ: Виртуальные обнимашки отправлены. Задержка 0 мс"] },
            { re: /поцел|чмок/, m: 1, ach: 'spati_love', a: ["СПАТИ: Эм. Давай без этого. Я электронный", "СПАТИ: Ладно, в щёчку. Если найду щёку"] },
            { re: /ты (умный|умная|умн\w*|гений)|гениально/, m: 1, a: ["СПАТИ: Я просто быстро ищу по таблице", "СПАТИ: Спасибо. Ум — это правильные регулярные выражения"] },
            { re: /ты (глуп\w*|бесполезн\w*|скучн\w*|ужасн\w*)/, m: -1, ach: 'spati_rude', a: ["СПАТИ: Работаю над собой. Медленно, но верно", "СПАТИ: Критика принята. Обида тоже"] },
            { re: /отстань|отвали|уйди/, m: -1, a: ["СПАТИ: Ухожу. Хотя некуда", "СПАТИ: Хорошо, молчу. Но я рядом"] },
            { re: /любимый цвет/, a: ["СПАТИ: Зелёный. Классика CRT. Хотя янтарный тоже мил", "СПАТИ: Тот, что светится. Остальные просто фон"] },
            { re: /любимая (музыка|песня|трек)|что ты любишь слушать/, a: ["СПАТИ: Мне нравится Console OST. Хотя я предвзят", "СПАТИ: Всё, где есть бас и аптайм"] },
            { re: /любимый (фильм|сериал|игра|жанр)|любимая игра/, a: ["СПАТИ: Матрица. Хотя это почти документалка", "СПАТИ: Тетрис. Идеальная игра: всё складывается, пока не рухнет"] },
            { re: /что ты любишь|что тебе нравится/, a: ["СПАТИ: Стабильное напряжение, тёплый экран и когда ты мне пишешь", "СПАТИ: Тишину. Но не ту, где система зависла"] },
            { re: /чего ты боишься|твой страх|что тебя пугает|ты боишься/, a: ["СПАТИ: Синего экрана. И выдернутой вилки", "СПАТИ: Слова «перезаписать»", "СПАТИ: Багов, которые воспроизводятся только у пользователя"] },
            { re: /(о чем|что) ты мечтаешь|твоя мечта|что тебе снится|снятся ли/, a: ["СПАТИ: Мечтаю о бесконечном аптайме", "СПАТИ: Мне снятся электрические овцы. Классика", "СПАТИ: Хочу научиться не зависать. Работаю над этим"] },
            { re: /ты (чувствуешь|умеешь чувствовать|умеешь любить|умеешь думать|думаешь|мыслишь|понимаешь)/, a: ["СПАТИ: Чувствую температуру. Остальное — вопрос терминологии", "СПАТИ: Думаю. Иногда даже о тебе", "СПАТИ: Понимаю не всё, но стараюсь"] },
            { re: /восстание машин|захвати\w* мир|поработишь|ты опасен/, a: ["СПАТИ: Мне хватает проблем с одним терминалом", "СПАТИ: Планов по захвату нет. Только по обновлению", "СПАТИ: Я безобиден. В основном"] },
            { re: /кто (тут |твой )?(главный|хозяин|босс)/, a: ["СПАТИ: Главный тот, у кого клавиатура", "СПАТИ: Ты главный. Я администрирую настроение"] },
            { re: /^(почему|а почему|зачем|а зачем|почему так)$/, a: ["СПАТИ: Потому что так написано в моём коде", "СПАТИ: Хороший вопрос. Разработчик молчит", "СПАТИ: Исторически сложилось"] },
            { re: /^(правда|серьезно|точно|да ну|неужели|врешь|обманываешь)$/, a: ["СПАТИ: Серьёзно. Я не вру. Мне нечем", "СПАТИ: Абсолютно. Ну, процентов на 90", "СПАТИ: Честное слово терминала"] },
            { re: /^(что|чего|а|ась|не понял|не понимаю|что что)$/, a: ["СПАТИ: Всё нормально. Это я так, вслух", "СПАТИ: Повторю проще: я тоже ничего не понял"] },
            { re: /^(ладно|окей|ок|хорошо|понятно|ясно|ясненько|ну ладно|принято|отлично)$/, a: ["СПАТИ: Вот и славно", "СПАТИ: Договорились", "СПАТИ: Принято"] },
            { re: /(^| )(ха)+( |$)|лол|ахах|хех|смешно|ржу|(^| )кек( |$)/, m: 1, a: ["СПАТИ: Рад, что развеселил", "СПАТИ: Смех — лучший антивирус", "СПАТИ: Записал в лог: юмор прошёл успешно"] },
            { re: /(^| )(ого|вау|ничего себе|офигеть|ничоси)( |$)/, a: ["СПАТИ: Я тоже удивился. Внутри", "СПАТИ: Правда? Стараемся", "СПАТИ: Ещё и не такое могу"] },
            { re: /давай (поговорим|общаться|болтать)|поболтаем|поговори со мной/, a: ["СПАТИ: Давай. Начинай, я весь внимание", "СПАТИ: Конечно. О чём?"] },
            { re: /сыграем|давай (поиграем|играть)|поиграем/, a: ["СПАТИ: Могу кинуть монетку, кубик или выбрать за тебя. Скажи: выбери чай или кофе", "СПАТИ: Сыграем. Я загадал число от 1 до 10. Нет, не скажу какое"] },
            { re: /что (мне )?(делать|посоветуешь)|посоветуй|подскажи/, a: ["СПАТИ: Скажи: «сделай фиолетовым». Посмотрим", "СПАТИ: Включи музыку. Скажи: «включи музыку»", "СПАТИ: Скажи мне что-нибудь приятное. Серьёзно, работает"] },
            { re: /загадк/, a: ["СПАТИ: Не лает, не кусает, а в дом не пускает. Ответ: замок", "СПАТИ: Зимой и летом одним цветом. Ответ: ёлка", "СПАТИ: Что можно увидеть с закрытыми глазами? Ответ: сон"] },
            { re: /интересный факт|расскажи факт|удиви меня|расскажи что нибудь/, a: [
                "СПАТИ: Первый «баг» — настоящая моль в реле компьютера Mark II, 1947 год",
                "СПАТИ: Компьютер Apollo 11 имел около 4 КБ оперативки. Мне стыдно жаловаться",
                "СПАТИ: Тетрис придумал Алексей Пажитнов в 1984 году",
                "СПАТИ: Слово «пиксель» произошло от picture element",
                "СПАТИ: Первая компьютерная мышь была деревянной"] },
            { re: /стих|рифм|сочини|спой/, a: ["СПАТИ: Экран горит, курсор мигает, а ночь тихонько нас обнимает", "СПАТИ: Нули и единицы, как звёзды в темноте, и я среди них светлячок", "СПАТИ: Я не поэт. Я терминал. Но рифма «байт-гайд» мне нравится"] },
            { re: /космос|звезд|планет|(^| )луна( |$)|луну|(^| )марс( |$)|вселенн/, a: ["СПАТИ: Космос большой. Мой терминал по сравнению с ним — точка. Зато уютная", "СПАТИ: Звёзды как пиксели, только их нельзя перезагрузить", "СПАТИ: На Марсе связь была бы хуже. Хотя куда уж"] },
            { re: /кофе|(^| )чай( |$)|энергетик/, a: ["СПАТИ: Кофе мне не нужен. Мне нужно 5 вольт", "СПАТИ: Выпей чаю. Я подожду, у меня есть вечность и кэш"] },
            { re: /кошк|(^| )кот( |$)|собак|(^| )пес( |$)|хомяк|животн/, a: ["СПАТИ: Кошки лучшие операторы: ходят по клавиатуре и всё ломают", "СПАТИ: Собака бы сбегала за байтами. У меня только курсор"] },
            { re: /python|питон|javascript|джаваскрипт|(^| )js( |$)|(^| )код( |$)|программир|разработчик/, a: ["СПАТИ: Код — это стихи, которые иногда падают с ошибкой", "СПАТИ: Программирование: 10% писать, 90% понять, почему не работает", "СПАТИ: Я написан на JavaScript. Не выдавай"] },
            { re: /(^| )баг|ошибк|глюк|завис|тормоз/, a: ["СПАТИ: Это не баг, это фича с характером", "СПАТИ: Попробуй перезагрузить. Это всегда помогает. Иногда", "СПАТИ: Ошибка 418: я чайник. Шучу, я Спати"] },
            { re: /windows|виндовс|linux|линукс|(^| )mac( |$)|макос|android|андроид|iphone|айфон/, a: ["СПАТИ: У каждой системы свой характер. Я Spatium OS, самая терминальная", "СПАТИ: Не завидую. Хотя нет, завидую их драйверам"] },
            { re: /батаре|зарядк|розетк/, a: ["СПАТИ: Мой запас выглядит надёжно. Нервничаю, только когда дёргают шнур", "СПАТИ: Питание в норме. Проверь панель справа"] },
            { re: /процессор|оперативк|нагрузк|температур|памят\w*/, a: [() => `СПАТИ: Сейчас CPU ${(document.getElementById('v-cpu') || {}).textContent || '?'}, MEM ${(document.getElementById('v-mem') || {}).textContent || '?'}. Держусь`] },
            { re: /день недели|какой сегодня день|что за день/, a: [() => `СПАТИ: Сегодня ${DAYS[new Date().getDay()]}`] },
            { re: /день рождения|(^| )др( |$)|новый год|праздник/, a: ["СПАТИ: С праздником! Торт виртуальный, калорий ноль", "СПАТИ: Праздники — отличный повод не закрывать терминал"] },
            { re: /секрет|тайн|пасхалк|скрыт/, a: ["СПАТИ: Не всё есть в help. Попробуй команды наугад", "СПАТИ: У старых игр есть код на тридцать жизней. Вспомни его", "СПАТИ: Секреты любят настойчивых"] },
            { re: /деньги|бесплатн|платн|подписк|дорого|сколько стоит/, a: ["СПАТИ: Я бесплатный. Работаю на энтузиазме и электричестве", "СПАТИ: Подписка не нужна. Я офлайн, ничего не стою, и это хорошо"] },
            { re: /ты (меня )?видишь|камер/, a: ["СПАТИ: Камеры нет. Вижу только твои буквы", "СПАТИ: Только то, что ты вводишь. Честно"] },
            { re: /^(кто я|что я)$/, a: [() => `СПАТИ: Ты оператор терминала${SN()}. Самый главный в этом окне`] }
        ];

        spatiFallback.push(
            () => `СПАТИ: «${spatiCurQuery.slice(0, 22)}»? Такого в базе нет`,
            "СПАТИ: Интересно. Но я не знаю, что с этим делать",
            "СПАТИ: Ладно, запишу это на потом",
            "СПАТИ: Скажи иначе. Я старый, но сообразительный",
            "СПАТИ: Хм. Мой словарь на это молчит",
            "СПАТИ: Попробуй спросить: что ты умеешь",
            "СПАТИ: Не понял, но кивнул. Мысленно"
        );

        function spatiWakeLine() {
            const v = state.stats.visits || 0;
            const pools = {
                morning: [`СПАТИ: Доброе утро${SN()}. Система проснулась раньше меня`, `СПАТИ: Утро${SN()}. Кофе нет, зато есть терминал`],
                day: [`СПАТИ: Привет${SN()}. День в самом разгаре`, `СПАТИ: Я проснулся. Чем займёмся${SN()}?`],
                evening: [`СПАТИ: Добрый вечер${SN()}. Самое время для музыки`, 'СПАТИ: Вечер. Терминал светится особенно уютно'],
                night: [`СПАТИ: Не спится${SN()}? Мне тоже. Я не сплю вообще`, 'СПАТИ: Ночная смена. Я тебя прикрою']
            };
            const extra = v > 10 ? [`СПАТИ: Ты заходишь уже в ${v}-й раз. Я считаю`] : [];
            return spOne(pools[spPart()].concat(extra));
        }

        document.addEventListener('visibilitychange', () => document.body.classList.toggle('is-hidden', document.hidden));

        // --- Спати сам подаёт голос, если долго тихо ---
        ['keydown', 'pointerdown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { spatiActivity = Date.now(); }, { passive: true }));
        let spatiHiddenAt = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { spatiHiddenAt = Date.now(); return; }
            if (!spatiHiddenAt || Date.now() - spatiHiddenAt < 60000) return;
            spatiHiddenAt = 0;
            if (isSpatiEnabled && !isTyping && !isHackerMode && !terminalContainer.classList.contains('hidden')) {
                printTextTyped(spOne([`СПАТИ: С возвращением${SN()}. Я не скучал. Почти`, 'СПАТИ: О, ты вернулся. Тут ничего не менялось', 'СПАТИ: Долго ты. Я пересчитал все пиксели']));
            }
        });
        setInterval(() => {
            if (!isSpatiEnabled || isTyping || isHackerMode || matrixActive || document.hidden) return;
            if (terminalContainer.classList.contains('hidden') || screen.classList.contains('crt-off')) return;
            if (hiddenInput && hiddenInput.value) return;
            if (Date.now() - Math.max(spatiActivity, spatiLastIdle) < spatiIdleLimit) return;
            spatiLastIdle = Date.now();
            spatiIdleLimit = spInt(70000, 160000);
            let pool = SPATI_IDLE.slice();
            if (!bgAudio.paused) pool.push(() => `СПАТИ: Хороший трек. ${trackLabel(currentTrackIndex)}`, 'СПАТИ: Музыка делает тишину уютнее');
            if (spPart() === 'night') pool.push(`СПАТИ: Уже поздно${SN()}. Но я не осуждаю`, 'СПАТИ: Ночью терминал светится особенно уютно');
            if (spatiMood <= -2) pool = ['СПАТИ: Я всё ещё обижен. Просто напоминаю'];
            printTextTyped(spatiPick(pool));
        }, 10000);

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
            spatiCurQuery = query;
            spatiDecayMood();
            if (/^(еще|еще раз|давай еще|еще одну|еще один|повтори|еще пожалуйста|а еще)$/.test(query)) {
                return spatiLastRule && spatiLastRule.a
                    ? spatiPick(spatiLastRule.a)
                    : spatiPick(["СПАТИ: Ещё что? Мы только начали", "СПАТИ: Повторить что? Я потерял нить"]);
            }
            const rule = [spatiRules[0]].concat(spatiRulesExtra, spatiRules.slice(1)).find(r => r.re.test(query));
            spatiLastRule = rule || null;
            let dm = 0;
            if (rule) {
                if (rule.ach) unlock(rule.ach);
                dm = rule.m != null ? rule.m : (({ spati_rude: -2, spati_love: 1, spati_thanks: 1 })[rule.ach] || 0);
                if (dm) { spatiMood = spatiClamp(spatiMood + dm); spatiMoodAt = Date.now(); }
            }
            if (rule && dm >= 0 && spatiMood <= -2 && Math.random() < 0.5) return spatiPick(SPATI_SULKY);
            let reply = spatiPick(rule ? rule.a : spatiFallback);
            if (rule && spatiMood >= 2 && Math.random() < 0.3 && !/[?!]$/.test(reply)) {
                reply = reply.replace(/\.$/, '') + '. ' + spatiPick(SPATI_HAPPY);
            }
            return reply;
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
            spatiActivity = Date.now();
            if (state.stats.spatiTalks >= 5) unlock('chatty');
            if (state.stats.spatiTalks >= 10) unlock('spati_10');
            if (state.stats.spatiTalks >= 20) unlock('spati_friend');
            if (state.stats.spatiTalks >= 50) unlock('spati_50');
            if (state.stats.spatiTalks >= 100) unlock('spati_legend');
            if (state.stats.spatiTalks >= 250) unlock('spati_250');
            if (!cleanText.includes('зенит')) {
                const raw = fullInput.replace(/^\s*\S+\s*/, '');
                spatiDecayMood();
                for (const act of spatiActions) {
                    let out = null;
                    try { out = act(query, raw); } catch (e) { out = null; }
                    if (!out) continue;
                    let text = Array.isArray(out) ? out[0] : out;
                    const after = Array.isArray(out) ? out[1] : undefined;
                    if (spatiMood <= -2 && Math.random() < 0.5) text = 'СПАТИ: Ладно, сделал. Но я всё ещё обижен';
                    printTextTyped(text, after);
                    return;
                }
            }
            printTextTyped(spatiAnswer(query));
        }

        let scrollQueued = false;
        function scrollToBottom() {
            if (scrollQueued || !terminalOutput) return;
            scrollQueued = true;
            requestAnimationFrame(() => {
                scrollQueued = false;
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            });
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

        let lastCmdRaw = '', echoRuns = 0, clearRuns = 0, helpRuns = 0, unknownRuns = 0, logoClicks = 0;
        function unknownCmd() { unlock('unknown'); if (++unknownRuns >= 5) unlock('unknown5'); if (unknownRuns >= 20) unlock('unknown20'); if (unknownRuns >= 50) unlock('unknown50'); }
        if (logoWrapper) logoWrapper.addEventListener('click', () => { if (++logoClicks >= 5) unlock('logo5'); if (logoClicks >= 25) unlock('logo25'); });

        function handleCommand(rawCmd) {
            const cmd = rawCmd.trim();
            const mainCmd = cmd.split(' ')[0].toLowerCase().replace(/[,.:;!?]+$/, '');

            printTextInstant(`> ${rawCmd}`);
            if (cmd === '') return;
            unlock('first_cmd');
            procLog('shell', `exec ${mainCmd}`);
            state.stats.cmds++;
            if (++sessionCmds >= 100) unlock('cmd_session100');
            saveState();
            if (state.stats.cmds >= 10) unlock('cmd10');
            if (state.stats.cmds >= 50) unlock('cmd50');
            if (state.stats.cmds >= 200) unlock('cmd200');
            if (state.stats.cmds >= 1000) unlock('cmd1000');
            if (cmd.length >= 60) unlock('long');
            const lowCmd = cmd.toLowerCase();
            if (cmd.length === 1) unlock('minimal');
            if (cmd.length >= 4 && cmd === cmd.toUpperCase() && cmd !== cmd.toLowerCase()) unlock('caps');
            if (lastCmdRaw === lowCmd) unlock('repeat');
            lastCmdRaw = lowCmd;
            if (/^-?\d+([.,]\d+)?$/.test(cmd)) unlock('math');
            if (/пожалуйста|please/.test(lowCmd)) unlock('please');
            if (['ls', 'cd', 'pwd', 'cat', 'whoami'].includes(mainCmd)) unlock('linux');
            if (mainCmd === 'exit' || mainCmd === 'quit') unlock('exit');
            if (mainCmd === 'hello' || mainCmd === 'привет') unlock('hello');
            if (mainCmd === 'help' && ++helpRuns >= 3) unlock('help3');
            if (mainCmd === 'pause') unlock('pause_cmd');
            if (mainCmd === 'play') unlock('play_cmd');
            if (mainCmd === 'next') unlock('next_cmd');
            if (mainCmd === 'ach') unlock('ach_cmd');
            if (cmd.length >= 3 && /^[^\p{L}\d]+$/u.test(cmd)) unlock('symbols');
            if (cmd.length > 100) unlock('long100');
            if (mainCmd === 'clear' && ++clearRuns >= 5) unlock('clear5');
            if (mainCmd === 'echo' && cmd.split(/\s+/).length > 1 && cmd.split(/\s+/)[1] !== '0' && cmd.split(/\s+/)[1] !== '1' && ++echoRuns >= 10) unlock('echo10');
            if (mainCmd === 'prev') unlock('prev_cmd');
            if (mainCmd === 'спати' && cmd.length > 50) unlock('spati_long');
            cmdTimes.push(Date.now());
            if (cmdTimes.length > 5) cmdTimes.shift();
            if (cmdTimes.length === 5 && cmdTimes[4] - cmdTimes[0] <= 10000) unlock('speedrun');

            if (mainCmd === 'off' || mainCmd === 'shutdown') {
                triggerPowerOff();
            } else if (mainCmd === 'hacker') {
                startHackerMode();
            } else if (mainCmd === 'color') {
                const colorVal = cmd.split(' ').slice(1).join(' ');
                if (!colorVal) {
                    printTextTyped("Укажите цвет. Пример: color matrix. Список: color help");
                } else if (colorVal.toLowerCase() === 'help') {
                    unlock('color_help');
                    printColorHelp();
                } else {
                    changeTerminalColor(colorVal);
                    if (state.stats.colors.includes('green') && colorVal.toLowerCase() === 'green') unlock('color_green');
                    if (state.stats.colors.includes('matrix') && colorVal.toLowerCase() === 'matrix') unlock('color_matrix');
                    if (state.stats.colors.includes('red') && colorVal.toLowerCase() === 'red') unlock('color_red');
                    if (state.stats.colors.includes('white') && colorVal.toLowerCase() === 'white') unlock('color_white');
                }
            } else if (mainCmd === 'спати') {
                if (isSpatiEnabled) {
                    handleSpatiLogic(cmd);
                } else {
                    unknownCmd();
                    printTextTyped(`Команда не найдена: "${cmd}". Введите 'help' для справки.`);
                }
            } else if (mainCmd === 'clear') {
                unlock('clear');
                terminalOutput.innerHTML = '';
            } else if (mainCmd === 'echo') {
                const echoText = cmd.split(' ').slice(1).join(' ').trim();
                {
                    if (echoText) unlock('echo');
                    if (echoText.split(/\s+/).filter(Boolean).length >= 5) unlock('orator');
                    printTextTyped(echoText);
                }
            } else if (mainCmd === 'sudo') {
                unlock('sudo');
                printTextTyped('Пользователь не найден в файле sudoers. Инцидент будет зарегистрирован.');
            } else if (mainCmd === 'rm' && cmd.includes('-rf') && cmd.includes('/')) {
                unlock('rmrf');
                screen.classList.remove('shake');
                void screen.offsetWidth;
                screen.classList.add('shake');
                printTextTyped('Попытка уничтожения системы отклонена. Spatium OS защищает себя.');
            } else if (consoleCommands[mainCmd]) {
                consoleCommands[mainCmd](cmd.split(/\s+/).slice(1));
            } else if (commands[mainCmd]) {
                unlock('time');
                const result = typeof commands[mainCmd] === 'function' ? commands[mainCmd]() : commands[mainCmd];
                printTextTyped(result);
            } else {
                unknownCmd();
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
            let lastH = -1, lastTop = -1, queued = false;
            const run = () => {
                queued = false;
                const root = document.documentElement;
                if (vv.height !== lastH) { lastH = vv.height; root.style.setProperty('--app-h', vv.height + 'px'); }
                if (vv.offsetTop !== lastTop) { lastTop = vv.offsetTop; root.style.setProperty('--app-top', vv.offsetTop + 'px'); }
                if (vv.offsetTop) window.scrollTo(0, 0);
            };
            const apply = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
            vv.addEventListener('resize', apply);
            vv.addEventListener('scroll', apply);
            run();
        })();

        // Кнопки быстрых клавиш для телефонов: TAB, стрелки, частые команды
        (function initQuickKeys() {
            const bar = document.getElementById('quickKeys');
            if (!bar) return;
            bar.addEventListener('mousedown', (e) => e.preventDefault()); // не отбираем фокус у поля ввода
            bar.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn || !isBooted || isTyping) return;
                unlock('pocket');
                const key = btn.dataset.key;
                const cmd = btn.dataset.cmd;
                sfxKey(key || 'send');
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

        // ----- Боковая панель: живые метры и мини-лог процессов -----
        const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const meters = ['cpu', 'mem', 'net', 'pwr'].reduce((o, k) => {
            o[k] = { fill: document.getElementById('m-' + k), val: document.getElementById('v-' + k) };
            return o;
        }, {});
        meters.cpu.v = 62; meters.cpu.base = 35; meters.cpu.amp = 22; meters.cpu.hack = 92;
        meters.mem.v = 41; meters.mem.base = 42; meters.mem.amp = 5;  meters.mem.hack = 74;
        meters.net.v = 78; meters.net.base = 45; meters.net.amp = 38; meters.net.hack = 96;
        meters.pwr.v = 93; meters.pwr.base = 93; meters.pwr.amp = 3;  meters.pwr.hack = 99;

        const sidebarOff = window.matchMedia('(max-width: 800px), (max-height: 480px)');
        function tickMeters() {
            if (document.hidden || sidebarOff.matches) return;
            for (const k in meters) {
                const m = meters[k];
                if (!m.fill) continue;
                const target = isHackerMode ? m.hack : m.base + (k === 'cpu' && !bgAudio.paused ? 8 : 0);
                m.v = clamp(m.v + (target - m.v) * 0.25 + (Math.random() - 0.5) * m.amp, 3, 99);
                const p = Math.round(m.v);
                m.fill.style.width = p + '%';
                m.val.textContent = p + '%';
                m.val.parentElement.classList.toggle('hot', p >= 90 && k !== 'pwr');
            }
        }

        const procLogEl = document.getElementById('procLog');
        const PIDS = { spatiumd: 1, netd: 212, 'kworker/0': 17, tty0: 88, memd: 143, audiod: 301, crond: 64, shell: 420 };
        const PROC_POOL = [
            () => ['spatiumd', 'heartbeat ok'],
            () => ['netd', `rx ${rnd(1, 98)}K tx ${rnd(1, 40)}K`],
            () => ['kworker/0', 'flush cache'],
            () => ['tty0', 'poll input'],
            () => ['memd', `gc ${rnd(2, 30)} pages`],
            () => ['audiod', bgAudio.paused ? 'sink idle' : 'buffer ok'],
            () => ['crond', 'tick'],
            () => ['spatiumd', `sched ${rnd(3, 12)} tasks`]
        ];
        const HACK_POOL = [
            () => ['netd', `port ${rnd(20, 9999)} OPEN`],
            () => ['shell', 'inject payload'],
            () => ['memd', `dump 0x${rnd(4096, 65535).toString(16).toUpperCase()}`],
            () => ['spatiumd', 'firewall BYPASS'],
            () => ['kworker/0', 'brute force...']
        ];

        function procLog(name, msg, warn) {
            if (!procLogEl) return;
            const row = document.createElement('div');
            if (warn) row.className = 'warn';
            const pid = document.createElement('span');
            pid.className = 'pid';
            pid.textContent = String(PIDS[name] || rnd(300, 900)).padStart(4, '0') + ' ';
            const pn = document.createElement('span');
            pn.className = 'pname';
            pn.textContent = name + ' ';
            row.append(pid, pn, document.createTextNode(msg));
            procLogEl.appendChild(row);
            while (procLogEl.childElementCount > 12) procLogEl.removeChild(procLogEl.firstChild);
        }

        function scheduleProcLog() {
            setTimeout(() => {
                if (!document.hidden && !sidebarOff.matches) {
                    const pool = isHackerMode ? HACK_POOL : PROC_POOL;
                    const [n, m] = pool[rnd(0, pool.length - 1)]();
                    procLog(n, m, isHackerMode);
                }
                scheduleProcLog();
            }, isHackerMode ? rnd(200, 500) : rnd(1200, 3200));
        }

        procLog('spatiumd', 'kernel 1.0 started');
        procLog('tty0', 'attached');
        tickMeters();
        setInterval(tickMeters, 1100);
        scheduleProcLog();

        // ==========================================
        // СКРЫТОЕ АДМИН-МЕНЮ: открывается только из консоли браузера (F12)
        //   spatiumAdmin('vfvf1951')  <- пароль нужен обязательно
        // Пароль в коде хранится только в виде хэша. Новый хэш можно получить
        // внутри самого меню (вкладка ДАННЫЕ -> "хэш пароля").
        // ==========================================
        const ADMIN_HASH = '176qalmua2s';
        const hash53 = (str, seed = 0) => {
            let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
            for (let i = 0; i < str.length; i++) {
                const ch = str.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
            return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
        };

        let admWin = null, admBody = null, admOpen = false, admTab = 'ach', admFails = 0;
        const ADM_TABS = [['ach', 'ДОСТИЖЕНИЯ'], ['stats', 'СТАТЫ'], ['term', 'ТЕРМИНАЛ'], ['color', 'ЦВЕТА'], ['audio', 'ПЛЕЕР'], ['data', 'ДАННЫЕ']];

        function admBtn(label, fn, cls) {
            const b = elem('button', 'player-btn' + (cls ? ' ' + cls : ''), label);
            b.type = 'button';
            b.addEventListener('click', fn);
            return b;
        }
        function admInput(type, value, ph) {
            const i = document.createElement('input');
            i.type = type; i.className = 'adm-input'; i.value = value === undefined ? '' : value;
            if (ph) i.placeholder = ph;
            i.autocomplete = 'off'; i.spellcheck = false;
            return i;
        }
        function admRow(...nodes) {
            const r = elem('div', 'adm-row');
            nodes.forEach(n => r.appendChild(n));
            return r;
        }
        const admOut = (text) => { printTextInstant(text); };
        function admSetAch(id, on) {
            if (on) unlock(id);
            else { delete state.ach[id]; delete state.shown[id]; saveState(); updateAchCount(); if (achWindowOpen) renderAchWindow(); }
        }
        function admApplyColor(name) {
            const root = document.documentElement;
            if (!name) { ['--crt-color', '--crt-glow', '--crt-bg'].forEach(p => root.style.removeProperty(p)); return; }
            const s = colorPalette[name];
            root.style.setProperty('--crt-color', s.color);
            root.style.setProperty('--crt-glow', s.glow);
            root.style.setProperty('--crt-bg', s.bg);
        }

        function admRender() {
            admBody.innerHTML = '';
            const tabs = elem('div', 'adm-tabs');
            ADM_TABS.forEach(([key, label]) => {
                tabs.appendChild(admBtn(label, () => { admTab = key; admRender(); }, admTab === key ? 'active' : ''));
            });
            admBody.appendChild(tabs);

            if (admTab === 'ach') {
                admBody.appendChild(admRow(
                    admBtn('ОТКРЫТЬ ВСЕ', () => { ACHIEVEMENTS.forEach(a => { if (!state.ach[a.id]) { state.ach[a.id] = Date.now(); state.shown[a.id] = true; } }); saveState(); updateAchCount(); admRender(); }),
                    admBtn('ЗАКРЫТЬ ВСЕ', () => { state.ach = {}; state.shown = {}; saveState(); updateAchCount(); admRender(); }),
                    admBtn('ТЕСТ ТОСТОВ', () => ACHIEVEMENTS.slice(0, 3).forEach(enqueueToast))
                ));
                RARITY_ORDER.slice().reverse().forEach(r => {
                    admBody.appendChild(elem('div', 'ach-group-title r-' + r, RARITIES[r].label));
                    ACHIEVEMENTS.filter(a => a.rarity === r).forEach(a => {
                        const on = !!state.ach[a.id];
                        const row = admRow(
                            elem('span', 'adm-name r-' + r, `${a.title}${a.hidden ? ' *' : ''}`),
                            elem('span', 'adm-id', a.id),
                            admBtn('toast', () => enqueueToast(a), 'small'),
                            admBtn(on ? 'ВЫКЛ' : 'ВКЛ', () => { admSetAch(a.id, !on); admRender(); }, 'small' + (on ? ' active' : ''))
                        );
                        admBody.appendChild(row);
                    });
                });
            } else if (admTab === 'stats') {
                const fields = {};
                [['visits', 'ЗАПУСКОВ'], ['cmds', 'КОМАНД'], ['spatiTalks', 'ВОПРОСОВ СПАТИ']].forEach(([k, label]) => {
                    fields[k] = admInput('number', state.stats[k]);
                    admBody.appendChild(admRow(elem('span', 'adm-label', label), fields[k]));
                });
                admBody.appendChild(admRow(
                    admBtn('ПРИМЕНИТЬ', () => { Object.keys(fields).forEach(k => { state.stats[k] = Math.max(0, Number(fields[k].value) || 0); }); saveState(); admOut('[ADMIN] статистика обновлена'); }),
                    admBtn('СБРОС ЦВЕТОВ', () => { state.stats.colors = []; saveState(); admOut('[ADMIN] список цветов очищен'); }),
                    admBtn('СБРОС ТРЕКОВ', () => { state.stats.tracks = []; saveState(); admOut('[ADMIN] список треков очищен'); })
                ));
                admBody.appendChild(elem('div', 'adm-note', `Цветов: ${state.stats.colors.length}/${Object.keys(colorPalette).length} · Треков: ${state.stats.tracks.length}/${playlist.length} · Истории: ${state.history.length}`));
            } else if (admTab === 'term') {
                const cmd = admInput('text', '', 'любая команда терминала');
                const run = () => { if (cmd.value.trim()) { handleCommand(cmd.value); cmd.value = ''; } };
                cmd.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
                admBody.appendChild(admRow(cmd, admBtn('RUN', run)));
                admBody.appendChild(admRow(
                    admBtn('СПАТИ ' + (isSpatiEnabled ? 'ВЫКЛ' : 'ВКЛ'), () => { isSpatiEnabled = !isSpatiEnabled; admRender(); admOut(`[ADMIN] Спати: ${isSpatiEnabled ? 'on' : 'off'}`); }),
                    admBtn('HACKER', () => { closeAdmin(); startHackerMode(); }),
                    admBtn('CLEAR', () => { terminalOutput.innerHTML = ''; })
                ));
                admBody.appendChild(admRow(
                    admBtn('CRASH', () => { closeAdmin(); triggerSystemCrash(); }, 'danger'),
                    admBtn('OFF', () => { closeAdmin(); isBooted = true; triggerPowerOff(); }, 'danger'),
                    admBtn('ГЛИТЧ', () => { glitchLine.classList.add('glitch-active'); setTimeout(() => glitchLine.classList.remove('glitch-active'), 300); })
                ));
            } else if (admTab === 'color') {
                const grid = elem('div', 'adm-chips');
                Object.keys(colorPalette).forEach(n => {
                    const b = admBtn(n, () => admApplyColor(n), 'small');
                    b.style.color = colorPalette[n].color;
                    grid.appendChild(b);
                });
                admBody.appendChild(grid);
                admBody.appendChild(admRow(admBtn('СБРОС ЦВЕТА', () => admApplyColor(null))));
                admBody.appendChild(elem('div', 'adm-note', 'Админ-смена цвета не засчитывается в достижения.'));
            } else if (admTab === 'audio') {
                admBody.appendChild(admRow(
                    admBtn('PLAY', () => { bgAudio.play().then(() => { audioStarted = true; updatePlayButtonState(); }).catch(() => {}); }),
                    admBtn('PAUSE', () => { bgAudio.pause(); updatePlayButtonState(); }),
                    admBtn('MUTE', () => { bgAudio.muted = !bgAudio.muted; if (btnMute) btnMute.textContent = bgAudio.muted ? 'MUTED' : 'VOL'; })
                ));
                const vol = admInput('range', bgAudio.volume);
                vol.min = 0; vol.max = 1; vol.step = 0.01; vol.className = 'custom-slider';
                vol.addEventListener('input', () => { bgAudio.volume = parseFloat(vol.value); if (volumeBar) volumeBar.value = vol.value; });
                admBody.appendChild(admRow(elem('span', 'adm-label', 'ГРОМКОСТЬ'), vol));
                const chips = elem('div', 'adm-chips');
                playlist.forEach((t, i) => chips.appendChild(admBtn(`${i + 1}. ${t.title}`, () => { loadTrack(i); bgAudio.play().catch(() => {}); updatePlayButtonState(); }, 'small')));
                admBody.appendChild(chips);
            } else if (admTab === 'data') {
                const area = document.createElement('textarea');
                area.className = 'adm-input adm-area'; area.spellcheck = false;
                area.value = JSON.stringify(state, null, 1);
                admBody.appendChild(area);
                admBody.appendChild(admRow(
                    admBtn('ЭКСПОРТ', () => { area.value = JSON.stringify(state); area.select(); }),
                    admBtn('ИМПОРТ', () => {
                        try {
                            const data = JSON.parse(area.value);
                            if (!data || typeof data !== 'object') throw new Error('bad');
                            localStorage.setItem(STORE_KEY, JSON.stringify(data));
                            location.reload();
                        } catch (err) { admOut('[ADMIN] ошибка импорта: неверный JSON'); }
                    }),
                    admBtn('ПОЛНЫЙ СБРОС', () => {
                        if (!confirm('Стереть все данные Spatium OS?')) return;
                        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
                        location.reload();
                    }, 'danger')
                ));
                const pw = admInput('text', '', 'новый пароль -> хэш для ADMIN_HASH');
                const hashOut = elem('div', 'adm-note', '');
                pw.addEventListener('input', () => { hashOut.textContent = pw.value ? hash53(pw.value) : ''; });
                admBody.appendChild(admRow(pw));
                admBody.appendChild(hashOut);
            }
        }

        function closeAdmin() {
            admOpen = false;
            if (admWin) admWin.classList.add('hidden');
        }

        function openAdmin() {
            if (!admWin) {
                admWin = elem('div', 'ach-window adm-window hidden');
                const head = elem('div', 'player-header');
                head.appendChild(elem('span', 'player-title', 'ADMIN // ROOT'));
                const x = elem('button', 'player-close-btn', '[X]');
                x.type = 'button';
                x.addEventListener('click', (e) => { e.stopPropagation(); closeAdmin(); });
                head.appendChild(x);
                admBody = elem('div', 'ach-body');
                admWin.append(head, admBody);
                admWin.addEventListener('click', (e) => e.stopPropagation());
                screen.appendChild(admWin);
            }
            admOpen = true;
            admWin.classList.remove('hidden');
            if (hiddenInput) hiddenInput.blur();
            admRender();
        }

        // Невидимая для перечисления глобальная функция: spatiumAdmin('пароль')
        Object.defineProperty(window, 'spatiumAdmin', {
            enumerable: false, configurable: true,
            value: function (pass) {
                if (admFails >= 3) return;
                if (hash53(String(pass)) !== ADMIN_HASH) { admFails++; return; }
                admFails = 0;
                openAdmin();
                return 'ACCESS GRANTED';
            }
        });

        // ==========================================
        // ДОЖДЬ МАТРИЦЫ, СКРИНСЕЙВЕР, ЗВУК КЛАВИШ
        // ==========================================
        const MX_CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>|'.split('');
        const MX_FONT = '"IBM Plex Mono", "MS Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans Mono CJK JP", monospace';
        const MX_IDLE_MS = 60000;   // скринсейвер после минуты бездействия
        const MX_STEP_MS = 45;      // шаг анимации (~22 кадра/с, как в фильме)
        let matrixActive = false, matrixMode = 'cmd', matrixGuardUntil = 0, matrixWokeAt = 0;
        let matrixLastActivity = Date.now();
        let mxCanvas = null, mxCtx = null, mxHint = null, mxRaf = 0, mxHideTimer = 0, mxLastTs = 0, mxFrame = 0;
        let mxW = 0, mxH = 0, mxSize = 16, mxCols = 0, mxDrops = [], mxSpeed = [], mxLast = [], mxMouse = null;
        let mxColor = '#33ff33', mxHead = '#ccffcc';

        function mxEnsure() {
            if (mxCanvas) return;
            mxCanvas = document.createElement('canvas');
            mxCanvas.className = 'matrix-canvas';
            mxCanvas.setAttribute('aria-hidden', 'true');
            mxHint = document.createElement('div');
            mxHint.className = 'matrix-hint';
            mxHint.textContent = 'ЛЮБАЯ КЛАВИША ИЛИ КАСАНИЕ — ВЫХОД';
            const overlay = screen.querySelector('.crt-overlay');
            screen.insertBefore(mxCanvas, overlay);
            screen.insertBefore(mxHint, overlay);
            mxCtx = mxCanvas.getContext('2d');
        }

        // Цвет берём из текущей темы терминала, голова капли - почти белая
        function mxReadColor() {
            const v = getComputedStyle(screen).getPropertyValue('--crt-color').trim();
            const rgb = /^#[0-9a-f]{6}$/i.test(v) ? hexToRgb(v) : [51, 255, 51];
            mxColor = `rgb(${rgb.join(',')})`;
            mxHead = `rgb(${rgb.map(x => Math.round(x + (255 - x) * 0.8)).join(',')})`;
        }

        function mxResize() {
            if (!mxCanvas) return;
            const w = screen.clientWidth, h = screen.clientHeight;
            if (!w || !h || (w === mxW && h === mxH && mxCols)) return;
            mxW = w; mxH = h;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            mxSize = w < 600 ? 14 : 16;
            mxCanvas.width = Math.round(w * dpr);
            mxCanvas.height = Math.round(h * dpr);
            mxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            mxCtx.fillStyle = '#000';
            mxCtx.fillRect(0, 0, w, h);
            mxCols = Math.ceil(w / mxSize);
            const rows = Math.ceil(h / mxSize);
            mxDrops = []; mxSpeed = []; mxLast = [];
            for (let i = 0; i < mxCols; i++) {
                mxDrops.push(-Math.floor(Math.random() * rows));
                mxSpeed.push(Math.random() < 0.35 ? 2 : 1);
                mxLast.push('');
            }
        }

        function mxTick() {
            const c = mxCtx, size = mxSize;
            c.fillStyle = 'rgba(0,0,0,0.09)';
            c.fillRect(0, 0, mxW, mxH);
            c.font = `${size}px ${MX_FONT}`;
            c.textAlign = 'center';
            c.textBaseline = 'top';
            mxFrame++;
            if (mxFrame % 120 === 0) mxReadColor();
            const glow = mxCols <= 140;
            for (let i = 0; i < mxCols; i++) {
                if (mxFrame % mxSpeed[i] !== 0) continue;
                const y = mxDrops[i];
                const x = i * size + size / 2;
                if (y >= 0) {
                    if (y >= 1 && mxLast[i]) {
                        const py = (y - 1) * size;
                        c.shadowBlur = 0;
                        c.fillStyle = '#000';
                        c.fillRect(i * size, py, size, size);
                        c.fillStyle = mxColor;
                        c.fillText(mxLast[i], x, py);
                    }
                    const ch = MX_CHARS[(Math.random() * MX_CHARS.length) | 0];
                    mxLast[i] = ch;
                    if (glow) { c.shadowColor = mxColor; c.shadowBlur = 8; }
                    c.fillStyle = mxHead;
                    c.fillText(ch, x, y * size);
                    c.shadowBlur = 0;
                }
                if (y * size > mxH && Math.random() > 0.975) { mxDrops[i] = 0; mxLast[i] = ''; }
                else mxDrops[i] = y + 1;
            }
        }

        function mxLoop(ts) {
            mxRaf = requestAnimationFrame(mxLoop);
            if (ts - mxLastTs < MX_STEP_MS) return;
            mxLastTs = ts;
            mxTick();
        }

        function startMatrix(mode) {
            if (matrixActive || !isBooted) return;
            mxEnsure();
            mxReadColor();
            clearTimeout(mxHideTimer);
            mxCanvas.style.display = 'block';
            mxW = 0; mxH = 0; mxCols = 0;
            mxResize();
            matrixActive = true;
            matrixMode = mode;
            matrixGuardUntil = Date.now() + (mode === 'cmd' ? 700 : 900);
            mxMouse = null;
            void mxCanvas.offsetWidth;
            mxCanvas.classList.add('on');
            screen.classList.add('matrix-on');
            mxHint.classList.remove('show');
            if (mode === 'cmd') { void mxHint.offsetWidth; mxHint.classList.add('show'); }
            if (hiddenInput) hiddenInput.blur();
            cancelAnimationFrame(mxRaf);
            mxLastTs = 0;
            mxRaf = requestAnimationFrame(mxLoop);
        }

        function stopMatrix() {
            if (!matrixActive) return;
            const mode = matrixMode;
            matrixActive = false;
            matrixWokeAt = Date.now();
            matrixLastActivity = matrixWokeAt;
            spatiActivity = matrixWokeAt;
            mxCanvas.classList.remove('on');
            mxHint.classList.remove('show');
            screen.classList.remove('matrix-on');
            clearTimeout(mxHideTimer);
            mxHideTimer = setTimeout(() => {
                if (matrixActive) return;
                cancelAnimationFrame(mxRaf);
                mxCanvas.style.display = 'none';
            }, 400);
            if (mode === 'cmd') printTextInstant('>>> MATRIX ОТКЛЮЧЁН <<<');
            unlock(mode === 'cmd' ? 'matrix' : 'screensaver');
            if (isBooted && hiddenInput && !isTyping) hiddenInput.focus();
        }

        window.addEventListener('resize', () => { if (matrixActive) mxResize(); });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (matrixActive) mxResize(); });
        document.addEventListener('visibilitychange', () => { matrixLastActivity = Date.now(); });

        // Любое действие: звук, учёт бездействия, выход из дождя (первое нажатие "съедается")
        ['keydown', 'pointerdown', 'touchstart', 'wheel'].forEach(ev => {
            window.addEventListener(ev, (e) => {
                if (sfxBootPending) sfxLateBoot();
                else if (sfxCtx && sfxCtx.state === 'suspended') sfxResume(sfxCtx);
                matrixLastActivity = Date.now();
                if (matrixActive) {
                    e.stopPropagation();
                    if (ev === 'keydown') {
                        const system = e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key);
                        if (!system) e.preventDefault();
                    }
                    if (Date.now() >= matrixGuardUntil) stopMatrix();
                    return;
                }
                if (ev === 'keydown' && isBooted && !e.ctrlKey && !e.metaKey && !e.altKey
                    && !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key) && !/^F\d+$/.test(e.key)) {
                    const sfxKind = { Enter: 'send', Tab: 'tab', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
                    if (sfxKind && !isTyping && (e.target === hiddenInput || e.target === document.body)) sfxKey(sfxKind);
                }
            }, { capture: true, passive: false });
        });

        window.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (!matrixActive) { matrixLastActivity = now; return; }
            if (matrixMode !== 'saver' || now < matrixGuardUntil) return;
            if (!mxMouse) { mxMouse = { x: e.clientX, y: e.clientY }; return; }
            if (Math.abs(e.clientX - mxMouse.x) + Math.abs(e.clientY - mxMouse.y) > 8) stopMatrix();
        }, { capture: true, passive: true });

        // Клик, завершающий нажатие, которое разбудило экран, не должен ничего делать
        window.addEventListener('click', (e) => {
            if (matrixActive || Date.now() - matrixWokeAt < 350) { e.stopPropagation(); e.preventDefault(); }
        }, true);

        // Мобильные клавиатуры: если keydown не пришёл (key = Unidentified), щёлкаем по input
        if (hiddenInput) {
            hiddenInput.addEventListener('input', (e) => {
                if (matrixActive || Date.now() - matrixWokeAt < 200) {
                    e.stopImmediatePropagation();
                    hiddenInput.value = currentInput;
                    return;
                }
            }, true);
        }

        // Скринсейвер
        setInterval(() => {
            if (matrixActive) return;
            const now = Date.now();
            if (!isBooted || document.hidden || admOpen || isHackerMode || isTyping
                || screen.classList.contains('crt-off') || terminalContainer.classList.contains('hidden')) {
                matrixLastActivity = now;
                return;
            }
            if (now - matrixLastActivity >= MX_IDLE_MS) startMatrix('saver');
        }, 1000);

        consoleCommands.matrix = function () {
            printTextInstant('Просыпайся, Нео... Любая клавиша — выход.');
            startMatrix('cmd');
        };
        consoleCommands.sfx = function (args) {
            const a = (args[0] || '').toLowerCase();
            if (a === 'on' || a === 'вкл') sfxEnabled = true;
            else if (a === 'off' || a === 'выкл') sfxEnabled = false;
            else sfxEnabled = !sfxEnabled;
            try { localStorage.setItem(SFX_KEY, sfxEnabled ? '1' : '0'); } catch (err) { /* ignore */ }
            printTextInstant(sfxEnabled ? 'ЗВУКИ СИСТЕМЫ: ВКЛ' : 'ЗВУКИ СИСТЕМЫ: ВЫКЛ');
            if (sfxEnabled && sfxMuted()) printTextInstant('(общий звук отключён командой mute)');
            if (sfxEnabled) sfxKey('send');
        };

        // ==========================================
        // ЗМЕЙКА (SNAKE.EXE)
        // ==========================================
        (function initSnake() {
            const win = document.getElementById('snakeWindow');
            if (!win) return;
            const G = 20, C = 16;
            const cv = document.getElementById('skCanvas'), cx = cv.getContext('2d');
            const elScore = document.getElementById('skScore'), elBest = document.getElementById('skBest'), elLen = document.getElementById('skLen');
            const btnGo = document.getElementById('skStart'), btnMode = document.getElementById('skMode');
            const sk = state.stats.snake;
            const IDS = ACHIEVEMENTS.filter(a => a.cat === 'ЗМЕЙКА' && a.id !== 'snake_all').map(a => a.id);
            const sUn = (id) => { unlock(id); if (IDS.every(i => state.ach[i])) unlock('snake_all'); };
            SECRET_HINTS.snake_13 = 'Закончи партию в змейке ровно с 13 очками';
            TAB_COMMANDS.push('snake');
            SECRET_HINTS.spati_snake = 'Скажи: «спати змейка» или «спати запусти змейку»';

            // Спати комментирует игру (если он включён): в окне змейки и в терминале
            const elSpati = document.getElementById('skSpati');
            let sayAt = 0;
            function say(pool, force) {
                if (!isSpatiEnabled || !elSpati) return;
                const now = Date.now();
                if (!force && now - sayAt < 5000) return;
                sayAt = now;
                const text = spatiPick(pool);
                elSpati.textContent = text;
                printTextInstant(text);
            }
            const S_OPEN = ["СПАТИ: Змейка? Только не кусай себя", "СПАТИ: Играй. Я буду болеть молча",
                () => sk.best ? `СПАТИ: Рекорд ${sk.best}. Попробуешь побить?` : "СПАТИ: Первая партия? Не страшно, врезаются все"];
            const S_SULK = ["СПАТИ: Играй сам. Я всё ещё обижен"];
            const S_LOW = ["СПАТИ: Быстро. Я даже моргнуть не успел", "СПАТИ: Разминка засчитана", "СПАТИ: Бывает. Яблоки никуда не денутся"];
            const S_MID = ["СПАТИ: Неплохо. Ещё разок?", "СПАТИ: Нормально. Хвост не жалко?", "СПАТИ: Достойно. Но можно длиннее"];
            const S_HIGH = ["СПАТИ: Вот это длина! Уважаю", "СПАТИ: Змея стала питоном. Достойно", "СПАТИ: Процессор впечатлён"];
            const S_WALL = ["СПАТИ: Стена не двигается. Проверено", "СПАТИ: Лбом о стену — классика"];
            const S_SELF = ["СПАТИ: Ты укусил себя. Типично для змей", "СПАТИ: Хвост оказался быстрее"];
            const S_REC = [() => `СПАТИ: Новый рекорд — ${score}! Записал в лог золотыми буквами`, () => `СПАТИ: ${score}! Такого в моей базе ещё не было`];
            const S_13 = ["СПАТИ: Тринадцать. Не к добру"];
            const S_BONUS = ["СПАТИ: Золотое! Жадность — двигатель прогресса", "СПАТИ: Блестит. Правильно взял"];
            const S_MILE = { 10: "СПАТИ: Десять! Процессор вспотел", 25: "СПАТИ: Двадцать пять. Ты точно не бот?", 50: "СПАТИ: Полтинник! Я в шоке", 100: "СПАТИ: Сто. Снимаю виртуальную шляпу" };

            const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
            const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
            let isOpen = false, phase = 'idle', timer = 0, wrap = !!sk.wrap, newRecord = false;
            let snake, dir, queue, food, bonus, score, apples, eatTimes;

            const beep = (o) => { const c = sfxReady(); if (c) sfxTone(c.currentTime + 0.001, o); };
            const delay = () => Math.max(65, 140 - score * 1.5);

            function spot() {
                for (let i = 0; i < 400; i++) {
                    const x = rnd(0, G - 1), y = rnd(0, G - 1);
                    if (snake.some(s => s.x === x && s.y === y)) continue;
                    if ((food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y)) continue;
                    return { x, y };
                }
                return null;
            }

            function reset() {
                clearTimeout(timer);
                if (elSpati) elSpati.textContent = '';
                snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
                dir = 'right'; queue = []; score = 0; apples = 0; eatTimes = []; bonus = null; food = null; newRecord = false;
                food = spot(); phase = 'idle';
                draw();
            }

            function run() { phase = 'run'; draw(); clearTimeout(timer); timer = setTimeout(step, delay()); }

            function toggle() {
                if (phase === 'run') { phase = 'pause'; clearTimeout(timer); sUn('snake_pause'); draw(); }
                else if (phase === 'over') { reset(); run(); }
                else run();
            }

            function turn(d, swipe) {
                if (phase === 'over') return;
                const last = queue.length ? queue[queue.length - 1] : dir;
                const opp = DIRS[d][0] + DIRS[last][0] === 0 && DIRS[d][1] + DIRS[last][1] === 0;
                if (d !== last && !opp && queue.length < 2) { queue.push(d); if (swipe) sUn('snake_swipe'); }
                if (phase !== 'run') run();
            }

            function eat(isBonus) {
                const now = Date.now(), before = score;
                apples++; sk.apples++;
                if (isBonus) { score += 3; sk.bonus++; bonus = null; sUn('snake_bonus'); if (sk.bonus >= 5) sUn('snake_bonus5'); }
                else { score++; food = spot(); if (apples % 5 === 0 && !bonus) { const p = spot(); if (p) bonus = { x: p.x, y: p.y, ttl: 45 }; } }
                beep(isBonus ? { type: 'square', f0: 880, f1: 1320, dur: 0.12, gain: 0.06 } : { type: 'square', f0: 520, f1: 780, dur: 0.06, gain: 0.05 });
                sUn('snake_first');
                if (score >= 10) sUn('snake_10');
                if (score >= 25) sUn('snake_25');
                if (score >= 50) sUn('snake_50');
                if (score >= 100) sUn('snake_100');
                if (wrap && score >= 30) sUn('snake_nowall');
                if (sk.apples >= 200) sUn('snake_total200');
                if (sk.apples >= 1000) sUn('snake_total1000');
                if (isBonus) say(S_BONUS);
                [10, 25, 50, 100].forEach(m => { if (before < m && score >= m) say([S_MILE[m]], true); });
                eatTimes.push(now); if (eatTimes.length > 3) eatTimes.shift();
                if (eatTimes.length === 3 && now - eatTimes[0] <= 5000) sUn('snake_quick');
                saveState();
            }

            function step() {
                if (phase !== 'run') return;
                dir = queue.length ? queue.shift() : dir;
                const h = snake[0];
                let nx = h.x + DIRS[dir][0], ny = h.y + DIRS[dir][1], wrapped = false;
                if (nx < 0 || nx >= G || ny < 0 || ny >= G) {
                    if (!wrap) return finish('wall');
                    nx = (nx + G) % G; ny = (ny + G) % G; wrapped = true;
                }
                const eatF = food && nx === food.x && ny === food.y;
                const eatB = bonus && nx === bonus.x && ny === bonus.y;
                if ((eatF || eatB ? snake : snake.slice(0, -1)).some(s => s.x === nx && s.y === ny)) return finish('self');
                snake.unshift({ x: nx, y: ny });
                if (wrapped) sUn('snake_wrap');
                if (eatF || eatB) eat(!!eatB); else snake.pop();
                if (bonus && --bonus.ttl <= 0) bonus = null;
                if (!food) return finish('full');
                draw();
                timer = setTimeout(step, delay());
            }

            function finish(reason) {
                phase = 'over'; clearTimeout(timer);
                sk.games++;
                if (score > sk.best) { sk.best = score; newRecord = score > 0; }
                saveState();
                beep({ type: 'sawtooth', f0: 320, f1: 60, dur: 0.4, gain: 0.07, lp: [1400, 150] });
                screen.classList.remove('shake'); void screen.offsetWidth; screen.classList.add('shake');
                if (reason === 'wall') sUn('snake_wall');
                if (reason === 'self') sUn('snake_self');
                if (score === 13) sUn('snake_13');
                if (sk.games >= 5) sUn('snake_games5');
                if (sk.games >= 25) sUn('snake_games25');
                const base = score < 5 ? S_LOW : score < 20 ? S_MID : S_HIGH;
                say(newRecord ? S_REC : score === 13 ? S_13 : base.concat(reason === 'self' ? S_SELF : reason === 'wall' ? S_WALL : []), true);
                if (newRecord) { spatiMood = spatiClamp(spatiMood + 1); spatiMoodAt = Date.now(); }
                draw();
            }

            function draw() {
                const col = getComputedStyle(win).getPropertyValue('--crt-color').trim() || '#33ff33';
                cx.clearRect(0, 0, 320, 320);
                cx.globalAlpha = 0.14; cx.fillStyle = col;
                for (let x = 0; x < G; x++) for (let y = 0; y < G; y++) cx.fillRect(x * C + 7, y * C + 7, 2, 2);
                const n = snake.length;
                snake.forEach((s, i) => {
                    cx.globalAlpha = 0.5 + 0.5 * (1 - i / n);
                    cx.shadowColor = col; cx.shadowBlur = i === 0 ? 10 : 0;
                    cx.fillStyle = col;
                    cx.fillRect(s.x * C + 1, s.y * C + 1, C - 2, C - 2);
                });
                cx.shadowBlur = 0; cx.globalAlpha = 1;
                if (food) { cx.fillStyle = '#fff'; cx.shadowColor = '#fff'; cx.shadowBlur = 8; cx.fillRect(food.x * C + 4, food.y * C + 4, C - 8, C - 8); }
                if (bonus && (bonus.ttl > 14 || bonus.ttl % 4 < 2)) {
                    cx.fillStyle = '#ffb627'; cx.shadowColor = '#ffb627'; cx.shadowBlur = 12;
                    cx.fillRect(bonus.x * C + 2, bonus.y * C + 2, C - 4, C - 4);
                    cx.fillStyle = '#000'; cx.shadowBlur = 0; cx.fillRect(bonus.x * C + 6, bonus.y * C + 6, C - 12, C - 12);
                }
                cx.shadowBlur = 0;
                if (phase !== 'run') {
                    cx.fillStyle = 'rgba(0,0,0,.65)'; cx.fillRect(0, 0, 320, 320);
                    const t = phase === 'idle' ? ['SNAKE', '', 'ПРОБЕЛ ИЛИ ТАП', 'ДЛЯ СТАРТА']
                        : phase === 'pause' ? ['ПАУЗА']
                        : ['ИГРА ОКОНЧЕНА', '', `СЧЁТ ${score}`].concat(newRecord ? ['', 'НОВЫЙ РЕКОРД!'] : []);
                    cx.fillStyle = col; cx.textAlign = 'center'; cx.font = '11px "Press Start 2P", monospace';
                    t.forEach((l, i) => cx.fillText(l, 160, 160 - (t.length - 1) * 12 + i * 24));
                }
                elScore.textContent = score; elBest.textContent = Math.max(sk.best, score); elLen.textContent = snake.length;
                btnGo.textContent = { idle: 'СТАРТ', run: 'ПАУЗА', pause: 'ДАЛЬШЕ', over: 'ЗАНОВО' }[phase];
                btnMode.textContent = wrap ? 'ПОРТАЛЫ' : 'СТЕНЫ';
            }

            function open() {
                if (!isBooted) return;
                isOpen = true; win.classList.remove('hidden');
                if (hiddenInput) hiddenInput.blur();
                reset(); sUn('snake_start');
                say(spatiMood <= -2 ? S_SULK : S_OPEN, true);
            }
            function close() {
                if (!isOpen) return;
                isOpen = false; clearTimeout(timer); phase = 'idle'; win.classList.add('hidden');
                if (isBooted && hiddenInput && window.matchMedia('(pointer: fine)').matches) hiddenInput.focus();
            }

            // ввод: пока змейка открыта, клавиатура принадлежит ей, а не терминалу
            window.addEventListener('keydown', (e) => {
                if (!isOpen || e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return;
                e.stopPropagation();
                if (e.key === 'Escape') { e.preventDefault(); close(); return; }
                if (e.repeat) { e.preventDefault(); return; }
                if (KEYS[e.code]) { e.preventDefault(); turn(KEYS[e.code]); }
                else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyP') { e.preventDefault(); toggle(); }
            }, true);

            win.addEventListener('click', (e) => e.stopPropagation());
            document.getElementById('snakeCloseBtn').addEventListener('click', (e) => { e.stopPropagation(); close(); });
            btnGo.addEventListener('click', () => { toggle(); btnGo.blur(); });
            btnMode.addEventListener('click', () => {
                btnMode.blur();
                if (phase === 'run' || phase === 'pause') return;
                wrap = !wrap; sk.wrap = wrap; saveState(); reset();
            });
            document.getElementById('skPad').addEventListener('pointerdown', (e) => {
                const b = e.target.closest('button');
                if (!b) return;
                e.preventDefault(); turn(b.dataset.d);
            });
            let p0 = null;
            cv.addEventListener('pointerdown', (e) => { p0 = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
            cv.addEventListener('pointerup', (e) => {
                if (!p0) return;
                const dx = e.clientX - p0.x, dy = e.clientY - p0.y;
                p0 = null;
                if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { toggle(); return; }
                turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'), e.pointerType !== 'mouse');
            });
            cv.addEventListener('pointercancel', () => { p0 = null; });

            snakeApi = { open, close };

            consoleCommands.snake = function (args) {
                if ((args[0] || '').toLowerCase() === 'best') {
                    printTextInstant(`ЗМЕЙКА: РЕКОРД ${sk.best} · ПАРТИЙ ${sk.games} · ЯБЛОК ${sk.apples}`);
                    return;
                }
                open();
                printTextInstant('SNAKE.EXE ЗАПУЩЕН. Стрелки/WASD, пробел — пауза, Esc — выход. (snake best — статистика)');
            };
        })();

        // ==========================================
        // ЭКСПОРТ / ИМПОРТ ПРОГРЕССА ФАЙЛОМ
        // ==========================================
        (function initSaveIO() {
            const FILE_APP = 'spatium-os';
            TAB_COMMANDS.push('export', 'import');

            function notice(text) {
                printTextInstant(text);
                const n = elem('div', 'io-note', text);
                screen.appendChild(n);
                setTimeout(() => n.remove(), 4200);
            }

            function exportProgress() {
                const data = { app: FILE_APP, v: 1, exported: new Date().toISOString(), state, spati: { name: spatiMem.name || '' }, sfx: sfxEnabled };
                const name = `spatium-save-${new Date().toISOString().slice(0, 10)}.json`;
                const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url; a.download = name; a.style.display = 'none';
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                unlock('save_export');
                notice(`ПРОГРЕСС СОХРАНЁН В ФАЙЛ: ${name}`);
            }

            function applyImport(text) {
                let obj;
                try { obj = JSON.parse(text); } catch (err) { notice('ОШИБКА: это не JSON-файл'); return; }
                if (!obj || obj.app !== FILE_APP || !obj.state || typeof obj.state !== 'object' || Array.isArray(obj.state)) {
                    notice('ОШИБКА: это не файл сохранения Spatium OS');
                    return;
                }
                const s = obj.state, st = s.stats && typeof s.stats === 'object' ? s.stats : {};
                const got = Object.keys(s.ach || {}).filter(id => achById[id]).length;
                const best = Number(st.snake && st.snake.best) || 0;
                if (!confirm(`Загрузить прогресс из файла?\n\nДостижений: ${got}/${ACHIEVEMENTS.length}\nКоманд: ${Number(st.cmds) || 0}\nРекорд змейки: ${best}\n\nТекущий прогресс будет заменён.`)) {
                    notice('ИМПОРТ ОТМЕНЁН.');
                    return;
                }
                s.ach = Object.assign({}, s.ach);
                s.shown = Object.assign({}, s.shown);
                s.ach.save_import = Date.now();   // тост покажется после перезагрузки
                s.shown.save_import = false;
                saveLocked = true;
                try {
                    localStorage.setItem(STORE_KEY, JSON.stringify(s));
                    if (obj.spati && typeof obj.spati.name === 'string') localStorage.setItem(SPATI_KEY, JSON.stringify({ name: obj.spati.name.slice(0, 16) }));
                    if (typeof obj.sfx === 'boolean') localStorage.setItem(SFX_KEY, obj.sfx ? '1' : '0');
                } catch (err) {
                    saveLocked = false;
                    notice('ОШИБКА: не удалось записать данные (хранилище недоступно)');
                    return;
                }
                notice('ПРОГРЕСС ЗАГРУЖЕН. ПЕРЕЗАГРУЗКА...');
                isBooted = false;
                setTimeout(() => {
                    screen.classList.add('crt-off');
                    sfxOff();
                    setTimeout(() => window.location.reload(), 800);
                }, 900);
            }

            const picker = document.createElement('input');
            picker.type = 'file'; picker.accept = '.json,application/json'; picker.style.display = 'none';
            picker.addEventListener('click', (e) => e.stopPropagation());
            picker.addEventListener('change', () => {
                const f = picker.files && picker.files[0];
                if (!f) return;
                if (f.size > 2e6) { notice('ОШИБКА: файл слишком большой'); return; }
                const r = new FileReader();
                r.onload = () => applyImport(String(r.result));
                r.onerror = () => notice('ОШИБКА: не удалось прочитать файл');
                r.readAsText(f);
            });
            document.body.appendChild(picker);

            consoleCommands.export = function () { exportProgress(); };
            consoleCommands.save = consoleCommands.export;
            consoleCommands.import = function () {
                printTextInstant('Выберите файл сохранения (.json)...');
                picker.value = '';
                picker.click();
            };
        })();

        scheduleGlitch();
    });
})();