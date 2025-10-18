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
    const voiceBtn = document.getElementById('voice-btn');
    const messagesContainer = document.getElementById('messages');
    const chatIdElement = document.getElementById('chat-id');
    const statusElement = document.getElementById('status');
    const timerSelect = document.getElementById('timer-select');
    const countdownElement = document.getElementById('countdown');
    
    // Chat state
    let currentTimer = 900; // Default to 15 minutes (900 seconds)
    let countdownInterval = null;
    let messageExpiryTimes = []; // Array to track message expiry times
    let currentChatId = null;
    let isHost = false;
    let lastMessageId = 0;
    let checkMessagesInterval = null;
    let sentMessageIds = new Set(); // Track IDs of messages we've sent
    let lastCheckTime = 0;
    
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
        messages.forEach((message) => {
            const messageId = message.getAttribute('data-message-id');
            if (messageId) {
                const key = `evira_msg_${currentChatId}_${messageId}`;
                const msgData = JSON.parse(localStorage.getItem(key));
                if (msgData && msgData.expiryTime <= now) {
                    message.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => {
                        if (message.parentNode) {
                            message.parentNode.removeChild(message);
                        }
                    }, 500);
                    // Remove from localStorage as well
                    localStorage.removeItem(key);
                }
            }
        });
        
        // Filter out expired times
        messageExpiryTimes = messageExpiryTimes.filter(time => time > now);
        
        // Update countdown
        updateCountdown();
    }
    
    // Add a text message to the chat
    function addTextMessage(text, isSent, messageId = null) {
        // If this is a sent message and we already have its ID, don't add it again
        if (isSent && messageId && sentMessageIds.has(messageId)) {
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isSent ? 'sent' : 'received');
        
        // Store the message ID if provided
        if (messageId) {
            messageDiv.setAttribute('data-message-id', messageId);
        }
        
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = formatTime(new Date());
        
        const messageText = document.createElement('div');
        messageText.textContent = text;
        
        messageDiv.appendChild(messageText);
        messageDiv.appendChild(timeSpan);
        
        messagesContainer.appendChild(messageDiv);
        
        // Calculate and store expiry time for this message
        const expiryTime = Date.now() + (currentTimer * 1000);
        messageExpiryTimes.push(expiryTime);
        
        // Store in localStorage to simulate peer sync
        if (currentChatId) {
            const msgId = messageId || ++lastMessageId;
            // Mark sent messages so we don't duplicate them
            if (isSent) {
                sentMessageIds.add(msgId);
            }
            
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
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Update countdown display
        updateCountdown();
    }
    
    // Add a voice message to the chat
    function addVoiceMessage(duration, isSent, messageId = null) {
        // If this is a sent message and we already have its ID, don't add it again
        if (isSent && messageId && sentMessageIds.has(messageId)) {
            return;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isSent ? 'sent' : 'received');
        
        // Store the message ID if provided
        if (messageId) {
            messageDiv.setAttribute('data-message-id', messageId);
        }
        
        const timeSpan = document.createElement('div');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = formatTime(new Date());
        
        const voiceDiv = document.createElement('div');
        voiceDiv.classList.add('voice-message');
        
        const playButton = document.createElement('button');
        playButton.classList.add('voice-button');
        playButton.innerHTML = '▶';
        playButton.onclick = function() {
            // In a real implementation, this would play the audio
            playButton.innerHTML = '■';
            setTimeout(() => {
                playButton.innerHTML = '▶';
            }, duration * 1000);
        };
        
        const durationSpan = document.createElement('span');
        durationSpan.classList.add('voice-duration');
        durationSpan.textContent = `${duration}s`;
        
        voiceDiv.appendChild(playButton);
        voiceDiv.appendChild(durationSpan);
        messageDiv.appendChild(voiceDiv);
        messageDiv.appendChild(timeSpan);
        
        messagesContainer.appendChild(messageDiv);
        
        // Calculate and store expiry time for this message
        const expiryTime = Date.now() + (currentTimer * 1000);
        messageExpiryTimes.push(expiryTime);
        
        // Store in localStorage to simulate peer sync
        if (currentChatId) {
            const msgId = messageId || ++lastMessageId;
            // Mark sent messages so we don't duplicate them
            if (isSent) {
                sentMessageIds.add(msgId);
            }
            
            const msgData = {
                id: msgId,
                type: 'voice',
                duration: duration,
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
    
    // Check for new messages in localStorage (simulating peer messages) - OPTIMIZED VERSION
    function checkForNewMessages() {
        if (!currentChatId) return;
        
        // Only check if enough time has passed
        const now = Date.now();
        if (now - lastCheckTime < 100) { // Limit to 10 checks per second
            return;
        }
        lastCheckTime = now;
        
        // Check for new messages more efficiently
        const prefix = `evira_msg_${currentChatId}_`;
        for (let i = 1; i <= lastMessageId + 100; i++) {
            const key = prefix + i;
            // Only check keys that might exist
            if (localStorage.getItem(key) !== null) {
                try {
                    const msgData = JSON.parse(localStorage.getItem(key));
                    // Check if we already have this message
                    const existingMsg = document.querySelector(`[data-message-id="${msgData.id}"]`);
                    if (!existingMsg) {
                        // Check if message has expired
                        if (msgData.expiryTime > now) {
                            // Add the peer's message
                            if (msgData.type === 'voice') {
                                addVoiceMessage(msgData.duration, false, msgData.id);
                            } else {
                                addTextMessage(msgData.text, false, msgData.id);
                            }
                        } else {
                            // Remove expired message from localStorage
                            localStorage.removeItem(key);
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        }
        
        // Update lastMessageId to the highest ID we've seen
        for (let i = lastMessageId + 1; ; i++) {
            const key = prefix + i;
            if (localStorage.getItem(key) !== null) {
                lastMessageId = i;
            } else {
                break;
            }
        }
    }
    
    // Start a new chat
    function startChat() {
        currentChatId = generateChatId();
        isHost = true;
        chatIdElement.textContent = currentChatId;
        statusElement.textContent = 'Ready';
        statusElement.className = 'connected';
        landingPage.classList.remove('active');
        chatPage.classList.add('active');
        
        // Set initial timer value
        currentTimer = parseInt(timerSelect.value) || 900; // Default to 15 minutes
        
        // Reset message expiry times
        messageExpiryTimes = [];
        lastMessageId = 0;
        sentMessageIds.clear();
        lastCheckTime = 0;
        
        // Clear messages
        messagesContainer.innerHTML = '';
        
        // Start countdown
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
        
        // Start checking for peer messages - faster polling
        if (checkMessagesInterval) {
            clearInterval(checkMessagesInterval);
        }
        checkMessagesInterval = setInterval(checkForNewMessages, 100); // Check 10 times per second for faster response
        
        // Add instructions
        addSystemMessage(`Your Chat ID is: ${currentChatId}`);
        addSystemMessage(`Auto-delete timer set to: ${formatTimerValue(currentTimer)}`);
        addSystemMessage('Share this ID with a friend. When they enter it, you\'ll both see the same messages!');
        addSystemMessage('Type a message below and click Send to test messaging!');
    }
    
    // Connect to another person's chat
    function connectToChat() {
        const connectId = connectIdInput.value.trim().toUpperCase();
        if (connectId && connectId.length === 6) {
            currentChatId = connectId;
            isHost = false;
            chatIdElement.textContent = currentChatId;
            statusElement.textContent = 'Connected';
            statusElement.className = 'connected';
            landingPage.classList.remove('active');
            chatPage.classList.add('active');
            
            // Set initial timer value
            currentTimer = parseInt(timerSelect.value) || 900; // Default to 15 minutes
            
            // Reset message expiry times
            messageExpiryTimes = [];
            lastMessageId = 0;
            sentMessageIds.clear();
            lastCheckTime = 0;
            
            // Clear messages
            messagesContainer.innerHTML = '';
            
            // Start countdown
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
            
            // Start checking for peer messages - faster polling
            if (checkMessagesInterval) {
                clearInterval(checkMessagesInterval);
            }
            checkMessagesInterval = setInterval(checkForNewMessages, 100); // Check 10 times per second for faster response
            
            // Add connection message
            addSystemMessage(`Connected to chat ID: ${currentChatId}`);
            addSystemMessage(`Auto-delete timer set to: ${formatTimerValue(currentTimer)}`);
            addSystemMessage('You can now send messages that will appear on both devices!');
            addSystemMessage('Type a message below and click Send to test messaging!');
        } else {
            alert("Please enter a valid 6-character Chat ID");
        }
    }
    
    // Send a text message
    function sendTextMessage() {
        const message = messageInput.value.trim();
        if (message && currentChatId) {
            const messageId = ++lastMessageId;
            addTextMessage(message, true, messageId);
            messageInput.value = '';
        } else if (!currentChatId) {
            addSystemMessage('Error: No chat session active');
        }
    }
    
    // Start voice recording
    function startVoiceRecording() {
        if (!currentChatId) {
            addSystemMessage('Error: No chat session active');
            return;
        }
        
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '●';
        addSystemMessage('Recording voice message...');
        
        // Simulate voice recording
        setTimeout(() => {
            stopVoiceRecording();
        }, 3000); // 3 second recording for demo
    }
    
    // Stop voice recording
    function stopVoiceRecording() {
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎤';
        
        // Create voice message
        const messageId = ++lastMessageId;
        const duration = 3; // 3 seconds for demo
        addVoiceMessage(duration, true, messageId);
    }
    
    // Toggle voice recording
    function toggleVoiceRecording() {
        if (voiceBtn.classList.contains('recording')) {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    }
    
    // Update timer setting
    function updateTimer() {
        currentTimer = parseInt(timerSelect.value);
        
        // Store timer setting in localStorage
        if (currentChatId) {
            localStorage.setItem(`evira_timer_${currentChatId}`, currentTimer.toString());
        }
        
        // Add system message to confirm timer change
        addSystemMessage(`Auto-delete timer changed to ${formatTimerValue(currentTimer)}`);
    }
    
    // Format timer value for display
    function formatTimerValue(seconds) {
        if (seconds < 3600) {
            return `${Math.floor(seconds / 60)} minutes`;
        } else {
            return `${Math.floor(seconds / 3600)} hours`;
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
    if (sendBtn) sendBtn.addEventListener('click', sendTextMessage);
    if (voiceBtn) voiceBtn.addEventListener('click', toggleVoiceRecording);
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendTextMessage();
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
                <div><strong>How to Test Messaging:</strong></div>
                <div>1. Open this page in two browser tabs</div>
                <div>2. In Tab 1, click "Start New Chat"</div>
                <div>3. In Tab 2, enter the Chat ID from Tab 1</div>
                <div>4. Type "Hi" in either tab and click Send</div>
                <div>5. The message should appear instantly in both tabs</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            messagesContainer.appendChild(instructionMessage);
        }
    }, 2000);
});