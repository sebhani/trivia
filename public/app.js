// Player management
let playerId = localStorage.getItem('triviaPlayerId');
let currentGameState = null;

// Initialize player
async function initializePlayer() {
    if (!playerId) {
        try {
            const response = await fetch('/api/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            playerId = data.playerId;
            localStorage.setItem('triviaPlayerId', playerId);
            console.log('New player created:', playerId);
        } catch (error) {
            console.error('Failed to join game:', error);
            showStatus('❌ Failed to connect to game');
            return;
        }
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
        
        // Clear any connection error messages
        if (document.getElementById('game-status').textContent.includes('Connection lost')) {
            // Connection restored, update UI normally
        }
    } catch (error) {
        console.error('Failed to fetch game state:', error);
        showStatus('❌ Connection lost. Retrying...');
        // Continue polling even on error
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
        // Game has ended - show final score but keep localStorage for now
        statusEl.style.display = 'none';
        gameEndEl.style.display = 'block';
        document.getElementById('final-score').innerHTML = `
            <p>Your final score: <strong>${gameState.playerScore}/${gameState.totalQuestions}</strong></p>
            <p>Thanks for playing!</p>
        `;
    } else if (!gameState.isActive) {
        // Game not active - clear localStorage and show waiting message
        clearGameAnswers();
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
            // Show results
            showResults(gameState);
        } else {
            // Show question
            if (gameState.answerRevealed) {
                showResults(gameState);
            } else {
                showQuestion(gameState.currentQuestion, gameState);
            }
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
    // Remove all trivia answer keys
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('trivia_answer_')) {
            localStorage.removeItem(key);
        }
    });
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
        
        // Reset button state
        btn.className = 'option-btn';
        btn.disabled = false;
        
        // Show stored selection
        if (storedAnswer === option) {
            btn.classList.add('selected');
        }
        
        btn.onclick = () => selectAnswer(option, question.id);
    });
    
    // Disable buttons if already answered
    if (storedAnswer || (gameState && gameState.playerAnswered)) {
        ['A', 'B', 'C', 'D'].forEach(option => {
            document.getElementById(`option-${option}`).disabled = true;
        });
        
        if (!storedAnswer && gameState.playerAnswered) {
            questionEl.innerHTML += 
                '<p style="text-align: center; color: #27ae60; margin-top: 15px;">✓ You have already answered this question</p>';
        }
    }
}

// Handle answer selection
async function selectAnswer(answer, questionId) {
    const storedAnswer = getStoredAnswer(questionId);
    
    // Clear previous selection
    if (storedAnswer) {
        document.getElementById(`option-${storedAnswer}`).classList.remove('selected');
    }
    
    if (storedAnswer) return; // Already submitted
    
    // Update UI
    document.getElementById(`option-${answer}`).classList.add('selected');
    
    // Submit to server
    try {
        const response = await fetch('/api/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, answer })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            storeAnswer(questionId, answer);
            showUserMessage(data.message || 'Answer submitted successfully!', 'success');
            ['A', 'B', 'C', 'D'].forEach(option => {
                document.getElementById(`option-${option}`).disabled = true;
            });
        } else {
            document.getElementById(`option-${answer}`).classList.remove('selected');
            showUserMessage(data.error || 'Failed to submit answer', 'error');
        }
    } catch (error) {
        document.getElementById(`option-${answer}`).classList.remove('selected');
        showUserMessage('Network error. Please try again.', 'error');
    }
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
    
    // Show answer statistics
    const statsEl = document.getElementById('answer-stats');
    statsEl.innerHTML = '<h4>Answer Distribution:</h4>';
    
    ['A', 'B', 'C', 'D'].forEach(option => {
        const count = gameState.answerStats[option] || 0;
        const isCorrect = option === gameState.correctAnswer;
        statsEl.innerHTML += `
            <div class="stat-bar">
                <span>${option}. ${currentGameState.currentQuestion.options[option]} ${isCorrect ? '✓' : ''}</span>
                <span class="stat-count">${count} players</span>
            </div>
        `;
    });
    
    // Show player score
    document.getElementById('player-score').innerHTML = `
        Your score: ${gameState.playerScore}/${gameState.totalQuestions}
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
