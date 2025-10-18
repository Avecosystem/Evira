// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    const landingPage = document.getElementById('landing-page');
    const chatPage = document.getElementById('chat-page');
    const startChatBtn = document.getElementById('start-chat-btn');
    const connectBtn = document.getElementById('connect-btn');
    const connectIdInput = document.getElementById('connect-id-input');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    const chatIdElement = document.getElementById('chat-id');
    const timerSelect = document.getElementById('timer-select');
    const countdownElement = document.getElementById('countdown');
    
    // Chat state
    let currentTimer = 10; // Default to 10 minutes
    let countdownInterval = null;
    let messageExpiryTimes = []; // Array to track message expiry times
    let currentChatId = null;
    
    // Generate a random chat ID
    function generateChatId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // Format time for display
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Format time difference for countdown
    function formatCountdown(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update the countdown timer display
    function updateCountdown() {
        if (messageExpiryTimes.length === 0) {
            countdownElement.textContent = '--:--';
            return;
        }
        
        // Find the soonest expiry time
        const now = Date.now();
        const soonestExpiry = Math.min(...messageExpiryTimes);
        const timeLeft = soonestExpiry - now;
        
        if (timeLeft <= 0) {
            // Remove expired messages
            removeExpiredMessages();
            return;
        }
        
        countdownElement.textContent = formatCountdown(timeLeft);
    }
    
    // Remove expired messages
    function removeExpiredMessages() {
        const now = Date.now();
        const messages = document.querySelectorAll('.message');
        
        // Remove expired messages from DOM
        messages.forEach((message, index) => {
            if (index < messageExpiryTimes.length && messageExpiryTimes[index] <= now) {
                message.style.animation = 'fadeOut 0.5s ease';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 500);
            }
        });
        
        // Filter out expired times
        messageExpiryTimes = messageExpiryTimes.filter(time => time > now);
        
        // Update countdown
        updateCountdown();
    }
    
    // Add a message to the chat
    function addMessage(text, isSent) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isSent ? 'sent' : 'received');
        
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = formatTime(new Date());
        
        const messageText = document.createElement('div');
        messageText.textContent = text;
        
        messageDiv.appendChild(messageText);
        messageDiv.appendChild(timeSpan);
        
        messagesContainer.appendChild(messageDiv);
        
        // Calculate and store expiry time for this message
        const expiryTime = Date.now() + (currentTimer * 60 * 1000);
        messageExpiryTimes.push(expiryTime);
        
        // Start countdown if not already running
        if (!countdownInterval) {
            countdownInterval = setInterval(updateCountdown, 1000);
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Update countdown display
        updateCountdown();
    }
    
    // Start a new chat
    function startChat() {
        currentChatId = generateChatId();
        chatIdElement.textContent = currentChatId;
        landingPage.classList.remove('active');
        chatPage.classList.add('active');
        
        // Reset message expiry times
        messageExpiryTimes = [];
        
        // Clear messages except for the welcome message
        const welcomeMessage = messagesContainer.querySelector('.message');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }
        
        // Start countdown
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
        
        // Add an explanation message
        setTimeout(() => {
            addMessage("You've started a new chat session! Your Chat ID is: " + currentChatId, false);
            addMessage("Share this ID with your friend. When they enter it in their Evira app, you'll be connected directly!", false);
        }, 1000);
    }
    
    // Connect to another person's chat
    function connectToChat() {
        const connectId = connectIdInput.value.trim().toUpperCase();
        if (connectId && connectId.length === 6) {
            currentChatId = connectId;
            chatIdElement.textContent = currentChatId;
            landingPage.classList.remove('active');
            chatPage.classList.add('active');
            
            // Reset message expiry times
            messageExpiryTimes = [];
            
            // Clear messages except for the welcome message
            const welcomeMessage = messagesContainer.querySelector('.message');
            messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                messagesContainer.appendChild(welcomeMessage);
            }
            
            // Start countdown
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
            
            // Add a connection message
            addMessage("Connected to chat ID: " + currentChatId, false);
            addMessage("In a full implementation, you would now be connected directly to your friend's device.", false);
            addMessage("Any messages you send will appear here as if you're chatting with your friend.", false);
        } else {
            alert("Please enter a valid 6-character Chat ID");
        }
    }
    
    // Send a message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, true);
            messageInput.value = '';
            
            // Simulate receiving a message after a delay
            setTimeout(() => {
                const responses = [
                    "Got it!",
                    "Thanks for sharing",
                    "Interesting point",
                    "I see what you mean",
                    "That makes sense",
                    "Agreed!",
                    "Let me think about that",
                    "I understand what you're saying",
                    "That's a good perspective",
                    "I appreciate you sharing that",
                    "How does that work?",
                    "Tell me more about that",
                    "That's really helpful",
                    "I hadn't thought of it that way"
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addMessage(randomResponse, false);
            }, 1000 + Math.random() * 2000);
        }
    }
    
    // Update timer setting
    function updateTimer() {
        currentTimer = parseInt(timerSelect.value);
        // Update the display to show the new timer setting
        if (messageExpiryTimes.length > 0) {
            addMessage("Auto-delete timer changed to " + currentTimer + " minutes", false);
        }
    }
    
    // Event Listeners
    if (startChatBtn) startChatBtn.addEventListener('click', startChat);
    if (connectBtn) connectBtn.addEventListener('click', connectToChat);
    if (connectIdInput) {
        connectIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                connectToChat();
            }
        });
    }
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    if (timerSelect) timerSelect.addEventListener('change', updateTimer);
    
    // Fix for scrolling issues
    if (messagesContainer) {
        const observer = new MutationObserver(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
        
        observer.observe(messagesContainer, {
            childList: true,
            subtree: true
        });
    }
    
    // Add initial instructions
    setTimeout(() => {
        if (messagesContainer && messagesContainer.children.length <= 1) {
            const instructionMessage = document.createElement('div');
            instructionMessage.classList.add('message', 'received');
            instructionMessage.innerHTML = `
                <div><strong>How Evira Works:</strong></div>
                <div>This demo shows how Evira would work in a real implementation:</div>
                <div>1. You generate a unique Chat ID</div>
                <div>2. Share it with a friend</div>
                <div>3. They enter your ID in their Evira app</div>
                <div>4. You connect directly using WebRTC (no servers)</div>
                <div>5. Messages delete automatically after 10/20/30 minutes</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            messagesContainer.appendChild(instructionMessage);
        }
    }, 2000);
});