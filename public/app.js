// Player management
let playerId = localStorage.getItem('triviaPlayerId');
let playerScore = parseInt(localStorage.getItem('triviaPlayerScore')) || 0;
let currentGameState = null;

// Generate player ID if not exists
function initializePlayer() {
    if (!playerId) {
        playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('triviaPlayerId', playerId);
        console.log('New player created:', playerId);
    }
    
    // Start polling for game state
    pollGameState();
}

// Poll game state every 2 seconds
function pollGameState() {
    updateGameState();
    setInterval(updateGameState, 2000);
}

// Update game state from server
async function updateGameState() {
    try {
        const response = await fetch(`/api/game-state?playerId=${playerId}`);
        const gameState = await response.json();
        currentGameState = gameState;
        updateUI(gameState);
        
        // Report player stats to server for moderator dashboard
        reportPlayerStats();
        
    } catch (error) {
        console.error('Failed to fetch game state:', error);
        showStatus('❌ Connection lost. Retrying...');
    }
}

// Report player stats to server for moderator tracking
async function reportPlayerStats() {
    if (!currentGameState || !currentGameState.isActive) return;
    
    try {
        // Get current question answer stats from localStorage
        const answerStats = {};
        if (currentGameState.currentQuestion) {
            const storedAnswer = getStoredAnswer(currentGameState.currentQuestion.id);
            if (storedAnswer && !currentGameState.answerRevealed) {
                answerStats[storedAnswer] = 1;
            }
        }
        
        await fetch('/api/report-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                playerId: playerId,
                answerStats: answerStats
            })
        });
    } catch (error) {
        // Silently fail - this is just for moderator stats
        console.log('Failed to report stats:', error);
    }
}

// Update UI based on game state
function updateUI(gameState) {
    const statusEl = document.getElementById('game-status');
    const questionEl = document.getElementById('question-container');
    const resultsEl = document.getElementById('results-container');
    const gameEndEl = document.getElementById('game-end');
    
    // Hide all containers first
    questionEl.style.display = 'none';
    resultsEl.style.display = 'none';
    gameEndEl.style.display = 'none';
    
    if (gameState.gameEnded) {
        // Game has ended - show final score
        statusEl.style.display = 'none';
        gameEndEl.style.display = 'block';
        document.getElementById('final-score').innerHTML = `
            <p>Your final score: <strong>${playerScore}/${gameState.totalQuestions}</strong></p>
            <p>Thanks for playing!</p>
        `;
    } else if (!gameState.isActive) {
        // Game not active - clear localStorage and show waiting message
        clearGameAnswers();
        playerScore = 0;
        localStorage.setItem('triviaPlayerScore', '0');
        
        if (gameState.totalQuestions === 0) {
            showStatus('🎮 No trivia game available yet.<br><small>Ask the moderator to set up questions and start the game.</small>');
        } else {
            showStatus('⏳ Waiting for game to start...');
        }
    } else if (!gameState.currentQuestion) {
        // Game active but no current question
        showStatus('🎮 Game is active. Waiting for first question...');
    } else {
        // Game active with current question
        statusEl.style.display = 'none';
        
        if (gameState.answerRevealed) {
            // Update score when answer is revealed
            updatePlayerScore();
            // Show results
            showResults(gameState);
        } else {
            // Show question
            showQuestion(gameState.currentQuestion, gameState);
        }
    }
}

// Show status message
function showStatus(message) {
    const statusEl = document.getElementById('game-status');
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<p>${message}</p>`;
}

// LocalStorage helpers
function getStoredAnswer(questionId) {
    return localStorage.getItem(`trivia_answer_${questionId}`);
}

function storeAnswer(questionId, answer) {
    localStorage.setItem(`trivia_answer_${questionId}`, answer);
}

function clearGameAnswers() {
    // Remove all trivia answer and scored question keys
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('trivia_answer_') || key.startsWith('trivia_scored_')) {
            localStorage.removeItem(key);
        }
    });
}

function updatePlayerScore() {
    if (!currentGameState || !currentGameState.currentQuestion) return;
    
    const questionId = currentGameState.currentQuestion.id;
    const scoredKey = `trivia_scored_${questionId}`;
    
    // Check if we already scored this question
    if (localStorage.getItem(scoredKey)) return;
    
    const storedAnswer = getStoredAnswer(questionId);
    if (storedAnswer && currentGameState.answerRevealed && currentGameState.correctAnswer) {
        if (storedAnswer === currentGameState.correctAnswer) {
            playerScore++;
            localStorage.setItem('triviaPlayerScore', playerScore.toString());
        }
        // Mark this question as scored
        localStorage.setItem(scoredKey, 'true');
    }
}

// Show current question
function showQuestion(question, gameState) {
    const questionEl = document.getElementById('question-container');
    questionEl.style.display = 'block';
    
    // Add question progress
    const progressText = gameState ? `Question ${gameState.currentQuestionNumber}/${gameState.totalQuestions}` : '';
    document.getElementById('question-text').innerHTML = `
        ${progressText ? `<div style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">${progressText}</div>` : ''}
        ${question.text}
    `;
    
    // Update option buttons
    const storedAnswer = getStoredAnswer(question.id);
    
    ['A', 'B', 'C', 'D'].forEach(option => {
        const btn = document.getElementById(`option-${option}`);
        btn.textContent = `${option}. ${question.options[option]}`;
        
        // Reset button state - clear all classes
        btn.className = 'option-btn';
        btn.classList.remove('selected', 'correct', 'incorrect');
        btn.disabled = false;
        
        // Show stored selection for current question only
        if (storedAnswer === option) {
            btn.classList.add('selected');
        }
        
        btn.onclick = () => selectAnswer(option, question.id);
    });
    
    // Disable buttons if already answered
    if (storedAnswer) {
        ['A', 'B', 'C', 'D'].forEach(option => {
            document.getElementById(`option-${option}`).disabled = true;
        });
    }
}

// Handle answer selection
function selectAnswer(answer, questionId) {
    const storedAnswer = getStoredAnswer(questionId);
    
    // Clear previous selection
    if (storedAnswer) {
        document.getElementById(`option-${storedAnswer}`).classList.remove('selected');
    }
    
    if (storedAnswer) return; // Already submitted
    
    // Update UI and store locally
    document.getElementById(`option-${answer}`).classList.add('selected');
    storeAnswer(questionId, answer);
    
    // Disable all buttons after selection
    ['A', 'B', 'C', 'D'].forEach(option => {
        document.getElementById(`option-${option}`).disabled = true;
    });
    
    showUserMessage('Answer saved!', 'success');
}

function showUserMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.error-message, .success-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = type === 'error' ? 'error-message' : 'success-message';
    messageEl.textContent = message;
    
    // Insert after question container or status
    const questionContainer = document.getElementById('question-container');
    const statusContainer = document.getElementById('game-status');
    
    if (questionContainer.style.display !== 'none') {
        questionContainer.appendChild(messageEl);
    } else {
        statusContainer.appendChild(messageEl);
    }
    
    // Auto-remove success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }
}

// Show results after answer is revealed
function showResults(gameState) {
    const questionEl = document.getElementById('question-container');
    const resultsEl = document.getElementById('results-container');
    
    questionEl.style.display = 'block';
    resultsEl.style.display = 'block';
    
    const storedAnswer = getStoredAnswer(gameState.currentQuestion.id);
    
    // Update option buttons to show correct/incorrect
    ['A', 'B', 'C', 'D'].forEach(option => {
        const btn = document.getElementById(`option-${option}`);
        btn.disabled = true;
        
        if (option === gameState.correctAnswer) {
            btn.classList.add('correct');
        } else if (option === storedAnswer && option !== gameState.correctAnswer) {
            btn.classList.add('incorrect');
        }
    });
    
    // Show player score
    document.getElementById('player-score').innerHTML = `
        Your score: ${playerScore}/${gameState.totalQuestions}
    `;
}

// Add network status detection
function addNetworkStatusHandling() {
    // Online/offline detection
    window.addEventListener('online', () => {
        showUserMessage('Connection restored!', 'success');
        updateGameState(); // Immediate update when back online
    });
    
    window.addEventListener('offline', () => {
        showStatus('📱 You are offline <br><small>Waiting for connection...</small>');
    });
    
    // Page visibility handling (for mobile app switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Page became visible - update immediately
            updateGameState();
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    addNetworkStatusHandling();
    initializePlayer();
});
