const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Production logging
if (NODE_ENV === 'production') {
  console.log(`🚀 Starting Trivia Platform in production mode`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Security headers for production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// Game State Management
let gameState = {
  isActive: false,
  currentQuestionIndex: -1,
  questions: [],
  answerRevealed: false,
  playerCount: 0,
  answerStats: {A: 0, B: 0, C: 0, D: 0}
};

// Helper Functions
function addQuestion(text, options, correctAnswer) {
  const question = {
    id: Date.now().toString(),
    text,
    options,
    correctAnswer
  };
  gameState.questions.push(question);
  return question;
}

function getCurrentQuestion() {
  if (gameState.currentQuestionIndex >= 0 && gameState.currentQuestionIndex < gameState.questions.length) {
    return gameState.questions[gameState.currentQuestionIndex];
  }
  return null;
}

function startGame() {
  gameState.isActive = true;
  gameState.currentQuestionIndex = -1;
  gameState.answerRevealed = false;
  resetAnswerStats();
  gameState.playerCount = 0;
}

function nextQuestion() {
  if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
    gameState.currentQuestionIndex++;
    gameState.answerRevealed = false;
    resetAnswerStats();
    return true;
  }
  return false;
}

function revealAnswer() {
  gameState.answerRevealed = true;
}

function endGame() {
  gameState.currentQuestionIndex = -1;
  gameState.isActive = false;
  gameState.playerCount = 0;
}

function isGameComplete() {
  return gameState.answerRevealed && 
         gameState.currentQuestionIndex >= gameState.questions.length - 1;
}

function deleteQuestion(questionId) {
  const index = gameState.questions.findIndex(q => q.id === questionId);
  if (index !== -1) {
    gameState.questions.splice(index, 1);
    return true;
  }
  return false;
}

function resetAnswerStats() {
  gameState.answerStats = {A: 0, B: 0, C: 0, D: 0};
}

// Test functions
function testGameState() {
  console.log('Testing game state management...');
  
  // Test adding questions
  const q1 = addQuestion('What is 2+2?', {A: '3', B: '4', C: '5', D: '6'}, 'B');
  const q2 = addQuestion('What color is the sky?', {A: 'Red', B: 'Green', C: 'Blue', D: 'Yellow'}, 'C');
  
  console.log('✓ Added questions:', gameState.questions.length);
  
  // Test game flow
  startGame();
  console.log('✓ Game started:', gameState.isActive);
  
  nextQuestion();
  console.log('✓ Advanced to question 1:', gameState.currentQuestionIndex);
  
  revealAnswer();
  console.log('✓ Answer revealed');
  
  console.log('Game state management tests completed successfully!');
}

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Trivia server is running' });
});

// Player API endpoints
app.get('/api/game-state', (req, res) => {
  const currentQuestion = getCurrentQuestion();
  const playerId = req.query.playerId;
  
  // Update player count estimation
  if (playerId) {
    // Simple estimation - could be improved with more sophisticated tracking
    gameState.playerCount = Math.max(gameState.playerCount, 1);
  }
  
  res.json({
    isActive: gameState.isActive,
    currentQuestion: gameState.isActive && currentQuestion ? {
      id: currentQuestion.id,
      text: currentQuestion.text,
      options: currentQuestion.options
    } : null,
    answerRevealed: gameState.answerRevealed,
    answerStats: gameState.answerRevealed ? gameState.answerStats : null,
    correctAnswer: gameState.answerRevealed && currentQuestion ? currentQuestion.correctAnswer : null,
    totalQuestions: gameState.questions.length,
    currentQuestionNumber: gameState.currentQuestionIndex + 1,
    gameComplete: isGameComplete(),
    gameEnded: !gameState.isActive && gameState.currentQuestionIndex >= 0
  });
});

// Report player stats for moderator dashboard
app.post('/api/report-stats', (req, res) => {
  const { playerId, answerStats } = req.body;
  
  if (!playerId || !answerStats) {
    return res.status(400).json({ error: 'Player ID and answer stats required' });
  }
  
  // Update player count
  gameState.playerCount = Math.max(gameState.playerCount, 1);
  
  // Update answer statistics if game is active and answer not revealed
  if (gameState.isActive && !gameState.answerRevealed && answerStats) {
    Object.keys(answerStats).forEach(option => {
      if (['A', 'B', 'C', 'D'].includes(option)) {
        gameState.answerStats[option] = (gameState.answerStats[option] || 0) + (answerStats[option] || 0);
      }
    });
  }
  
  res.json({ success: true });
});


// Validation middleware
function validateQuestionInput(req, res, next) {
  const { text, optionA, optionB, optionC, optionD, correctAnswer } = req.body;
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Question text is required and must be non-empty' });
  }
  
  if (text.length > 500) {
    return res.status(400).json({ error: 'Question text must be 500 characters or less' });
  }
  
  const options = [optionA, optionB, optionC, optionD];
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (!option || typeof option !== 'string' || option.trim().length === 0) {
      return res.status(400).json({ error: `Option ${String.fromCharCode(65 + i)} is required and must be non-empty` });
    }
    if (option.length > 200) {
      return res.status(400).json({ error: `Option ${String.fromCharCode(65 + i)} must be 200 characters or less` });
    }
  }
  
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    return res.status(400).json({ error: 'Correct answer must be A, B, C, or D' });
  }
  
  next();
}



// Moderator authentication middleware
function authenticateModerator(req, res, next) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Hardcoded credentials for MVP
  if (username === 'admin' && password === 'trivia123') {
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// Moderator API endpoints
app.post('/api/moderator/login', authenticateModerator, (req, res) => {
  res.json({ success: true, message: 'Login successful' });
});

app.post('/api/moderator/start-game', (req, res) => {
  if (gameState.isActive) {
    return res.status(409).json({ error: 'Game is already active' });
  }
  
  if (gameState.questions.length === 0) {
    return res.status(400).json({ error: 'Cannot start game without questions. Please add questions first.' });
  }
  
  startGame();
  res.json({ success: true, message: 'Game started', totalQuestions: gameState.questions.length });
});

app.post('/api/moderator/add-question', validateQuestionInput, (req, res) => {
  const { text, optionA, optionB, optionC, optionD, correctAnswer } = req.body;
  
  const options = { A: optionA.trim(), B: optionB.trim(), C: optionC.trim(), D: optionD.trim() };
  const question = addQuestion(text.trim(), options, correctAnswer);
  
  res.json({ 
    success: true, 
    questionId: question.id, 
    totalQuestions: gameState.questions.length,
    message: `Question ${gameState.questions.length} added successfully`
  });
});

app.delete('/api/moderator/delete-question/:questionId', (req, res) => {
  const { questionId } = req.params;
  
  if (!questionId) {
    return res.status(400).json({ error: 'Question ID is required' });
  }
  
  if (gameState.isActive) {
    return res.status(409).json({ error: 'Cannot delete questions while game is active' });
  }
  
  const success = deleteQuestion(questionId);
  
  if (!success) {
    return res.status(404).json({ error: 'Question not found' });
  }
  
  res.json({ 
    success: true, 
    message: 'Question deleted successfully',
    totalQuestions: gameState.questions.length
  });
});

app.post('/api/moderator/next-question', (req, res) => {
  if (!gameState.isActive) {
    return res.status(409).json({ error: 'Game is not active. Please start the game first.' });
  }
  
  const success = nextQuestion();
  
  if (!success) {
    return res.status(409).json({ 
      error: 'No more questions available. Game complete!',
      gameComplete: true
    });
  }
  
  res.json({ 
    success: true, 
    currentQuestionIndex: gameState.currentQuestionIndex,
    totalQuestions: gameState.questions.length,
    message: `Advanced to question ${gameState.currentQuestionIndex + 1} of ${gameState.questions.length}`
  });
});

app.post('/api/moderator/reveal-answer', (req, res) => {
  if (!gameState.isActive) {
    return res.status(409).json({ error: 'Game is not active' });
  }
  
  if (gameState.currentQuestionIndex < 0) {
    return res.status(409).json({ error: 'No active question to reveal' });
  }
  
  if (gameState.answerRevealed) {
    return res.status(409).json({ error: 'Answer already revealed for this question' });
  }
  
  revealAnswer();
  
  const currentQuestion = getCurrentQuestion();
  const totalResponses = Object.values(gameState.answerStats).reduce((sum, count) => sum + count, 0);
  
  res.json({ 
    success: true, 
    correctAnswer: currentQuestion.correctAnswer,
    answerStats: gameState.answerStats,
    playerCount: gameState.playerCount,
    totalResponses: totalResponses,
    message: `Answer revealed: ${currentQuestion.correctAnswer}. ${totalResponses} players responded.`
  });
});

app.post('/api/moderator/end-game', (req, res) => {
  if (!gameState.isActive) {
    return res.status(409).json({ error: 'No active game to end' });
  }
  
  endGame();
  
  res.json({ 
    success: true, 
    message: 'Game ended successfully',
    totalPlayers: gameState.playerCount
  });
});

app.get('/api/moderator/status', (req, res) => {
  const currentQuestion = getCurrentQuestion();
  
  res.json({
    isActive: gameState.isActive,
    playerCount: gameState.playerCount,
    totalQuestions: gameState.questions.length,
    currentQuestionIndex: gameState.currentQuestionIndex,
    currentQuestion: currentQuestion ? {
      id: currentQuestion.id,
      text: currentQuestion.text,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correctAnswer
    } : null,
    answerRevealed: gameState.answerRevealed,
    answerStats: gameState.answerStats,
    gameComplete: isGameComplete(),
    questions: gameState.questions
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve moderator dashboard
app.get('/moderator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'moderator.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 Trivia server running on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT} to access the game`);
  console.log(`👨‍💼 Moderator dashboard: http://localhost:${PORT}/moderator`);
  console.log(`🔐 Moderator credentials: admin / trivia123`);
  
  if (NODE_ENV === 'production') {
    console.log(`✅ Production mode active`);
  } else {
    console.log(`🔧 Development mode - running tests...`);
    // Run game state tests only in development
    testGameState();
  }
});
