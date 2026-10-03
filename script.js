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
        let nickMode = null; // null | 'first' | 'rename': ввод идёт в никнейм, а не в команды
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
            return { nick: '', ach: {}, shown: {}, history: [], stats: { visits: 0, colors: [], tracks: [], spatiTalks: 0, cmds: 0, first: 0, snake: { best: 0, games: 0, apples: 0, bonus: 0, wrap: false, obst: false, speed: false, skin: 'theme', head: 'square', top: [], last: null } } };
        }

        function loadState() {
            const st = freshState();
            try {
                const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
                if (saved && typeof saved === 'object') {
                    if (saved.ach && typeof saved.ach === 'object') st.ach = saved.ach;
                    if (saved.shown && typeof saved.shown === 'object') st.shown = saved.shown;
                    if (typeof saved.nick === 'string' && /^[\p{L}\p{N}][\p{L}\p{N}_.\- ]{1,15}$/u.test(saved.nick)) st.nick = saved.nick;
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
            { id: 'afk_back', cat: 'СПАТИ', icon: 'ghost', title: 'ДОЛГО ТЫ', desc: 'Вернись к Спати после минуты отсутствия', hidden: true, rarity: 'rare' },
            { id: 'afk_long', cat: 'СПАТИ', icon: 'hourglass', title: 'ПРОПАЩИЙ', desc: 'Оставь Спати одного больше чем на 10 минут', hidden: true, rarity: 'epic' },
            { id: 'spati_cmd5', cat: 'СПАТИ', icon: 'prompt', title: 'ПО ПРОСЬБЕ', desc: 'Выполни 5 команд через Спати', rarity: 'rare' },
            { id: 'spati_cmd25', cat: 'СПАТИ', icon: 'gear', title: 'ДИСПЕТЧЕР', desc: 'Выполни 25 команд через Спати', rarity: 'epic' },
            { id: 'sm_high5', cat: 'СПАТИ', icon: 'star', title: 'ДАЙ ПЯТЬ', desc: 'Быстро тапни по Спати два раза подряд', rarity: 'common' },
            { id: 'sm_feed5', cat: 'СПАТИ', icon: 'apple', title: 'КОРМИЛЕЦ', desc: 'Скорми Спати 5 яблок', rarity: 'rare' },
            { id: 'sm_feed25', cat: 'СПАТИ', icon: 'heart', title: 'ЯБЛОЧНЫЙ ДРУГ', desc: 'Скорми Спати 25 яблок', rarity: 'epic' },
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
            { id: 'snake_skin', cat: 'ЗМЕЙКА', icon: 'diamond', title: 'ПЕРЕОДЕВАНИЕ', desc: 'Смени скин или форму головы змейки', rarity: 'common' },
            { id: 'snake_lvl5', cat: 'ЗМЕЙКА', icon: 'flag', title: 'ГЛУБОКИЙ УРОВЕНЬ', desc: 'Дойди до 5 уровня в режиме БЛОКИ', rarity: 'rare' },
            { id: 'snake_turbo', cat: 'ЗМЕЙКА', icon: 'bolt', title: 'ТУРБОЗМЕЯ', desc: 'Набери 15 очков в режиме УСКОРЕНИЕ', rarity: 'rare' },
            { id: 'spati_snake', cat: 'СПАТИ', icon: 'ghost', title: 'ТРЕНЕР', desc: 'Поговори со Спати о змейке', hidden: true, rarity: 'common' },
            { id: 'save_export', cat: 'СИСТЕМА', icon: 'disk', title: 'РЕЗЕРВНАЯ КОПИЯ', desc: 'Сохрани прогресс в файл', rarity: 'common' },
            { id: 'save_import', cat: 'СИСТЕМА', icon: 'arrow', title: 'ВОСКРЕШЕНИЕ', desc: 'Загрузи прогресс из файла', rarity: 'rare' },
            { id: 'win_drag', cat: 'СИСТЕМА', icon: 'cursor', title: 'ПЕРЕСТАНОВКА', desc: 'Перетащи любое окно за заголовок', rarity: 'common' },
            { id: 'multiwin', cat: 'СИСТЕМА', icon: 'gear', title: 'МНОГОЗАДАЧНОСТЬ', desc: 'Держи открытыми плеер, достижения и змейку одновременно', rarity: 'rare' },
            { id: 'share_card', cat: 'СИСТЕМА', icon: 'trophy', title: 'ПОХВАСТАТЬСЯ', desc: 'Создай карточку прогресса командой card', rarity: 'common' },
            { id: 'share_send', cat: 'СИСТЕМА', icon: 'star', title: 'ДЕЛИМСЯ', desc: 'Скачай, скопируй или отправь карточку прогресса', rarity: 'rare' },
            { id: 'nick_set', cat: 'СИСТЕМА', icon: 'prompt', title: 'ЗНАКОМСТВО', desc: 'Создай никнейм', rarity: 'common' },
            { id: 'nick_change', cat: 'СИСТЕМА', icon: 'drop', title: 'НОВОЕ ИМЯ', desc: 'Смени никнейм', rarity: 'common' },
            { id: 'nick_fake', cat: 'СИСТЕМА', icon: 'ghost', title: 'САМОЗВАНЕЦ', desc: 'Попробуй назваться именем системы', hidden: true, rarity: 'rare' },
            { id: 'neofetch', cat: 'ТЕРМИНАЛ', icon: 'gear', title: 'ПАСПОРТ СИСТЕМЫ', desc: 'Запусти команду neofetch', rarity: 'common' }
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
            if (!deferToast) { enqueueToast(achById[id]); mascotEvent('ach'); }
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
        const achSessionStart = Date.now();
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
            if (state.nick) topText.appendChild(elem('div', 'ach-nick', state.nick));
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
            [['ЭКСПОРТ', 'export'], ['ИМПОРТ', 'import'], ['КАРТОЧКА', 'card']].forEach(([label, key]) => {
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
            // Спати комментирует достижение: наведи курсор (на телефоне — тапни)
            card.addEventListener('pointerenter', (e) => {
                if (e.pointerType && e.pointerType !== 'mouse') return;
                clearTimeout(card._smT);
                card._smT = setTimeout(() => mascotAchHover(a, false), 380);
            });
            card.addEventListener('pointerleave', () => clearTimeout(card._smT));
            card.addEventListener('click', () => mascotAchHover(a, true));
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
            mascotAchOpen();
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
            if (nickMode || !state.history.length) return;
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
            'off', 'play', 'pause', 'next', 'prev', 'tracks', 'vol', 'mute', 'player', 'sfx'];

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
            if (isTyping || isHackerMode || nickMode) return;
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
                            afterBoot();
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
                    e._submitEnter = true; // этот же Enter не должен сразу пропускать печать ответа
                    const commandToExecute = currentInput;
                    currentInput = '';
                    hiddenInput.value = '';
                    if (commandInputText) commandInputText.textContent = '';
                    if (commandToExecute.trim() !== '') {
                        if (nickMode) { handleNickInput(commandToExecute); return; }
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
            if (isTyping && currentTypingTimeout && !e._submitEnter && (e.key === 'Enter' || e.key === ' ')) {
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
  sfx      звуки клавиш вкл/выкл
  snake    мини-игра змейка
  export   сохранить прогресс в файл
  import   загрузить прогресс из файла
  card     карточка прогресса (картинка)
  neofetch сводка о системе
  nick     показать / сменить никнейм
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
Окна двигаются за заголовок (двойной клик - на место).`;

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
                unlock('color'); mascotEvent('color');
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
            setMascot(isSpatiEnabled);
            if (isSpatiEnabled) {
                unlock('spati');
                printTextTyped("[СПАТИ АКТИВИРОВАН]");
                // приветствие говорит сам маскот: пузырь + открывающийся рот
                setTimeout(() => {
                    if (!isSpatiEnabled) return;
                    mascotReact('wave', true);
                    mascotSay(spatiAfkText(spatiWakeLine()));
                }, 750);
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
        const SN = () => { const n = spatiMem.name || state.nick; return n ? ', ' + n : ''; };
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
            [/красн/, 'red'], [/зелен/, 'green'], [/янтар/, 'amber'], [/киберпанк/, 'cyberpunk'],
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
            purple: 'Фиолетовый. Загадочно', cyberpunk: 'Будущее уже здесь', blood: 'Мрачновато. Мне нравится'
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
        // Спати запускает команду терминала. quiet — без эха «> команда»
        function spatiRunReply(cmdline, quiet, say) {
            const first = cmdline.trim().split(/\s+/)[0].toLowerCase();
            if (first === 'спати') return 'СПАТИ: Сам себя вызывать не буду. Зациклюсь';
            const nm = state.stats.spatiCmds = (state.stats.spatiCmds || 0) + 1;
            saveState();
            if (nm >= 5) unlock('spati_cmd5');
            if (nm >= 25) unlock('spati_cmd25');
            const text = say ? `СПАТИ: ${say}` : spOne([`СПАТИ: Выполняю: ${cmdline}`, `СПАТИ: Запускаю ${first}. Секунду`, `СПАТИ: Есть, ${first}`]);
            return [text, () => handleCommand(cmdline, quiet)];
        }

        let snakeApi = null; // заполняется в initSnake
        const spatiActions = [
            (q) => {
                if (!/^(вернись|вернись на место|иди домой|лети домой|иди на место|на место|иди сюда|ко мне)$/.test(q)) return;
                mascotHome();
                return spOne(['СПАТИ: Лечу на место', 'СПАТИ: Возвращаюсь. Не скучай', 'СПАТИ: Есть, на место']);
            },
            // --- Спати выполняет команды терминала ---
            (q, raw) => {
                const m = raw.trim().match(/^(?:выполни(?:\s+команду)?|запусти\s+команду|введи(?:\s+команду)?|набери(?:\s+команду)?|команда|cmd|run|exec)\s+(.+)$/i);
                if (!m) return;
                return spatiRunReply(m[1].trim(), false);
            },
            (q, raw) => {
                const hasAny = (re) => re.test(q);
                const clearVerb = /очист|сотри|удал|забуд|стер|сброс/;
                const show = /(покажи|выведи|дай|открой|хочу|глянь|посмотреть|давай)/;
                let cmd = '', say = '';
                const echoM = raw.trim().match(/^(?:повтори|эхо|напиши в консоль|выведи в консоль|скажи в консоль)\s+(.+)$/i);
                if (echoM) { cmd = 'echo ' + echoM[1]; say = 'Пишу в консоль'; }
                else if (show.test(q) && /(палитр|список цвет|все цвета)/.test(q) || /какие (есть )?цвета/.test(q)) { cmd = 'color help'; say = 'Держи палитру'; }
                else if (show.test(q) && /истори/.test(q) && !clearVerb.test(q) && !/змейк/.test(q)) { cmd = 'history'; say = 'Вот что ты вводил'; }
                else if (/(список|перечень) достижен|достижени[а-я]* (текстом|списком)/.test(q)) { cmd = 'ach list'; say = 'Достижения списком'; }
                else if (/(звук[а-я]*|щелчк[а-я]*|клик[а-я]*) (клавиш|кнопок|нажатий|системы|терминала)|звуки клавиатуры/.test(q)) {
                    cmd = /(выключ|выруб|отключ|убери|заглуш)/.test(q) ? 'sfx off' : /(включ|вруб|верни|добавь)/.test(q) ? 'sfx on' : 'sfx';
                    say = 'Щёлкаю переключателем';
                }
                else if ((show.test(q) && /(информаци[а-я]* о системе|инфо о системе|систем[а-я]* (инфо|информаци)|сводк|neofetch|нефетч|характеристик)/.test(q)) || /что у тебя за система/.test(q)) { cmd = 'neofetch'; say = 'Вот моя анкета'; }
                else if (/(сохрани|экспортируй|выгрузи|скачай|сделай бэкап|сделай резервн\w*)/.test(q) && /(прогресс|сохранени|достижени|данные|бэкап)/.test(q) || /экспорт прогресса/.test(q)) { cmd = 'export'; say = 'Сохраняю прогресс в файл'; }
                else if (/(загрузи|импортируй|восстанови|верни)/.test(q) && /(прогресс|сохранени|бэкап|резервн)/.test(q) || /импорт прогресса/.test(q)) { cmd = 'import'; say = 'Открываю выбор файла'; }
                else if ((show.test(q) || /(сделай|создай)/.test(q)) && /(карточк|визитк)/.test(q) || /поделиться прогрессом/.test(q)) { cmd = 'card'; say = 'Рисую карточку прогресса'; }
                else if ((show.test(q) && /(треки|плейлист|список (треков|песен)|песни)/.test(q)) || /что в плейлисте|что сейчас играет|какой (сейчас )?трек/.test(q)) { cmd = 'tracks'; say = 'Вот плейлист'; }
                else if (/(топ|статистик\w*|таблиц[а-я]* рекордов|рекорды)/.test(q) && /змейк/.test(q)) { cmd = 'snake best'; say = 'Смотрю таблицу рекордов'; }
                else if (/(смени|поменяй|измени|переименуй|поставь)[а-я]* .*(ник|никнейм)/.test(q)) {
                    const nm = raw.trim().match(/\s(?:на|в)\s+["«]?(.+?)["»]?\s*$/i);
                    if (!nm) return 'СПАТИ: На что менять? Скажи: смени ник на Имя';
                    cmd = 'nick ' + nm[1]; say = 'Меняю ник';
                }
                else if (/(какой|как) (у меня |мой )?(ник|никнейм)|мой ник|покажи (мой )?ник/.test(q)) { cmd = 'nick'; say = 'Смотрю в базе'; }
                if (!cmd) return;
                return spatiRunReply(cmd, true, say);
            },
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
                printTextInstant('СПАТИ УМЕЕТ:\n  сделай красным / смени цвет на синий / случайный цвет\n  включи музыку / пауза / следующий трек / громче / тише\n  сколько будет 2+2 / выбери чай или кофе\n  подбрось монетку / брось кубик / число от 1 до 100\n  покажи достижения / очисти экран / включи режим хакера / запусти змейку\n  выполни команду neofetch / history / tracks / snake best (любую из help)\n  покажи историю / смени ник на Имя / сохрани прогресс / сделай карточку\n  включи звуки клавиш / покажи палитру / повтори текст\n  меня зовут ... (запомню имя) / усни (разбудит echo 1)');
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
                    return (spatiMem.name || state.nick) ? `СПАТИ: Тебя зовут ${spatiMem.name || state.nick}. Я помню` : 'СПАТИ: Не знаю. Скажи: меня зовут ...';
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
                if (/(включ\w*|запуст\w*|активир\w*|врубай|вруби|давай|режим|стань)\w* .*хакер|взломай (систему|пентагон|все)/.test(q)) {
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
                    isSpatiEnabled = false; unlock('spati_off'); { const b = document.getElementById('spatiBtn'); if (b) b.classList.remove('on'); } setMascot(false);
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
                const first = raw.trim().split(/\s+/)[0].toLowerCase().replace(/[,.:;!?]+$/, '');
                if (!first) return;
                const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
                const known = own(consoleCommands, first) || own(commands, first) || ['clear', 'echo', 'color', 'hacker', 'off', 'shutdown'].includes(first);
                if (!known) return;
                return spatiRunReply(raw.trim(), false);
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
            { re: /рекорд|сколько (я )?(набрал|очков)|мой счет|(прошл|последн)\w* (парти|игр)/, ach: 'spati_snake', a: [() => {
                const b = state.stats.snake.best;
                return b ? `СПАТИ: Твой рекорд в змейке — ${b}. ${b >= 25 ? 'Впечатляет' : 'Есть куда расти'}${state.stats.snake.last ? '. Прошлая партия: ' + state.stats.snake.last.s : ''}` : 'СПАТИ: Рекорда пока нет. Скажи: запусти змейку';
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
        setInterval(() => {
            if (!isSpatiEnabled || isTyping || isHackerMode || document.hidden) return;
            if (!spatiMascot || !spatiMascot.classList.contains('show') || smAsleep || smHeld || smDrag) return;
            if (Date.now() - smSayAt < 8000) return;
            if (terminalContainer.classList.contains('hidden') || screen.classList.contains('crt-off')) return;
            if (hiddenInput && hiddenInput.value) return;
            if (Date.now() - Math.max(spatiActivity, spatiLastIdle) < spatiIdleLimit) return;
            spatiLastIdle = Date.now();
            spatiIdleLimit = spInt(70000, 160000);
            let pool = SPATI_IDLE.slice();
            if (!bgAudio.paused) pool.push(() => `СПАТИ: Хороший трек. ${trackLabel(currentTrackIndex)}`, 'СПАТИ: Музыка делает тишину уютнее');
            if (spPart() === 'night') pool.push(`СПАТИ: Уже поздно${SN()}. Но я не осуждаю`, 'СПАТИ: Ночью терминал светится особенно уютно');
            if (spatiMood <= -2) pool = ['СПАТИ: Я всё ещё обижен. Просто напоминаю'];
            mascotSay(spatiAfkText(spatiPick(pool)));
        }, 10000);

        // AFK-реплики говорит маскот (в пузыре), а не терминал
        const spatiAfkText = (t) => String(t).replace(/^СПАТИ:\s*/, '');
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
            forceSpati = true;
            try { handleSpatiLogicInner(fullInput); } finally { forceSpati = false; }
        }
        function handleSpatiLogicInner(fullInput) {
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

        // --- Маскот Спати: призрак с открывающимся ртом ---
        const spatiMascot = document.getElementById('spatiMascot');
        let mouthTimer = null, thinkTimer = null, mouthFlip = false, forceSpati = false, chatterTimer = null;
        // Мгновенные реплики Спати: рот шевелится, пока строка «говорится»
        function mascotChatter(len) {
            if (!spatiMascot || !isSpatiEnabled) return;
            clearInterval(chatterTimer);
            let n = Math.min(24, Math.max(6, Math.round(len / 2)));
            chatterTimer = setInterval(() => {
                if (--n <= 0 || !isSpatiEnabled) { clearInterval(chatterTimer); spatiMascot.classList.remove('open'); return; }
                mouthFlip = !mouthFlip; spatiMascot.classList.toggle('open', mouthFlip);
            }, 90);
        }
        function setMascot(on) {
            if (!spatiMascot) return;
            spatiMascot.classList.toggle('show', !!on);
            document.body.classList.toggle('spati-on', !!on);
            if (!on) { spatiMascot.classList.remove('open', 'think'); clearTimeout(mouthTimer); clearTimeout(thinkTimer); }
            mascotToggle(!!on);
        }
        function mascotMouth(open) {
            if (!spatiMascot) return;
            clearTimeout(mouthTimer);
            spatiMascot.classList.toggle('open', open);
            if (open) mouthTimer = setTimeout(() => spatiMascot.classList.remove('open'), 150);
        }
        function mascotThink(ms) {
            if (!spatiMascot) return;
            clearTimeout(thinkTimer);
            spatiMascot.classList.toggle('think', ms > 0);
            if (ms > 0) thinkTimer = setTimeout(() => spatiMascot.classList.remove('think'), ms + 60);
        }

        // ===== Маскот: клики, перетаскивание, броски, много анимаций =====
        const smReact = document.getElementById('spatiReact');
        const smBubble = document.getElementById('spatiBubble');
        const smGaze = document.getElementById('smGaze');
        const SM_KEY = 'spatium_mascot_v1';
        const SM_W = 96, SM_H = 104;
        let smPos = { x: 0, y: 0 }, smMoved = false, smHeld = false, smRaf = 0;
        let smSaved = { fx: 0, fy: 0, hint: 0, clicks: 0, m: 0 };
        let smEmTimer = null, smAnimTimer = null, smSayTimer = null, smTypeTimer = null, smHoldTimer = null;
        let smIdleAt = 0, smSayAt = 0, smLastReact = '', smClicks = [], smDrag = null;
        let smAsleep = false, smSleptAt = 0, smZzzAt = 0, smStage = 0, smLastTouch = Date.now(), smWasAsleep = false, smPetTimer = null, smHoverAt = 0, smHiddenAt = 0;
        const smPick = (a) => a[Math.floor(Math.random() * a.length)];
        const smClamp = (v, a, b) => Math.max(a, Math.min(b, v));
        try {
            const sv = JSON.parse(localStorage.getItem(SM_KEY) || 'null');
            if (sv) { smSaved = Object.assign(smSaved, sv); smMoved = typeof sv.fx === 'number' && sv.m !== 0; }
        } catch (e) {}
        function smSave() {
            const r = screen.getBoundingClientRect();
            if (smMoved) { smSaved.fx = smPos.x / Math.max(1, r.width - SM_W); smSaved.fy = smPos.y / Math.max(1, r.height - SM_H); }
            smSaved.m = smMoved ? 1 : 0;
            try { localStorage.setItem(SM_KEY, JSON.stringify(smSaved)); } catch (e) {}
        }
        function smSetPos(x, y) {
            const r = screen.getBoundingClientRect();
            smPos.x = smClamp(x, 0, Math.max(0, r.width - SM_W));
            smPos.y = smClamp(y, 0, Math.max(0, r.height - SM_H));
            spatiMascot.style.left = smPos.x + 'px';
            spatiMascot.style.top = smPos.y + 'px';
        }
        function smHome() {
            const r = screen.getBoundingClientRect();
            const w = document.querySelector('.window');
            const wr = w ? w.getBoundingClientRect() : null;
            if (wr && wr.width > 0) return { x: wr.right - r.left - SM_W - 4, y: wr.top - r.top + 30 };
            return { x: r.width - SM_W - 20, y: 80 };
        }
        function smLayout() {
            if (!spatiMascot) return;
            const r = screen.getBoundingClientRect();
            if (smMoved) smSetPos(smSaved.fx * (r.width - SM_W), smSaved.fy * (r.height - SM_H));
            else { const h = smHome(); smSetPos(h.x, h.y); }
            document.body.classList.toggle('sm-moved', smMoved);
        }
        window.addEventListener('resize', () => { if (spatiMascot && spatiMascot.classList.contains('show')) smLayout(); });

        function smEm(em, ms) {
            clearTimeout(smEmTimer);
            spatiMascot.dataset.em = em || 'normal';
            if (ms) smEmTimer = setTimeout(() => {
                if (!smHeld && !spatiMascot.classList.contains('flying')) spatiMascot.dataset.em = 'normal';
            }, ms);
        }
        function smPlay(a, ms) {
            clearTimeout(smAnimTimer);
            smReact.className = 'sm-react';
            if (!smHeld && !spatiMascot.classList.contains('flying')) smReact.style.transform = '';
            void smReact.offsetWidth;
            if (!a) return;
            smReact.classList.add('a-' + a);
            smAnimTimer = setTimeout(() => { smReact.className = 'sm-react'; }, ms);
        }
        function mascotSay(text) {
            if (!smBubble || !spatiMascot || !isSpatiEnabled) return;
            if (smNight()) text = String(text).toLowerCase();   // ночью Спати говорит шёпотом
            clearInterval(smTypeTimer); clearTimeout(smSayTimer);
            smSayAt = Date.now();
            const r = screen.getBoundingClientRect();
            const right = smPos.x + SM_W / 2 > r.width / 2;
            smBubble.className = 'sm-bubble show ' + (smPos.y < 70 ? 'down ' : 'up ') + (right ? 'r' : 'l') + (smNight() ? ' whisper' : '');
            smBubble.textContent = '';
            let i = 0;
            smTypeTimer = setInterval(() => {
                if (i >= text.length) {
                    clearInterval(smTypeTimer); mascotMouth(false);
                    smSayTimer = setTimeout(() => smBubble.classList.remove('show'), 1500 + text.length * 35);
                    return;
                }
                const ch = text.charAt(i++);
                smBubble.textContent += ch;
                if (/[a-zа-яё0-9]/i.test(ch)) { mouthFlip = !mouthFlip; mascotMouth(mouthFlip); } else mascotMouth(false);
            }, 38);
        }
        const smSayCool = (text, ms) => { if (Date.now() - smSayAt >= (ms || 1800)) mascotSay(text); };

        const SM_R = {
            jump:   { a: 'jump',   ms: 750,  em: 'happy',     say: ['Оп!', 'Прыг-скок!', 'Подпрыгнул. Зачёт?', 'Хоп! Гравитация, ты где?', 'Ещё выше? Я могу', 'Пружинка включена'] },
            spin:   { a: 'spin',   ms: 950,  em: 'surprised', say: ['Вжух!', 'Кручусь-верчусь!', 'Голова не кружится. Почти', 'Юла-призрак!', 'Оборот на 720. Для стиля'] },
            flip:   { a: 'flip',   ms: 850,  em: 'happy',     say: ['Кувырок!', 'Сальто. Без страховки', 'Ап!', 'Олимпиада, я иду', 'Приземлился. Как всегда'] },
            squish: { a: 'squish', ms: 650,  em: 'surprised', say: ['Ай! Мягче!', 'Не дави на пиксели', 'Я не кнопка', 'Я же сплющусь', 'Блин. То есть пиксель-блин'] },
            wink:   { a: 'sway',   ms: 1000, em: 'wink',      say: ['Подмигиваю. Чисто технически', 'Ты меня заметил', 'Это наш секрет', 'Мы с тобой одна команда', 'Моргнул. Или нет?'] },
            shake:  { a: 'shake',  ms: 600,  em: 'angry',     say: ['Эй!', 'Не тыкай!', 'Я всё вижу', 'Я при исполнении', 'Хмуро смотрю. Видишь?'] },
            dizzy:  { a: 'dizzy',  ms: 1700, em: 'dizzy',     say: ['Ой, всё плывёт...', 'Земля, где ты?', 'Кружится...', 'Мир стал круглым', 'Кажется, я в центрифуге'] },
            vanish: { a: 'vanish', ms: 1400, em: 'surprised', say: ['Куку!', 'Я исчез. Или нет', 'Фокус!', 'Меня нет. Вообще', 'Хлоп, и я тут'] },
            laugh:  { a: 'laugh',  ms: 1300, em: 'laugh',     chat: 26, say: ['Ха-ха-ха!', 'Щекотно!', 'Хи-хи', 'Не смеши, я лопну', 'Ой, не могу'] },
            boo:    { a: 'boo',    ms: 900,  em: 'surprised', say: ['БУУ!', 'Испугался? Я тоже', 'Буу! Шутка', 'Я же призрак. Работа такая', 'Страшно? Мне тоже'] },
            dance:  { a: 'dance',  ms: 2600, em: 'happy',     say: ['Танцую, как умею', 'Диско-терминал!', 'Раз-два-три', 'Ноги не нужны, ритм есть', 'Это называется призрачный твист'] },
            glitch: { a: 'glitch', ms: 800,  em: 'dizzy',     say: ['С-с-сбой...', 'Ошибка 404: призрак', 'Перезагрузка... нет', 'Пиксели разбежались', 'Это не баг, это фича'] },
            sleep:  { a: 'sleep',  ms: 3200, em: 'sleepy',    say: ['Zzz...', 'Я не сплю. Я простаиваю', 'Минуточку подремлю', 'Дай вздремнуть, а?'] },
            inflate:{ a: 'inflate',ms: 1300, em: 'surprised', say: ['Надулся. Не от обиды', 'Я воздушный шарик!', 'Пых-пых', 'Только не лопай'] },
            tilt:   { a: 'tilt',   ms: 1200, em: 'look',      say: ['Хм?', 'Это что-то новое', 'А ты точно человек?', 'Любопытно...', 'Не понял, но интересно'] },
            hiccup: { a: 'hiccup', ms: 1400, em: 'surprised', say: ['Ик!', 'Ик! Простите', 'Ик! Это от нервов', 'Ик... кто-то вспоминает меня'] },
            sneeze: { a: 'sneeze', ms: 1000, em: 'surprised', say: ['Апчхи!', 'Пыль в терминале', 'Будь здоров. То есть я', 'Апчхи! Это аллергия на баги'] },
            stretch:{ a: 'stretch',ms: 1800, em: 'yawn' },
            startle:{ a: 'jump',   ms: 700,  em: 'surprised', say: ['Ой! Я не спал!', 'Что? Где? Я бодрствую!', 'Я только на секундочку закрыл глаза', 'Не сплю! Совсем не сплю!'] },
            pet:    { a: 'sway',   ms: 1800, em: 'happy',     chat: 14, say: ['Мурр...', 'Приятно...', 'Погладь ещё', 'Так и быть, разрешаю', 'Я даже не знал, что так можно'] },
            sulk:   { a: null,     ms: 1800, em: 'sad',       say: ['Я всё ещё обижен', 'Не смотри на меня', 'Поговорим, когда извинишься', 'Отстань. Я дуюсь', 'Тыкай не тыкай, я обижен'] },
            cheer:  { a: 'jump',   ms: 750,  em: 'happy',     say: ['Ура!', 'Достижение! Горжусь тобой', 'Так держать!', 'Ты молодец', 'Ещё одна ачивка в копилку'] },
            wave:   { a: 'sway',   ms: 1500, em: 'happy',     say: ['О, ты вернулся!', 'Привет-привет!', 'Я ждал. Почти не скучал', 'Где пропадал?', 'С возвращением'] },
            highfive:{ a: 'jump',  ms: 750,  em: 'happy',     chat: 12, say: ['Дай пять!', 'Есть контакт!', 'Пять! Рука у меня виртуальная', 'Бам! Пиксель к пикселю', 'Так держать, напарник'] },
            eat:    { a: 'hop',    ms: 900,  em: 'happy',     chat: 16, say: ['Ням-ням!', 'Вкусно! Пиксельное', 'Хрум! Спасибо', 'Ещё бы одно. Шучу', 'Лучшее яблоко в терминале'] },
            look:   { a: null,     ms: 2400, em: 'look' },
            yawn:   { a: 'yawn',   ms: 1800, em: 'yawn' },
            blink:  { a: null,     ms: 700,  em: 'blink' },
            hop:    { a: 'hop',    ms: 600,  em: 'happy' },
            sway:   { a: 'sway',   ms: 2000, em: 'normal' }
        };
        const SM_CLICK_POOL = ['jump', 'spin', 'flip', 'squish', 'wink', 'shake', 'dizzy', 'vanish', 'laugh', 'boo', 'dance', 'glitch', 'sleep', 'inflate', 'tilt', 'hiccup', 'sneeze'];
        const SM_IDLE_POOL = ['look', 'yawn', 'blink', 'hop', 'sway', 'wink', 'tilt', 'hiccup', 'sneeze'];
        const SM_IDLE_SAY = ['Я тут', 'Тихо...', 'Меня можно потрогать', 'Потаскай меня по экрану', 'Скучно. Нажми на меня', 'Я бы пошутил, но лень',
            'Если зажать меня и не двигать, будет приятно', 'Попробуй меня бросить', 'Я считаю пиксели. Их много', 'Эй, ты там?', 'Умею танцевать. Просто тыкни'];
        const SM_YAWN = ['Ааа-хм... Скучно', 'Зеваю. Это не намёк', 'Тихо тут. Хочется спать', 'Ты там живой?', 'Кто-то тут давно не тыкал призраков'];
        const SM_BORED = ['Потягиваюсь. Костей нет, но хрустит', 'Может, поиграем? Просто тыкни', 'Я тут один с курсором', 'Скучаю по твоим кликам', 'Могу станцевать, если попросишь. Ну, тыкнешь'];
        const SM_DROWSY = ['Глаза слипаются...', 'Ещё чуть-чуть и я отключусь', 'Режим энергосбережения...', 'Считаю овец. То есть байты'];
        const SM_SNORE = ['Zzz...', 'Хр-р-р...', 'Zzz... яблоки... змейка...', 'Zz... 42...', 'Мм... байты...', 'Zzz... Зенит...'];
        const SM_WAKE = ['Мм? Я не спал', 'О, ты здесь. Я просто моргал', 'Доброе утро? Или вечер?', 'Ой. Я что, заснул?'];
        const SM_MILESTONES = { 10: 'Десять касаний. Я начинаю привыкать', 25: 'Ты любишь меня тыкать, да?', 50: 'У меня тоже есть чувства. Пиксельные',
            100: 'Сотый клик! Мы теперь друзья', 250: 'Меня зовут Спати. Ты уже запомнил', 500: 'Пятьсот. Я записал тебя в друзья' };
        const SM_WHEEL = ['Я не колёсико!', 'Вжух-вжух!', 'Кручусь, как просили', 'Прокрутка не сработает', 'Эй, это мне, а не странице'];
        const SM_APPLE_SEE = ['О! Яблоко! Дашь?', 'Яблоко! Тыкни на него', 'Оно само упало, честно', 'Хочу это яблоко...'];
        const SM_APPLE_MISS = ['Яблоко ушло. Грущу', 'Эх, не успели', 'Ну и ладно. Я не голоден. Почти'];
        const SM_EAT = ['Ням-ням!', 'Вкусно! Пиксельное', 'Хрум! Спасибо', 'Лучшее яблоко в терминале', 'Ещё бы одно. Шучу'];
        const SM_CMD = {
            clear: { r: 'sneeze', p: 1,  say: ['Апчхи! Пыль со старых логов', 'Чисто. Даже я чихнул'] },
            hacker:{ r: 'glitch', p: 1,  say: ['Я ничего не видел', 'Это точно легально?', 'Хакер... я в шоке'] },
            off:   { r: 'yawn',   p: 1,  say: ['Спокойной ночи', 'Выключаемся? Я посплю'] },
            echo:  { r: 'tilt',   p: .5, say: ['Эхо-эхо-эхо...', 'Повторяю за тобой. Нет, это ты повторяешь'] },
            history:{ r: 'look',  p: .6, say: ['Ого, сколько всего ты набрал', 'Читаю твою историю. Тихо'] },
            help:  { r: 'tilt',   p: .4, say: ['Подсказка? Я тоже иногда читаю', 'help — наш общий друг'] },
            vol:   { r: 'sway',   p: .4, say: ['Громкость — это ответственность', 'Ушки берегите'] },
            neofetch:{ r: 'wink', p: .6, say: ['Это моя прописка', 'Системная сводка. Я там главный'] },
            export:{ r: 'hop',    p: .7, say: ['Сохраняемся? Умно', 'Прогресс в безопасности'] },
            import:{ r: 'look',   p: .7, say: ['Загружаем прошлое...', 'Надеюсь, я там симпатичный'] }
        };
        const SM_CMD_LONG = { r: 'tilt', p: .7, say: ['Это что, роман?', 'Длинная команда. Я устал читать', 'Ого, целое сочинение'] };
        // реакции на команды терминала (arg-aware: rm -rf, sudo, fork-бомба, повторы)
        const SM_CMD_X = {
            rmrf:     { r: 'glitch', em: 'surprised', p: 1, force: 1,
                        say: ['НЕ НАДО! Я здесь живу!', 'Стой! Там же всё моё!', 'Положи rm! Медленно!', 'Я не готов исчезнуть!'],
                        after: { ms: 3200, r: 'sway', em: 'happy', say: ['Фух. Система цела. Не пугай меня так', 'Отбились. Spatium OS стоит крепко', 'Я чуть не стал воспоминанием'] } },
            forkbomb: { r: 'dizzy', em: 'dizzy', p: 1, force: 1,
                        say: ['Это что за заклинание? Процессор греется', 'Процессы размножаются! Я боюсь!', 'Двоеточие со скобками? Это опасно'] },
            sudo:     { r: 'shake', em: 'angry', p: 1, force: 1,
                        say: ['Ты не в списке. Я тоже, но молчу', 'Sudo? Здесь все равны. Особенно ты', 'Права root? Рановато'] },
            rm:       { r: 'tilt', p: .8, say: ['Что ты собрался удалять?', 'Осторожнее с rm. Тут всё родное'] },
            snake:    { r: 'hop', em: 'happy', p: 1, say: ['Змейка! Я болею за тебя', 'Играем? Я на трибунах', 'Змейка! Я за тебя, а не за змею'] },
            whoami:   { r: 'wink', p: .9, say: ['Ты — это ты. А я — Спати', 'Хороший вопрос. Спроси что-нибудь попроще'] },
            ls:       { r: 'look', p: .5, say: ['Тут всё моё. Ну, почти', 'Смотрю, что в папке. Вроде ничего'] },
            exit:     { r: 'sway', em: 'sad', p: 1, say: ['Уходишь? Я останусь. В тишине', 'Выход — это только слово'] },
            card:     { r: 'wink', p: .8, say: ['Карточка! Покажешь друзьям?', 'Хвастаться — это нормально'] },
            nick:     { r: 'tilt', p: .6, say: ['Новое имя? Запомню', 'Имя — это важно. Особенно твоё'] },
            sfx:      { r: 'sway', p: .5, say: ['Тик-тик-тик. Люблю клавиши', 'Звуки клавиш — это музыка терминала'] },
            mute:     { r: 'tilt', em: 'sad', p: .7, say: ['Тишина... Слышу, как бьётся курсор', 'Без звука тоже уютно'] },
            tracks:   { r: 'sway', p: .6, say: ['Много треков. Выбирай', 'Люблю смотреть на плейлисты'] },
            hello:    { r: 'wave', p: 1, say: ['Привет-привет!', 'О, поздоровался. Приятно'] },
            time:     { r: 'look', p: .5, say: ['Для призрака время — понятие относительное', 'Я всегда знаю, который час. Но молчу'] }
        };
        SM_CMD_X.cd = SM_CMD_X.pwd = SM_CMD_X.cat = SM_CMD_X.ls;
        SM_CMD_X.quit = SM_CMD_X.exit;
        SM_CMD_X['привет'] = SM_CMD_X.hello;
        SM_CMD_X.date = SM_CMD_X.time;
        const smOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null;
        const SM_REPEAT = ['Ты повторяешься. Это ритуал?', 'Третий раз подряд. Я всё понял с первого', 'Эта команда тебе очень дорога, да?'];
        let smCmdAt = 0, smLastCmdLine = '', smSameCmd = 0, smRepeatAt = 0;
        function smCmdKey(name, cmd) {
            const low = cmd.toLowerCase();
            if (/:\(\)\s*\{/.test(cmd)) return 'forkbomb';
            if (/(^|\s)rm(\s|$)/.test(low) && (/(^|\s)-\w*(rf|fr)\w*(\s|$)/.test(low) || /--no-preserve-root/.test(low))) return 'rmrf';
            if (name === 'shutdown') return 'off';
            return name;
        }
        function mascotCmd(name, cmd) {
            try {
                if (!isSpatiEnabled || !spatiMascot || !spatiMascot.classList.contains('show') || smHeld || smRaf || smDrag) return;
                const now = Date.now();
                const line = cmd.toLowerCase().replace(/\s+/g, ' ').trim();
                smSameCmd = line === smLastCmdLine ? smSameCmd + 1 : 1;
                smLastCmdLine = line;
                if (smSameCmd >= 3 && now - smRepeatAt > 15000 && !smAsleep) {
                    smRepeatAt = now; smCmdAt = now;
                    setTimeout(() => {
                        if (!isSpatiEnabled || smHeld || smRaf || smDrag || smAsleep) return;
                        mascotReact('tilt', true); mascotSay(smPick(SM_REPEAT));
                    }, 350);
                    return;
                }
                const key = smCmdKey(name, cmd);
                const e = smOwn(SM_CMD_X, key) || smOwn(SM_CMD, key) || (cmd.length > 60 ? SM_CMD_LONG : null);
                if (!e) return;
                if (smAsleep) { if (!e.force) return; smTouch(); }   // важное будит
                if (!e.force && now - smCmdAt < 6000) return;
                if (Math.random() > e.p) return;
                smCmdAt = now;
                setTimeout(() => {
                    if (!isSpatiEnabled || smHeld || smRaf || smDrag || smAsleep) return;
                    mascotReact(e.r, true);
                    if (e.em) smEm(e.em, 1600);
                    mascotSay(smPick(e.say));
                    if (e.after) setTimeout(() => {
                        if (!isSpatiEnabled || smHeld || smRaf || smDrag || smAsleep) return;
                        mascotReact(e.after.r, true); smEm(e.after.em, 1600); mascotSay(smPick(e.after.say));
                    }, e.after.ms);
                }, 350);
            } catch (err) {}
        }

        // --- яблоко: Спати просит угостить ---
        const SM_APPLE_MAP = ['....##..', '...#....', '.######.', '########', '########', '########', '.######.', '..#..#..'];
        let smApple = null, smAppleTimer = null, smAppleAt = Date.now();
        function smAppleSvg() {
            let r = '';
            SM_APPLE_MAP.forEach((row, y) => { for (let x = 0; x < 8; x++) if (row[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
            return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${r}</svg>`;
        }
        function smSpawnApple() {
            if (smApple || !spatiMascot) return;
            const r = screen.getBoundingClientRect();
            const toLeft = smPos.x + SM_W / 2 > r.width / 2;
            const x = smClamp(toLeft ? smPos.x - 46 : smPos.x + SM_W + 8, 4, Math.max(4, r.width - 44));
            const y = smClamp(smPos.y + SM_H - 44, 4, Math.max(4, r.height - 44));
            const el = document.createElement('button');
            el.type = 'button'; el.className = 'sm-apple'; el.setAttribute('aria-label', 'Яблоко для Спати');
            el.innerHTML = smAppleSvg();
            el.style.left = x + 'px'; el.style.top = y + 'px';
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); smEatApple(); });
            screen.appendChild(el);
            smApple = el; smAppleAt = Date.now();
            smEm('surprised', 900);
            mascotSay(smPick(SM_APPLE_SEE));
            clearTimeout(smAppleTimer);
            smAppleTimer = setTimeout(() => smDropApple(true), 16000);
        }
        function smEatApple() {
            const el = smApple;
            if (!el) return;
            smApple = null; clearTimeout(smAppleTimer);
            smTouch();
            el.classList.add('eaten');
            el.style.left = (smPos.x + SM_W / 2 - 20) + 'px';
            el.style.top = (smPos.y + SM_H * .4) + 'px';
            setTimeout(() => el.remove(), 380);
            setTimeout(() => {
                if (!isSpatiEnabled) return;
                smSaved.fed = (smSaved.fed || 0) + 1; smSave();
                if (smSaved.fed >= 5) unlock('sm_feed5');
                if (smSaved.fed >= 25) unlock('sm_feed25');
                mascotReact('eat', true);
                mascotSay(smSaved.fed === 1 ? 'Первое яблоко! Я твой должник' : smPick(SM_EAT));
            }, 300);
        }
        function smDropApple(missed) {
            const el = smApple;
            if (!el) return;
            smApple = null; clearTimeout(smAppleTimer);
            el.classList.add('gone');
            setTimeout(() => el.remove(), 420);
            if (missed && isSpatiEnabled && !smAsleep) { smEm('sad', 1600); mascotSay(smPick(SM_APPLE_MISS)); }
        }

        const SM_BACK = [() => `С возвращением${SN()}. Я не скучал. Почти`, 'О, ты вернулся. Тут ничего не менялось', 'Долго ты. Я пересчитал все пиксели'];
        const SM_COLOR = ['О, новый цвет!', 'Так я тоже красивее', 'Глаза привыкают', 'Теперь я в тон', 'Мне идёт. Скажи, что идёт'];
        const SM_UNKNOWN = ['Такой команды нет', 'Опечатка?', 'Хм, не знаю такого', 'help — твой друг', 'Терминал не понял. Я тоже'];
        const SM_MUSIC = ['Музыка! Люблю', 'О, трек. Качает', 'Ноги сами. То есть их нет', 'Давай погромче. Хотя нет'];
        const SM_QUIET = ['Тишина...', 'Музыку выключили. Грустно', 'Стало тихо. Слышу себя'];
        const SM_HOLD = ['Ой! Поставь на место', 'Эй, я лечу!', 'Осторожно, я нежный', 'Держи крепче!', 'Меня ещё никто так не носил', 'Я не багаж!', 'Только не урони'];
        const SM_BORED_HOLD = ['Ну поставь уже...', 'Я тут вишу как флаг', 'Рука не устала?', 'Красивый вид отсюда. Хотя везде одинаково'];
        const SM_THROW = ['Аааа!', 'Я лечу-у-у!', 'Только не в стену!', 'Свободное падение!', 'Мама, я пиксель-ракета!'];
        const SM_BUMP = ['Бум!', 'Ай!', 'Стена!', 'Ох!', 'Мягкая посадка. Нет, жёсткая'];
        const SM_LAND = ['Спасибо, тут уютнее', 'Новое место. Мне нравится', 'Ставь аккуратнее в следующий раз', 'Вид отсюда лучше', 'Тут сквозняк. Шучу, мне нравится'];
        const SM_SHAKE = ['Укачивает...', 'Меня трясёт!', 'Я не коктейль!', 'Взбалтывать не надо'];

        function mascotReact(name, quiet) {
            const r = SM_R[name];
            if (!r || !smReact) return;
            if (smAsleep && name !== 'startle') return;
            smLastReact = name;
            smPlay(r.a, r.ms);
            smEm(r.em, r.ms);
            if (r.chat) mascotChatter(r.chat);
            if (!quiet && r.say) mascotSay(smPick(r.say));
        }
        function mascotFlee() {
            mascotSay('Всё, я домой!');
            smPlay('vanish', 1400); smEm('surprised', 1400);
            setTimeout(() => {
                smMoved = false; smSave(); smLayout();
            }, 520);
        }
        function mascotHome() {
            if (!spatiMascot) return;
            smMoved = false; smSave();
            spatiMascot.classList.add('gliding');
            smLayout();
            smPlay('hop', 600); smEm('happy', 900);
            setTimeout(() => spatiMascot.classList.remove('gliding'), 750);
        }
        function smTouch() {
            const now = Date.now();
            smLastTouch = now; smStage = 0; spatiActivity = now; smIdleAt = now + 15000;
            if (smAsleep) smWakeState();
        }
        function smSleep() {
            smAsleep = true; smSleptAt = Date.now(); smZzzAt = Date.now() + 1500;
            spatiMascot.classList.add('asleep');
            smPlay(null); smEm('sleepy');
            mascotSay(smPick(SM_SNORE));
        }
        function smWakeState() {
            smAsleep = false;
            spatiMascot.classList.remove('asleep');
            smEm('normal');
        }
        function smClick() {
            const now = Date.now();
            smClicks = smClicks.filter(t => now - t < 3500);
            smClicks.push(now);
            const n = smClicks.length;
            if (smWasAsleep) { smWasAsleep = false; mascotReact('startle'); return; }
            smSaved.clicks = (smSaved.clicks || 0) + 1; smSave();
            const mile = SM_MILESTONES[smSaved.clicks];
            if (mile) { mascotReact('cheer', true); mascotSay(mile); return; }
            if (n === 2 && smClicks[1] - smClicks[0] < 420) { unlock('sm_high5'); mascotReact('highfive'); return; }
            if (n >= 12) { smClicks = []; mascotFlee(); return; }
            if (n >= 6) {
                mascotReact(n % 2 ? 'laugh' : 'shake', n > 7);
                if (n === 6) mascotSay('Щекотно! Хватит!');
                if (n === 10) mascotSay('Ещё чуть-чуть и я сбегу!');
                return;
            }
            if (spatiMood <= -2 && Math.random() < .5) { mascotReact('sulk'); return; }
            let name;
            do { name = smPick(SM_CLICK_POOL); } while (name === smLastReact);
            mascotReact(name);
        }

        // --- перетаскивание и броски ---
        function smStartHold() {
            smHeld = true;
            clearTimeout(smPetTimer); smWasAsleep = false;
            cancelAnimationFrame(smRaf); smRaf = 0;
            spatiMascot.classList.remove('flying');
            smMoved = true;
            document.body.classList.add('sm-moved');
            smPlay(null);
            spatiMascot.classList.add('held');
            smEm('surprised');
            mascotSay(smPick(SM_HOLD));
            clearTimeout(smHoldTimer);
            smHoldTimer = setTimeout(() => {
                if (smHeld) { smEm('sad'); smSayCool(smPick(SM_BORED_HOLD), 800); }
            }, 3500);
        }
        function smEndHold(vx, vy) {
            smHeld = false;
            clearTimeout(smHoldTimer);
            spatiMascot.classList.remove('held');
            smReact.style.transform = '';
            const speed = Math.hypot(vx, vy);
            if (speed > .45) {
                smEm('surprised');
                smSayCool(smPick(SM_THROW), 400);
                smFly(vx, vy);
            } else {
                smEm('normal'); smPlay('land', 450); smSave();
                if (Math.random() < .5) mascotSay(smPick(SM_LAND));
            }
        }
        function smFly(vx, vy) {
            spatiMascot.classList.add('flying');
            let last = performance.now(), bounces = 0, lastBump = 0;
            const step = (now) => {
                if (!isSpatiEnabled) return;
                const dt = Math.min(34, now - last); last = now;
                const r = screen.getBoundingClientRect();
                const maxX = r.width - SM_W, maxY = r.height - SM_H;
                let x = smPos.x + vx * dt, y = smPos.y + vy * dt, hit = false;
                if (x < 0) { x = 0; vx = Math.abs(vx) * .75; hit = true; } else if (x > maxX) { x = maxX; vx = -Math.abs(vx) * .75; hit = true; }
                if (y < 0) { y = 0; vy = Math.abs(vy) * .75; hit = true; } else if (y > maxY) { y = maxY; vy = -Math.abs(vy) * .75; hit = true; }
                const f = Math.pow(.955, dt / 16); vx *= f; vy *= f;
                smSetPos(x, y);
                smReact.style.transform = 'rotate(' + smClamp(vx * 22, -30, 30) + 'deg)';
                if (hit && Math.hypot(vx, vy) > .12 && now - lastBump > 300) {
                    lastBump = now; bounces++;
                    smReact.className = 'sm-react'; void smReact.offsetWidth; smReact.classList.add('a-bump');
                    smSayCool(smPick(SM_BUMP), 1500);
                }
                if (Math.hypot(vx, vy) < .05) {
                    smRaf = 0;
                    spatiMascot.classList.remove('flying');
                    smReact.style.transform = '';
                    if (bounces >= 3) { smPlay('dizzy', 1700); smEm('dizzy', 1700); mascotSay('Голова кружится...'); }
                    else { smPlay('land', 450); smEm('normal'); }
                    smSave();
                    return;
                }
                smRaf = requestAnimationFrame(step);
            };
            smRaf = requestAnimationFrame(step);
        }
        if (spatiMascot) {
            spatiMascot.addEventListener('click', (e) => e.stopPropagation());
            let smWheelAt = 0;
            spatiMascot.addEventListener('wheel', (e) => {
                if (!isSpatiEnabled || !spatiMascot.classList.contains('show')) return;
                e.preventDefault();
                const now = Date.now();
                if (now - smWheelAt < 1400 || smHeld || smRaf || smDrag) return;
                smWheelAt = now; smTouch();
                mascotReact('spin', true);
                mascotSay(smPick(SM_WHEEL));
            }, { passive: false });
            spatiMascot.addEventListener('pointerenter', (e) => {
                if (e.pointerType !== 'mouse' || smHeld || smRaf || smAsleep || !isSpatiEnabled) return;
                const now = Date.now();
                if (now - smHoverAt < 5000) return;
                smHoverAt = now;
                smEm('surprised', 700);
                if (Math.random() < .2) mascotSay(smPick(['Хм?', 'Ты ко мне?', 'О, курсор!', 'Заметил меня?']));
            });
            spatiMascot.addEventListener('pointerdown', (e) => {
                if (!isSpatiEnabled || !spatiMascot.classList.contains('show')) return;
                e.preventDefault(); e.stopPropagation();
                smWasAsleep = smAsleep; smTouch();
                if (smRaf) { cancelAnimationFrame(smRaf); smRaf = 0; spatiMascot.classList.remove('flying'); smReact.style.transform = ''; }
                try { spatiMascot.setPointerCapture(e.pointerId); } catch (err) {}
                const r = screen.getBoundingClientRect();
                smDrag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left - smPos.x, oy: e.clientY - r.top - smPos.y,
                    moved: false, samples: [], dir: 0, flips: [], dizzyAt: 0, pet: false };
                clearTimeout(smPetTimer);
                smPetTimer = setTimeout(() => {
                    if (smDrag && !smDrag.moved) { smDrag.pet = true; smEm('happy'); }
                }, 650);
            });
            spatiMascot.addEventListener('pointermove', (e) => {
                const d = smDrag;
                if (!d || e.pointerId !== d.id) return;
                if (!d.moved) {
                    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
                    d.moved = true; smStartHold();
                }
                const r = screen.getBoundingClientRect();
                const px = smPos.x;
                smSetPos(e.clientX - r.left - d.ox, e.clientY - r.top - d.oy);
                const t = performance.now();
                d.samples.push({ t, x: smPos.x, y: smPos.y });
                while (d.samples.length > 2 && t - d.samples[0].t > 110) d.samples.shift();
                const a = d.samples[0], b = d.samples[d.samples.length - 1];
                const vx = b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
                smReact.style.transform = 'rotate(' + smClamp(vx * 18, -28, 28) + 'deg)';
                // тряска: быстрая смена направления
                const dx = smPos.x - px;
                if (Math.abs(dx) > 3) {
                    const dir = dx > 0 ? 1 : -1;
                    if (d.dir && dir !== d.dir) d.flips.push(t);
                    d.dir = dir;
                    d.flips = d.flips.filter(x => t - x < 900);
                    if (d.flips.length >= 6 && t - d.dizzyAt > 3000) {
                        d.dizzyAt = t; d.flips = [];
                        smEm('dizzy'); mascotSay(smPick(SM_SHAKE));
                    }
                }
            });
            const smUp = (e, cancel) => {
                const d = smDrag;
                if (!d || e.pointerId !== d.id) return;
                smDrag = null;
                clearTimeout(smPetTimer);
                try { spatiMascot.releasePointerCapture(e.pointerId); } catch (err) {}
                if (!d.moved) {
                    if (cancel) { smWasAsleep = false; if (d.pet) smEm('normal'); return; }
                    if (d.pet && !smWasAsleep) { smSaved.clicks = (smSaved.clicks || 0) + 1; smSave(); mascotReact('pet'); } else smClick();
                    return;
                }
                let vx = 0, vy = 0;
                const n = d.samples.length;
                if (n > 1) {
                    const a = d.samples[0], b = d.samples[n - 1];
                    if (performance.now() - b.t < 90 && b.t > a.t) { vx = (b.x - a.x) / (b.t - a.t); vy = (b.y - a.y) / (b.t - a.t); }
                }
                smEndHold(vx, vy);
            };
            spatiMascot.addEventListener('pointerup', (e) => smUp(e, false));
            spatiMascot.addEventListener('pointercancel', (e) => smUp(e, true));
        }

        // --- глаза следят за курсором ---
        let smLookRaf = 0, smLookX = 0, smLookY = 0;
        document.addEventListener('pointermove', (e) => {
            smLookX = e.clientX; smLookY = e.clientY;
            if (smLookRaf || !isSpatiEnabled || !spatiMascot) return;
            smLookRaf = requestAnimationFrame(() => {
                smLookRaf = 0;
                const r = spatiMascot.getBoundingClientRect();
                const dx = smLookX - (r.left + r.width / 2), dy = smLookY - (r.top + r.height * .4);
                const dist = Math.hypot(dx, dy) || 1, k = Math.min(1, dist / 120);
                smGaze.style.setProperty('--gx', (dx / dist * .38 * k).toFixed(2) + 'px');
                smGaze.style.setProperty('--gy', (dy / dist * .3 * k).toFixed(2) + 'px');
            });
        }, { passive: true });

        // --- Спати комментирует достижения ---
        const smPl = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
        // для достижений с числом: [нужно, сколько сделано, «что осталось»]
        function achProgress(a) {
            const st = state.stats, sk = st.snake || {};
            const times = (n) => `${n} ${smPl(n, 'раз', 'раза', 'раз')}`;
            const mk = (need, cur, left) => ({ need, cur, left });
            const G = {
                visits: [{ regular: 3, regular10: 10, regular25: 25, regular50: 50, regular100: 100 }, () => st.visits || 0, (n) => `зайти в систему ещё ${times(n)}`],
                cmds: [{ cmd10: 10, cmd50: 50, cmd100: 100, cmd200: 200, cmd500: 500, cmd1000: 1000 }, () => st.cmds || 0, (n) => `выполнить ещё ${n} ${smPl(n, 'команду', 'команды', 'команд')}`],
                talks: [{ chatty: 5, spati_10: 10, spati_friend: 20, spati_50: 50, spati_legend: 100, spati_250: 250 }, () => st.spatiTalks || 0, (n) => `задать мне ещё ${n} ${smPl(n, 'вопрос', 'вопроса', 'вопросов')}`],
                colors: [{ rainbow: 5, chameleon: 15 }, () => (st.colors || []).length, (n) => `попробовать ещё ${n} ${smPl(n, 'цвет', 'цвета', 'цветов')}`],
                games: [{ snake_games5: 5, snake_games25: 25 }, () => sk.games || 0, (n) => `сыграть ещё ${n} ${smPl(n, 'партию', 'партии', 'партий')}`],
                apples: [{ snake_total200: 200, snake_total1000: 1000 }, () => sk.apples || 0, (n) => `съесть ещё ${n} ${smPl(n, 'яблоко', 'яблока', 'яблок')}`],
                bonus: [{ snake_bonus5: 5 }, () => sk.bonus || 0, (n) => `съесть ещё ${n} ${smPl(n, 'бонусное яблоко', 'бонусных яблока', 'бонусных яблок')}`],
                scmd: [{ spati_cmd5: 5, spati_cmd25: 25 }, () => st.spatiCmds || 0, (n) => `выполнить через меня ещё ${n} ${smPl(n, 'команду', 'команды', 'команд')}`],
                fed: [{ sm_feed5: 5, sm_feed25: 25 }, () => smSaved.fed || 0, (n) => `накормить меня ещё ${n} ${smPl(n, 'яблоком', 'яблоками', 'яблоками')}`],
                click: [{ nerves: 30 }, () => clickCount, (n) => `кликнуть по экрану ещё ${times(n)} за заход`],
                logo: [{ logo5: 5, logo25: 25 }, () => logoClicks, (n) => `кликнуть по логотипу S_ ещё ${times(n)}`],
                unk: [{ unknown5: 5, unknown20: 20, unknown50: 50 }, () => unknownRuns, (n) => `ввести ещё ${n} ${smPl(n, 'несуществующую команду', 'несуществующие команды', 'несуществующих команд')}`],
                help: [{ help3: 3 }, () => helpRuns, (n) => `открыть help ещё ${times(n)}`],
                echo: [{ echo10: 10 }, () => echoRuns, (n) => `использовать echo ещё ${times(n)}`],
                clr: [{ clear5: 5 }, () => clearRuns, (n) => `очистить экран ещё ${times(n)}`],
                sess: [{ cmd_session100: 100 }, () => sessionCmds, (n) => `выполнить ещё ${n} ${smPl(n, 'команду', 'команды', 'команд')} за заход`],
                spree: [{ color_spree: 50 }, () => colorSpree, (n) => `сменить цвет ещё ${times(n)}`],
                skip: [{ skipper: 10, skipper100: 100 }, () => skipCount, (n) => `переключить трек ещё ${times(n)}`],
                ended: [{ listener10: 10 }, () => endedTracks, (n) => `дослушать ещё ${n} ${smPl(n, 'трек', 'трека', 'треков')}`],
                hack: [{ paranoid: 3 }, () => hackerRuns, (n) => `запустить режим хакера ещё ${times(n)}`]
            };
            for (const k in G) {
                const need = G[k][0][a.id];
                if (need) return mk(need, G[k][1](), G[k][2]);
            }
            // по времени (в минутах)
            const minLeft = (sec) => Math.max(1, Math.ceil(sec / 60));
            if (a.id === 'dj_hour') return mk(3600, musicSeconds, () => `слушать музыку ещё ${minLeft(3600 - musicSeconds)} мин`);
            if (a.id === 'marathon' || a.id === 'long_session') {
                const need = a.id === 'marathon' ? 600 : 3600, cur = Math.floor((Date.now() - achSessionStart) / 1000);
                return mk(need, cur, () => `просидеть в системе ещё ${minLeft(need - cur)} мин`);
            }
            return null;
        }
        const SM_ACH_DONE = ['Это уже у тебя!', 'Открыто. Горжусь', 'Есть такое. Красиво', 'Уже в коллекции'];
        const SM_ACH_SECRET = ['Секрет! Я не расскажу', 'Тут тайна. Нажми — будет подсказка', 'Скрытое. Я бы подсказал, но молчу', 'Хм, сам хотел бы знать'];
        let smAchAt = 0, smAchId = '';
        function mascotAchHover(a, force) {
            try {
                if (!isSpatiEnabled || !spatiMascot || !spatiMascot.classList.contains('show') || smAsleep || smHeld || smDrag || smRaf) return;
                const now = Date.now();
                if (smAchId === a.id && now - smAchAt < 6000) return;
                if (!force && now - smAchAt < 1800) return;
                const done = !!state.ach[a.id], secret = a.hidden && !done;
                let text = '', em = 'look';
                if (secret) text = smPick(SM_ACH_SECRET);
                else if (done) { if (Math.random() < .5) return; text = smPick(SM_ACH_DONE); em = 'happy'; }
                else {
                    const p = achProgress(a);
                    if (!p) return;
                    const n = Math.max(1, p.need - p.cur);
                    text = `До «${a.title}»: ${p.left(n)}${n <= 3 ? '. Почти!' : ''}`;
                }
                smAchAt = now; smAchId = a.id;
                smEm(em, 1800);
                mascotSay(text);
            } catch (e) {}
        }
        let smAchOpenAt = 0;
        function mascotAchOpen() {
            try {
                if (!isSpatiEnabled || !spatiMascot || !spatiMascot.classList.contains('show') || smAsleep || smHeld || smDrag) return;
                const now = Date.now();
                if (now - smAchOpenAt < 4000) return;
                smAchOpenAt = now;
                const total = ACHIEVEMENTS.length, got = unlockedCount(), pct = total ? Math.round(got / total * 100) : 0;
                let text;
                if (got === 0) text = smPick(['Пока пусто. Зато всё впереди', 'Ни одного? Давай начнём']);
                else if (pct < 10) text = smPick(['Первые шаги. Дальше — больше', 'Начало положено']);
                else if (pct < 25) text = smPick(['Неплохо! Но есть куда расти', 'Уже что-то. Продолжай']);
                else if (pct < 50) text = smPick(['Ого, уже прилично!', 'Коллекция растёт. Нравится']);
                else if (pct < 75) text = `Вау, как много! ${got} из ${total}`;
                else if (pct < 100) text = smPick(['Вау, как много! Осталось совсем чуть-чуть', 'Почти всё собрал. Горжусь']);
                else text = smPick(['Все до одного?! Ты легенда', 'Сто процентов. Снимаю шляпу']);
                setTimeout(() => {
                    if (!achWindowOpen || !isSpatiEnabled || smHeld || smAsleep) return;
                    mascotReact(pct >= 50 ? 'cheer' : 'look', true);
                    mascotSay(text);
                }, 500);
            } catch (e) {}
        }

        // --- при наборе текста Спати смотрит на строку ввода ---
        if (hiddenInput && commandInputText) {
            hiddenInput.addEventListener('input', () => {
                if (!isSpatiEnabled || !spatiMascot || smAsleep || smHeld || !spatiMascot.classList.contains('show')) return;
                const tr = commandInputText.getBoundingClientRect();
                const r = spatiMascot.getBoundingClientRect();
                const dx = tr.right - (r.left + r.width / 2), dy = tr.top + tr.height / 2 - (r.top + r.height * .4);
                const dist = Math.hypot(dx, dy) || 1;
                smGaze.style.setProperty('--gx', (dx / dist * .38).toFixed(2) + 'px');
                smGaze.style.setProperty('--gy', (dy / dist * .3).toFixed(2) + 'px');
            });
        }

        // --- сам по себе: скучает, зевает, засыпает, оглядывается ---
        setInterval(() => {
            if (!isSpatiEnabled || !spatiMascot || !spatiMascot.classList.contains('show')) return;
            if (smHeld || smRaf || smDrag || document.hidden) return;
            const now = Date.now();
            if (smAsleep) {
                if (spatiActivity > smSleptAt + 500) {
                    smWakeState(); smStage = 2; smLastTouch = now - 100000;
                    mascotReact('yawn', true); mascotSay(smPick(SM_WAKE));
                } else if (now >= smZzzAt) {
                    smZzzAt = now + 6500 + Math.random() * 3000;
                    mascotSay(smPick(SM_SNORE));
                }
                return;
            }
            if (isTyping) return;
            if (!smApple && now - smAppleAt > 90000 && now - smLastTouch > 30000 && now - spatiActivity < 20000 && Math.random() < .08
                && !document.querySelector('.ach-window:not(.hidden), .music-player-modal:not(.hidden)')) { smSpawnApple(); return; }
            const idle = now - smLastTouch;
            if (smStage < 1 && idle > 40000 * smTimeK()) { smStage = 1; mascotReact('yawn', true); mascotSay(smPick(SM_YAWN)); return; }
            if (smStage < 2 && idle > 80000 * smTimeK()) { smStage = 2; mascotReact('stretch', true); mascotSay(smPick(SM_BORED)); return; }
            if (smStage < 3 && idle > 130000 * smTimeK()) { smStage = 3; smEm('sleepy', 4000); mascotSay(smPick(SM_DROWSY)); return; }
            if (smStage < 4 && idle > 190000 * smTimeK() && now - spatiActivity > 45000 * smTimeK()) { smStage = 4; smSleep(); return; }
            if (now < smIdleAt) return;
            smIdleAt = now + 12000 + Math.random() * 18000;
            let pool = SM_IDLE_POOL.slice();
            if (!bgAudio.paused) pool.push('sway', 'dance', 'hop', 'sway');
            if (spatiMood >= 2) pool.push('hop', 'dance', 'jump');
            if (spatiMood <= -2) pool = ['sulk', 'sulk', 'look', 'blink'];
            mascotReact(smPick(pool), true);
            if (Math.random() < .25) mascotSay(smPick(smIdleLines()));
        }, 2500);

        // --- реакции на события системы ---
        const smEvAt = {};
        const SM_EV_CD = { ach: 4000, color: 7000, unknown: 9000, play: 20000, pause: 20000, back: 1000 };
        function mascotEvent(type) {
            try {
                if (!isSpatiEnabled || !spatiMascot || !spatiMascot.classList.contains('show') || smHeld || smRaf || smDrag) return;
                if (smAsleep && type !== 'back' && !(SM_SYS[type] && SM_SYS[type].wake)) return;
                const now = Date.now();
                if (now - (smEvAt[type] || 0) < (SM_EV_CD[type] || 5000)) return;
                smEvAt[type] = now;
                if (type === 'ach') mascotReact('cheer');
                else if (type === 'back') { smTouch(); mascotReact('wave'); const b = smPick(SM_BACK); mascotSay(typeof b === 'function' ? b() : b); }
                else if (type === 'play') { mascotReact('dance', true); mascotSay(smPick(SM_MUSIC)); }
                else if (type === 'pause') { smEm('sad', 1400); mascotSay(smPick(SM_QUIET)); }
                else if (type === 'color') { smPlay('hop', 600); smEm('surprised', 900); mascotSay(smPick(SM_COLOR)); }
                else if (type === 'unknown') { smEm('sad', 1400); if (Math.random() < .5) mascotSay(smPick(SM_UNKNOWN)); }
                else if (SM_SYS[type]) smSysReact(type);
            } catch (e) {}
        }
        bgAudio.addEventListener('play', () => mascotEvent('play'));
        bgAudio.addEventListener('pause', () => { if (!bgAudio.ended) mascotEvent('pause'); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { smHiddenAt = Date.now(); return; }
            const away = smHiddenAt ? Date.now() - smHiddenAt : 0;
            if (away > 40000) mascotEvent('back');
            if (isSpatiEnabled && away > 60000) unlock('afk_back');
            if (isSpatiEnabled && away > 600000) unlock('afk_long');
            smHiddenAt = 0;
        });

        // ==========================================================
        // СПАТИ 3.0: болеет за змейку · время суток · системные события · зеркало в плеере
        // ==========================================================

        // ---------- 1. Змейка: Спати следит за игрой и болеет ----------
        // Текст партии выводит сама змейка (say), а маскот добавляет эмоции, прыжки и реплики
        // про то, что змейка не комментирует: опасность, «фух, успел!», комбо.
        const smGame = { on: false, touchAt: 0, tick: 0, bubbleAt: 0, dangerAt: 0, dangerUsed: true, apples: 0 };
        const SM_G_START  = ['Поехали!', 'Я болею за тебя!', 'Давай, змей!', 'Только не кусай себя'];
        const SM_G_FIRST  = ['Первое яблоко! Хорошее начало', 'Есть! Дальше — больше', 'Начало положено!'];
        const SM_G_COMBO  = ['Три подряд! Жми, жми, жми!', 'Яблоки летят одно за другим!', 'Комбо! Я записываю'];
        const SM_G_BONUS  = ['Золотое! Ну ты даёшь!', 'Блестящий ход!', 'Вот это аппетит!'];
        const SM_G_DANGER = ['Осторожно, впереди тупик!', 'Поворачивай! Поворачивай!', 'Ай-ай-ай, стена близко!', 'Не туда! Не туда!', 'Я закрываю глаза... нет, смотрю!'];
        const SM_G_ESCAPE = ['Фух! Успел!', 'Вот это реакция!', 'Уф, чуть сердце не остановилось. Откуда у меня сердце?', 'Ловко вывернулся!', 'Я чуть не поседел. Призраки не седеют'];
        const SM_G_PAUSE  = ['Перерыв? Я подержу место', 'Пауза. Дыши глубже'];
        const SM_G_RESUME = ['Вернулись! Я не отвлекался', 'Погнали дальше'];

        function smGameCan() {
            return !!(isSpatiEnabled && spatiMascot && spatiMascot.classList.contains('show') && !smHeld && !smRaf && !smDrag);
        }
        function smGameBubble(text, cd) {
            const now = Date.now();
            if (now - smGame.bubbleAt < (cd || 6000)) return false;
            smGame.bubbleAt = now; mascotSay(text);
            return true;
        }
        // глаза Спати следят за головой змейки (px, py — координаты на холсте 320×320)
        function smLook(px, py) {
            const cv = document.getElementById('skCanvas');
            if (!cv || !smGaze || !spatiMascot || smAsleep) return;
            const cr = cv.getBoundingClientRect(), mr = spatiMascot.getBoundingClientRect();
            if (!cr.width || !mr.width) return;
            const dx = cr.left + px / 320 * cr.width - (mr.left + mr.width / 2);
            const dy = cr.top + py / 320 * cr.height - (mr.top + mr.height * .4);
            const dist = Math.hypot(dx, dy) || 1;
            smGaze.style.setProperty('--gx', (dx / dist * .38).toFixed(2) + 'px');
            smGaze.style.setProperty('--gy', (dy / dist * .3).toFixed(2) + 'px');
        }
        function smLookReset() {
            if (!smGaze) return;
            smGaze.style.setProperty('--gx', '0px');
            smGaze.style.setProperty('--gy', '0px');
        }
        function mascotGame(type, d) {
            try {
                d = d || {};
                if (type === 'close') { smGame.on = false; smLookReset(); return; }
                if (!smGameCan()) return;
                const now = Date.now();
                smGame.on = true;
                // пока идёт партия, Спати не скучает и не засыпает
                if (type === 'open' || now - smGame.touchAt > 3000) { smGame.touchAt = now; smTouch(); }
                if (type === 'open') { smGame.apples = 0; mascotReact('look', true); smLook(160, 160); return; }
                if (type === 'watch') { if ((++smGame.tick & 1) === 0) smLook(d.x, d.y); return; }
                const sulky = spatiMood <= -2;   // обиженный Спати молча косится на поле
                if (type === 'start') {
                    smGame.apples = 0; smGame.dangerUsed = true;
                    if (sulky) { smEm('sad', 1500); return; }
                    mascotReact('hop', true);
                    if (Math.random() < .35) smGameBubble(smPick(SM_G_START), 3000);
                    return;
                }
                if (type === 'over') {
                    smLookReset();
                    const s = d.score || 0;
                    if (d.record) { mascotReact('dance', true); smEm('happy', 2600); }
                    else if (sulky) smEm('sad', 1500);
                    else if (s >= 20) mascotReact('cheer', true);
                    else if (d.reason === 'wall' || d.reason === 'obstacle') { smPlay('bump', 300); smEm('dizzy', 1400); }
                    else if (d.reason === 'self') { smPlay('tilt', 1200); smEm('sad', 1400); }
                    else { smPlay('sway', 1000); smEm('sad', 1500); }
                    return;
                }
                if (sulky) return;
                if (type === 'resume') { mascotReact('look', true); if (Math.random() < .5) smGameBubble(smPick(SM_G_RESUME), 3000); return; }
                if (type === 'pause')  { smEm('look', 1500); if (Math.random() < .5) smGameBubble(smPick(SM_G_PAUSE), 3000); return; }
                if (type === 'eat') {
                    smGame.apples++;
                    smPlay(d.combo ? 'jump' : 'hop', d.combo ? 750 : 600); smEm('happy', 700);
                    if (d.combo) smGameBubble(smPick(SM_G_COMBO), 4000);
                    else if (smGame.apples === 1) smGameBubble(smPick(SM_G_FIRST), 3000);
                    return;
                }
                if (type === 'bonus') {
                    smPlay('jump', 750); smEm('happy', 1200);
                    if (Math.random() < .5) smGameBubble(smPick(SM_G_BONUS), 4000);
                    return;
                }
                if (type === 'level') { mascotReact('cheer', true); return; }
                if (type === 'danger') {
                    if (now - smGame.dangerAt < 7000) return;
                    smGame.dangerAt = now; smGame.dangerUsed = false;
                    smPlay('bump', 300); smEm('surprised', 900);
                    smGameBubble(smPick(SM_G_DANGER), 2500);
                    return;
                }
                if (type === 'escape') {
                    if (smGame.dangerUsed || now - smGame.dangerAt > 2600) return;
                    smGame.dangerUsed = true;
                    smPlay('hop', 600); smEm('happy', 1200);
                    smGameBubble(smPick(SM_G_ESCAPE), 1500);
                }
            } catch (e) {}
        }

        // ---------- 2. Время суток: ночью шёпот и сон, по вечерам совет про музыку ----------
        function smNight() { return spPart() === 'night'; }
        function smTimeK() { return smNight() ? .5 : 1; }   // ночью Спати засыпает вдвое быстрее
        function smApplyTimeLook() { if (spatiMascot) spatiMascot.classList.toggle('night', smNight()); }
        const SM_TIME_IDLE = {
            morning: ['Утро. Самое время побить рекорд в змейке', 'Утром мысли ясные. Даже у призраков', 'С утра пикселей как будто больше'],
            day:     ['День в разгаре. Не забудь размяться', 'Дневной свет мне не мешает. Я же электронный', 'Говорят, сейчас самое продуктивное время'],
            evening: ['Вечер. Терминал светится особенно уютно', 'Вечерний режим: тихо и тепло', 'К вечеру курсор мигает спокойнее'],
            night:   ['Тсс... ночь на дворе', 'Уже поздно. Я не осуждаю. Шепчу', 'Ночью даже пиксели засыпают']
        };
        function smIdleLines() {
            const extra = SM_TIME_IDLE[spPart()].slice();
            if (spPart() === 'evening' && bgAudio.paused) extra.push('Вечер без музыки? Напиши play', 'Тишина в вечерний час? Включи плеер');
            return SM_IDLE_SAY.concat(extra, extra);   // реплики по времени суток звучат чаще
        }
        const SM_PART_CHANGE = {
            morning: ['Рассвет по системному времени. Доброе утро!', 'Наступило утро. Я проснулся раньше будильника'],
            day:     ['Наступил день. Процессор бодр', 'День начался. Время творить'],
            evening: ['Вечереет. Терминал стал уютнее', 'Наступил вечер. Самое время для музыки'],
            night:   ['Полночь. Перехожу на шёпот', 'Наступила ночь. Буду говорить тише']
        };
        const SM_LATE = ['Глубокая ночь. Тебе не пора отдохнуть?', 'Ты ещё не спишь? Я-то призрак, мне можно', 'Поздно уже. Сон — лучший патч для человека'];
        let smLastPart = spPart(), smLateSaid = false;
        setInterval(() => {
            const p = spPart();
            smApplyTimeLook();
            const can = isSpatiEnabled && smGameCan() && !smAsleep && !isTyping && !smGame.on;
            if (p !== smLastPart) {
                smLastPart = p; smLateSaid = false;
                if (can) { mascotReact(p === 'night' ? 'yawn' : 'wave', true); mascotSay(smPick(SM_PART_CHANGE[p])); }
                return;
            }
            const h = new Date().getHours();
            if (!smLateSaid && h >= 1 && h < 5 && can && Date.now() - spatiActivity < 15000) {
                smLateSaid = true;   // один раз за заход
                mascotReact('yawn', true); mascotSay(smPick(SM_LATE));
            }
        }, 20000);

        // ---------- 3. Редкие системные события ----------
        const SM_SYS = {
            offline:   { r: 'tilt',   em: 'sad',       wake: 1, say: ['Интернет пропал. У нас, к счастью, свой, Spatium', 'Связь с внешним миром оборвалась. Я остаюсь с тобой', 'Оффлайн. Тишина в эфире'] },
            online:    { r: 'hop',    em: 'happy',     say: ['Связь вернулась!', 'Снова онлайн. Я и не волновался', 'Интернет на месте. Можно выдыхать'] },
            slownet:   { r: 'look',   em: 'sleepy',    say: ['Сеть еле дышит. Потерпим', 'Что-то интернет заторможенный. Как я по утрам'] },
            lowbat:    { r: 'shake',  em: 'surprised', wake: 1, say: ['Батарея на исходе. Подключи зарядку?', 'Двадцать процентов. Я начинаю нервничать', 'Заряд низкий. Береги нас обоих'] },
            critbat:   { r: 'glitch', em: 'dizzy',     wake: 1, say: ['Десять процентов! Мне плохо...', 'Критический заряд! Спасай!', 'Свет моргает... это не я. Это батарея'] },
            plug:      { r: 'hop',    em: 'happy',     say: ['Зарядка! Чувствую жизнь!', 'Подключили. Теперь я бессмертен. Почти'] },
            unplug:    { r: 'look',   em: 'surprised', say: ['Отключили от розетки? Живу на батарейке', 'Питание автономное. Я экономлю'] },
            portrait:  { r: 'spin',   em: 'surprised', say: ['Экран повернули. Я стал выше!', 'Вертикальный режим! Теперь я башня'] },
            landscape: { r: 'spin',   em: 'happy',     say: ['Вид пошире. Простор!', 'Горизонтальный режим. Мне нравится'] },
            fsin:      { r: 'jump',   em: 'surprised', say: ['Во весь экран! Теперь я тут главный', 'Полный экран. Никого лишнего'] },
            fsout:     { r: 'hop',    em: 'normal',    say: ['Вернулись в окошко. Тоже уютно', 'Из полного экрана — в обычный. Привыкаю'] },
            installed: { r: 'dance',  em: 'happy',     say: ['Установили! Теперь я живу на твоём устройстве', 'Spatium OS — теперь приложение. Я переезжаю!'] }
        };
        Object.assign(SM_EV_CD, { offline: 15000, online: 15000, slownet: 60000, lowbat: 120000, critbat: 120000,
            plug: 30000, unplug: 30000, portrait: 8000, landscape: 8000, fsin: 6000, fsout: 6000, installed: 5000 });
        function smSysReact(type) {
            const e = SM_SYS[type];
            if (!e) return;
            if (smGame.on && !e.wake) return;   // во время партии не отвлекаем, кроме важного
            if (e.wake) smTouch();
            mascotReact(e.r, true);
            if (e.em) smEm(e.em, 1800);
            setTimeout(() => { if (isSpatiEnabled && !smHeld && !smDrag && !smAsleep) mascotSay(smPick(e.say)); }, 250);
        }
        window.addEventListener('offline', () => mascotEvent('offline'));
        window.addEventListener('online', () => mascotEvent('online'));
        window.addEventListener('appinstalled', () => mascotEvent('installed'));
        ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
            document.addEventListener(ev, () => mascotEvent((document.fullscreenElement || document.webkitFullscreenElement) ? 'fsin' : 'fsout')));
        try {
            const mq = window.matchMedia('(orientation: portrait)');
            const onRot = () => mascotEvent(mq.matches ? 'portrait' : 'landscape');
            if (mq.addEventListener) mq.addEventListener('change', onRot); else if (mq.addListener) mq.addListener(onRot);
        } catch (e) { /* ignore */ }
        try {
            const conn = navigator.connection;
            if (conn && conn.addEventListener) {
                let slow = /2g/.test(conn.effectiveType || '');
                conn.addEventListener('change', () => {
                    const now = /2g/.test(conn.effectiveType || '');
                    if (now && !slow) mascotEvent('slownet');
                    slow = now;
                });
            }
        } catch (e) { /* ignore */ }
        try {
            if (navigator.getBattery) navigator.getBattery().then((b) => {
                let warned = !b.charging && b.level <= .1 ? 2 : !b.charging && b.level <= .2 ? 1 : 0;
                let charging = b.charging;
                const check = () => {
                    if (b.charging || b.level > .25) warned = 0;
                    else if (b.level <= .1 && warned < 2) { warned = 2; mascotEvent('critbat'); }
                    else if (b.level <= .2 && warned < 1) { warned = 1; mascotEvent('lowbat'); }
                    if (b.charging !== charging) { charging = b.charging; mascotEvent(charging ? 'plug' : 'unplug'); }
                };
                b.addEventListener('levelchange', check);
                b.addEventListener('chargingchange', check);
            }).catch(() => {});
        } catch (e) { /* ignore */ }

        // ---------- 4. Отражение в окне плеера ----------
        // Мини-Спати сидит на верхней кромке блока трека, повторяет эмоции, движения, рот и взгляд
        // настоящего Спати и качает головой в такт, пока играет музыка.
        (function initPlayerMirror() {
            const host = musicPlayerModal && musicPlayerModal.querySelector('.track-info');
            if (!host || !smReact || !spatiMascot) return;
            const box = document.createElement('div');
            box.className = 'pm-spati';
            box.setAttribute('aria-hidden', 'true');
            box.title = 'Отражение Спати';
            const inner = smReact.cloneNode(true);
            inner.removeAttribute('id'); inner.removeAttribute('style');
            inner.className = 'sm-react';
            inner.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
            const note = document.createElement('span');
            note.className = 'pm-note'; note.textContent = '\u266A';
            box.appendChild(inner); box.appendChild(note);
            host.appendChild(box);
            const gaze = inner.querySelector('.sm-gaze');

            const syncState = () => {
                box.dataset.em = spatiMascot.dataset.em || 'normal';
                ['open', 'think', 'asleep', 'night'].forEach(c => box.classList.toggle(c, spatiMascot.classList.contains(c)));
            };
            const syncAnim = () => {
                const a = Array.from(smReact.classList).find(c => c.indexOf('a-') === 0) || '';
                inner.className = 'sm-react';
                if (a) { void inner.offsetWidth; inner.classList.add(a); }   // перезапуск, даже если движение повторилось
            };
            const syncGaze = () => {
                if (!gaze) return;
                ['--gx', '--gy'].forEach(k => gaze.style.setProperty(k, smGaze.style.getPropertyValue(k) || '0px'));
            };
            new MutationObserver(syncState).observe(spatiMascot, { attributes: true, attributeFilter: ['class', 'data-em'] });
            new MutationObserver(syncAnim).observe(smReact, { attributes: true, attributeFilter: ['class'] });
            if (smGaze) new MutationObserver(syncGaze).observe(smGaze, { attributes: true, attributeFilter: ['style'] });
            const syncMusic = () => box.classList.toggle('playing', !bgAudio.paused && !bgAudio.ended);
            ['play', 'pause', 'ended', 'playing'].forEach(ev => bgAudio.addEventListener(ev, syncMusic));
            syncState(); syncMusic();

            box.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (!isSpatiEnabled) return;
                smTouch();
                mascotReact(smPick(['wink', 'hop', 'sway']), false);
            });
        })();

        function mascotToggle(on) {
            if (!spatiMascot) return;
            if (on) {
                smLayout(); smApplyTimeLook();
                smIdleAt = Date.now() + 9000; smLastTouch = Date.now(); smStage = 0; smAsleep = false; spatiMascot.classList.remove('asleep');
                if (!smSaved.hint) {
                    setTimeout(() => {
                        if (isSpatiEnabled && !smHeld && !smSaved.hint) {
                            smSaved.hint = 1; smSave();
                            mascotSay('Меня можно трогать и таскать');
                        }
                    }, 7000);
                }
            } else {
                cancelAnimationFrame(smRaf); smRaf = 0; smHeld = false; smDrag = null; smAsleep = false; clearTimeout(smPetTimer); smDropApple(false); smGame.on = false;
                clearInterval(smTypeTimer); clearTimeout(smSayTimer); clearTimeout(smHoldTimer); clearTimeout(smEmTimer); clearTimeout(smAnimTimer);
                spatiMascot.classList.remove('held', 'flying', 'gliding', 'asleep');
                spatiMascot.dataset.em = 'normal';
                smReact.className = 'sm-react'; smReact.style.transform = '';
                smBubble.classList.remove('show');
            }
        }

        function printTextTyped(text, onComplete) {
            if (!terminalOutput) return;
            isTyping = true;
            fullTypingText = text;
            activeTypingLine = document.createElement('div');
            terminalOutput.appendChild(activeTypingLine);

            currentTypingCallback = onComplete;
            let index = 0;
            const line = activeTypingLine;
            const spatiLine = isSpatiEnabled && !!spatiMascot && (forceSpati || /^СПАТИ:/.test(text));

            function typeNextChar() {
                if (!isTyping) return;
                if (index < text.length) {
                    const ch = text.charAt(index);
                    line.textContent += ch;
                    index++;
                    if (spatiLine) {
                        // рот хлопает на буквах и закрывается на пробелах и знаках
                        if (/[a-zа-яё0-9]/i.test(ch)) { mouthFlip = !mouthFlip; mascotMouth(mouthFlip); }
                        else mascotMouth(false);
                    }
                    scrollToBottom();
                    currentTypingTimeout = setTimeout(typeNextChar, Math.floor(Math.random() * 40) + 50);
                } else {
                    isTyping = false;
                    currentTypingTimeout = null;
                    activeTypingLine = null;
                    currentTypingCallback = null;
                    if (spatiLine) mascotMouth(false);
                    // Опускаем скролл до конца после завершения печати
                    scrollToBottom();
                    if (onComplete) onComplete();
                }
            }

            if (!spatiLine) { typeNextChar(); return; }

            // Спати «собирается с мыслями»: точки, глаза бегают, потом печатает
            const thinkMs = Math.floor(Math.random() * 450) + 450;
            const t0 = Date.now();
            mascotThink(thinkMs);
            function think() {
                if (!isTyping) return;
                if (Date.now() - t0 >= thinkMs) {
                    line.textContent = '';
                    mascotThink(0);
                    typeNextChar();
                    return;
                }
                line.textContent = '.'.repeat(1 + Math.floor((Date.now() - t0) / 200) % 3);
                scrollToBottom();
                currentTypingTimeout = setTimeout(think, 100);
            }
            think();
        }

        function printTextInstant(text) {
            if (!terminalOutput) return;
            if (isSpatiEnabled && /^СПАТИ:/.test(text)) mascotChatter(text.length);
            const line = document.createElement('div');
            line.textContent = text;
            terminalOutput.appendChild(line);
            scrollToBottom();
        }

        let lastCmdRaw = '', echoRuns = 0, clearRuns = 0, helpRuns = 0, unknownRuns = 0, logoClicks = 0;
        function unknownCmd() { unlock('unknown'); mascotEvent('unknown'); if (++unknownRuns >= 5) unlock('unknown5'); if (unknownRuns >= 20) unlock('unknown20'); if (unknownRuns >= 50) unlock('unknown50'); }
        if (logoWrapper) logoWrapper.addEventListener('click', () => { if (++logoClicks >= 5) unlock('logo5'); if (logoClicks >= 25) unlock('logo25'); });

        function handleCommand(rawCmd, quiet) {
            const cmd = rawCmd.trim();
            const mainCmd = cmd.split(' ')[0].toLowerCase().replace(/[,.:;!?]+$/, '');

            if (!quiet) printTextInstant(`> ${rawCmd}`);
            if (cmd === '') return;
            unlock('first_cmd');
            procLog('shell', `exec ${mainCmd}`);
            mascotCmd(mainCmd, cmd);
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
                    printTextTyped("Укажите цвет. Пример: color red. Список: color help");
                } else if (colorVal.toLowerCase() === 'help') {
                    unlock('color_help');
                    printColorHelp();
                } else {
                    changeTerminalColor(colorVal);
                    if (state.stats.colors.includes('green') && colorVal.toLowerCase() === 'green') unlock('color_green');
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
                if (!btn || !isBooted || isTyping || nickMode) return;
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
        // ЗВУК КЛАВИШ
        // ==========================================
        ['keydown', 'pointerdown', 'touchstart', 'wheel'].forEach(ev => {
            window.addEventListener(ev, (e) => {
                if (sfxBootPending) sfxLateBoot();
                else if (sfxCtx && sfxCtx.state === 'suspended') sfxResume(sfxCtx);
                if (ev === 'keydown' && isBooted && !e.ctrlKey && !e.metaKey && !e.altKey
                    && !['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key) && !/^F\d+$/.test(e.key)) {
                    const sfxKind = { Enter: 'send', Tab: 'tab', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
                    if (sfxKind && !isTyping && (e.target === hiddenInput || e.target === document.body)) sfxKey(sfxKind);
                }
            }, { capture: true, passive: true });
        });

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
        // NEOFETCH
        // ==========================================
        (function initNeofetch() {
            TAB_COMMANDS.push('neofetch');
            const LOGO = [' ########', '##      ##', '##', ' ########', '        ##', '##      ##', ' ########'];
            const dur = (ms) => {
                const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
                return h ? `${h} ч ${m} мин` : m ? `${m} мин ${s % 60} с` : `${s} с`;
            };
            const colorName = () => {
                const cur = document.documentElement.style.getPropertyValue('--crt-color').trim().toLowerCase();
                if (!cur) return 'DEFAULT';
                const n = Object.keys(colorPalette).find(k => String(colorPalette[k].color).toLowerCase() === cur);
                return n ? n.toUpperCase() : 'СВОЙ';
            };
            const meter = (id) => (document.getElementById(id) || {}).textContent || '—';

            consoleCommands.neofetch = function () {
                unlock('neofetch');
                const total = ACHIEVEMENTS.length, got = unlockedCount(), pct = Math.floor(got / total * 100);
                const rank = rankFor(pct), up = dur(performance.now());
                const st = state.stats, sn = st.snake;
                const title = `${state.nick || 'guest'}@spatium`;
                const rows = [
                    ['ОС', 'Spatium OS · ядро 1.0'],
                    ['Хост', 'tty0'],
                    ['Аптайм', up],
                    ['Визитов', `${st.visits || 1}${st.first ? ' · с ' + fmtDate(st.first) : ''}`],
                    ['Ранг', rank],
                    ['Достиж.', `${got}/${total} (${pct}%)`],
                    ['Змейка', `рекорд ${sn.best} · партий ${sn.games}${sn.last ? ' · прошлая ' + sn.last.s : ''}`],
                    ['Ресурсы', `CPU ${meter('v-cpu')} · MEM ${meter('v-mem')}`],
                    ['Цвет', colorName()],
                    ['Трек', `${trackLabel(currentTrackIndex)} ${bgAudio.paused ? '[||]' : '[>]'}`],
                    ['Громк.', bgAudio.muted ? 'MUTED' : volPercent() + '%'],
                    ['Звук', `клавиши ${sfxEnabled ? 'вкл' : 'выкл'}`],
                    ['Спати', isSpatiEnabled ? 'онлайн' : 'спит']
                ];

                const box = elem('div', 'nf');
                const logo = elem('div', 'nf-logo');
                LOGO.forEach(l => logo.appendChild(elem('div', '', l)));
                const us = elem('div');
                us.appendChild(document.createTextNode('          '));
                us.appendChild(elem('span', 'nf-us', '######'));
                logo.appendChild(us);
                box.appendChild(logo);

                const info = elem('div', 'nf-info');
                info.appendChild(elem('div', 'nf-title', title));
                info.appendChild(elem('div', 'nf-sep', '-'.repeat(title.length)));
                rows.forEach(([k, v]) => {
                    const r = elem('div', 'nf-row');
                    r.appendChild(elem('span', 'nf-k', k));
                    r.appendChild(elem('span', 'nf-v', v));
                    info.appendChild(r);
                });
                const sw = elem('div', 'nf-sw');
                const names = Object.keys(colorPalette);
                for (let i = 0; i < 8 && names.length; i++) {
                    const c = elem('i');
                    c.style.background = colorPalette[names[Math.floor(i * names.length / 8)]].color;
                    sw.appendChild(c);
                }
                info.appendChild(sw);
                box.appendChild(info);
                terminalOutput.appendChild(box);
                scrollToBottom();

                if (isSpatiEnabled) {
                    printTextInstant(spatiPick([
                        `СПАТИ: Ранг ${rank}. ${pct < 25 ? 'Всё впереди' : pct < 75 ? 'Достойно' : 'Почти легенда'}`,
                        'СПАТИ: Красиво. Скриншот сделаешь?',
                        `СПАТИ: Аптайм ${up}. Я не устал, если что`,
                        'СПАТИ: Это моя анкета. Заполнял сам'
                    ]));
                }
            };
        })();

        // ==========================================
        // ЗМЕЙКА (SNAKE.EXE)
        // ==========================================
        (function initSnake() {
            const win = document.getElementById('snakeWindow');
            if (!win) return;
            const G = 20, C = 16, LVL_STEP = 8;
            const cv = document.getElementById('skCanvas'), cx = cv.getContext('2d');
            const elScore = document.getElementById('skScore'), elBest = document.getElementById('skBest'), elLen = document.getElementById('skLen'), elLvl = document.getElementById('skLvl');
            const btnGo = document.getElementById('skStart'), btnMode = document.getElementById('skMode');
            const btnObst = document.getElementById('skObst'), btnSpeed = document.getElementById('skSpeed');
            const btnSkin = document.getElementById('skSkin'), btnHead = document.getElementById('skHead');
            const elTop = document.getElementById('skTop');
            const sk = state.stats.snake;
            const IDS = ACHIEVEMENTS.filter(a => a.cat === 'ЗМЕЙКА' && a.id !== 'snake_all').map(a => a.id);
            const sUn = (id) => { unlock(id); if (IDS.every(i => state.ach[i])) unlock('snake_all'); };
            SECRET_HINTS.snake_13 = 'Закончи партию в змейке ровно с 13 очками';
            TAB_COMMANDS.push('snake');
            SECRET_HINTS.spati_snake = 'Скажи: «спати змейка» или «спати запусти змейку»';

            // ---- скины, формы головы и сохранённые настройки ----
            const SKINS = [
                { id: 'theme', name: 'ТЕМА', color: null },
                { id: 'cyan', name: 'ЦИАН', color: '#2ee6ff' },
                { id: 'pink', name: 'РОЗОВЫЙ', color: '#ff5fd2' },
                { id: 'red', name: 'КРАСНЫЙ', color: '#ff4d4d' },
                { id: 'lime', name: 'ЛАЙМ', color: '#b6ff3a' },
                { id: 'violet', name: 'ФИОЛЕТ', color: '#a77bff' }
            ];
            const HEADS = [
                { id: 'square', name: 'КВАДРАТ' }, { id: 'round', name: 'КРУГ' }, { id: 'diamond', name: 'РОМБ' },
                { id: 'arrow', name: 'СТРЕЛКА' }, { id: 'eyes', name: 'ГЛАЗА' }
            ];
            if (!SKINS.some(k => k.id === sk.skin)) sk.skin = 'theme';
            if (!HEADS.some(k => k.id === sk.head)) sk.head = 'square';
            // данные могли прийти из импорта/старой версии — приводим к ожидаемому виду
            const okEntry = (e) => e && Number.isFinite(+e.s) && Number.isFinite(+e.d) && +e.s >= 0;
            sk.top = (Array.isArray(sk.top) ? sk.top : []).filter(okEntry)
                .map(e => ({ s: Math.floor(+e.s), d: +e.d, w: e.w ? 1 : 0, o: e.o ? 1 : 0, v: e.v ? 1 : 0 }))
                .sort((a, b) => b.s - a.s || b.d - a.d).slice(0, 5);
            sk.last = okEntry(sk.last) ? { s: Math.floor(+sk.last.s), d: +sk.last.d } : null;

            const pad2 = (n) => String(n).padStart(2, '0');
            const fmtDate = (t) => { const d = new Date(t); return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${pad2(d.getFullYear() % 100)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
            const ago = (t) => {
                const m = Math.floor((Date.now() - t) / 60000);
                if (m < 2) return 'только что';
                if (m < 60) return m + ' мин назад';
                const h = Math.floor(m / 60);
                return h < 24 ? h + ' ч назад' : Math.floor(h / 24) + ' дн. назад';
            };
            const tagsOf = (e) => [e.w ? 'ПОРТАЛЫ' : '', e.o ? 'БЛОКИ' : '', e.v ? 'УСК' : ''].filter(Boolean).join(' · ');
            const setT = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };

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
                () => sk.best ? `СПАТИ: Рекорд ${sk.best}. Попробуешь побить?` : "СПАТИ: Первая партия? Не страшно, врезаются все",
                () => sk.last ? `СПАТИ: В прошлый раз было ${sk.last.s} (${ago(sk.last.d)}). Сегодня лучше?` : "СПАТИ: Прошлых партий в памяти нет. Начнём с чистого листа"];
            const S_SULK = ["СПАТИ: Играй сам. Я всё ещё обижен"];
            const S_LOW = ["СПАТИ: Быстро. Я даже моргнуть не успел", "СПАТИ: Разминка засчитана", "СПАТИ: Бывает. Яблоки никуда не денутся"];
            const S_MID = ["СПАТИ: Неплохо. Ещё разок?", "СПАТИ: Нормально. Хвост не жалко?", "СПАТИ: Достойно. Но можно длиннее"];
            const S_HIGH = ["СПАТИ: Вот это длина! Уважаю", "СПАТИ: Змея стала питоном. Достойно", "СПАТИ: Процессор впечатлён"];
            const S_WALL = ["СПАТИ: Стена не двигается. Проверено", "СПАТИ: Лбом о стену — классика"];
            const S_SELF = ["СПАТИ: Ты укусил себя. Типично для змей", "СПАТИ: Хвост оказался быстрее"];
            const S_OBST = ["СПАТИ: Это не стена, это дизайн уровня", "СПАТИ: Блок стоял там давно. Ты его просто не заметил"];
            const S_REC = [() => `СПАТИ: Новый рекорд — ${score}! Записал в лог золотыми буквами`, () => `СПАТИ: ${score}! Такого в моей базе ещё не было`,
                () => oldBest ? `СПАТИ: Рекорд ${score}. Прошлый был ${oldBest}` : `СПАТИ: Первый рекорд — ${score}. Начало положено`];
            const S_13 = ["СПАТИ: Тринадцать. Не к добру"];
            const S_BONUS = ["СПАТИ: Золотое! Жадность — двигатель прогресса", "СПАТИ: Блестит. Правильно взял"];
            const S_MILE = { 10: "СПАТИ: Десять! Процессор вспотел", 25: "СПАТИ: Двадцать пять. Ты точно не бот?", 50: "СПАТИ: Полтинник! Я в шоке", 100: "СПАТИ: Сто. Снимаю виртуальную шляпу" };
            const S_LVL = [() => `СПАТИ: Уровень ${level}. Дальше только интереснее`, () => `СПАТИ: ${level}-й уровень. Темп растёт`];
            const S_LVL_OBS = [() => `СПАТИ: Уровень ${level}. Я добавил пару блоков. Не благодари`, () => `СПАТИ: ${level}-й уровень. Поле стало теснее`];
            // сравнение с прошлой партией
            function cmpLines(prev) {
                const p = prev.s, diff = score - p;
                if (diff > 0) return [`СПАТИ: В прошлый раз было ${p}, сейчас ${score}. Растёшь`, `СПАТИ: ${score} против ${p} в прошлый раз. Прогресс налицо`, `СПАТИ: Лучше прошлой партии на ${diff}. Записал`];
                if (diff < 0) return [`СПАТИ: В прошлый раз было ${p}. Сегодня на ${-diff} меньше. Бывает`, `СПАТИ: ${score} против ${p}. Прошлая попытка была удачнее`, `СПАТИ: В прошлый раз было ${p}. Реванш?`];
                return [`СПАТИ: Снова ${p}, как в прошлый раз. Стабильность — признак мастерства`, `СПАТИ: Ровно столько же, сколько в прошлый раз. Подозрительно`];
            }

            const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
            const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
            let isOpen = false, phase = 'idle', timer = 0, newRecord = false;
            let wrap = !!sk.wrap, obst = !!sk.obst, speed = !!sk.speed, bodyCol = null;
            let snake, dir, queue, food, bonus, score, apples, eatTimes, obs = [], level = 1, flashUntil = 0, oldBest = 0, lastEntry = null, dangerNow = false;

            const beep = (o) => { const c = sfxReady(); if (c) sfxTone(c.currentTime + 0.001, o); };
            // вибрация (Android/Chrome; на iOS Safari не поддерживается — молча игнорируется)
            const buzz = (p) => { try { if (isOpen && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
            const delay = () => speed ? Math.max(45, 125 - score * 3.5) : Math.max(65, 140 - score * 1.5);

            const taken = (x, y) => snake.some(s => s.x === x && s.y === y)
                || (food && food.x === x && food.y === y) || (bonus && bonus.x === x && bonus.y === y)
                || obs.some(o => o.x === x && o.y === y);

            function spot() {
                for (let i = 0; i < 400; i++) {
                    const x = rnd(0, G - 1), y = rnd(0, G - 1);
                    if (!taken(x, y)) return { x, y };
                }
                return null;
            }

            // блок не появляется вплотную к голове, чтобы смерть всегда была «справедливой»
            function obstSpot() {
                const h = snake[0];
                for (let i = 0; i < 300; i++) {
                    const x = rnd(0, G - 1), y = rnd(0, G - 1);
                    if (Math.abs(x - h.x) + Math.abs(y - h.y) < 5 || taken(x, y)) continue;
                    return { x, y };
                }
                return null;
            }

            function updateUi() {
                const sc = SKINS.find(k => k.id === sk.skin), hd = HEADS.find(k => k.id === sk.head);
                bodyCol = sc.color;
                setT(btnMode, wrap ? 'ПОРТАЛЫ' : 'СТЕНЫ');
                setT(btnObst, 'БЛОКИ: ' + (obst ? 'ВКЛ' : 'ВЫКЛ'));
                setT(btnSpeed, 'ТЕМП: ' + (speed ? 'УСКОРЕНИЕ' : 'ОБЫЧНЫЙ'));
                setT(btnSkin, 'СКИН: ' + sc.name);
                setT(btnHead, 'ГОЛОВА: ' + hd.name);
            }

            function renderTop() {
                if (!elTop) return;
                elTop.textContent = '';
                const title = document.createElement('div');
                title.className = 'sk-top-title'; title.textContent = 'ТОП-5 ПАРТИЙ';
                elTop.appendChild(title);
                if (!sk.top.length) {
                    const empty = document.createElement('div');
                    empty.className = 'sk-top-empty'; empty.textContent = 'ПОКА ПУСТО — СЫГРАЙ ПАРТИЮ';
                    elTop.appendChild(empty);
                    return;
                }
                sk.top.forEach((e, i) => {
                    const row = document.createElement('div');
                    row.className = 'sk-top-row' + (e === lastEntry ? ' new' : '');
                    [`${i + 1}.`, String(e.s), fmtDate(e.d), tagsOf(e)].forEach(t => {
                        const s = document.createElement('span'); s.textContent = t; row.appendChild(s);
                    });
                    elTop.appendChild(row);
                });
            }

            function reset() {
                clearTimeout(timer);
                if (elSpati) elSpati.textContent = '';
                snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
                dir = 'right'; queue = []; score = 0; apples = 0; eatTimes = []; bonus = null; food = null; newRecord = false;
                obs = []; level = 1; flashUntil = 0; lastEntry = null; dangerNow = false;
                food = spot(); phase = 'idle';
                updateUi(); renderTop();
                draw();
            }

            function run() { const was = phase; phase = 'run'; draw(); clearTimeout(timer); timer = setTimeout(step, delay()); if (was !== 'run') mascotGame(was === 'pause' ? 'resume' : 'start'); }

            function toggle() {
                if (phase === 'run') { phase = 'pause'; clearTimeout(timer); sUn('snake_pause'); mascotGame('pause'); draw(); }
                else if (phase === 'over') { reset(); run(); }
                else run();
            }

            function turn(d, swipe) {
                if (phase === 'over') return;
                const last = queue.length ? queue[queue.length - 1] : dir;
                const opp = DIRS[d][0] + DIRS[last][0] === 0 && DIRS[d][1] + DIRS[last][1] === 0;
                if (d !== last && !opp && queue.length < 2) { queue.push(d); buzz(8); if (swipe) sUn('snake_swipe'); }
                if (phase !== 'run') run();
            }

            function levelUp() {
                if (obst) for (let i = 0; i < 3 && obs.length < 40; i++) { const p = obstSpot(); if (p) obs.push(p); }
                flashUntil = Date.now() + 1400;
                beep({ type: 'triangle', f0: 440, f1: 880, dur: 0.15, gain: 0.06 });
                if (obst && level >= 5) sUn('snake_lvl5');
                say(obst ? S_LVL_OBS : S_LVL);
                mascotGame('level', { level });
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
                if (speed && score >= 15) sUn('snake_turbo');
                if (sk.apples >= 200) sUn('snake_total200');
                if (sk.apples >= 1000) sUn('snake_total1000');
                const nl = 1 + Math.floor(score / LVL_STEP);
                while (level < nl) { level++; levelUp(); }
                if (isBonus) say(S_BONUS);
                [10, 25, 50, 100].forEach(m => { if (before < m && score >= m) say([S_MILE[m]], true); });
                eatTimes.push(now); if (eatTimes.length > 3) eatTimes.shift();
                if (eatTimes.length === 3 && now - eatTimes[0] <= 5000) sUn('snake_quick');
                mascotGame(isBonus ? 'bonus' : 'eat', { score, combo: eatTimes.length === 3 && now - eatTimes[0] <= 5000 });
                saveState();
            }

            // клетка впереди смертельна? (нужно, чтобы Спати охал и выдыхал)
            function aheadDeadly() {
                const h = snake[0], d = DIRS[dir];
                let nx = h.x + d[0], ny = h.y + d[1];
                if (nx < 0 || nx >= G || ny < 0 || ny >= G) { if (!wrap) return true; nx = (nx + G) % G; ny = (ny + G) % G; }
                if (obs.some(o => o.x === nx && o.y === ny)) return true;
                return snake.slice(0, -1).some(s => s.x === nx && s.y === ny);
            }

            function step() {
                if (phase !== 'run') return;
                dir = queue.length ? queue.shift() : dir;
                const wasDanger = dangerNow; dangerNow = false;
                const h = snake[0];
                let nx = h.x + DIRS[dir][0], ny = h.y + DIRS[dir][1], wrapped = false;
                if (nx < 0 || nx >= G || ny < 0 || ny >= G) {
                    if (!wrap) return finish('wall');
                    nx = (nx + G) % G; ny = (ny + G) % G; wrapped = true;
                }
                if (obs.some(o => o.x === nx && o.y === ny)) return finish('obstacle');
                const eatF = food && nx === food.x && ny === food.y;
                const eatB = bonus && nx === bonus.x && ny === bonus.y;
                if ((eatF || eatB ? snake : snake.slice(0, -1)).some(s => s.x === nx && s.y === ny)) return finish('self');
                snake.unshift({ x: nx, y: ny });
                if (wrapped) sUn('snake_wrap');
                if (eatF || eatB) eat(!!eatB); else snake.pop();
                if (bonus && --bonus.ttl <= 0) bonus = null;
                if (!food) return finish('full');
                if (wasDanger) mascotGame('escape');
                if (!queue.length && aheadDeadly()) { dangerNow = true; mascotGame('danger'); }
                mascotGame('watch', { x: snake[0].x * C + C / 2, y: snake[0].y * C + C / 2 });
                draw();
                timer = setTimeout(step, delay());
            }

            function finish(reason) {
                phase = 'over'; clearTimeout(timer);
                const prev = sk.last, now = Date.now();   // прошлая партия — до перезаписи
                sk.games++;
                oldBest = sk.best;
                if (score > sk.best) { sk.best = score; newRecord = score > 0; }
                sk.last = { s: score, d: now };
                let place = 0;
                if (score > 0) {
                    lastEntry = { s: score, d: now, w: wrap ? 1 : 0, o: obst ? 1 : 0, v: speed ? 1 : 0 };
                    sk.top.push(lastEntry);
                    sk.top.sort((a, b) => b.s - a.s || b.d - a.d);
                    sk.top = sk.top.slice(0, 5);
                    place = sk.top.indexOf(lastEntry) + 1;
                    if (!place) lastEntry = null;
                }
                saveState();
                beep({ type: 'sawtooth', f0: 320, f1: 60, dur: 0.4, gain: 0.07, lp: [1400, 150] });
                buzz([70, 40, 150]);
                screen.classList.remove('shake'); void screen.offsetWidth; screen.classList.add('shake');
                if (reason === 'wall') sUn('snake_wall');
                if (reason === 'self') sUn('snake_self');
                if (score === 13) sUn('snake_13');
                if (sk.games >= 5) sUn('snake_games5');
                if (sk.games >= 25) sUn('snake_games25');
                const reasonPool = reason === 'self' ? S_SELF : reason === 'wall' ? S_WALL : reason === 'obstacle' ? S_OBST : [];
                const base = (score < 5 ? S_LOW : score < 20 ? S_MID : S_HIGH).concat(reasonPool);
                if (place) base.push(`СПАТИ: ${score} — это ${place}-е место в твоём топ-5`);
                let pool;
                if (newRecord) pool = S_REC;
                else if (score === 13) pool = S_13;
                else if (prev && Math.random() < 0.7) pool = cmpLines(prev);
                else pool = base;
                say(pool, true);
                mascotGame('over', { score, record: newRecord || reason === 'full', reason });
                if (newRecord) { spatiMood = spatiClamp(spatiMood + 1); spatiMoodAt = Date.now(); }
                renderTop();
                draw();
            }

            function drawHead(s, c) {
                const x = s.x * C, y = s.y * C, m = x + C / 2, n = y + C / 2;
                cx.fillStyle = c;
                if (sk.head === 'round') {
                    cx.beginPath(); cx.arc(m, n, C / 2 - 1, 0, Math.PI * 2); cx.fill();
                } else if (sk.head === 'diamond') {
                    cx.beginPath(); cx.moveTo(m, y + 0.5); cx.lineTo(x + C - 0.5, n); cx.lineTo(m, y + C - 0.5); cx.lineTo(x + 0.5, n); cx.closePath(); cx.fill();
                } else if (sk.head === 'arrow') {
                    const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir];
                    cx.save(); cx.translate(m, n); cx.rotate(a);
                    cx.beginPath(); cx.moveTo(7, 0); cx.lineTo(-6, -7); cx.lineTo(-3, 0); cx.lineTo(-6, 7); cx.closePath(); cx.fill();
                    cx.restore();
                } else {
                    cx.fillRect(x + 1, y + 1, C - 2, C - 2);
                    if (sk.head === 'eyes') {
                        const f = DIRS[dir], sd = [-f[1], f[0]];
                        cx.shadowBlur = 0; cx.fillStyle = '#000';
                        [-1, 1].forEach(k => cx.fillRect(Math.round(m + f[0] * 3 + sd[0] * 3.5 * k - 1.5), Math.round(n + f[1] * 3 + sd[1] * 3.5 * k - 1.5), 3, 3));
                    }
                }
            }

            function draw() {
                const col = getComputedStyle(win).getPropertyValue('--crt-color').trim() || '#33ff33';
                const bc = bodyCol || col;
                cx.clearRect(0, 0, 320, 320);
                cx.globalAlpha = 0.14; cx.fillStyle = col;
                for (let x = 0; x < G; x++) for (let y = 0; y < G; y++) cx.fillRect(x * C + 7, y * C + 7, 2, 2);
                // препятствия: полая рамка с крестом, чтобы не путать со змеёй
                if (obs.length) {
                    cx.strokeStyle = col; cx.lineWidth = 1;
                    obs.forEach(o => {
                        const x = o.x * C, y = o.y * C;
                        cx.globalAlpha = 0.3; cx.fillStyle = col; cx.fillRect(x + 1, y + 1, C - 2, C - 2);
                        cx.globalAlpha = 0.95; cx.strokeRect(x + 1.5, y + 1.5, C - 3, C - 3);
                        cx.beginPath(); cx.moveTo(x + 3, y + 3); cx.lineTo(x + C - 3, y + C - 3); cx.moveTo(x + C - 3, y + 3); cx.lineTo(x + 3, y + C - 3); cx.stroke();
                    });
                }
                const n = snake.length;
                snake.forEach((s, i) => {
                    cx.globalAlpha = 0.5 + 0.5 * (1 - i / n);
                    cx.shadowColor = bc; cx.shadowBlur = i === 0 ? 10 : 0;
                    if (i === 0) drawHead(s, bc);
                    else { cx.fillStyle = bc; cx.fillRect(s.x * C + 1, s.y * C + 1, C - 2, C - 2); }
                });
                cx.shadowBlur = 0; cx.globalAlpha = 1;
                if (food) { cx.fillStyle = '#fff'; cx.shadowColor = '#fff'; cx.shadowBlur = 8; cx.fillRect(food.x * C + 4, food.y * C + 4, C - 8, C - 8); }
                if (bonus && (bonus.ttl > 14 || bonus.ttl % 4 < 2)) {
                    cx.fillStyle = '#ffb627'; cx.shadowColor = '#ffb627'; cx.shadowBlur = 12;
                    cx.fillRect(bonus.x * C + 2, bonus.y * C + 2, C - 4, C - 4);
                    cx.fillStyle = '#000'; cx.shadowBlur = 0; cx.fillRect(bonus.x * C + 6, bonus.y * C + 6, C - 12, C - 12);
                }
                cx.shadowBlur = 0;
                if (phase === 'run' && Date.now() < flashUntil) {
                    cx.fillStyle = 'rgba(0,0,0,.7)'; cx.fillRect(0, 140, 320, 40);
                    cx.fillStyle = col; cx.textAlign = 'center'; cx.font = '11px "Press Start 2P", monospace';
                    cx.fillText(`УРОВЕНЬ ${level}`, 160, 165);
                }
                if (phase !== 'run') {
                    cx.fillStyle = 'rgba(0,0,0,.65)'; cx.fillRect(0, 0, 320, 320);
                    const t = phase === 'idle' ? ['SNAKE', '', 'ПРОБЕЛ ИЛИ ТАП', 'ДЛЯ СТАРТА']
                        : phase === 'pause' ? ['ПАУЗА']
                        : ['ИГРА ОКОНЧЕНА', '', `СЧЁТ ${score}`, `УРОВЕНЬ ${level}`].concat(newRecord ? ['', 'НОВЫЙ РЕКОРД!'] : []);
                    cx.fillStyle = col; cx.textAlign = 'center'; cx.font = '11px "Press Start 2P", monospace';
                    t.forEach((l, i) => cx.fillText(l, 160, 160 - (t.length - 1) * 12 + i * 24));
                }
                setT(elScore, score); setT(elBest, Math.max(sk.best, score)); setT(elLen, snake.length); setT(elLvl, level);
                setT(btnGo, { idle: 'СТАРТ', run: 'ПАУЗА', pause: 'ДАЛЬШЕ', over: 'ЗАНОВО' }[phase]);
            }

            function open() {
                if (!isBooted) return;
                isOpen = true; win.classList.remove('hidden');
                if (hiddenInput) hiddenInput.blur();
                reset(); sUn('snake_start');
                say(spatiMood <= -2 ? S_SULK : S_OPEN, true);
                mascotGame('open');
            }
            function close() {
                if (!isOpen) return;
                isOpen = false; clearTimeout(timer); phase = 'idle'; win.classList.add('hidden'); mascotGame('close');
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

            // режимы можно менять только вне партии — смена начинает поле заново
            function flip(btn, apply) {
                btn.addEventListener('click', () => {
                    btn.blur();
                    if (phase === 'run' || phase === 'pause') return;
                    apply(); saveState(); reset();
                });
            }
            flip(btnMode, () => { wrap = !wrap; sk.wrap = wrap; });
            flip(btnObst, () => { obst = !obst; sk.obst = obst; });
            flip(btnSpeed, () => { speed = !speed; sk.speed = speed; });
            // внешний вид можно менять в любой момент
            function cycle(btn, list, key) {
                btn.addEventListener('click', () => {
                    btn.blur();
                    const i = list.findIndex(k => k.id === sk[key]);
                    sk[key] = list[(i + 1) % list.length].id;
                    saveState(); sUn('snake_skin'); updateUi(); draw();
                });
            }
            cycle(btnSkin, SKINS, 'skin');
            cycle(btnHead, HEADS, 'head');

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
            updateUi(); renderTop();

            consoleCommands.snake = function (args) {
                const a = (args[0] || '').toLowerCase();
                if (a === 'best' || a === 'top') {
                    const lines = [`ЗМЕЙКА: РЕКОРД ${sk.best} · ПАРТИЙ ${sk.games} · ЯБЛОК ${sk.apples}`];
                    if (sk.last) lines.push(`ПРОШЛАЯ ПАРТИЯ: ${sk.last.s} (${fmtDate(sk.last.d)})`);
                    if (sk.top.length) {
                        lines.push('ТОП-5:');
                        sk.top.forEach((e, i) => lines.push(`  ${i + 1}. ${String(e.s).padStart(3)}  ${fmtDate(e.d)}${tagsOf(e) ? '  ' + tagsOf(e) : ''}`));
                    }
                    printTextInstant(lines.join('\n'));
                    return;
                }
                open();
                printTextInstant('SNAKE.EXE ЗАПУЩЕН. Стрелки/WASD, пробел — пауза, Esc — выход. (snake best — статистика и топ-5)');
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

        // ==========================================
        // ПЕРЕТАСКИВАЕМЫЕ ОКНА
        // ==========================================
        (function initWindows() {
            const SEL = '.ach-window, .music-player-modal';
            const POS_KEY = 'spatium_win_pos';
            const order = [];
            let saved = {};
            try { saved = JSON.parse(localStorage.getItem(POS_KEY) || '{}') || {}; } catch (err) { saved = {}; }
            const savePos = () => { try { localStorage.setItem(POS_KEY, JSON.stringify(saved)); } catch (err) { /* ignore */ } };
            const box = () => screen.getBoundingClientRect();

            // окна лежат под CRT-слоем (z-index 30), поэтому z-index только 20..24
            function front(w) {
                const i = order.indexOf(w);
                if (i !== -1) order.splice(i, 1);
                order.push(w);
                order.forEach((el, k) => { el.style.zIndex = 20 + Math.min(k, 4); });
            }

            function place(w, l, t) {
                const r = box(), W = w.offsetWidth || 300;
                l = Math.max(-W + 90, Math.min(r.width - 90, l));
                t = Math.max(0, Math.min(r.height - 40, t));
                w.classList.add('win-moved');
                w.style.left = l + 'px'; w.style.top = t + 'px'; w.style.right = 'auto';
            }
            const clampOne = (w) => place(w, parseFloat(w.style.left) || 0, parseFloat(w.style.top) || 0);

            Object.keys(saved).forEach(id => {
                const el = document.getElementById(id);
                const p = saved[id];
                if (el && Array.isArray(p) && isFinite(p[0]) && isFinite(p[1])) place(el, p[0], p[1]);
            });

            let drag = null;
            screen.addEventListener('pointerdown', (e) => {
                const w = e.target.closest && e.target.closest(SEL);
                if (!w) return;
                front(w);
                const head = e.target.closest('.player-header');
                if (!head || e.target.closest('button') || e.button > 0) return;
                const wr = w.getBoundingClientRect();
                drag = { w, head, id: e.pointerId, dx: e.clientX - wr.left, dy: e.clientY - wr.top, sx: e.clientX, sy: e.clientY, moved: false };
                try { head.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            });
            screen.addEventListener('pointermove', (e) => {
                if (!drag || e.pointerId !== drag.id) return;
                if (!drag.moved) {
                    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 4) return;
                    drag.moved = true;
                    drag.w.classList.add('win-drag');
                }
                const r = box();
                place(drag.w, e.clientX - r.left - drag.dx, e.clientY - r.top - drag.dy);
            });
            const endDrag = (e) => {
                if (!drag || e.pointerId !== drag.id) return;
                const { w, moved } = drag;
                drag = null;
                w.classList.remove('win-drag');
                if (!moved) return;
                if (w.id) { saved[w.id] = [parseFloat(w.style.left) || 0, parseFloat(w.style.top) || 0]; savePos(); }
                unlock('win_drag');
            };
            screen.addEventListener('pointerup', endDrag);
            screen.addEventListener('pointercancel', endDrag);

            // двойной клик по заголовку - окно возвращается на своё место
            screen.addEventListener('dblclick', (e) => {
                if (!e.target.closest || e.target.closest('button')) return;
                const head = e.target.closest('.player-header');
                const w = head && head.closest(SEL);
                if (!w) return;
                w.classList.remove('win-moved');
                ['left', 'top', 'right'].forEach(p => { w.style[p] = ''; });
                if (w.id) { delete saved[w.id]; savePos(); }
            });

            let lastW = window.innerWidth;
            window.addEventListener('resize', () => {
                if (window.innerWidth === lastW) return; // экранная клавиатура меняет только высоту
                lastW = window.innerWidth;
                document.querySelectorAll('.win-moved').forEach(clampOne);
            });

            // открытое окно выходит на передний план
            const trio = ['musicPlayerModal', 'achWindow', 'snakeWindow'];
            new MutationObserver((muts) => {
                for (const m of muts) {
                    const w = m.target;
                    if (!w.matches || !w.matches(SEL) || w.classList.contains('hidden')) continue;
                    if (order[order.length - 1] !== w) {
                        front(w);
                        if (w.classList.contains('win-moved')) clampOne(w);
                    }
                }
                if (trio.every(id => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); })) unlock('multiwin');
            }).observe(screen, { attributes: true, attributeFilter: ['class'], subtree: true });
        })();

        // ==========================================
        // КАРТОЧКА ПРОГРЕССА (PNG для друзей)
        // ==========================================
        (function initCard() {
            TAB_COMMANDS.push('card', 'share');
            const W = 1200, H = 630;
            const RC = { common: null, rare: '#4aa8ff', epic: '#c26bff', legendary: '#ffb627' };
            const FONT = (s) => `${s}px "Press Start 2P", monospace`;
            let blob = null;

            function notice(text) {
                printTextInstant(text);
                const n = elem('div', 'io-note', text);
                screen.appendChild(n);
                setTimeout(() => n.remove(), 4200);
            }

            const win = elem('div', 'ach-window card-window hidden');
            win.id = 'cardWindow';
            const head = elem('div', 'player-header');
            head.appendChild(elem('span', 'player-title', 'КАРТОЧКА ПРОГРЕССА'));
            const x = elem('button', 'player-close-btn', '[X]');
            x.type = 'button';
            head.appendChild(x);
            const body = elem('div', 'card-body');
            const cv = document.createElement('canvas');
            cv.width = W; cv.height = H;
            const actions = elem('div', 'card-actions');
            const mkBtn = (label, fn) => {
                const b = elem('button', 'player-btn', label);
                b.type = 'button';
                b.addEventListener('click', () => { sfxKey('tab'); fn(); b.blur(); });
                actions.appendChild(b);
                return b;
            };
            body.append(cv, actions);
            win.append(head, body);
            screen.appendChild(win);
            win.addEventListener('click', (e) => e.stopPropagation());

            const fileName = () => `spatium-card-${new Date().toISOString().slice(0, 10)}.png`;
            const shareText = () => `${state.nick ? state.nick + ' — ' : ''}прогресс в Spatium OS: ${unlockedCount()}/${ACHIEVEMENTS.length} достижений, рекорд в змейке ${state.stats.snake.best}`;

            const bDl = mkBtn('СКАЧАТЬ PNG', () => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName(); a.style.display = 'none';
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                unlock('share_send');
                notice(`КАРТОЧКА СОХРАНЕНА: ${fileName()}`);
            });
            const bShare = mkBtn('ПОДЕЛИТЬСЯ', () => {
                if (!blob) return;
                const file = new File([blob], fileName(), { type: 'image/png' });
                navigator.share({ files: [file], title: 'Spatium OS', text: shareText() })
                    .then(() => unlock('share_send'))
                    .catch(() => { /* пользователь закрыл меню */ });
            });
            const bCopy = mkBtn('КОПИРОВАТЬ', () => {
                if (!blob) return;
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => { unlock('share_send'); notice('КАРТИНКА СКОПИРОВАНА В БУФЕР'); })
                    .catch(() => notice('НЕ УДАЛОСЬ СКОПИРОВАТЬ. ИСПОЛЬЗУЙТЕ СКАЧАТЬ PNG'));
            });
            bShare.style.display = bCopy.style.display = 'none';

            function px(c, name, x0, y0, size, color) {
                const rows = ICONS[name] || ICONS.star, u = size / 8;
                c.fillStyle = color;
                rows.forEach((row, j) => { for (let i = 0; i < 8; i++) if (row[i] === '#') c.fillRect(x0 + i * u, y0 + j * u, Math.ceil(u), Math.ceil(u)); });
            }
            function fit(c, text, size, maxW) {
                for (; size > 8; size--) { c.font = FONT(size); if (c.measureText(text).width <= maxW) return; }
                c.font = FONT(8);
            }

            function render() {
                const c = cv.getContext('2d');
                const cs = getComputedStyle(screen);
                const col = cs.getPropertyValue('--crt-color').trim() || '#33ff33';
                const bg = cs.getPropertyValue('--crt-bg').trim() || '#001100';
                const total = ACHIEVEMENTS.length, got = unlockedCount(), pct = Math.floor(got / total * 100);
                const st = state.stats, sn = st.snake;
                c.clearRect(0, 0, W, H);
                c.fillStyle = bg; c.fillRect(0, 0, W, H);
                c.fillStyle = col; c.globalAlpha = 0.07;
                for (let i = 0; i < W; i += 40) c.fillRect(i, 0, 1, H);
                for (let j = 0; j < H; j += 40) c.fillRect(0, j, W, 1);
                c.globalAlpha = 0.05;
                for (let j = 0; j < H; j += 4) c.fillRect(0, j, W, 2);
                c.globalAlpha = 1;
                c.strokeStyle = col; c.lineWidth = 3; c.shadowColor = col; c.shadowBlur = 14;
                c.strokeRect(22, 22, W - 44, H - 44);
                c.textAlign = 'left'; c.textBaseline = 'alphabetic';

                // шапка
                c.fillStyle = col; c.shadowBlur = 12;
                c.font = FONT(56); c.fillText('S_', 60, 120);
                c.font = FONT(26); c.fillText('SPATIUM OS', 170, 112);
                c.shadowBlur = 0;
                c.textAlign = 'right';
                if (state.nick) { c.shadowBlur = 10; fit(c, state.nick, 26, 480); c.fillText(state.nick, W - 60, 112); c.shadowBlur = 0; }
                c.globalAlpha = 0.6; c.font = FONT(12);
                c.fillText(new Date().toLocaleDateString('ru-RU'), W - 60, 142);
                c.textAlign = 'left';

                // звание и прогресс
                c.font = FONT(13); c.fillText('ЗВАНИЕ', 60, 190); c.globalAlpha = 1;
                const rank = rankFor(pct);
                c.shadowBlur = 10; fit(c, rank, 30, 560); c.fillText(rank, 60, 238); c.shadowBlur = 0;
                c.font = FONT(15); c.fillText(`ДОСТИЖЕНИЯ ${got}/${total}`, 60, 292);
                c.textAlign = 'right'; c.fillText(`${pct}%`, 620, 292); c.textAlign = 'left';
                c.lineWidth = 2; c.strokeRect(60, 308, 560, 28);
                const segs = 28, sw = (560 - 8) / segs, on = Math.round(segs * got / total);
                for (let i = 0; i < on; i++) c.fillRect(64 + i * sw, 312, sw - 3, 20);

                // редкость
                RARITY_ORDER.forEach((r, i) => {
                    const list = ACHIEVEMENTS.filter(a => a.rarity === r);
                    const g = list.filter(a => state.ach[a.id]).length;
                    const rc = RC[r] || col, bx = 60 + i * 143;
                    c.strokeStyle = rc; c.fillStyle = rc; c.lineWidth = 2;
                    c.strokeRect(bx, 360, 133, 84);
                    c.font = FONT(9); c.fillText(RARITIES[r].label, bx + 10, 386);
                    fit(c, `${g}/${list.length}`, 20, 113); c.fillText(`${g}/${list.length}`, bx + 10, 426);
                });

                // статистика
                c.fillStyle = col;
                [['ЗАПУСКОВ', st.visits], ['КОМАНД', st.cmds], ['РЕКОРД ЗМЕЙКИ', sn.best],
                 ['ЦВЕТОВ', `${st.colors.length}/${Object.keys(colorPalette).length}`], ['ТРЕКОВ', `${st.tracks.length}/${playlist.length}`], ['ПАРТИЙ ЗМЕЙКИ', sn.games]]
                    .forEach(([k, v], i) => {
                        const x0 = 60 + Math.floor(i / 3) * 290, y0 = 488 + (i % 3) * 38;
                        c.globalAlpha = 0.6; c.font = FONT(11); c.fillText(k, x0, y0);
                        c.globalAlpha = 1; c.font = FONT(14); c.fillText(String(v), x0, y0 + 20);
                    });

                // лучшие достижения
                c.globalAlpha = 0.6; c.font = FONT(13); c.fillText('ЛУЧШИЕ ДОСТИЖЕНИЯ', 680, 190); c.globalAlpha = 1;
                const best = ACHIEVEMENTS.filter(a => state.ach[a.id])
                    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || state.ach[b.id] - state.ach[a.id]).slice(0, 5);
                if (!best.length) { c.globalAlpha = 0.6; c.font = FONT(12); c.fillText('ПОКА ПУСТО', 680, 240); c.globalAlpha = 1; }
                best.forEach((a, i) => {
                    const y0 = 214 + i * 74, rc = RC[a.rarity] || col;
                    c.strokeStyle = rc; c.lineWidth = 2; c.strokeRect(680, y0, 56, 56);
                    px(c, a.icon, 692, y0 + 12, 32, rc);
                    c.fillStyle = rc; fit(c, a.title, 16, 390); c.fillText(a.title, 752, y0 + 26);
                    c.globalAlpha = 0.7; c.font = FONT(10); c.fillText(RARITIES[a.rarity].label, 752, y0 + 46); c.globalAlpha = 1;
                });

                cv.toBlob((b) => {
                    blob = b;
                    let canShare = false;
                    try { canShare = !!(b && navigator.canShare && navigator.canShare({ files: [new File([b], 'a.png', { type: 'image/png' })] })); } catch (err) { canShare = false; }
                    bShare.style.display = canShare ? '' : 'none';
                    bCopy.style.display = (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) ? '' : 'none';
                }, 'image/png');
            }

            function open() {
                if (!isBooted) return;
                win.classList.remove('hidden');
                if (hiddenInput) hiddenInput.blur();
                unlock('share_card');
                const ready = (document.fonts && document.fonts.load) ? document.fonts.load(FONT(16), 'АБВ0123').catch(() => {}) : Promise.resolve();
                ready.then(render);
            }
            function close() { win.classList.add('hidden'); }

            x.addEventListener('click', (e) => { e.stopPropagation(); close(); });
            window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !win.classList.contains('hidden')) close(); });

            consoleCommands.card = function () {
                open();
                printTextInstant('КАРТОЧКА ПРОГРЕССА ГОТОВА. Её можно скачать, скопировать или отправить.');
            };
            consoleCommands.share = consoleCommands.card;
        })();

        // ==========================================
        // НИКНЕЙМ: запрос при первом запуске, показ везде
        // ==========================================
        const NICK_RESERVED = ['admin', 'root', 'system', 'spati', 'spatium', 'guest', 'админ', 'система', 'спати', 'спатиум', 'администратор'];
        const nickPromptEl = document.querySelector('.prompt');
        const nickBtn = document.getElementById('userBtn');
        TAB_COMMANDS.push('nick');
        SECRET_HINTS.nick_fake = 'Назовись именем системы: admin, root или Спати';

        function applyNick() {
            const n = state.nick || '';
            const a = document.getElementById('userNick'), b = document.getElementById('statNick');
            if (a) a.textContent = n || '—';
            if (b) b.textContent = n || '-';
            document.title = n ? `${n} · Spatium OS` : 'Spatium OS';
        }

        // возвращает [чистое имя, текст ошибки]
        function checkNick(raw) {
            const n = String(raw).replace(/\s+/g, ' ').trim();
            if (n.length < 2) return ['', 'СЛИШКОМ КОРОТКО: минимум 2 символа'];
            if (n.length > 16) return ['', 'СЛИШКОМ ДЛИННО: максимум 16 символов'];
            if (!/^[\p{L}\p{N}][\p{L}\p{N}_.\- ]*$/u.test(n)) return ['', 'ДОПУСТИМЫ БУКВЫ, ЦИФРЫ, ПРОБЕЛ И _ - .'];
            if (NICK_RESERVED.includes(n.toLowerCase())) { unlock('nick_fake'); return ['', 'ЭТО ИМЯ ЗАРЕЗЕРВИРОВАНО СИСТЕМОЙ'] ; }
            return [n, ''];
        }

        function startNickPrompt(mode) {
            nickMode = mode;
            if (nickPromptEl) nickPromptEl.textContent = 'НИК>\u00a0';
            if (mode === 'first') {
                printTextTyped('ПЕРВЫЙ ЗАПУСК. СОЗДАЙТЕ ПОЛЬЗОВАТЕЛЯ.', () => printTextInstant('Введите никнейм (2-16 символов: буквы, цифры, пробел, _ - .). Он появится на карточке прогресса и в системе.'));
            } else {
                printTextInstant('СМЕНА НИКНЕЙМА. Введите новое имя или «отмена».');
            }
            if (hiddenInput) hiddenInput.focus();
        }

        function endNickPrompt() {
            nickMode = null;
            if (nickPromptEl) nickPromptEl.textContent = '>\u00a0';
            if (hiddenInput) hiddenInput.focus();
        }

        function commitNick(n) {
            const first = !state.nick;
            const changed = !first && state.nick !== n;
            state.nick = n;
            saveState();
            applyNick();
            endNickPrompt();
            unlock('nick_set');
            if (changed) unlock('nick_change');
            if (first) printTextTyped(`ПОЛЬЗОВАТЕЛЬ СОЗДАН: ${n}. ДОБРО ПОЖАЛОВАТЬ.`, () => printTextInstant("Введите 'help' для списка команд."));
            else printTextInstant(`НИКНЕЙМ ИЗМЕНЁН: ${n}`);
        }

        function handleNickInput(raw) {
            const t = raw.trim();
            printTextInstant(`НИК> ${t}`);
            if (nickMode === 'rename' && /^(отмена|cancel|-)$/i.test(t)) {
                endNickPrompt();
                printTextInstant('СМЕНА ОТМЕНЕНА.');
                return;
            }
            const [n, err] = checkNick(t);
            if (err) { printTextInstant('ОШИБКА: ' + err); return; }
            commitNick(n);
        }

        function afterBoot() {
            if (!state.nick) startNickPrompt('first');
            else printTextInstant(`С ВОЗВРАЩЕНИЕМ, ${state.nick}.`);
        }

        consoleCommands.nick = function (args) {
            const arg = args.join(' ').trim();
            if (!arg) {
                printTextInstant(`НИКНЕЙМ: ${state.nick || '-'}\nСменить: nick НОВОЕ_ИМЯ (или нажмите на имя в верхней панели)`);
                return;
            }
            const [n, err] = checkNick(arg);
            if (err) { printTextInstant('ОШИБКА: ' + err); return; }
            if (n === state.nick) { printTextInstant('ЭТО УЖЕ ВАШ НИКНЕЙМ.'); return; }
            commitNick(n);
        };
        if (nickBtn) nickBtn.addEventListener('click', () => {
            if (!isBooted || isTyping || nickMode) return;
            startNickPrompt('rename');
        });
        applyNick();

        scheduleGlitch();
    });
})();