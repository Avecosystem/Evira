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
    let peerConnection = null;
    let isInitiator = false;
    let connectedToPeer = false;
    
    // Signaling server (in a real implementation, this would be a WebSocket server)
    // For demo purposes, we'll simulate signaling using localStorage
    const signalingChannel = {
        send: function(data) {
            const signalData = {
                from: currentChatId,
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(`signal_${currentChatId}`, JSON.stringify(signalData));
        },
        receive: function(callback) {
            // In a real app, this would be a WebSocket listener
            // For demo, we'll poll localStorage
            setInterval(() => {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith('signal_') && key.endsWith(`_${currentChatId}`)) {
                        try {
                            const signalData = JSON.parse(localStorage.getItem(key));
                            localStorage.removeItem(key);
                            callback(signalData.data);
                        } catch (e) {
                            console.error('Error parsing signal data', e);
                        }
                    }
                });
            }, 1000);
        }
    };
    
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
        
        // If we're connected to a peer, notify them of expired messages
        if (connectedToPeer && peerConnection) {
            try {
                peerConnection.send(JSON.stringify({
                    type: 'expired_messages',
                    count: messages.length - messageExpiryTimes.length
                }));
            } catch (e) {
                console.warn('Could not notify peer of expired messages', e);
            }
        }
    }
    
    // Add a message to the chat
    function addMessage(text, isSent, skipExpiry = false) {
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
        if (!skipExpiry) {
            const expiryTime = Date.now() + (currentTimer * 60 * 1000);
            messageExpiryTimes.push(expiryTime);
            
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
    
    // Initialize WebRTC connection
    function initWebRTC(isInitiatorFlag) {
        isInitiator = isInitiatorFlag;
        
        // Create peer connection
        peerConnection = new SimplePeer({
            initiator: isInitiator,
            trickle: false,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        // Peer connection event handlers
        peerConnection.on('signal', data => {
            console.log('Signal data generated', data);
            // Send signaling data through our simulated signaling channel
            signalingChannel.send(data);
        });
        
        peerConnection.on('connect', () => {
            console.log('Peer connection established');
            connectedToPeer = true;
            statusElement.textContent = 'Connected';
            statusElement.className = 'connected';
            messageInput.disabled = false;
            sendBtn.disabled = false;
            
            addSystemMessage('Connected to peer! Messages will be synchronized.');
        });
        
        peerConnection.on('data', data => {
            try {
                const message = JSON.parse(data);
                handleMessage(message);
            } catch (e) {
                // Assume it's a plain text message
                addMessage(data, false);
            }
        });
        
        peerConnection.on('close', () => {
            console.log('Peer connection closed');
            connectedToPeer = false;
            statusElement.textContent = 'Disconnected';
            statusElement.className = 'disconnected';
            messageInput.disabled = true;
            sendBtn.disabled = true;
            
            addSystemMessage('Connection to peer lost.');
        });
        
        peerConnection.on('error', err => {
            console.error('Peer connection error', err);
            statusElement.textContent = 'Error';
            statusElement.className = 'disconnected';
            addSystemMessage('Connection error: ' + err.message);
        });
        
        // Start listening for signaling data
        signalingChannel.receive(data => {
            console.log('Received signaling data', data);
            if (peerConnection) {
                peerConnection.signal(data);
            }
        });
    }
    
    // Handle incoming messages
    function handleMessage(message) {
        switch (message.type) {
            case 'chat':
                addMessage(message.text, false);
                break;
            case 'timer_change':
                currentTimer = message.value;
                timerSelect.value = currentTimer;
                addSystemMessage(`Peer changed auto-delete timer to ${currentTimer} minutes`);
                break;
            case 'expired_messages':
                // Peer has expired messages, we should sync our state
                addSystemMessage(`Peer reported ${message.count} messages expired`);
                break;
            default:
                console.warn('Unknown message type', message);
        }
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
        
        // Initialize WebRTC as initiator
        initWebRTC(true);
        
        // Add instructions
        addSystemMessage(`Your Chat ID is: ${currentChatId}`);
        addSystemMessage('Share this ID with a friend. When they enter it, you\'ll connect directly!');
        addSystemMessage('Status: Waiting for peer connection...');
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
            
            // Initialize WebRTC as receiver
            initWebRTC(false);
            
            // Add connection message
            addSystemMessage(`Connecting to chat ID: ${currentChatId}`);
            addSystemMessage('Status: Establishing peer connection...');
        } else {
            alert("Please enter a valid 6-character Chat ID");
        }
    }
    
    // Send a message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && peerConnection && connectedToPeer) {
            addMessage(message, true);
            messageInput.value = '';
            
            // Send message to peer
            try {
                peerConnection.send(JSON.stringify({
                    type: 'chat',
                    text: message
                }));
            } catch (e) {
                console.error('Error sending message to peer', e);
                addSystemMessage('Error: Could not send message to peer');
            }
        } else if (!connectedToPeer) {
            addSystemMessage('Not connected to peer. Please wait for connection.');
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
        
        // Notify peer of timer change
        if (connectedToPeer && peerConnection) {
            try {
                peerConnection.send(JSON.stringify({
                    type: 'timer_change',
                    value: currentTimer,
                    oldValue: oldValue
                }));
            } catch (e) {
                console.warn('Could not notify peer of timer change', e);
            }
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
                <div>2. Connect directly using WebRTC (no servers)</div>
                <div>3. Messages delete automatically after 10/20/30 minutes</div>
                <div>4. All messages sync between both devices</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            messagesContainer.appendChild(instructionMessage);
        }
    }, 2000);
});