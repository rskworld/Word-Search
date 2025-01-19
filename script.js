// Word Search Game
class WordSearchGame {
    constructor() {
        this.board = [];
        this.words = [];
        this.selectedWords = [];
        this.gridSize = 10;
        this.score = 0;
        this.timer = null;
        this.timeElapsed = 0;
        this.currentLevel = 1;
        this.difficulty = 'easy';
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.isSoundEnabled = true;
        this.isMusicEnabled = true;
        this.maxGameTime = 0; // 5 minutes default time limit
        this.timeLimit = this.maxGameTime;
        this.directions = [
            [0, 1],   // right
            [1, 0],   // down
            [1, 1],   // diagonal down-right
            [-1, 1],  // diagonal up-right
        ];

        // Sound effects
        this.sounds = {
            correct: new Audio('sounds/word-found.mp3'),
            wrong: new Audio('sounds/button-click.mp3'),
            hint: new Audio('sounds/select.mp3'),
            levelUp: new Audio('sounds/level-up.mp3'),
            buttonClick: new Audio('sounds/button-click.mp3'),
            gameOver: new Audio('sounds/game-over.mp3')
        };

        // Background Music
        this.backgroundMusic = new Audio('sounds/background-music.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;

        // Sound toggle
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.isSoundEnabled = e.target.checked;
                this.updateSoundVolume();
                this.playButtonClickSound(); // Play sound on toggle
            });
        }

        // Music toggle
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                this.isMusicEnabled = e.target.checked;
                this.toggleBackgroundMusic();
                this.playButtonClickSound(); // Play sound on toggle
            });
        }

        // Hint button
        const hintButton = document.getElementById('hintButton');
        if (hintButton) {
            hintButton.addEventListener('click', () => {
                this.playButtonClickSound();
                this.giveHint();
            });
        }

        // Start Game button
        const startGameButton = document.getElementById('startGame');
        if (startGameButton) {
            startGameButton.addEventListener('click', () => {
                this.playButtonClickSound();
            });
        }

        // How to Play button
        const howToPlayButton = document.getElementById('howToPlayButton');
        if (howToPlayButton) {
            howToPlayButton.addEventListener('click', () => {
                this.playButtonClickSound();
                
                // Use Bootstrap's modal method
                const howToPlayModal = new bootstrap.Modal(document.getElementById('howToPlayModal'));
                howToPlayModal.show();
            });
        }

        // Clear Leaderboard button
        const clearLeaderboardButton = document.getElementById('clearLeaderboard');
        if (clearLeaderboardButton) {
            clearLeaderboardButton.addEventListener('click', () => {
                this.clearLeaderboard();
            });
        }

        // Leaderboard button
        const leaderboardButton = document.getElementById('leaderboardButton');
        if (leaderboardButton) {
            leaderboardButton.addEventListener('click', () => {
                this.playButtonClickSound();
                this.showLeaderboardModal();
            });
        }

        this.leaderboard = this.loadLeaderboard();
    }

    startTimer() {
        // Clear any existing timer
        if (this.timer) clearInterval(this.timer);

        const timerDisplay = document.getElementById('timerDisplay');
        this.timeElapsed = 0;
        
        // Use the dynamically calculated time limit
        this.timeLimit = this.maxGameTime;
        
        this.timer = setInterval(() => {
            this.timeElapsed++;
            
            // Calculate remaining time
            const remainingTime = Math.max(this.timeLimit - this.timeElapsed, 0);
            
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            
            timerDisplay.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Add visual warning for low time
            if (remainingTime <= 30) {
                timerDisplay.classList.add('text-danger', 'animate__animated', 'animate__flash');
            } else {
                timerDisplay.classList.remove('text-danger', 'animate__animated', 'animate__flash');
            }
            
            // Check for game over
            if (remainingTime <= 0) {
                this.gameOver('Time Up');
            }
        }, 1000);
    }

    gameOver(reason = 'Game Over') {
        // Stop timer
        clearInterval(this.timer);

        // Play game over sound
        this.playSound('gameOver');

        // Pause background music
        this.backgroundMusic.pause();

        // Show game over alert
        Swal.fire({
            title: 'Game Over',
            html: `
                <p>${reason}</p>
                <p>Level: ${this.currentLevel}</p>
                <p>Score: ${this.score}</p>
                <p>Time Limit: ${Math.floor(this.maxGameTime / 60)} minutes</p>
            `,
            icon: 'error',
            confirmButtonText: 'Play Again',
            cancelButtonText: 'View Leaderboard',
            showCancelButton: true,
            customClass: {
                popup: 'animate__animated animate__shakeX'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Reset to first level and restart
                this.currentLevel = 1;
                this.initGame();
            } else {
                // Show leaderboard
                this.saveToLeaderboard().then(() => {
                    this.showLeaderboardModal();
                });
            }
        });
    }

    async initGame() {
        // Reset game state
        this.board = [];
        this.words = [];
        this.selectedWords = [];
        this.timeElapsed = 0;
        this.score = 0;
        this.hintsUsed = 0;

        // Dynamically adjust difficulty based on current level
        this.adjustDifficultyByLevel();

        // Update score and timer displays
        this.updateScoreDisplay();
        this.updateLevelDisplay();
        this.startTimer();

        // Fetch words 
        try {
            // First, try to get words from the predefined method
            this.words = this.getWordListByLevel();

            // If words are empty, generate a fallback list
            if (this.words.length === 0) {
                this.words = [
                    'GAME', 'PLAY', 'WIN', 'CODE', 
                    'SOLVE', 'THINK', 'CREATE', 'LEARN'
                ];
            }

            this.generateBoard();
            this.renderBoard();
            this.renderWordList();

            // Start background music if enabled
            if (this.isMusicEnabled) {
                this.toggleBackgroundMusic();
            }
        } catch (error) {
            console.error('Error generating words:', error);
            
            // Absolute fallback
            this.words = [
                'GAME', 'PLAY', 'WIN', 'CODE', 
                'SOLVE', 'THINK', 'CREATE', 'LEARN'
            ];
            
            this.generateBoard();
            this.renderBoard();
            this.renderWordList();
        }
    }

    gameComplete() {
        // Stop timer
        clearInterval(this.timer);

        // Play level up sound
        this.playSound('levelUp');

        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        // Increase level
        this.currentLevel++;

        // Sweet Alert for game completion
        Swal.fire({
            title: 'Congratulations!',
            html: `
                <p>You completed Level ${this.currentLevel - 1}!</p>
                <p>Score: ${this.score}</p>
                <p>Time: ${document.getElementById('timerDisplay').textContent}</p>
                <p>Next Level: ${this.currentLevel}</p>
            `,
            icon: 'success',
            confirmButtonText: 'Next Level',
            cancelButtonText: 'Share Score',
            showCancelButton: true,
            customClass: {
                popup: 'animate__animated animate__tada'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Continue to next level
                this.initGame();
            } else {
                // Save to leaderboard and share score
                this.saveToLeaderboard().then(() => {
                    this.shareScore();
                });
            }
        });
    }

    adjustDifficultyByLevel() {
        // Increase grid size and complexity with each level
        this.gridSize = 10 + Math.floor((this.currentLevel - 1) / 3);
        
        // Cap grid size at 20
        this.gridSize = Math.min(this.gridSize, 20);

        // Dynamic time limit calculation
        this.maxGameTime = this.calculateTimeLimit();
    }

    calculateTimeLimit() {
        // More sophisticated time limit calculation
        switch (true) {
            case this.currentLevel <= 3:
                // Easy levels: Generous time
                return 300; // 5 minutes
            case this.currentLevel <= 6:
                // Medium levels: Moderate challenge
                return 240; // 4 minutes
            case this.currentLevel <= 9:
                // Hard levels: Tighter time
                return 180; // 3 minutes
            case this.currentLevel <= 12:
                // Very Hard levels: High pressure
                return 120; // 2 minutes
            case this.currentLevel <= 15:
                // Expert levels: Extreme challenge
                return 90; // 1.5 minutes
            default:
                // Legendary levels: Near impossible
                return Math.max(60, 300 - (this.currentLevel * 15));
        }
    }

    toggleBackgroundMusic() {
        try {
            if (this.isMusicEnabled) {
                this.backgroundMusic.play();
            } else {
                this.backgroundMusic.pause();
            }
        } catch (error) {
            console.error('Error toggling background music:', error);
        }
    }

    playButtonClickSound() {
        if (this.isSoundEnabled) {
            try {
                // Reset audio to start
                this.sounds.buttonClick.currentTime = 0;
                this.sounds.buttonClick.play();
            } catch (error) {
                console.error('Error playing button click sound:', error);
            }
        }
    }

    updateSoundVolume() {
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.isSoundEnabled ? 0.5 : 0;
        });
    }

    playSound(soundName) {
        if (this.isSoundEnabled) {
            try {
                this.sounds[soundName].play();
            } catch (error) {
                console.error(`Error playing sound ${soundName}:`, error);
            }
        }
    }

    updateLevelDisplay() {
        // Create level display if it doesn't exist
        let levelDisplay = document.getElementById('levelDisplay');
        if (!levelDisplay) {
            const headerElement = document.querySelector('.card-header');
            const levelSpan = document.createElement('span');
            levelSpan.id = 'levelDisplay';
            levelSpan.classList.add('ms-3');
            headerElement.appendChild(levelSpan);
            levelDisplay = document.getElementById('levelDisplay');
        }
        levelDisplay.textContent = `Level: ${this.currentLevel}`;
    }

    updateScoreDisplay() {
        document.getElementById('scoreDisplay').textContent = this.score;
    }

    generateBoard() {
        // Initialize empty board
        this.board = Array(this.gridSize).fill().map(() => 
            Array(this.gridSize).fill(' ')
        );

        // Place words on the board
        this.words.forEach(word => this.placeWord(word));

        // Fill remaining spaces with random letters
        this.board = this.board.map(row => 
            row.map(cell => 
                cell === ' ' ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) : cell
            )
        );
    }

    placeWord(word) {
        const maxAttempts = 100;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const direction = this.directions[Math.floor(Math.random() * this.directions.length)];
            const startX = Math.floor(Math.random() * this.gridSize);
            const startY = Math.floor(Math.random() * this.gridSize);

            if (this.canPlaceWord(word, startX, startY, direction)) {
                for (let i = 0; i < word.length; i++) {
                    const x = startX + i * direction[0];
                    const y = startY + i * direction[1];
                    this.board[y][x] = word[i];
                }
                break;
            }
        }
    }

    canPlaceWord(word, startX, startY, direction) {
        for (let i = 0; i < word.length; i++) {
            const x = startX + i * direction[0];
            const y = startY + i * direction[1];

            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
                return false;
            }

            if (this.board[y][x] !== ' ' && this.board[y][x] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

        this.board.forEach((row, y) => {
            row.forEach((cell, x) => {
                const cellElement = document.createElement('div');
                cellElement.classList.add('game-cell');
                cellElement.textContent = cell;
                cellElement.dataset.x = x;
                cellElement.dataset.y = y;
                cellElement.addEventListener('click', () => this.selectCell(cellElement));
                gameBoard.appendChild(cellElement);
            });
        });
    }

    selectCell(cellElement) {
        // Play select sound
        if (this.isSoundEnabled) {
            try {
                // Create a new Audio object to allow multiple simultaneous plays
                const selectSound = new Audio('sounds/select.mp3');
                selectSound.volume = this.isSoundEnabled ? 0.5 : 0;
                selectSound.play();
            } catch (error) {
                console.error('Error playing select sound:', error);
            }
        }

        // Toggle cell selection
        cellElement.classList.toggle('selected');
        
        // Get all currently selected cells
        const selectedCells = Array.from(document.querySelectorAll('.game-cell.selected'));
        
        // Build the word from selected cells
        const selectedWord = selectedCells
            .map(cell => cell.textContent)
            .join('');
        
        // Check word in both forward and reverse directions
        const forwardWord = selectedWord.toUpperCase();
        const reverseWord = forwardWord.split('').reverse().join('');
        
        // Automatically check if the word is complete
        if (this.words.includes(forwardWord) || this.words.includes(reverseWord)) {
            this.checkWordSubmission(forwardWord);
        }
    }

    checkWordSubmission(submittedWord) {
        const selectedCells = Array.from(document.querySelectorAll('.game-cell.selected'));
        const enteredWord = submittedWord.toUpperCase();

        // Check both forward and reverse word
        const matchedWord = this.words.find(word => 
            word === enteredWord || word === enteredWord.split('').reverse().join('')
        );

        if (matchedWord) {
            // Play correct sound
            this.playSound('correct');

            // Mark the word as found
            const wordIndex = this.words.indexOf(matchedWord);
            this.selectedWords.push(matchedWord);
            
            // Remove the word from the list of words to find
            this.words.splice(wordIndex, 1);

            // Update score
            this.score += enteredWord.length * 10;
            this.updateScoreDisplay();

            // Animate found cells
            selectedCells.forEach(cell => {
                cell.classList.remove('selected');
                cell.classList.add('found', 'animate__animated', 'animate__rubberBand');
            });

            // Update word list
            this.renderWordList();

            // Check if game is complete
            if (this.words.length === 0) {
                this.gameComplete();
            }
        } else {
            // Play wrong sound
            this.playSound('wrong');

            // Shake animation for wrong word
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Word not found. Try again!',
                animation: true,
                customClass: {
                    popup: 'animate__animated animate__shakeX'
                }
            });

            // Reduce score for wrong attempts
            this.score = Math.max(0, this.score - 5);
            this.updateScoreDisplay();

            // Clear selected cells
            selectedCells.forEach(cell => cell.classList.remove('selected'));
        }
    }

    giveHint() {
        // Check if hints are available
        if (this.hintsUsed >= this.maxHints) {
            Swal.fire({
                icon: 'warning',
                title: 'No Hints Left',
                text: `You've used all ${this.maxHints} hints for this level.`
            });
            return;
        }

        // Reduce score for hint
        this.score = Math.max(0, this.score - 20);
        this.updateScoreDisplay();

        // Play hint sound
        this.playSound('hint');

        // Find a random unselected word
        const remainingWords = this.words.filter(word => 
            !this.selectedWords.includes(word)
        );

        if (remainingWords.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Hints Available',
                text: 'You have found all words!'
            });
            return;
        }

        const hintWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
        
        // Find the word on the board
        const hintCells = this.findWordOnBoard(hintWord);

        if (hintCells.length > 0) {
            // Highlight hint cells
            hintCells.forEach(cell => {
                cell.classList.add('hint', 'animate__animated', 'animate__flash');
            });

            // Remove highlight after 3 seconds
            setTimeout(() => {
                hintCells.forEach(cell => {
                    cell.classList.remove('hint', 'animate__animated', 'animate__flash');
                });
            }, 3000);

            // Increment hints used
            this.hintsUsed++;

            // Show hint message
            Swal.fire({
                icon: 'info',
                title: 'Hint',
                text: `Hint for the word: ${hintWord}`,
                timer: 2000,
                showConfirmButton: false
            });
        }
    }

    findWordOnBoard(word) {
        const hintCells = [];
        
        // Iterate through the board to find the word
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                for (const direction of this.directions) {
                    if (this.checkWordAtPosition(word, x, y, direction)) {
                        // Collect cells for this word
                        for (let i = 0; i < word.length; i++) {
                            const cellX = x + i * direction[0];
                            const cellY = y + i * direction[1];
                            const cell = document.querySelector(
                                `.game-cell[data-x="${cellX}"][data-y="${cellY}"]`
                            );
                            if (cell) hintCells.push(cell);
                        }
                        return hintCells;
                    }
                }
            }
        }
        
        return hintCells;
    }

    checkWordAtPosition(word, startX, startY, direction) {
        for (let i = 0; i < word.length; i++) {
            const x = startX + i * direction[0];
            const y = startY + i * direction[1];

            // Check bounds
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
                return false;
            }

            // Check if letter matches
            if (this.board[y][x] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    renderWordList() {
        const wordListElement = document.getElementById('wordList');
        if (!wordListElement) {
            console.error('Word list element not found');
            return;
        }

        // Ensure words are available
        if (!this.words || this.words.length === 0) {
            this.words = [
                'GAME', 'PLAY', 'WIN', 'CODE', 
                'SOLVE', 'THINK', 'CREATE', 'LEARN'
            ];
        }

        // Render words to find
        wordListElement.innerHTML = 'Words to Find: ' + this.words.join(', ');
    }

    getWordListByLevel() {
        // Create comprehensive word lists that grow in complexity
        const baseWords = ['hello', 'world', 'game', 'play', 'code', 'fun', 'win', 'test'];
        const intermediateWords = [
            ...baseWords, 
            'python', 'javascript', 'coding', 'design', 
            'learn', 'solve', 'think', 'create'
        ];
        const advancedWords = [
            ...intermediateWords, 
            'algorithm', 'programming', 'technology', 
            'develop', 'system', 'logic', 'method'
        ];
        const expertWords = [
            ...advancedWords, 
            'innovation', 'complexity', 'engineering', 
            'optimize', 'structure', 'dynamic', 'resolve'
        ];

        // Dynamically select and expand word list based on current level
        const wordLists = [
            baseWords,
            intermediateWords,
            advancedWords,
            expertWords
        ];

        // Cycle through word lists and add random words as level increases
        const listIndex = Math.min(Math.floor((this.currentLevel - 1) / 5), wordLists.length - 1);
        const selectedList = wordLists[listIndex];

        // Add some randomness and increase word count with level
        const wordCount = 5 + Math.floor(this.currentLevel / 3);
        const randomWords = Array.from({length: wordCount}, () => 
            selectedList[Math.floor(Math.random() * selectedList.length)]
        );

        // Ensure unique words and convert to uppercase
        const uniqueWords = [...new Set(randomWords)].map(word => word.toUpperCase());

        // Fallback mechanism to ensure at least some words are available
        return uniqueWords.length > 0 ? uniqueWords : baseWords.map(w => w.toUpperCase());
    }

    loadLeaderboard() {
        const savedLeaderboard = localStorage.getItem('wordSearchLeaderboard');
        return savedLeaderboard ? JSON.parse(savedLeaderboard) : [];
    }

    async getPlayerName() {
        const { value: playerName } = await Swal.fire({
            title: 'Enter Your Name',
            input: 'text',
            inputLabel: 'Your name',
            inputPlaceholder: 'Enter your name',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write something!';
                }
            },
            showCancelButton: true
        });

        return playerName || 'Anonymous Player';
    }

    async saveToLeaderboard() {
        const playerName = await this.getPlayerName();
        const leaderboardEntry = {
            name: playerName,
            score: this.score,
            level: this.currentLevel - 1,
            time: document.getElementById('timerDisplay').textContent,
            date: new Date().toLocaleString()
        };

        // Add new entry and sort
        this.leaderboard.push(leaderboardEntry);
        this.leaderboard.sort((a, b) => b.score - a.score);

        // Keep top 10 entries
        this.leaderboard = this.leaderboard.slice(0, 10);

        // Save to localStorage
        localStorage.setItem('wordSearchLeaderboard', JSON.stringify(this.leaderboard));

        return this.leaderboard;
    }

    showLeaderboardModal() {
        // Ensure leaderboard is loaded
        this.leaderboard = this.loadLeaderboard();

        // Create leaderboard HTML
        const leaderboardHTML = this.leaderboard.length > 0 
            ? this.leaderboard.map((entry, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${entry.name}</td>
                    <td>${entry.score}</td>
                    <td>Level ${entry.level}</td>
                    <td>${entry.time}</td>
                    <td>${entry.date}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" class="text-center">No scores yet. Start playing!</td></tr>`;

        Swal.fire({
            title: 'Leaderboard',
            html: `
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Score</th>
                            <th>Level</th>
                            <th>Time</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboardHTML}
                    </tbody>
                </table>
            `,
            showConfirmButton: true,
            showCancelButton: true,
            confirmButtonText: 'Close',
            cancelButtonText: 'Clear Leaderboard',
            customClass: {
                popup: 'animate__animated animate__bounceIn'
            }
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                // Clear leaderboard
                this.clearLeaderboard();
            }
        });
    }

    clearLeaderboard() {
        Swal.fire({
            title: 'Clear Leaderboard?',
            text: 'Are you sure you want to delete all saved scores?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, clear it!'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('wordSearchLeaderboard');
                this.leaderboard = [];
                Swal.fire(
                    'Cleared!',
                    'Leaderboard has been reset.',
                    'success'
                );
                this.showLeaderboardModal();
            }
        });
    }

    async shareScore() {
        // Check if Web Share API is supported
        if (navigator.share) {
            try {
                // Capture screenshot
                const canvas = await this.captureScreenshot();
                
                // Convert canvas to blob
                const blob = await (await fetch(canvas.toDataURL())).blob();
                
                // Prepare share data
                const shareData = {
                    title: 'RSKWORLD Word Search Game',
                    text: `🎮 I scored ${this.score} points in Word Search Game on Level ${this.currentLevel}! 
Challenge yourself at https://rskworld.in 
Powered by RSKWORLD 
Contact: help@rskworld.in`,
                    url: 'https://rskworld.in',
                    files: [
                        new File([blob], 'rskworld-word-search-score.png', { type: 'image/png' })
                    ]
                };

                // Try to share
                await navigator.share(shareData);
            } catch (error) {
                console.error('Error sharing score:', error);
                
                // Fallback sharing method
                this.fallbackShareScore();
            }
        } else {
            // Fallback for browsers not supporting Web Share API
            this.fallbackShareScore();
        }
    }

    captureScreenshot() {
        return new Promise((resolve) => {
            // Create a canvas the same size as the game board
            const gameBoard = document.getElementById('gameBoard');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas size to match game board
            canvas.width = gameBoard.offsetWidth;
            canvas.height = gameBoard.offsetHeight;
            
            // Use html2canvas for better rendering
            html2canvas(gameBoard, {
                scale: 2, // Increase resolution
                useCORS: true,
                logging: false
            }).then(boardCanvas => {
                // Draw game board screenshot
                context.drawImage(boardCanvas, 0, 0);
                
                // Add overlay with score details
                context.fillStyle = 'rgba(0, 0, 0, 0.7)';
                context.fillRect(0, 0, canvas.width, 100);
                
                context.font = 'bold 24px Arial';
                context.fillStyle = 'white';
                context.textAlign = 'center';
                context.fillText(`Score: ${this.score} | Level: ${this.currentLevel}`, 
                    canvas.width / 2, 50);
                context.fillText('RSKWORLD Word Search Game', 
                    canvas.width / 2, 80);
                
                resolve(canvas);
            });
        });
    }

    fallbackShareScore() {
        // Fallback sharing method using SweetAlert
        Swal.fire({
            title: 'Share Your Score',
            html: `
                <p>Score: ${this.score} points</p>
                <p>Level: ${this.currentLevel}</p>
                <textarea id="shareText" class="form-control" readonly>
🎮 I scored ${this.score} points in Word Search Game on Level ${this.currentLevel}! 
Challenge yourself at https://rskworld.in 
Powered by RSKWORLD 
Contact: help@rskworld.in
                </textarea>
                <p class="mt-2">Copy the text above to share!</p>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Copy to Clipboard',
            preConfirm: () => {
                const shareText = document.getElementById('shareText');
                shareText.select();
                document.execCommand('copy');
                Swal.fire({
                    icon: 'success',
                    title: 'Copied!',
                    text: 'Score text copied to clipboard'
                });
            }
        });
    }

    setupEventListeners() {
        // Existing event listeners...

        // Add share button listener if exists
        const shareButton = document.getElementById('shareButton');
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                this.playButtonClickSound();
                this.shareScore();
            });
        }
    }
}

// Game initialization
document.addEventListener('DOMContentLoaded', () => {
    const game = new WordSearchGame();
    
    // Start Game Button
    document.getElementById('startGame').addEventListener('click', () => {
        game.playButtonClickSound();
        game.initGame();
    });

    // Hint Button
    document.getElementById('hintButton').addEventListener('click', () => {
        game.playButtonClickSound();
        game.giveHint();
    });

    // Initialize game on page load
    game.setupEventListeners();
    game.initGame();
});
