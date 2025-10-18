// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Landing page elements
    const landingPage = document.getElementById('landing-page');
    const startChatBtn = document.getElementById('start-chat-btn');
    const connectBtn = document.getElementById('connect-btn');
    const connectIdInput = document.getElementById('connect-id-input');
    
    // Chat page elements
    const chatPage = document.getElementById('chat-page');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    const chatIdElement = document.getElementById('chat-id');
    const statusElement = document.getElementById('status');
    const timerSelect = document.getElementById('timer-select');
    const countdownElement = document.getElementById('countdown');
    
    // Chat state
    let currentTimer = 10; // Default to 10 minutes
    let countdownInterval = null;
    let messageExpiryTimes = []; // Array to track message expiry times
    let currentChatId = null;
    let isHost = false;
    
    // Use localStorage for message synchronization (simulating peer connection)
    let lastMessageId = 0;
    
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
                        // Also remove from localStorage
                        localStorage.removeItem(`evira_msg_${currentChatId}_${index}`);
                    }
                }, 500);
            }
        });
        
        // Filter out expired times
        messageExpiryTimes = messageExpiryTimes.filter(time => time > now);
        
        // Update countdown
        updateCountdown();
        
        // Notify other "peer" about expired messages
        if (currentChatId) {
            localStorage.setItem(`evira_expired_${currentChatId}`, Date.now().toString());
        }
    }
    
    // Add a message to the chat
    function addMessage(text, isSent, skipStorage = false) {
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
        
        // Calculate and store expiry time for this message (unless it's a system message)
        if (!skipStorage) {
            const expiryTime = Date.now() + (currentTimer * 60 * 1000);
            messageExpiryTimes.push(expiryTime);
            
            // Store in localStorage to simulate peer sync
            if (currentChatId) {
                const msgId = ++lastMessageId;
                const msgData = {
                    id: msgId,
                    text: text,
                    isSent: isSent,
                    timestamp: Date.now(),
                    expiryTime: expiryTime
                };
                localStorage.setItem(`evira_msg_${currentChatId}_${msgId}`, JSON.stringify(msgData));
            }
            
            // Start countdown if not already running
            if (!countdownInterval) {
                countdownInterval = setInterval(updateCountdown, 1000);
            }
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Update countdown display
        updateCountdown();
    }
    
    // Add a system message
    function addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'system-message');
        
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = formatTime(new Date());
        
        const messageText = document.createElement('div');
        messageText.textContent = text;
        
        messageDiv.appendChild(messageText);
        messageDiv.appendChild(timeSpan);
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Check for new messages in localStorage (simulating peer messages)
    function checkForNewMessages() {
        if (!currentChatId) return;
        
        // Check for new messages
        for (let i = 1; i <= lastMessageId + 100; i++) {
            const msgKey = `evira_msg_${currentChatId}_${i}`;
            const msgData = localStorage.getItem(msgKey);
            if (msgData) {
                try {
                    const msg = JSON.parse(msgData);
                    // Check if we already have this message
                    const existingMsg = document.querySelector(`[data-msg-id="${msg.id}"]`);
                    if (!existingMsg && msg.isSent !== isHost) {
                        // Add the peer's message
                        const messageDiv = document.createElement('div');
                        messageDiv.classList.add('message');
                        messageDiv.classList.add('received');
                        messageDiv.setAttribute('data-msg-id', msg.id);
                        
                        const timeSpan = document.createElement('div');
                        timeSpan.classList.add('message-time');
                        const msgDate = new Date(msg.timestamp);
                        timeSpan.textContent = formatTime(msgDate);
                        
                        const messageText = document.createElement('div');
                        messageText.textContent = msg.text;
                        
                        messageDiv.appendChild(messageText);
                        messageDiv.appendChild(timeSpan);
                        
                        messagesContainer.appendChild(messageDiv);
                        
                        // Add expiry time
                        messageExpiryTimes.push(msg.expiryTime);
                        
                        // Scroll to bottom
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                } catch (e) {
                    console.error('Error parsing message', e);
                }
            }
        }
        
        // Check for expired messages notification
        const expiredKey = `evira_expired_${currentChatId}`;
        const expiredTime = localStorage.getItem(expiredKey);
        if (expiredTime) {
            // Clear the notification
            localStorage.removeItem(expiredKey);
            // We don't need to do anything special here as our local countdown handles expiration
        }
    }
    
    // Start a new chat
    function startChat() {
        currentChatId = generateChatId();
        isHost = true;
        chatIdElement.textContent = currentChatId;
        landingPage.classList.remove('active');
        chatPage.classList.add('active');
        
        // Reset message expiry times
        messageExpiryTimes = [];
        lastMessageId = 0;
        
        // Clear messages except for the welcome message
        messagesContainer.innerHTML = '';
        
        // Start countdown
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
        
        // Start checking for peer messages
        setInterval(checkForNewMessages, 1000);
        
        // Add instructions
        addSystemMessage(`Your Chat ID is: ${currentChatId}`);
        addSystemMessage('Share this ID with a friend. When they enter it, you\'ll both see the same messages!');
        addSystemMessage('Note: This demo uses localStorage to simulate peer-to-peer messaging.');
    }
    
    // Connect to another person's chat
    function connectToChat() {
        const connectId = connectIdInput.value.trim().toUpperCase();
        if (connectId && connectId.length === 6) {
            currentChatId = connectId;
            isHost = false;
            chatIdElement.textContent = currentChatId;
            landingPage.classList.remove('active');
            chatPage.classList.add('active');
            
            // Reset message expiry times
            messageExpiryTimes = [];
            lastMessageId = 0;
            
            // Clear messages except for the welcome message
            messagesContainer.innerHTML = '';
            
            // Start countdown
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
            
            // Start checking for peer messages
            setInterval(checkForNewMessages, 1000);
            
            // Add connection message
            addSystemMessage(`Connected to chat ID: ${currentChatId}`);
            addSystemMessage('You can now send messages that will appear on both devices!');
            addSystemMessage('Note: This demo uses localStorage to simulate peer-to-peer messaging.');
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
        }
    }
    
    // Update timer setting
    function updateTimer() {
        const oldValue = currentTimer;
        currentTimer = parseInt(timerSelect.value);
        
        // Update the display to show the new timer setting
        if (messageExpiryTimes.length > 0) {
            addSystemMessage(`Auto-delete timer changed to ${currentTimer} minutes`);
        }
        
        // Store timer setting in localStorage
        if (currentChatId) {
            localStorage.setItem(`evira_timer_${currentChatId}`, currentTimer.toString());
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
            instructionMessage.classList.add('message', 'system-message');
            instructionMessage.innerHTML = `
                <div><strong>How Evira Works:</strong></div>
                <div>1. Generate a Chat ID or enter a friend's ID</div>
                <div>2. Messages sync between devices using localStorage</div>
                <div>3. Messages delete automatically after 10/20/30 minutes</div>
                <div>4. Open this page in two browser tabs to test</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            messagesContainer.appendChild(instructionMessage);
        }
    }, 2000);
});